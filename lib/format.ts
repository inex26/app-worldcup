/** Small presentation helpers (date formatting, avatar colors). */

/** Format an ISO kickoff timestamp as a short, locale-friendly date + time. */
export function formatKickoff(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** First initial of a display name (uppercased), falling back to "?". */
export function initial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?";
}

const AVATAR_COLORS = ["#e63946", "#f4a261", "#2a9d8f", "#457b9d", "#9d4edd", "#e76f51"];

/** Deterministic avatar background color derived from a name hash. */
export function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
