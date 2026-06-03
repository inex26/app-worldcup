import type { Standing } from "@/lib/types";
import { Avatar } from "./Avatar";

interface LeaderboardRowProps {
  standing: Standing;
  isMe: boolean;
}

/** One standings table row: rank, avatar, name, points, exact + correct counts. */
export function LeaderboardRow({ standing, isMe }: LeaderboardRowProps) {
  const { member, rank, points, exact, correct } = standing;
  return (
    <tr className={`lb-row${isMe ? " me" : ""}`} aria-current={isMe ? "true" : undefined}>
      <td>
        <span className="rank">{rank}</span>
      </td>
      <td>
        <span className="lb-name">
          <Avatar name={member.displayName} />
          {member.displayName}
          {isMe && <span className="muted"> (you)</span>}
        </span>
      </td>
      <td className="num">
        <strong>{points}</strong>
      </td>
      <td className="num">{exact}</td>
      <td className="num">{correct}</td>
    </tr>
  );
}
