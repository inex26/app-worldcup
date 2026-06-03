"use client";

import { useEffect, useState } from "react";
import { loadSession } from "@/lib/data";
import type { CurrentUser, League } from "@/lib/types";

export interface Session {
  /** True until the first Supabase session lookup completes. */
  loading: boolean;
  user: CurrentUser | null;
  league: League | null;
  /** Set when sign-in or the session lookup fails. */
  error: boolean;
}

/**
 * Resolve the current user + their active league from Supabase (client only).
 * Signs in anonymously on first visit. `bump` can be incremented by the caller
 * to force a re-fetch after a write.
 */
export function useSession(bump = 0): Session {
  const [session, setSession] = useState<Session>({
    loading: true,
    user: null,
    league: null,
    error: false,
  });

  useEffect(() => {
    let active = true;
    setSession((s) => ({ ...s, loading: true }));
    loadSession()
      .then(({ user, league }) => {
        if (active) setSession({ loading: false, user, league, error: false });
      })
      .catch((err) => {
        console.error("Session load failed:", err);
        if (active) setSession({ loading: false, user: null, league: null, error: true });
      });
    return () => {
      active = false;
    };
  }, [bump]);

  return session;
}
