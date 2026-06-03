"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { InviteLink } from "@/components/InviteLink";
import { Toast, useToast } from "@/components/Toast";
import { useSession } from "@/components/useSession";
import { createLeague } from "@/lib/data";
import { inviteUrl, isValidLeagueName, LEAGUE_NAME_MAX } from "@/lib/league";
import type { League } from "@/lib/types";

/** Screen 2 — Create League. idle → submitting → created (shows invite link + share). */
export default function CreatePage() {
  const { user } = useSession();
  const [displayName, setDisplayName] = useState("");
  const [leagueName, setLeagueName] = useState("");
  const [league, setLeague] = useState<League | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { message, show } = useToast();

  // Pre-fill the display name from any existing membership (PRD: "pre-filled if exists").
  useEffect(() => {
    if (user?.displayName) setDisplayName((prev) => prev || user.displayName);
  }, [user]);

  const valid = displayName.trim().length > 0 && isValidLeagueName(leagueName);

  async function handleCreate() {
    if (!valid || submitting) return;
    setSubmitting(true);
    try {
      const full = await createLeague(displayName.trim(), leagueName.trim());
      setLeague(full);
    } catch (err) {
      console.error("Create league failed:", err);
      show("Couldn't create league. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const url =
    league && typeof window !== "undefined"
      ? inviteUrl(window.location.origin, league.inviteToken)
      : "";

  return (
    <main className="center-page">
      <div className="card stack" style={{ width: "min(480px, 100%)" }}>
        {!league ? (
          <>
            <Link href="/" className="muted" style={{ fontSize: "0.9rem" }}>
              ← Back
            </Link>
            <h1>Create a league</h1>
            <p className="muted">Name your league and pick a display name for yourself.</p>
            <form
              className="stack"
              onSubmit={(e) => {
                e.preventDefault();
                handleCreate();
              }}
            >
              <Input
                label="League name"
                placeholder="e.g. Office World Cup"
                autoComplete="off"
                maxLength={LEAGUE_NAME_MAX}
                value={leagueName}
                disabled={submitting}
                onChange={(e) => setLeagueName(e.target.value)}
              />
              <Input
                label="Your display name"
                placeholder="e.g. Sam"
                autoComplete="nickname"
                maxLength={24}
                value={displayName}
                disabled={submitting}
                onChange={(e) => setDisplayName(e.target.value)}
              />
              <Button type="submit" block disabled={!valid} loading={submitting}>
                {submitting ? "Creating…" : "Create league"}
              </Button>
            </form>
          </>
        ) : (
          <>
            <h1>{league.name}</h1>
            <p className="muted">
              Your league is ready. Share this link — anyone who opens it joins automatically.
            </p>
            <InviteLink leagueName={league.name} url={url} onToast={show} />
            <Link className="btn btn-ghost btn-block" href="/leaderboard">
              Done
            </Link>
          </>
        )}
      </div>
      <Toast message={message} />
    </main>
  );
}
