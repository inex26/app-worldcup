import type { Points } from "@/lib/scoring";

/** Saved / Locked status badge. Colour is never the sole indicator — icon + text too. */
export function StatusBadge({ kind }: { kind: "saved" | "locked" }) {
  if (kind === "saved") {
    return <span className="badge badge-saved">✓ Saved</span>;
  }
  return <span className="badge badge-locked">🔒 Locked</span>;
}

/** Points chip shown on played + locked rows: +3 (gold) / +1 (blue) / +0 (muted). */
export function ScoreBadge({ points }: { points: Points }) {
  const label =
    points === 3 ? "Exact score" : points === 1 ? "Correct result" : "No points";
  return (
    <span className={`badge badge-${points}`} title={label}>
      +{points}
      <span className="sr-only"> — {label}</span>
    </span>
  );
}
