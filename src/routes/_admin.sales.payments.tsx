import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Check,
  Clock,
  Landmark,
  MapPin,
  Phone,
  X,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin/PageHeader";
import { SectionCard } from "@/components/admin/SectionCard";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Money } from "@/components/admin/Money";
import { EmptyState } from "@/components/admin/EmptyState";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { ClientTime } from "@/components/admin/ClientTime";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { useFakeLoading, useNow } from "@/components/admin/hooks";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ORDER_STATUSES, orderSubtotal, orderTotal, type OnlineOrder } from "@/lib/mock-data";
import { selectPendingPayments, useStore } from "@/lib/store";
import { formatPhone, minutesSince, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_admin/sales/payments")({
  head: () => ({
    meta: [
      { title: "ตรวจสอบการชำระเงินออนไลน์ — ร้านรุ่งอรุณ มินิมาร์ท" },
      { name: "description", content: "ตรวจสลิปโอนเงินของคำสั่งซื้อออนไลน์" },
      { property: "og:title", content: "ตรวจสอบการชำระเงินออนไลน์ — ร้านรุ่งอรุณ มินิมาร์ท" },
      { property: "og:description", content: "ตรวจสลิปโอนเงินของคำสั่งซื้อออนไลน์" },
    ],
  }),
  component: PaymentsPage,
});

