import { Link } from "@tanstack/react-router";
import type { ComponentProps } from "react";

/**
 * Link by plain app path (e.g. "/sales/pos" or "/warehouse/stock").
 * Built through the catch-all route so menu config can stay plain strings;
 * the router still matches the concrete page when it exists.
 */
export function AppLink({
  href,
  ...rest
}: { href: string } & Omit<ComponentProps<typeof Link>, "to" | "params">) {
  return <Link to="/$" params={{ _splat: href.replace(/^\//, "") }} {...rest} />;
}
