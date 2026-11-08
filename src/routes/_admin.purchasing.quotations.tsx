import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  Calendar,
  Check,
  ChevronDown,
  Clock,
  Eye,
  FileSpreadsheet,
  FileText,
  Plus,
  Trash2,
  Users,
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
import type { Quotation, QuotationItem } from "@/lib/mock-data";

export const Route = createFileRoute("/_admin/purchasing/quotations")({
  head: () => ({
    meta: [
      { title: "ใบเสนอราคา — ร้านรุ่งอรุณ มินิมาร์ท" },
      { name: "description", content: "จัดการใบเสนอราคาจากตัวแทนจำหน่าย เชื่อมโยงตัวแทนได้หลายท่าน" },
      { property: "og:title", content: "ใบเสนอราคา — ร้านรุ่งอรุณ มินิมาร์ท" },
      { property: "og:description", content: "จัดการใบเสนอราคาจากตัวแทนจำหน่าย เชื่อมโยงตัวแทนได้หลายท่าน" },
    ],
  }),
  component: QuotationsPage,
});

interface QuotationLineForm {
  productId: string;
  sku: string;
  name: string;
  unit: string;
  unitPrice: number;
  minOrderQty: number;
}

function QuotationsPage() {
  const { state, actions } = useStore();

  const [createOpen, setCreateOpen] = useState(false);
  const [detailQuotation, setDetailQuotation] = useState<Quotation | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Quotation | null>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);
  const [validityDays, setValidityDays] = useState(30);
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<QuotationLineForm[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Line adder temporary state
  const [selectedProductId, setSelectedProductId] = useState("");
  const [tempPrice, setTempPrice] = useState("");
  const [tempMinQty, setTempMinQty] = useState("");

  // Filter agents by currently selected company
  const companyAgents = useMemo(() => {
    if (!companyId) return [];
    return state.supplierAgents.filter((a) => a.companyId === companyId);
  }, [companyId, state.supplierAgents]);

  const openCreateDialog = () => {
    setTitle("");
    const defaultComp = state.supplierCompanies[0];
    setCompanyId(defaultComp?.id ?? "");
    const primaryAgents = state.supplierAgents
      .filter((a) => a.companyId === defaultComp?.id && a.isPrimary)
      .map((a) => a.id);
    setSelectedAgentIds(primaryAgents.length > 0 ? primaryAgents : []);
    setValidityDays(30);
    setNote("");
    setLines([]);
    setErrors({});
    setSelectedProductId("");
    setTempPrice("");
    setTempMinQty("");
    setCreateOpen(true);
  };

  const handleCompanyChange = (newCompId: string) => {
    setCompanyId(newCompId);
    // Reset or auto-select agents belonging to new company
    const newAgents = state.supplierAgents.filter((a) => a.companyId === newCompId);
    const primary = newAgents.filter((a) => a.isPrimary).map((a) => a.id);
    setSelectedAgentIds(primary.length > 0 ? primary : (newAgents[0] ? [newAgents[0].id] : []));
  };

  const toggleAgent = (agentId: string) => {
    if (selectedAgentIds.includes(agentId)) {
      if (selectedAgentIds.length === 1) {
        toast.error("ต้องมีตัวแทนจำหน่ายที่เชื่อมโยงอย่างน้อย 1 ท่าน");
        return;
      }
      setSelectedAgentIds(selectedAgentIds.filter((id) => id !== agentId));
    } else {
      setSelectedAgentIds([...selectedAgentIds, agentId]);
    }
  };

  const handleAddLine = () => {
    if (!selectedProductId) {
      toast.error("กรุณาเลือกสินค้า");
      return;
    }
    const product = state.catalog.products.find((p) => p.id === selectedProductId);
    if (!product) return;

    const price = parseFloat(tempPrice);
    if (isNaN(price) || price <= 0) {
      toast.error("กรุณาระบุราคาต่อหน่วยที่ถูกต้อง");
      return;
    }

    const minQty = parseInt(tempMinQty) || 1;

    // Check if already in lines
    if (lines.some((l) => l.productId === selectedProductId)) {
      toast.error("สินค้านี้อยู่ในรายการเสนอราคาแล้ว");
      return;
    }

    setLines([
      ...lines,
      {
        productId: product.id,
        sku: product.sku,
        name: product.name,
        unit: product.unit,
        unitPrice: price,
        minOrderQty: minQty,
      },
    ]);

    setSelectedProductId("");
    setTempPrice("");
    setTempMinQty("");
  };

  const removeLine = (productId: string) => {
    setLines(lines.filter((l) => l.productId !== productId));
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = "กรุณากรอกหัวข้อใบเสนอราคา";
    if (!companyId) errs.companyId = "กรุณาเลือกบริษัทคู่ค้า";
    if (selectedAgentIds.length === 0) errs.agents = "ต้องเลือกตัวแทนจำหน่ายอย่างน้อย 1 ท่าน";
    if (lines.length === 0) errs.lines = "กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSaveQuotation = () => {
    if (!validate()) return;
    const company = state.supplierCompanies.find((c) => c.id === companyId);
    if (!company) return;

    const totalEst = lines.reduce((sum, l) => sum + l.unitPrice * (l.minOrderQty || 1), 0);
    const validUntil = new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000).toISOString();

    const newQuotation = actions.addQuotation({
      quotationNumber: `QT-2611-${(state.quotations.length + 1).toString().padStart(3, "0")}`,
      title: title.trim(),
      companyId: company.id,
      companyName: company.name,
      agentIds: selectedAgentIds,
      validityDays: Number(validityDays),
      validUntil,
      totalEstimatedAmount: totalEst,
      items: lines.map((l) => ({
        productId: l.productId,
        sku: l.sku,
        name: l.name,
        unit: l.unit,
        unitPrice: l.unitPrice,
        minOrderQty: l.minOrderQty,
      })),
      status: "ใช้งานอยู่",
      note: note.trim() || undefined,
    });

    toast.success(`สร้างใบเสนอราคา ${newQuotation.quotationNumber} สำเร็จ`);
    setCreateOpen(false);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    actions.deleteQuotation(deleteTarget.id);
    toast.success(`ลบใบเสนอราคา ${deleteTarget.quotationNumber} สำเร็จ`);
    setDeleteTarget(null);
  };

  // Metrics
  const activeQuotes = state.quotations.filter((q) => q.status === "ใช้งานอยู่").length;
  const totalValue = state.quotations.reduce((sum, q) => sum + q.totalEstimatedAmount, 0);

  // Table Columns
  const columns: DataTableColumn<Quotation>[] = [
    {
      id: "code",
      header: "เลขที่",
      accessor: (q) => (
        <span className="font-mono text-xs font-semibold text-sun-700">{q.quotationNumber}</span>
      ),
      className: "w-28",
    },
    {
      id: "title",
      header: "หัวข้อใบเสนอราคา",
      accessor: (q) => (
        <div>
          <span className="font-medium text-foreground">{q.title}</span>
          <div className="text-xs text-muted-foreground mt-0.5">{q.companyName}</div>
        </div>
      ),
      className: "min-w-[220px]",
    },
    {
      id: "agents",
      header: "ตัวแทนจำหน่ายที่เชื่อมโยง (หลายท่าน)",
      accessor: (q) => {
        const agents = state.supplierAgents.filter((a) => q.agentIds.includes(a.id));
        return (
          <div className="flex flex-wrap items-center gap-1">
            {agents.map((a) => (
              <Badge
                key={a.id}
                variant="outline"
                className="bg-sun-50/70 border-sun-200 text-sun-800 text-[11px] font-normal px-2 py-0.5"
              >
                {a.name}
              </Badge>
            ))}
          </div>
        );
      },
    },
    {
      id: "items",
      header: "สินค้า",
      accessor: (q) => (
        <span className="text-xs font-medium text-foreground">
          {q.items.length} รายการ
        </span>
      ),
      className: "w-24 text-center",
    },
    {
      id: "validity",
      header: "ยืนราคา / หมดอายุ",
      accessor: (q) => (
        <div className="text-xs space-y-0.5">
          <div className="text-foreground font-medium">{q.validityDays} วัน</div>
          <div className="text-muted-foreground flex items-center gap-1">
            <Clock className="size-3" />
            <span>ถึง {formatShortDate(q.validUntil)}</span>
          </div>
        </div>
      ),
      className: "w-36",
    },
    {
      id: "amount",
      header: "มูลค่าประเมิน",
      align: "right",
      accessor: (q) => (
        <span className="font-semibold text-foreground">
          <Money value={q.totalEstimatedAmount} />
        </span>
      ),
      className: "w-32",
    },
    {
      id: "status",
      header: "สถานะ",
      accessor: (q) => <StatusBadge status={q.status} />,
      className: "w-28",
    },
    {
      id: "actions",
      header: "การกระทำ",
      align: "right",
      accessor: (q) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setDetailQuotation(q)}
            title="ดูรายละเอียดใบเสนอราคา"
          >
            <Eye className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs text-danger/80 hover:bg-danger/10 hover:text-danger"
            onClick={() => setDeleteTarget(q)}
            title="ลบใบเสนอราคา"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ),
      className: "w-24",
    },
  ];

  return (
    <>
      <PageHeader
        title="ใบเสนอราคา"
        description="บันทึกและเปรียบเทียบราคาเสนอขายจากตัวแทนจำหน่าย (1 ใบเสนอราคาเชื่อมโยงตัวแทนได้หลายคน)"
        actions={
          <Button onClick={openCreateDialog} className="gap-2 shadow-xs">
            <Plus className="size-4" />
            <span>สร้างใบเสนอราคา</span>
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={FileSpreadsheet}
          label="ใบเสนอราคาทั้งหมด"
          value={formatNumber(state.quotations.length)}
          tone="sun"
          hint="บันทึกในระบบ"
        />
        <StatCard
          icon={Calendar}
          label="ใบเสนอราคาที่ใช้งานอยู่"
          value={formatNumber(activeQuotes)}
          tone="teal"
          hint="ยังไม่หมดอายุสัญญา"
        />
        <StatCard
          icon={Users}
          label="มูลค่าการเสนอราคารวม"
          value={<Money value={totalValue} decimals={false} />}
          tone="info"
          hint="ประมาณการมูลค่าสินค้า"
        />
      </div>

      <DataTable
        columns={columns}
        data={state.quotations}
        searchKey="title"
        searchPlaceholder="ค้นหาหัวข้อ, เลขที่ใบเสนอราคา, บริษัทคู่ค้า..."
        emptyMessage="ไม่พบข้อมูลใบเสนอราคา"
      />

      {/* Detail Dialog */}
      <Dialog open={Boolean(detailQuotation)} onOpenChange={(open) => !open && setDetailQuotation(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader className="border-b pb-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-sun-700 bg-sun-50 px-2 py-0.5 rounded">
                {detailQuotation?.quotationNumber}
              </span>
              {detailQuotation && <StatusBadge status={detailQuotation.status} />}
            </div>
            <DialogTitle className="text-lg font-bold mt-1 text-foreground">
              {detailQuotation?.title}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              บริษัทคู่ค้า: {detailQuotation?.companyName} · วันที่บันทึก: {detailQuotation && formatShortDate(detailQuotation.createdAt)}
            </DialogDescription>
          </DialogHeader>

          {detailQuotation && (
            <div className="space-y-4 pt-2">
              {/* Linked Agents Banner */}
              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                  <Users className="size-3.5 text-sun-600" />
                  <span>ตัวแทนจำหน่ายที่เชื่อมโยง ({detailQuotation.agentIds.length} ท่าน)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {state.supplierAgents
                    .filter((a) => detailQuotation.agentIds.includes(a.id))
                    .map((agent) => (
                      <div key={agent.id} className="rounded border bg-card p-2 text-xs">
                        <div className="font-medium text-foreground">{agent.name} {agent.nickname ? `(${agent.nickname})` : ""}</div>
                        <div className="text-muted-foreground text-[11px]">{agent.position} · {agent.phone}</div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Items Table */}
              <div>
                <h4 className="text-xs font-semibold text-foreground mb-2">
                  รายการสินค้าและราคาเสนอขาย ({detailQuotation.items.length} รายการ)
                </h4>
                <div className="rounded-md border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/60 text-muted-foreground font-medium">
                      <tr>
                        <th className="py-2 px-3 text-left">รหัส / รายการสินค้า</th>
                        <th className="py-2 px-3 text-center">หน่วย</th>
                        <th className="py-2 px-3 text-right">ราคาต่อหน่วย</th>
                        <th className="py-2 px-3 text-right">สั่งขั้นต่ำ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {detailQuotation.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-muted/20">
                          <td className="py-2 px-3">
                            <span className="font-mono text-muted-foreground mr-1.5">{item.sku}</span>
                            <span className="font-medium text-foreground">{item.name}</span>
                          </td>
                          <td className="py-2 px-3 text-center text-muted-foreground">{item.unit}</td>
                          <td className="py-2 px-3 text-right font-medium text-foreground">
                            ฿{item.unitPrice.toFixed(2)}
                          </td>
                          <td className="py-2 px-3 text-right text-muted-foreground">
                            {item.minOrderQty ? `${item.minOrderQty} ${item.unit}` : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Validity & Note */}
              <div className="grid grid-cols-2 gap-3 border-t pt-3 text-xs">
                <div>
                  <span className="text-muted-foreground">ระยะเวลายืนราคา: </span>
                  <span className="font-semibold text-foreground">{detailQuotation.validityDays} วัน</span>
                  <div className="text-muted-foreground mt-0.5">
                    ใช้ได้ถึง: {formatShortDate(detailQuotation.validUntil)}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-muted-foreground">มูลค่ารวมประเมิน: </span>
                  <div className="text-base font-bold text-sun-700">
                    <Money value={detailQuotation.totalEstimatedAmount} />
                  </div>
                </div>
                {detailQuotation.note && (
                  <div className="col-span-2 text-muted-foreground bg-muted/20 rounded p-2 text-xs">
                    <span className="font-medium text-foreground">หมายเหตุ: </span>
                    {detailQuotation.note}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Quotation FormDialog */}
      <FormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="สร้างใบเสนอราคาใหม่"
        description="กรอกข้อมูลใบเสนอราคาจากคู่ค้า และเชื่อมโยงตัวแทนจำหน่าย (เลือกได้หลายท่าน)"
        submitLabel="บันทึกใบเสนอราคา"
        onSubmit={handleSaveQuotation}
        confirmLabel="บันทึกใบเสนอราคา"
        onConfirm={handleSaveQuotation}
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <Field label="หัวข้อใบเสนอราคา" required error={errors.title}>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="เช่น ใบเสนอราคาบะหมี่และของแห้ง ประจำไตรมาส 4/2569"
            />
          </Field>

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

          {/* Multi-Agent Linkage (Requirement: One quotation can be linked to MANY agents) */}
          <Field
            label="ตัวแทนจำหน่ายที่เชื่อมโยง (เลือกได้หลายท่าน)"
            required
            error={errors.agents}
            hint="คลิกเพื่อเลือกตัวแทนจำหน่ายที่รับผิดชอบใบเสนอราคานี้"
          >
            {companyAgents.length === 0 ? (
              <div className="text-xs text-muted-foreground italic p-2 border rounded">
                ไม่มีตัวแทนจำหน่ายในบริษัทนี้ กรุณาไปเพิ่มตัวแทนก่อน
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {companyAgents.map((agent) => {
                  const isSelected = selectedAgentIds.includes(agent.id);
                  return (
                    <button
                      type="button"
                      key={agent.id}
                      onClick={() => toggleAgent(agent.id)}
                      className={`flex items-start gap-2.5 rounded-lg border p-2.5 text-left transition-colors ${
                        isSelected
                          ? "border-sun-500 bg-sun-50/70 text-sun-900"
                          : "border-border bg-card hover:bg-accent text-foreground"
                      }`}
                    >
                      <div
                        className={`size-4 rounded flex items-center justify-center mt-0.5 border ${
                          isSelected ? "bg-sun-600 border-sun-600 text-white" : "border-muted-foreground"
                        }`}
                      >
                        {isSelected && <Check className="size-3 stroke-[3]" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-xs truncate">
                          {agent.name} {agent.nickname ? `(${agent.nickname})` : ""}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {agent.position} · {agent.phone}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="ระยะเวลายืนราคา (วัน)">
              <Input
                type="number"
                min={1}
                value={validityDays}
                onChange={(e) => setValidityDays(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </Field>
            <Field label="วันหมดอายุประเมิน">
              <Input
                disabled
                value={formatShortDate(new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000).toISOString())}
                className="bg-muted/50"
              />
            </Field>
          </div>

          {/* Line Items Section */}
          <div className="space-y-2 border-t pt-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">
                รายการสินค้าในใบเสนอราคา ({lines.length} รายการ)
              </span>
              {errors.lines && <span className="text-xs text-danger">{errors.lines}</span>}
            </div>

            {/* Input row for adding product */}
            <div className="rounded-lg border bg-muted/20 p-2.5 space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="sm:col-span-2">
                  <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="เลือกสินค้าจากแคตตาล็อก" />
                    </SelectTrigger>
                    <SelectContent>
                      {state.catalog.products.map((p) => (
                        <SelectItem key={p.id} value={p.id} className="text-xs">
                          {p.sku} — {p.name} ({p.unit})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    step="0.1"
                    min={0}
                    placeholder="ราคาเสนอ (บาท)"
                    value={tempPrice}
                    onChange={(e) => setTempPrice(e.target.value)}
                    className="h-8 text-xs"
                  />
                  <Input
                    type="number"
                    min={1}
                    placeholder="ขั้นต่ำ"
                    value={tempMinQty}
                    onChange={(e) => setTempMinQty(e.target.value)}
                    className="h-8 text-xs w-20"
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

            {/* Current lines list */}
            {lines.length > 0 && (
              <div className="rounded-md border divide-y overflow-hidden max-h-48 overflow-y-auto">
                {lines.map((l) => (
                  <div key={l.productId} className="flex items-center justify-between p-2 text-xs bg-card">
                    <div>
                      <span className="font-mono text-muted-foreground mr-1.5">{l.sku}</span>
                      <span className="font-medium text-foreground">{l.name}</span>
                      <div className="text-[11px] text-muted-foreground">
                        ขั้นต่ำ: {l.minOrderQty} {l.unit}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-foreground">฿{l.unitPrice.toFixed(2)}/{l.unit}</span>
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
                  </div>
                ))}
              </div>
            )}
          </div>

          <Field label="หมายเหตุ / ข้อตกลงเพิ่มเติม">
            <Textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="เช่น ราคารวมภาษีมูลค่าเพิ่มแล้ว ส่งมอบฟรีเมื่อสั่งซื้อครบ 5,000 บาท"
            />
          </Field>
        </div>
      </FormDialog>

      {/* Confirm Delete */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="ยืนยันการลบใบเสนอราคา?"
        description={`คุณแน่ใจหรือไม่ว่าต้องการลบใบเสนอราคา ${deleteTarget?.quotationNumber} (${deleteTarget?.title})?`}
        confirmLabel="ยืนยันการลบ"
        tone="danger"
        onConfirm={handleDelete}
      />
    </>
  );
}

