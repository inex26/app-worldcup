/** Match display helpers (lock state, predictability, and tournament-ordered sections).
 *  Match data itself now lives in Supabase (see lib/data.ts `fetchMatches`), fed by the
 *  football-data.org sync script — no hardcoded fixtures. */
import type { Match, Stage } from "./types";

export const STAGE_ORDER: Stage[] = ["group", "r32", "r16", "qf", "sf", "third", "final"];

const STAGE_LABEL: Record<Exclude<Stage, "group">, string> = {
  r32: "Round of 32",
  r16: "Round of 16",
  qf: "Quarter-finals",
  sf: "Semi-finals",
  third: "Third place",
  final: "Final",
};

/** A match is locked once its kickoff passes. TBD matches (no kickoff) are never locked. */
export function isLocked(match: Match, now: number): boolean {
  return match.kickoff ? now >= Date.parse(match.kickoff) : false;
}

/** Counts toward scoring: locked AND has a full-time result. */
export function isPlayed(match: Match, now: number): boolean {
  return isLocked(match, now) && match.result !== undefined;
}

/** Editable: both teams are known and kickoff hasn't passed. */
export function isPredictable(match: Match, now: number): boolean {
  return !!match.home && !!match.away && !isLocked(match, now);
}

export interface MatchSection {
  key: string;
  label: string;
  matches: Match[];
}

function byKickoff(ms: Match[]): Match[] {
  return [...ms].sort((a, b) => (a.kickoff ?? "~").localeCompare(b.kickoff ?? "~"));
}

/** Order matches into display sections: group matchdays first, then knockout rounds. */
export function matchSections(matches: Match[]): MatchSection[] {
  const sections: MatchSection[] = [];

  const group = matches.filter((m) => m.stage === "group");
  const matchdays = [...new Set(group.map((m) => m.matchday ?? 0))].sort((a, b) => a - b);
  for (const md of matchdays) {
    sections.push({
      key: `md${md}`,
      label: `Matchday ${md}`,
      matches: byKickoff(group.filter((m) => m.matchday === md)),
    });
  }

  for (const stage of STAGE_ORDER) {
    if (stage === "group") continue;
    const ms = matches.filter((m) => m.stage === stage);
    if (ms.length) sections.push({ key: stage, label: STAGE_LABEL[stage], matches: byKickoff(ms) });
  }

  return sections;
}
