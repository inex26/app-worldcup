"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { InviteLink } from "@/components/InviteLink";
import {
  CredentialFields,
  EMPTY_CREDENTIALS,
  credentialsValid,
  type Credentials,
} from "@/components/CredentialFields";
import { Toast, useToast } from "@/components/Toast";
import { createLeague, signUp } from "@/lib/data";
import { inviteUrl, isValidLeagueName, LEAGUE_NAME_MAX } from "@/lib/league";
import type { League } from "@/lib/types";

/** Create League: league name + account (username/email/password) → share modal. */
export default function CreatePage() {
  const router = useRouter();
  const [leagueName, setLeagueName] = useState("");
  const [creds, setCreds] = useState<Credentials>(EMPTY_CREDENTIALS);
  const [league, setLeague] = useState<League | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { message, show } = useToast();

  const valid = isValidLeagueName(leagueName) && credentialsValid(creds);

  async function handleCreate() {
    if (!valid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await signUp(creds.email, creds.password, creds.username);
      const full = await createLeague(creds.username.trim(), leagueName.trim());
      setLeague(full);
      router.refresh(); // sync server/middleware auth with the just-set session cookie
    } catch (err) {
      console.error("Create league failed:", err);
      const raw = err instanceof Error ? err.message.toLowerCase() : "";
      setError(
        raw.includes("registered") || raw.includes("already")
          ? "That email already has an account — sign in instead."
          : "Couldn't create your league. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const url =
    league && typeof window !== "undefined"
      ? inviteUrl(window.location.origin, league.inviteToken)
      : "";

  return (
    <main className="center-page center-page--modal">
      <div className="card stack" style={{ width: "min(480px, 100%)" }}>
        {!league ? (
          <>
            <Link href="/" className="muted" style={{ fontSize: "0.9rem" }}>
              ← Back
            </Link>
            <h1>Create a league</h1>
            <p className="muted">Name your league and set up your account.</p>
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
              <CredentialFields
                value={creds}
                onChange={setCreds}
                disabled={submitting}
                error={error ?? undefined}
              />
              <Button type="submit" block disabled={!valid} loading={submitting}>
                {submitting ? "Creating…" : "Create league"}
              </Button>
            </form>
            <p className="muted" style={{ fontSize: "0.9rem", textAlign: "center" }}>
              Already have an account? <Link href="/signin">Sign in</Link>
            </p>
          </>
        ) : (
          <>
            <h1>{league.name}</h1>
            <p className="muted">
              Your league is ready. Share this link — anyone who opens it can join.
            </p>
            <InviteLink leagueName={league.name} url={url} onToast={show} />
            <Link className="btn btn-filled btn-block" href="/predictions">
              Go to predictions
            </Link>
          </>
        )}
      </div>
      <Toast message={message} />
    </main>
  );
}
