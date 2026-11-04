import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  AlertCircle,
  Banknote,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Eye,
  FileCheck,
  FileText,
  FileUp,
  Image,
  Paperclip,
  Plus,
  Receipt,
  Upload,
  User,
  XCircle,
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
import { useStore, selectPendingPaymentRequests } from "@/lib/store";
import type { PaymentRequest, PaymentType, PaymentRequestStatus, AgentReceipt } from "@/lib/mock-data";

export const Route = createFileRoute("/_admin/purchasing/payments")({
  head: () => ({
    meta: [
      { title: "ขออนุมัติจ่ายเงินและบันทึกการจ่ายเงิน — ร้านรุ่งอรุณ มินิมาร์ท" },
      { name: "description", content: "ขออนุมัติจ่ายเงินตาม PO เลือกเงินสด/เงินเชื่อ แนบใบเสร็จตัวแทนจำหน่าย" },
      { property: "og:title", content: "ขออนุมัติจ่ายเงินและบันทึกการจ่ายเงิน — ร้านรุ่งอรุณ มินิมาร์ท" },
      { property: "og:description", content: "ขออนุมัติจ่ายเงินตาม PO เลือกเงินสด/เงินเชื่อ แนบใบเสร็จตัวแทนจำหน่าย" },
    ],
  }),
  component: PaymentsPage,
});

