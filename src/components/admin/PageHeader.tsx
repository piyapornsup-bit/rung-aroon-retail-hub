import { useRouterState } from "@tanstack/react-router";
import { ChevronRight, Home } from "lucide-react";
import { Fragment, type ReactNode } from "react";
import { findNavItem, SEGMENT_LABELS } from "@/lib/navigation";
import { AppLink } from "./AppLink";

export interface Crumb {
  label: string;
  href?: string;
}

/** Auto breadcrumbs from the current path (override with `crumbs`). */
export function Breadcrumbs({ crumbs }: { crumbs?: Crumb[] }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const items: Crumb[] =
    crumbs ??
    (() => {
      const segs = pathname.split("/").filter(Boolean);
      if (segs[0] === "dashboard") return [{ label: "แดชบอร์ด" }];
      const out: Crumb[] = [];
      segs.forEach((seg, i) => {
        const href = "/" + segs.slice(0, i + 1).join("/");
        const label = findNavItem(href)?.title ?? SEGMENT_LABELS[seg] ?? seg;
        out.push({ label });
      });
      return out;
    })();

  return (
    <nav aria-label="breadcrumb" className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <AppLink
        href="/dashboard"
        className="inline-flex items-center gap-1 rounded-sm hover:text-foreground"
      >
        <Home className="size-3.5" />
        <span className="sr-only">หน้าหลัก</span>
      </AppLink>
      {items.map((c, i) => (
        <Fragment key={i}>
          <ChevronRight className="size-3.5 opacity-60" />
          {c.href ? (
            <AppLink href={c.href} className="rounded-sm hover:text-foreground">
              {c.label}
            </AppLink>
          ) : (
            <span className={i === items.length - 1 ? "font-medium text-foreground" : ""}>
              {c.label}
            </span>
          )}
        </Fragment>
      ))}
    </nav>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  crumbs,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  crumbs?: Crumb[];
}) {
  return (
    <div className="mb-6 space-y-3">
      <Breadcrumbs crumbs={crumbs} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-2xl text-foreground lg:text-[1.75rem]">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
