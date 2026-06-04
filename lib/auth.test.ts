import { describe, it, expect } from "vitest";
import { isValidEmail, isValidUsername, isValidPassword } from "./auth";

describe("isValidEmail", () => {
  it("accepts normal addresses (trimming surrounding space)", () => {
    expect(isValidEmail("alex@example.com")).toBe(true);
    expect(isValidEmail("  alex.smith+wc@team.co.uk  ")).toBe(true);
  });

  it("rejects obvious non-emails", () => {
    expect(isValidEmail("")).toBe(false);
    expect(isValidEmail("alex")).toBe(false);
    expect(isValidEmail("alex@")).toBe(false);
    expect(isValidEmail("alex@example")).toBe(false); // no TLD
    expect(isValidEmail("alex @example.com")).toBe(false); // space
    expect(isValidEmail("a@b.c")).toBe(false); // 1-char TLD
  });

  it("rejects absurdly long input", () => {
    expect(isValidEmail(`${"a".repeat(250)}@example.com`)).toBe(false);
  });
});

describe("isValidUsername", () => {
  it("accepts 2–24 char names (trimming)", () => {
    expect(isValidUsername("Al")).toBe(true);
    expect(isValidUsername("  Sam  ")).toBe(true);
    expect(isValidUsername("a".repeat(24))).toBe(true);
  });

  it("rejects empty/too-short/too-long", () => {
    expect(isValidUsername("")).toBe(false);
    expect(isValidUsername(" ")).toBe(false);
    expect(isValidUsername("a")).toBe(false);
    expect(isValidUsername("a".repeat(25))).toBe(false);
  });
});

describe("isValidPassword", () => {
  it("accepts 8+ characters", () => {
    expect(isValidPassword("hunter22")).toBe(true);
  });

  it("rejects shorter than 8", () => {
    expect(isValidPassword("short")).toBe(false);
    expect(isValidPassword("")).toBe(false);
  });
});
