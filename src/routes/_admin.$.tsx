import { createFileRoute, useRouterState } from "@tanstack/react-router";
import { ArrowLeft, FileQuestion } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import { AppLink } from "@/components/admin/AppLink";
import { Button } from "@/components/ui/button";
import { findNavItem } from "@/lib/navigation";

/** Catch-all inside the admin shell: 404 Page Not Found. */
export const Route = createFileRoute("/_admin/$")({
  head: () => ({
    meta: [
      { title: "ไม่พบหน้าที่ต้องการ — ร้านรุ่งอรุณ มินิมาร์ท" },
      { name: "description", content: "ไม่พบหน้าที่คุณกำลังค้นหา" },
      { property: "og:title", content: "ไม่พบหน้าที่ต้องการ — ร้านรุ่งอรุณ มินิมาร์ท" },
      { property: "og:description", content: "ไม่พบหน้าที่คุณกำลังค้นหา" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NotFoundPage,
});

function NotFoundPage() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const title = findNavItem(pathname)?.title ?? "ไม่พบหน้าที่ต้องการ";
  return (
    <>
      <PageHeader title={title} />
      <div className="rounded-lg border bg-card shadow-soft p-4">
        <EmptyState
          icon={FileQuestion}
          title="ไม่พบหน้าที่ต้องการ (404)"
          description={`ไม่พบหน้า “${pathname}” ในระบบร้านรุ่งอรุณ มินิมาร์ท กรุณาตรวจสอบที่อยู่ URL หรือกลับสู่หน้าแดชบอร์ด`}
          action={
            <Button asChild variant="outline">
              <AppLink href="/dashboard">
                <ArrowLeft className="size-4 mr-2" /> กลับสู่หน้าหลัก
              </AppLink>
            </Button>
          }
        />
      </div>
    </>
  );
}
