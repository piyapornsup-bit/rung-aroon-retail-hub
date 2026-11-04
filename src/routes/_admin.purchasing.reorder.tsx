import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Boxes,
  Check,
  CheckSquare,
  FileText,
  Package,
  Plus,
  ShoppingCart,
  Square,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { FormDialog, Field } from "@/components/admin/FormDialog";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { StatCard } from "@/components/admin/StatCard";
import { Money } from "@/components/admin/Money";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatNumber, formatShortDate } from "@/lib/format";
import { useStore, selectReorderPointProducts, selectWarehouseForCategory } from "@/lib/store";
import type { Product, PurchaseRequisition } from "@/lib/mock-data";

export const Route = createFileRoute("/_admin/purchasing/reorder")({
  head: () => ({
    meta: [
      { title: "สินค้าถึงจุดสั่งซื้อ — ร้านรุ่งอรุณ มินิมาร์ท" },
      { name: "description", content: "รายการสินค้าถึงจุดสั่งซื้อจากการแจ้งเตือนของฝ่ายคลัง และสินค้าสั่งซื้อล่วงหน้า" },
      { property: "og:title", content: "สินค้าถึงจุดสั่งซื้อ — ร้านรุ่งอรุณ มินิมาร์ท" },
      { property: "og:description", content: "รายการสินค้าถึงจุดสั่งซื้อจากการแจ้งเตือนของฝ่ายคลัง และสินค้าสั่งซื้อล่วงหน้า" },
    ],
  }),
  component: ReorderPage,
});

interface ReorderItem {
  id: string;
  productId: string;
  sku: string;
  name: string;
  category: string;
  warehouseName: string;
  currentStock: number;
  reorderPoint: number;
  suggestedQty: number;
  estimatedCost: number;
  source: "warehouse_alert" | "stock_threshold" | "manual";
  reason?: string;
}

