"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { TabBar } from "@/components/TabBar";
import { LeaderboardRow } from "@/components/LeaderboardRow";
import { SkeletonList } from "@/components/SkeletonRow";
import { EmptyState } from "@/components/EmptyState";
import { MatchRow } from "@/components/MatchRow";
import { Toast, useToast } from "@/components/Toast";
import { useSession } from "@/components/useSession";
import { MATCHES, ROUNDS, isLocked } from "@/lib/matches";
import { computeStandings, scorePrediction } from "@/lib/scoring";
import { fetchLeaderboard } from "@/lib/data";
import type { Prediction, Standing } from "@/lib/types";

type TabId = "standings" | "mypicks";

/** Screen 5 — Leaderboard. Standings table + a read-only "My Picks" history tab. */
export default function LeaderboardPage() {
  const router = useRouter();
  const { loading, user, league } = useSession();
  const { message, show } = useToast();
  const [now] = useState(() => Date.now());
  const [tab, setTab] = useState<TabId>("standings");
  const [skeleton, setSkeleton] = useState(true);
  const [myPicks, setMyPicks] = useState<Record<string, Prediction>>({});
  const [standings, setStandings] = useState<Standing[]>([]);

  useEffect(() => {
    if (!loading && (!user || !league)) router.replace("/");
  }, [loading, user, league, router]);

  // Confirm a just-completed join-via-link (?joined=1), then strip the param so
  // a refresh doesn't re-toast. Read from the URL directly to avoid a Suspense
  // boundary for useSearchParams.
  useEffect(() => {
    if (typeof window === "undefined" || !league) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("joined")) {
      show(`You joined ${league.name}!`);
      window.history.replaceState(null, "", "/leaderboard");
    }
  }, [league, show]);

  // Load every member's predictions for this league, then compute standings and
  // the caller's own picks from the same payload.
  useEffect(() => {
    if (!user || !league) return;
    let active = true;
    setSkeleton(true);
    fetchLeaderboard(league.id)
      .then(({ members, predictionsByMember }) => {
        if (!active) return;
        setStandings(computeStandings(members, predictionsByMember, MATCHES, now));
        const mine: Record<string, Prediction> = {};
        for (const p of predictionsByMember[user.id] ?? []) mine[p.matchId] = p;
        setMyPicks(mine);
        setSkeleton(false);
      })
      .catch((err) => {
        console.error("Load leaderboard failed:", err);
        if (active) setSkeleton(false);
      });
    return () => {
      active = false;
    };
  }, [user, league, now]);

  if (loading || !user || !league) {
    return (
      <main className="center-page">
        <p className="muted">Loading…</p>
      </main>
    );
  }

  const hasPicks = Object.keys(myPicks).length > 0;

  return (
    <AppShell league={league} active="leaderboard">
      <h1>Leaderboard</h1>

      <TabBar
        idBase="lb"
        active={tab}
        onChange={(id) => setTab(id as TabId)}
        tabs={[
          { id: "standings", label: "Standings" },
          { id: "mypicks", label: "My Picks" },
        ]}
      />

      {tab === "standings" && (
        <div id="lb-panel-standings" role="tabpanel" aria-labelledby="lb-tab-standings">
          {skeleton ? (
            <SkeletonList count={5} />
          ) : (
            <table className="lb-table">
              <caption className="sr-only">League standings</caption>
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Player</th>
                  <th scope="col" className="num">
                    Pts
                  </th>
                  <th scope="col" className="num">
                    Exact
                  </th>
                  <th scope="col" className="num">
                    Result
                  </th>
                </tr>
              </thead>
              <tbody>
                {standings.map((s) => (
                  <LeaderboardRow key={s.member.id} standing={s} isMe={s.member.id === user.id} />
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === "mypicks" && (
        <div id="lb-panel-mypicks" role="tabpanel" aria-labelledby="lb-tab-mypicks">
          {!hasPicks ? (
            <EmptyState icon="⚽" heading="No predictions yet">
              <Link className="btn btn-filled" href="/predictions">
                Submit your first prediction
              </Link>
            </EmptyState>
          ) : (
            ROUNDS.map((round) => (
              <section key={round} aria-label={`Matchday ${round}`}>
                <h2 style={{ margin: "var(--sp-4) 0 var(--sp-2)" }}>Matchday {round}</h2>
                {MATCHES.filter((m) => m.round === round).map((match) => {
                  const pick = myPicks[match.id];
                  const locked = isLocked(match, now);
                  const points =
                    locked && match.result && pick
                      ? scorePrediction({ home: pick.home, away: pick.away }, match.result)
                      : undefined;
                  return (
                    <MatchRow
                      key={match.id}
                      match={match}
                      readOnly
                      locked={locked}
                      saved={pick !== undefined}
                      dirty={false}
                      value={
                        pick
                          ? { home: String(pick.home), away: String(pick.away) }
                          : { home: "", away: "" }
                      }
                      result={locked ? match.result : undefined}
                      points={points}
                    />
                  );
                })}
              </section>
            ))
          )}
        </div>
      )}

      <Toast message={message} />
    </AppShell>
  );
}
