import { formatBaht } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Baht amount with tabular numbers. */
export function Money({
  value,
  className,
  decimals = true,
  symbol = true,
  negative,
}: {
  value: number;
  className?: string;
  decimals?: boolean;
  symbol?: boolean;
  /** Prefix a minus sign (e.g. discounts). */
  negative?: boolean;
}) {
  return (
    <span className={cn("num whitespace-nowrap", className)}>
      {negative && value > 0 ? "−" : ""}
      {symbol && "฿"}
      {formatBaht(Math.abs(value), { decimals })}
    </span>
  );
}
