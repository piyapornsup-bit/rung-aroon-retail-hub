import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  Eye,
  FileCheck,
  FileText,
  User,
  XCircle,
  Clock,
  Printer,
  Ban,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { StatCard } from "@/components/admin/StatCard";
import { Money } from "@/components/admin/Money";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatNumber, formatShortDate } from "@/lib/format";
import { useStore, selectPendingPRs } from "@/lib/store";
import type { PurchaseRequisition, PRStatus } from "@/lib/mock-data";

export const Route = createFileRoute("/_admin/manager/approve-pr")({
  head: () => ({
    meta: [
      { title: "อนุมัติใบเสนอซื้อ (PR) — ร้านรุ่งอรุณ มินิมาร์ท" },
      { name: "description", content: "พิจารณาอนุมัติหรือปฏิเสธใบเสนอซื้อสินค้าจากแผนกจัดซื้อ" },
      { property: "og:title", content: "อนุมัติใบเสนอซื้อ (PR) — ร้านรุ่งอรุณ มินิมาร์ท" },
      { property: "og:description", content: "พิจารณาอนุมัติหรือปฏิเสธใบเสนอซื้อสินค้าจากแผนกจัดซื้อ" },
    ],
  }),
  component: ApprovePRPage,
});

function ApprovePRPage() {
  const { state, actions } = useStore();
  const prs = state.purchaseRequisitions;

  const [activeTab, setActiveTab] = useState<string>("pending");
  const [detailPR, setDetailPR] = useState<PurchaseRequisition | null>(null);

  // Approval confirmation modal
  const [confirmApproveOpen, setConfirmApproveOpen] = useState(false);
  const [targetPR, setTargetPR] = useState<PurchaseRequisition | null>(null);

  // Rejection modal
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const pendingPRs = useMemo(() => prs.filter((p) => p.status === "รออนุมัติ"), [prs]);
  const approvedPRs = useMemo(
    () => prs.filter((p) => p.status === "อนุมัติ" || p.status === "แปลงเป็น PO แล้ว"),
    [prs],
  );
  const rejectedPRs = useMemo(() => prs.filter((p) => p.status === "ไม่อนุมัติ"), [prs]);

  const pendingAmount = useMemo(
    () => pendingPRs.reduce((sum, p) => sum + p.totalAmount, 0),
    [pendingPRs],
  );

  const filteredData = useMemo(() => {
    switch (activeTab) {
      case "pending":
        return pendingPRs;
      case "approved":
        return approvedPRs;
      case "rejected":
        return rejectedPRs;
      default:
        return prs;
    }
  }, [prs, activeTab, pendingPRs, approvedPRs, rejectedPRs]);

  const handleOpenApproveConfirm = (pr: PurchaseRequisition) => {
    setTargetPR(pr);
    setConfirmApproveOpen(true);
  };

  const handleApprove = () => {
    if (!targetPR) return;
    const res = actions.decidePurchaseRequisition(targetPR.id, "อนุมัติ");
    if (res.ok) {
      toast.success(`อนุมัติใบเสนอซื้อ ${targetPR.prNumber} เรียบร้อยแล้ว`, {
        description: "แผนกจัดซื้อสามารถดำเนินการสร้างใบสั่งซื้อ (PO) ต่อได้",
      });
      setConfirmApproveOpen(false);
      setDetailPR(null);
      setTargetPR(null);
    }
  };

  const handleOpenReject = (pr: PurchaseRequisition) => {
    setTargetPR(pr);
    setRejectReason("");
    setRejectOpen(true);
  };

  const handleReject = () => {
    if (!targetPR) return;
    if (!rejectReason.trim()) {
      toast.error("กรุณาระบุเหตุผลที่ไม่อนุมัติใบเสนอซื้อ");
      return;
    }
    const res = actions.decidePurchaseRequisition(targetPR.id, "ไม่อนุมัติ", rejectReason.trim());
    if (res.ok) {
      toast.warning(`บันทึกไม่อนุมัติ ${targetPR.prNumber} แล้ว`, {
        description: "กระบวนการจัดซื้อสิ้นสุดลง ไม่สามารถสร้าง PO ได้",
      });
      setRejectOpen(false);
      setDetailPR(null);
      setTargetPR(null);
    }
  };

  const columns: DataTableColumn<PurchaseRequisition>[] = [
    {
      id: "prNumber",
      header: "เลขที่ PR",
      accessor: (r) => (
        <div>
          <span className="font-semibold text-foreground">{r.prNumber}</span>
          {r.quotationNumber && (
            <div className="text-xs text-muted-foreground">อ้างอิง: {r.quotationNumber}</div>
          )}
        </div>
      ),
      sortable: true,
      searchable: true,
    },
    {
      id: "requestedAt",
      header: "วันที่ขอซื้อ",
      accessor: (r) => (
        <span className="text-xs text-muted-foreground">
          {formatShortDate(r.requestedAt)}
        </span>
      ),
      sortable: true,
    },
    {
      id: "supplier",
      header: "บริษัทคู่ค้า / ตัวแทน",
      accessor: (r) => (
        <div>
          <div className="font-medium text-foreground">{r.companyName}</div>
          <div className="text-xs text-muted-foreground">ตัวแทน: {r.agentName}</div>
        </div>
      ),
      searchable: true,
    },
    {
      id: "requestedBy",
      header: "ผู้ขอซื้อ",
      accessor: (r) => <span className="text-sm">{r.requestedBy}</span>,
    },
    {
      id: "items",
      header: "รายการสินค้า",
      accessor: (r) => (
        <span className="text-sm">
          {r.lines.length} รายการ ({formatNumber(r.lines.reduce((s, l) => s + l.qty, 0))} ชิ้น)
        </span>
      ),
    },
    {
      id: "totalAmount",
      header: "มูลค่ารวม",
      accessor: (r) => (
        <span className="font-semibold text-foreground">
          <Money value={r.totalAmount} />
        </span>
      ),
      sortable: true,
    },
    {
      id: "status",
      header: "สถานะ",
      accessor: (r) => <StatusBadge status={r.status} />,
      sortable: true,
    },
    {
      id: "actions",
      header: "การดำเนินการ",
      accessor: (r) => (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              setDetailPR(r);
            }}
          >
            <Eye className="size-3.5 mr-1" />
            ตรวจพิจารณา
          </Button>
          {r.status === "รออนุมัติ" && (
            <>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenApproveConfirm(r);
                }}
              >
                <CheckCircle2 className="size-3.5 mr-1" />
                อนุมัติ
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenReject(r);
                }}
              >
                <Ban className="size-3.5 mr-1" />
                ไม่อนุมัติ
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="อนุมัติใบเสนอซื้อ (PR)"
        description="ตรวจสอบความถูกต้องของรายการสินค้า ราคา และอนุมัติใบเสนอซื้อจากพนักงานจัดซื้อ"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
        <StatCard
          icon={Clock}
          label="รอพิจารณาอนุมัติ"
          value={`${pendingPRs.length} ฉบับ`}
          tone={pendingPRs.length > 0 ? "warning" : "teal"}
          hint="จำเป็นต้องดำเนินการ"
        />
        <StatCard
          icon={Money}
          label="มูลค่าคำขอรออนุมัติ"
          value={<Money value={pendingAmount} decimals={false} />}
          tone="info"
          hint="งบประมาณรอพิจารณา"
        />
        <StatCard
          icon={CheckCircle2}
          label="อนุมัติแล้ว"
          value={`${approvedPRs.length} ฉบับ`}
          tone="success"
          hint="พร้อมเปิด PO สั่งซื้อ"
        />
        <StatCard
          icon={XCircle}
          label="ไม่อนุมัติ / สิ้นสุด"
          value={`${rejectedPRs.length} ฉบับ`}
          tone="danger"
          hint="คำขอที่ถูกปฏิเสธ"
        />
      </div>

      <div className="mb-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted/70">
            <TabsTrigger value="pending">
              รออนุมัติ ({pendingPRs.length})
            </TabsTrigger>
            <TabsTrigger value="all">
              ทั้งหมด ({prs.length})
            </TabsTrigger>
            <TabsTrigger value="approved">
              อนุมัติแล้ว ({approvedPRs.length})
            </TabsTrigger>
            <TabsTrigger value="rejected">
              ไม่อนุมัติ ({rejectedPRs.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <DataTable
        columns={columns}
        data={filteredData}
        searchPlaceholder="ค้นหาเลขที่ PR, บริษัทคู่ค้า, ตัวแทน..."
        onRowClick={(r) => setDetailPR(r)}
        emptyMessage="ไม่มีรายการใบเสนอซื้อในสถานะนี้"
      />

      {/* PR Detailed Review Dialog */}
      <Dialog open={!!detailPR} onOpenChange={(open) => !open && setDetailPR(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {detailPR && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between gap-4 mr-6">
                  <div>
                    <DialogTitle className="text-xl flex items-center gap-2">
                      <span>ใบเสนอซื้อ {detailPR.prNumber}</span>
                      <StatusBadge status={detailPR.status} />
                    </DialogTitle>
                    <DialogDescription className="mt-1">
                      ยื่นคำขอเมื่อ {formatShortDate(detailPR.requestedAt)} โดย {detailPR.requestedBy}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-5 my-2">
                {/* Meta details grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-muted/40 rounded-lg text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground block">บริษัทคู่ค้า</span>
                    <span className="font-medium text-foreground">{detailPR.companyName}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">ตัวแทนจำหน่าย</span>
                    <span className="font-medium text-foreground">{detailPR.agentName}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">ใบเสนอราคาอ้างอิง</span>
                    <span className="font-medium text-foreground">
                      {detailPR.quotationNumber || "-"}
                    </span>
                  </div>
                  <div className="col-span-2 sm:col-span-3">
                    <span className="text-xs text-muted-foreground block">เหตุผลและวัตถุประสงค์ในการขอซื้อ</span>
                    <p className="mt-0.5 text-foreground">{detailPR.reason || "ไม่มีระบุ"}</p>
                  </div>
                </div>

                {/* Audit trail / Decision notice */}
                {detailPR.status === "ไม่อนุมัติ" && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                    <div className="flex items-center gap-2 font-semibold">
                      <AlertTriangle className="size-4" />
                      <span>คำขอนี้ไม่อนุมัติ — กระบวนการจัดซื้อสิ้นสุดแล้ว</span>
                    </div>
                    <p className="mt-1 text-xs text-foreground">
                      <strong>เหตุผล:</strong> {detailPR.rejectionReason || "ไม่ระบุ"}
                    </p>
                    {detailPR.approvedBy && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        ผู้พิจารณา: {detailPR.approvedBy} เมื่อ {detailPR.approvedAt ? formatShortDate(detailPR.approvedAt) : "-"}
                      </p>
                    )}
                  </div>
                )}

                {detailPR.status === "อนุมัติ" && (
                  <div className="rounded-lg border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/20 p-3 text-sm text-emerald-800 dark:text-emerald-300">
                    <div className="flex items-center gap-2 font-semibold">
                      <CheckCircle2 className="size-4" />
                      <span>ผ่านการอนุมัติแล้ว</span>
                    </div>
                    <p className="text-xs mt-0.5">
                      อนุมัติโดย: {detailPR.approvedBy || "ผู้จัดการร้าน"} ({detailPR.approvedAt ? formatShortDate(detailPR.approvedAt) : "-"})
                    </p>
                  </div>
                )}

                {/* Items Table */}
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center justify-between">
                    <span>รายการสินค้าที่ขอจัดซื้อ</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      ทั้งหมด {detailPR.lines.length} รายการ
                    </span>
                  </h4>
                  <div className="rounded-md border border-border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/70 text-xs text-muted-foreground">
                        <tr>
                          <th className="p-2.5 text-left font-medium">ลำดับ</th>
                          <th className="p-2.5 text-left font-medium">สินค้า / รหัส</th>
                          <th className="p-2.5 text-right font-medium">จำนวน</th>
                          <th className="p-2.5 text-left font-medium">หน่วย</th>
                          <th className="p-2.5 text-right font-medium">ราคา/หน่วย</th>
                          <th className="p-2.5 text-right font-medium">รวม (บาท)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {detailPR.lines.map((l, idx) => (
                          <tr key={idx} className="hover:bg-muted/30">
                            <td className="p-2.5 text-muted-foreground text-xs">{idx + 1}</td>
                            <td className="p-2.5">
                              <span className="font-medium text-foreground block">{l.name}</span>
                              <span className="text-xs text-muted-foreground">{l.sku}</span>
                            </td>
                            <td className="p-2.5 text-right font-semibold">{formatNumber(l.qty)}</td>
                            <td className="p-2.5 text-muted-foreground text-xs">{l.unit}</td>
                            <td className="p-2.5 text-right"><Money value={l.unitPrice} /></td>
                            <td className="p-2.5 text-right font-semibold"><Money value={l.total} /></td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-muted/40 font-semibold border-t border-border">
                        <tr>
                          <td colSpan={4} className="p-2.5 text-right">ยอดรวมสุทธิ</td>
                          <td colSpan={2} className="p-2.5 text-right text-base text-primary">
                            <Money value={detailPR.totalAmount} />
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0 mt-2">
                <Button variant="outline" onClick={() => setDetailPR(null)}>
                  ปิดหน้าต่าง
                </Button>
                {detailPR.status === "รออนุมัติ" && (
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      onClick={() => handleOpenReject(detailPR)}
                    >
                      <Ban className="size-4 mr-1.5" />
                      ไม่อนุมัติ (สิ้นสุดการซื้อ)
                    </Button>
                    <Button
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => handleOpenApproveConfirm(detailPR)}
                    >
                      <CheckCircle2 className="size-4 mr-1.5" />
                      อนุมัติใบเสนอซื้อ
                    </Button>
                  </div>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Approve Confirmation Dialog */}
      <ConfirmDialog
        open={confirmApproveOpen}
        onOpenChange={setConfirmApproveOpen}
        title={`ยืนยันอนุมัติใบเสนอซื้อ ${targetPR?.prNumber}?`}
        description={
          targetPR ? (
            <div className="space-y-2 text-sm">
              <p>
                คุณกำลังจะอนุมัติการสั่งซื้อจาก <strong>{targetPR.companyName}</strong> ยอดรวม{" "}
                <strong>฿{formatNumber(targetPR.totalAmount)}</strong>
              </p>
              <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
                * เมื่ออนุมัติแล้ว แผนกจัดซื้อจะสามารถแปลงใบเสนอซื้อนี้เป็นใบสั่งซื้อ (PO) เพื่อส่งต่อให้ตัวแทนจำหน่ายได้ทันที
              </p>
            </div>
          ) : ""
        }
        confirmText="อนุมัติใบเสนอซื้อ"
        confirmTone="success"
        onConfirm={handleApprove}
      />

      {/* Rejection Dialog with Mandatory Reason */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-5" />
              <span>ปฏิเสธและไม่อนุมัติใบเสนอซื้อ</span>
            </DialogTitle>
            <DialogDescription>
              {targetPR?.prNumber} ({targetPR?.companyName})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="text-xs text-amber-700 bg-amber-50 dark:bg-amber-950/30 p-2.5 rounded border border-amber-200">
              * การไม่อนุมัติจะทำให้กระบวนการจัดซื้อสิ้นสุดลงทันที และจะไม่สามารถนำไปเปิด PO ได้ กรุณาระบุเหตุผลเพื่อให้ฝ่ายจัดซื้อรับทราบ
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rejectReason">เหตุผลที่ไม่อนุมัติ <span className="text-destructive">*</span></Label>
              <Textarea
                id="rejectReason"
                rows={3}
                placeholder="เช่น ราคาต่อหน่วยสูงเกินงบประมาณ, ยังมีสินค้าสำรองเพียงพอในคลัง ฯลฯ"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              ยกเลิก
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              ยืนยันไม่อนุมัติคำขอ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

