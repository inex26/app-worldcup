"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { createMemberId, isValidCode } from "@/lib/league";
import { getLeague, joinLeague } from "@/lib/storage";

/** Screen 3 — Join League. empty → loading (150ms mock) → error | success(redirect). */
export default function JoinPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const valid = isValidCode(code) && name.trim().length > 0;

  function handleJoin() {
    if (!valid || loading) return;
    setError(null);
    setLoading(true);

    // Mock network latency (150ms) per the design spec.
    setTimeout(() => {
      const league = getLeague(code);
      if (!league) {
        setLoading(false);
        setError("League not found. Check your code.");
        return;
      }
      const member = { id: createMemberId(), displayName: name.trim() };
      joinLeague(league, member);
      router.push("/predictions");
    }, 150);
  }

  return (
    <main className="center-page">
      <div className="card stack" style={{ width: "min(480px, 100%)" }}>
        <Link href="/" className="muted" style={{ fontSize: "0.9rem" }}>
          ← Back
        </Link>
        <h1>Join a league</h1>
        <p className="muted">Enter the 6-character code a friend shared with you.</p>

        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            handleJoin();
          }}
        >
          <Input
            label="League code"
            className="input-uppercase"
            placeholder="ABC123"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            maxLength={6}
            value={code}
            disabled={loading}
            error={error ?? undefined}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              if (error) setError(null);
            }}
          />
          <Input
            label="Display name"
            placeholder="e.g. Alex"
            autoComplete="nickname"
            maxLength={24}
            value={name}
            disabled={loading}
            onChange={(e) => setName(e.target.value)}
          />
          <Button type="submit" block disabled={!valid} loading={loading}>
            {loading ? "Joining…" : "Join league"}
          </Button>
        </form>
      </div>
    </main>
  );
}
