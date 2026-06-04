"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import {
  CredentialFields,
  EMPTY_CREDENTIALS,
  credentialsValid,
  type Credentials,
} from "@/components/CredentialFields";
import { extractToken } from "@/lib/league";
import { joinLeagueByToken, signUp } from "@/lib/data";

/** Join a league: paste the invite link + set up your account → predictions. */
export default function JoinPage() {
  const router = useRouter();
  const [link, setLink] = useState("");
  const [creds, setCreds] = useState<Credentials>(EMPTY_CREDENTIALS);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const token = extractToken(link);
  const valid = token !== "" && credentialsValid(creds);

  async function handleJoin() {
    if (!valid || loading) return;
    setError(null);
    setLoading(true);
    try {
      await signUp(creds.email, creds.password, creds.username);
      const league = await joinLeagueByToken(token, creds.username.trim());
      if (!league) {
        setLoading(false);
        setError("That invite link is invalid or has expired. Ask your friend for a fresh one.");
        return;
      }
      router.push("/predictions");
    } catch (err) {
      console.error("Join league failed:", err);
      const raw = err instanceof Error ? err.message.toLowerCase() : "";
      setLoading(false);
      setError(
        raw.includes("registered") || raw.includes("already")
          ? "That email already has an account — sign in instead."
          : "Something went wrong. Please try again.",
      );
    }
  }

  return (
    <main className="center-page center-page--modal">
      <div className="card stack" style={{ width: "min(480px, 100%)" }}>
        <Link href="/" className="muted" style={{ fontSize: "0.9rem" }}>
          ← Back
        </Link>
        <h1>Join a league</h1>
        <p className="muted">Paste the invite link a friend shared, then set up your account.</p>

        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            handleJoin();
          }}
        >
          <Input
            label="Invite link"
            placeholder="https://…/join/…"
            autoComplete="off"
            spellCheck={false}
            value={link}
            disabled={loading}
            error={error ?? undefined}
            onChange={(e) => {
              setLink(e.target.value);
              if (error) setError(null);
            }}
          />
          <CredentialFields value={creds} onChange={setCreds} disabled={loading} />
          <Button type="submit" block disabled={!valid} loading={loading}>
            {loading ? "Joining…" : "Join league"}
          </Button>
        </form>
        <p className="muted" style={{ fontSize: "0.9rem", textAlign: "center" }}>
          Already have an account? <Link href="/signin">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
