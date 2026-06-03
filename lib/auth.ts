/**
 * Validation for the cross-device "save your account / sign in" flow.
 *
 * Identity is an anonymous Supabase session by default (see lib/data.ts). To
 * reach the same league from another device a user attaches an email to their
 * account and then signs in with a one-time code emailed to that address. These
 * are the client-side shape checks that run before we hit the network — Supabase
 * remains the real authority on deliverability and code validity.
 */

/** Max length of an email address per RFC 5321. */
const EMAIL_MAX = 254;

/**
 * Lightweight email shape check. Deliberately permissive — it only catches
 * obvious typos (missing `@`, no domain, stray spaces) before we send a code.
 */
export function isValidEmail(email: string): boolean {
  const trimmed = email.trim();
  if (trimmed.length === 0 || trimmed.length > EMAIL_MAX) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed);
}

/** Supabase emails a six-digit one-time code. */
export const OTP_LENGTH = 6;

/** Validate the shape of the emailed one-time code (exactly six digits). */
export function isValidOtpCode(code: string): boolean {
  return new RegExp(`^\\d{${OTP_LENGTH}}$`).test(code.trim());
}
