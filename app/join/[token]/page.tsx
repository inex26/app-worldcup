"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Spinner } from "@/components/Button";
import {
  CredentialFields,
  EMPTY_CREDENTIALS,
  credentialsValid,
  type Credentials,
} from "@/components/CredentialFields";
import { joinLeagueByToken, loadSession, signUp } from "@/lib/data";

type Status = "checking" | "form" | "signedin" | "joining" | "invalid" | "error";

/**
 * Join-via-link landing (someone opened a shared invite). If already signed in,
 * join directly with the existing account; otherwise set up an account, then join.
 */
export default function JoinByTokenPage({ params }: { params: { token: string } }) {
  const { token } = params;
  const router = useRouter();
  const [status, setStatus] = useState<Status>("checking");
  const [name, setName] = useState(""); // existing display name, when signed in
  const [creds, setCreds] = useState<Credentials>(EMPTY_CREDENTIALS);
  const [error, setError] = useState<string | null>(null);

  // Are we already signed in? Decide which form to show.
  useEffect(() => {
    let active = true;
    loadSession()
      .then(({ user }) => {
        if (!active) return;
        if (user) {
          setName(user.displayName);
          setStatus("signedin");
        } else {
          setStatus("form");
        }
      })
      .catch(() => active && setStatus("form"));
    return () => {
      active = false;
    };
  }, []);

  async function join(displayName: string) {
    setStatus("joining");
    setError(null);
    try {
      const league = await joinLeagueByToken(token, displayName.trim());
      if (!league) {
        setStatus("invalid");
        return;
      }
      router.replace("/predictions");
    } catch (err) {
      console.error("Join via link failed:", err);
      setError("Something went wrong. Please try again.");
      setStatus(name ? "signedin" : "form");
    }
  }

  async function handleSignupJoin() {
    if (!credentialsValid(creds) || status === "joining") return;
    setStatus("joining");
    setError(null);
    try {
      await signUp(creds.email, creds.password, creds.username);
      await join(creds.username);
    } catch (err) {
      console.error("Sign up failed:", err);
      const raw = err instanceof Error ? err.message.toLowerCase() : "";
      setError(
        raw.includes("registered") || raw.includes("already")
          ? "That email already has an account — sign in instead."
          : "Something went wrong. Please try again.",
      );
      setStatus("form");
    }
  }

  if (status === "checking" || status === "joining") {
    return (
      <main className="center-page center-page--modal">
        <div className="card stack" style={{ width: "min(440px, 100%)", alignItems: "center" }}>
          <Spinner />
          <p className="muted">{status === "joining" ? "Joining…" : "Checking invite…"}</p>
        </div>
      </main>
    );
  }

  if (status === "invalid" || status === "error") {
    return (
      <main className="center-page center-page--modal">
        <div className="card stack" style={{ width: "min(440px, 100%)" }}>
          <h1>Invite link not valid</h1>
          <p className="muted">
            This invite link is invalid or has expired. Ask your friend for a fresh one.
          </p>
          <Link className="btn btn-filled btn-block" href="/">
            Go home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="center-page center-page--modal">
      <div className="card stack" style={{ width: "min(440px, 100%)" }}>
        <h1>You&apos;re invited!</h1>
        {status === "signedin" ? (
          <>
            <p className="muted">Join this league as {name}.</p>
            {error && <p className="inline-error" role="alert">{error}</p>}
            <Button block onClick={() => join(name)}>
              Join league
            </Button>
            <Link className="btn btn-ghost btn-block btn-sm" href="/predictions">
              Not now
            </Link>
          </>
        ) : (
          <>
            <p className="muted">Set up your account to join this league.</p>
            <form
              className="stack"
              onSubmit={(e) => {
                e.preventDefault();
                handleSignupJoin();
              }}
            >
              <CredentialFields value={creds} onChange={setCreds} error={error ?? undefined} />
              <Button type="submit" block disabled={!credentialsValid(creds)}>
                Join league
              </Button>
            </form>
            <p className="muted" style={{ fontSize: "0.9rem", textAlign: "center" }}>
              Already have an account? <Link href="/signin">Sign in</Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
