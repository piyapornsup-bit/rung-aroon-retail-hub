import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Boxes,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Package,
  PackageCheck,
  PackagePlus,
  PackageX,
  RotateCcw,
  Search,
  Send,
  Truck,
  User,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatCard } from "@/components/admin/StatCard";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Money } from "@/components/admin/Money";
import { ClientTime } from "@/components/admin/ClientTime";
import { FormDialog, Field } from "@/components/admin/FormDialog";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { EmptyState } from "@/components/admin/EmptyState";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useStore,
  selectWarehouseForCategory,
  selectPendingReceivingPOs,
  selectCompletedPOs,
} from "@/lib/store";
import type { PurchaseOrder, PurchaseOrderLine, PODiscrepancyItem } from "@/lib/mock-data";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_admin/warehouse/receiving")({
  head: () => ({
    meta: [
      { title: "ตรวจรับสินค้าเข้าคลัง — ร้านรุ่งอรุณ มินิมาร์ท" },
      {
        name: "description",
        content: "ตรวจรับสินค้าจากใบสั่งซื้อ เปรียบเทียบจำนวน ตรวจสอบความถูกต้อง และนำเข้าสต็อกตามโกดัง",
      },
      { property: "og:title", content: "ตรวจรับสินค้าเข้าคลัง — ร้านรุ่งอรุณ มินิมาร์ท" },
      {
        property: "og:description",
        content: "ตรวจรับสินค้าจากใบสั่งซื้อ เปรียบเทียบจำนวน ตรวจสอบความถูกต้อง และนำเข้าสต็อกตามโกดัง",
      },
    ],
  }),
  component: WarehouseReceivingPage,
});

interface LineInspectionState {
  deliveredQty: number;
  checkStatus: "ถูกต้อง" | "ไม่ถูกต้อง";
  note: string;
}

