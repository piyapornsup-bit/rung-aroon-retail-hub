import type { LucideIcon } from "lucide-react";
import { TrendingDown, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

const ICON_TONES = {
  sun: "bg-sun-50 text-sun-600",
  teal: "bg-teal-soft text-teal",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  info: "bg-info-soft text-info",
} as const;

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  trend,
  tone = "sun",
  loading,
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  hint?: string;
  trend?: { value: number; label?: string };
  tone?: keyof typeof ICON_TONES;
  loading?: boolean;
}) {
  const up = (trend?.value ?? 0) >= 0;
  return (
    <div className="rounded-lg border bg-card p-5 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-muted-foreground">{label}</p>
        <span className={cn("rounded-md p-2", ICON_TONES[tone])}>
          <Icon className="size-5" />
        </span>
      </div>
      {loading ? (
        <Skeleton className="mt-2 h-9 w-28" />
      ) : (
        <div className="mt-1 font-display num text-3xl text-foreground">{value}</div>
      )}
      <div className="mt-2 flex items-center gap-2 text-xs">
        {trend && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium num",
              up ? "bg-success-soft text-success" : "bg-danger-soft text-danger",
            )}
          >
            {up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
            {up ? "+" : ""}
            {trend.value}%
          </span>
        )}
        {(trend?.label || hint) && (
          <span className="text-muted-foreground">{trend?.label ?? hint}</span>
        )}
      </div>
    </div>
  );
}
