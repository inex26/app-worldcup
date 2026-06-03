"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { isValidCode } from "@/lib/league";
import { joinLeagueByCode } from "@/lib/data";

/** Screen 3 — Join League. empty → loading → error | success(redirect). */
export default function JoinPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const valid = isValidCode(code) && name.trim().length > 0;

  async function handleJoin() {
    if (!valid || loading) return;
    setError(null);
    setLoading(true);

    try {
      const league = await joinLeagueByCode(code, name.trim());
      if (!league) {
        setLoading(false);
        setError("League not found. Check your code.");
        return;
      }
      router.push("/predictions");
    } catch (err) {
      console.error("Join league failed:", err);
      setLoading(false);
      setError("Something went wrong. Please try again.");
    }
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
