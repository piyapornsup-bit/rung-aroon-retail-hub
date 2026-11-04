import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Boxes,
  Building2,
  CheckCircle2,
  Clock,
  Eye,
  Package,
  RotateCcw,
  Search,
  Undo2,
  User,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { StatCard } from "@/components/admin/StatCard";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Money } from "@/components/admin/Money";
import { ClientTime } from "@/components/admin/ClientTime";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useStore,
  selectWarehouseForCategory,
  selectApprovedReturnRequests,
  selectPendingReturnGoods,
} from "@/lib/store";
import type { ReturnRequest } from "@/lib/mock-data";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_admin/warehouse/returns")({
  head: () => ({
    meta: [
      { title: "รับสินค้าคืนจากลูกค้า — ร้านรุ่งอรุณ มินิมาร์ท" },
      {
        name: "description",
        content: "ตรวจรับสินค้าคืนที่ผ่านการอนุมัติแล้ว พร้อมนำสินค้ากลับเข้าสต็อกคงคลังและบันทึกประวัติ",
      },
      { property: "og:title", content: "รับสินค้าคืนจากลูกค้า — ร้านรุ่งอรุณ มินิมาร์ท" },
      {
        property: "og:description",
        content: "ตรวจรับสินค้าคืนที่ผ่านการอนุมัติแล้ว พร้อมนำสินค้ากลับเข้าสต็อกคงคลังและบันทึกประวัติ",
      },
    ],
  }),
  component: WarehouseReturnsPage,
});

type ReturnTab = "pending" | "received" | "all";

