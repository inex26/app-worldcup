import { describe, it, expect } from "vitest";
import { scorePrediction, computeStandings } from "./scoring";
import type { Match, Member, Prediction } from "./types";

describe("scorePrediction", () => {
  it("awards 3 points for an exact score", () => {
    expect(scorePrediction({ home: 2, away: 1 }, { home: 2, away: 1 })).toBe(3);
    expect(scorePrediction({ home: 0, away: 0 }, { home: 0, away: 0 })).toBe(3);
  });

  it("awards 1 point for the correct result but wrong score", () => {
    expect(scorePrediction({ home: 3, away: 1 }, { home: 2, away: 1 })).toBe(1); // home win
    expect(scorePrediction({ home: 1, away: 2 }, { home: 0, away: 4 })).toBe(1); // away win
    expect(scorePrediction({ home: 1, away: 1 }, { home: 2, away: 2 })).toBe(1); // draw
  });

  it("awards 0 points for the wrong result", () => {
    expect(scorePrediction({ home: 2, away: 1 }, { home: 1, away: 2 })).toBe(0);
    expect(scorePrediction({ home: 1, away: 1 }, { home: 2, away: 1 })).toBe(0);
  });
});

describe("computeStandings", () => {
  const past = "2020-01-01T00:00:00.000Z"; // always locked
  const future = "2999-01-01T00:00:00.000Z"; // never locked
  const now = Date.parse("2026-06-03T12:00:00.000Z");

  const matches: Match[] = [
    {
      id: "M1",
      stage: "group",
      group: "A",
      matchday: 1,
      home: { name: "H", flag: "" },
      away: { name: "A", flag: "" },
      kickoff: past,
      result: { home: 2, away: 1 },
    },
    {
      id: "M2",
      stage: "group",
      group: "A",
      matchday: 1,
      home: { name: "H", flag: "" },
      away: { name: "A", flag: "" },
      kickoff: past,
      result: { home: 0, away: 0 },
    },
    {
      // future + unplayed: must not contribute to points
      id: "M3",
      stage: "group",
      group: "A",
      matchday: 2,
      home: { name: "H", flag: "" },
      away: { name: "A", flag: "" },
      kickoff: future,
    },
  ];

  const members: Member[] = [
    { id: "u1", displayName: "Zoe" },
    { id: "u2", displayName: "Amy" },
  ];

  const preds: Record<string, Prediction[]> = {
    u1: [
      { matchId: "M1", home: 2, away: 1, savedAt: 0 }, // exact → 3
      { matchId: "M2", home: 1, away: 1, savedAt: 0 }, // correct draw → 1
      { matchId: "M3", home: 5, away: 0, savedAt: 0 }, // future, ignored
    ],
    u2: [
      { matchId: "M1", home: 3, away: 0, savedAt: 0 }, // home win → 1
      { matchId: "M2", home: 2, away: 0, savedAt: 0 }, // wrong → 0
    ],
  };

  it("ranks members by points and tallies exact/correct counts", () => {
    const standings = computeStandings(members, preds, matches, now);
    expect(standings.map((s) => s.member.id)).toEqual(["u1", "u2"]);
    const [zoe, amy] = standings;
    expect(zoe).toMatchObject({ rank: 1, points: 4, exact: 1, correct: 1 });
    expect(amy).toMatchObject({ rank: 2, points: 1, exact: 0, correct: 1 });
  });

  it("ignores matches that are not yet played", () => {
    // Only future matches → everyone on zero.
    const standings = computeStandings(members, preds, [matches[2]], now);
    expect(standings.every((s) => s.points === 0)).toBe(true);
  });

  it("handles members with no predictions", () => {
    const standings = computeStandings(members, {}, matches, now);
    expect(standings.every((s) => s.points === 0 && s.exact === 0)).toBe(true);
  });

  it("breaks ties by exact count then name", () => {
    // Both score 1 point, but tie-break differs.
    const tie: Record<string, Prediction[]> = {
      u1: [{ matchId: "M1", home: 5, away: 0, savedAt: 0 }], // home win → 1
      u2: [{ matchId: "M1", home: 5, away: 0, savedAt: 0 }], // home win → 1
    };
    const standings = computeStandings(members, tie, [matches[0]], now);
    // Equal points + equal exact → alphabetical: Amy before Zoe.
    expect(standings[0].member.displayName).toBe("Amy");
  });
});
