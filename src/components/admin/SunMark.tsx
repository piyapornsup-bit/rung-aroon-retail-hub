import { cn } from "@/lib/utils";

/** The small rising-sun mark of ร้านรุ่งอรุณ. */
export function SunMark({
  className,
  tone = "brand",
}: {
  className?: string;
  tone?: "brand" | "light";
}) {
  const light = tone === "light";
  return (
    <svg viewBox="0 0 64 40" aria-hidden="true" className={cn("h-10 w-16", className)}>
      <g
        strokeWidth="3"
        strokeLinecap="round"
        className={light ? "stroke-sun-100" : "stroke-sun-400"}
      >
        <line x1="52.7" y1="26.5" x2="58.3" y2="24.4" />
        <line x1="46.1" y1="17.1" x2="50" y2="12.6" />
        <line x1="32" y1="12" x2="32" y2="5.5" />
        <line x1="17.9" y1="17.1" x2="14" y2="12.6" />
        <line x1="11.3" y1="26.5" x2="5.7" y2="24.4" />
      </g>
      <path d="M15 34 A17 17 0 0 1 49 34 Z" className={light ? "fill-sun-50" : "fill-sun-500"} />
      <line
        x1="3"
        y1="34.5"
        x2="61"
        y2="34.5"
        strokeWidth="3"
        strokeLinecap="round"
        className={light ? "stroke-sun-50" : "stroke-sun-600"}
      />
    </svg>
  );
}
