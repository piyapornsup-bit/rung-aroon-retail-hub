import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { SunMark } from "./SunMark";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  compact,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "gap-2 py-8" : "gap-3 py-16",
        className,
      )}
    >
      <div className={cn("rounded-full bg-sun-50 flex items-center justify-center text-sun-600", compact ? "p-3" : "p-5")}>
        {Icon ? (
          <Icon className={compact ? "size-6" : "size-8"} />
        ) : (
          <SunMark className={compact ? "h-7 w-11" : "h-10 w-16"} />
        )}
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
