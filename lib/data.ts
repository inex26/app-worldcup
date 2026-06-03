/**
 * Supabase data access for the client screens. Mirrors the old localStorage
 * `storage.ts` surface but talks to the shared backend via the browser client.
 *
 * Identity comes from Supabase Auth (anonymous sign-in): the signed-in user's
 * `auth.uid()` is the member id. Row Level Security (see supabase/schema.sql)
 * enforces that a user only reads their league's data and only writes their own
 * predictions, so these queries can stay simple.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { getBrowserClient } from "./supabase/browser";
import { generateCode, generateLeagueName } from "./league";
import type { CurrentUser, League, Member, Prediction } from "./types";

/** Postgres SQLSTATE codes we branch on. */
const UNIQUE_VIOLATION = "23505";
const NO_DATA_FOUND = "P0002"; // raised by join_league() for an unknown code

/** Ensure there is a session, creating an anonymous one on first visit. */
export async function ensureUserId(): Promise<string> {
  const supabase = getBrowserClient();
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    const { error } = await supabase.auth.signInAnonymously();
    if (error) throw error;
  }
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw error ?? new Error("No authenticated user");
  return data.user.id;
}

/** Map a `leagues` row + its members into the app's League shape. */
function toLeague(
  row: { id: string; name: string; invite_code: string },
  members: Member[],
): League {
  return { id: row.id, name: row.name, code: row.invite_code, members };
}

async function fetchMembers(supabase: SupabaseClient, leagueId: string): Promise<Member[]> {
  const { data, error } = await supabase
    .from("league_members")
    .select("user_id, display_name, joined_at")
    .eq("league_id", leagueId)
    .order("joined_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((m) => ({ id: m.user_id, displayName: m.display_name }));
}

async function fetchLeagueById(supabase: SupabaseClient, leagueId: string): Promise<League | null> {
  const { data, error } = await supabase
    .from("leagues")
    .select("id, name, invite_code")
    .eq("id", leagueId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const members = await fetchMembers(supabase, leagueId);
  return toLeague(data, members);
}

/**
 * Resolve the current session for `useSession`: the signed-in user plus their
 * most-recently-joined league (the app's single-active-league model). Signs in
 * anonymously if needed.
 */
export async function loadSession(): Promise<{
  user: CurrentUser | null;
  league: League | null;
}> {
  const supabase = getBrowserClient();
  const userId = await ensureUserId();

  const { data: membership, error } = await supabase
    .from("league_members")
    .select("league_id, display_name, joined_at")
    .eq("user_id", userId)
    .order("joined_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;

  if (!membership) return { user: null, league: null };

  const league = await fetchLeagueById(supabase, membership.league_id);
  if (!league) return { user: null, league: null };

  return {
    user: { id: userId, displayName: membership.display_name, leagueCode: league.code },
    league,
  };
}

/**
 * Create a new league with the caller as its first member. The friendly name +
 * share code are generated client-side; on the rare invite-code collision we
 * retry with a fresh code.
 */
export async function createLeague(displayName: string): Promise<League> {
  const supabase = getBrowserClient();
  await ensureUserId();
  const name = generateLeagueName();

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode();
    const { data, error } = await supabase.rpc("create_league", {
      p_name: name,
      p_invite_code: code,
      p_display_name: displayName,
    });
    if (!error) {
      const row = data as { id: string; name: string; invite_code: string };
      const members = await fetchMembers(supabase, row.id);
      return toLeague(row, members);
    }
    if (error.code !== UNIQUE_VIOLATION) throw error; // not a code clash → real error
  }
  throw new Error("Could not generate a unique league code. Please try again.");
}

/**
 * Join a league by invite code. Resolves to the joined League, or `null` if no
 * league exists for that code (the screen shows its "not found" state).
 * Idempotent — re-joining a league you're already in just returns it.
 */
export async function joinLeagueByCode(code: string, displayName: string): Promise<League | null> {
  const supabase = getBrowserClient();
  await ensureUserId();

  const { data, error } = await supabase.rpc("join_league", {
    p_invite_code: code.toUpperCase(),
    p_display_name: displayName,
  });
  if (error) {
    if (error.code === NO_DATA_FOUND) return null;
    throw error;
  }

  const row = data as { id: string; name: string; invite_code: string };
  const members = await fetchMembers(supabase, row.id);
  return toLeague(row, members);
}

/** Map a `predictions` row into the app's Prediction shape. */
function toPrediction(row: {
  match_id: string;
  home_score: number;
  away_score: number;
  updated_at: string;
}): Prediction {
  return {
    matchId: row.match_id,
    home: row.home_score,
    away: row.away_score,
    savedAt: Date.parse(row.updated_at),
  };
}

/** Fetch one member's predictions for a league. */
export async function fetchPredictions(leagueId: string, userId: string): Promise<Prediction[]> {
  const supabase = getBrowserClient();
  const { data, error } = await supabase
    .from("predictions")
    .select("match_id, home_score, away_score, updated_at")
    .eq("league_id", leagueId)
    .eq("user_id", userId);
  if (error) throw error;
  return (data ?? []).map(toPrediction);
}

/** Upsert the caller's prediction for a single match. */
export async function savePrediction(
  leagueId: string,
  userId: string,
  prediction: Prediction,
): Promise<void> {
  const supabase = getBrowserClient();
  const { error } = await supabase.from("predictions").upsert(
    {
      user_id: userId,
      league_id: leagueId,
      match_id: prediction.matchId,
      home_score: prediction.home,
      away_score: prediction.away,
      updated_at: new Date(prediction.savedAt).toISOString(),
    },
    { onConflict: "user_id,league_id,match_id" },
  );
  if (error) throw error;
}

/** Fetch every member of a league plus their predictions, for the leaderboard. */
export async function fetchLeaderboard(leagueId: string): Promise<{
  members: Member[];
  predictionsByMember: Record<string, Prediction[]>;
}> {
  const supabase = getBrowserClient();
  const members = await fetchMembers(supabase, leagueId);

  const { data, error } = await supabase
    .from("predictions")
    .select("user_id, match_id, home_score, away_score, updated_at")
    .eq("league_id", leagueId);
  if (error) throw error;

  const predictionsByMember: Record<string, Prediction[]> = {};
  for (const m of members) predictionsByMember[m.id] = [];
  for (const row of data ?? []) {
    (predictionsByMember[row.user_id] ??= []).push(toPrediction(row));
  }

  return { members, predictionsByMember };
}
