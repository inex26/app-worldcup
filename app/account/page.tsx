"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/Input";
import { Button, Spinner } from "@/components/Button";
import { useSession } from "@/components/useSession";
import { isValidEmail, isValidOtpCode, OTP_LENGTH } from "@/lib/auth";
import {
  confirmEmailLink,
  confirmEmailSignIn,
  startEmailLink,
  startEmailSignIn,
} from "@/lib/data";

/**
 * Cross-device account screen. Anonymous sessions are tied to one browser, so
 * this is how a user reaches the same league elsewhere. It adapts to context:
 *
 *  - In a league, no email yet → "save your account" (attach an email).
 *  - In a league with an email  → show the synced status.
 *  - Not in a league            → "sign in" (recover an account by email).
 *
 * Both write flows are a two-step email → one-time-code exchange. See lib/data.ts
 * for the Supabase calls and the email-template requirement.
 */

type Mode = "link" | "signin";
type Step = "email" | "code";

/** Turn a Supabase auth error into a short, human message for the current step. */
function friendlyError(mode: Mode, step: Step, err: unknown): string {
  const raw = err instanceof Error ? err.message.toLowerCase() : "";
  if (step === "code") {
    return "That code is invalid or has expired. Check the most recent email and try again.";
  }
  if (mode === "signin") {
    return "We couldn't find a saved account for that email. On your other device, open “Save account” first — then come back and sign in.";
  }
  if (raw.includes("already") || raw.includes("registered") || raw.includes("exists")) {
    return "That email is already linked to another account. Try signing in with it instead.";
  }
  return "Something went wrong. Please try again.";
}

export default function AccountPage() {
  const router = useRouter();
  const { loading, league, user } = useSession();

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<Step>("email");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [linked, setLinked] = useState(false);

  if (loading) {
    return (
      <main className="center-page">
        <div className="card stack" style={{ width: "min(480px, 100%)", alignItems: "center" }}>
          <Spinner />
          <p className="muted">Loading…</p>
        </div>
      </main>
    );
  }

  const mode: Mode = league ? "link" : "signin";
  const existingEmail = user?.email ?? null;

  // ── Already saved: show status, no action needed ──────────────────────────
  if (mode === "link" && existingEmail && !linked) {
    return (
      <Shell mode={mode}>
        <h1>Your account is saved</h1>
        <div className="banner">
          <span>
            Saved as <strong>{existingEmail}</strong>
          </span>
        </div>
        <p className="muted">
          To open <strong>{league?.name}</strong> on another phone or computer, go there, choose{" "}
          <strong>Sign in</strong>, and enter this email. We&apos;ll send a {OTP_LENGTH}-digit code
          to confirm it&apos;s you.
        </p>
        <Link className="btn btn-filled btn-block" href="/predictions">
          Back to predictions
        </Link>
      </Shell>
    );
  }

  // ── Saved just now (link flow finished) ───────────────────────────────────
  if (linked) {
    return (
      <Shell mode={mode}>
        <h1>Account saved</h1>
        <div className="banner">
          <span>
            Saved as <strong>{email.trim()}</strong>
          </span>
        </div>
        <p className="muted">
          You can now sign in with this email on any device to reach{" "}
          <strong>{league?.name}</strong>. Your predictions stay in sync everywhere.
        </p>
        <Link className="btn btn-filled btn-block" href="/predictions">
          Back to predictions
        </Link>
      </Shell>
    );
  }

  const emailValid = isValidEmail(email);
  const codeValid = isValidOtpCode(code);

  async function submitEmail() {
    if (!emailValid || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (mode === "link") await startEmailLink(email);
      else await startEmailSignIn(email);
      setStep("code");
    } catch (err) {
      console.error("Send code failed:", err);
      setError(friendlyError(mode, "email", err));
    } finally {
      setBusy(false);
    }
  }

  async function submitCode() {
    if (!codeValid || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (mode === "link") {
        await confirmEmailLink(email, code);
        setLinked(true);
      } else {
        await confirmEmailSignIn(email, code);
        router.push("/predictions");
      }
    } catch (err) {
      console.error("Verify code failed:", err);
      setError(friendlyError(mode, "code", err));
      setBusy(false); // keep the form up so they can re-enter the code
    }
  }

  const heading = mode === "link" ? "Save your account" : "Sign in";
  const intro =
    mode === "link"
      ? "Add an email so you can open this league from another phone or computer. No password — we email you a one-time code."
      : "Enter the email you saved on your other device and we'll email you a one-time code to sign in.";

  return (
    <Shell mode={mode}>
      <h1>{heading}</h1>

      {step === "email" ? (
        <>
          <p className="muted">{intro}</p>
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault();
              submitEmail();
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
            <Button type="submit" block disabled={!emailValid} loading={busy}>
              {busy ? "Sending…" : "Send code"}
            </Button>
          </form>
        </>
      ) : (
        <>
          <p className="muted">
            Enter the {OTP_LENGTH}-digit code we sent to <strong>{email.trim()}</strong>.
          </p>
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault();
              submitCode();
            }}
          >
            <Input
              label="Verification code"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              maxLength={OTP_LENGTH}
              value={code}
              disabled={busy}
              error={error ?? undefined}
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, ""));
                if (error) setError(null);
              }}
            />
            <Button type="submit" block disabled={!codeValid} loading={busy}>
              {busy ? "Verifying…" : mode === "link" ? "Save account" : "Sign in"}
            </Button>
            <button
              type="button"
              className="btn btn-ghost btn-block btn-sm"
              disabled={busy}
              onClick={() => {
                setStep("email");
                setCode("");
                setError(null);
              }}
            >
              Use a different email
            </button>
          </form>
        </>
      )}
    </Shell>
  );
}

/** Centered card wrapper with a context-appropriate back link. */
function Shell({ mode, children }: { mode: Mode; children: React.ReactNode }) {
  return (
    <main className="center-page">
      <div className="card stack" style={{ width: "min(480px, 100%)" }}>
        <Link href={mode === "link" ? "/predictions" : "/"} className="muted" style={{ fontSize: "0.9rem" }}>
          ← Back
        </Link>
        {children}
      </div>
    </main>
  );
}
