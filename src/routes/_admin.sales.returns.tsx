import { createFileRoute } from "@tanstack/react-router";
import { Check, ImageIcon, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Money } from "@/components/admin/Money";
import { ClientTime } from "@/components/admin/ClientTime";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { useFakeLoading } from "@/components/admin/hooks";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { APPROVAL_STATUSES, type ReturnRequest, type ReviewStatus } from "@/lib/mock-data";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/_admin/sales/returns")({
  head: () => ({
    meta: [
      { title: "คำขอยกเลิกและคืนสินค้า — ร้านรุ่งอรุณ มินิมาร์ท" },
      { name: "description", content: "พิจารณาคำขอยกเลิกคำสั่งซื้อและคืนสินค้าจากลูกค้า" },
      { property: "og:title", content: "คำขอยกเลิกและคืนสินค้า — ร้านรุ่งอรุณ มินิมาร์ท" },
      { property: "og:description", content: "พิจารณาคำขอยกเลิกคำสั่งซื้อและคืนสินค้าจากลูกค้า" },
    ],
  }),
  component: ReturnsPage,
});

type TabKey = ReviewStatus | "all";

function ReturnsPage() {
  const { state, actions } = useStore();
  const loading = useFakeLoading();
  const [tab, setTab] = useState<TabKey>("รอพิจารณา");
  const [openId, setOpenId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<"approve" | "reject" | null>(null);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: state.returns.length };
    for (const s of APPROVAL_STATUSES) c[s] = state.returns.filter((r) => r.status === s).length;
    return c;
  }, [state.returns]);

  const rows = tab === "all" ? state.returns : state.returns.filter((r) => r.status === tab);
  const current = state.returns.find((r) => r.id === openId) ?? null;
  const order = current ? state.orders.find((o) => o.id === current.orderId) : undefined;

  const columns: DataTableColumn<ReturnRequest>[] = [
    { key: "id", header: "เลขที่คำขอ", cell: (r) => <span className="num font-medium">{r.id}</span>, sortValue: (r) => r.id },
    { key: "kind", header: "ประเภท", cell: (r) => r.kind, sortValue: (r) => r.kind },
    { key: "order", header: "คำสั่งซื้อ", cell: (r) => <span className="num">{r.orderId}</span> },
    { key: "customer", header: "ลูกค้า", cell: (r) => r.customerName, sortValue: (r) => r.customerName },
    { key: "reason", header: "เหตุผล", cell: (r) => r.reason },
    { key: "amount", header: "มูลค่า", align: "right", cell: (r) => <Money value={r.lines.reduce((a, l) => a + l.price * l.qty, 0)} />, sortValue: (r) => r.lines.reduce((a, l) => a + l.price * l.qty, 0) },
    { key: "at", header: "ส่งคำขอ", cell: (r) => <ClientTime iso={r.requestedAt} mode="ago" className="text-muted-foreground" />, sortValue: (r) => r.requestedAt },
    { key: "status", header: "สถานะ", cell: (r) => <StatusBadge status={r.status} /> },
  ];

  const tabs: { key: TabKey; label: string }[] = [
    { key: "รอพิจารณา", label: "รอพิจารณา" },
    { key: "อนุมัติ", label: "อนุมัติ" },
    { key: "ไม่อนุมัติ", label: "ไม่อนุมัติ" },
    { key: "all", label: "ทั้งหมด" },
  ];

  return (
    <>
      <PageHeader
        title="คำขอยกเลิกและคืนสินค้า"
        description="ตรวจรายละเอียดคำขอจากลูกค้าออนไลน์ แล้วอนุมัติหรือไม่อนุมัติพร้อมหมายเหตุ"
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)} className="mb-4">
        <TabsList className="h-11 rounded-md bg-card p-1 shadow-soft">
          {tabs.map((t) => (
            <TabsTrigger
              key={t.key}
              value={t.key}
              className="h-9 gap-2 rounded-[8px] px-4 data-[state=active]:bg-sun-50 data-[state=active]:text-sun-700 data-[state=active]:shadow-none"
            >
              {t.label}
              <span className="num rounded-full bg-muted px-1.5 text-xs">{counts[t.key]}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <DataTable
        data={rows}
        columns={columns}
        getRowId={(r) => r.id}
        loading={loading}
        onRowClick={(r) => setOpenId(r.id)}
        selectedRowId={openId}
        searchPlaceholder="ค้นหาเลขที่คำขอ คำสั่งซื้อ หรือชื่อลูกค้า"
        searchFn={(r, q) => r.id.toLowerCase().includes(q) || r.orderId.toLowerCase().includes(q) || r.customerName.includes(q)}
        filters={[
          {
            key: "kind",
            label: "ประเภท",
            options: [
              { label: "ยกเลิกคำสั่งซื้อ", value: "ยกเลิกคำสั่งซื้อ" },
              { label: "คืนสินค้า", value: "คืนสินค้า" },
            ],
            predicate: (r, v) => r.kind === v,
          },
        ]}
        emptyTitle={tab === "รอพิจารณา" ? "ไม่มีคำขอรอพิจารณา" : "ไม่พบคำขอ"}
      />

      <Sheet open={!!current} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {current && (
            <>
              <SheetHeader className="text-left">
                <div className="flex items-center gap-2">
                  <StatusBadge status={current.status} />
                  <span className="text-xs text-muted-foreground">{current.kind}</span>
                </div>
                <SheetTitle className="num text-xl">{current.id}</SheetTitle>
                <SheetDescription>
                  คำสั่งซื้อ <span className="num">{current.orderId}</span> · {current.customerName} ·{" "}
                  <ClientTime iso={current.requestedAt} />
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6 px-4 pb-6">
                {order && (
                  <div className="flex items-center justify-between rounded-md bg-muted/60 px-3 py-2 text-sm">
                    <span className="text-muted-foreground">สถานะคำสั่งซื้อปัจจุบัน</span>
                    <StatusBadge status={order.status} />
                  </div>
                )}

                <section>
                  <h3 className="mb-2 text-sm font-semibold">รายการสินค้า</h3>
                  <ul className="divide-y rounded-md border">
                    {current.lines.map((l) => (
                      <li key={l.productId} className="flex items-center justify-between px-3 py-2 text-sm">
                        <span>
                          {l.name} <span className="num text-muted-foreground">× {l.qty}</span>
                        </span>
                        <Money value={l.price * l.qty} />
                      </li>
                    ))}
                  </ul>
                </section>

                <section>
                  <h3 className="mb-2 text-sm font-semibold">เหตุผล</h3>
                  <p className="text-sm font-medium text-foreground">{current.reason}</p>
                  <p className="mt-1 rounded-md bg-sun-50 px-3 py-2 text-sm text-foreground">“{current.detail}”</p>
                </section>

                <section>
                  <h3 className="mb-2 text-sm font-semibold">รูปภาพประกอบ</h3>
                  {current.photoCount === 0 ? (
                    <p className="text-sm text-muted-foreground">ลูกค้าไม่ได้แนบรูปภาพ</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {Array.from({ length: current.photoCount }).map((_, i) => (
                        <div key={i} className="flex aspect-square flex-col items-center justify-center gap-1 rounded-md border border-dashed bg-muted/60 text-muted-foreground">
                          <ImageIcon className="size-6" />
                          <span className="text-xs">รูปที่ {i + 1}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {current.status === "รอพิจารณา" ? (
                  <div className="grid grid-cols-2 gap-3 border-t pt-5">
                    <Button variant="outline-danger" size="lg" onClick={() => setConfirm("reject")}>
                      <X /> ไม่อนุมัติ
                    </Button>
                    <Button variant="success" size="lg" onClick={() => setConfirm("approve")}>
                      <Check /> อนุมัติ
                    </Button>
                  </div>
                ) : (
                  <section className="rounded-md border p-3 text-sm">
                    <p className="font-medium">
                      ผลการพิจารณา: <StatusBadge status={current.status} />
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      โดย {current.decidedBy} · {current.decidedAt && <ClientTime iso={current.decidedAt} />}
                    </p>
                    {current.decisionNote && <p className="mt-2">หมายเหตุ: {current.decisionNote}</p>}
                  </section>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {current && (
        <>
          <ConfirmDialog
            open={confirm === "approve"}
            onOpenChange={(o) => !o && setConfirm(null)}
            tone="success"
            title={`อนุมัติคำขอ ${current.id}?`}
            description={
              current.kind === "ยกเลิกคำสั่งซื้อ"
                ? `คำสั่งซื้อ ${current.orderId} จะเปลี่ยนสถานะเป็น “ยกเลิก”`
                : "ลูกค้าจะได้รับแจ้งให้ส่งสินค้าคืนตามขั้นตอน"
            }
            confirmLabel="อนุมัติ"
            note={{ label: "หมายเหตุ (ไม่บังคับ)", placeholder: "เช่น คืนเงินภายใน 3 วันทำการ" }}
            onConfirm={(note) => {
              actions.decideReturn(current.id, true, note || undefined);
              toast.success(`อนุมัติคำขอ ${current.id} แล้ว`);
            }}
          />
          <ConfirmDialog
            open={confirm === "reject"}
            onOpenChange={(o) => !o && setConfirm(null)}
            tone="danger"
            title={`ไม่อนุมัติคำขอ ${current.id}?`}
            description="กรุณาระบุเหตุผลเพื่อแจ้งให้ลูกค้าทราบ"
            confirmLabel="ไม่อนุมัติ"
            note={{
              label: "เหตุผลที่ไม่อนุมัติ",
              required: true,
              requiredMessage: "กรุณาระบุเหตุผลที่ไม่อนุมัติ",
            }}
            onConfirm={(note) => {
              actions.decideReturn(current.id, false, note);
              toast.error(`ไม่อนุมัติคำขอ ${current.id}`, { description: note });
            }}
          />
        </>
      )}
    </>
  );
}
