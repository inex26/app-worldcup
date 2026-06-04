"use client";

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { isValidEmail } from "@/lib/auth";
import { requestPasswordReset } from "@/lib/data";

/** Request a password reset — emails a link back to /reset/update. */
export default function ResetRequestPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = isValidEmail(email);

  async function submit() {
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (err) {
      console.error("Password reset request failed:", err);
      setError("Couldn't send the reset email. Please try again.");
      setBusy(false);
    }
  }

  return (
    <main className="center-page center-page--modal">
      <div className="card stack" style={{ width: "min(440px, 100%)" }}>
        <Link href="/signin" className="muted" style={{ fontSize: "0.9rem" }}>
          ← Back to sign in
        </Link>
        {sent ? (
          <>
            <h1>Check your email</h1>
            <p className="muted">
              If an account exists for <strong>{email.trim()}</strong>, we&apos;ve sent a link to set a
              new password.
            </p>
            <Link className="btn btn-filled btn-block" href="/signin">
              Back to sign in
            </Link>
          </>
        ) : (
          <>
            <h1>Reset your password</h1>
            <p className="muted">Enter your email and we&apos;ll send you a link to set a new one.</p>
            <form
              className="stack"
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
            >
              <Input
                label="Email"
                type="email"
                inputMode="email"
                placeholder="you@example.com"
                autoComplete="email"
                autoCapitalize="off"
                spellCheck={false}
                value={email}
                disabled={busy}
                error={error ?? undefined}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                }}
              />
              <Button type="submit" block disabled={!valid} loading={busy}>
                {busy ? "Sending…" : "Send reset link"}
              </Button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
