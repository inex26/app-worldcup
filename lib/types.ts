/** Shared domain types for the World Cup predictions app (Supabase-backed). */

/** A football team with a display name and flag emoji. */
export interface Team {
  name: string;
  flag: string;
}

/** A score (home/away goals). */
export interface Score {
  home: number;
  away: number;
}

/** A single group-stage match. `result` is set only on mock "played" matches. */
export interface Match {
  id: string;
  group: string; // "A".."H"
  round: number; // matchday 1..3
  home: Team;
  away: Team;
  /** ISO timestamp of kickoff. Predictions lock once this passes. */
  kickoff: string;
  /** Final score, present only for mock matches that have been "played". */
  result?: Score;
}

/** A member's stored prediction for one match. */
export interface Prediction {
  matchId: string;
  home: number;
  away: number;
  /** epoch ms when the prediction was last saved. */
  savedAt: number;
}

/** A league member (no auth — just a display name + generated id). */
export interface Member {
  id: string;
  displayName: string;
}

/** A league: id (uuid), name, share code, and its members. */
export interface League {
  /** Supabase row id (uuid) — used to scope prediction/membership queries. */
  id: string;
  name: string;
  code: string;
  members: Member[];
}

/** The current user's session pointer (which league + member they are). */
export interface CurrentUser {
  id: string;
  displayName: string;
  leagueCode: string;
}

/** Per-member computed leaderboard standing. */
export interface Standing {
  member: Member;
  rank: number;
  points: number;
  exact: number; // count of exact-score predictions (3pts)
  correct: number; // count of correct-result-only predictions (1pt)
}
