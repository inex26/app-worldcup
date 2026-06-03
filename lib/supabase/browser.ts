/**
 * Browser Supabase client (Client Components only).
 *
 * Singleton — `createBrowserClient` stores the session in cookies (so the server
 * can read it too) and must not be re-created on every render. Never import this
 * from a Server Component; use `./server` there.
 */
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseEnv } from "./env";

let client: SupabaseClient | undefined;

export function getBrowserClient(): SupabaseClient {
  if (!client) {
    const { url, anonKey } = supabaseEnv();
    client = createBrowserClient(url, anonKey);
  }
  return client;
}
