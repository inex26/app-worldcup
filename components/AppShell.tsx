"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { League } from "@/lib/types";
import { signOut } from "@/lib/data";
import { inviteUrl } from "@/lib/league";
import { Toast, copyText, useToast } from "./Toast";
import { CopyIcon, PlusIcon, ShareIcon, TrophyIcon } from "./icons";

type Tab = "predictions" | "leaderboard";

interface AppShellProps {
  league: League;
  active: Tab;
  children: React.ReactNode;
}

/**
 * Post-auth navigation shell: a sticky top bar (league name + member count) with the fleet CTAs
 * (Invite / My leagues / Create / Join) + sign out, and a bottom tab bar (Predictions | Leaderboard).
 */
export function AppShell({ league, active, children }: AppShellProps) {
  const router = useRouter();
  const { message, show } = useToast();

  async function handleInvite() {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const ok = await copyText(inviteUrl(origin, league.inviteToken));
    show(ok ? "Invite link copied!" : "Couldn't copy");
  }

  async function handleSignOut() {
    await signOut();
    router.replace("/");
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
        <div className="appbar-actions">
          <button
            type="button"
            className="btn btn-outlined btn-sm"
            onClick={handleInvite}
            aria-label="Copy league invite link"
          >
            <CopyIcon width={16} height={16} />
            <span className="appbar-label">Invite</span>
          </button>
          <Link className="btn btn-outlined btn-sm" href="/leagues" aria-label="My leagues">
            <TrophyIcon width={16} height={16} />
            <span className="appbar-label">Leagues</span>
          </Link>
          <Link className="btn btn-outlined btn-sm" href="/create" aria-label="Create a league">
            <PlusIcon width={16} height={16} />
            <span className="appbar-label">Create</span>
          </Link>
          <Link className="btn btn-outlined btn-sm" href="/join" aria-label="Join a league">
            <ShareIcon width={16} height={16} />
            <span className="appbar-label">Join</span>
          </Link>
          <button type="button" className="btn btn-ghost btn-sm" onClick={handleSignOut}>
            Sign out
          </button>
        </div>
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
