"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/Input";
import { Button, Spinner } from "@/components/Button";
import { joinLeagueByToken, loadSession, peekLeagueName } from "@/lib/data";

type Status = "loading" | "form" | "joining" | "invalid" | "error";

/**
 * Join-via-link landing. Resolves the secure token, then either auto-joins
 * (when the visitor already has a display name) or asks for one before joining.
 * Lands on the leaderboard with a confirmation toast; invalid tokens get a
 * full-page error state.
 */
export default function JoinByTokenPage({ params }: { params: { token: string } }) {
  const { token } = params;
  const router = useRouter();
  const [status, setStatus] = useState<Status>("loading");
  const [leagueName, setLeagueName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  // Guards against React's dev double-effect firing two auto-joins.
  const joinedRef = useRef(false);

  const handleJoin = useCallback(
    async (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      setStatus("joining");
      setError(null);
      try {
        const league = await joinLeagueByToken(token, trimmed);
        if (!league) {
          setStatus("invalid");
          return;
        }
        router.replace("/leaderboard?joined=1");
      } catch (err) {
        console.error("Join via link failed:", err);
        setError("Something went wrong. Please try again.");
        setStatus("form");
      }
    },
    [token, router],
  );

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const name = await peekLeagueName(token);
        if (!active) return;
        if (!name) {
          setStatus("invalid");
          return;
        }
        setLeagueName(name);

        // If the visitor already has a display name, join immediately;
        // otherwise prompt for one.
        const { user } = await loadSession();
        if (!active) return;
        if (user?.displayName) {
          setDisplayName(user.displayName);
          if (!joinedRef.current) {
            joinedRef.current = true;
            await handleJoin(user.displayName);
          }
        } else {
          setStatus("form");
        }
      } catch (err) {
        console.error("Invite link load failed:", err);
        if (active) setStatus("error");
      }
    })();
    return () => {
      active = false;
    };
  }, [token, handleJoin]);

  if (status === "loading" || status === "joining") {
    return (
      <main className="center-page">
        <div className="card stack" style={{ width: "min(480px, 100%)", alignItems: "center" }}>
          <Spinner />
          <p className="muted">{status === "joining" ? "Joining…" : "Checking invite…"}</p>
        </div>
      </main>
    );
  }

  if (status === "invalid" || status === "error") {
    return (
      <main className="center-page">
        <div className="card stack" style={{ width: "min(480px, 100%)" }}>
          <h1>{status === "invalid" ? "Invite link not valid" : "Something went wrong"}</h1>
          <p className="muted">
            {status === "invalid"
              ? "This invite link is invalid or has expired. Ask your friend for a fresh one."
              : "We couldn't open this invite. Please try again."}
          </p>
          <Link className="btn btn-filled btn-block" href="/">
            Go to Home
          </Link>
        </div>
      </main>
    );
  }

  // status === "form"
  const valid = displayName.trim().length > 0;
  return (
    <main className="center-page">
      <div className="card stack" style={{ width: "min(480px, 100%)" }}>
        <h1>Join {leagueName}</h1>
        <p className="muted">You&apos;ve been invited to join this league. Pick a display name.</p>
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            handleJoin(displayName);
          }}
        >
          <Input
            label="Display name"
            placeholder="e.g. Alex"
            autoComplete="nickname"
            maxLength={24}
            value={displayName}
            error={error ?? undefined}
            onChange={(e) => {
              setDisplayName(e.target.value);
              if (error) setError(null);
            }}
          />
          <Button type="submit" block disabled={!valid}>
            Join {leagueName}
          </Button>
        </form>
      </div>
    </main>
  );
}
