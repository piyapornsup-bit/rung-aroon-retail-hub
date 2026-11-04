import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { CalendarDays, Cake, Check, MapPin, PackageCheck, PartyPopper, Phone } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { EmptyState } from "@/components/admin/EmptyState";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { ClientTime } from "@/components/admin/ClientTime";
import { useFakeLoading, useNow } from "@/components/admin/hooks";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { GiftStatus, GiftTask } from "@/lib/mock-data";
import { useStore } from "@/lib/store";
import { daysUntil, formatPhone } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_admin/sales/gifts")({
  head: () => ({
    meta: [
      { title: "ของขวัญเทศกาลและวันเกิด — ร้านรุ่งอรุณ มินิมาร์ท" },
      { name: "description", content: "จัดเตรียมของขวัญวันเกิดและปีใหม่ให้สมาชิก" },
      { property: "og:title", content: "ของขวัญเทศกาลและวันเกิด — ร้านรุ่งอรุณ มินิมาร์ท" },
      { property: "og:description", content: "จัดเตรียมของขวัญวันเกิดและปีใหม่ให้สมาชิก" },
    ],
  }),
  component: GiftsPage,
});

type Filter = GiftStatus | "all";

function GiftsPage() {
  const { state, actions } = useStore();
  const loading = useFakeLoading();
  const now = useNow();
  const [filter, setFilter] = useState<Filter>("รอจัดเตรียม");
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const list = [...state.gifts]
    .filter((g) => filter === "all" || g.status === filter)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const target = state.gifts.find((g) => g.id === confirmId);
  const memberOf = (g: GiftTask) => state.members.find((m) => m.code === g.memberCode)!;
  const count = (s: Filter) => (s === "all" ? state.gifts.length : state.gifts.filter((g) => g.status === s).length);

  return (
    <>
      <PageHeader
        title="ของขวัญเทศกาลและวันเกิด"
        description="สมาชิกที่ถึงกำหนดรับของขวัญ จัดเตรียมแล้วกดยืนยันเพื่อส่งต่อการจัดส่ง"
      />

      <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)} className="mb-5">
        <TabsList className="h-11 rounded-md bg-card p-1 shadow-soft">
          {(["รอจัดเตรียม", "จัดเตรียมแล้ว", "all"] as Filter[]).map((f) => (
            <TabsTrigger
              key={f}
              value={f}
              className="h-9 gap-2 rounded-[8px] px-4 data-[state=active]:bg-sun-50 data-[state=active]:text-sun-700 data-[state=active]:shadow-none"
            >
              {f === "all" ? "ทั้งหมด" : f}
              <span className="num rounded-full bg-muted px-1.5 text-xs">{count(f)}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-72 rounded-lg" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-lg border bg-card shadow-soft">
          <EmptyState title="ไม่มีของขวัญในรายการนี้" description="เมื่อมีสมาชิกถึงกำหนดรับของขวัญ จะแสดงที่นี่" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((g, i) => {
            const m = memberOf(g);
            const days = now ? daysUntil(g.dueDate, now) : null;
            const done = g.status === "จัดเตรียมแล้ว";
            const Icon = g.type === "วันเกิด" ? Cake : PartyPopper;
            return (
              <motion.article
                key={g.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className={cn("flex flex-col rounded-lg border bg-card shadow-soft", done && "opacity-90")}
              >
                <div className={cn("flex items-center justify-between rounded-t-lg px-5 py-3", g.type === "วันเกิด" ? "bg-sun-soft" : "bg-teal-soft")}>
                  <span className={cn("inline-flex items-center gap-2 text-sm font-semibold", g.type === "วันเกิด" ? "text-sun-700" : "text-teal")}>
                    <Icon className="size-4" /> {g.type}
                  </span>
                  <StatusBadge status={g.status} />
                </div>
                <div className="flex-1 space-y-3 p-5">
                  <div>
                    <p className="font-semibold text-foreground">{m.name}</p>
                    <p className="num text-xs text-muted-foreground">
                      {m.code} · <Phone className="inline size-3" /> {formatPhone(m.phone)}
                    </p>
                  </div>
                  <p className="rounded-md bg-muted/60 px-3 py-2 text-sm">🎁 {g.giftName}</p>
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CalendarDays className="size-4" /> กำหนดส่ง <ClientTime iso={g.dueDate} mode="date" />
                    {days !== null && !done && (
                      <span className={cn("num rounded-full px-2 py-0.5 text-xs", days <= 3 ? "bg-danger-soft text-danger" : "bg-warning-soft text-warning")}>
                        อีก {days} วัน
                      </span>
                    )}
                  </p>
                  <p className="flex items-start gap-2 text-sm text-muted-foreground">
                    <MapPin className="mt-0.5 size-4 shrink-0" /> {m.address}
                  </p>
                  {/* Status flow */}
                  <div className="flex items-center gap-2 pt-1 text-xs">
                    <span className="inline-flex items-center gap-1 font-medium text-sun-700">
                      <span className="size-2 rounded-full bg-sun-600" /> รอจัดเตรียม
                    </span>
                    <span className={cn("h-px flex-1", done ? "bg-success" : "bg-border")} />
                    <span className={cn("inline-flex items-center gap-1 font-medium", done ? "text-success" : "text-muted-foreground")}>
                      <span className={cn("size-2 rounded-full", done ? "bg-success" : "bg-border")} /> จัดเตรียมแล้ว
                    </span>
                  </div>
                </div>
                <div className="border-t p-4">
                  {done ? (
                    <p className="flex items-center gap-2 text-sm text-success">
                      <Check className="size-4" /> จัดเตรียมโดย {g.preparedBy} · {g.preparedAt && <ClientTime iso={g.preparedAt} />}
                    </p>
                  ) : (
                    <Button className="w-full" onClick={() => setConfirmId(g.id)}>
                      <PackageCheck /> จัดเตรียมของขวัญแล้ว
                    </Button>
                  )}
                </div>
              </motion.article>
            );
          })}
        </div>
      )}

      {target && (
        <ConfirmDialog
          open={!!confirmId}
          onOpenChange={(o) => !o && setConfirmId(null)}
          tone="success"
          title="ยืนยันว่าจัดเตรียมของขวัญแล้ว?"
          description={`${target.giftName} สำหรับ ${memberOf(target).name}`}
          confirmLabel="ยืนยัน"
          onConfirm={() => {
            actions.markGiftPrepared(target.id);
            toast.success("บันทึกการจัดเตรียมของขวัญแล้ว", { description: memberOf(target).name });
          }}
        />
      )}
    </>
  );
}
