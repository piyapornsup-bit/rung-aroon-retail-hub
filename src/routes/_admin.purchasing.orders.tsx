import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  Boxes,
  Building2,
  Calendar,
  CheckCircle2,
  CreditCard,
  Eye,
  FileCheck,
  FileText,
  Mail,
  Package,
  PackageCheck,
  PackagePlus,
  Phone,
  Plus,
  Printer,
  ShoppingCart,
  Truck,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { FormDialog, Field } from "@/components/admin/FormDialog";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { StatCard } from "@/components/admin/StatCard";
import { Money } from "@/components/admin/Money";
import { Input } from "@/components/ui/input";
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
import { useStore, selectPendingReceivingPOs, selectCompletedPOs, selectApprovedPRs } from "@/lib/store";
import type { PurchaseOrder, PurchaseRequisition } from "@/lib/mock-data";

export const Route = createFileRoute("/_admin/purchasing/orders")({
  head: () => ({
    meta: [
      { title: "ใบสั่งซื้อ (PO) — ร้านรุ่งอรุณ มินิมาร์ท" },
      { name: "description", content: "จัดการใบสั่งซื้อ ออกจากใบเสนอซื้อที่ผ่านการอนุมัติ เอกสารสั่งซื้ออย่างเป็นทางการ" },
      { property: "og:title", content: "ใบสั่งซื้อ (PO) — ร้านรุ่งอรุณ มินิมาร์ท" },
      { property: "og:description", content: "จัดการใบสั่งซื้อ ออกจากใบเสนอซื้อที่ผ่านการอนุมัติ เอกสารสั่งซื้ออย่างเป็นทางการ" },
    ],
  }),
  component: PurchaseOrdersPage,
});

