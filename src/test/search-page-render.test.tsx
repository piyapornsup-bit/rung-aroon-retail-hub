import { render, waitFor, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import React, { useEffect } from "react";
import { QueryClient } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { routeTree } from "@/routeTree.gen";
import { StoreProvider, useStore } from "@/lib/store";
import { staffUsers, type RoleKey } from "@/lib/mock-data";

function AutoLogin({ role }: { role: RoleKey }) {
  const { actions } = useStore();
  useEffect(() => {
    const user = staffUsers.find((u) => u.role === role) || staffUsers[0];
    actions.login(user.username, user.password);
  }, [role, actions]);
  return null;
}

const roles: RoleKey[] = ["sales", "warehouse", "purchasing", "manager", "owner"];
const types = [
  "products",
  "orders",
  "receipts",
  "members",
  "employees",
  "pos",
  "prs",
  "agentReceipts",
  "suppliers",
];

describe("Search Page Render Test across all roles and types", () => {
  for (const role of roles) {
    for (const t of types) {
      it(`renders role: ${role} with type: ${t}`, async () => {
        const router = createRouter({
          routeTree,
          context: { queryClient: new QueryClient() },
        });

        await router.navigate({ to: "/search", search: { q: "", type: t } });

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
