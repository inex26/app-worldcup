/**
 * Server Supabase client (Server Components, Route Handlers, Server Actions).
 *
 * Reads/writes the session from the request cookies via `next/headers`. Never
 * import this from a Client Component; use `./browser` there. The `setAll` call
 * is wrapped in try/catch because cookies cannot be written from a Server
 * Component render (only from Route Handlers / Server Actions / middleware) —
 * the middleware refreshes the session in that case.
 */
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseEnv } from "./env";

export function createClient(): SupabaseClient {
  const cookieStore = cookies();
  const { url, anonKey } = supabaseEnv();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component render — safe to ignore; the
          // middleware will refresh the session cookie on the next request.
        }
      },
    },
  });
}
