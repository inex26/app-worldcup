"use client";

import { useEffect, useState } from "react";
import { isSchemaDriftError, loadSession, SCHEMA_DRIFT_HINT } from "@/lib/data";
import type { CurrentUser, League } from "@/lib/types";

export interface Session {
  /** True until the first Supabase session lookup completes. */
  loading: boolean;
  user: CurrentUser | null;
  league: League | null;
  /** Set when the session lookup fails (e.g. schema drift) — distinct from "not signed in". */
  error: boolean;
  /** A human-readable reason when `error` is true. */
  errorMessage: string | null;
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
    errorMessage: null,
  });

  useEffect(() => {
    let active = true;
    setSession((s) => ({ ...s, loading: true }));
    loadSession()
      .then(({ user, league }) => {
        if (active) setSession({ loading: false, user, league, error: false, errorMessage: null });
      })
      .catch((err) => {
        console.error("Session load failed:", err);
        const errorMessage = isSchemaDriftError(err)
          ? SCHEMA_DRIFT_HINT
          : "Couldn't load your session. Please reload and try again.";
        if (active) setSession({ loading: false, user: null, league: null, error: true, errorMessage });
      });
    return () => {
      active = false;
    };
  }, [bump]);

  return session;
}
