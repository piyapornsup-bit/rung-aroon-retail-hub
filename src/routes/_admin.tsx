import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { useEffect } from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/admin/AppSidebar";
import { TopBar } from "@/components/admin/TopBar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AppLink } from "@/components/admin/AppLink";
import { PageHeader } from "@/components/admin/PageHeader";
import { BUILT_ROUTES, isRouteAllowedForRole } from "@/lib/navigation";
import { ROLE_LABELS, type RoleKey } from "@/lib/mock-data";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/_admin")({
  component: AdminLayout,
});

function AccessDeniedView({ userRole, path }: { userRole: RoleKey; path: string }) {
  const { actions } = useStore();

  return (
    <div className="space-y-6">
      <PageHeader
        title="ไม่มีสิทธิ์เข้าถึงหน้านี้"
        description="หน้านี้สงวนไว้สำหรับบทบาทที่มีหน้าที่รับผิดชอบตามสิทธิ์การใช้งาน"
        badge={
          <Badge variant="outline" className="border-destructive/30 bg-destructive/10 text-destructive font-medium">
            สิทธิ์ไม่เพียงพอ
          </Badge>
        }
      />
      <div className="mx-auto mt-8 flex max-w-lg flex-col items-center justify-center rounded-2xl border bg-card p-10 text-center shadow-soft">
        <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 ring-8 ring-amber-500/5">
          <ShieldAlert className="size-8" />
        </div>
        <h2 className="font-display text-xl font-bold text-foreground">ไม่มีสิทธิ์เข้าถึงหน้านี้</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          คุณกำลังเข้าสู่ระบบในบทบาท <strong className="text-foreground">{ROLE_LABELS[userRole]}</strong> ซึ่งไม่มีสิทธิ์เข้าถึงเส้นทาง{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">{path}</code>
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          หากต้องการใช้งานหน้านี้ กรุณาสลับบทบาทเป็นผู้จัดการร้าน หรือบทบาทที่มีสิทธิ์ในงานนี้จากแถบเมนูด้านบน
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button asChild variant="default" className="shadow-sm">
            <AppLink href="/dashboard">
              <ArrowLeft className="mr-2 size-4" /> กลับสู่หน้าแดชบอร์ด
            </AppLink>
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => actions.switchRole("manager")}
            className="border-sun-300 text-sun-800 hover:bg-sun-50 hover:text-sun-900"
          >
            สลับเป็นผู้จัดการร้าน (Demo)
          </Button>
        </div>
      </div>
    </div>
  );
}

function AdminLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { state } = useStore();
  const navigate = useNavigate();

  const signedIn = state.session.signedIn;
  const user = state.session.user;

  // 1. If the session is not signed in redirect to /login
  useEffect(() => {
    if (!signedIn) {
      navigate({ to: "/login" });
    }
  }, [signedIn, navigate]);

  if (!signedIn) {
    return null;
  }

  // 2. Define which routes each role may open (use NAV_BY_ROLE, manager may open every page)
  const cleanPath = pathname.replace(/\/+$/, "") || "/";
  const isBuilt = BUILT_ROUTES.has(cleanPath);
  const isAllowed = isRouteAllowedForRole(user.role, cleanPath);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="min-w-0 bg-background">
          <TopBar />
          <main className="flex-1 px-5 py-6 lg:px-8">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="mx-auto w-full max-w-[1440px]"
            >
              {isBuilt && !isAllowed ? (
                <AccessDeniedView userRole={user.role} path={cleanPath} />
              ) : (
                <Outlet />
              )}
            </motion.div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
