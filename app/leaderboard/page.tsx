"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { LoadError } from "@/components/LoadError";
import { TabBar } from "@/components/TabBar";
import { LeaderboardRow } from "@/components/LeaderboardRow";
import { SkeletonList } from "@/components/SkeletonRow";
import { EmptyState } from "@/components/EmptyState";
import { MatchRow } from "@/components/MatchRow";
import { Toast, useToast } from "@/components/Toast";
import { useSession } from "@/components/useSession";
import { isLocked, matchSections } from "@/lib/matches";
import { computeStandings, scorePrediction } from "@/lib/scoring";
import { fetchLeaderboard, fetchMatches } from "@/lib/data";
import type { Match, Member, Prediction } from "@/lib/types";

type TabId = "standings" | "mypicks";

/** Leaderboard — standings table + a read-only "My Picks" history tab. */
export default function LeaderboardPage() {
  const router = useRouter();
  const { loading, user, league, error, errorMessage } = useSession();
  const { message, show } = useToast();
  const [now] = useState(() => Date.now());
  const [tab, setTab] = useState<TabId>("standings");
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [lb, setLb] = useState<{
    members: Member[];
    predictionsByMember: Record<string, Prediction[]>;
  } | null>(null);

  useEffect(() => {
    if (!loading && !error && (!user || !league)) router.replace("/");
  }, [loading, error, user, league, router]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    fetchMatches()
      .then((ms) => active && setMatches(ms))
      .catch((err) => {
        console.error("Load matches failed:", err);
        if (active) setMatches([]);
      });
    return () => {
      active = false;
    };
  }, [user]);

  // Confirm a just-completed join-via-link (?joined=1), then strip the param.
  useEffect(() => {
    if (typeof window === "undefined" || !league) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("joined")) {
      show(`You joined ${league.name}!`);
      window.history.replaceState(null, "", "/leaderboard");
    }
  }, [league, show]);

  useEffect(() => {
    if (!user || !league) return;
    let active = true;
    fetchLeaderboard(league.id)
      .then((data) => active && setLb(data))
      .catch((err) => {
        console.error("Load leaderboard failed:", err);
        if (active) setLb({ members: [], predictionsByMember: {} });
      });
    return () => {
      active = false;
    };
  }, [user, league]);

  const standings = useMemo(
    () => (lb && matches ? computeStandings(lb.members, lb.predictionsByMember, matches, now) : []),
    [lb, matches, now],
  );
  const myPicks = useMemo(() => {
    const mine: Record<string, Prediction> = {};
    if (lb && user) for (const p of lb.predictionsByMember[user.id] ?? []) mine[p.matchId] = p;
    return mine;
  }, [lb, user]);

  const ready = lb !== null && matches !== null;

  if (error) return <LoadError message={errorMessage} />;
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
          {!ready ? (
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
            matchSections(matches ?? [])
              .map((section) => ({
                ...section,
                matches: section.matches.filter((m) => myPicks[m.id] !== undefined),
              }))
              .filter((section) => section.matches.length > 0)
              .map((section) => (
                <section key={section.key} aria-label={section.label}>
                  <h2 style={{ margin: "var(--sp-4) 0 var(--sp-2)" }}>{section.label}</h2>
                  {section.matches.map((match) => {
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
                        value={{ home: String(pick.home), away: String(pick.away) }}
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
