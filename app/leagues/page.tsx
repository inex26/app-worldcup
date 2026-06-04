"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoadError } from "@/components/LoadError";
import { Toast, copyText, useToast } from "@/components/Toast";
import { useSession } from "@/components/useSession";
import { loadLeagues } from "@/lib/data";
import { inviteUrl } from "@/lib/league";
import type { League } from "@/lib/types";

/** My leagues — a read-only list with per-league invite copy + create/join CTAs. */
export default function LeaguesPage() {
  const router = useRouter();
  const { loading, user, error, errorMessage } = useSession();
  const { message, show } = useToast();
  const [leagues, setLeagues] = useState<League[] | null>(null);

  // Auth guard: signed-out → landing (but surface load errors instead of bouncing).
  useEffect(() => {
    if (!loading && !error && !user) router.replace("/");
  }, [loading, error, user, router]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    loadLeagues()
      .then((lg) => active && setLeagues(lg))
      .catch((err) => {
        console.error("Load leagues failed:", err);
        if (active) setLeagues([]);
      });
    return () => {
      active = false;
    };
  }, [user]);

  async function copyInvite(league: League) {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const ok = await copyText(inviteUrl(origin, league.inviteToken));
    show(ok ? "Invite link copied!" : "Couldn't copy");
  }

  if (error) return <LoadError message={errorMessage} />;

  return (
    <main className="center-page center-page--modal">
      <div className="card stack" style={{ width: "min(540px, 100%)" }}>
        <Link href="/predictions" className="muted" style={{ fontSize: "0.9rem" }}>
          ← Back to predictions
        </Link>
        <h1>My leagues</h1>

        {leagues === null ? (
          <p className="muted">Loading…</p>
        ) : leagues.length === 0 ? (
          <p className="muted">You&apos;re not in any leagues yet.</p>
        ) : (
          <ul className="league-list">
            {leagues.map((lg) => (
              <li key={lg.id} className="league-row">
                <div className="stack" style={{ gap: "2px", minWidth: 0 }}>
                  <strong style={{ overflowWrap: "anywhere" }}>{lg.name}</strong>
                  <span className="muted" style={{ fontSize: "0.85rem" }}>
                    {lg.members.length} {lg.members.length === 1 ? "member" : "members"}
                  </span>
                </div>
                <button
                  type="button"
                  className="btn btn-outlined btn-sm"
                  onClick={() => copyInvite(lg)}
                >
                  Copy invite
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="stack" style={{ gap: "var(--sp-2)" }}>
          <Link className="btn btn-filled btn-block" href="/create">
            Create a league
          </Link>
          <Link className="btn btn-outlined btn-block" href="/join">
            Join a league
          </Link>
        </div>
      </div>
      <Toast message={message} />
    </main>
  );
}
