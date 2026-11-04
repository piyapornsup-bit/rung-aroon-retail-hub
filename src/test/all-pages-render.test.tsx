import { render, waitFor, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import React, { useEffect } from "react";
import { QueryClient } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { routeTree } from "@/routeTree.gen";
import { StoreProvider, useStore } from "@/lib/store";
import { staffUsers, type RoleKey } from "@/lib/mock-data";
import { BUILT_ROUTES, NAV_BY_ROLE } from "@/lib/navigation";

function AutoLogin({ role }: { role: RoleKey }) {
  const { actions } = useStore();
  useEffect(() => {
    const user = staffUsers.find((u) => u.role === role) || staffUsers[0];
    actions.login(user.username, user.password);
  }, [role, actions]);
  return null;
}

const roles: RoleKey[] = ["sales", "warehouse", "purchasing", "manager", "owner"];

describe("Comprehensive Audit: Render all allowed routes for each role", () => {
  for (const role of roles) {
    const groups = NAV_BY_ROLE[role] || [];
    const roleRoutes = Array.from(new Set(groups.flatMap((g) => g.items.map((i) => i.href))));

    for (const path of roleRoutes) {
      if (!BUILT_ROUTES.has(path)) continue;

      it(`role [${role}] renders ${path} cleanly without error`, async () => {
        const router = createRouter({
          routeTree,
          context: { queryClient: new QueryClient() },
        });

        await router.navigate({ to: path });

        render(
          <StoreProvider>
            <AutoLogin role={role} />
            <RouterProvider router={router} />
          </StoreProvider>
        );

        await waitFor(() => {
          const errorHeading = screen.queryByText("หน้านี้โหลดไม่สำเร็จ");
          expect(errorHeading).toBeNull();
        });
      });
    }
  }
});
