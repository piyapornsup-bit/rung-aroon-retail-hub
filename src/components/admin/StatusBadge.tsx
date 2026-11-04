import { TONE_CLASSES, toneForStatus, type KnownStatus, type Tone } from "@/lib/status";
import { cn } from "@/lib/utils";

export function StatusBadge({
  status,
  tone,
  className,
  size = "default",
}: {
  status: KnownStatus | (string & {});
  /** Override the tone from the status map (rarely needed). */
  tone?: Tone;
  className?: string;
  size?: "default" | "lg";
}) {
  const t = TONE_CLASSES[tone ?? toneForStatus(status)];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap",
        size === "lg" ? "px-3 py-1 text-sm" : "px-2.5 py-0.5 text-xs",
        t.badge,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", t.dot)} />
      {status}
    </span>
  );
}
