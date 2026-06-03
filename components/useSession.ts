"use client";

import { useEffect, useState } from "react";
import { getCurrentUser, getLeague } from "@/lib/storage";
import type { CurrentUser, League } from "@/lib/types";

export interface Session {
  /** True until the first client-side localStorage read completes. */
  loading: boolean;
  user: CurrentUser | null;
  league: League | null;
}

/**
 * Load the current user + their league from localStorage (client only).
 * `bump` can be incremented by the caller to force a re-read after a write.
 */
export function useSession(bump = 0): Session {
  const [session, setSession] = useState<Session>({
    loading: true,
    user: null,
    league: null,
  });

  useEffect(() => {
    const user = getCurrentUser();
    const league = user ? getLeague(user.leagueCode) : null;
    setSession({ loading: false, user, league });
  }, [bump]);

  return session;
}
