"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { MatchRow, type RowValue } from "@/components/MatchRow";
import { Button } from "@/components/Button";
import { ChevronIcon } from "@/components/icons";
import { Toast, useToast } from "@/components/Toast";
import { useSession } from "@/components/useSession";
import { MATCHES, ROUNDS, isLocked } from "@/lib/matches";
import { scorePrediction } from "@/lib/scoring";
import { fetchPredictions, savePrediction } from "@/lib/data";
import type { Prediction } from "@/lib/types";

/** Parse an input string into a valid goal count (0–20 integer) or null. */
function parseGoals(v: string): number | null {
  if (v.trim() === "") return null;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 0 || n > 20) return null;
  return n;
}

/** Screen 4 — Predictions. Collapsible matchday sections with per-row + bulk save. */
export default function PredictionsPage() {
  const router = useRouter();
  const { loading, user, league } = useSession();
  const { message, show } = useToast();

  const [now] = useState(() => Date.now());
  const [values, setValues] = useState<Record<string, RowValue>>({});
  const [saved, setSaved] = useState<Record<string, Prediction>>({});
  const [open, setOpen] = useState<Record<number, boolean>>(() =>
    Object.fromEntries(ROUNDS.map((r) => [r, true])),
  );

  // Redirect to home if there is no active session.
  useEffect(() => {
    if (!loading && (!user || !league)) router.replace("/");
  }, [loading, user, league, router]);

  // Hydrate inputs from saved predictions once the session is ready.
  useEffect(() => {
    if (!user || !league) return;
    let active = true;
    fetchPredictions(league.id, user.id)
      .then((preds) => {
        if (!active) return;
        const savedMap: Record<string, Prediction> = {};
        const valueMap: Record<string, RowValue> = {};
        for (const p of preds) {
          savedMap[p.matchId] = p;
          valueMap[p.matchId] = { home: String(p.home), away: String(p.away) };
        }
        setSaved(savedMap);
        setValues(valueMap);
      })
      .catch((err) => {
        console.error("Load predictions failed:", err);
        if (active) show("Couldn't load your predictions.");
      });
    return () => {
      active = false;
    };
  }, [user, league, show]);

  const matchesByRound = useMemo(
    () => ROUNDS.map((round) => ({ round, list: MATCHES.filter((m) => m.round === round) })),
    [],
  );

  function rowValue(matchId: string): RowValue {
    return values[matchId] ?? { home: "", away: "" };
  }

  function isComplete(v: RowValue): boolean {
    return parseGoals(v.home) !== null && parseGoals(v.away) !== null;
  }

  function isDirty(matchId: string): boolean {
    const v = rowValue(matchId);
    if (!isComplete(v)) return false;
    const s = saved[matchId];
    if (!s) return true;
    return parseGoals(v.home) !== s.home || parseGoals(v.away) !== s.away;
  }

  function handleChange(matchId: string, field: "home" | "away", value: string) {
    setValues((prev) => ({
      ...prev,
      [matchId]: { ...(prev[matchId] ?? { home: "", away: "" }), [field]: value },
    }));
  }

  function saveOne(matchId: string): boolean {
    if (!user || !league || !isDirty(matchId)) return false;
    const v = rowValue(matchId);
    const home = parseGoals(v.home);
    const away = parseGoals(v.away);
    if (home === null || away === null) return false;
    const prediction: Prediction = { matchId, home, away, savedAt: Date.now() };

    // Optimistic: reflect the save immediately, then persist in the background
    // and revert this row if the upsert fails.
    const previous = saved[matchId];
    setSaved((prev) => ({ ...prev, [matchId]: prediction }));
    savePrediction(league.id, user.id, prediction).catch((err) => {
      console.error("Save prediction failed:", err);
      setSaved((prev) => {
        const next = { ...prev };
        if (previous) next[matchId] = previous;
        else delete next[matchId];
        return next;
      });
      show("Couldn't save. Please try again.");
    });
    return true;
  }

  const dirtyIds = useMemo(
    () => MATCHES.filter((m) => !isLocked(m, now) && isDirty(m.id)).map((m) => m.id),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [values, saved, now],
  );

  function handleSaveAll() {
    let count = 0;
    for (const id of dirtyIds) if (saveOne(id)) count++;
    if (count > 0) show(`Saved ${count} prediction${count === 1 ? "" : "s"}`);
  }

  if (loading || !user || !league) {
    return (
      <main className="center-page">
        <p className="muted">Loading…</p>
      </main>
    );
  }

  return (
    <AppShell league={league} active="predictions">
      <h1>Predictions</h1>
      <p className="muted">
        Predict every group-stage score. Exact score = <strong>3 pts</strong>, correct result ={" "}
        <strong>1 pt</strong>. Picks lock at kickoff.
      </p>

      {matchesByRound.map(({ round, list }) => (
        <section key={round} aria-labelledby={`round-${round}`}>
          <button
            type="button"
            className="section-header"
            aria-expanded={open[round]}
            aria-controls={`round-${round}-panel`}
            onClick={() => setOpen((p) => ({ ...p, [round]: !p[round] }))}
          >
            <h2 id={`round-${round}`} style={{ margin: 0 }}>
              Matchday {round}
            </h2>
            <ChevronIcon className="chev" />
          </button>

          {open[round] && (
            <div id={`round-${round}-panel`}>
              {list.map((match) => {
                const locked = isLocked(match, now);
                const v = rowValue(match.id);
                const hasSaved = saved[match.id] !== undefined;
                const points =
                  locked && match.result && hasSaved
                    ? scorePrediction(
                        { home: saved[match.id].home, away: saved[match.id].away },
                        match.result,
                      )
                    : undefined;
                return (
                  <MatchRow
                    key={match.id}
                    match={match}
                    value={v}
                    locked={locked}
                    saved={hasSaved}
                    dirty={isDirty(match.id)}
                    result={locked ? match.result : undefined}
                    points={points}
                    onChange={(field, value) => handleChange(match.id, field, value)}
                    onSave={() => {
                      if (saveOne(match.id)) show("Prediction saved");
                    }}
                  />
                );
              })}
            </div>
          )}
        </section>
      ))}

      {dirtyIds.length > 0 && (
        <div className="save-footer">
          <span className="muted">
            {dirtyIds.length} unsaved change{dirtyIds.length === 1 ? "" : "s"}
          </span>
          <Button onClick={handleSaveAll}>Save all</Button>
        </div>
      )}

      <Toast message={message} />
    </AppShell>
  );
}
