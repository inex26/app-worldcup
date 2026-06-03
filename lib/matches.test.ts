import { describe, it, expect } from "vitest";
import { MATCHES, ROUNDS, getMatch, isLocked, isPlayed } from "./matches";
import type { Match } from "./types";

describe("MATCHES mock data", () => {
  it("has exactly 48 group-stage matches", () => {
    expect(MATCHES).toHaveLength(48);
  });

  it("has unique match ids", () => {
    const ids = new Set(MATCHES.map((m) => m.id));
    expect(ids.size).toBe(48);
  });

  it("spans 8 groups of 6 matches each", () => {
    const byGroup = new Map<string, number>();
    for (const m of MATCHES) byGroup.set(m.group, (byGroup.get(m.group) ?? 0) + 1);
    expect(byGroup.size).toBe(8);
    expect([...byGroup.values()].every((n) => n === 6)).toBe(true);
  });

  it("only matchday 1 carries a played result", () => {
    for (const m of MATCHES) {
      if (m.round === 1) expect(m.result).toBeDefined();
      else expect(m.result).toBeUndefined();
    }
  });

  it("exposes ascending rounds", () => {
    expect(ROUNDS).toEqual([1, 2, 3]);
  });

  it("looks up matches by id", () => {
    expect(getMatch("A1")?.id).toBe("A1");
    expect(getMatch("nope")).toBeUndefined();
  });
});

describe("lock / played state", () => {
  const base: Match = {
    id: "X",
    group: "A",
    round: 1,
    home: { name: "H", flag: "" },
    away: { name: "A", flag: "" },
    kickoff: "2026-06-01T13:00:00.000Z",
  };

  const before = Date.parse("2026-05-31T00:00:00.000Z");
  const after = Date.parse("2026-06-02T00:00:00.000Z");

  it("locks once kickoff passes", () => {
    expect(isLocked(base, before)).toBe(false);
    expect(isLocked(base, after)).toBe(true);
  });

  it("is played only when locked AND has a result", () => {
    const withResult = { ...base, result: { home: 1, away: 0 } };
    expect(isPlayed(withResult, before)).toBe(false); // not locked yet
    expect(isPlayed(withResult, after)).toBe(true);
    expect(isPlayed(base, after)).toBe(false); // locked but no result
  });
});
