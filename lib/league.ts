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

/** Generate a friendly league name (e.g. "Golden Strikers"). */
export function generateLeagueName(rand: () => number = Math.random): string {
  const adj = ADJECTIVES[Math.floor(rand() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(rand() * NOUNS.length)];
  return `${adj} ${noun}`;
}
