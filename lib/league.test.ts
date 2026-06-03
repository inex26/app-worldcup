import { describe, it, expect } from "vitest";
import {
  CODE_LENGTH,
  generateCode,
  isValidCode,
  generateLeagueName,
  seedMockMembers,
  seedMockPredictions,
  withMember,
} from "./league";
import { MATCHES } from "./matches";
import type { League } from "./types";

/** Deterministic PRNG-ish source for tests. */
function seq(values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length];
}

describe("generateCode", () => {
  it("produces a 6-char code from the safe alphabet", () => {
    const code = generateCode(seq([0, 0.5, 0.99, 0.1, 0.3, 0.7]));
    expect(code).toHaveLength(CODE_LENGTH);
    expect(isValidCode(code)).toBe(true);
  });

  it("never includes ambiguous characters", () => {
    for (let i = 0; i < 50; i++) {
      const code = generateCode();
      expect(code).not.toMatch(/[01OI]/);
    }
  });
});

describe("isValidCode", () => {
  it("rejects wrong length or bad characters", () => {
    expect(isValidCode("ABCDE")).toBe(false); // too short
    expect(isValidCode("ABCDEFG")).toBe(false); // too long
    expect(isValidCode("ABC0EF")).toBe(false); // contains 0
    expect(isValidCode("ABCDEF")).toBe(true);
  });
});

describe("generateLeagueName", () => {
  it("combines an adjective and noun", () => {
    const name = generateLeagueName(seq([0, 0]));
    expect(name.split(" ")).toHaveLength(2);
  });
});

describe("mock seeding", () => {
  it("seeds 5 rival members", () => {
    expect(seedMockMembers()).toHaveLength(5);
  });

  it("seeds a valid prediction for every match", () => {
    const [member] = seedMockMembers();
    const preds = seedMockPredictions(member, MATCHES, 1);
    expect(preds).toHaveLength(MATCHES.length);
    expect(preds.every((p) => p.home >= 0 && p.away >= 0)).toBe(true);
  });
});

describe("withMember", () => {
  const league: League = { name: "Test", code: "ABCDEF", members: [] };

  it("adds a new member", () => {
    const next = withMember(league, { id: "u1", displayName: "Pat" });
    expect(next.members).toHaveLength(1);
  });

  it("is idempotent for an existing member id", () => {
    const one = withMember(league, { id: "u1", displayName: "Pat" });
    const two = withMember(one, { id: "u1", displayName: "Pat" });
    expect(two.members).toHaveLength(1);
  });
});
