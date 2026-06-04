"use client";

import Link from "next/link";

/**
 * Full-page load-failure card. Shown when `useSession` reports an error (e.g. the
 * live database is behind the app / schema drift) instead of silently bouncing to
 * the homepage — so the real, actionable reason is visible.
 */
export function LoadError({ message }: { message?: string | null }) {
  return (
    <main className="center-page center-page--modal">
      <div className="card stack" style={{ width: "min(440px, 100%)" }}>
        <h1>Something went wrong</h1>
        <p className="muted">{message ?? "We couldn't load this page. Please reload and try again."}</p>
        <button
          type="button"
          className="btn btn-filled btn-block"
          onClick={() => window.location.reload()}
        >
          Reload
        </button>
        <Link className="btn btn-ghost btn-block btn-sm" href="/">
          Go home
        </Link>
      </div>
    </main>
  );
}