function ReorderPage() {
  const { state, actions } = useStore();
  const navigate = useNavigate();

  // Selected item IDs for PR generation
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Manual Add Dialog State
  const [manualOpen, setManualOpen] = useState(false);
  const [manualProductId, setManualProductId] = useState("");
  const [manualQty, setManualQty] = useState("20");
  const [manualReason, setManualReason] = useState("");

  // In-memory manually added items
  const [manualItems, setManualItems] = useState<ReorderItem[]>([]);

  // Create PR from Reorder Dialog State
  const [createPROpen, setCreatePROpen] = useState(false);
  const [targetCompanyId, setTargetCompanyId] = useState("");
  const [targetAgentId, setTargetAgentId] = useState("");
  const [targetQuotationId, setTargetQuotationId] = useState("");
  const [prReason, setPrReason] = useState("สั่งซื้อสินค้าที่ถึงจุดสั่งซื้อและสินค้าเติมสต็อกตามเกณฑ์คลังสินค้า");

  // Collect items reaching reorder point from current catalog & warehouse notifications
  const reorderList: ReorderItem[] = useMemo(() => {
    const list: ReorderItem[] = [];
    const seenProductIds = new Set<string>();

    // 1. Items from warehouse low stock notifications
    for (const notif of state.lowStockNotifications) {
      for (const item of notif.items) {
        if (!seenProductIds.has(item.productId)) {
          seenProductIds.add(item.productId);
          const p = state.catalog.products.find((prod) => prod.id === item.productId);
          list.push({
            id: `item-${item.productId}`,
            productId: item.productId,
            sku: item.sku,
            name: item.name,
            category: item.category,
            warehouseName: item.warehouseName,
            currentStock: p ? p.stock : item.currentStock,
            reorderPoint: item.reorderPoint,
            suggestedQty: item.suggestedQty,
            estimatedCost: p ? Math.round(p.price * 0.7) : 50,
            source: "warehouse_alert",
            reason: notif.note,
          });
        }
      }
    }

    // 2. Any additional products currently at or below reorder point in store
    const lowStockProds = selectReorderPointProducts(state);
    for (const p of lowStockProds) {
      if (!seenProductIds.has(p.id)) {
        seenProductIds.add(p.id);
        const wh = selectWarehouseForCategory(state, p.category);
        const rp = p.reorderPoint ?? 10;
        const suggested = Math.max(20, (rp - p.stock) * 2);
        list.push({
          id: `item-${p.id}`,
          productId: p.id,
          sku: p.sku,
          name: p.name,
          category: p.category,
          warehouseName: wh ? wh.name : "โกดังหลัก (หลังร้าน)",
          currentStock: p.stock,
          reorderPoint: rp,
          suggestedQty: suggested,
          estimatedCost: Math.round(p.price * 0.7),
          source: "stock_threshold",
          reason: "สต็อกลดลงถึงจุดสั่งซื้ออัตโนมัติ",
        });
      }
    }

    // 3. Manually added items (not yet at reorder point)
    for (const m of manualItems) {
      if (!seenProductIds.has(m.productId)) {
        seenProductIds.add(m.productId);
        list.push(m);
      }
    }

    return list;
  }, [state, manualItems]);

  // Select all or toggle single
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const selectAll = () => {
    if (selectedIds.length === reorderList.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(reorderList.map((i) => i.id));
    }
  };

  // Manual Add Handler
  const openManualAdd = () => {
    // Find products that are NOT already in reorder list
    const existing = new Set(reorderList.map((r) => r.productId));
    const available = state.catalog.products.filter((p) => !existing.has(p.id));
    if (available.length > 0) {
      setManualProductId(available[0].id);
    } else {
      setManualProductId("");
    }
    setManualQty("24");
    setManualReason("เตรียมสต็อกล่วงหน้าสำหรับโปรโมชัน");
    setManualOpen(true);
  };

  const handleSaveManualAdd = () => {
    const product = state.catalog.products.find((p) => p.id === manualProductId);
    if (!product) {
      toast.error("กรุณาเลือกสินค้า");
      return;
    }
    const qty = parseInt(manualQty) || 10;
    const wh = selectWarehouseForCategory(state, product.category);

    const newItem: ReorderItem = {
      id: `manual-${product.id}-${Date.now()}`,
      productId: product.id,
      sku: product.sku,
      name: product.name,
      category: product.category,
      warehouseName: wh ? wh.name : "โกดังหลัก (หลังร้าน)",
      currentStock: product.stock,
      reorderPoint: product.reorderPoint ?? 10,
      suggestedQty: qty,
      estimatedCost: Math.round(product.price * 0.7),
      source: "manual",
      reason: manualReason.trim() || "เพิ่มด้วยตนเองนอกเกณฑ์จุดสั่งซื้อ",
    };

    setManualItems((prev) => [newItem, ...prev]);
    setSelectedIds((prev) => [...prev, newItem.id]);
    toast.success(`เพิ่มสินค้า "${product.name}" ในรายการสั่งซื้อแล้ว`);
    setManualOpen(false);
  };

  // Open PR Creator
  const openCreatePRDialog = () => {
    const itemsToOrder =
      selectedIds.length > 0
        ? reorderList.filter((i) => selectedIds.includes(i.id))
        : reorderList;

    if (itemsToOrder.length === 0) {
      toast.error("ไม่มีรายการสินค้าให้สร้างใบเสนอซื้อ");
      return;
    }

    const defaultComp = state.supplierCompanies[0];
    setTargetCompanyId(defaultComp?.id ?? "");
    const primaryAgent = state.supplierAgents.find((a) => a.companyId === defaultComp?.id && a.isPrimary);
    const anyAgent = state.supplierAgents.find((a) => a.companyId === defaultComp?.id);
    setTargetAgentId(primaryAgent?.id ?? anyAgent?.id ?? "");

    const activeQuote = state.quotations.find((q) => q.companyId === defaultComp?.id && q.status === "ใช้งานอยู่");
    setTargetQuotationId(activeQuote?.id ?? "");

    setPrReason("สั่งซื้อสินค้าที่ถึงจุดสั่งซื้อและสินค้าเติมสต็อกตามเกณฑ์คลังสินค้า");
    setCreatePROpen(true);
  };

  const handleTargetCompanyChange = (cId: string) => {
    setTargetCompanyId(cId);
    const primaryAgent = state.supplierAgents.find((a) => a.companyId === cId && a.isPrimary);
    const anyAgent = state.supplierAgents.find((a) => a.companyId === cId);
    setTargetAgentId(primaryAgent?.id ?? anyAgent?.id ?? "");

    const activeQuote = state.quotations.find((q) => q.companyId === cId && q.status === "ใช้งานอยู่");
    setTargetQuotationId(activeQuote?.id ?? "");
  };

  const handleGeneratePR = () => {
    const company = state.supplierCompanies.find((c) => c.id === targetCompanyId);
    const agent = state.supplierAgents.find((a) => a.id === targetAgentId);
    if (!company || !agent) {
      toast.error("กรุณาระบุบริษัทและตัวแทนจำหน่าย");
      return;
    }

    const itemsToOrder =
      selectedIds.length > 0
        ? reorderList.filter((i) => selectedIds.includes(i.id))
        : reorderList;

    const quotation = state.quotations.find((q) => q.id === targetQuotationId);

    const prLines = itemsToOrder.map((item) => {
      // Find unit price from referenced quotation or fallback to estimated cost
      const quoteItem = quotation?.items.find((qi) => qi.productId === item.productId);
      const unitPrice = quoteItem ? quoteItem.unitPrice : item.estimatedCost;
      const total = unitPrice * item.suggestedQty;
      const p = state.catalog.products.find((prod) => prod.id === item.productId);

      return {
        productId: item.productId,
        sku: item.sku,
        name: item.name,
        unit: p?.unit ?? "ชิ้น",
        qty: item.suggestedQty,
        unitPrice,
        total,
      };
    });

    const totalAmount = prLines.reduce((sum, l) => sum + l.total, 0);

    const newPR = actions.addPurchaseRequisition({
      companyId: company.id,
      companyName: company.name,
      agentId: agent.id,
      agentName: agent.name,
      quotationId: quotation?.id,
      quotationNumber: quotation?.quotationNumber,
      reason: prReason.trim() || "สั่งซื้อเติมสต็อกสินค้าถึงจุดสั่งซื้อ",
      lines: prLines,
      totalAmount,
    });

    toast.success(`สร้างใบเสนอซื้อ ${newPR.prNumber} สำเร็จ`);
    setCreatePROpen(false);
    navigate({ to: "/purchasing/requisitions" });
  };

  // Metrics
  const zeroStockCount = reorderList.filter((i) => i.currentStock === 0).length;
  const belowThresholdCount = reorderList.filter((i) => i.currentStock > 0 && i.currentStock <= i.reorderPoint).length;
  const manualCount = reorderList.filter((i) => i.source === "manual").length;

  const columns: DataTableColumn<ReorderItem>[] = [
    {
      id: "select",
      header: (
        <button
          type="button"
          onClick={selectAll}
          className="text-muted-foreground hover:text-foreground p-1"
          title="เลือกทั้งหมด"
        >
          {selectedIds.length === reorderList.length && reorderList.length > 0 ? (
            <CheckSquare className="size-4 text-sun-600" />
          ) : (
            <Square className="size-4" />
          )}
        </button>
      ),
      accessor: (item) => {
        const isChecked = selectedIds.includes(item.id);
        return (
          <button
            type="button"
            onClick={() => toggleSelect(item.id)}
            className="p-1 text-muted-foreground hover:text-foreground"
          >
            {isChecked ? (
              <CheckSquare className="size-4 text-sun-600" />
            ) : (
              <Square className="size-4" />
            )}
          </button>
        );
      },
      className: "w-10",
    },
    {
      id: "product",
      header: "รหัส / สินค้า",
      accessor: (item) => {
        const p = state.catalog.products.find((prod) => prod.id === item.productId);
        return (
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-md bg-muted text-base">
              {p?.emoji ?? "📦"}
            </span>
            <div>
              <div className="font-medium text-foreground">{item.name}</div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="font-mono">{item.sku}</span>
                <span>·</span>
                <span>{item.category}</span>
              </div>
            </div>
          </div>
        );
      },
      className: "min-w-[220px]",
    },
    {
      id: "warehouse",
      header: "โกดังจัดเก็บ",
      accessor: (item) => (
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Boxes className="size-3" />
          {item.warehouseName}
        </span>
      ),
    },
    {
      id: "stock",
      header: "สต็อกปัจจุบัน",
      accessor: (item) => (
        <div className="space-y-0.5">
          <span
            className={`font-semibold text-xs ${
              item.currentStock === 0 ? "text-danger" : "text-amber-600"
            }`}
          >
            {item.currentStock} ชิ้น
          </span>
          <div className="text-[11px] text-muted-foreground">
            จุดสั่งซื้อ: {item.reorderPoint} ชิ้น
          </div>
        </div>
      ),
      className: "w-28",
    },
    {
      id: "suggested",
      header: "แนะนำสั่งซื้อ",
      accessor: (item) => (
        <span className="font-bold text-xs text-foreground bg-muted/60 px-2 py-0.5 rounded">
          +{item.suggestedQty} ชิ้น
        </span>
      ),
      className: "w-28 text-center",
    },
    {
      id: "status",
      header: "สถานะ",
      accessor: (item) => {
        if (item.currentStock === 0) {
          return <StatusBadge status="สินค้าหมด" tone="red" />;
        }
        if (item.source === "manual") {
          return <StatusBadge status="เพิ่มด้วยตนเอง" tone="blue" />;
        }
        return <StatusBadge status="ถึงจุดสั่งซื้อ" tone="amber" />;
      },
      className: "w-32",
    },
    {
      id: "cost",
      header: "ราคาประมาณ",
      align: "right",
      accessor: (item) => (
        <div className="text-right">
          <span className="font-medium text-xs text-foreground">
            ฿{item.estimatedCost}/ชิ้น
          </span>
          <div className="text-[11px] text-muted-foreground">
            รวม ~฿{(item.estimatedCost * item.suggestedQty).toLocaleString()}
          </div>
        </div>
      ),
      className: "w-32",
    },
  ];

  return (
    <>
      <PageHeader
        title="สินค้าถึงจุดสั่งซื้อ"
        description="รายการสินค้าที่สต็อกลดลงถึงเกณฑ์ ส่งต่อจากการตรวจเช็คคลังสินค้า และรายการสั่งซื้อล่วงหน้า"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={openManualAdd} className="gap-1.5 shadow-xs">
              <Plus className="size-4" />
              <span>เพิ่มสินค้านอกเกณฑ์</span>
            </Button>
            <Button onClick={openCreatePRDialog} className="gap-2 shadow-xs">
              <FileText className="size-4" />
              <span>สร้างใบเสนอซื้อ (PR)</span>
              {selectedIds.length > 0 && (
                <span className="rounded-full bg-white/20 px-1.5 py-0.2 text-[11px] font-bold">
                  {selectedIds.length}
                </span>
              )}
            </Button>
          </div>
        }
      />

      {/* Warehouse Alert Notification Banner */}
      {state.lowStockNotifications.length > 0 && (
        <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50/70 p-3.5 flex items-start gap-3">
          <Bell className="size-5 text-amber-700 mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 font-semibold text-xs text-amber-900">
              <span>การแจ้งเตือนจากฝ่ายคลังสินค้า ({state.lowStockNotifications[0].sentBy})</span>
              <span className="text-amber-700/70 font-normal">
                · {formatShortDate(state.lowStockNotifications[0].createdAt)}
              </span>
            </div>
            <div className="text-xs text-amber-800 mt-0.5">
              {state.lowStockNotifications[0].note || "ตรวจพบคลังสินค้ามีรายการถึงจุดสั่งซื้อวิกฤต ขอให้เร่งเปิดใบเสนอซื้อ"}
            </div>
          </div>
        </div>
      )}

      {/* Metrics */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={AlertTriangle}
          label="สินค้าหมดสต็อก (วิกฤต)"
          value={formatNumber(zeroStockCount)}
          tone="danger"
          hint="สต็อกคงเหลือ 0 ชิ้น ต้องสั่งด่วน"
        />
        <StatCard
          icon={Boxes}
          label="สินค้าถึงจุดสั่งซื้อ"
          value={formatNumber(belowThresholdCount)}
          tone="warning"
          hint="สต็อกน้อยกว่าหรือเท่ากับเกณฑ์"
        />
        <StatCard
          icon={ShoppingCart}
          label="เพิ่มด้วยตนเองนอกเกณฑ์"
          value={formatNumber(manualCount)}
          tone="info"
          hint="เตรียมแคมเปญ / สั่งซื้อล่วงหน้า"
        />
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={reorderList}
        searchKey="name"
        searchPlaceholder="ค้นหาชื่อสินค้า, SKU, หรือหมวดหมู่..."
        emptyMessage="ไม่มีสินค้าที่ถึงจุดสั่งซื้อในขณะนี้"
      />

      {/* Dialog: Manual Add Product Not At Reorder Point */}
      <FormDialog
        open={manualOpen}
        onOpenChange={setManualOpen}
        title="เพิ่มสินค้านอกเกณฑ์ด้วยตนเอง"
        description="เลือกสินค้าที่สต็อกยังไม่ถึงจุดสั่งซื้อ เพื่อนำเข้ามาเตรียมออกใบเสนอซื้อล่วงหน้า"
        confirmLabel="เพิ่มเข้ารายการสั่งซื้อ"
        onConfirm={handleSaveManualAdd}
      >
        <div className="space-y-3.5">
          <Field label="เลือกสินค้าที่ต้องการสั่งซื้อเพิ่ม">
            <Select value={manualProductId} onValueChange={setManualProductId}>
              <SelectTrigger>
                <SelectValue placeholder="เลือกสินค้า" />
              </SelectTrigger>
              <SelectContent>
                {state.catalog.products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.sku} — {p.name} (สต็อกปัจจุบัน: {p.stock} {p.unit})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="จำนวนที่ต้องการสั่งซื้อ">
            <Input
              type="number"
              min={1}
              value={manualQty}
              onChange={(e) => setManualQty(e.target.value)}
              placeholder="20"
            />
          </Field>

          <Field label="เหตุผลในการสั่งซื้อล่วงหน้า">
            <Textarea
              rows={2}
              value={manualReason}
              onChange={(e) => setManualReason(e.target.value)}
              placeholder="เช่น เตรียมรับเทศกาลปีใหม่, สินค้าขายดีผิดปกติ, รับโปรโมชันราคาพิเศษ"
            />
          </Field>
        </div>
      </FormDialog>

      {/* Dialog: Create PR from Reorder Items */}
      <FormDialog
        open={createPROpen}
        onOpenChange={setCreatePROpen}
        title="สร้างใบเสนอซื้อ (PR) จากรายการที่เลือก"
        description="ส่งต่อรายการสินค้าที่ถึงจุดสั่งซื้อเข้าสู่กระบวนการขออนุมัติจากผู้จัดการร้าน"
        confirmLabel="สร้างใบเสนอซื้อทันที"
        onConfirm={handleGeneratePR}
      >
        <div className="space-y-4">
          <div className="rounded-lg border bg-sun-50/50 p-3 text-xs text-sun-900">
            <div className="font-semibold mb-1">
              รายการที่เลือกสั่งซื้อ:{" "}
              {selectedIds.length > 0 ? selectedIds.length : reorderList.length} รายการ
            </div>
            <div className="text-muted-foreground truncate">
              {(selectedIds.length > 0
                ? reorderList.filter((i) => selectedIds.includes(i.id))
                : reorderList
              )
                .map((i) => `${i.name} (+${i.suggestedQty})`)
                .join(", ")}
            </div>
          </div>

          <Field label="บริษัทคู่ค้า (ซัพพลายเออร์)" required>
            <Select value={targetCompanyId} onValueChange={handleTargetCompanyChange}>
              <SelectTrigger>
                <SelectValue placeholder="เลือกบริษัทคู่ค้า" />
              </SelectTrigger>
              <SelectContent>
                {state.supplierCompanies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="ตัวแทนจำหน่ายที่รับผิดชอบ" required>
            <Select value={targetAgentId} onValueChange={setTargetAgentId}>
              <SelectTrigger>
                <SelectValue placeholder="เลือกตัวแทนจำหน่าย" />
              </SelectTrigger>
              <SelectContent>
                {state.supplierAgents
                  .filter((a) => a.companyId === targetCompanyId)
                  .map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name} ({a.position}) — {a.phone}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="อ้างอิงใบเสนอราคา (ถ้ามี)">
            <Select value={targetQuotationId} onValueChange={setTargetQuotationId}>
              <SelectTrigger>
                <SelectValue placeholder="เลือกใบเสนอราคาเพื่อดึงราคาต่อหน่วย" />
              </SelectTrigger>
              <SelectContent>
                {state.quotations
                  .filter((q) => q.companyId === targetCompanyId)
                  .map((q) => (
                    <SelectItem key={q.id} value={q.id}>
                      {q.quotationNumber} — {q.title}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="เหตุผลความจำเป็นในการสั่งซื้อ">
            <Textarea
              rows={2}
              value={prReason}
              onChange={(e) => setPrReason(e.target.value)}
              placeholder="ระบุเหตุผลความจำเป็นเพื่อให้ผู้จัดการพิจารณาอนุมัติ"
            />
          </Field>
        </div>
      </FormDialog>
    </>
  );
}

