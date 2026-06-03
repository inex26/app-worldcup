import { describe, it, expect } from "vitest";
import { isValidEmail, isValidOtpCode, OTP_LENGTH } from "./auth";

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

describe("isValidOtpCode", () => {
  it("accepts exactly six digits (trimming space)", () => {
    expect(isValidOtpCode("123456")).toBe(true);
    expect(isValidOtpCode("  000000 ")).toBe(true);
    expect("123456").toHaveLength(OTP_LENGTH);
  });

  it("rejects wrong length or non-numeric codes", () => {
    expect(isValidOtpCode("12345")).toBe(false);
    expect(isValidOtpCode("1234567")).toBe(false);
    expect(isValidOtpCode("12a456")).toBe(false);
    expect(isValidOtpCode("")).toBe(false);
  });
});
