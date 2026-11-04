import { formatDate, formatDateTime, formatTime, timeAgo } from "@/lib/format";
import { useNow } from "./hooks";

/** Renders dates only after mount, so SSR and client never disagree. */
export function ClientTime({
  iso,
  mode = "datetime",
  className,
}: {
  iso: string;
  mode?: "ago" | "date" | "datetime" | "time";
  className?: string;
}) {
  const now = useNow();
  if (now === null) return <span className={className}>—</span>;
  const text =
    mode === "ago"
      ? timeAgo(iso, now)
      : mode === "date"
        ? formatDate(iso)
        : mode === "time"
          ? formatTime(iso)
          : formatDateTime(iso);
  return (
    <time dateTime={iso} className={className}>
      {text}
    </time>
  );
}
