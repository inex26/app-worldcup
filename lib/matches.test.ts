import { describe, it, expect } from "vitest";
import { isLocked, isPlayed, isPredictable, matchSections } from "./matches";
import type { Match } from "./types";

const mk = (over: Partial<Match>): Match => ({
  id: "X",
  stage: "group",
  group: "A",
  matchday: 1,
  home: { name: "H", flag: "" },
  away: { name: "A", flag: "" },
  kickoff: "2026-06-11T19:00:00.000Z",
  ...over,
});

const before = Date.parse("2026-06-10T00:00:00.000Z");
const after = Date.parse("2026-06-12T00:00:00.000Z");

describe("isLocked", () => {
  it("locks once kickoff passes", () => {
    expect(isLocked(mk({}), before)).toBe(false);
    expect(isLocked(mk({}), after)).toBe(true);
  });
  it("never locks a TBD match with no kickoff", () => {
    expect(isLocked(mk({ kickoff: null }), after)).toBe(false);
  });
});

describe("isPlayed", () => {
  it("is true only when locked AND has a result", () => {
    expect(isPlayed(mk({ result: { home: 1, away: 0 } }), before)).toBe(false);
    expect(isPlayed(mk({ result: { home: 1, away: 0 } }), after)).toBe(true);
    expect(isPlayed(mk({}), after)).toBe(false);
  });
});

describe("isPredictable", () => {
  it("requires both teams known and kickoff not passed", () => {
    expect(isPredictable(mk({}), before)).toBe(true);
    expect(isPredictable(mk({}), after)).toBe(false); // locked
    expect(isPredictable(mk({ home: null }), before)).toBe(false); // TBD
    expect(isPredictable(mk({ kickoff: null, home: null, away: null }), before)).toBe(false);
  });
});

describe("matchSections", () => {
  it("orders group matchdays first, then knockout rounds, with labels", () => {
    const matches: Match[] = [
      mk({ id: "f", stage: "final", group: null, matchday: null, kickoff: "2026-07-19T19:00:00Z" }),
      mk({ id: "g2", stage: "group", matchday: 2, kickoff: "2026-06-16T19:00:00Z" }),
      mk({ id: "g1", stage: "group", matchday: 1, kickoff: "2026-06-11T19:00:00Z" }),
      mk({ id: "r32", stage: "r32", group: null, matchday: null, kickoff: "2026-06-28T19:00:00Z" }),
    ];
    const sections = matchSections(matches);
    expect(sections.map((s) => s.label)).toEqual([
      "Matchday 1",
      "Matchday 2",
      "Round of 32",
      "Final",
    ]);
  });
});
