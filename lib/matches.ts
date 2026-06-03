/**
 * Hardcoded mock tournament data: 8 groups of 4 teams → 48 group-stage matches.
 *
 * Matchday 1 is scheduled in the past with final scores (so the app can show the
 * locked / played / scored states); matchdays 2 and 3 are in the future and editable.
 * All dates are fixed constants so behaviour is deterministic relative to the system clock.
 */
import type { Match, Score, Team } from "./types";

const T = (name: string, flag: string): Team => ({ name, flag });

/** 8 groups of 4 teams. */
const GROUPS: Record<string, Team[]> = {
  A: [T("Brazil", "🇧🇷"), T("Croatia", "🇭🇷"), T("Mexico", "🇲🇽"), T("Cameroon", "🇨🇲")],
  B: [T("Argentina", "🇦🇷"), T("Poland", "🇵🇱"), T("Japan", "🇯🇵"), T("Tunisia", "🇹🇳")],
  C: [T("France", "🇫🇷"), T("Denmark", "🇩🇰"), T("Australia", "🇦🇺"), T("Peru", "🇵🇪")],
  D: [T("Spain", "🇪🇸"), T("Germany", "🇩🇪"), T("Morocco", "🇲🇦"), T("Canada", "🇨🇦")],
  E: [T("Portugal", "🇵🇹"), T("Uruguay", "🇺🇾"), T("Ghana", "🇬🇭"), T("South Korea", "🇰🇷")],
  F: [T("Belgium", "🇧🇪"), T("Switzerland", "🇨🇭"), T("Serbia", "🇷🇸"), T("USA", "🇺🇸")],
  G: [T("Netherlands", "🇳🇱"), T("Ecuador", "🇪🇨"), T("Senegal", "🇸🇳"), T("Nigeria", "🇳🇬")],
  H: [T("England", "🏴󠁧󠁢󠁥󠁮󠁧󠁿"), T("Wales", "🏴󠁧󠁢󠁷󠁬󠁳󠁿"), T("Iran", "🇮🇷"), T("Egypt", "🇪🇬")],
};

/** Round-robin pairings (team indexes) and the matchday each falls on. */
const PAIRINGS: { pair: [number, number]; round: number }[] = [
  { pair: [0, 1], round: 1 },
  { pair: [2, 3], round: 1 },
  { pair: [0, 2], round: 2 },
  { pair: [3, 1], round: 2 },
  { pair: [3, 0], round: 3 },
  { pair: [1, 2], round: 3 },
];

/** Kickoff calendar day per matchday (fixed mock dates). */
const ROUND_DATE: Record<number, string> = {
  1: "2026-06-01", // past → locked + played
  2: "2026-06-05", // future → editable
  3: "2026-06-08", // future → editable
};

/** Deterministic pseudo-score for a played match, derived from its id. */
function mockResult(seed: number): Score {
  return { home: seed % 4, away: (seed * 7 + 1) % 4 };
}

function buildMatches(): Match[] {
  const matches: Match[] = [];
  const groupKeys = Object.keys(GROUPS);

  groupKeys.forEach((group, gi) => {
    const teams = GROUPS[group];
    PAIRINGS.forEach(({ pair, round }, pi) => {
      const seq = pi; // 0..5 within the group
      const id = `${group}${seq + 1}`;
      // Stagger kickoff times across groups so each match has a distinct slot.
      const hour = 13 + ((gi + pi) % 6); // 13:00..18:00 UTC
      const kickoff = `${ROUND_DATE[round]}T${String(hour).padStart(2, "0")}:00:00.000Z`;
      const seed = gi * 6 + pi;
      matches.push({
        id,
        group,
        round,
        home: teams[pair[0]],
        away: teams[pair[1]],
        kickoff,
        result: round === 1 ? mockResult(seed) : undefined,
      });
    });
  });

  return matches;
}

/** The 48 hardcoded group-stage matches. */
export const MATCHES: Match[] = buildMatches();

/** Distinct matchday rounds present in the schedule, ascending. */
export const ROUNDS: number[] = [...new Set(MATCHES.map((m) => m.round))].sort((a, b) => a - b);

/** Look up a match by id. */
export function getMatch(id: string): Match | undefined {
  return MATCHES.find((m) => m.id === id);
}

/** A match is locked once its kickoff time has passed. */
export function isLocked(match: Match, now: number): boolean {
  return now >= Date.parse(match.kickoff);
}

/** A match counts toward scoring when it is both locked and has a played result. */
export function isPlayed(match: Match, now: number): boolean {
  return isLocked(match, now) && match.result !== undefined;
}
