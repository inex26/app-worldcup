/**
 * Supabase data access for the client screens.
 *
 * Identity comes from Supabase Auth (email + password). The signed-in user's
 * `auth.uid()` is the member id; Row Level Security (see supabase/schema.sql)
 * enforces that a user only reads their league's data and only writes their own
 * predictions, so these queries can stay simple. The username chosen at sign-up
 * is the display name shown in leagues (passed to the create/join RPCs).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { getBrowserClient } from "./supabase/browser";
import { generateCode } from "./league";
import type { CurrentUser, League, Member, Prediction } from "./types";

/** Postgres SQLSTATE codes we branch on. */
const UNIQUE_VIOLATION = "23505";
const NO_DATA_FOUND = "P0002"; // raised by join_league_by_token() for an unknown token

// ── Email + password auth ────────────────────────────────────────────────────
// Requires Supabase Auth → Email provider ON with "Confirm email" OFF, so sign-up
// returns an active session immediately (no inbox round-trip). The session is
// persisted in cookies by @supabase/ssr and refreshed in middleware.ts, so a
// returning user on the same device stays signed in until they sign out.

/** Create an account (email + password) and start its session. `username` is the
 *  display name — stored in user_metadata and passed to the create/join RPCs. */
export async function signUp(email: string, password: string, username: string): Promise<void> {
  const supabase = getBrowserClient();
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: { data: { display_name: username.trim() } },
  });
  if (error) throw error;
  // Sign-up only returns a session when "Confirm email" is OFF. Without a session
  // the next route has nothing to load and bounces home — so guarantee one here by
  // signing in. If that fails, email confirmation is on: surface a clear, fixable error.
  if (!data.session) {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (signInError) {
      throw new Error(
        "Account created, but sign-in is blocked. In Supabase → Authentication → Providers → " +
          "Email, turn OFF “Confirm email”, then sign in.",
      );
    }
  }
}

/** Sign in with email + password (restores the account's session on any device). */
export async function signIn(email: string, password: string): Promise<void> {
  const supabase = getBrowserClient();
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw error;
}

/** Sign out — clears the cookie session on this device. */
export async function signOut(): Promise<void> {
  await getBrowserClient().auth.signOut();
}

/** A `leagues` row as returned by our queries / RPCs. */
type LeagueRow = { id: string; name: string; invite_code: string; invite_token: string };

/** Map a `leagues` row + its members into the app's League shape. */
function toLeague(row: LeagueRow, members: Member[]): League {
  return {
    id: row.id,
    name: row.name,
    code: row.invite_code,
    inviteToken: row.invite_token,
    members,
  };
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
    .select("id, name, invite_code, invite_token")
    .eq("id", leagueId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const members = await fetchMembers(supabase, leagueId);
  return toLeague(data, members);
}

/**
 * Resolve the current session for `useSession`: the signed-in user plus their
 * most-recently-joined league (the app's single-active-league model). Returns
 * nulls when there is NO session — we never auto-create one (sign-up/sign-in is
 * explicit). A signed-in user with no league yet is returned with `league: null`.
 */
export async function loadSession(): Promise<{
  user: CurrentUser | null;
  league: League | null;
}> {
  const supabase = getBrowserClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return { user: null, league: null };

  const userId = session.user.id;
  const email = session.user.email ?? null;
  const metaName =
    (session.user.user_metadata?.display_name as string | undefined)?.trim() || "";

  const { data: membership, error } = await supabase
    .from("league_members")
    .select("league_id, display_name, joined_at")
    .eq("user_id", userId)
    .order("joined_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;

  if (!membership) {
    return { user: { id: userId, displayName: metaName, leagueCode: "", email }, league: null };
  }

  const league = await fetchLeagueById(supabase, membership.league_id);
  return {
    user: {
      id: userId,
      displayName: membership.display_name,
      leagueCode: league?.code ?? "",
      email,
    },
    league,
  };
}

/** Every league the signed-in user belongs to, most-recently-joined first. */
export async function loadLeagues(): Promise<League[]> {
  const supabase = getBrowserClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return [];

  const { data: memberships, error } = await supabase
    .from("league_members")
    .select("league_id, joined_at")
    .eq("user_id", session.user.id)
    .order("joined_at", { ascending: false });
  if (error) throw error;

  const leagues: League[] = [];
  for (const m of memberships ?? []) {
    const lg = await fetchLeagueById(supabase, m.league_id as string);
    if (lg) leagues.push(lg);
  }
  return leagues;
}

/**
 * Create a new league with the caller as its first member. Requires an active
 * session (sign up first). The share code is generated client-side and the secure
 * invite token server-side; on the rare code collision we retry with a fresh code.
 */
export async function createLeague(displayName: string, leagueName: string): Promise<League> {
  const supabase = getBrowserClient();

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode();
    const { data, error } = await supabase.rpc("create_league", {
      p_name: leagueName,
      p_invite_code: code,
      p_display_name: displayName,
    });
    if (!error) {
      const row = data as LeagueRow;
      const members = await fetchMembers(supabase, row.id);
      return toLeague(row, members);
    }
    if (error.code !== UNIQUE_VIOLATION) throw error; // not a code clash → real error
  }
  throw new Error("Could not generate a unique league code. Please try again.");
}

/**
 * Join a league via its secure invite token. Requires an active session. Resolves
 * to the joined League, or `null` if the token is unknown. Idempotent — re-joining
 * a league you're already in just returns it.
 */
export async function joinLeagueByToken(
  token: string,
  displayName: string,
): Promise<League | null> {
  const supabase = getBrowserClient();

  const { data, error } = await supabase.rpc("join_league_by_token", {
    p_token: token,
    p_display_name: displayName,
  });
  if (error) {
    if (error.code === NO_DATA_FOUND) return null;
    throw error;
  }

  const row = data as LeagueRow;
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
