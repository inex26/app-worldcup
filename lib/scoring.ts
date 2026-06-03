/** Pure scoring + standings logic. No DOM / storage dependencies — fully unit-tested. */
import type { Match, Member, Prediction, Score, Standing } from "./types";
import { isPlayed } from "./matches";

export type Points = 3 | 1 | 0;

/** Sign of (home - away): 1 = home win, -1 = away win, 0 = draw. */
function outcome(s: Score): number {
  return Math.sign(s.home - s.away);
}

/**
 * Score a single prediction against the actual result.
 * - Exact score → 3 points
 * - Correct result (winner or draw) but wrong score → 1 point
 * - Otherwise → 0 points
 */
export function scorePrediction(pred: Score, result: Score): Points {
  if (pred.home === result.home && pred.away === result.away) return 3;
  if (outcome(pred) === outcome(result)) return 1;
  return 0;
}

/** Build a fast lookup of a member's predictions keyed by matchId. */
function indexPredictions(predictions: Prediction[]): Map<string, Prediction> {
  const map = new Map<string, Prediction>();
  for (const p of predictions) map.set(p.matchId, p);
  return map;
}

/**
 * Compute ranked standings for every member.
 * Only matches that are played (locked + have a result) at `now` contribute points.
 * Ties are broken by exact-score count, then alphabetically by display name.
 */
export function computeStandings(
  members: Member[],
  predictionsByMember: Record<string, Prediction[]>,
  matches: Match[],
  now: number,
): Standing[] {
  const playedMatches = matches.filter((m) => isPlayed(m, now));

  const partial = members.map((member) => {
    const preds = indexPredictions(predictionsByMember[member.id] ?? []);
    let points = 0;
    let exact = 0;
    let correct = 0;

    for (const match of playedMatches) {
      const pred = preds.get(match.id);
      if (!pred || !match.result) continue;
      const pts = scorePrediction(pred, match.result);
      points += pts;
      if (pts === 3) exact += 1;
      else if (pts === 1) correct += 1;
    }

    return { member, points, exact, correct };
  });

  partial.sort(
    (a, b) =>
      b.points - a.points ||
      b.exact - a.exact ||
      a.member.displayName.localeCompare(b.member.displayName),
  );

  return partial.map((row, i) => ({ ...row, rank: i + 1 }));
}
