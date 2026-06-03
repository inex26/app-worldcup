/**
 * Thin localStorage wrapper implementing the documented schema:
 *   wc_league_{code}                       → League
 *   wc_predictions_{leagueCode}_{memberId} → Prediction[]
 *   wc_current_user                        → CurrentUser
 *
 * All reads are SSR-safe (return null/defaults when `window` is undefined) and
 * tolerant of malformed JSON.
 */
import type { CurrentUser, League, Member, Prediction } from "./types";
import { seedMockMembers, seedMockPredictions, withMember } from "./league";
import { MATCHES } from "./matches";

const LEAGUE_PREFIX = "wc_league_";
const PRED_PREFIX = "wc_predictions_";
const CURRENT_USER_KEY = "wc_current_user";

function hasStorage(): boolean {
  return typeof window !== "undefined" && !!window.localStorage;
}

function read<T>(key: string): T | null {
  if (!hasStorage()) return null;
  const raw = window.localStorage.getItem(key);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  if (!hasStorage()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

// ── League ────────────────────────────────────────────────────────────────

export function getLeague(code: string): League | null {
  return read<League>(LEAGUE_PREFIX + code.toUpperCase());
}

export function saveLeague(league: League): void {
  write(LEAGUE_PREFIX + league.code.toUpperCase(), league);
}

// ── Predictions ─────────────────────────────────────────────────────────────

function predKey(leagueCode: string, memberId: string): string {
  return `${PRED_PREFIX}${leagueCode.toUpperCase()}_${memberId}`;
}

export function getPredictions(leagueCode: string, memberId: string): Prediction[] {
  return read<Prediction[]>(predKey(leagueCode, memberId)) ?? [];
}

export function savePredictions(
  leagueCode: string,
  memberId: string,
  predictions: Prediction[],
): void {
  write(predKey(leagueCode, memberId), predictions);
}

/** Upsert a single prediction for the given member. Returns the updated list. */
export function upsertPrediction(
  leagueCode: string,
  memberId: string,
  prediction: Prediction,
): Prediction[] {
  const existing = getPredictions(leagueCode, memberId);
  const next = existing.filter((p) => p.matchId !== prediction.matchId);
  next.push(prediction);
  savePredictions(leagueCode, memberId, next);
  return next;
}

/** Gather every member's predictions for a league (used by the leaderboard). */
export function getAllPredictions(league: League): Record<string, Prediction[]> {
  const result: Record<string, Prediction[]> = {};
  for (const member of league.members) {
    result[member.id] = getPredictions(league.code, member.id);
  }
  return result;
}

// ── Current user ─────────────────────────────────────────────────────────────

export function getCurrentUser(): CurrentUser | null {
  return read<CurrentUser>(CURRENT_USER_KEY);
}

export function setCurrentUser(user: CurrentUser): void {
  write(CURRENT_USER_KEY, user);
}

export function clearCurrentUser(): void {
  if (!hasStorage()) return;
  window.localStorage.removeItem(CURRENT_USER_KEY);
}

// ── High-level flows ─────────────────────────────────────────────────────────

/**
 * Persist a brand-new league: seed mock rival members (each with deterministic
 * predictions) plus the real creator, then set the current user.
 */
export function persistNewLeague(league: League, creator: Member): League {
  const mocks = seedMockMembers();
  mocks.forEach((mock, i) => {
    savePredictions(league.code, mock.id, seedMockPredictions(mock, MATCHES, i + 1));
  });

  let full: League = { ...league, members: [...mocks] };
  full = withMember(full, creator);
  saveLeague(full);
  setCurrentUser({ id: creator.id, displayName: creator.displayName, leagueCode: full.code });
  return full;
}

/** Join an existing league as `member`, persisting membership + current user. */
export function joinLeague(league: League, member: Member): League {
  const full = withMember(league, member);
  saveLeague(full);
  setCurrentUser({ id: member.id, displayName: member.displayName, leagueCode: full.code });
  return full;
}
