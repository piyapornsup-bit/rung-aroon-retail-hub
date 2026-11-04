import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  Archive,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  FileCheck,
  FileText,
  FolderCheck,
  Receipt,
  Search,
  ShieldCheck,
  Sparkles,
  User,
  ZoomIn,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { StatCard } from "@/components/admin/StatCard";
import { Money } from "@/components/admin/Money";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatNumber, formatShortDate } from "@/lib/format";
import { useStore, selectPendingAgentReceipts, selectArchivedAgentReceipts } from "@/lib/store";
import type { AgentReceipt } from "@/lib/mock-data";

export const Route = createFileRoute("/_admin/owner/receipts")({
  head: () => ({
    meta: [
      { title: "ตรวจสอบและจัดเก็บใบเสร็จจากตัวแทน — ร้านรุ่งอรุณ มินิมาร์ท" },
      { name: "description", content: "ตรวจสอบใบเสร็จรับเงิน/ใบกำกับภาษีจากตัวแทนจำหน่ายและจัดเก็บเข้าแฟ้มบัญชี" },
      { property: "og:title", content: "ตรวจสอบและจัดเก็บใบเสร็จจากตัวแทน — ร้านรุ่งอรุณ มินิมาร์ท" },
      { property: "og:description", content: "ตรวจสอบใบเสร็จรับเงิน/ใบกำกับภาษีจากตัวแทนจำหน่ายและจัดเก็บเข้าแฟ้มบัญชี" },
    ],
  }),
  component: OwnerReceiptsPage,
});