function WarehouseReturnsPage() {
  const { state, actions } = useStore();
  const [tab, setTab] = useState<ReturnTab>("pending");
  const [receiveTarget, setReceiveTarget] = useState<ReturnRequest | null>(null);
  const [receiveNote, setReceiveNote] = useState("");

  // Approved returns from round 1
  const approvedReturns = useMemo(() => selectApprovedReturnRequests(state), [state]);
  const pendingReturns = useMemo(() => selectPendingReturnGoods(state), [state]);
  const receivedReturns = useMemo(
    () => approvedReturns.filter((r) => !!r.receivedAt),
    [approvedReturns],
  );

  // Total value of pending returns
  const pendingTotalValue = useMemo(
    () =>
      pendingReturns.reduce(
        (sum, r) => sum + r.lines.reduce((s, l) => s + l.price * l.qty, 0),
        0,
      ),
    [pendingReturns],
  );

  // Filtered rows by active tab
  const rows = useMemo(() => {
    if (tab === "pending") return pendingReturns;
    if (tab === "received") return receivedReturns;
    return approvedReturns;
  }, [tab, pendingReturns, receivedReturns, approvedReturns]);

  const handleOpenReceive = (r: ReturnRequest) => {
    setReceiveTarget(r);
    setReceiveNote("ตรวจสภาพสินค้าเรียบร้อย สภาพสมบูรณ์พร้อมนำกลับเข้าสต็อก");
  };

  const handleConfirmReceive = () => {
    if (!receiveTarget) return;

    const res = actions.confirmReturnReceived(receiveTarget.id, receiveNote);
    if (!res.ok) {
      toast.error("ไม่สามารถรับสินค้าคืนได้", { description: res.reason });
      return;
    }

    const itemsSummary = receiveTarget.lines.map((l) => `${l.name} (${l.qty} ชิ้น)`).join(", ");
    toast.success("รับสินค้าคืนเข้าคลังเรียบร้อยแล้ว", {
      description: `นำ ${itemsSummary} กลับเข้าสต็อกคงคลังและบันทึกประวัติสำเร็จ`,
    });
    setReceiveTarget(null);
  };

  const columns: DataTableColumn<ReturnRequest>[] = [
    {
      key: "id",
      header: "เลขที่คำขอ / ออเดอร์",
      cell: (r) => (
        <div className="space-y-0.5">
          <Badge variant="outline" className="font-mono text-xs font-semibold">
            {r.id}
          </Badge>
          <p className="font-mono text-[11px] text-muted-foreground">{r.orderId}</p>
        </div>
      ),
      sortValue: (r) => r.id,
      className: "w-36",
    },
    {
      key: "customer",
      header: "ลูกค้า / วันที่อนุมัติ",
      cell: (r) => (
        <div className="space-y-0.5">
          <span className="font-medium text-foreground text-xs flex items-center gap-1">
            <User className="size-3 text-muted-foreground" />
            {r.customerName}
          </span>
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Clock className="size-3" />
            {r.decidedAt ? <ClientTime iso={r.decidedAt} mode="ago" /> : "-"}
          </div>
        </div>
      ),
      sortValue: (r) => r.customerName,
      className: "w-44",
    },
    {
      key: "items",
      header: "รายการสินค้าที่ส่งคืน & โกดังปลายทาง",
      cell: (r) => (
        <div className="space-y-1.5 py-1">
          {r.lines.map((line) => {
            const product = state.catalog.products.find((p) => p.id === line.productId);
            const cat = product?.category ?? "";
            const warehouse = selectWarehouseForCategory(state, cat);

            return (
              <div
                key={line.productId}
                className="flex items-center justify-between gap-3 text-xs bg-muted/40 rounded px-2 py-1 border"
              >
                <div className="space-y-0.5">
                  <span className="font-medium text-foreground">
                    {product?.emoji} {line.name}
                  </span>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Building2 className="size-2.5 text-sun-600" />
                    <span>คืนเข้า: {warehouse?.name ?? "โกดังหลัก"} ({warehouse?.id ?? "WH-01"})</span>
                  </div>
                </div>

                <div className="text-right font-mono font-semibold">
                  <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                    +{line.qty} {product?.unit ?? "ชิ้น"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ),
    },
    {
      key: "reason",
      header: "เหตุผล & รายละเอียด",
      cell: (r) => (
        <div className="max-w-xs space-y-1 text-xs">
          <span className="font-semibold text-foreground inline-block bg-muted/60 px-1.5 py-0.5 rounded text-[11px]">
            {r.reason}
          </span>
          <p className="text-muted-foreground line-clamp-2 text-[11px]">{r.detail}</p>
          {r.decisionNote && (
            <p className="text-[10px] text-emerald-800 bg-emerald-50/70 p-1 rounded border border-emerald-200/50">
              อนุมัติโดย {r.decidedBy}: {r.decisionNote}
            </p>
          )}
        </div>
      ),
      className: "w-56",
    },
    {
      key: "amount",
      header: "มูลค่าสินค้า",
      align: "right",
      cell: (r) => {
        const val = r.lines.reduce((s, l) => s + l.price * l.qty, 0);
        return <Money value={val} className="font-mono text-xs font-semibold" />;
      },
      sortValue: (r) => r.lines.reduce((s, l) => s + l.price * l.qty, 0),
      className: "w-28",
    },
    {
      key: "status",
      header: "สถานะการรับคืน",
      align: "center",
      cell: (r) => {
        if (r.receivedAt) {
          return (
            <div className="space-y-0.5">
              <StatusBadge status="รับเข้าคลังแล้ว" tone="green" />
              <p className="text-[10px] text-muted-foreground">โดย {r.receivedBy}</p>
            </div>
          );
        }
        return <StatusBadge status="รอรับเข้าคลัง" tone="amber" />;
      },
      sortValue: (r) => (r.receivedAt ? 1 : 0),
      className: "w-32",
    },
    {
      key: "actions",
      header: "ดำเนินการ",
      align: "center",
      cell: (r) => {
        if (r.receivedAt) {
          return (
            <span className="text-xs text-emerald-700 flex items-center justify-center gap-1 font-medium">
              <CheckCircle2 className="size-3.5" />
              คืนสต็อกแล้ว
            </span>
          );
        }

        return (
          <Button
            size="sm"
            onClick={() => handleOpenReceive(r)}
            className="h-8 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
          >
            <RotateCcw className="size-3.5" />
            <span>ยืนยันรับสินค้าคืน</span>
          </Button>
        );
      },
      className: "w-36",
    },
  ];

  return (
    <>
      <PageHeader
        title="รับสินค้าคืนจากลูกค้า"
        description="ตรวจสอบรายการคำขอคืนสินค้าที่ฝ่ายขายอนุมัติแล้ว และกดยืนยันรับสินค้าคืนเข้าคลังเพื่อเพิ่มสต็อกสินค้าอัตโนมัติ"
      />

      {/* Top Stat Summary Cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <StatCard
          icon={AlertCircle}
          label="รอตรวจรับเข้าคลัง"
          value={`${pendingReturns.length} รายการ`}
          tone={pendingReturns.length > 0 ? "danger" : "success"}
          hint="สินค้ากำลังส่งคืนมาที่คลัง"
        />
        <StatCard
          icon={CheckCircle2}
          label="ตรวจรับเข้าคลังแล้ว"
          value={`${receivedReturns.length} รายการ`}
          tone="success"
          hint="นำสินค้ากลับเข้าสต็อกแล้ว"
        />
        <StatCard
          icon={Undo2}
          label="คำขอคืนที่อนุมัติทั้งหมด"
          value={`${approvedReturns.length} รายการ`}
          tone="teal"
          hint="จากระบบขายหน้าร้าน/ออนไลน์"
        />
        <StatCard
          icon={Boxes}
          label="มูลค่าสินค้ารอรับคืน"
          value={<Money value={pendingTotalValue} decimals={false} />}
          tone="info"
          hint="รอตรวจนับและเติมสต็อก"
        />
      </div>

      {/* Tab Navigation */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as ReturnTab)} className="mb-4">
        <TabsList className="h-10 rounded-md bg-card p-1 shadow-soft">
          <TabsTrigger
            value="pending"
            className="h-8 gap-1.5 px-3 text-xs data-[state=active]:bg-amber-100 data-[state=active]:text-amber-900"
          >
            <AlertCircle className="size-3.5 text-amber-600" />
            รอรับสินค้าคืนเข้าคลัง
            <span className="rounded-full bg-amber-200 px-1.5 py-0.2 text-[10px] font-semibold text-amber-950">
              {pendingReturns.length}
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="received"
            className="h-8 gap-1.5 px-3 text-xs data-[state=active]:bg-sun-50 data-[state=active]:text-sun-800"
          >
            <CheckCircle2 className="size-3.5 text-emerald-600" />
            ตรวจรับแล้ว (คืนสต็อกแล้ว)
            <span className="rounded-full bg-muted px-1.5 py-0.2 text-[10px]">
              {receivedReturns.length}
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="all"
            className="h-8 gap-1.5 px-3 text-xs data-[state=active]:bg-sun-50 data-[state=active]:text-sun-800"
          >
            คำขอคืนที่อนุมัติทั้งหมด
            <span className="rounded-full bg-muted px-1.5 py-0.2 text-[10px]">
              {approvedReturns.length}
            </span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Returns DataTable */}
      <DataTable
        data={rows}
        columns={columns}
        getRowId={(r) => r.id}
        searchPlaceholder="ค้นหาเลขคำขอ, ออเดอร์, ชื่อลูกค้า หรือสินค้า..."
        searchFn={(r, q) =>
          r.id.toLowerCase().includes(q) ||
          r.orderId.toLowerCase().includes(q) ||
          r.customerName.toLowerCase().includes(q) ||
          r.reason.toLowerCase().includes(q) ||
          r.lines.some((l) => l.name.toLowerCase().includes(q))
        }
        emptyTitle="ไม่พบรายการคืนสินค้า"
        emptyDescription="เมื่อลูกค้าส่งคำขอคืนสินค้าและฝ่ายขายอนุมัติ รายการจะแสดงที่นี่เพื่อให้คลังตรวจสอบรับของ"
      />

      {/* Confirm Receiving Dialog */}
      {receiveTarget && (
        <ConfirmDialog
          open={!!receiveTarget}
          onOpenChange={(open) => !open && setReceiveTarget(null)}
          title={`ยืนยันรับสินค้าคืนเข้าคลัง — คำขอ ${receiveTarget.id}`}
          description={
            <div className="space-y-3 pt-2 text-left text-xs">
              <p className="text-muted-foreground">
                การยืนยันรับสินค้านี้จะ <strong>ปรับเพิ่มจำนวนสต็อกสินค้าคงเหลือในระบบทันที</strong> และบันทึกประวัติการปรับยอดคลัง (Stock Adjustment) สำหรับ:
              </p>

              {/* Items Summary with Stock impact */}
              <div className="rounded-lg border bg-muted/40 p-3 space-y-2">
                <div className="flex justify-between font-semibold text-foreground pb-1 border-b">
                  <span>สินค้าที่รับคืน</span>
                  <span>ผลกระทบสต็อก</span>
                </div>
                {receiveTarget.lines.map((l) => {
                  const product = state.catalog.products.find((p) => p.id === l.productId);
                  const cat = product?.category ?? "";
                  const warehouse = selectWarehouseForCategory(state, cat);
                  const curStock = product?.stock ?? 0;
                  const newStock = curStock + l.qty;

                  return (
                    <div key={l.productId} className="flex items-center justify-between text-xs py-0.5">
                      <div>
                        <span className="font-medium text-foreground block">
                          {product?.emoji} {l.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          โกดังจัดเก็บ: {warehouse?.name ?? "โกดังหลัก"}
                        </span>
                      </div>
                      <div className="text-right font-mono">
                        <span className="text-muted-foreground">{curStock}</span>
                        <span className="text-emerald-700 font-bold mx-1">+{l.qty}</span>
                        <span className="text-foreground font-bold">➔ {newStock} {product?.unit}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Receiving Note */}
              <div className="space-y-1">
                <label className="font-semibold text-foreground block">
                  บันทึกการตรวจรับสภาพสินค้า:
                </label>
                <Input
                  value={receiveNote}
                  onChange={(e) => setReceiveNote(e.target.value)}
                  placeholder="สภาพสินค้า ความสมบูรณ์ หรือตำแหน่งจัดเก็บบนเชลฟ์..."
                  className="text-xs"
                />
              </div>
            </div>
          }
          tone="success"
          confirmLabel="ยืนยันรับสินค้าและเพิ่มสต็อก"
          onConfirm={handleConfirmReceive}
        />
      )}
    </>
  );
}
