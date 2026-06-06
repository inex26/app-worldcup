"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { LoadError } from "@/components/LoadError";
import { MatchRow, type RowValue } from "@/components/MatchRow";
import { Button } from "@/components/Button";
import { ChevronIcon } from "@/components/icons";
import { Toast, useToast } from "@/components/Toast";
import { useSession } from "@/components/useSession";
import { isLocked, isPredictable, matchSections } from "@/lib/matches";
import { scorePrediction } from "@/lib/scoring";
import { fetchMatches, fetchPredictions, savePrediction } from "@/lib/data";
import type { Match, Prediction } from "@/lib/types";

/** Parse an input string into a valid goal count (0–20 integer) or null. */
function parseGoals(v: string): number | null {
  if (v.trim() === "") return null;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 0 || n > 20) return null;
  return n;
}

/** Predictions — collapsible sections (group matchdays + knockout rounds) with per-row + bulk save. */
export default function PredictionsPage() {
  const router = useRouter();
  const { loading, user, league, error, errorMessage } = useSession();
  const { message, show } = useToast();

  const [now] = useState(() => Date.now());
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [values, setValues] = useState<Record<string, RowValue>>({});
  const [saved, setSaved] = useState<Record<string, Prediction>>({});
  const [open, setOpen] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!loading && !error && (!user || !league)) router.replace("/");
  }, [loading, error, user, league, router]);

  // Load the fixtures (source of truth = DB).
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

  const sections = useMemo(() => matchSections(matches ?? []), [matches]);

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
    () => (matches ?? []).filter((m) => isPredictable(m, now) && isDirty(m.id)).map((m) => m.id),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [matches, values, saved, now],
  );

  function handleSaveAll() {
    let count = 0;
    for (const id of dirtyIds) if (saveOne(id)) count++;
    if (count > 0) show(`Saved ${count} prediction${count === 1 ? "" : "s"}`);
  }

  if (error) return <LoadError message={errorMessage} />;
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
        Predict every score. Exact score = <strong>3 pts</strong>, correct result ={" "}
        <strong>1 pt</strong>. Picks lock at kickoff.
      </p>

      {matches === null ? (
        <p className="muted">Loading matches…</p>
      ) : sections.length === 0 ? (
        <p className="muted">Matches will appear here once they&apos;re published.</p>
      ) : (
        sections.map((section) => {
          const isOpen = open[section.key] ?? true;
          return (
            <section key={section.key} aria-labelledby={`sec-${section.key}`}>
              <button
                type="button"
                className="section-header"
                aria-expanded={isOpen}
                aria-controls={`sec-${section.key}-panel`}
                onClick={() => setOpen((p) => ({ ...p, [section.key]: !isOpen }))}
              >
                <h2 id={`sec-${section.key}`} style={{ margin: 0 }}>
                  {section.label}
                </h2>
                <ChevronIcon className="chev" />
              </button>

              {isOpen && (
                <div id={`sec-${section.key}-panel`}>
                  {section.matches.map((match) => {
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
                        locked={!isPredictable(match, now)}
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
          );
        })
      )}

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
