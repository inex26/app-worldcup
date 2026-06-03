/** League code generation + mock member/prediction seeding. */
import type { League, Match, Member, Prediction } from "./types";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous 0/O/1/I
export const CODE_LENGTH = 6;

/**
 * Generate a mock 6-char share code. Not guaranteed unique (documented demo
 * limitation) — collisions are acceptable at mock scale.
 */
export function generateCode(rand: () => number = Math.random): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[Math.floor(rand() * CODE_ALPHABET.length)];
  }
  return code;
}

/** Validate the shape of a league code (6 chars from the allowed alphabet). */
export function isValidCode(code: string): boolean {
  if (code.length !== CODE_LENGTH) return false;
  return [...code].every((c) => CODE_ALPHABET.includes(c));
}

const ADJECTIVES = ["Golden", "Mighty", "Roaring", "Electric", "Iron", "Cosmic", "Wild", "Royal"];
const NOUNS = ["Strikers", "Eagles", "Lions", "Rovers", "Galaxy", "Titans", "Comets", "Hawks"];

/** Generate a friendly league name (e.g. "Golden Strikers"). */
export function generateLeagueName(rand: () => number = Math.random): string {
  const adj = ADJECTIVES[Math.floor(rand() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(rand() * NOUNS.length)];
  return `${adj} ${noun}`;
}

/** Create a fresh member id (timestamp + random suffix is plenty for a UI demo). */
export function createMemberId(rand: () => number = Math.random): string {
  return `m_${Math.floor(rand() * 1e9).toString(36)}${Date.now().toString(36)}`;
}

const MOCK_NAMES = ["Alex", "Sam", "Jordan", "Casey", "Riley"];

/** Seed mock rival members so a freshly created/joined league has a populated leaderboard. */
export function seedMockMembers(rand: () => number = Math.random): Member[] {
  return MOCK_NAMES.map((displayName, i) => ({
    id: `mock_${i}_${Math.floor(rand() * 1e6).toString(36)}`,
    displayName,
  }));
}

/**
 * Deterministically seed predictions for a mock member across all matches.
 * Uses a per-member offset so rivals end up with different (and varied) scores.
 */
export function seedMockPredictions(member: Member, matches: Match[], offset: number): Prediction[] {
  return matches.map((m, i) => {
    const h = (i + offset) % 3;
    const a = (i * 2 + offset) % 3;
    return { matchId: m.id, home: h, away: a, savedAt: 0 };
  });
}

/** Add a member to a league (no-op if a member with the same id already exists). */
export function withMember(league: League, member: Member): League {
  if (league.members.some((m) => m.id === member.id)) return league;
  return { ...league, members: [...league.members, member] };
}