function PurchaseOrdersPage() {
  const { state, actions } = useStore();

  const [activeTab, setActiveTab] = useState<string>("all");
  const [detailPO, setDetailPO] = useState<PurchaseOrder | null>(null);
  const [viewLinkedPR, setViewLinkedPR] = useState<PurchaseRequisition | null>(null);

  // Create PO from Approved PR Dialog State
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedPRId, setSelectedPRId] = useState("");
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(state.warehouses[0]?.id ?? "WH-01");
  const [expectedDays, setExpectedDays] = useState("3");

  const approvedPRs = useMemo(() => selectApprovedPRs(state), [state]);

  const openCreateDialog = () => {
    if (approvedPRs.length === 0) {
      toast.error("ไม่มีใบเสนอซื้อ (PR) ที่ผ่านการอนุมัติในขณะนี้ (PO ออกได้เฉพาะ PR ที่อนุมัติแล้วเท่านั้น)");
      return;
    }
    setSelectedPRId(approvedPRs[0].id);
    setSelectedWarehouseId(state.warehouses[0]?.id ?? "WH-01");
    setExpectedDays("3");
    setCreateOpen(true);
  };

  const handleGeneratePO = () => {
    if (!selectedPRId) {
      toast.error("กรุณาเลือกใบเสนอซื้อที่อนุมัติแล้ว");
      return false;
    }
    const targetWH = state.warehouses.find((w) => w.id === selectedWarehouseId);
    const whName = targetWH ? targetWH.name : "โกดังหลัก (หลังร้าน)";

    const res = actions.convertPRToPO(selectedPRId, selectedWarehouseId, whName, parseInt(expectedDays) || 3);
    if (!res.ok) {
      toast.error(res.error ?? "ไม่สามารถสร้างใบสั่งซื้อได้");
      return false;
    } else {
      toast.success(`ออกใบสั่งซื้อ ${res.po?.poNumber} สำเร็จ เชื่อมต่อไปยังหน้าตรวจรับสินค้าเรียบร้อย`);
      setCreateOpen(false);
      if (res.po) {
        setDetailPO(res.po);
      }
      return true;
    }
  };

  const handleSubmitCreatePO = handleGeneratePO;
  const handleCreatePO = handleGeneratePO;

  // Filtered POs
  const filteredPOs = useMemo(() => {
    if (activeTab === "all") return state.purchaseOrders;
    if (activeTab === "pending") return selectPendingReceivingPOs(state);
    if (activeTab === "completed") return selectCompletedPOs(state);
    return state.purchaseOrders.filter((p) => p.status === activeTab);
  }, [state, activeTab]);

  // Metrics
  const pendingReceiving = selectPendingReceivingPOs(state).length;
  const completedReceiving = selectCompletedPOs(state).length;
  const totalPOAmount = state.purchaseOrders.reduce((sum, p) => sum + p.totalAmount, 0);

  const columns: DataTableColumn<PurchaseOrder>[] = [
    {
      id: "poNumber",
      header: "เลขที่ PO",
      accessor: (p) => (
        <span className="font-mono text-xs font-bold text-sun-700">{p.poNumber}</span>
      ),
      className: "w-28",
    },
    {
      id: "prRef",
      header: "อ้างอิง PR",
      accessor: (p) => {
        const prId = p.prId || p.pr_id || p.requisition_id;
        const prNum = p.prNumber ?? prId;
        if (!prNum) return <span className="font-mono text-xs text-muted-foreground">-</span>;
        const targetPR = state.purchaseRequisitions.find(
          (r) => (prId && r.id === prId) || (prNum && r.prNumber === prNum),
        );
        return (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-1.5 font-mono text-xs font-semibold text-sun-700 hover:text-sun-800 hover:bg-sun-50 flex items-center gap-1"
            onClick={(e) => {
              e.stopPropagation();
              if (targetPR) {
                setViewLinkedPR(targetPR);
              } else {
                toast.info(`อ้างอิงใบเสนอซื้อเลขที่ ${prNum}`);
              }
            }}
            title="คลิกเพื่อดูรายละเอียดใบเสนอซื้อ (PR)"
          >
            <FileText className="size-3" />
            <span>{prNum}</span>
          </Button>
        );
      },
      className: "w-32",
    },
    {
      id: "supplier",
      header: "บริษัทคู่ค้า / ตัวแทน",
      accessor: (p) => (
        <div>
          <span className="font-medium text-foreground">{p.supplierName}</span>
          <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
            <User className="size-3" />
            <span>{p.agentName ?? "ตัวแทนฝ่ายขาย"}</span>
          </div>
        </div>
      ),
      className: "min-w-[200px]",
    },
    {
      id: "warehouse",
      header: "โกดังปลายทาง",
      accessor: (p) => (
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Boxes className="size-3" />
          {p.warehouseName}
        </span>
      ),
      className: "w-36",
    },
    {
      id: "date",
      header: "สั่งซื้อ / กำหนดส่ง",
      accessor: (p) => (
        <div className="text-xs space-y-0.5">
          <div className="text-foreground">{formatShortDate(p.orderDate)}</div>
          <div className="text-muted-foreground">ส่ง: {formatShortDate(p.expectedDate)}</div>
        </div>
      ),
      className: "w-32",
    },
    {
      id: "total",
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
      header: "สถานะการรับของ",
      accessor: (p) => <StatusBadge status={p.status} />,
      className: "w-32",
    },
    {
      id: "payment",
      header: "การชำระเงิน",
      accessor: (p) => (
        <StatusBadge
          status={p.paymentStatus ?? "ยังไม่ขอจ่าย"}
          tone={
            p.paymentStatus === "จ่ายเงินแล้ว"
              ? "green"
              : p.paymentStatus === "อนุมัติจ่ายแล้ว"
                ? "cyan"
                : p.paymentStatus === "รออนุมัติจ่าย"
                  ? "amber"
                  : "gray"
          }
        />
      ),
      className: "w-32",
    },
    {
      id: "actions",
      header: "การกระทำ",
      align: "right",
      accessor: (p) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2.5 text-xs gap-1.5"
            onClick={() => setDetailPO(p)}
            title="ดูใบสั่งซื้อ"
          >
            <Eye className="size-3.5" />
            <span>ดูเอกสาร</span>
          </Button>
        </div>
      ),
      className: "w-28",
    },
  ];

  return (
    <>
      <PageHeader
        title="ใบสั่งซื้อ (Purchase Order - PO)"
        description="เอกสารสั่งซื้ออย่างเป็นทางการ ออกจาก PR ที่ผ่านการอนุมัติแล้ว ส่งให้ตัวแทนจำหน่ายทางอีเมล/LINE นอกระบบ"
        actions={
          <Button onClick={openCreateDialog} className="gap-2 shadow-xs">
            <Plus className="size-4" />
            <span>สร้าง PO จาก PR ที่อนุมัติ</span>
            {approvedPRs.length > 0 && (
              <span className="rounded-full bg-white/20 px-1.5 py-0.2 text-[11px] font-bold">
                {approvedPRs.length}
              </span>
            )}
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={Truck}
          label="ใบสั่งซื้อรอรับของเข้าคลัง"
          value={formatNumber(pendingReceiving)}
          tone="teal"
          hint="เชื่อมโยงไปยังหน้าตรวจรับสินค้า"
        />
        <StatCard
          icon={PackageCheck}
          label="รับสินค้าครบถ้วนแล้ว"
          value={formatNumber(completedReceiving)}
          tone="success"
          hint="สต็อกนำเข้าคลังเรียบร้อย"
        />
        <StatCard
          icon={ShoppingCart}
          label="มูลค่าการสั่งซื้อสะสม"
          value={<Money value={totalPOAmount} decimals={false} />}
          tone="info"
          hint="รวมทุกใบสั่งซื้อในระบบ"
        />
      </div>

      <div className="mb-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="all" className="text-xs">
              ทั้งหมด ({state.purchaseOrders.length})
            </TabsTrigger>
            <TabsTrigger value="pending" className="text-xs">
              รอรับสินค้า ({pendingReceiving})
            </TabsTrigger>
            <TabsTrigger value="completed" className="text-xs">
              รับครบแล้ว ({completedReceiving})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <DataTable
        columns={columns}
        data={filteredPOs}
        searchKey="poNumber"
        searchPlaceholder="ค้นหาเลขที่ PO, ชื่อบริษัทคู่ค้า, โกดัง..."
        emptyMessage="ไม่พบข้อมูลใบสั่งซื้อ"
      />

      {/* Full Document-Style View Dialog with Print Capability */}
      <Dialog open={Boolean(detailPO)} onOpenChange={(open) => !open && setDetailPO(null)}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto print:p-0">
          <DialogHeader className="border-b pb-3 print:hidden">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-base text-foreground">
                  เอกสารใบสั่งซื้อ / PURCHASE ORDER (PO)
                </span>
                <span className="ml-2 font-mono text-xs font-bold text-sun-700 bg-sun-50 px-2 py-0.5 rounded">
                  {detailPO?.poNumber}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {detailPO && <StatusBadge status={detailPO.status} />}
                <Button size="sm" variant="outline" onClick={() => window.print()} className="gap-1.5 h-8 text-xs">
                  <Printer className="size-3.5" />
                  <span>พิมพ์เอกสาร</span>
                </Button>
              </div>
            </div>
          </DialogHeader>

          {detailPO && (
            <div className="space-y-4 pt-2 text-xs font-sans text-foreground">
              {/* Document Printable Header */}
              <div className="border-b-2 border-sun-600 pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-lg font-bold text-foreground">ร้านรุ่งอรุณ มินิมาร์ท</h2>
                    <p className="text-xs text-muted-foreground">
                      เลขประจำตัวผู้เสียภาษี: 0105559012345
                    </p>
                    <p className="text-xs text-muted-foreground">
                      123 หมู่ 4 ตำบลศิลา อำเภอเมือง จังหวัดขอนแก่น 40000 · โทร. 043-221-890
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-bold text-sun-700">ใบสั่งซื้อ (PURCHASE ORDER)</div>
                    <div className="font-mono text-xs font-bold mt-0.5">เลขที่: {detailPO.poNumber}</div>
                    <div className="text-muted-foreground text-[11px]">วันที่สั่งซื้อ: {formatShortDate(detailPO.orderDate)}</div>
                    <div className="text-muted-foreground text-[11px]">กำหนดส่งมอบ: {formatShortDate(detailPO.expectedDate)}</div>
                  </div>
                </div>
              </div>

              {/* Vendor & Delivery Information */}
              <div className="grid grid-cols-2 gap-4 rounded-lg border bg-muted/10 p-3">
                <div className="space-y-1">
                  <div className="font-bold text-xs text-foreground uppercase tracking-wider text-muted-foreground mb-1">
                    ข้อมูลผู้จำหน่าย (VENDOR)
                  </div>
                  <div className="font-bold text-sm text-foreground">{detailPO.supplierName}</div>
                  <div><span className="text-muted-foreground">ตัวแทนผู้รับเรื่อง: </span><span className="font-semibold">{detailPO.agentName ?? "ตัวแทนฝ่ายขาย"}</span></div>
                  {detailPO.agentPhone && <div><span className="text-muted-foreground">เบอร์โทรศัพท์: </span><span>{detailPO.agentPhone}</span></div>}
                  {detailPO.creditTermDays && <div><span className="text-muted-foreground">เงื่อนไขการชำระ: </span><span>เครดิต {detailPO.creditTermDays} วัน ({detailPO.paymentType ?? "เงินเชื่อ"})</span></div>}
                </div>

                <div className="space-y-1">
                  <div className="font-bold text-xs text-foreground uppercase tracking-wider text-muted-foreground mb-1">
                    สถานที่จัดส่งมอบสินค้า (DELIVERY TO)
                  </div>
                  <div className="font-bold text-sm text-foreground">{detailPO.warehouseName}</div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">อ้างอิงใบเสนอซื้อ: </span>
                    <span className="font-mono font-semibold">{detailPO.prNumber ?? detailPO.prId ?? "-"}</span>
                    {(() => {
                      const prId = detailPO.prId || detailPO.pr_id || detailPO.requisition_id;
                      const prNum = detailPO.prNumber ?? prId;
                      const targetPR = state.purchaseRequisitions.find(
                        (r) => (prId && r.id === prId) || (prNum && r.prNumber === prNum),
                      );
                      if (targetPR) {
                        return (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 px-2 text-[11px] gap-1 text-sun-700 hover:bg-sun-50 border-sun-200"
                            onClick={() => setViewLinkedPR(targetPR)}
                          >
                            <Eye className="size-3" />
                            <span>ดูรายละเอียด PR</span>
                          </Button>
                        );
                      }
                      return null;
                    })()}
                  </div>
                  <div><span className="text-muted-foreground">ผู้จัดทำเอกสาร: </span><span>{detailPO.createdBy}</span></div>
                  {detailPO.note && <div><span className="text-muted-foreground">หมายเหตุ: </span><span>{detailPO.note}</span></div>}
                </div>
              </div>

              {/* Order Lines Table */}
              <div className="rounded-md border overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted/80 text-foreground font-semibold">
                    <tr>
                      <th className="py-2.5 px-3 text-left">ลำดับ</th>
                      <th className="py-2.5 px-3 text-left">รหัสสินค้า / รายการ</th>
                      <th className="py-2.5 px-3 text-left">โกดังจัดเก็บ</th>
                      <th className="py-2.5 px-3 text-center">จำนวนสั่งซื้อ</th>
                      <th className="py-2.5 px-3 text-right">ราคาต่อหน่วย</th>
                      <th className="py-2.5 px-3 text-right">จำนวนเงิน (บาท)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {detailPO.lines.map((l, i) => (
                      <tr key={i} className="hover:bg-muted/20">
                        <td className="py-2 px-3 text-muted-foreground">{i + 1}</td>
                        <td className="py-2 px-3">
                          <span className="font-mono text-muted-foreground mr-1.5">{l.sku}</span>
                          <span className="font-medium text-foreground">{l.name}</span>
                          {(l.pr_item_id || l.prItemId || l.prLineId) && (
                            <span className="ml-1.5 text-[10px] text-muted-foreground/80 font-mono bg-muted/50 px-1 py-0.5 rounded">
                              (Ref: {l.pr_item_id || l.prItemId || l.prLineId})
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-muted-foreground">{l.warehouseName ?? detailPO.warehouseName}</td>
                        <td className="py-2 px-3 text-center font-semibold text-foreground">
                          {l.qty} {l.unit}
                        </td>
                        <td className="py-2 px-3 text-right text-muted-foreground">
                          ฿{l.costPrice.toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-right font-medium text-foreground">
                          ฿{l.total.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t bg-muted/30 font-semibold text-foreground">
                    <tr>
                      <td colSpan={5} className="py-2 px-3 text-right">ยอดรวม (Subtotal):</td>
                      <td className="py-2 px-3 text-right">
                        ฿{detailPO.totalAmount.toLocaleString()}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={5} className="py-1 px-3 text-right text-muted-foreground">ภาษีมูลค่าเพิ่ม 7% (รวมในราคาแล้ว):</td>
                      <td className="py-1 px-3 text-right text-muted-foreground">
                        ฿{(detailPO.totalAmount * 7 / 107).toFixed(2)}
                      </td>
                    </tr>
                    <tr className="border-t">
                      <td colSpan={5} className="py-2.5 px-3 text-right text-sm">ยอดเงินสุทธิทั้งสิ้น (Grand Total):</td>
                      <td className="py-2.5 px-3 text-right text-base font-bold text-sun-700">
                        ฿{detailPO.totalAmount.toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Requirement Rule Notice */}
              <div className="rounded border border-dashed border-sun-300 bg-sun-50/50 p-2.5 text-[11px] text-sun-900">
                <strong>ข้อกำหนดสำคัญ:</strong> ใบสั่งซื้อนี้เป็นช่องทางสั่งซื้ออย่างเป็นทางการทางเดียวของร้านรุ่งอรุณ มินิมาร์ท ฝ่ายจัดซื้อส่งมอบเอกสารนี้ให้ตัวแทนทางอีเมลหรือ LINE นอกระบบ กรุณาส่งมอบสินค้าตามกำหนดและส่งมอบเอกสารใบกำกับภาษี/ใบเสร็จรับเงินเพื่อใช้ประกอบการเบิกจ่าย
              </div>

              {/* Signature Boxes */}
              <div className="grid grid-cols-3 gap-4 pt-6 text-center text-xs">
                <div className="rounded border p-3 space-y-6">
                  <div className="text-muted-foreground">ผู้จัดทำเอกสารจัดซื้อ</div>
                  <div className="border-b border-dashed w-32 mx-auto"></div>
                  <div>({detailPO.createdBy})</div>
                </div>
                <div className="rounded border p-3 space-y-6">
                  <div className="text-muted-foreground">ผู้อนุมัติการสั่งซื้อ (ผู้จัดการร้าน)</div>
                  <div className="border-b border-dashed w-32 mx-auto"></div>
                  <div>(ธนพล รุ่งเรือง)</div>
                </div>
                <div className="rounded border p-3 space-y-6">
                  <div className="text-muted-foreground">ตัวแทนผู้รับการสั่งซื้อ</div>
                  <div className="border-b border-dashed w-32 mx-auto"></div>
                  <div>({detailPO.agentName ?? "ตัวแทนจำหน่าย"})</div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Linked PR Detail Dialog */}
      <Dialog open={Boolean(viewLinkedPR)} onOpenChange={(open) => !open && setViewLinkedPR(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader className="border-b pb-3">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  <span>ใบเสนอซื้อต้นทาง (Source PR)</span>
                  <span className="font-mono text-xs font-bold text-sun-700 bg-sun-50 px-2 py-0.5 rounded">
                    {viewLinkedPR?.prNumber}
                  </span>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  เอกสารขอจัดซื้อภายในที่ได้รับอนุมัติแล้ว และนำมาเปิดเป็นใบสั่งซื้อนี้
                </DialogDescription>
              </div>
              {viewLinkedPR && <StatusBadge status={viewLinkedPR.status} />}
            </div>
          </DialogHeader>

          {viewLinkedPR && (
            <div className="space-y-4 pt-2 text-xs">
              <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/20 p-3">
                <div className="space-y-1">
                  <div>
                    <span className="text-muted-foreground">ผู้ขอซื้อ: </span>
                    <span className="font-semibold text-foreground">{viewLinkedPR.requestedBy}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">วันที่ขอซื้อ: </span>
                    <span className="text-foreground">{formatShortDate(viewLinkedPR.requestedAt)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">ผู้อนุมัติ: </span>
                    <span className="font-semibold text-green-700">{viewLinkedPR.approvedBy || "ผู้จัดการร้าน"}</span>
                  </div>
                  {viewLinkedPR.approvedAt && (
                    <div>
                      <span className="text-muted-foreground">วันที่อนุมัติ: </span>
                      <span className="text-foreground">{formatShortDate(viewLinkedPR.approvedAt)}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <div>
                    <span className="text-muted-foreground">บริษัทคู่ค้า: </span>
                    <span className="font-semibold text-foreground">{viewLinkedPR.companyName}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">ตัวแทนขาย: </span>
                    <span className="text-foreground">{viewLinkedPR.agentName}</span>
                  </div>
                  {viewLinkedPR.quotationNumber && (
                    <div>
                      <span className="text-muted-foreground">อ้างอิงใบเสนอราคา: </span>
                      <span className="font-mono text-foreground">{viewLinkedPR.quotationNumber}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">เหตุผลขอซื้อ: </span>
                    <span className="text-foreground">{viewLinkedPR.reason}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-foreground mb-1.5">
                  รายการสินค้าในใบเสนอซื้อ ({viewLinkedPR.lines.length} รายการ)
                </h4>
                <div className="rounded-md border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/70 text-foreground font-medium">
                      <tr>
                        <th className="py-2 px-3 text-left">ลำดับ</th>
                        <th className="py-2 px-3 text-left">รายการสินค้า</th>
                        <th className="py-2 px-3 text-center">จำนวน</th>
                        <th className="py-2 px-3 text-right">ราคา/หน่วย</th>
                        <th className="py-2 px-3 text-right">รวมเงิน (บาท)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {viewLinkedPR.lines.map((l, i) => (
                        <tr key={i} className="hover:bg-muted/10">
                          <td className="py-1.5 px-3 text-muted-foreground">{i + 1}</td>
                          <td className="py-1.5 px-3">
                            <span className="font-mono text-muted-foreground mr-1.5">{l.sku}</span>
                            <span className="font-medium text-foreground">{l.name}</span>
                          </td>
                          <td className="py-1.5 px-3 text-center font-medium text-foreground">
                            {l.qty} {l.unit}
                          </td>
                          <td className="py-1.5 px-3 text-right text-muted-foreground">
                            ฿{l.unitPrice.toFixed(2)}
                          </td>
                          <td className="py-1.5 px-3 text-right font-medium text-foreground">
                            ฿{l.total.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t bg-muted/30 font-semibold">
                      <tr>
                        <td colSpan={4} className="py-2 px-3 text-right">
                          ยอดรวมสุทธิ:
                        </td>
                        <td className="py-2 px-3 text-right text-sun-700 font-bold">
                          ฿{viewLinkedPR.totalAmount.toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: Create PO from Approved PR */}
      <FormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="ออกใบสั่งซื้อ (PO) จากใบเสนอซื้อที่อนุมัติแล้ว"
        description="PO สามารถออกได้เฉพาะใบเสนอซื้อ (PR) ที่ผู้จัดการร้านอนุมัติแล้วเท่านั้น"
        submitLabel="ยืนยันการออก PO"
        onSubmit={handleGeneratePO}
        confirmLabel="ยืนยันการออก PO"
        onConfirm={handleGeneratePO}
      >
        <div className="space-y-4">
          <Field label="เลือกใบเสนอซื้อ (PR) ที่อนุมัติแล้ว" required>
            <Select value={selectedPRId} onValueChange={setSelectedPRId}>
              <SelectTrigger>
                <SelectValue placeholder="เลือกใบเสนอซื้อ" />
              </SelectTrigger>
              <SelectContent>
                {approvedPRs.map((pr) => (
                  <SelectItem key={pr.id} value={pr.id}>
                    {pr.prNumber} — {pr.companyName} (฿{pr.totalAmount.toLocaleString()})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {/* Show details of selected PR (Auto-filled) */}
          {selectedPRId && (() => {
            const pr = approvedPRs.find((p) => p.id === selectedPRId);
            if (!pr) return null;
            return (
              <div className="space-y-3">
                <div className="rounded-lg border bg-muted/20 p-3 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-foreground flex items-center gap-1.5">
                      <Building2 className="size-3.5 text-sun-600" />
                      <span>{pr.companyName}</span>
                    </div>
                    <Badge variant="outline" className="font-mono text-[11px] text-sun-700 bg-sun-50 border-sun-200">
                      Ref: {pr.prNumber}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-muted-foreground pt-1">
                    <div>
                      <span>ตัวแทนผู้ประสานงาน: </span>
                      <strong className="text-foreground font-medium">{pr.agentName}</strong>
                    </div>
                    {pr.quotationNumber && (
                      <div>
                        <span>ใบเสนอราคา: </span>
                        <strong className="text-foreground font-mono">{pr.quotationNumber}</strong>
                      </div>
                    )}
                    <div className="col-span-2">
                      <span>เหตุผลการจัดซื้อ: </span>
                      <span className="text-foreground">{pr.reason}</span>
                    </div>
                  </div>
                </div>

                {/* Items Auto-filled preview */}
                <div>
                  <div className="flex items-center justify-between text-xs font-semibold text-foreground mb-1.5">
                    <span>รายการสินค้าที่จะสั่งซื้อ (ดึงจาก PR อัตโนมัติ {pr.lines.length} รายการ)</span>
                    <span className="text-sun-700 font-bold">รวม ฿{pr.totalAmount.toLocaleString()}</span>
                  </div>
                  <div className="rounded-md border overflow-hidden max-h-48 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/80 text-foreground sticky top-0 font-medium">
                        <tr>
                          <th className="py-1.5 px-2.5 text-left">สินค้า</th>
                          <th className="py-1.5 px-2 text-center">จำนวน</th>
                          <th className="py-1.5 px-2 text-right">ราคา/หน่วย</th>
                          <th className="py-1.5 px-2.5 text-right">ยอดรวม</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {pr.lines.map((l, i) => (
                          <tr key={i} className="hover:bg-muted/10">
                            <td className="py-1.5 px-2.5">
                              <div className="font-medium text-foreground">{l.name}</div>
                              <div className="text-[10px] font-mono text-muted-foreground">{l.sku}</div>
                            </td>
                            <td className="py-1.5 px-2 text-center font-semibold text-foreground">
                              {l.qty} {l.unit}
                            </td>
                            <td className="py-1.5 px-2 text-right text-muted-foreground">
                              ฿{l.unitPrice.toFixed(2)}
                            </td>
                            <td className="py-1.5 px-2.5 text-right font-medium text-foreground">
                              ฿{l.total.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })()}

          <Field label="โกดังปลายทางสำหรับรับมอบสินค้า" required>
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

          <Field label="ระยะเวลาคาดการณ์ส่งมอบ (วัน)">
            <Input
              type="number"
              min={1}
              value={expectedDays}
              onChange={(e) => setExpectedDays(e.target.value)}
              placeholder="3"
            />
          </Field>
        </div>
      </FormDialog>
    </>
  );
}

