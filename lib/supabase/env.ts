/**
 * Read the public Supabase config from the environment.
 *
 * Both values are browser-exposed (`NEXT_PUBLIC_` prefix) and never hardcoded —
 * real values live in `.env.local` locally and in Vercel env vars per environment.
 * Reads are lazy (inside a function) so a missing var only throws when a client is
 * actually constructed at runtime, never during build/prerender.
 */
export function supabaseEnv(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and " +
        "NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local (see README).",
    );
  }

  return { url, anonKey };
}
