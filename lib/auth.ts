/**
 * Validation for the email + password sign-up / sign-in flows (client-side shape
 * checks before we hit the network; Supabase is the real authority). A user signs
 * up with a username (their display name in leagues) + email + password; email is
 * the recoverable login credential. See lib/data.ts for the Supabase calls.
 */

/** Max length of an email address per RFC 5321. */
const EMAIL_MAX = 254;

/** Username = the name shown on leaderboards. Kept short and human. */
export const USERNAME_MIN = 2;
export const USERNAME_MAX = 24;

/** Supabase's default minimum password length is 6; we ask for a bit more. */
export const PASSWORD_MIN = 8;

/** Validate a username / display name: non-blank, within length bounds. */
export function isValidUsername(name: string): boolean {
  const trimmed = name.trim();
  return trimmed.length >= USERNAME_MIN && trimmed.length <= USERNAME_MAX;
}

/** Validate a password: at least PASSWORD_MIN characters (Supabase hashes it). */
export function isValidPassword(password: string): boolean {
  return password.length >= PASSWORD_MIN;
}

/**
 * Lightweight email shape check. Deliberately permissive — it only catches
 * obvious typos (missing `@`, no domain, stray spaces) before we send a code.
 */
export function isValidEmail(email: string): boolean {
  const trimmed = email.trim();
  if (trimmed.length === 0 || trimmed.length > EMAIL_MAX) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed);
}