function WarehouseReceivingPage() {
  const { state, actions } = useStore();

  const pendingPOs = useMemo(() => selectPendingReceivingPOs(state), [state]);
  const completedPOs = useMemo(() => selectCompletedPOs(state), [state]);

  // Selected PO state
  const [selectedPOId, setSelectedPOId] = useState<string>(
    pendingPOs[0]?.id ?? state.purchaseOrders[0]?.id ?? "",
  );

  const selectedPO = useMemo(
    () => state.purchaseOrders.find((p) => p.id === selectedPOId) ?? state.purchaseOrders[0],
    [state.purchaseOrders, selectedPOId],
  );

  // Line inspection draft state (keyed by productId)
  const [inspectionDraft, setInspectionDraft] = useState<Record<string, LineInspectionState>>({});
  const [receivingNote, setReceivingNote] = useState("");
  const [summaryDialogOpen, setSummaryDialogOpen] = useState(false);

  // Initialize or get inspection state for a line
  const getLineState = (line: PurchaseOrderLine): LineInspectionState => {
    if (inspectionDraft[line.productId]) {
      return inspectionDraft[line.productId];
    }
    // Default to ordered quantity and "ถูกต้อง"
    return {
      deliveredQty: line.receivedQty !== undefined && line.receivedQty > 0 ? line.receivedQty : line.qty,
      checkStatus: line.checkStatus ?? "ถูกต้อง",
      note: line.note ?? "",
    };
  };

  const updateLine = (productId: string, updates: Partial<LineInspectionState>) => {
    setInspectionDraft((prev) => {
      const current = prev[productId] ?? {
        deliveredQty: selectedPO?.lines.find((l) => l.productId === productId)?.qty ?? 0,
        checkStatus: "ถูกต้อง",
        note: "",
      };
      return {
        ...prev,
        [productId]: { ...current, ...updates },
      };
    });
  };

  // Calculate stats for current inspection
  const inspectionSummary = useMemo(() => {
    if (!selectedPO) return { correctCount: 0, incorrectCount: 0, totalDelivered: 0, discrepancies: [] };

    let correctCount = 0;
    let incorrectCount = 0;
    let totalDelivered = 0;
    const discrepancies: { line: PurchaseOrderLine; delivered: number; note: string }[] = [];

    for (const l of selectedPO.lines) {
      const st = getLineState(l);
      if (st.checkStatus === "ถูกต้อง") {
        correctCount++;
        totalDelivered += st.deliveredQty;
      } else {
        incorrectCount++;
        discrepancies.push({
          line: l,
          delivered: st.deliveredQty,
          note: st.note || "สินค้าไม่ถูกต้อง / ชำรุด",
        });
      }
    }

    return { correctCount, incorrectCount, totalDelivered, discrepancies };
  }, [selectedPO, inspectionDraft]);

  const handleOpenConfirmSummary = () => {
    if (!selectedPO) return;
    setSummaryDialogOpen(true);
  };

  const handleExecuteReceiving = () => {
    if (!selectedPO) return;

    const lineResults = selectedPO.lines.map((l) => {
      const st = getLineState(l);
      return {
        productId: l.productId,
        deliveredQty: st.deliveredQty,
        checkStatus: st.checkStatus,
        note: st.note,
      };
    });

    const res = actions.receivePurchaseOrder(selectedPO.id, lineResults, receivingNote);
    if (!res.ok) {
      toast.error("ไม่สามารถบันทึกการตรวจรับได้", { description: res.reason });
      return;
    }

    toast.success("บันทึกการตรวจรับสินค้าเข้าคลังเรียบร้อย", {
      description: `ใบสั่งซื้อ ${selectedPO.poNumber} (${inspectionSummary.correctCount} รายการรับเข้าสต็อก)`,
    });
    setSummaryDialogOpen(false);
    setReceivingNote("");
  };

  // Total discrepancy count across all POs
  const totalDiscrepanciesCount = useMemo(() => {
    return state.purchaseOrders.reduce((sum, p) => sum + (p.discrepancies?.length ?? 0), 0);
  }, [state.purchaseOrders]);

  return (
    <>
      <PageHeader
        title="ตรวจรับสินค้าเข้าคลัง"
        description="เปรียบเทียบจำนวนสั่งซื้อกับจำนวนที่ส่งมอบ ตรวจสอบความถูกต้อง นำสินค้าเข้าสต็อกตามโกดัง และส่งคืนรายการชำรุด"
      />

      {/* Top Stat Summary Cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <StatCard
          icon={PackagePlus}
          label="ใบสั่งซื้อรอตรวจรับ"
          value={`${pendingPOs.length} ใบสั่งซื้อ`}
          tone={pendingPOs.length > 0 ? "sun" : "info"}
          hint="นัดส่งมอบสัปดาห์นี้"
        />
        <StatCard
          icon={CheckCircle2}
          label="ตรวจรับเข้าคลังแล้ว"
          value={`${completedPOs.length} ใบสั่งซื้อ`}
          tone="success"
          hint="รับของและเพิ่มสต็อกแล้ว"
        />
        <StatCard
          icon={PackageX}
          label="ต้องส่งคืนตัวแทน"
          value={`${totalDiscrepanciesCount} รายการ`}
          tone={totalDiscrepanciesCount > 0 ? "danger" : "info"}
          hint="รายการชำรุด/ส่งผิด รอเคลม"
        />
        <StatCard
          icon={FileText}
          label="ใบสั่งซื้อทั้งหมด"
          value={`${state.purchaseOrders.length} ใบสั่งซื้อ`}
          tone="teal"
          hint="ระบบจัดซื้อ (PO)"
        />
      </div>

      {/* PO Selector Banner */}
      <div className="mb-6 rounded-lg border bg-card p-4 shadow-soft">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
              เลือกใบสั่งซื้อที่ต้องการตรวจรับ (Purchase Order)
            </span>
            <div className="flex items-center gap-2">
              <Select value={selectedPOId} onValueChange={setSelectedPOId}>
                <SelectTrigger className="w-full sm:w-80 font-medium">
                  <SelectValue placeholder="เลือกใบสั่งซื้อ..." />
                </SelectTrigger>
                <SelectContent>
                  {state.purchaseOrders.map((po) => (
                    <SelectItem key={po.id} value={po.id}>
                      <span className="font-mono font-bold mr-2">{po.poNumber}</span>
                      <span className="text-muted-foreground truncate">({po.supplierName})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedPO && <StatusBadge status={selectedPO.status} />}
            </div>
          </div>

          {/* Quick stats of selected PO */}
          {selectedPO && (
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground border-t pt-2 md:border-t-0 md:pt-0">
              <div>
                <span>ผู้จำหน่าย:</span>
                <p className="font-medium text-foreground">{selectedPO.supplierName}</p>
              </div>
              <div>
                <span>โกดังปลายทาง:</span>
                <p className="font-medium text-foreground flex items-center gap-1">
                  <Building2 className="size-3 text-sun-600" />
                  {selectedPO.warehouseName}
                </p>
              </div>
              <div>
                <span>มูลค่าสั่งซื้อ:</span>
                <p className="font-bold text-foreground font-mono">
                  <Money value={selectedPO.totalAmount} />
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Receiving Workflow Container */}
      {selectedPO ? (
        <div className="space-y-6">
          {/* PO Already Received Info Alert (if completed) */}
          {selectedPO.receivedAt && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-4 text-xs text-emerald-950 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="size-5 text-emerald-600 shrink-0" />
                <div>
                  <p className="font-semibold text-sm">
                    ใบสั่งซื้อนี้ผ่านการตรวจรับเข้าคลังแล้ว (สถานะ: {selectedPO.status})
                  </p>
                  <p className="text-muted-foreground">
                    ตรวจรับเมื่อ <ClientTime iso={selectedPO.receivedAt} /> โดย {selectedPO.receivedBy}
                    {selectedPO.receivingNote ? ` · หมายเหตุ: ${selectedPO.receivingNote}` : ""}
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="bg-emerald-100 text-emerald-900 border-emerald-300">
                นำเข้าสต็อกแล้ว
              </Badge>
            </div>
          )}

          {/* Lines Inspection Table */}
          <div className="rounded-lg border bg-card shadow-soft overflow-hidden">
            <div className="border-b bg-muted/30 px-4 py-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  รายการสินค้าในใบสั่งซื้อ ({selectedPO.lines.length} รายการ)
                </h3>
                <p className="text-xs text-muted-foreground">
                  ตรวจสอบจำนวนที่ส่งมอบจริง และระบุความถูกต้องของสินค้าแต่ละรายการ
                </p>
              </div>

              {/* Status summary pill */}
              <div className="flex items-center gap-2 text-xs">
                <span className="flex items-center gap-1 rounded bg-emerald-50 px-2 py-1 text-emerald-800 border border-emerald-200 font-medium">
                  <Check className="size-3" /> ถูกต้อง {inspectionSummary.correctCount}
                </span>
                {inspectionSummary.incorrectCount > 0 && (
                  <span className="flex items-center gap-1 rounded bg-red-50 px-2 py-1 text-red-800 border border-red-200 font-medium">
                    <X className="size-3" /> ไม่ถูกต้อง {inspectionSummary.incorrectCount}
                  </span>
                )}
              </div>
            </div>

            <div className="divide-y text-xs">
              {selectedPO.lines.map((line, idx) => {
                const product = state.catalog.products.find((p) => p.id === line.productId);
                const category = product?.category ?? "";
                const warehouse = selectWarehouseForCategory(state, category);
                const st = getLineState(line);
                const isCorrect = st.checkStatus === "ถูกต้อง";

                return (
                  <div
                    key={line.productId}
                    className={cn(
                      "p-4 transition-colors",
                      !isCorrect ? "bg-red-50/40" : idx % 2 === 1 ? "bg-muted/10" : "bg-card",
                    )}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                      {/* Product Name & Warehouse Pick Info (4 cols) */}
                      <div className="md:col-span-4 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xl select-none">{product?.emoji || "📦"}</span>
                          <div>
                            <span className="font-semibold text-foreground text-sm block">
                              {line.name}
                            </span>
                            <span className="font-mono text-[11px] text-muted-foreground">
                              SKU: {line.sku} · หมวดหมู่: {category}
                            </span>
                          </div>
                        </div>

                        {/* Shows Warehouse derived from category (1:1 rule) */}
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-0.5">
                          <Building2 className="size-3 text-sun-600 shrink-0" />
                          <span>
                            คลังจัดเก็บ: <strong>{warehouse?.name ?? selectedPO.warehouseName}</strong> ({warehouse?.id ?? selectedPO.warehouseId})
                          </span>
                        </div>
                      </div>

                      {/* Ordered Quantity & Cost (2 cols) */}
                      <div className="md:col-span-2 space-y-0.5 text-left md:text-center">
                        <span className="text-[11px] text-muted-foreground block">สั่งซื้อตาม PO:</span>
                        <span className="font-bold text-sm text-foreground font-mono">
                          {line.qty} {line.unit}
                        </span>
                        <span className="text-[10px] text-muted-foreground block font-mono">
                          ต้นทุน @<Money value={line.costPrice} />
                        </span>
                      </div>

                      {/* Delivered Quantity Input (2 cols) */}
                      <div className="md:col-span-2 space-y-1">
                        <label className="text-[11px] font-medium text-foreground block">
                          จำนวนที่ส่งมอบจริง:
                        </label>
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            min="0"
                            value={st.deliveredQty}
                            disabled={!!selectedPO.receivedAt}
                            onChange={(e) =>
                              updateLine(line.productId, { deliveredQty: Number(e.target.value) || 0 })
                            }
                            className={cn(
                              "h-8 text-center font-bold font-mono text-sm",
                              st.deliveredQty !== line.qty && "border-amber-400 bg-amber-50 text-amber-950",
                            )}
                          />
                          <span className="text-xs text-muted-foreground shrink-0">{line.unit}</span>
                        </div>
                        {st.deliveredQty !== line.qty && (
                          <span className="text-[10px] text-amber-700 block">
                            ผลต่าง: {st.deliveredQty - line.qty > 0 ? `+${st.deliveredQty - line.qty}` : `${st.deliveredQty - line.qty}`} {line.unit}
                          </span>
                        )}
                      </div>

                      {/* Mark Status: ถูกต้อง / ไม่ถูกต้อง (2 cols) */}
                      <div className="md:col-span-2 space-y-1">
                        <label className="text-[11px] font-medium text-foreground block">
                          ผลการตรวจนับ:
                        </label>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={!!selectedPO.receivedAt}
                            onClick={() => updateLine(line.productId, { checkStatus: "ถูกต้อง" })}
                            className={cn(
                              "flex-1 h-8 rounded border text-xs font-semibold flex items-center justify-center gap-1 transition-all",
                              isCorrect
                                ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                                : "bg-muted text-muted-foreground hover:bg-muted/80",
                            )}
                          >
                            <Check className="size-3" />
                            ถูกต้อง
                          </button>

                          <button
                            type="button"
                            disabled={!!selectedPO.receivedAt}
                            onClick={() => updateLine(line.productId, { checkStatus: "ไม่ถูกต้อง" })}
                            className={cn(
                              "flex-1 h-8 rounded border text-xs font-semibold flex items-center justify-center gap-1 transition-all",
                              !isCorrect
                                ? "bg-danger text-white border-danger shadow-xs"
                                : "bg-muted text-muted-foreground hover:bg-muted/80",
                            )}
                          >
                            <X className="size-3" />
                            ไม่ถูกต้อง
                          </button>
                        </div>
                      </div>

                      {/* Line Note / Discrepancy Note (2 cols) */}
                      <div className="md:col-span-2 space-y-1">
                        <label className="text-[11px] font-medium text-foreground block">
                          หมายเหตุ {!isCorrect && <span className="text-danger">*</span>}:
                        </label>
                        <Input
                          value={st.note}
                          disabled={!!selectedPO.receivedAt}
                          onChange={(e) => updateLine(line.productId, { note: e.target.value })}
                          placeholder={isCorrect ? "สภาพเรียบร้อย..." : "เช่น สินค้าชำรุด 5 ชิ้น, ของขาด"}
                          className={cn("h-8 text-xs", !isCorrect && "border-red-300 bg-red-50/50")}
                        />
                      </div>
                    </div>

                    {/* Stock Destination helper pill */}
                    <div className="mt-2 flex items-center justify-between text-[11px] pt-2 border-t border-muted/60">
                      <span className="text-muted-foreground">
                        {isCorrect ? (
                          <span className="text-emerald-700 flex items-center gap-1 font-medium">
                            <CheckCircle2 className="size-3" />
                            จะเพิ่มจำนวน {st.deliveredQty} {line.unit} เข้าสต็อกที่{" "}
                            <strong>{warehouse?.name}</strong>
                          </span>
                        ) : (
                          <span className="text-red-700 flex items-center gap-1 font-medium">
                            <AlertTriangle className="size-3" />
                            รายการนี้จะไม่ถูกเพิ่มเข้าสต็อก และจะถูกส่งไปยังรายการ “ต้องส่งคืนตัวแทน”
                          </span>
                        )}
                      </span>

                      <span className="font-mono text-muted-foreground">
                        สต็อกปัจจุบันในระบบ: {product?.stock ?? 0} {line.unit}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Actions Bar */}
            {!selectedPO.receivedAt && (
              <div className="border-t bg-muted/20 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="text-xs text-muted-foreground">
                  <span>
                    สรุป: รับเข้าคลัง <strong>{inspectionSummary.correctCount}</strong> รายการ | คืนตัวแทน{" "}
                    <strong className="text-danger">{inspectionSummary.incorrectCount}</strong> รายการ
                  </span>
                </div>

                <Button
                  onClick={handleOpenConfirmSummary}
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                >
                  <PackageCheck className="size-4" />
                  <span>ยืนยันผลการตรวจรับสินค้าเข้าคลัง</span>
                  <ArrowRight className="size-4" />
                </Button>
              </div>
            )}
          </div>

          {/* List of Discrepancies to Return to Supplier (ต้องส่งคืนตัวแทน) */}
          {(selectedPO.discrepancies?.length ?? 0) > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50/30 p-4 shadow-soft space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PackageX className="size-5 text-red-600" />
                  <h4 className="text-sm font-semibold text-red-950">
                    รายการสินค้าที่ต้องส่งคืนตัวแทน ({selectedPO.discrepancies?.length} รายการ)
                  </h4>
                </div>
                <Badge variant="outline" className="border-red-300 text-red-800 bg-red-100/60">
                  แจ้งเตือนฝ่ายจัดซื้อแล้ว
                </Badge>
              </div>

              <div className="divide-y divide-red-200/60 rounded-md border border-red-200 bg-card overflow-hidden text-xs">
                {selectedPO.discrepancies?.map((d) => (
                  <div key={d.productId} className="p-3 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-foreground text-sm block">
                        {d.productName}
                      </span>
                      <p className="text-muted-foreground text-[11px]">
                        รหัส SKU: {d.sku} · เหตุผล: <strong className="text-red-700">{d.reason}</strong>
                      </p>
                    </div>

                    <div className="text-right font-mono">
                      <span className="text-red-700 font-bold block text-sm">
                        จำนวนส่งคืน: {d.discrepancyQty} ชิ้น
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        (สั่ง {d.orderedQty} / ส่งจริง {d.deliveredQty})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <EmptyState
          title="ไม่พบข้อมูลใบสั่งซื้อ"
          description="กรุณาเลือกใบสั่งซื้อจากรายการด้านบน"
        />
      )}

      {/* Receipt Summary Confirmation Dialog */}
      {selectedPO && (
        <FormDialog
          open={summaryDialogOpen}
          onOpenChange={setSummaryDialogOpen}
          title="สรุปผลการตรวจรับสินค้าเข้าคลัง (Receipt Summary)"
          description={`ใบสั่งซื้อ ${selectedPO.poNumber} — ผู้จำหน่าย: ${selectedPO.supplierName}`}
          submitLabel="ยืนยันการรับเข้าคลังและปรับปรุงสต็อก"
          onSubmit={() => {
            handleExecuteReceiving();
            return true;
          }}
          className="sm:max-w-xl max-h-[90vh] overflow-y-auto"
        >
          <div className="space-y-4 text-xs">
            {/* Accepted Lines Summary */}
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 space-y-2">
              <div className="flex items-center justify-between font-semibold text-emerald-950">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-emerald-600" />
                  สินค้าถูกต้อง — นำเข้าสต็อก ({inspectionSummary.correctCount} รายการ)
                </span>
                <span className="font-mono">{inspectionSummary.totalDelivered} ชิ้น</span>
              </div>

              <div className="space-y-1 pt-1 border-t border-emerald-200/50">
                {selectedPO.lines
                  .filter((l) => getLineState(l).checkStatus === "ถูกต้อง")
                  .map((l) => {
                    const st = getLineState(l);
                    const prod = state.catalog.products.find((p) => p.id === l.productId);
                    const cat = prod?.category ?? "";
                    const wh = selectWarehouseForCategory(state, cat);

                    return (
                      <div key={l.productId} className="flex justify-between text-muted-foreground">
                        <span>
                          {prod?.emoji} {l.name} ➔ <strong>{wh?.name ?? selectedPO.warehouseName}</strong>
                        </span>
                        <span className="font-mono font-semibold text-foreground">
                          +{st.deliveredQty} {l.unit}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Discrepancy / Return-to-Supplier Summary */}
            {inspectionSummary.incorrectCount > 0 ? (
              <div className="rounded-lg border border-red-200 bg-red-50/50 p-3 space-y-2">
                <div className="flex items-center justify-between font-semibold text-red-950">
                  <span className="flex items-center gap-1.5">
                    <XCircle className="size-4 text-red-600" />
                    สินค้าไม่ถูกต้อง — ต้องส่งคืนตัวแทน ({inspectionSummary.incorrectCount} รายการ)
                  </span>
                  <Badge variant="outline" className="text-[10px] bg-red-100 text-red-900 border-red-300">
                    แจ้งจัดซื้ออัตโนมัติ
                  </Badge>
                </div>

                <div className="space-y-1.5 pt-1 border-t border-red-200/50">
                  {inspectionSummary.discrepancies.map((d) => (
                    <div key={d.line.productId} className="flex justify-between text-muted-foreground">
                      <div>
                        <span className="font-medium text-foreground">{d.line.name}</span>
                        <p className="text-[10px] text-red-700">สาเหตุ: {d.note}</p>
                      </div>
                      <span className="font-mono font-semibold text-red-800">
                        {d.line.qty} {d.line.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-muted bg-muted/20 p-3 text-center text-muted-foreground">
                <Check className="size-4 text-emerald-600 inline mr-1" />
                สินค้าครบถ้วนถูกต้องทุกรายการ ไม่มีรายการต้องส่งคืนตัวแทน
              </div>
            )}

            {/* Receiving Staff Note */}
            <Field label="บันทึกการตรวจรับของพนักงานคลัง" htmlFor="rcv-note">
              <Textarea
                id="rcv-note"
                rows={2}
                value={receivingNote}
                onChange={(e) => setReceivingNote(e.target.value)}
                placeholder="ระบุชื่อผู้ส่งของ เลขใบส่งของชั่วคราว หรือข้อสังเกตเพิ่มเติม..."
              />
            </Field>
          </div>
        </FormDialog>
      )}
    </>
  );
}

