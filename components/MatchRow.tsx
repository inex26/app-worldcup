"use client";

import type { Match, Score } from "@/lib/types";
import type { Points } from "@/lib/scoring";
import { formatKickoff } from "@/lib/format";
import { Button } from "./Button";
import { ScoreBadge, StatusBadge } from "./Badge";

export interface RowValue {
  home: string;
  away: string;
}

interface MatchRowProps {
  match: Match;
  value: RowValue;
  locked: boolean;
  /** A saved prediction exists for this match. */
  saved: boolean;
  /** Current inputs differ from the saved prediction. */
  dirty: boolean;
  /** Final score, present when the match is played + locked. */
  result?: Score;
  /** Points the user's prediction earned (only when played + a prediction exists). */
  points?: Points;
  /** Read-only mode (My Picks tab): no editing, no save button. */
  readOnly?: boolean;
  onChange?: (field: "home" | "away", value: string) => void;
  onSave?: () => void;
}

/** A single match: two score inputs wrapped in a fieldset, plus status + score badges. */
export function MatchRow({
  match,
  value,
  locked,
  saved,
  dirty,
  result,
  points,
  readOnly = false,
  onChange,
  onSave,
}: MatchRowProps) {
  const inputsDisabled = locked || readOnly;
  const correct = points !== undefined && points > 0;

  return (
    <fieldset className={`match-row${correct ? " correct" : ""}`}>
      <legend>
        {match.stage === "group" ? `Group ${match.group} · Matchday ${match.matchday}` : ""}
      </legend>

      <div className="match-grid">
        <span className="team">
          <span className="flag" aria-hidden="true">
            {match.home?.flag ?? ""}
          </span>
          {match.home?.name ?? "TBD"}
        </span>

        <span className="score-inputs">
          <input
            className="score-input"
            type="number"
            min={0}
            max={20}
            inputMode="numeric"
            value={value.home}
            disabled={inputsDisabled}
            aria-disabled={inputsDisabled || undefined}
            aria-label={`${match.home?.name ?? "Home"} goals`}
            onChange={(e) => onChange?.("home", e.target.value)}
          />
          <span className="score-sep" aria-hidden="true">
            –
          </span>
          <input
            className="score-input"
            type="number"
            min={0}
            max={20}
            inputMode="numeric"
            value={value.away}
            disabled={inputsDisabled}
            aria-disabled={inputsDisabled || undefined}
            aria-label={`${match.away?.name ?? "Away"} goals`}
            onChange={(e) => onChange?.("away", e.target.value)}
          />
        </span>

        <span className="team away">
          <span className="flag" aria-hidden="true">
            {match.away?.flag ?? ""}
          </span>
          {match.away?.name ?? "TBD"}
        </span>
      </div>

      <div className="match-meta">
        <span className="muted" style={{ fontSize: "0.85rem" }}>
          {match.kickoff ? formatKickoff(match.kickoff) : "Date TBD"}
        </span>

        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {result && (
            <span className="match-result">
              Final {result.home}–{result.away}
            </span>
          )}
          {points !== undefined && <ScoreBadge points={points} />}
          {locked ? <StatusBadge kind="locked" /> : saved && <StatusBadge kind="saved" />}
        </span>
      </div>

      {!readOnly && !locked && (
        <div style={{ marginTop: "var(--sp-3)", display: "flex", justifyContent: "flex-end" }}>
          <Button variant="ghost" size="sm" onClick={onSave} disabled={!dirty}>
            {saved ? "Update" : "Save"}
          </Button>
        </div>
      )}
    </fieldset>
  );
}
