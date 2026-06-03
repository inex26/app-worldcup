"use client";

import Link from "next/link";
import { useSession } from "@/components/useSession";

/**
 * Returning-visitor affordance for the landing page. The page itself is the
 * public, crawlable landing content (server-rendered); this client island layers
 * on a one-tap "resume" for anyone who is already in a league, without redirecting
 * away from the page (avoids the redirect-loop risk called out in the PRD and
 * keeps the SEO content as the canonical render). Renders nothing for new or
 * anonymous visitors, and nothing until the session check resolves (no flash).
 */
export function ResumeBanner() {
  const { loading, league } = useSession();

  if (loading || !league) return null;

  return (
    <div className="banner resume-banner">
      <span>
        Welcome back — resume <strong>{league.name}</strong>
      </span>
      <Link className="btn btn-ghost btn-sm" href="/predictions">
        Go →
      </Link>
    </div>
  );
}
