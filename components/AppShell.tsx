"use client";

import Link from "next/link";
import type { League } from "@/lib/types";
import { Toast, copyText, useToast } from "./Toast";
import { CopyIcon } from "./icons";

type Tab = "predictions" | "leaderboard";

interface AppShellProps {
  league: League;
  active: Tab;
  children: React.ReactNode;
}

/**
 * Post-join navigation shell: sticky top bar (league name + member count + copyable
 * code chip) and a bottom tab bar (Predictions | Leaderboard).
 */
export function AppShell({ league, active, children }: AppShellProps) {
  const { message, show } = useToast();

  async function copyCode() {
    const ok = await copyText(league.code);
    show(ok ? "Code copied!" : "Couldn't copy");
  }

  return (
    <>
      <header className="appbar">
        <span className="title">
          {league.name}
          <small>
            {league.members.length} {league.members.length === 1 ? "member" : "members"}
          </small>
        </span>
        <button
          type="button"
          className="code-chip"
          onClick={copyCode}
          aria-label={`Copy league code ${league.code}`}
        >
          {league.code}
          <CopyIcon width={16} height={16} />
        </button>
      </header>

      <main className="page">{children}</main>

      <nav className="tabbar" aria-label="League sections">
        <Link href="/predictions" aria-current={active === "predictions" ? "page" : undefined}>
          Predictions
        </Link>
        <Link href="/leaderboard" aria-current={active === "leaderboard" ? "page" : undefined}>
          Leaderboard
        </Link>
      </nav>

      <Toast message={message} />
    </>
  );
}