function PaymentsPage() {
  const { state, actions } = useStore();
  const now = useNow();
  const loading = useFakeLoading();
  const queue = useMemo(
    () =>
      [...selectPendingPayments(state)].sort(
        (a, b) => new Date(a.submittedAt!).getTime() - new Date(b.submittedAt!).getTime(),
      ),
    [state],
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = queue.find((o) => o.id === selectedId) ?? queue[0];
  const [confirm, setConfirm] = useState<"approve" | "reject" | null>(null);

  const nextAfter = (id: string) => {
    const i = queue.findIndex((o) => o.id === id);
    return queue[i + 1]?.id ?? queue[i - 1]?.id ?? null;
  };

  const columns: DataTableColumn<OnlineOrder>[] = [
    { key: "id", header: "เลขที่คำสั่งซื้อ", cell: (o) => <span className="font-medium num">{o.id}</span>, sortValue: (o) => o.id },
    { key: "customer", header: "ลูกค้า", cell: (o) => o.customerName, sortValue: (o) => o.customerName },
    { key: "total", header: "ยอดรวม", align: "right", cell: (o) => <Money value={orderTotal(o)} />, sortValue: (o) => orderTotal(o) },
    { key: "created", header: "สั่งเมื่อ", cell: (o) => <ClientTime iso={o.createdAt} className="text-muted-foreground" />, sortValue: (o) => o.createdAt },
    { key: "status", header: "สถานะ", cell: (o) => <StatusBadge status={o.status} /> },
  ];

  return (
    <>
      <PageHeader
        title="ตรวจสอบการชำระเงินออนไลน์"
        description="ตรวจสลิปโอนเงินให้ตรงกับยอดคำสั่งซื้อ แล้วกดยืนยันผล"
      />

      <div className="grid gap-5 xl:grid-cols-[320px_1fr]">
        {/* Queue */}
        <SectionCard
          title="คิวรอตรวจสอบ"
          description={loading ? "กำลังโหลด..." : `${queue.length} รายการ · เรียงจากรอนานสุด`}
          bodyClassName="p-2"
          className="xl:sticky xl:top-20 xl:self-start"
        >
          {loading ? (
            <div className="space-y-2 p-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : queue.length === 0 ? (
            <EmptyState compact title="ไม่มีสลิปรอตรวจสอบ" description="ตรวจครบทุกรายการแล้ว" />
          ) : (
            <ul className="space-y-1">
              <AnimatePresence initial={false}>
                {queue.map((o) => {
                  const mins = now ? minutesSince(o.submittedAt!, now) : 0;
                  const active = selected?.id === o.id;
                  return (
                    <motion.li
                      key={o.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, x: -20 }}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedId(o.id)}
                        className={cn(
                          "w-full rounded-md border px-3 py-2.5 text-left transition-colors",
                          active ? "border-sun-200 bg-sun-50" : "border-transparent hover:bg-muted",
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="num text-sm font-semibold">{o.id}</span>
                          <Money value={orderTotal(o)} className="text-sm font-semibold" />
                        </div>
                        <div className="mt-0.5 truncate text-sm text-muted-foreground">{o.customerName}</div>
                        <div
                          className={cn(
                            "mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs",
                            mins >= 60 ? "bg-danger-soft text-danger" : mins >= 30 ? "bg-warning-soft text-warning" : "bg-muted text-muted-foreground",
                          )}
                        >
                          <Clock className="size-3" />
                          {now ? `ส่งสลิป ${timeAgo(o.submittedAt!, now)}` : "—"}
                        </div>
                      </button>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>
          )}
        </SectionCard>

        {/* Detail */}
        {loading ? (
          <Skeleton className="h-[520px] w-full rounded-lg" />
        ) : !selected ? (
          <div className="rounded-lg border bg-card shadow-soft">
            <EmptyState title="ไม่มีรายการให้ตรวจสอบ" description="เมื่อมีลูกค้าส่งสลิปใหม่ จะแสดงที่นี่" />
          </div>
        ) : (
          <motion.div
            key={selected.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid gap-5 lg:grid-cols-2"
          >
            <OrderSummary order={selected} />
            <div className="space-y-4">
              <SlipViewer order={selected} />
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline-danger" size="lg" onClick={() => setConfirm("reject")}>
                  <X /> ไม่ถูกต้อง
                </Button>
                <Button variant="success" size="lg" onClick={() => setConfirm("approve")}>
                  <Check /> ถูกต้อง
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      <div className="mt-8">
        <h2 className="mb-3 text-base font-semibold">คำสั่งซื้อออนไลน์ทั้งหมด</h2>
        <DataTable
          data={state.orders}
          columns={columns}
          getRowId={(o) => o.id}
          loading={loading}
          pageSize={6}
          searchPlaceholder="ค้นหาเลขที่คำสั่งซื้อหรือชื่อลูกค้า"
          searchFn={(o, q) => o.id.toLowerCase().includes(q) || o.customerName.includes(q)}
          filters={[
            {
              key: "status",
              label: "สถานะ",
              options: ORDER_STATUSES.map((s) => ({ label: s, value: s })),
              predicate: (o, v) => o.status === v,
            },
          ]}
        />
      </div>

      {selected && (
        <>
          <ConfirmDialog
            open={confirm === "approve"}
            onOpenChange={(o) => !o && setConfirm(null)}
            tone="success"
            title="ยืนยันว่าการชำระเงินถูกต้อง?"
            description={`คำสั่งซื้อ ${selected.id} จะเปลี่ยนสถานะเป็น “ชำระแล้ว” และส่งต่อให้คลังสินค้าจัดเตรียม`}
            confirmLabel="ยืนยัน ถูกต้อง"
            onConfirm={() => {
              const next = nextAfter(selected.id);
              actions.approvePayment(selected.id);
              setSelectedId(next);
              toast.success(`ยืนยันการชำระเงิน ${selected.id} แล้ว`, { description: "สถานะ: ชำระแล้ว" });
            }}
          />
          <ConfirmDialog
            open={confirm === "reject"}
            onOpenChange={(o) => !o && setConfirm(null)}
            tone="danger"
            title="แจ้งว่าการชำระเงินไม่ถูกต้อง"
            description={`คำสั่งซื้อ ${selected.id} จะกลับไปเป็น “รอชำระ” และแจ้งลูกค้าให้ส่งสลิปใหม่`}
            confirmLabel="ยืนยัน ไม่ถูกต้อง"
            note={{
              label: "เหตุผล (แจ้งลูกค้า)",
              placeholder: "เช่น ยอดโอนไม่ตรงกับยอดคำสั่งซื้อ",
              required: true,
              requiredMessage: "กรุณาระบุเหตุผลที่สลิปไม่ถูกต้อง",
            }}
            onConfirm={(note) => {
              const next = nextAfter(selected.id);
              actions.rejectPayment(selected.id, note);
              setSelectedId(next);
              toast.error(`แจ้งสลิปไม่ถูกต้อง ${selected.id}`, { description: note });
            }}
          />
        </>
      )}
    </>
  );
}

function OrderSummary({ order }: { order: OnlineOrder }) {
  const isFullReceipt = order.receiptType === "เต็ม";
  return (
    <SectionCard
      title={<span className="num">{order.id}</span>}
      description={
        <div className="flex flex-col gap-0.5 text-xs">
          <span className="inline-flex items-center gap-1">
            สั่งเมื่อ <ClientTime iso={order.createdAt} />
          </span>
          {order.paymentDueAt && (
            <span className="inline-flex items-center gap-1 text-sun-800 dark:text-sun-300">
              <Clock className="size-3 text-sun-600" />
              กำหนดชำระภายใน: <ClientTime iso={order.paymentDueAt} />
            </span>
          )}
        </div>
      }
      actions={
        <div className="flex items-center gap-1.5">
          <Badge
            variant="outline"
            className={
              isFullReceipt
                ? "border-amber-400 bg-amber-50 text-amber-900 text-[11px] font-semibold"
                : "border-border text-muted-foreground text-[11px]"
            }
          >
            {isFullReceipt ? "ใบกำกับภาษีเต็มรูป" : "ใบเสร็จอย่างย่อ"}
          </Badge>
          <StatusBadge status={order.status} />
        </div>
      }
    >
      <div className="space-y-1.5 rounded-md bg-muted/60 p-3 text-sm">
        <p className="font-medium">{order.customerName} <span className="num text-muted-foreground">({order.memberCode})</span></p>
        <p className="flex items-center gap-2 text-muted-foreground"><Phone className="size-3.5" /> <span className="num">{formatPhone(order.phone)}</span></p>
        <p className="flex items-start gap-2 text-muted-foreground"><MapPin className="mt-0.5 size-3.5 shrink-0" /> {order.address}</p>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1 border-t border-border/50">
          <span className="font-medium text-foreground">วิธีจัดส่ง:</span> {order.shippingMethod || "Flash Express"}
        </p>
      </div>

      {isFullReceipt && (
        <div className="mt-3 space-y-1 rounded-md border border-amber-200/80 bg-amber-50/50 p-2.5 text-xs text-amber-900">
          <div className="font-semibold text-[11px] flex items-center gap-1 text-amber-800">
            <span>ข้อมูลออกใบกำกับภาษีเต็มรูป</span>
          </div>
          <div><span className="text-muted-foreground">ชื่อ/บริษัท:</span> <strong>{order.buyerName || order.customerName}</strong></div>
          <div><span className="text-muted-foreground">เลขประจำตัวผู้เสียภาษี (13 หลัก):</span> <strong className="font-mono">{order.buyerTaxId || "-"}</strong></div>
          {order.buyerAddress && <div><span className="text-muted-foreground">ที่อยู่ออกใบกำกับ:</span> {order.buyerAddress}</div>}
        </div>
      )}

      <table className="mt-4 w-full text-sm">
        <thead>
          <tr className="border-b text-muted-foreground">
            <th className="py-2 text-left font-medium">สินค้า</th>
            <th className="py-2 text-right font-medium">จำนวน</th>
            <th className="py-2 text-right font-medium">รวม</th>
          </tr>
        </thead>
        <tbody>
          {order.lines.map((l) => (
            <tr key={l.productId} className="border-b border-dashed">
              <td className="py-2">
                {l.name}
                <div className="text-xs text-muted-foreground">@ <Money value={l.price} /></div>
              </td>
              <td className="num py-2 text-right">{l.qty}</td>
              <td className="py-2 text-right"><Money value={l.price * l.qty} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      <dl className="mt-3 space-y-1 text-sm">
        <div className="flex justify-between"><dt className="text-muted-foreground">ค่าสินค้า</dt><dd><Money value={orderSubtotal(order)} /></dd></div>
        <div className="flex justify-between"><dt className="text-muted-foreground">ค่าจัดส่ง</dt><dd>{order.shippingFee ? <Money value={order.shippingFee} /> : "ฟรี"}</dd></div>
        {Boolean(order.pointsDiscount && order.pointsDiscount > 0) && (
          <div className="flex justify-between text-emerald-700 font-medium">
            <dt>ส่วนลดแต้มสมาชิก ({order.pointsUsed || 0} แต้ม)</dt>
            <dd>- <Money value={order.pointsDiscount!} /></dd>
          </div>
        )}
        <div className="flex items-baseline justify-between border-t pt-2">
          <div>
            <dt className="font-bold text-foreground">ยอดสุทธิที่ต้องชำระ</dt>
            <span className="text-[11px] text-muted-foreground block">(สลิปโอนเงินต้องตรงกับยอดนี้)</span>
          </div>
          <dd><Money value={orderTotal(order)} className="font-display text-2xl text-primary font-bold" /></dd>
        </div>
      </dl>
    </SectionCard>
  );
}

function SlipViewer({ order }: { order: OnlineOrder }) {
  const [zoom, setZoom] = useState(1);
  const [open, setOpen] = useState(false);
  const slip = order.slip!;
  const total = orderTotal(order);
  const mismatch = slip.amount !== total;

  const slipCard = (scale: number) => (
    <div
      className="mx-auto w-64 origin-top rounded-lg border bg-card p-5 shadow-soft transition-transform"
      style={{ transform: `scale(${scale})` }}
    >
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-teal-soft p-2 text-teal"><Landmark className="size-4" /></span>
        <div>
          <p className="text-sm font-semibold">โอนเงินสำเร็จ</p>
          <p className="text-xs text-muted-foreground">{slip.bank}</p>
        </div>
      </div>
      <div className="dashed-rule my-4" />
      <p className="text-xs text-muted-foreground">จำนวนเงิน</p>
      <Money value={slip.amount} className="font-display text-3xl" />
      <div className="mt-3 space-y-1 text-xs">
        <p className="flex justify-between"><span className="text-muted-foreground">ผู้โอน</span> {order.customerName}</p>
        <p className="flex justify-between"><span className="text-muted-foreground">ผู้รับ</span> ร้านรุ่งอรุณ มินิมาร์ท</p>
        <p className="flex justify-between"><span className="text-muted-foreground">วันเวลา</span> <ClientTime iso={slip.transferredAt} /></p>
        <p className="flex justify-between"><span className="text-muted-foreground">เลขอ้างอิง</span> <span className="num">{slip.reference}</span></p>
      </div>
      <div className="mt-4 grid grid-cols-6 gap-0.5 opacity-40" aria-hidden>
        {Array.from({ length: 36 }).map((_, i) => (
          <span key={i} className={cn("aspect-square rounded-[1px]", (i * 7) % 3 ? "bg-ink" : "bg-transparent")} />
        ))}
      </div>
    </div>
  );

  return (
    <SectionCard
      title="สลิปการโอนเงิน"
      description={`${order.paymentMethod} · ส่งเมื่อ`}
      actions={
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon-sm" onClick={() => setZoom((z) => Math.max(0.8, z - 0.2))} aria-label="ซูมออก"><ZoomOut /></Button>
          <span className="num w-10 text-center text-xs text-muted-foreground">{Math.round(zoom * 100)}%</span>
          <Button variant="outline" size="icon-sm" onClick={() => setZoom((z) => Math.min(1.6, z + 0.2))} aria-label="ซูมเข้า"><ZoomIn /></Button>
          <Button variant="outline" size="icon-sm" onClick={() => setOpen(true)} aria-label="ดูเต็มจอ"><Maximize2 /></Button>
        </div>
      }
    >
      {mismatch && (
        <div className="mb-3 flex items-start gap-2 rounded-md bg-warning-soft px-3 py-2 text-sm text-warning">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>
            ยอดโอน <Money value={slip.amount} className="font-semibold" /> ไม่ตรงกับยอดคำสั่งซื้อ{" "}
            <Money value={total} className="font-semibold" />
          </span>
        </div>
      )}
      <div className="h-[340px] overflow-auto rounded-md bg-muted/70 py-5">{slipCard(zoom)}</div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl rounded-lg">
          <DialogTitle>สลิป {order.id}</DialogTitle>
          <div className="h-[560px] overflow-auto rounded-md bg-muted/70 py-6">{slipCard(1.5)}</div>
        </DialogContent>
      </Dialog>
    </SectionCard>
  );
}
