"use client";

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { CodeCard } from "@/components/CodeCard";
import { Toast, useToast } from "@/components/Toast";
import { createLeague } from "@/lib/data";
import type { League } from "@/lib/types";

/** Screen 2 — Create League. idle → submitting → generated (shows share code + CTA). */
export default function CreatePage() {
  const [name, setName] = useState("");
  const [league, setLeague] = useState<League | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { message, show } = useToast();

  const valid = name.trim().length > 0;

  async function handleCreate() {
    if (!valid || submitting) return;
    setSubmitting(true);
    try {
      const full = await createLeague(name.trim());
      setLeague(full);
    } catch (err) {
      console.error("Create league failed:", err);
      show("Couldn't create league. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="center-page">
      <div className="card stack" style={{ width: "min(480px, 100%)" }}>
        <Link href="/" className="muted" style={{ fontSize: "0.9rem" }}>
          ← Back
        </Link>

        {!league ? (
          <>
            <h1>Create a league</h1>
            <p className="muted">Pick a display name — we&apos;ll generate a shareable code.</p>
            <form
              className="stack"
              onSubmit={(e) => {
                e.preventDefault();
                handleCreate();
              }}
            >
              <Input
                label="Your display name"
                placeholder="e.g. Sam"
                autoComplete="nickname"
                maxLength={24}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Button type="submit" block disabled={!valid} loading={submitting}>
                {submitting ? "Creating…" : "Create league"}
              </Button>
            </form>
          </>
        ) : (
          <>
            <h1>{league.name}</h1>
            <p className="muted">Share this code so friends can join your league.</p>
            <CodeCard code={league.code} onCopy={(ok) => show(ok ? "Copied!" : "Couldn't copy")} />
            <Link className="btn btn-filled btn-block" href="/predictions">
              Go to Predictions
            </Link>
          </>
        )}
      </div>
      <Toast message={message} />
    </main>
  );
}
