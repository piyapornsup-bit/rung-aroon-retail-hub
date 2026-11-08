import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  FileCheck,
  FileText,
  Plus,
  Printer,
  ShoppingCart,
  Trash2,
  User,
  Users,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { FormDialog, Field } from "@/components/admin/FormDialog";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { StatCard } from "@/components/admin/StatCard";
import { Money } from "@/components/admin/Money";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatNumber, formatShortDate } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { PurchaseRequisition, PurchaseRequisitionLine, PRStatus } from "@/lib/mock-data";

export const Route = createFileRoute("/_admin/purchasing/requisitions")({
  head: () => ({
    meta: [
      { title: "ใบเสนอซื้อ (PR) — ร้านรุ่งอรุณ มินิมาร์ท" },
      { name: "description", content: "จัดการใบเสนอซื้อเพื่อรอการอนุมัติจากผู้จัดการร้าน" },
      { property: "og:title", content: "ใบเสนอซื้อ (PR) — ร้านรุ่งอรุณ มินิมาร์ท" },
      { property: "og:description", content: "จัดการใบเสนอซื้อเพื่อรอการอนุมัติจากผู้จัดการร้าน" },
    ],
  }),
  component: RequisitionsPage,
});

interface PRLineDraft {
  productId: string;
  sku: string;
  name: string;
  unit: string;
  qty: number;
  unitPrice: number;
  total: number;
}

