import { describe, it, expect } from "vitest";
import { CODE_LENGTH, generateCode, isValidCode, generateLeagueName } from "./league";

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