function OwnerReceiptsPage() {
  const { state, actions } = useStore();
  const receipts = state.agentReceipts;

  const [activeTab, setActiveTab] = useState<string>("pending");
  const [detailReceipt, setDetailReceipt] = useState<AgentReceipt | null>(null);
  const [confirmArchiveTarget, setConfirmArchiveTarget] = useState<AgentReceipt | null>(null);

  const pendingReceipts = useMemo(
    () => receipts.filter((r) => r.archiveStatus !== "จัดเก็บแล้ว"),
    [receipts],
  );
  const archivedReceipts = useMemo(
    () => receipts.filter((r) => r.archiveStatus === "จัดเก็บแล้ว"),
    [receipts],
  );

  const totalAmount = useMemo(
    () => receipts.reduce((sum, r) => sum + (r.amount ?? r.totalAmount ?? 0), 0),
    [receipts],
  );

  const uniqueCompanies = useMemo(
    () => new Set(receipts.map((r) => r.companyName)).size,
    [receipts],
  );

  const filteredData = useMemo(() => {
    switch (activeTab) {
      case "pending":
        return pendingReceipts;
      case "archived":
        return archivedReceipts;
      default:
        return receipts;
    }
  }, [receipts, activeTab, pendingReceipts, archivedReceipts]);

  const handleArchive = (receipt: AgentReceipt) => {
    const res = actions.archiveAgentReceipt(receipt.id);
    if (res.ok) {
      toast.success(`จัดเก็บใบเสร็จ ${receipt.receiptNumber} เข้าแฟ้มเรียบร้อยแล้ว`, {
        description: `บันทึกโดย ${state.session.user.name} เมื่อสักครู่`,
      });
      setConfirmArchiveTarget(null);
      if (detailReceipt && detailReceipt.id === receipt.id) {
        setDetailReceipt({
          ...detailReceipt,
          archiveStatus: "จัดเก็บแล้ว",
          archivedAt: new Date().toISOString(),
          archivedBy: state.session.user.name,
        });
      }
    }
  };

  const columns: DataTableColumn<AgentReceipt>[] = [
    {
      id: "receiptNumber",
      header: "เลขที่ใบเสร็จ / อ้างอิง",
      accessor: (r) => (
        <div>
          <span className="font-semibold text-foreground">{r.receiptNumber}</span>
          <div className="text-xs text-muted-foreground">รหัสระบบ: {r.id}</div>
        </div>
      ),
      sortable: true,
      searchable: true,
    },
    {
      id: "receiptDate",
      header: "วันที่ออกเอกสาร",
      accessor: (r) => (
        <span className="text-xs text-muted-foreground">
          {formatShortDate(r.issueDate ?? r.receiptDate)}
        </span>
      ),
      sortable: true,
    },
    {
      id: "company",
      header: "บริษัทคู่ค้าและตัวแทน",
      accessor: (r) => (
        <div>
          <div className="font-medium text-foreground">{r.companyName}</div>
          <div className="text-xs text-muted-foreground">ตัวแทน: {r.agentName}</div>
        </div>
      ),
      searchable: true,
    },
    {
      id: "references",
      header: "อ้างอิง PO / ขอจ่าย",
      accessor: (r) => (
        <div className="text-xs space-y-0.5">
          {r.poNumber && <div className="text-primary font-medium">PO: {r.poNumber}</div>}
          {r.paymentRequestId && (
            <div className="text-muted-foreground">คำขอจ่าย: {r.paymentRequestId}</div>
          )}
        </div>
      ),
    },
    {
      id: "taxId",
      header: "เลขประจำตัวผู้เสียภาษี",
      accessor: (r) => (
        <span className="font-mono text-xs text-muted-foreground">
          {r.taxId || "-"}
        </span>
      ),
    },
    {
      id: "totalAmount",
      header: "ยอดเงินรวม",
      accessor: (r) => (
        <span className="font-semibold text-foreground">
          <Money value={r.amount ?? r.totalAmount ?? 0} />
        </span>
      ),
      sortable: true,
    },
    {
      id: "archiveStatus",
      header: "สถานะการจัดเก็บ",
      accessor: (r) => {
        const isArchived = r.archiveStatus === "จัดเก็บแล้ว";
        return (
          <Badge
            variant="outline"
            className={
              isArchived
                ? "border-emerald-500/40 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/20"
                : "border-amber-500/40 text-amber-700 bg-amber-50 dark:bg-amber-950/20"
            }
          >
            {isArchived ? (
              <FolderCheck className="size-3 mr-1 inline text-emerald-600" />
            ) : (
              <Clock className="size-3 mr-1 inline text-amber-600" />
            )}
            {r.archiveStatus || "รอจัดเก็บ"}
          </Badge>
        );
      },
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
              setDetailReceipt(r);
            }}
          >
            <Eye className="size-3.5 mr-1" />
            ดูเอกสาร
          </Button>
          {r.archiveStatus !== "จัดเก็บแล้ว" && (
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={(e) => {
                e.stopPropagation();
                setConfirmArchiveTarget(r);
              }}
            >
              <FolderCheck className="size-3.5 mr-1" />
              จัดเก็บแล้ว
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="ตรวจสอบและจัดเก็บใบเสร็จจากตัวแทน"
        description="ตรวจสอบความถูกต้องของใบเสร็จรับเงิน/ใบกำกับภาษีจากบริษัทคู่ค้า และบันทึกจัดเก็บเข้าแฟ้มบัญชี"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
        <StatCard
          icon={Clock}
          label="ใบเสร็จรอจัดเก็บ"
          value={`${pendingReceipts.length} ฉบับ`}
          tone={pendingReceipts.length > 0 ? "warning" : "teal"}
          hint="รอตรวจสอบความถูกต้อง"
        />
        <StatCard
          icon={FolderCheck}
          label="จัดเก็บเข้าแฟ้มแล้ว"
          value={`${archivedReceipts.length} ฉบับ`}
          tone="success"
          hint="บันทึกทางบัญชีเรียบร้อย"
        />
        <StatCard
          icon={Money}
          label="มูลค่าใบเสร็จทั้งหมด"
          value={<Money value={totalAmount} decimals={false} />}
          tone="info"
          hint="ยอดชำระเงินรวมตามเอกสาร"
        />
        <StatCard
          icon={Building2}
          label="บริษัทคู่ค้า"
          value={`${uniqueCompanies} บริษัท`}
          tone="sun"
          hint="ที่มีการรับใบเสร็จในระบบ"
        />
      </div>

      <div className="mb-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted/70">
            <TabsTrigger value="pending">
              รอจัดเก็บ ({pendingReceipts.length})
            </TabsTrigger>
            <TabsTrigger value="all">
              ทั้งหมด ({receipts.length})
            </TabsTrigger>
            <TabsTrigger value="archived">
              จัดเก็บแล้ว ({archivedReceipts.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <DataTable
        columns={columns}
        data={filteredData}
        searchPlaceholder="ค้นหาเลขที่ใบเสร็จ, บริษัทคู่ค้า, ตัวแทน..."
        onRowClick={(r) => setDetailReceipt(r)}
        emptyMessage="ไม่มีรายการใบเสร็จในสถานะนี้"
      />

      {/* Official Agent Receipt Document Modal */}
      <Dialog open={!!detailReceipt} onOpenChange={(open) => !open && setDetailReceipt(null)}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          {detailReceipt && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between gap-4 mr-6">
                  <div>
                    <DialogTitle className="text-xl flex items-center gap-2">
                      <span>ใบเสร็จรับเงิน {detailReceipt.receiptNumber}</span>
                      <Badge
                        variant="outline"
                        className={
                          detailReceipt.archiveStatus === "จัดเก็บแล้ว"
                            ? "border-emerald-500/40 text-emerald-700 bg-emerald-50"
                            : "border-amber-500/40 text-amber-700 bg-amber-50"
                        }
                      >
                        {detailReceipt.archiveStatus || "รอจัดเก็บ"}
                      </Badge>
                    </DialogTitle>
                    <DialogDescription className="mt-1">
                      เอกสารรับเงินจาก {detailReceipt.companyName}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              {/* Realistic Printable Invoice Document Sheet */}
              <div className="my-2 rounded-xl border border-border bg-card p-6 shadow-sm space-y-6 text-foreground">
                {/* Document Header */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-border pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Building2 className="size-6 text-primary" />
                      <h2 className="text-lg font-bold text-foreground">{detailReceipt.companyName}</h2>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      สำนักงานใหญ่ · เลขประจำตัวผู้เสียภาษี:{" "}
                      <span className="font-mono text-foreground font-semibold">
                        {detailReceipt.taxId || "0105559012345"}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ตัวแทนผู้ประสานงาน: {detailReceipt.agentName}
                    </p>
                  </div>

                  <div className="text-right sm:text-right space-y-1">
                    <span className="inline-block bg-primary/10 text-primary text-xs font-bold px-3 py-1 rounded">
                      ใบเสร็จรับเงิน / ใบกำกับภาษี
                    </span>
                    <div className="text-sm font-semibold mt-1">
                      เลขที่: {detailReceipt.receiptNumber}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      วันที่: {formatShortDate(detailReceipt.issueDate ?? detailReceipt.receiptDate)}
                    </div>
                  </div>
                </div>

                {/* Customer Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-muted/30 p-3.5 rounded-lg">
                  <div>
                    <span className="text-muted-foreground block font-medium">ลูกค้า / ผู้ชำระเงิน</span>
                    <span className="font-bold text-sm text-foreground block mt-0.5">
                      ร้านรุ่งอรุณ มินิมาร์ท
                    </span>
                    <span className="text-muted-foreground">
                      เลขประจำตัวผู้เสียภาษี: 0105562098765
                    </span>
                  </div>
                  <div className="sm:text-right space-y-1">
                    <div>
                      <span className="text-muted-foreground">อ้างอิงใบสั่งซื้อ (PO): </span>
                      <span className="font-semibold text-primary">{detailReceipt.poNumber || "-"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">เลขที่คำขอจ่ายเงิน: </span>
                      <span className="font-mono">{detailReceipt.paymentRequestId || "-"}</span>
                    </div>
                  </div>
                </div>

                {/* Amount breakdown calculation */}
                {(() => {
                  const receiptVal = detailReceipt.amount ?? detailReceipt.totalAmount ?? 0;
                  const vatAmount = Math.round(receiptVal * 7 / 107);
                  const subtotal = receiptVal - vatAmount;
                  return (
                    <div className="rounded-lg border border-border overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-muted/70 text-muted-foreground">
                          <tr>
                            <th className="p-2.5 text-left font-medium">รายการชำระ</th>
                            <th className="p-2.5 text-right font-medium">จำนวนเงิน (บาท)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          <tr>
                            <td className="p-2.5">
                              ค่าสินค้าตามใบสั่งซื้อ {detailReceipt.poNumber || detailReceipt.receiptNumber}
                            </td>
                            <td className="p-2.5 text-right"><Money value={subtotal} /></td>
                          </tr>
                          <tr>
                            <td className="p-2.5 text-muted-foreground">ภาษีมูลค่าเพิ่ม (VAT 7%)</td>
                            <td className="p-2.5 text-right text-muted-foreground"><Money value={vatAmount} /></td>
                          </tr>
                        </tbody>
                        <tfoot className="bg-muted/40 font-bold border-t border-border">
                          <tr>
                            <td className="p-3 text-right text-sm">ยอดเงินสุทธิทั้งสิ้น</td>
                            <td className="p-3 text-right text-base text-primary">
                              <Money value={receiptVal} />
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  );
                })()}

                {/* Scanned Doc Image Attachment Mockup */}
                <div className="p-4 rounded-lg border-2 border-dashed border-border bg-muted/10 flex flex-col items-center justify-center text-center">
                  <div className="size-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground mb-2">
                    <FileCheck className="size-5 text-emerald-600" />
                  </div>
                  <span className="text-xs font-semibold text-foreground">
                    ไฟล์แนบใบเสร็จฉบับจริง: {detailReceipt.receiptNumber}.pdf
                  </span>
                  <span className="text-[11px] text-muted-foreground mt-0.5">
                    อัปโหลดเข้าระบบโดย {detailReceipt.uploadedBy} เมื่อ {formatShortDate(detailReceipt.uploadedAt)}
                  </span>
                </div>

                {/* Archiving Status Info */}
                {detailReceipt.archiveStatus === "จัดเก็บแล้ว" ? (
                  <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-300 p-3 text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                    <div className="flex items-center gap-2 font-medium">
                      <FolderCheck className="size-4" />
                      <span>จัดเก็บเข้าแฟ้มเอกสารบัญชีเรียบร้อยแล้ว</span>
                    </div>
                    <span>
                      ผู้จัดเก็บ: {detailReceipt.archivedBy || "เจ้าของกิจการ"} (
                      {detailReceipt.archivedAt ? formatShortDate(detailReceipt.archivedAt) : "-"}
                      )
                    </span>
                  </div>
                ) : (
                  <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 p-3 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="size-4" />
                      <span>สถานะ: รอตรวจสอบและจัดเก็บเข้าแฟ้มเอกสาร</span>
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2 sm:gap-0 mt-2">
                <Button variant="outline" onClick={() => setDetailReceipt(null)}>
                  ปิดหน้าต่าง
                </Button>
                {detailReceipt.archiveStatus !== "จัดเก็บแล้ว" && (
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => handleArchive(detailReceipt)}
                  >
                    <FolderCheck className="size-4 mr-1.5" />
                    ยืนยันจัดเก็บแล้ว
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation to Archive */}
      <ConfirmDialog
        open={!!confirmArchiveTarget}
        onOpenChange={(open) => !open && setConfirmArchiveTarget(null)}
        title={`ยืนยันจัดเก็บใบเสร็จ ${confirmArchiveTarget?.receiptNumber}?`}
        description={
          confirmArchiveTarget ? (
            <div className="space-y-2 text-sm">
              <p>
                คุณกำลังจะบันทึกสถานะจัดเก็บใบเสร็จจาก{" "}
                <strong>{confirmArchiveTarget.companyName}</strong> ({confirmArchiveTarget.agentName})
              </p>
              <p className="text-base font-semibold text-primary">
                ยอดเงิน: ฿{formatNumber(confirmArchiveTarget.amount ?? confirmArchiveTarget.totalAmount ?? 0)}
              </p>
              <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
                * ระบบจะบันทึกว่าเอกสารถูกจัดเก็บเข้าแฟ้มบัญชีแล้ว พร้อมบันทึกชื่อผู้จัดเก็บและเวลาที่ดำเนินการ
              </p>
            </div>
          ) : ""
        }
        confirmText="ยืนยันจัดเก็บเข้าแฟ้ม"
        confirmTone="success"
        onConfirm={() => confirmArchiveTarget && handleArchive(confirmArchiveTarget)}
      />
    </>
  );
}