function PaymentsPage() {
  const { state, actions } = useStore();

  const [activeTab, setActiveTab] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [detailReq, setDetailReq] = useState<PaymentRequest | null>(null);

  // Form State
  const [selectedPOId, setSelectedPOId] = useState("");
  const [paymentType, setPaymentType] = useState<PaymentType>("เงินเชื่อ");
  const [creditDays, setCreditDays] = useState("30");
  const [dueDate, setDueDate] = useState("");
  const [cashVerified, setCashVerified] = useState(false);
  const [receiptNumber, setReceiptNumber] = useState("");
  const [receiptFileName, setReceiptFileName] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Receipt Upload Dialog for existing payment request
  const [uploadReceiptOpen, setUploadReceiptOpen] = useState(false);
  const [targetReqForUpload, setTargetReqForUpload] = useState<PaymentRequest | null>(null);
  const [upReceiptNo, setUpReceiptNo] = useState("");
  const [upFileName, setUpFileName] = useState("");

  const selectedPO = useMemo(() => {
    return state.purchaseOrders.find((p) => p.id === selectedPOId);
  }, [state.purchaseOrders, selectedPOId]);

  const openCreateDialog = () => {
    const defaultPO = state.purchaseOrders[0];
    setSelectedPOId(defaultPO?.id ?? "");
    setPaymentType("เงินเชื่อ");
    setCreditDays("30");
    const d = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    setDueDate(d.toISOString().split("T")[0]);
    setCashVerified(defaultPO?.status === "รับครบแล้ว");
    setReceiptNumber("");
    setReceiptFileName("");
    setNote("");
    setErrors({});
    setCreateOpen(true);
  };

  const handlePOChange = (poId: string) => {
    setSelectedPOId(poId);
    const po = state.purchaseOrders.find((p) => p.id === poId);
    if (po) {
      if (po.paymentType) setPaymentType(po.paymentType);
      if (po.creditTermDays) setCreditDays(po.creditTermDays.toString());
      setCashVerified(po.status === "รับครบแล้ว");
    }
  };

  const handlePaymentTypeChange = (type: PaymentType) => {
    setPaymentType(type);
    if (type === "เงินสด" && selectedPO) {
      setCashVerified(selectedPO.status === "รับครบแล้ว");
    }
  };

  // Mock File Selection
  const handleSelectMockFile = (filename: string) => {
    setReceiptFileName(filename);
    if (!receiptNumber) {
      setReceiptNumber(`INV-${Date.now().toString().slice(-6)}`);
    }
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!selectedPOId) errs.poId = "กรุณาเลือกใบสั่งซื้อ (PO)";
    if (paymentType === "เงินเชื่อ" && !dueDate) {
      errs.dueDate = "กรุณาระบุวันครบกำหนดชำระเงินเชื่อ";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSavePaymentRequest = () => {
    if (!validate()) return;
    if (!selectedPO) return;

    let receiptId: string | undefined = undefined;
    if (receiptFileName) {
      const newReceipt = actions.uploadAgentReceipt({
        receiptNumber: receiptNumber.trim() || `INV-${Date.now().toString().slice(-6)}`,
        companyId: selectedPO.companyId ?? "COMP-01",
        companyName: selectedPO.supplierName,
        agentName: selectedPO.agentName,
        poId: selectedPO.id,
        poNumber: selectedPO.poNumber,
        amount: selectedPO.totalAmount,
        issueDate: new Date().toISOString(),
        fileName: receiptFileName,
        fileSize: "450 KB",
        fileType: receiptFileName.endsWith(".pdf") ? "pdf" : "image",
        status: "ถูกต้อง",
        note: note.trim() || undefined,
      });
      receiptId = newReceipt.receipt?.id;
    }

    const calculatedDueDate =
      paymentType === "เงินเชื่อ"
        ? dueDate || new Date(Date.now() + parseInt(creditDays) * 24 * 60 * 60 * 1000).toISOString()
        : undefined;

    actions.requestPayment({
      poId: selectedPO.id,
      poNumber: selectedPO.poNumber,
      supplierName: selectedPO.supplierName,
      companyId: selectedPO.companyId,
      agentName: selectedPO.agentName,
      paymentType,
      amount: selectedPO.totalAmount,
      dueDate: calculatedDueDate,
      creditDays: paymentType === "เงินเชื่อ" ? parseInt(creditDays) : undefined,
      cashConditionVerified: paymentType === "เงินสด" ? cashVerified : undefined,
      receiptId,
      receiptNumber: receiptNumber.trim() || undefined,
      receiptFileName: receiptFileName || undefined,
      note: note.trim() || undefined,
    });

    toast.success(`สร้างคำขออนุมัติจ่ายเงินสำหรับ PO ${selectedPO.poNumber} สำเร็จ`);
    setCreateOpen(false);
  };

  // Manager Approval Simulation
  const handleApprovePayment = (id: string) => {
    actions.decidePaymentRequest(id, "อนุมัติจ่ายแล้ว");
    toast.success("ผู้จัดการอนุมัติคำขอเบิกจ่ายเรียบร้อยแล้ว");
    if (detailReq?.id === id) {
      setDetailReq({ ...detailReq, status: "อนุมัติจ่ายแล้ว" });
    }
  };

  const handleMarkPaid = (id: string) => {
    actions.decidePaymentRequest(id, "จ่ายเงินแล้ว");
    toast.success("บันทึกการชำระเงินเรียบร้อยแล้ว");
    if (detailReq?.id === id) {
      setDetailReq({ ...detailReq, status: "จ่ายเงินแล้ว", paidAt: new Date().toISOString() });
    }
  };

  const handleOpenUploadReceipt = (req: PaymentRequest) => {
    setTargetReqForUpload(req);
    setUpReceiptNo(`INV-RCP-${Date.now().toString().slice(-4)}`);
    setUpFileName(`ใบเสร็จ_${req.poNumber}.pdf`);
    setUploadReceiptOpen(true);
  };

  const handleSaveUploadReceipt = () => {
    if (!targetReqForUpload) return;
    actions.uploadAgentReceipt(
      {
        receiptNumber: upReceiptNo.trim(),
        companyId: targetReqForUpload.companyId ?? "COMP-01",
        companyName: targetReqForUpload.supplierName,
        agentName: targetReqForUpload.agentName,
        poId: targetReqForUpload.poId,
        poNumber: targetReqForUpload.poNumber,
        amount: targetReqForUpload.amount,
        issueDate: new Date().toISOString(),
        fileName: upFileName.trim(),
        fileSize: "680 KB",
        fileType: "pdf",
        status: "ถูกต้อง",
        note: "อัปโหลดใบเสร็จ/ใบกำกับภาษีเพิ่มเติม",
      },
      targetReqForUpload.id,
    );

    toast.success("อัปโหลดและผูกใบเสร็จรับเงินเรียบร้อยแล้ว");
    setUploadReceiptOpen(false);
    if (detailReq?.id === targetReqForUpload.id) {
      setDetailReq({
        ...detailReq,
        receiptNumber: upReceiptNo.trim(),
        receiptFileName: upFileName.trim(),
      });
    }
  };

  // Filtered Payments
  const filteredRequests = useMemo(() => {
    if (activeTab === "all") return state.paymentRequests;
    if (activeTab === "cash") return state.paymentRequests.filter((p) => p.paymentType === "เงินสด");
    if (activeTab === "credit") return state.paymentRequests.filter((p) => p.paymentType === "เงินเชื่อ");
    if (activeTab === "pending") return state.paymentRequests.filter((p) => p.status === "รออนุมัติจ่าย");
    if (activeTab === "approved") return state.paymentRequests.filter((p) => p.status === "อนุมัติจ่ายแล้ว");
    if (activeTab === "paid") return state.paymentRequests.filter((p) => p.status === "จ่ายเงินแล้ว");
    return state.paymentRequests;
  }, [state.paymentRequests, activeTab]);

  // Metrics
  const pendingCount = state.paymentRequests.filter((p) => p.status === "รออนุมัติจ่าย").length;
  const approvedCount = state.paymentRequests.filter((p) => p.status === "อนุมัติจ่ายแล้ว").length;
  const paidCount = state.paymentRequests.filter((p) => p.status === "จ่ายเงินแล้ว").length;
  const totalAmount = state.paymentRequests.reduce((sum, p) => sum + p.amount, 0);

  const columns: DataTableColumn<PaymentRequest>[] = [
    {
      id: "id",
      header: "รหัสคำขอ",
      accessor: (p) => (
        <span className="font-mono text-xs font-bold text-sun-700">{p.id}</span>
      ),
      className: "w-28",
    },
    {
      id: "po",
      header: "เลขที่ PO",
      accessor: (p) => (
        <div>
          <span className="font-mono text-xs font-semibold text-foreground">{p.poNumber}</span>
          <div className="text-xs text-muted-foreground mt-0.5 truncate max-w-[160px]">{p.supplierName}</div>
        </div>
      ),
      className: "w-44",
    },
    {
      id: "type",
      header: "ประเภทการชำระ",
      accessor: (p) => (
        <Badge
          variant="outline"
          className={`text-xs font-medium px-2 py-0.5 ${
            p.paymentType === "เงินสด"
              ? "bg-blue-50 text-blue-700 border-blue-200"
              : "bg-indigo-50 text-indigo-700 border-indigo-200"
          }`}
        >
          {p.paymentType}
        </Badge>
      ),
      className: "w-28 text-center",
    },
    {
      id: "condition",
      header: "เงื่อนไข / ครบกำหนด",
      accessor: (p) => (
        <div className="text-xs space-y-0.5">
          {p.paymentType === "เงินสด" ? (
            <div className="flex items-center gap-1 text-muted-foreground">
              <CheckCircle2 className={`size-3.5 ${p.cashConditionVerified ? "text-green-600" : "text-amber-500"}`} />
              <span>{p.cashConditionVerified ? "ตรวจรับครบแล้ว" : "รอตรวจรับสินค้า"}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-foreground">
              <Calendar className="size-3.5 text-muted-foreground" />
              <span>ครบกำหนด: {p.dueDate ? formatShortDate(p.dueDate) : `${p.creditDays ?? 30} วัน`}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      id: "amount",
      header: "จำนวนเงิน",
      align: "right",
      accessor: (p) => (
        <span className="font-semibold text-foreground">
          <Money value={p.amount} />
        </span>
      ),
      className: "w-28",
    },
    {
      id: "receipt",
      header: "ใบเสร็จตัวแทน",
      accessor: (p) => {
        if (!p.receiptFileName) {
          return (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleOpenUploadReceipt(p)}
              className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1 p-1"
            >
              <Upload className="size-3" />
              <span>แนบใบเสร็จ</span>
            </Button>
          );
        }
        return (
          <div className="flex items-center gap-1.5 text-xs text-green-700">
            <FileCheck className="size-3.5" />
            <span className="truncate max-w-[120px]" title={p.receiptFileName}>
              {p.receiptNumber || p.receiptFileName}
            </span>
          </div>
        );
      },
      className: "w-36",
    },
    {
      id: "status",
      header: "สถานะการอนุมัติ",
      accessor: (p) => <StatusBadge status={p.status} />,
      className: "w-32",
    },
    {
      id: "actions",
      header: "การกระทำ",
      align: "right",
      accessor: (p) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={() => setDetailReq(p)}
            title="ดูรายละเอียดการจ่ายเงิน"
          >
            <Eye className="size-3.5 mr-1" />
            <span>ดูข้อมูล</span>
          </Button>
        </div>
      ),
      className: "w-24",
    },
  ];

  return (
    <>
      <PageHeader
        title="ขออนุมัติจ่ายเงินและบันทึกการจ่ายเงิน"
        description="ขออนุมัติจ่ายเงินตามใบสั่งซื้อ (PO) เลือกชำระเงินสดหลังตรวจรับ หรือเงินเชื่อตามกำหนด และแนบใบเสร็จตัวแทนจำหน่าย"
        actions={
          <Button onClick={openCreateDialog} className="gap-2 shadow-xs">
            <Plus className="size-4" />
            <span>สร้างคำขออนุมัติจ่ายเงิน</span>
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Clock}
          label="รอผู้จัดการอนุมัติจ่าย"
          value={formatNumber(pendingCount)}
          tone="warning"
          hint="ส่งเรื่องเบิกจ่ายแล้ว"
        />
        <StatCard
          icon={CheckCircle2}
          label="อนุมัติจ่ายแล้ว"
          value={formatNumber(approvedCount)}
          tone="teal"
          hint="พร้อมสำหรับการจ่ายเงิน"
        />
        <StatCard
          icon={Banknote}
          label="จ่ายเงินเรียบร้อย"
          value={formatNumber(paidCount)}
          tone="success"
          hint="บันทึกจ่ายแล้วเสร็จ"
        />
        <StatCard
          icon={CreditCard}
          label="ยอดเบิกจ่ายรวม"
          value={<Money value={totalAmount} decimals={false} />}
          tone="info"
          hint="คำขอเบิกจ่ายทั้งหมด"
        />
      </div>

      <div className="mb-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="all" className="text-xs">
              ทั้งหมด ({state.paymentRequests.length})
            </TabsTrigger>
            <TabsTrigger value="pending" className="text-xs">
              รออนุมัติ ({pendingCount})
            </TabsTrigger>
            <TabsTrigger value="approved" className="text-xs">
              อนุมัติแล้ว ({approvedCount})
            </TabsTrigger>
            <TabsTrigger value="paid" className="text-xs">
              จ่ายแล้ว ({paidCount})
            </TabsTrigger>
            <TabsTrigger value="cash" className="text-xs">
              เงินสด
            </TabsTrigger>
            <TabsTrigger value="credit" className="text-xs">
              เงินเชื่อ
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <DataTable
        columns={columns}
        data={filteredRequests}
        searchKey="poNumber"
        searchPlaceholder="ค้นหาเลขที่ PO, รหัสคำขอ, บริษัทคู่ค้า..."
        emptyMessage="ไม่พบข้อมูลคำขออนุมัติจ่ายเงิน"
      />

      {/* Detail Dialog */}
      <Dialog open={Boolean(detailReq)} onOpenChange={(open) => !open && setDetailReq(null)}>
        <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
          <DialogHeader className="border-b pb-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-base text-foreground">
                  รายละเอียดคำขออนุมัติจ่ายเงิน
                </span>
                <span className="ml-2 font-mono text-xs font-bold text-sun-700 bg-sun-50 px-2 py-0.5 rounded">
                  {detailReq?.id}
                </span>
              </div>
              {detailReq && <StatusBadge status={detailReq.status} />}
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              คำขอเบิกจ่ายเงินตามใบสั่งซื้อ {detailReq?.poNumber} · บริษัท {detailReq?.supplierName}
            </DialogDescription>
          </DialogHeader>

          {detailReq && (
            <div className="space-y-4 pt-2 text-xs">
              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-4 rounded-lg border bg-muted/20 p-3.5">
                <div className="space-y-1.5">
                  <div><span className="text-muted-foreground">ใบสั่งซื้อ: </span><span className="font-mono font-bold text-foreground">{detailReq.poNumber}</span></div>
                  <div><span className="text-muted-foreground">บริษัทคู่ค้า: </span><span className="font-semibold">{detailReq.supplierName}</span></div>
                  <div><span className="text-muted-foreground">ตัวแทนผู้ติดต่อ: </span><span>{detailReq.agentName ?? "-"}</span></div>
                  <div><span className="text-muted-foreground">ผู้ยื่นคำขอ: </span><span>{detailReq.requestedBy}</span> ({formatShortDate(detailReq.requestedAt)})</div>
                </div>

                <div className="space-y-1.5">
                  <div>
                    <span className="text-muted-foreground">ประเภทการชำระ: </span>
                    <Badge variant="outline" className="font-medium text-xs ml-1">
                      {detailReq.paymentType}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground">ยอดเงินที่ขอเบิกจ่าย: </span>
                    <span className="font-bold text-sm text-sun-700 ml-1">
                      <Money value={detailReq.amount} />
                    </span>
                  </div>
                  {detailReq.paymentType === "เงินเชื่อ" && (
                    <div>
                      <span className="text-muted-foreground">วันครบกำหนดชำระ: </span>
                      <span className="font-medium text-foreground">{detailReq.dueDate ? formatShortDate(detailReq.dueDate) : "-"}</span>
                    </div>
                  )}
                  {detailReq.paymentType === "เงินสด" && (
                    <div>
                      <span className="text-muted-foreground">เงื่อนไขเงินสด: </span>
                      <span className="text-green-700 font-medium">ตรวจรับสินค้าเข้าคลังครบถ้วนแล้ว</span>
                    </div>
                  )}
                  {detailReq.approvedBy && (
                    <div className="pt-1 border-t text-green-700">
                      <span>ผู้อนุมัติ: </span>
                      <span className="font-semibold">{detailReq.approvedBy}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Receipt / Invoice Section */}
              <div className="rounded-lg border p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                    <Receipt className="size-4 text-sun-600" />
                    <span>หลักฐานใบเสร็จ / ใบกำกับภาษีจากตัวแทนจำหน่าย</span>
                  </div>
                  {!detailReq.receiptFileName && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenUploadReceipt(detailReq)}
                      className="h-7 text-xs gap-1"
                    >
                      <Upload className="size-3" />
                      <span>อัปโหลดใบเสร็จ</span>
                    </Button>
                  )}
                </div>

                {detailReq.receiptFileName ? (
                  <div className="flex items-center justify-between rounded-md border bg-muted/40 p-2.5">
                    <div className="flex items-center gap-2">
                      <Paperclip className="size-4 text-sun-600" />
                      <div>
                        <div className="font-medium text-foreground">{detailReq.receiptFileName}</div>
                        <div className="text-[11px] text-muted-foreground">
                          เลขที่ใบเสร็จ: {detailReq.receiptNumber || "-"} · ตรวจสอบเอกสารแล้ว
                        </div>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-green-700 bg-green-50 border-green-200">
                      แนบเอกสารแล้ว
                    </Badge>
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed p-4 text-center text-muted-foreground">
                    ยังไม่ได้แนบใบเสร็จรับเงินหรือใบกำกับภาษีจากตัวแทนจำหน่าย
                  </div>
                )}
              </div>

              {detailReq.note && (
                <div className="text-muted-foreground bg-muted/20 rounded p-2.5">
                  <span className="font-semibold text-foreground">หมายเหตุเพิ่มเติม: </span>
                  {detailReq.note}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 border-t pt-3">
                {detailReq.status === "รออนุมัติจ่าย" && (
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white gap-1.5 text-xs"
                    onClick={() => handleApprovePayment(detailReq.id)}
                  >
                    <CheckCircle2 className="size-3.5" />
                    <span>จำลองผู้อนุมัติ (ผู้จัดการ)</span>
                  </Button>
                )}

                {detailReq.status === "อนุมัติจ่ายแล้ว" && (
                  <Button
                    size="sm"
                    className="bg-sun-600 hover:bg-sun-700 text-white gap-1.5 text-xs"
                    onClick={() => handleMarkPaid(detailReq.id)}
                  >
                    <Banknote className="size-3.5" />
                    <span>บันทึกจ่ายเงินสำเร็จ</span>
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Payment Request Dialog */}
      <FormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="สร้างคำขออนุมัติจ่ายเงินตามใบสั่งซื้อ"
        description="เลือกใบสั่งซื้อ (PO) กำหนดเงื่อนไขเงินสดหรือเงินเชื่อ และแนบเอกสารใบเสร็จตัวแทน"
        confirmLabel="ส่งขออนุมัติจ่ายเงิน"
        onConfirm={handleSavePaymentRequest}
      >
        <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          <Field label="เลือกใบสั่งซื้อ (PO)" required error={errors.poId}>
            <Select value={selectedPOId} onValueChange={handlePOChange}>
              <SelectTrigger>
                <SelectValue placeholder="เลือกใบสั่งซื้อ" />
              </SelectTrigger>
              <SelectContent>
                {state.purchaseOrders.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.poNumber} — {p.supplierName} (฿{p.totalAmount.toLocaleString()} · สถานะรับของ: {p.status})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {selectedPO && (
            <div className="rounded-lg border bg-sun-50/50 p-3 text-xs space-y-1">
              <div><span className="text-muted-foreground">บริษัทคู่ค้า: </span><span className="font-semibold text-sun-900">{selectedPO.supplierName}</span></div>
              <div><span className="text-muted-foreground">ตัวแทนประสานงาน: </span><span>{selectedPO.agentName ?? "ตัวแทนฝ่ายขาย"}</span></div>
              <div><span className="text-muted-foreground">ยอดเงินตาม PO: </span><span className="font-bold text-sm text-sun-700">฿{selectedPO.totalAmount.toLocaleString()}</span></div>
              <div><span className="text-muted-foreground">สถานะการรับของ: </span><Badge variant="secondary" className="text-[11px] font-normal">{selectedPO.status}</Badge></div>
            </div>
          )}

          {/* Payment Type Selection (เงินสด vs เงินเชื่อ) */}
          <Field label="ประเภทและเงื่อนไขการชำระเงิน" required>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => handlePaymentTypeChange("เงินสด")}
                className={`flex flex-col items-start rounded-lg border p-3 text-left transition-colors ${
                  paymentType === "เงินสด"
                    ? "border-blue-500 bg-blue-50/60 text-blue-900"
                    : "border-border bg-card hover:bg-accent text-foreground"
                }`}
              >
                <div className="font-bold text-xs flex items-center gap-1.5 mb-1">
                  <Banknote className="size-4 text-blue-600" />
                  <span>เงินสด (Cash)</span>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  เบิกจ่ายเมื่อฝ่ายคลังสินค้าตรวจรับสินค้าครบถ้วนสมบูรณ์แล้ว
                </div>
              </button>

              <button
                type="button"
                onClick={() => handlePaymentTypeChange("เงินเชื่อ")}
                className={`flex flex-col items-start rounded-lg border p-3 text-left transition-colors ${
                  paymentType === "เงินเชื่อ"
                    ? "border-indigo-500 bg-indigo-50/60 text-indigo-900"
                    : "border-border bg-card hover:bg-accent text-foreground"
                }`}
              >
                <div className="font-bold text-xs flex items-center gap-1.5 mb-1">
                  <CreditCard className="size-4 text-indigo-600" />
                  <span>เงินเชื่อ (Credit)</span>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  ชำระตามรอบเครดิตเทอมและวันครบกำหนดชำระ
                </div>
              </button>
            </div>
          </Field>

          {/* Conditional Fields based on Payment Type */}
          {paymentType === "เงินสด" ? (
            <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3 text-xs text-blue-900 space-y-2">
              <div className="font-semibold flex items-center gap-1.5">
                <AlertCircle className="size-4 text-blue-700" />
                <span>เงื่อนไขการจ่ายเงินสด:</span>
              </div>
              <p className="text-muted-foreground text-[11px]">
                ตามระเบียบจัดซื้อ การจ่ายเงินสดจะกระทำได้ต่อเมื่อฝ่ายคลังสินค้าได้ตรวจรับมอบสินค้าเข้าคลังครบถ้วนถูกต้องแล้วเท่านั้น
              </p>
              <div className="flex items-center gap-2 pt-1 font-medium">
                <input
                  type="checkbox"
                  id="cash-verify"
                  checked={cashVerified}
                  onChange={(e) => setCashVerified(e.target.checked)}
                  className="rounded border-input text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="cash-verify" className="cursor-pointer text-xs">
                  ยืนยันว่าได้ตรวจสอบผลการตรวจรับสินค้าจากหน้าคลังสินค้าแล้ว (สถานะ PO: {selectedPO?.status})
                </label>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Field label="เครดิตเทอม (วัน)">
                <Input
                  type="number"
                  min={1}
                  value={creditDays}
                  onChange={(e) => {
                    const days = parseInt(e.target.value) || 30;
                    setCreditDays(days.toString());
                    const d = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
                    setDueDate(d.toISOString().split("T")[0]);
                  }}
                />
              </Field>
              <Field label="วันครบกำหนดชำระ (Due Date)" required error={errors.dueDate}>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </Field>
            </div>
          )}

          {/* Upload Agent Receipt Section */}
          <div className="space-y-2 border-t pt-3">
            <div className="font-semibold text-xs text-foreground">
              แนบเอกสารใบเสร็จ / ใบกำกับภาษีจากตัวแทนจำหน่าย
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="เลขที่ใบเสร็จ / ใบกำกับภาษี">
                <Input
                  value={receiptNumber}
                  onChange={(e) => setReceiptNumber(e.target.value)}
                  placeholder="เช่น INV-SP-691104"
                />
              </Field>
              <Field label="เลือกไฟล์เอกสาร (จำลองการอัปโหลด)">
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={receiptFileName}
                    placeholder="ยังไม่ได้เลือกไฟล์"
                    className="bg-muted/40 text-xs"
                  />
                </div>
              </Field>
            </div>

            {/* Quick Mock Upload Buttons */}
            <div className="rounded-lg border border-dashed p-3 text-center bg-muted/20">
              <div className="text-xs text-muted-foreground mb-2 flex items-center justify-center gap-1">
                <Upload className="size-3.5" />
                <span>คลิกปุ่มเพื่อจำลองการเลือกไฟล์เอกสารจากตัวแทน:</span>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleSelectMockFile(`ใบกำกับภาษี_${selectedPO?.supplierName.slice(0, 10)}.pdf`)}
                  className="text-xs h-7 gap-1"
                >
                  <FileText className="size-3" />
                  <span>ใบกำกับภาษี.pdf</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleSelectMockFile(`ใบเสร็จรับเงิน_${selectedPO?.poNumber}.jpg`)}
                  className="text-xs h-7 gap-1"
                >
                  <Image className="size-3" />
                  <span>ใบเสร็จรับเงิน.jpg</span>
                </Button>
              </div>
            </div>
          </div>

          <Field label="หมายเหตุ">
            <Textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="ข้อความถึงผู้จัดการ เช่น วางบิลรอบสิ้นเดือน หรือแนบสลิปโอนแล้ว"
            />
          </Field>
        </div>
      </FormDialog>

      {/* Upload Receipt Dialog for existing payment request */}
      <FormDialog
        open={uploadReceiptOpen}
        onOpenChange={setUploadReceiptOpen}
        title={`อัปโหลดใบเสร็จรับเงิน: ${targetReqForUpload?.id}`}
        description="แนบเอกสารหลักฐานใบเสร็จหรือใบกำกับภาษีที่ได้รับจากตัวแทนจำหน่าย"
        confirmLabel="บันทึกเอกสาร"
        onConfirm={handleSaveUploadReceipt}
      >
        <div className="space-y-3.5">
          <Field label="เลขที่ใบเสร็จรับเงิน / ใบกำกับภาษี" required>
            <Input
              value={upReceiptNo}
              onChange={(e) => setUpReceiptNo(e.target.value)}
              placeholder="INV-123456"
            />
          </Field>
          <Field label="ชื่อไฟล์เอกสาร">
            <Input
              value={upFileName}
              onChange={(e) => setUpFileName(e.target.value)}
              placeholder="ใบเสร็จ.pdf"
            />
          </Field>
        </div>
      </FormDialog>
    </>
  );
}

