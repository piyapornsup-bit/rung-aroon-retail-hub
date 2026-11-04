import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  Eye,
  FileCheck,
  FileText,
  Paperclip,
  Receipt,
  User,
  Wallet,
  XCircle,
  Ban,
  ExternalLink,
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
import { useStore, selectPendingPaymentRequests } from "@/lib/store";
import type { PaymentRequest, PaymentRequestStatus, PaymentType } from "@/lib/mock-data";

export const Route = createFileRoute("/_admin/manager/approve-payments")({
  head: () => ({
    meta: [
      { title: "อนุมัติการจ่ายเงิน — ร้านรุ่งอรุณ มินิมาร์ท" },
      { name: "description", content: "พิจารณาอนุมัติคำขอจ่ายเงินสดและเงินเชื่อแก่บริษัทคู่ค้าและตัวแทนจำหน่าย" },
      { property: "og:title", content: "อนุมัติการจ่ายเงิน — ร้านรุ่งอรุณ มินิมาร์ท" },
      { property: "og:description", content: "พิจารณาอนุมัติคำขอจ่ายเงินสดและเงินเชื่อแก่บริษัทคู่ค้าและตัวแทนจำหน่าย" },
    ],
  }),
  component: ApprovePaymentsPage,
});

function ApprovePaymentsPage() {
  const { state, actions } = useStore();
  const paymentRequests = state.paymentRequests;

  const [activeTab, setActiveTab] = useState<string>("pending");
  const [detailPayment, setDetailPayment] = useState<PaymentRequest | null>(null);

  // Approval confirmation modal
  const [confirmApproveOpen, setConfirmApproveOpen] = useState(false);
  const [targetPayment, setTargetPayment] = useState<PaymentRequest | null>(null);

  // Rejection modal
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const pendingPayments = useMemo(
    () => paymentRequests.filter((p) => p.status === "รออนุมัติจ่าย"),
    [paymentRequests],
  );
  const approvedPayments = useMemo(
    () => paymentRequests.filter((p) => p.status === "อนุมัติจ่ายแล้ว" || p.status === "จ่ายแล้ว"),
    [paymentRequests],
  );
  const rejectedPayments = useMemo(
    () => paymentRequests.filter((p) => p.status === "ปฏิเสธ"),
    [paymentRequests],
  );

  const pendingAmount = useMemo(
    () => pendingPayments.reduce((sum, p) => sum + p.amount, 0),
    [pendingPayments],
  );

  const cashCount = useMemo(
    () => paymentRequests.filter((p) => p.paymentType === "เงินสด").length,
    [paymentRequests],
  );
  const creditCount = useMemo(
    () => paymentRequests.filter((p) => p.paymentType === "เงินเชื่อ").length,
    [paymentRequests],
  );

  const filteredData = useMemo(() => {
    switch (activeTab) {
      case "pending":
        return pendingPayments;
      case "approved":
        return approvedPayments;
      case "rejected":
        return rejectedPayments;
      default:
        return paymentRequests;
    }
  }, [paymentRequests, activeTab, pendingPayments, approvedPayments, rejectedPayments]);

  const handleOpenApprove = (payment: PaymentRequest) => {
    setTargetPayment(payment);
    setConfirmApproveOpen(true);
  };

  const handleApprove = () => {
    if (!targetPayment) return;
    const res = actions.decidePaymentRequest(targetPayment.id, "อนุมัติจ่ายแล้ว");
    if (res.ok) {
      const reqId = targetPayment.id || (targetPayment as any).requestNumber;
      const supplier = targetPayment.supplierName || (targetPayment as any).companyName || (targetPayment as any).payee;
      toast.success(`อนุมัติคำขอจ่ายเงิน ${reqId} แล้ว`, {
        description: `ยอดชำระ ฿${formatNumber(targetPayment.amount)} ให้แก่ ${supplier}`,
      });
      setConfirmApproveOpen(false);
      setDetailPayment(null);
      setTargetPayment(null);
    }
  };

  const handleOpenReject = (payment: PaymentRequest) => {
    setTargetPayment(payment);
    setRejectReason("");
    setRejectOpen(true);
  };

  const handleReject = () => {
    if (!targetPayment) return;
    if (!rejectReason.trim()) {
      toast.error("กรุณาระบุเหตุผลในการปฏิเสธการจ่ายเงิน");
      return;
    }
    const res = actions.decidePaymentRequest(targetPayment.id, "ปฏิเสธ", rejectReason.trim());
    if (res.ok) {
      const reqId = targetPayment.id || (targetPayment as any).requestNumber;
      toast.warning(`ปฏิเสธคำขอจ่ายเงิน ${reqId} แล้ว`, {
        description: "แจ้งกลับไปยังผู้ยื่นคำขอเพื่อดำเนินการแก้ไข",
      });
      setRejectOpen(false);
      setDetailPayment(null);
      setTargetPayment(null);
    }
  };

  const columns: DataTableColumn<PaymentRequest>[] = [
    {
      id: "requestNumber",
      header: "เลขที่คำขอ",
      accessor: (r) => (
        <div>
          <span className="font-semibold text-foreground">{r.id || (r as any).requestNumber}</span>
          {r.poNumber && (
            <div className="text-xs text-muted-foreground">PO: {r.poNumber}</div>
          )}
        </div>
      ),
      sortable: true,
      searchable: true,
    },
    {
      id: "requestedAt",
      header: "วันที่ขอจ่าย",
      accessor: (r) => (
        <span className="text-xs text-muted-foreground">
          {formatShortDate(r.requestedAt)}
        </span>
      ),
      sortable: true,
    },
    {
      id: "payee",
      header: "ผู้รับเงิน / คู่ค้า",
      accessor: (r) => (
        <div>
          <div className="font-medium text-foreground">{r.supplierName || (r as any).companyName || (r as any).payee}</div>
          <div className="text-xs text-muted-foreground">{r.agentName ? `ตัวแทน: ${r.agentName}` : (r.companyId ?? "")}</div>
        </div>
      ),
      searchable: true,
    },
    {
      id: "type",
      header: "ประเภท",
      accessor: (r) => (
        <Badge
          variant="outline"
          className={
            r.paymentType === "เงินสด"
              ? "border-emerald-500/40 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/20"
              : "border-blue-500/40 text-blue-700 bg-blue-50 dark:bg-blue-950/20"
          }
        >
          {r.paymentType}
        </Badge>
      ),
      sortable: true,
    },
    {
      id: "amount",
      header: "ยอดเงิน",
      accessor: (r) => (
        <span className="font-semibold text-foreground">
          <Money value={r.amount} />
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
              setDetailPayment(r);
            }}
          >
            <Eye className="size-3.5 mr-1" />
            ตรวจพิจารณา
          </Button>
          {r.status === "รออนุมัติจ่าย" && (
            <>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenApprove(r);
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
                ปฏิเสธ
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
        title="อนุมัติการจ่ายเงิน"
        description="พิจารณาอนุมัติคำขอเบิกจ่ายเงินสดและเงินเชื่อให้แก่บริษัทคู่ค้าและตัวแทนจำหน่าย"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
        <StatCard
          icon={Clock}
          label="คำขอรออนุมัติจ่าย"
          value={`${pendingPayments.length} รายการ`}
          tone={pendingPayments.length > 0 ? "danger" : "teal"}
          hint="จำเป็นต้องตรวจสอบ"
        />
        <StatCard
          icon={DollarSign}
          label="ยอดเงินรออนุมัติจ่าย"
          value={<Money value={pendingAmount} decimals={false} />}
          tone="warning"
          hint="ยอดรวมที่ต้องจ่ายออก"
        />
        <StatCard
          icon={CheckCircle2}
          label="อนุมัติจ่ายแล้ว"
          value={`${approvedPayments.length} รายการ`}
          tone="success"
          hint="ผ่านการอนุมัติเรียบร้อย"
        />
        <StatCard
          icon={CreditCard}
          label="สัดส่วนเงินสด / เงินเชื่อ"
          value={`${cashCount} / ${creditCount}`}
          tone="info"
          hint="เงินสด vs เครดิตเทอม"
        />
      </div>

      <div className="mb-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted/70">
            <TabsTrigger value="pending">
              รออนุมัติจ่าย ({pendingPayments.length})
            </TabsTrigger>
            <TabsTrigger value="all">
              ทั้งหมด ({paymentRequests.length})
            </TabsTrigger>
            <TabsTrigger value="approved">
              อนุมัติจ่ายแล้ว ({approvedPayments.length})
            </TabsTrigger>
            <TabsTrigger value="rejected">
              ปฏิเสธ ({rejectedPayments.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <DataTable
        columns={columns}
        data={filteredData}
        searchPlaceholder="ค้นหาเลขที่คำขอ, บริษัทคู่ค้า, ผู้รับเงิน..."
        onRowClick={(r) => setDetailPayment(r)}
        emptyMessage="ไม่มีรายการคำขอจ่ายเงินในสถานะนี้"
      />

      {/* Detailed Review Dialog */}
      <Dialog open={!!detailPayment} onOpenChange={(open) => !open && setDetailPayment(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {detailPayment && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between gap-4 mr-6">
                  <div>
                    <DialogTitle className="text-xl flex items-center gap-2">
                      <span>คำขอจ่ายเงิน {detailPayment.id || (detailPayment as any).requestNumber}</span>
                      <StatusBadge status={detailPayment.status} />
                    </DialogTitle>
                    <DialogDescription className="mt-1">
                      ยื่นคำขอเมื่อ {formatShortDate(detailPayment.requestedAt)} โดย {detailPayment.requestedBy}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 my-2">
                {/* Meta details */}
                <div className="grid grid-cols-2 gap-3 p-3 bg-muted/40 rounded-lg text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground block">ผู้รับเงิน / คู่ค้า</span>
                    <span className="font-semibold text-foreground">
                      {detailPayment.supplierName || (detailPayment as any).companyName || (detailPayment as any).payee}
                    </span>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {detailPayment.agentName ? `ตัวแทน: ${detailPayment.agentName}` : (detailPayment.companyId ?? "")}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">ประเภทการจ่ายเงิน</span>
                    <Badge
                      variant="outline"
                      className={
                        detailPayment.paymentType === "เงินสด"
                          ? "border-emerald-500/40 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/20"
                          : "border-blue-500/40 text-blue-700 bg-blue-50 dark:bg-blue-950/20"
                      }
                    >
                      {detailPayment.paymentType}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">เลขที่ใบสั่งซื้ออ้างอิง (PO)</span>
                    <span className="font-medium text-foreground">
                      {detailPayment.poNumber || "-"}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">กำหนดชำระ (Due Date)</span>
                    <span className="font-medium text-foreground">
                      {detailPayment.dueDate ? formatShortDate(detailPayment.dueDate) : "จ่ายทันที"}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-xs text-muted-foreground block">ข้อมูลบัญชีธนาคารสำหรับโอนเงิน</span>
                    <span className="font-medium text-foreground">
                      {(detailPayment as any).bankAccount || (detailPayment as any).supplierBankAccount || "ชำระเงินสดหน้าร้าน / เช็ค"}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-xs text-muted-foreground block">หมายเหตุคำขอ</span>
                    <p className="text-foreground">{detailPayment.note || "ไม่มีระบุ"}</p>
                  </div>
                </div>

                {/* Amount Highlight Box */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-primary/10 border border-primary/20">
                  <div>
                    <span className="text-xs text-muted-foreground block">ยอดเงินที่ขออนุมัติจ่าย</span>
                    <span className="text-2xl font-bold text-primary">
                      <Money value={detailPayment.amount} />
                    </span>
                  </div>
                  <Badge className="text-sm px-3 py-1">
                    {detailPayment.paymentType}
                  </Badge>
                </div>

                {/* Decision history / status alert */}
                {detailPayment.status === "ปฏิเสธ" && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                    <div className="flex items-center gap-2 font-semibold">
                      <XCircle className="size-4" />
                      <span>คำขอนี้ถูกปฏิเสธ</span>
                    </div>
                    <p className="mt-1 text-xs text-foreground">
                      <strong>เหตุผล:</strong> {detailPayment.rejectionReason || "ไม่ระบุ"}
                    </p>
                    {detailPayment.approvedBy && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        ผู้พิจารณา: {detailPayment.approvedBy} เมื่อ {detailPayment.approvedAt ? formatShortDate(detailPayment.approvedAt) : "-"}
                      </p>
                    )}
                  </div>
                )}

                {detailPayment.status === "อนุมัติจ่ายแล้ว" && (
                  <div className="rounded-lg border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/20 p-3 text-sm text-emerald-800 dark:text-emerald-300">
                    <div className="flex items-center gap-2 font-semibold">
                      <CheckCircle2 className="size-4" />
                      <span>อนุมัติจ่ายเงินเรียบร้อยแล้ว</span>
                    </div>
                    <p className="text-xs mt-0.5">
                      อนุมัติโดย: {detailPayment.approvedBy || "ผู้จัดการร้าน"} ({detailPayment.approvedAt ? formatShortDate(detailPayment.approvedAt) : "-"})
                    </p>
                  </div>
                )}

                {/* Attached Document Mockup */}
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                    <Paperclip className="size-3.5" />
                    <span>เอกสารแนบและหลักฐานประกอบการเบิกจ่าย</span>
                  </h4>
                  <div className="rounded-lg border border-border p-3 flex items-center justify-between bg-card">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded bg-muted flex items-center justify-center text-muted-foreground">
                        <FileText className="size-5" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-foreground">
                          {detailPayment.receiptFileName || (detailPayment as any).receiptAttachment || (detailPayment.receiptNumber ? `ใบแจ้งหนี้_${detailPayment.receiptNumber}.pdf` : `ใบแจ้งหนี้_${detailPayment.poNumber || detailPayment.id}.pdf`)}
                        </div>
                        <div className="text-xs text-muted-foreground">เอกสารรับรองยอดเงินและลายมือชื่อ</div>
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" className="text-xs">
                      <ExternalLink className="size-3.5 mr-1" /> ดูตัวอย่าง
                    </Button>
                  </div>
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0 mt-2">
                <Button variant="outline" onClick={() => setDetailPayment(null)}>
                  ปิดหน้าต่าง
                </Button>
                {detailPayment.status === "รออนุมัติจ่าย" && (
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      onClick={() => handleOpenReject(detailPayment)}
                    >
                      <Ban className="size-4 mr-1.5" />
                      ปฏิเสธคำขอ
                    </Button>
                    <Button
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => handleOpenApprove(detailPayment)}
                    >
                      <CheckCircle2 className="size-4 mr-1.5" />
                      อนุมัติการจ่ายเงิน
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
        title={`ยืนยันอนุมัติจ่ายเงิน ${targetPayment?.id || (targetPayment as any)?.requestNumber}?`}
        description={
          targetPayment ? (
            <div className="space-y-2 text-sm">
              <p>
                คุณกำลังจะอนุมัติจ่ายเงินให้แก่ <strong>{targetPayment.supplierName || (targetPayment as any).companyName || (targetPayment as any).payee}</strong> {targetPayment.agentName ? `(ตัวแทน: ${targetPayment.agentName})` : ""}
              </p>
              <p className="text-base font-semibold text-primary">
                ยอดเงิน: ฿{formatNumber(targetPayment.amount)} ({targetPayment.paymentType})
              </p>
              <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
                * เมื่ออนุมัติแล้ว แผนกบัญชีและการเงินจะดำเนินการโอนเงินหรือเบิกจ่ายเงินสดตามกำหนด
              </p>
            </div>
          ) : ""
        }
        confirmText="อนุมัติการจ่ายเงิน"
        confirmTone="success"
        onConfirm={handleApprove}
      />

      {/* Rejection Dialog with Mandatory Reason */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-5" />
              <span>ปฏิเสธคำขอจ่ายเงิน</span>
            </DialogTitle>
            <DialogDescription>
              {targetPayment?.id || (targetPayment as any)?.requestNumber} ({targetPayment?.supplierName || (targetPayment as any)?.companyName || (targetPayment as any)?.payee})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="rejectReason">เหตุผลในการปฏิเสธ <span className="text-destructive">*</span></Label>
              <Textarea
                id="rejectReason"
                rows={3}
                placeholder="เช่น เอกสารใบแจ้งหนี้ไม่ตรงกับ PO, บัญชีธนาคารไม่ถูกต้อง ฯลฯ"
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
              ยืนยันปฏิเสธคำขอ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

