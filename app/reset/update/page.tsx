"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/Input";
import { Button, Spinner } from "@/components/Button";
import { isValidPassword } from "@/lib/auth";
import { ensureRecoverySession, updatePassword } from "@/lib/data";

type Status = "checking" | "ready" | "invalid" | "done";

/** Landing target of the reset email: establish the recovery session, then set a new password. */
export default function ResetUpdatePage() {
  const [status, setStatus] = useState<Status>("checking");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    ensureRecoverySession()
      .then((ok) => active && setStatus(ok ? "ready" : "invalid"))
      .catch((err) => {
        console.error("Recovery session failed:", err);
        if (active) setStatus("invalid");
      });
    return () => {
      active = false;
    };
  }, []);

  async function submit() {
    if (!isValidPassword(password) || busy) return;
    setBusy(true);
    setError(null);
    try {
      await updatePassword(password);
      setStatus("done");
    } catch (err) {
      console.error("Password update failed:", err);
      setError("Couldn't update your password. The link may have expired — request a fresh one.");
      setBusy(false);
    }
  }

  if (status === "checking") {
    return (
      <main className="center-page center-page--modal">
        <div className="card stack" style={{ width: "min(440px, 100%)", alignItems: "center" }}>
          <Spinner />
          <p className="muted">Checking your link…</p>
        </div>
      </main>
    );
  }

  if (status === "invalid") {
    return (
      <main className="center-page center-page--modal">
        <div className="card stack" style={{ width: "min(440px, 100%)" }}>
          <h1>Link expired</h1>
          <p className="muted">This password-reset link is invalid or has expired.</p>
          <Link className="btn btn-filled btn-block" href="/reset">
            Request a new link
          </Link>
        </div>
      </main>
    );
  }

  if (status === "done") {
    return (
      <main className="center-page center-page--modal">
        <div className="card stack" style={{ width: "min(440px, 100%)" }}>
          <h1>Password updated</h1>
          <p className="muted">You&apos;re all set and signed in.</p>
          <Link className="btn btn-filled btn-block" href="/predictions">
            Go to predictions
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="center-page center-page--modal">
      <div className="card stack" style={{ width: "min(440px, 100%)" }}>
        <h1>Set a new password</h1>
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <Input
            label="New password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={password}
            disabled={busy}
            error={error ?? undefined}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError(null);
            }}
          />
          <Button type="submit" block disabled={!isValidPassword(password)} loading={busy}>
            {busy ? "Saving…" : "Update password"}
          </Button>
        </form>
      </div>
    </main>
  );
}
