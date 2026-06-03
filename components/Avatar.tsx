import { avatarColor, initial } from "@/lib/format";

/** Initial-based avatar, coloured deterministically by name hash. */
export function Avatar({ name }: { name: string }) {
  return (
    <span className="avatar" style={{ background: avatarColor(name) }} aria-hidden="true">
      {initial(name)}
    </span>
  );
}
