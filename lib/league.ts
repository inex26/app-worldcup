/** League code + name generation. */

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous 0/O/1/I
export const CODE_LENGTH = 6;

/**
 * Generate a mock 6-char share code. Not guaranteed unique (documented demo
 * limitation) — collisions are acceptable at mock scale.
 */
export function generateCode(rand: () => number = Math.random): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[Math.floor(rand() * CODE_ALPHABET.length)];
  }
  return code;
}

/** Validate the shape of a league code (6 chars from the allowed alphabet). */
export function isValidCode(code: string): boolean {
  if (code.length !== CODE_LENGTH) return false;
  return [...code].every((c) => CODE_ALPHABET.includes(c));
}

const ADJECTIVES = ["Golden", "Mighty", "Roaring", "Electric", "Iron", "Cosmic", "Wild", "Royal"];
const NOUNS = ["Strikers", "Eagles", "Lions", "Rovers", "Galaxy", "Titans", "Comets", "Hawks"];

/** Generate a friendly league name (e.g. "Golden Strikers"), used as a placeholder. */
export function generateLeagueName(rand: () => number = Math.random): string {
  const adj = ADJECTIVES[Math.floor(rand() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(rand() * NOUNS.length)];
  return `${adj} ${noun}`;
}

/** Max length for a user-chosen league name (see PRD: League name, max 30 chars). */
export const LEAGUE_NAME_MAX = 30;

/** Validate a user-entered league name: non-blank and within the length cap. */
export function isValidLeagueName(name: string): boolean {
  const trimmed = name.trim();
  return trimmed.length > 0 && trimmed.length <= LEAGUE_NAME_MAX;
}

/**
 * Build the shareable invite URL for a league from its secure invite token. The
 * token (≥128-bit, generated server-side) is what makes the link hard to guess;
 * see supabase/schema.sql `leagues.invite_token`.
 */
export function inviteUrl(origin: string, token: string): string {
  return `${origin.replace(/\/+$/, "")}/join/${token}`;
}

/**
 * Extract the invite token from a pasted value — accepts a full invite URL
 * (`https://…/join/<token>`) or a bare token. Returns "" if nothing usable.
 */
export function extractToken(input: string): string {
  const trimmed = input.trim();
  const fromUrl = trimmed.match(/\/join\/([^/?#\s]+)/i);
  if (fromUrl) return fromUrl[1];
  return /^[^/\s]+$/.test(trimmed) ? trimmed : "";
}
