/** Shimmering placeholder row (matches LeaderboardRow height). */
export function SkeletonRow() {
  return <div className="skeleton-row" aria-hidden="true" />;
}

/** A stack of `count` skeleton rows with a polite loading announcement. */
export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">Loading leaderboard…</span>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}
