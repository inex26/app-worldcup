"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { isValidEmail, isValidPassword } from "@/lib/auth";
import { signIn } from "@/lib/data";

/**
 * Sign in — email + password. Restores an existing account's session on any
 * device (the same-device cookie keeps you logged in until you sign out).
 */
export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const valid = isValidEmail(email) && isValidPassword(password);

  async function handleSignIn() {
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password);
      router.refresh(); // sync server/middleware auth with the just-set session cookie
      router.push("/predictions");
    } catch (err) {
      console.error("Sign in failed:", err);
      setError("That email or password is incorrect.");
      setBusy(false);
    }
  }

  return (
    <main className="center-page center-page--modal">
      <div className="card stack" style={{ width: "min(440px, 100%)" }}>
        <Link href="/" className="muted" style={{ fontSize: "0.9rem" }}>
          ← Back
        </Link>
        <h1>Welcome back</h1>
        <p className="muted">Sign in to reach your leagues on this device.</p>

        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            handleSignIn();
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
          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            value={password}
            disabled={busy}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError(null);
            }}
          />
          <Button type="submit" block disabled={!valid} loading={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <p className="muted" style={{ fontSize: "0.9rem", textAlign: "center" }}>
          No account yet?{" "}
          <Link href="/create">Create a league</Link> or <Link href="/join">join one</Link>.
        </p>
      </div>
    </main>
  );
}
