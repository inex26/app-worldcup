"use client";

import Link from "next/link";
import { useSession } from "@/components/useSession";
import { TrophyIcon } from "@/components/icons";

/** Screen 1 — Home. Two CTAs, plus a "resume" banner when a league already exists. */
export default function HomePage() {
  const { loading, league } = useSession();

  return (
    <main className="center-page">
      <div className="hero stack">
        <div className="trophy" aria-hidden="true">
          <TrophyIcon style={{ color: "var(--gold)" }} />
        </div>
        <h1>World Cup Predictions</h1>
        <p className="muted">Predict the World Cup with friends.</p>

        {!loading && league && (
          <div className="banner">
            <span>
              Resume <strong>{league.name}</strong>
            </span>
            <Link className="btn btn-ghost btn-sm" href="/predictions">
              Go →
            </Link>
          </div>
        )}

        <div className="stack" style={{ gap: "var(--sp-2)" }}>
          <Link className="btn btn-filled btn-block" href="/create">
            Create League
          </Link>
          <Link className="btn btn-outlined btn-block" href="/join">
            Join League
          </Link>
        </div>
      </div>
    </main>
  );
}
