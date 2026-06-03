"use client";

import { CopyIcon } from "./icons";
import { copyText } from "./Toast";

interface CodeCardProps {
  code: string;
  /** Called after a copy attempt (true = copied) so the parent can toast. */
  onCopy?: (ok: boolean) => void;
}

/** Large monospace league-code display with a copy-to-clipboard icon button. */
export function CodeCard({ code, onCopy }: CodeCardProps) {
  async function handleCopy() {
    const ok = await copyText(code);
    onCopy?.(ok);
  }

  return (
    <div className="code-card">
      <span className="code" aria-label={`League code ${code.split("").join(" ")}`}>
        {code}
      </span>
      <button type="button" className="icon-btn" aria-label="Copy league code" onClick={handleCopy}>
        <CopyIcon />
      </button>
    </div>
  );
}
