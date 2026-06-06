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

/** Tournament stage: group stage, then the knockout rounds. */
export type Stage = "group" | "r32" | "r16" | "qf" | "sf" | "third" | "final";

/** A single match. Knockout matches start with null teams (TBD) until rounds resolve. */
export interface Match {
  id: string;
  stage: Stage;
  /** "A".."L" for the group stage; null for knockouts. */
  group: string | null;
  /** 1..3 for the group stage; null for knockouts. */
  matchday: number | null;
  /** null until the team is known (knockout placeholders). */
  home: Team | null;
  away: Team | null;
  /** ISO kickoff; null if not yet scheduled. Predictions lock once it passes. */
  kickoff: string | null;
  /** Full-time score, present only once the match is finished. */
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

/** A league: id (uuid), name, share code, secure invite token, and its members. */
export interface League {
  /** Supabase row id (uuid) — used to scope prediction/membership queries. */
  id: string;
  name: string;
  code: string;
  /** High-entropy token for the shareable invite link (not guessable). */
  inviteToken: string;
  members: Member[];
}

/** The current user's session pointer (which league + member they are). */
export interface CurrentUser {
  id: string;
  displayName: string;
  leagueCode: string;
  /** The account's login email (used to sign in on any device). */
  email: string | null;
}

/** Per-member computed leaderboard standing. */
export interface Standing {
  member: Member;
  rank: number;
  points: number;
  exact: number; // count of exact-score predictions (3pts)
  correct: number; // count of correct-result-only predictions (1pt)
}
