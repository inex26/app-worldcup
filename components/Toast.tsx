"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Imperative toast hook. Returns a live-region node to render and a `show` trigger. */
export function useToast() {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const show = useCallback((msg: string) => {
    setMessage(msg);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(null), 3000);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  return { message, show };
}

/** Always-present polite live region; the visual pill appears only while a message is set. */
export function Toast({ message }: { message: string | null }) {
  return (
    <div aria-live="polite" aria-atomic="true">
      {message && (
        <div className="toast" role="status">
          {message}
        </div>
      )}
    </div>
  );
}

/** Copy text to the clipboard, with a no-throw fallback. Resolves to success boolean. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to legacy path */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