function RequisitionsPage() {
  const { state, actions } = useStore();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [detailPR, setDetailPR] = useState<PurchaseRequisition | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PurchaseRequisition | null>(null);

  // Form State
  const [companyId, setCompanyId] = useState("");
  const [agentId, setAgentId] = useState("");
  const [quotationId, setQuotationId] = useState("");
  const [reason, setReason] = useState("");
  const [lines, setLines] = useState<PRLineDraft[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Line adder temp state
  const [itemProductId, setItemProductId] = useState("");
  const [itemQty, setItemQty] = useState("20");
  const [itemPrice, setItemPrice] = useState("");

  // Rejection dialog
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  // Convert to PO Dialog
  const [convertOpen, setConvertOpen] = useState(false);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(state.warehouses[0]?.id ?? "WH-01");

  // Filter agents and quotations by selected company
  const companyAgents = useMemo(() => {
    if (!companyId) return [];
    return state.supplierAgents.filter((a) => a.companyId === companyId);
  }, [companyId, state.supplierAgents]);

  const companyQuotations = useMemo(() => {
    if (!companyId) return [];
    return state.quotations.filter((q) => q.companyId === companyId && q.status === "ใช้งานอยู่");
  }, [companyId, state.quotations]);

  const openCreateDialog = () => {
    const defaultComp = state.supplierCompanies[0];
    setCompanyId(defaultComp?.id ?? "");
    const primaryAgent = state.supplierAgents.find((a) => a.companyId === defaultComp?.id && a.isPrimary);
    const anyAgent = state.supplierAgents.find((a) => a.companyId === defaultComp?.id);
    setAgentId(primaryAgent?.id ?? anyAgent?.id ?? "");

    const activeQuote = state.quotations.find((q) => q.companyId === defaultComp?.id && q.status === "ใช้งานอยู่");
    setQuotationId(activeQuote?.id ?? "");
    setReason("สั่งซื้อสินค้าเติมสต็อกตามรอบการขายปกติ");
    setLines([]);
    setErrors({});
    setItemProductId("");
    setItemQty("20");
    setItemPrice("");
    setCreateOpen(true);
  };

  const handleCompanyChange = (cId: string) => {
    setCompanyId(cId);
    const primaryAgent = state.supplierAgents.find((a) => a.companyId === cId && a.isPrimary);
    const anyAgent = state.supplierAgents.find((a) => a.companyId === cId);
    setAgentId(primaryAgent?.id ?? anyAgent?.id ?? "");

    const activeQuote = state.quotations.find((q) => q.companyId === cId && q.status === "ใช้งานอยู่");
    setQuotationId(activeQuote?.id ?? "");
    setLines([]);
  };

  const handleProductSelect = (pId: string) => {
    setItemProductId(pId);
    const product = state.catalog.products.find((p) => p.id === pId);
    if (!product) return;

    // Check if quotation has price for this product
    const quotation = state.quotations.find((q) => q.id === quotationId);
    const quoteItem = quotation?.items.find((qi) => qi.productId === pId);
    if (quoteItem) {
      setItemPrice(quoteItem.unitPrice.toString());
    } else {
      // Fallback estimated cost
      setItemPrice(Math.round(product.price * 0.7).toString());
    }
  };

  const handleAddLine = () => {
    if (!itemProductId) {
      toast.error("กรุณาเลือกสินค้า");
      return;
    }
    const product = state.catalog.products.find((p) => p.id === itemProductId);
    if (!product) return;

    const qty = parseInt(itemQty) || 1;
    const price = parseFloat(itemPrice);
    if (isNaN(price) || price <= 0) {
      toast.error("กรุณาระบุราคาต่อหน่วยที่ถูกต้อง");
      return;
    }

    if (lines.some((l) => l.productId === itemProductId)) {
      toast.error("สินค้านี้อยู่ในรายการแล้ว");
      return;
    }

    setLines([
      ...lines,
      {
        productId: product.id,
        sku: product.sku,
        name: product.name,
        unit: product.unit,
        qty,
        unitPrice: price,
        total: qty * price,
      },
    ]);

    setItemProductId("");
    setItemQty("20");
    setItemPrice("");
  };

  const removeLine = (pId: string) => {
    setLines(lines.filter((l) => l.productId !== pId));
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!companyId) errs.companyId = "กรุณาเลือกบริษัทคู่ค้า";
    if (!agentId) errs.agentId = "กรุณาเลือกตัวแทนจำหน่าย";
    if (!reason.trim()) errs.reason = "กรุณากรอกเหตุผลความจำเป็นในการสั่งซื้อ";
    if (lines.length === 0) errs.lines = "กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSavePR = () => {
    if (!validate()) return false;
    const company = state.supplierCompanies.find((c) => c.id === companyId);
    const agent = state.supplierAgents.find((a) => a.id === agentId);
    if (!company || !agent) return false;

    const quotation = state.quotations.find((q) => q.id === quotationId);
    const totalAmount = lines.reduce((sum, l) => sum + l.total, 0);

    const newPR = actions.addPurchaseRequisition({
      companyId: company.id,
      companyName: company.name,
      agentId: agent.id,
      agentName: agent.name,
      quotationId: quotation?.id,
      quotationNumber: quotation?.quotationNumber,
      reason: reason.trim(),
      lines: lines.map((l) => ({ ...l })),
      totalAmount,
    });

    toast.success(`สร้างใบเสนอซื้อ ${newPR.prNumber} สำเร็จ สถานะ: รออนุมัติ`);
    setCreateOpen(false);
    return true;
  };
  const handleSubmitCreatePR = handleSavePR;
  const handleCreatePR = handleSavePR;

  // Simulation actions for manager
  const handleApprovePR = (prId: string) => {
    actions.decidePurchaseRequisition(prId, "อนุมัติ");
    toast.success("อนุมัติใบเสนอซื้อเรียบร้อยแล้ว พร้อมสำหรับออกใบสั่งซื้อ (PO)");
    if (detailPR?.id === prId) {
      setDetailPR({ ...detailPR, status: "อนุมัติ" });
    }
  };

  const handleOpenReject = (pr: PurchaseRequisition) => {
    setDetailPR(pr);
    setRejectReason("ยอดสั่งซื้อเกินงบประมาณที่กำหนด ขอให้ปรับลดยอดรายการลง");
    setRejectOpen(true);
  };

  const handleConfirmReject = () => {
    if (!detailPR) return false;
    actions.decidePurchaseRequisition(detailPR.id, "ไม่อนุมัติ", rejectReason);
    toast.error(`ไม่อนุมัติใบเสนอซื้อ ${detailPR.prNumber}`);
    setRejectOpen(false);
    setDetailPR({ ...detailPR, status: "ไม่อนุมัติ", rejectionReason: rejectReason });
    return true;
  };

  // Convert to PO
  const handleOpenConvert = (pr: PurchaseRequisition) => {
    setDetailPR(pr);
    setSelectedWarehouseId(state.warehouses[0]?.id ?? "WH-01");
    setConvertOpen(true);
  };

  const handleConfirmConvert = () => {
    if (!detailPR) return false;
    const targetWH = state.warehouses.find((w) => w.id === selectedWarehouseId);
    const whName = targetWH ? targetWH.name : "โกดังหลัก (หลังร้าน)";

    const res = actions.convertPRToPO(detailPR.id, selectedWarehouseId, whName);
    if (!res.ok) {
      toast.error(res.error ?? "ไม่สามารถแปลงเป็น PO ได้");
      return false;
    } else {
      toast.success(`แปลง ${detailPR.prNumber} เป็นใบสั่งซื้อ ${res.po?.poNumber} เรียบร้อยแล้ว`);
      setConvertOpen(false);
      navigate({ to: "/purchasing/orders" });
      return true;
    }
  };

  // Delete
  const handleDelete = () => {
    if (!deleteTarget) return;
    actions.deletePurchaseRequisition(deleteTarget.id);
    toast.success(`ลบใบเสนอซื้อ ${deleteTarget.prNumber} สำเร็จ`);
    setDeleteTarget(null);
  };

  // Filtered PR list
  const filteredPRs = useMemo(() => {
    if (activeTab === "all") return state.purchaseRequisitions;
    if (activeTab === "pending")
      return state.purchaseRequisitions.filter((p) => p.status === "รออนุมัติ" || p.status === "PENDING_APPROVAL");
    if (activeTab === "approved")
      return state.purchaseRequisitions.filter(
        (p) =>
          (p.status === "อนุมัติ" || p.status === "APPROVED") &&
          !p.poId &&
          p.status !== "แปลงเป็น PO แล้ว" &&
          p.status !== "ORDERED" &&
          p.status !== "สั่งซื้อแล้ว",
      );
    if (activeTab === "converted")
      return state.purchaseRequisitions.filter(
        (p) =>
          Boolean(p.poId) ||
          p.status === "แปลงเป็น PO แล้ว" ||
          p.status === "ORDERED" ||
          p.status === "สั่งซื้อแล้ว",
      );
    if (activeTab === "rejected")
      return state.purchaseRequisitions.filter((p) => p.status === "ไม่อนุมัติ" || p.status === "REJECTED");
    return state.purchaseRequisitions;
  }, [state.purchaseRequisitions, activeTab]);

  // Metrics
  const pendingCount = state.purchaseRequisitions.filter(
    (p) => p.status === "รออนุมัติ" || p.status === "PENDING_APPROVAL",
  ).length;
  const approvedCount = state.purchaseRequisitions.filter(
    (p) =>
      (p.status === "อนุมัติ" || p.status === "APPROVED") &&
      !p.poId &&
      p.status !== "แปลงเป็น PO แล้ว" &&
      p.status !== "ORDERED" &&
      p.status !== "สั่งซื้อแล้ว",
  ).length;
  const convertedCount = state.purchaseRequisitions.filter(
    (p) =>
      Boolean(p.poId) ||
      p.status === "แปลงเป็น PO แล้ว" ||
      p.status === "ORDERED" ||
      p.status === "สั่งซื้อแล้ว",
  ).length;

  const columns: DataTableColumn<PurchaseRequisition>[] = [
    {
      id: "code",
      header: "เลขที่ PR",
      accessor: (p) => (
        <span className="font-mono text-xs font-semibold text-sun-700">{p.prNumber}</span>
      ),
      className: "w-28",
    },
    {
      id: "date",
      header: "วันที่ขอซื้อ",
      accessor: (p) => (
        <span className="text-xs text-muted-foreground">{formatShortDate(p.requestedAt)}</span>
      ),
      className: "w-28",
    },
    {
      id: "supplier",
      header: "บริษัทคู่ค้า / ตัวแทน",
      accessor: (p) => (
        <div>
          <span className="font-medium text-foreground">{p.companyName}</span>
          <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
            <User className="size-3" />
            <span>{p.agentName}</span>
          </div>
        </div>
      ),
      className: "min-w-[200px]",
    },
    {
      id: "reason",
      header: "เหตุผลความจำเป็น",
      accessor: (p) => (
        <div className="max-w-xs truncate text-xs text-muted-foreground" title={p.reason}>
          {p.reason}
        </div>
      ),
    },
    {
      id: "amount",
      header: "ยอดเงินรวม",
      align: "right",
      accessor: (p) => (
        <span className="font-semibold text-foreground">
          <Money value={p.totalAmount} />
        </span>
      ),
      className: "w-32",
    },
    {
      id: "status",
      header: "สถานะ",
      accessor: (p) => (
        <div className="space-y-1">
          <StatusBadge status={p.status} />
          {p.poId && (
            <div className="text-[11px] font-mono text-sun-700 flex items-center gap-1 font-semibold">
              <span>PO:</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate({ to: "/purchasing/orders" });
                }}
                className="hover:underline text-sun-800"
                title="คลิกเพื่อไปดูใบสั่งซื้อ"
              >
                {p.poId}
              </button>
            </div>
          )}
        </div>
      ),
      className: "w-36",
    },
    {
      id: "actions",
      header: "การกระทำ",
      align: "right",
      accessor: (p) => {
        const canCreatePO =
          (p.status === "อนุมัติ" || p.status === "APPROVED") &&
          !p.poId &&
          p.status !== "แปลงเป็น PO แล้ว" &&
          p.status !== "ORDERED" &&
          p.status !== "สั่งซื้อแล้ว";

        return (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setDetailPR(p)}
              title="ดูเอกสารใบเสนอซื้อ"
            >
              <Eye className="size-3.5 mr-1" />
              <span>ดูเอกสาร</span>
            </Button>
            {canCreatePO && (
              <Button
                size="sm"
                className="h-8 px-2.5 text-xs bg-sun-600 hover:bg-sun-700 text-white gap-1"
                onClick={() => handleOpenConvert(p)}
                title="แปลงเป็นใบสั่งซื้อ (PO)"
              >
                <ShoppingCart className="size-3" />
                <span>สร้าง PO</span>
              </Button>
            )}
            {p.poId && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2 text-xs text-sun-700 border-sun-200 hover:bg-sun-50 gap-1"
                onClick={() => navigate({ to: "/purchasing/orders" })}
                title="ไปดูใบสั่งซื้อที่ออกแล้ว"
              >
                <ShoppingCart className="size-3" />
                <span>ดู PO</span>
              </Button>
            )}
          </div>
        );
      },
      className: "w-40",
    },
  ];

  return (
    <>
      <PageHeader
        title="ใบเสนอซื้อ (Purchase Requisition - PR)"
        description="สร้างและติดตามใบเสนอซื้อ จัดการการขออนุมัติจากผู้จัดการก่อนออกใบสั่งซื้อจริง"
        actions={
          <Button onClick={openCreateDialog} className="gap-2 shadow-xs">
            <Plus className="size-4" />
            <span>สร้างใบเสนอซื้อ</span>
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={Clock}
          label="ใบเสนอซื้อรออนุมัติ"
          value={formatNumber(pendingCount)}
          tone="warning"
          hint="ส่งถึงผู้จัดการร้านแล้ว"
        />
        <StatCard
          icon={CheckCircle2}
          label="อนุมัติแล้ว (พร้อมออก PO)"
          value={formatNumber(approvedCount)}
          tone="teal"
          hint="ผู้จัดการอนุมัติแล้ว"
        />
        <StatCard
          icon={ShoppingCart}
          label="แปลงเป็น PO แล้ว"
          value={formatNumber(convertedCount)}
          tone="info"
          hint="ออกใบสั่งซื้อเรียบร้อย"
        />
      </div>

      <div className="mb-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="all" className="text-xs">
              ทั้งหมด ({state.purchaseRequisitions.length})
            </TabsTrigger>
            <TabsTrigger value="pending" className="text-xs">
              รออนุมัติ ({pendingCount})
            </TabsTrigger>
            <TabsTrigger value="approved" className="text-xs">
              อนุมัติแล้ว ({approvedCount})
            </TabsTrigger>
            <TabsTrigger value="converted" className="text-xs">
              แปลงเป็น PO แล้ว ({convertedCount})
            </TabsTrigger>
            <TabsTrigger value="rejected" className="text-xs">
              ไม่อนุมัติ
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <DataTable
        columns={columns}
        data={filteredPRs}
        searchKey="prNumber"
        searchPlaceholder="ค้นหาเลขที่ PR, บริษัทคู่ค้า, หรือตัวแทน..."
        emptyMessage="ไม่พบข้อมูลใบเสนอซื้อในหมวดหมู่นี้"
      />

      {/* Document View Dialog */}
      <Dialog open={Boolean(detailPR)} onOpenChange={(open) => !open && setDetailPR(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b pb-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-base text-foreground">
                  ใบเสนอซื้อ (PURCHASE REQUISITION)
                </span>
                <span className="ml-2 font-mono text-xs font-semibold text-sun-700 bg-sun-50 px-2 py-0.5 rounded">
                  {detailPR?.prNumber}
                </span>
              </div>
              {detailPR && <StatusBadge status={detailPR.status} />}
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              ร้านรุ่งอรุณ มินิมาร์ท · เอกสารขอจัดซื้อภายในองค์กร
            </DialogDescription>
          </DialogHeader>

          {detailPR && (
            <div className="space-y-4 pt-2 text-xs">
              {/* Document Header Info */}
              <div className="grid grid-cols-2 gap-4 rounded-lg border bg-muted/20 p-3.5">
                <div className="space-y-1">
                  <div><span className="text-muted-foreground">ผู้จัดทำ/ขอซื้อ: </span><span className="font-semibold text-foreground">{detailPR.requestedBy}</span></div>
                  <div><span className="text-muted-foreground">วันที่สร้าง: </span><span className="text-foreground">{formatShortDate(detailPR.requestedAt)}</span></div>
                  <div><span className="text-muted-foreground">เหตุผลความจำเป็น: </span><span className="text-foreground">{detailPR.reason}</span></div>
                  {detailPR.quotationNumber && (
                    <div><span className="text-muted-foreground">อ้างอิงใบเสนอราคา: </span><span className="font-mono font-medium text-foreground">{detailPR.quotationNumber}</span></div>
                  )}
                </div>
                <div className="space-y-1">
                  <div><span className="text-muted-foreground">บริษัทคู่ค้า: </span><span className="font-semibold text-foreground">{detailPR.companyName}</span></div>
                  <div><span className="text-muted-foreground">ตัวแทนประสานงาน: </span><span className="font-medium text-foreground">{detailPR.agentName}</span></div>
                  {detailPR.approvedBy && (
                    <div className="pt-1 border-t mt-1">
                      <span className="text-muted-foreground">ผู้อนุมัติ: </span>
                      <span className="font-semibold text-green-700">{detailPR.approvedBy}</span>
                    </div>
                  )}
                  {detailPR.rejectionReason && (
                    <div className="pt-1 border-t mt-1 text-danger">
                      <span className="font-semibold">เหตุผลที่ไม่อนุมัติ: </span>
                      <span>{detailPR.rejectionReason}</span>
                    </div>
                  )}
                  {detailPR.poId && (
                    <div className="col-span-2 pt-2 border-t mt-2 flex items-center justify-between bg-sun-50/70 p-2.5 rounded border border-sun-200">
                      <div>
                        <div className="text-[11px] text-muted-foreground font-medium">
                          ใบสั่งซื้อที่ออกแล้ว (Generated PO Number)
                        </div>
                        <div className="text-sm font-bold font-mono text-sun-800">{detailPR.poId}</div>
                        {detailPR.orderedAt && (
                          <div className="text-[10px] text-muted-foreground">
                            สั่งซื้อเมื่อ: {formatShortDate(detailPR.orderedAt)}
                          </div>
                        )}
                      </div>
                      <Button
                        size="sm"
                        className="h-7 px-2.5 text-xs bg-sun-600 hover:bg-sun-700 text-white gap-1"
                        onClick={() => {
                          setDetailPR(null);
                          navigate({ to: "/purchasing/orders" });
                        }}
                      >
                        <ShoppingCart className="size-3" />
                        <span>เปิดหน้าใบสั่งซื้อ (PO)</span>
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <div>
                <h4 className="font-semibold text-foreground mb-1.5">รายการสินค้าที่เสนอซื้อ</h4>
                <div className="rounded-md border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/60 text-muted-foreground font-medium">
                      <tr>
                        <th className="py-2 px-3 text-left">ลำดับ</th>
                        <th className="py-2 px-3 text-left">รหัส / รายการสินค้า</th>
                        <th className="py-2 px-3 text-center">จำนวน</th>
                        <th className="py-2 px-3 text-right">ราคา/หน่วย</th>
                        <th className="py-2 px-3 text-right">รวมเงิน (บาท)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {detailPR.lines.map((l, i) => (
                        <tr key={i} className="hover:bg-muted/10">
                          <td className="py-2 px-3 text-muted-foreground">{i + 1}</td>
                          <td className="py-2 px-3">
                            <span className="font-mono text-muted-foreground mr-1.5">{l.sku}</span>
                            <span className="font-medium text-foreground">{l.name}</span>
                          </td>
                          <td className="py-2 px-3 text-center font-medium text-foreground">
                            {l.qty} {l.unit}
                          </td>
                          <td className="py-2 px-3 text-right text-muted-foreground">
                            ฿{l.unitPrice.toFixed(2)}
                          </td>
                          <td className="py-2 px-3 text-right font-medium text-foreground">
                            ฿{l.total.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t bg-muted/30 font-semibold text-foreground">
                      <tr>
                        <td colSpan={4} className="py-2 px-3 text-right">ยอดรวมสุทธิทั้งสิ้น:</td>
                        <td className="py-2 px-3 text-right text-sun-700 text-sm">
                          ฿{detailPR.totalAmount.toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Action Buttons in Document View */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                <div className="flex items-center gap-2">
                  {detailPR.status === "รออนุมัติ" && (
                    <>
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white gap-1 text-xs"
                        onClick={() => handleApprovePR(detailPR.id)}
                      >
                        <CheckCircle2 className="size-3.5" />
                        <span>จำลองอนุมัติ (ผู้จัดการ)</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-danger hover:bg-danger/10 gap-1 text-xs"
                        onClick={() => handleOpenReject(detailPR)}
                      >
                        <XCircle className="size-3.5" />
                        <span>จำลองไม่อนุมัติ</span>
                      </Button>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {(detailPR.status === "อนุมัติ" || detailPR.status === "APPROVED") && !detailPR.poId && (
                    <Button
                      size="sm"
                      className="bg-sun-600 hover:bg-sun-700 text-white gap-1 text-xs"
                      onClick={() => handleOpenConvert(detailPR)}
                    >
                      <ShoppingCart className="size-3.5" />
                      <span>แปลงเป็นใบสั่งซื้อ (PO)</span>
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1 text-xs">
                    <Printer className="size-3.5" />
                    <span>พิมพ์ PR</span>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Convert to PO Dialog */}
      <FormDialog
        open={convertOpen}
        onOpenChange={setConvertOpen}
        title={`ออกใบสั่งซื้อ (PO) จาก ${detailPR?.prNumber}`}
        description="สร้างใบสั่งซื้ออย่างเป็นทางการเพื่อส่งให้ตัวแทนจำหน่าย และกำหนดโกดังรับมอบสินค้า"
        submitLabel="ยืนยันการออก PO"
        onSubmit={handleConfirmConvert}
        confirmLabel="ยืนยันการออก PO"
        onConfirm={handleConfirmConvert}
      >
        <div className="space-y-3.5">
          <div className="rounded-lg border bg-sun-50/60 p-3 text-xs">
            <div className="font-semibold text-sun-900">บริษัทคู่ค้า: {detailPR?.companyName}</div>
            <div className="text-muted-foreground mt-0.5">ตัวแทน: {detailPR?.agentName} · ยอดรวม ฿{detailPR?.totalAmount.toLocaleString()}</div>
          </div>

          <Field label="โกดังปลายทางที่จัดเก็บสินค้า (นำเข้าคลัง)" required>
            <Select value={selectedWarehouseId} onValueChange={setSelectedWarehouseId}>
              <SelectTrigger>
                <SelectValue placeholder="เลือกโกดังปลายทาง" />
              </SelectTrigger>
              <SelectContent>
                {state.warehouses.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name} — {w.location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
      </FormDialog>

      {/* Reject Reason Dialog */}
      <FormDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        title="ระบุเหตุผลที่ไม่อนุมัติใบเสนอซื้อ"
        description="ข้อความเหตุผลจะถูกบันทึกลงในเอกสาร PR เพื่อให้พนักงานจัดซื้อนำไปปรับปรุง"
        submitLabel="ยืนยันไม่อนุมัติ"
        onSubmit={handleConfirmReject}
        confirmLabel="ยืนยันไม่อนุมัติ"
        onConfirm={handleConfirmReject}
      >
        <Field label="เหตุผลที่ไม่อนุมัติ" required>
          <Textarea
            rows={3}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="ระบุเหตุผล เช่น งบประมาณเกินกำหนด หรือสินค้าในคลังยังมีพอ"
          />
        </Field>
      </FormDialog>

      {/* Create PR FormDialog */}
      <FormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="สร้างใบเสนอซื้อ (PR) ใหม่"
        description="กรอกข้อมูลคู่ค้า ตัวแทน รายการสินค้า และเหตุผลความจำเป็นในการสั่งซื้อ"
        submitLabel="ส่งขออนุมัติ PR"
        onSubmit={handleSubmitCreatePR}
        confirmLabel="ส่งขออนุมัติ PR"
        onConfirm={handleSubmitCreatePR}
      >
        <div className="space-y-4 max-h-[72vh] overflow-y-auto overflow-x-hidden pr-1 w-full max-w-full box-border">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-full box-border">
            <Field label="บริษัทคู่ค้า" required error={errors.companyId}>
              <Select value={companyId} onValueChange={handleCompanyChange}>
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

            <Field label="ตัวแทนจำหน่าย" required error={errors.agentId}>
              <Select value={agentId} onValueChange={setAgentId}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกตัวแทนจำหน่าย" />
                </SelectTrigger>
                <SelectContent>
                  {companyAgents.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name} ({a.position})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label="อ้างอิงใบเสนอราคา (ถ้ามี)">
            <Select value={quotationId} onValueChange={setQuotationId}>
              <SelectTrigger>
                <SelectValue placeholder="เลือกใบเสนอราคา" />
              </SelectTrigger>
              <SelectContent>
                {companyQuotations.map((q) => (
                  <SelectItem key={q.id} value={q.id}>
                    {q.quotationNumber} — {q.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="เหตุผลความจำเป็นในการจัดซื้อ" required error={errors.reason}>
            <Textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="เช่น สินค้าถึงจุดสั่งซื้อด่วน, เติมสต็อกรอบประจำสัปดาห์"
            />
          </Field>

          {/* Line Items Section */}
          <div className="space-y-2 border-t pt-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">
                รายการสินค้าที่ขอซื้อ ({lines.length} รายการ)
              </span>
              {errors.lines && <span className="text-xs text-danger">{errors.lines}</span>}
            </div>

            <div className="rounded-lg border bg-muted/20 p-2.5 space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="sm:col-span-2">
                  <Select value={itemProductId} onValueChange={handleProductSelect}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="เลือกสินค้าที่จะขอซื้อ" />
                    </SelectTrigger>
                    <SelectContent>
                      {state.catalog.products.map((p) => (
                        <SelectItem key={p.id} value={p.id} className="text-xs">
                          {p.sku} — {p.name} (สต็อก: {p.stock} {p.unit})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min={1}
                    placeholder="จำนวน"
                    value={itemQty}
                    onChange={(e) => setItemQty(e.target.value)}
                    className="h-8 text-xs w-20"
                  />
                  <Input
                    type="number"
                    step="0.1"
                    min={0}
                    placeholder="ราคา/หน่วย"
                    value={itemPrice}
                    onChange={(e) => setItemPrice(e.target.value)}
                    className="h-8 text-xs"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddLine}
                    className="h-8 px-3 text-xs shrink-0"
                  >
                    เพิ่ม
                  </Button>
                </div>
              </div>
            </div>

            {/* List */}
            {lines.length > 0 && (
              <div className="rounded-md border divide-y overflow-hidden max-h-48 overflow-y-auto">
                {lines.map((l) => (
                  <div key={l.productId} className="flex items-center justify-between p-2 text-xs bg-card">
                    <div>
                      <span className="font-mono text-muted-foreground mr-1.5">{l.sku}</span>
                      <span className="font-medium text-foreground">{l.name}</span>
                      <div className="text-[11px] text-muted-foreground">
                        {l.qty} {l.unit} × ฿{l.unitPrice.toFixed(2)} = ฿{l.total.toLocaleString()}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeLine(l.productId)}
                      className="h-6 w-6 p-0 text-danger"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                ))}
                <div className="p-2 text-right font-bold text-xs bg-muted/40">
                  ยอดรวม: ฿{lines.reduce((s, l) => s + l.total, 0).toLocaleString()}
                </div>
              </div>
            )}
          </div>
        </div>
      </FormDialog>
    </>
  );
}

