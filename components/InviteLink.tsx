"use client";

import { Button } from "./Button";
import { ShareIcon, CopyIcon } from "./icons";
import { copyText } from "./Toast";

interface InviteLinkProps {
  leagueName: string;
  /** The full, shareable invite URL (already built from the secure token). */
  url: string;
  /** Surface a short status message to the parent (rendered as a toast). */
  onToast: (message: string) => void;
}

/**
 * Invite-link block for the post-creation screen: a truncated, non-editable link
 * plus a primary "Share invite" CTA (native Web Share sheet on supported
 * devices) and an always-present "Copy link" fallback.
 */
export function InviteLink({ leagueName, url, onToast }: InviteLinkProps) {
  const shareText = `Join my ${leagueName} league!`;

  async function handleShare() {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title: leagueName, text: shareText, url });
      } catch {
        // The user dismissed the share sheet (AbortError) — not an error worth surfacing.
      }
      return;
    }
    // Desktop / browsers without the Web Share API: fall back to copying.
    const ok = await copyText(url);
    onToast(ok ? "Link copied!" : "Couldn't copy link");
  }

  async function handleCopy() {
    const ok = await copyText(url);
    onToast(ok ? "Link copied!" : "Couldn't copy link");
  }

  return (
    <div className="stack" style={{ gap: "var(--sp-2)" }}>
      <div className="invite-link">
        <span className="invite-url" title={url}>
          {url}
        </span>
      </div>
      <Button type="button" block onClick={handleShare}>
        <ShareIcon /> Share invite
      </Button>
      <Button type="button" variant="outlined" block onClick={handleCopy}>
        <CopyIcon width={18} height={18} /> Copy link
      </Button>
    </div>
  );
}
