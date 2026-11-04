import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Boxes,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  History,
  Package,
  PackageX,
  Send,
  User,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable, type DataTableColumn, type DataTableFilter } from "@/components/admin/DataTable";
import { FormDialog, Field } from "@/components/admin/FormDialog";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { StatCard } from "@/components/admin/StatCard";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ClientTime } from "@/components/admin/ClientTime";
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
import { formatNumber } from "@/lib/format";
import {
  useStore,
  selectWarehouseForCategory,
  selectReorderPointProducts,
} from "@/lib/store";
import type { Product, StockAdjustment } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_admin/warehouse/stock")({
  head: () => ({
    meta: [
      { title: "ตรวจเช็คสินค้าคงคลัง — ร้านรุ่งอรุณ มินิมาร์ท" },
      { name: "description", content: "ตรวจเช็คสต็อกสินค้าจริง เปรียบเทียบจุดสั่งซื้อ และบันทึกผลการนับสต็อก" },
      { property: "og:title", content: "ตรวจเช็คสินค้าคงคลัง — ร้านรุ่งอรุณ มินิมาร์ท" },
      { property: "og:description", content: "ตรวจเช็คสต็อกสินค้าจริง เปรียบเทียบจุดสั่งซื้อ และบันทึกผลการนับสต็อก" },
    ],
  }),
  component: StockCheckPage,
});

const REASONS = [
  "ตรวจนับสต็อกประจำสัปดาห์ / ประจำเดือน",
  "สินค้าชำรุดเสียหาย / หมดอายุ",
  "สินค้าสูญหาย / หาไม่พบ",
  "พบสินค้าตกหล่นในคลัง",
  "ปรับปรุงยอดจากการรับของผิดพลาด",
  "อื่น ๆ",
];

function StockCheckPage() {
  const { state, actions } = useStore();
  const [activeTab, setActiveTab] = useState<string>("all");
  const [countDialogOpen, setCountDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [countedQty, setCountedQty] = useState<string>("");
  const [reason, setReason] = useState<string>(REASONS[0]);
  const [countedBy, setCountedBy] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [countErrors, setCountErrors] = useState<Record<string, string>>({});

  // Notify Purchasing Dialog
  const [notifyDialogOpen, setNotifyDialogOpen] = useState(false);
  const [notifyNote, setNotifyNote] = useState("");

  const reorderProducts = useMemo(() => selectReorderPointProducts(state), [state]);
  const outOfStockProducts = useMemo(
    () => state.catalog.products.filter((p) => p.stock === 0),
    [state.catalog.products],
  );

  const openCountDialog = (p: Product) => {
    setSelectedProduct(p);
    setCountedQty(String(p.stock));
    setReason(REASONS[0]);
    setCountedBy(state.session.user.name);
    setNote("");
    setCountErrors({});
    setCountDialogOpen(true);
  };

  const handleCountSubmit = () => {
    if (!selectedProduct) return false;

    const num = Number(countedQty);
    if (isNaN(num) || num < 0 || countedQty.trim() === "") {
      setCountErrors({ countedQty: "กรุณาระบุจำนวนที่นับได้จริง (ตัวเลขตั้งแต่ 0 ขึ้นไป)" });
      return false;
    }
    if (!countedBy.trim()) {
      setCountErrors({ countedBy: "กรุณาระบุชื่อผู้ตรวจนับ" });
      return false;
    }

    const rec = actions.recordStockCount({
      productId: selectedProduct.id,
      countedStock: num,
      reason,
      countedBy,
      note,
    });

    const diff = rec.diff;
    const diffText = diff > 0 ? `+${diff}` : `${diff}`;
    toast.success("บันทึกผลการนับสต็อกสำเร็จ", {
      description: `ปรับสต็อก ${selectedProduct.name} เป็น ${num} ${selectedProduct.unit} (ผลต่าง ${diffText})`,
    });
    return true;
  };

  const handleSendLowStockAlert = () => {
    if (reorderProducts.length === 0) {
      toast.info("ไม่มีสินค้าถึงจุดสั่งซื้อ", {
        description: "สต็อกสินค้าทุกรายการยังคงอยู่ในเกณฑ์ปลอดภัย",
      });
      return;
    }
    const notif = actions.sendLowStockToPurchasing(notifyNote);
    if (notif) {
      toast.success("แจ้งเตือนฝ่ายจัดซื้อเรียบร้อยแล้ว", {
        description: `ส่งรายการสินค้าถึงจุดสั่งซื้อจำนวน ${notif.itemCount} รายการไปยังแผนกจัดซื้อ`,
      });
      setNotifyDialogOpen(false);
      setNotifyNote("");
    }
  };

  // Products filtered by active tab
  const tabFilteredProducts = useMemo(() => {
    if (activeTab === "reorder") {
      return state.catalog.products.filter((p) => p.stock <= (p.reorderPoint ?? 10));
    }
    if (activeTab === "out") {
      return state.catalog.products.filter((p) => p.stock === 0);
    }
    return state.catalog.products;
  }, [state.catalog.products, activeTab]);

  const stockColumns: DataTableColumn<Product>[] = [
    {
      key: "sku",
      header: "รหัส / บาร์โค้ด",
      cell: (p) => (
        <div className="space-y-0.5">
          <Badge variant="outline" className="font-mono text-xs font-semibold">
            {p.sku}
          </Badge>
          <p className="font-mono text-[11px] text-muted-foreground">{p.barcode}</p>
        </div>
      ),
      sortValue: (p) => p.sku,
      className: "w-36",
    },
    {
      key: "name",
      header: "ชื่อสินค้า",
      cell: (p) => (
        <div className="flex items-center gap-2.5">
          <span className="text-xl shrink-0 select-none">{p.emoji || "📦"}</span>
          <div className="max-w-xs">
            <span className="font-medium text-foreground line-clamp-1">{p.name}</span>
            <span className="text-xs text-muted-foreground">{p.category}</span>
          </div>
        </div>
      ),
      sortValue: (p) => p.name,
    },
    {
      key: "warehouse",
      header: "โกดังที่จัดเก็บ",
      cell: (p) => {
        const wh = selectWarehouseForCategory(state, p.category);
        return (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Building2 className="size-3.5 shrink-0 text-sun-600" />
            <span className="font-medium text-foreground">{wh?.name ?? "ไม่ระบุ"}</span>
          </div>
        );
      },
      sortValue: (p) => selectWarehouseForCategory(state, p.category)?.name ?? "",
      className: "w-44",
    },
    {
      key: "stock",
      header: "สต็อก / จุดสั่งซื้อ",
      align: "right",
      cell: (p) => {
        const rp = p.reorderPoint ?? 10;
        const isBelow = p.stock <= rp;
        return (
          <div className="text-right">
            <span
              className={cn(
                "text-base font-bold",
                p.stock === 0 ? "text-danger" : isBelow ? "text-amber-600" : "text-foreground",
              )}
            >
              {formatNumber(p.stock)}
            </span>
            <span className="text-xs text-muted-foreground"> / {rp} {p.unit}</span>
          </div>
        );
      },
      sortValue: (p) => p.stock,
      className: "w-32",
    },
    {
      key: "stockBar",
      header: "ระดับสต็อก (Visual Stock Bar)",
      cell: (p) => {
        const rp = p.reorderPoint ?? 10;
        const maxThreshold = Math.max(rp * 2.5, 30);
        const percent = Math.min(100, Math.round((p.stock / maxThreshold) * 100));
        const isZero = p.stock === 0;
        const isBelow = p.stock <= rp;

        return (
          <div className="w-full min-w-36 space-y-1">
            <div className="flex justify-between text-[11px]">
              <span
                className={cn(
                  "font-medium",
                  isZero ? "text-danger" : isBelow ? "text-amber-700" : "text-muted-foreground",
                )}
              >
                {isZero ? "สินค้าหมด (0%)" : isBelow ? "ต่ำกว่าเกณฑ์" : "สต็อกเพียงพอ"}
              </span>
              <span className="num font-mono text-muted-foreground">{percent}%</span>
            </div>
            {/* Visual Bar */}
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-300",
                  isZero
                    ? "bg-danger"
                    : isBelow
                    ? "bg-amber-500"
                    : "bg-emerald-500",
                )}
                style={{ width: `${Math.max(percent, isZero ? 0 : 6)}%` }}
              />
            </div>
          </div>
        );
      },
      className: "w-48",
    },
    {
      key: "status",
      header: "สถานะ",
      align: "center",
      cell: (p) => {
        const rp = p.reorderPoint ?? 10;
        if (p.stock === 0) {
          return <StatusBadge status="สินค้าหมด" tone="red" />;
        }
        if (p.stock <= rp) {
          return <StatusBadge status="ถึงจุดสั่งซื้อ" tone="amber" />;
        }
        return <StatusBadge status="ปกติ" tone="green" />;
      },
      sortValue: (p) => (p.stock === 0 ? 0 : p.stock <= (p.reorderPoint ?? 10) ? 1 : 2),
      className: "w-32",
    },
    {
      key: "actions",
      header: "จัดการ",
      align: "center",
      cell: (p) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => openCountDialog(p)}
          className="h-8 gap-1.5 text-xs text-foreground hover:bg-sun-50 hover:text-sun-800"
        >
          <ClipboardCheck className="size-3.5 text-sun-600" />
          <span>นับสต็อก</span>
        </Button>
      ),
      className: "w-28",
    },
  ];

  const stockFilters: DataTableFilter<Product>[] = [
    {
      key: "warehouseId",
      label: "โกดังจัดเก็บ",
      options: state.warehouses.map((w) => ({ label: w.name, value: w.id })),
      predicate: (p, v) => {
        const wh = selectWarehouseForCategory(state, p.category);
        return wh?.id === v;
      },
    },
    {
      key: "stockLevel",
      label: "ระดับสต็อก",
      options: [
        { label: "ถึงจุดสั่งซื้อ (ต้องเติม)", value: "low" },
        { label: "สินค้าหมดสต็อก (0 ชิ้น)", value: "out" },
        { label: "สต็อกปกติ", value: "normal" },
      ],
      predicate: (p, v) => {
        const rp = p.reorderPoint ?? 10;
        if (v === "out") return p.stock === 0;
        if (v === "low") return p.stock <= rp;
        if (v === "normal") return p.stock > rp;
        return true;
      },
    },
  ];

  const historyColumns: DataTableColumn<StockAdjustment>[] = [
    {
      key: "createdAt",
      header: "วัน-เวลาที่ตรวจนับ",
      cell: (a) => (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="size-3.5" />
          <ClientTime iso={a.createdAt} />
        </div>
      ),
      sortValue: (a) => a.createdAt,
      className: "w-44",
    },
    {
      key: "product",
      header: "สินค้า",
      cell: (a) => (
        <div>
          <span className="font-medium text-foreground">{a.productName}</span>
          <p className="font-mono text-[11px] text-muted-foreground">{a.sku}</p>
        </div>
      ),
      sortValue: (a) => a.productName,
    },
    {
      key: "warehouse",
      header: "โกดัง",
      cell: (a) => (
        <Badge variant="outline" className="text-xs">
          {a.warehouseName}
        </Badge>
      ),
      className: "w-40",
    },
    {
      key: "prevStock",
      header: "สต็อกเดิม",
      align: "right",
      cell: (a) => <span className="font-mono text-xs">{formatNumber(a.previousStock)}</span>,
      className: "w-24",
    },
    {
      key: "countedStock",
      header: "ยอดนับจริง",
      align: "right",
      cell: (a) => (
        <span className="font-mono text-xs font-semibold text-foreground">
          {formatNumber(a.countedStock)}
        </span>
      ),
      className: "w-24",
    },
    {
      key: "diff",
      header: "ผลต่าง",
      align: "center",
      cell: (a) => {
        if (a.diff === 0) {
          return (
            <Badge variant="outline" className="font-mono text-xs text-muted-foreground">
              0
            </Badge>
          );
        }
        if (a.diff > 0) {
          return (
            <Badge variant="outline" className="font-mono text-xs border-emerald-300 bg-emerald-50 text-emerald-800">
              +{a.diff}
            </Badge>
          );
        }
        return (
          <Badge variant="outline" className="font-mono text-xs border-red-300 bg-red-50 text-red-800">
            {a.diff}
          </Badge>
        );
      },
      sortValue: (a) => a.diff,
      className: "w-24",
    },
    {
      key: "reason",
      header: "เหตุผล / หมายเหตุ",
      cell: (a) => (
        <div className="max-w-xs space-y-0.5 text-xs">
          <span className="font-medium text-foreground">{a.reason}</span>
          {a.note && <p className="text-muted-foreground line-clamp-1">{a.note}</p>}
        </div>
      ),
    },
    {
      key: "countedBy",
      header: "ผู้ตรวจนับ",
      cell: (a) => (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <User className="size-3" />
          <span>{a.countedBy}</span>
        </div>
      ),
      className: "w-36",
    },
  ];

  return (
    <>
      <PageHeader
        title="ตรวจเช็คสินค้าคงคลัง"
        description="ตรวจสอบสต็อกสินค้าจริง เปรียบเทียบจุดสั่งซื้อ และบันทึกผลการตรวจนับคลัง"
        actions={
          <Button
            onClick={() => setNotifyDialogOpen(true)}
            variant={reorderProducts.length > 0 ? "default" : "outline"}
            className="gap-2"
          >
            <Send className="size-4" />
            <span>แจ้งพนักงานจัดซื้อ</span>
            {reorderProducts.length > 0 && (
              <span className="rounded-full bg-white/25 px-2 py-0.5 text-xs font-bold">
                {reorderProducts.length}
              </span>
            )}
          </Button>
        }
      />

      {/* Top Stat Summary Cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <StatCard
          icon={Boxes}
          label="รายการสินค้าทั้งหมด"
          value={`${state.catalog.products.length} รายการ`}
          tone="teal"
          hint="ครอบคลุมทั้ง 3 โกดัง"
        />
        <StatCard
          icon={AlertTriangle}
          label="สินค้าถึงจุดสั่งซื้อ"
          value={`${reorderProducts.length} รายการ`}
          tone={reorderProducts.length > 0 ? "danger" : "success"}
          hint="สต็อกต่ำกว่าเกณฑ์ความปลอดภัย"
        />
        <StatCard
          icon={PackageX}
          label="สินค้าหมดสต็อก (0 ชิ้น)"
          value={`${outOfStockProducts.length} รายการ`}
          tone={outOfStockProducts.length > 0 ? "danger" : "info"}
          hint="ต้องสั่งซื้อด่วน"
        />
        <StatCard
          icon={History}
          label="ประวัติการตรวจนับสต็อก"
          value={`${state.stockAdjustments.length} ครั้ง`}
          tone="info"
          hint="บันทึกการปรับยอดล่าสุด"
        />
      </div>

      {/* View Switch Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
        <TabsList className="h-10 rounded-md bg-card p-1 shadow-soft">
          <TabsTrigger
            value="all"
            className="h-8 gap-1.5 rounded-sm px-3 text-xs data-[state=active]:bg-sun-50 data-[state=active]:text-sun-800"
          >
            <Boxes className="size-3.5" />
            สินค้าคงคลังทั้งหมด
            <span className="rounded-full bg-muted px-1.5 py-0.2 text-[10px]">
              {state.catalog.products.length}
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="reorder"
            className="h-8 gap-1.5 rounded-sm px-3 text-xs data-[state=active]:bg-amber-100 data-[state=active]:text-amber-900"
          >
            <AlertTriangle className="size-3.5 text-amber-600" />
            ถึงจุดสั่งซื้อ
            <span className="rounded-full bg-amber-200 px-1.5 py-0.2 text-[10px] font-semibold text-amber-950">
              {reorderProducts.length}
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="h-8 gap-1.5 rounded-sm px-3 text-xs data-[state=active]:bg-sun-50 data-[state=active]:text-sun-800"
          >
            <History className="size-3.5" />
            ประวัติการตรวจนับสต็อก
            <span className="rounded-full bg-muted px-1.5 py-0.2 text-[10px]">
              {state.stockAdjustments.length}
            </span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Main Content: Stock Table or History Table */}
      {activeTab === "history" ? (
        <DataTable
          data={state.stockAdjustments}
          columns={historyColumns}
          getRowId={(a) => a.id}
          searchPlaceholder="ค้นหาประวัติการนับสต็อก ด้วยชื่อสินค้า หรือรหัส..."
          searchFn={(a, q) =>
            a.productName.toLowerCase().includes(q) ||
            a.sku.toLowerCase().includes(q) ||
            a.reason.toLowerCase().includes(q) ||
            a.countedBy.toLowerCase().includes(q)
          }
          emptyTitle="ยังไม่มีประวัติการตรวจนับสต็อก"
          emptyDescription="เมื่อพนักงานบันทึกผลการนับสต็อก รายการจะแสดงที่นี่"
        />
      ) : (
        <DataTable
          data={tabFilteredProducts}
          columns={stockColumns}
          getRowId={(p) => p.id}
          searchPlaceholder="ค้นหาชื่อสินค้า, SKU, บาร์โค้ด หรือหมวดหมู่..."
          searchFn={(p, q) =>
            p.name.toLowerCase().includes(q) ||
            p.sku.toLowerCase().includes(q) ||
            p.barcode.toLowerCase().includes(q) ||
            p.category.toLowerCase().includes(q)
          }
          filters={stockFilters}
          emptyTitle="ไม่พบรายการสินค้า"
          emptyDescription="ลองค้นหาด้วยคำค้นอื่น หรือเปลี่ยนตัวกรอง"
        />
      )}

      {/* Record Physical Count FormDialog */}
      {selectedProduct && (
        <FormDialog
          open={countDialogOpen}
          onOpenChange={setCountDialogOpen}
          title="บันทึกผลการตรวจนับสต็อกจริง"
          description={`ปรับปรุงยอดสินค้าคงเหลือของ “${selectedProduct.name}” ตามการนับจริงในคลัง`}
          submitLabel="บันทึกและปรับสต็อก"
          onSubmit={handleCountSubmit}
        >
          {/* Product Summary Card */}
          <div className="rounded-lg border bg-muted/40 p-3 text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                <span>{selectedProduct.emoji || "📦"}</span>
                <span>{selectedProduct.name}</span>
              </span>
              <Badge variant="outline" className="font-mono">
                {selectedProduct.sku}
              </Badge>
            </div>
            <div className="flex justify-between text-muted-foreground pt-1 border-t">
              <span>หมวดหมู่: {selectedProduct.category}</span>
              <span>
                โกดัง: {selectWarehouseForCategory(state, selectedProduct.category)?.name ?? "-"}
              </span>
            </div>
            <div className="flex justify-between font-medium">
              <span>สต็อกปัจจุบันในระบบ: <strong className="text-foreground">{selectedProduct.stock} {selectedProduct.unit}</strong></span>
              <span>จุดสั่งซื้อ: <strong className="text-foreground">{selectedProduct.reorderPoint ?? 10} {selectedProduct.unit}</strong></span>
            </div>
          </div>

          {/* Counted Quantity */}
          <Field
            label="จำนวนที่นับได้จริง (Counted Quantity)"
            htmlFor="count-qty"
            required
            error={countErrors.countedQty}
            hint={`หน่วยนับ: ${selectedProduct.unit}`}
          >
            <Input
              id="count-qty"
              type="number"
              min="0"
              value={countedQty}
              onChange={(e) => {
                setCountedQty(e.target.value);
                if (countErrors.countedQty) setCountErrors((s) => ({ ...s, countedQty: "" }));
              }}
              placeholder="ระบุจำนวนที่นับได้..."
              className="text-lg font-bold"
              autoFocus
            />
          </Field>

          {/* Live Calculated Difference Indicator */}
          {countedQty !== "" && !isNaN(Number(countedQty)) && (
            <div
              className={cn(
                "flex items-center justify-between rounded-md p-3 text-xs font-medium border",
                Number(countedQty) - selectedProduct.stock > 0
                  ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                  : Number(countedQty) - selectedProduct.stock < 0
                  ? "border-red-300 bg-red-50 text-red-900"
                  : "border-border bg-muted/60 text-muted-foreground",
              )}
            >
              <span>ผลต่างจากการตรวจนับ (Variance):</span>
              <span className="text-sm font-bold font-mono">
                {Number(countedQty) - selectedProduct.stock > 0
                  ? `+${Number(countedQty) - selectedProduct.stock} ${selectedProduct.unit} (สินค้าเกิน/พบของตกหล่น)`
                  : Number(countedQty) - selectedProduct.stock < 0
                  ? `${Number(countedQty) - selectedProduct.stock} ${selectedProduct.unit} (สินค้าขาดหาย/ชำรุด)`
                  : `0 ${selectedProduct.unit} (ตรงกับยอดในระบบ)`}
              </span>
            </div>
          )}

          {/* Reason Select */}
          <Field label="เหตุผลในการปรับปรุงยอด" htmlFor="count-reason" required>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger id="count-reason">
                <SelectValue placeholder="เลือกเหตุผล..." />
              </SelectTrigger>
              <SelectContent>
                {REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {/* Counted By */}
          <Field
            label="ผู้ตรวจนับ"
            htmlFor="count-by"
            required
            error={countErrors.countedBy}
            hint="ชื่อพนักงานที่ทำการตรวจนับจริง"
          >
            <Input
              id="count-by"
              value={countedBy}
              onChange={(e) => {
                setCountedBy(e.target.value);
                if (countErrors.countedBy) setCountErrors((s) => ({ ...s, countedBy: "" }));
              }}
              placeholder="ระบุชื่อผู้ตรวจนับ..."
            />
          </Field>

          {/* Optional Note */}
          <Field label="หมายเหตุเพิ่มเติม" htmlFor="count-note">
            <Textarea
              id="count-note"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="รายละเอียดจุดที่พบ สภาพสินค้า หรือข้อสังเกต..."
            />
          </Field>
        </FormDialog>
      )}

      {/* Notify Purchasing Dialog */}
      <ConfirmDialog
        open={notifyDialogOpen}
        onOpenChange={setNotifyDialogOpen}
        tone="default"
        title="ส่งรายการแจ้งเตือนพนักงานจัดซื้อ"
        description={
          reorderProducts.length > 0 ? (
            <div className="space-y-3 pt-2 text-left">
              <p className="text-sm text-foreground">
                มีสินค้าถึงจุดสั่งซื้อทั้งหมด <strong>{reorderProducts.length} รายการ</strong> ระบบจะจัดส่งรายการนี้ไปยังแผนกจัดซื้อเพื่อเปิดใบสั่งซื้อ (PO):
              </p>
              <div className="max-h-48 overflow-y-auto rounded-md border bg-muted/30 p-2 space-y-1">
                {reorderProducts.map((p) => {
                  const rp = p.reorderPoint ?? 10;
                  return (
                    <div
                      key={p.id}
                      className="flex items-center justify-between text-xs py-1 border-b last:border-b-0"
                    >
                      <span className="font-medium text-foreground">
                        {p.emoji} {p.name}
                      </span>
                      <span className="font-mono text-muted-foreground">
                        คงเหลือ: <strong className={p.stock === 0 ? "text-danger" : "text-amber-600"}>{p.stock}</strong>/{rp} {p.unit}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div>
                <label className="text-xs font-medium text-foreground block mb-1">
                  ข้อความ / หมายเหตุถึงฝ่ายจัดซื้อ (ไม่บังคับ):
                </label>
                <Input
                  value={notifyNote}
                  onChange={(e) => setNotifyNote(e.target.value)}
                  placeholder="เช่น สินค้าบางรายการใกล้หมดด่วน ขอให้เร่งเปิด PO สัปดาห์นี้"
                />
              </div>
            </div>
          ) : (
            "ขณะนี้ไม่มีสินค้าที่สต็อกต่ำกว่าจุดสั่งซื้อ"
          )
        }
        confirmLabel={reorderProducts.length > 0 ? "ยืนยันส่งข้อมูล" : "ตกลง"}
        onConfirm={() => {
          if (reorderProducts.length > 0) {
            handleSendLowStockAlert();
          } else {
            setNotifyDialogOpen(false);
          }
        }}
      />
    </>
  );
}
