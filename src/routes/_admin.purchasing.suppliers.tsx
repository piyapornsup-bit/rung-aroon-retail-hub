import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Building2,
  Calendar,
  CreditCard,
  Edit2,
  Mail,
  MessageSquare,
  Phone,
  Plus,
  Trash2,
  User,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { FormDialog, Field } from "@/components/admin/FormDialog";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { StatCard } from "@/components/admin/StatCard";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatNumber } from "@/lib/format";
import { useStore } from "@/lib/store";
import { PRODUCT_CATEGORIES, type SupplierCompany, type SupplierAgent } from "@/lib/mock-data";

export const Route = createFileRoute("/_admin/purchasing/suppliers")({
  head: () => ({
    meta: [
      { title: "ตัวแทนจำหน่ายและบริษัทคู่ค้า — ร้านรุ่งอรุณ มินิมาร์ท" },
      { name: "description", content: "จัดการข้อมูลบริษัทคู่ค้าและตัวแทนจำหน่าย (Sales Agents) แต่ละบริษัท" },
      { property: "og:title", content: "ตัวแทนจำหน่ายและบริษัทคู่ค้า — ร้านรุ่งอรุณ มินิมาร์ท" },
      { property: "og:description", content: "จัดการข้อมูลบริษัทคู่ค้าและตัวแทนจำหน่าย (Sales Agents) แต่ละบริษัท" },
    ],
  }),
  component: SuppliersPage,
});

interface CompanyFormData {
  name: string;
  taxId: string;
  phone: string;
  email: string;
  address: string;
  paymentTermDays: number;
  contactPerson: string;
  categories: string[];
  note: string;
}

const emptyCompanyForm: CompanyFormData = {
  name: "",
  taxId: "",
  phone: "",
  email: "",
  address: "",
  paymentTermDays: 30,
  contactPerson: "",
  categories: [],
  note: "",
};

interface AgentFormData {
  name: string;
  nickname: string;
  position: string;
  phone: string;
  email: string;
  lineId: string;
  isPrimary: boolean;
}

const emptyAgentForm: AgentFormData = {
  name: "",
  nickname: "",
  position: "",
  phone: "",
  email: "",
  lineId: "",
  isPrimary: false,
};

function SuppliersPage() {
  const { state, actions } = useStore();

  // Company state
  const [companyDialogOpen, setCompanyDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<SupplierCompany | null>(null);
  const [companyForm, setCompanyForm] = useState<CompanyFormData>(emptyCompanyForm);
  const [companyErrors, setCompanyErrors] = useState<Record<string, string>>({});
  const [deleteCompanyTarget, setDeleteCompanyTarget] = useState<SupplierCompany | null>(null);

  // Drawer / Sheet state for Company Agents
  const [selectedCompany, setSelectedCompany] = useState<SupplierCompany | null>(null);

  // Agent form state
  const [agentDialogOpen, setAgentDialogOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<SupplierAgent | null>(null);
  const [agentForm, setAgentForm] = useState<AgentFormData>(emptyAgentForm);
  const [agentErrors, setAgentErrors] = useState<Record<string, string>>({});
  const [deleteAgentTarget, setDeleteAgentTarget] = useState<SupplierAgent | null>(null);

  // Company Handlers
  const openAddCompany = () => {
    setEditingCompany(null);
    setCompanyForm(emptyCompanyForm);
    setCompanyErrors({});
    setCompanyDialogOpen(true);
  };

  const openEditCompany = (company: SupplierCompany) => {
    setEditingCompany(company);
    setCompanyForm({
      name: company.name,
      taxId: company.taxId,
      phone: company.phone,
      email: company.email,
      address: company.address,
      paymentTermDays: company.paymentTermDays,
      contactPerson: company.contactPerson ?? "",
      categories: [...company.categories],
      note: company.note ?? "",
    });
    setCompanyErrors({});
    setCompanyDialogOpen(true);
  };

  const validateCompany = (): boolean => {
    const errs: Record<string, string> = {};
    if (!companyForm.name.trim()) errs.name = "กรุณากรอกชื่อบริษัทคู่ค้า";
    if (!companyForm.phone.trim()) errs.phone = "กรุณากรอกเบอร์โทรศัพท์";
    if (!companyForm.taxId.trim()) errs.taxId = "กรุณากรอกเลขประจำตัวผู้เสียภาษี";
    if (companyForm.paymentTermDays < 0) errs.paymentTermDays = "เครดิตเทอมต้องไม่ติดลบ";
    setCompanyErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSaveCompany = () => {
    if (!validateCompany()) return;
    if (editingCompany) {
      actions.updateSupplierCompany(editingCompany.id, {
        name: companyForm.name.trim(),
        taxId: companyForm.taxId.trim(),
        phone: companyForm.phone.trim(),
        email: companyForm.email.trim(),
        address: companyForm.address.trim(),
        paymentTermDays: Number(companyForm.paymentTermDays),
        contactPerson: companyForm.contactPerson.trim(),
        categories: companyForm.categories,
        note: companyForm.note.trim(),
      });
      toast.success(`อัปเดตข้อมูล ${companyForm.name} เรียบร้อยแล้ว`);
      if (selectedCompany?.id === editingCompany.id) {
        setSelectedCompany({ ...editingCompany, ...companyForm });
      }
    } else {
      const newComp = actions.addSupplierCompany({
        name: companyForm.name.trim(),
        taxId: companyForm.taxId.trim(),
        phone: companyForm.phone.trim(),
        email: companyForm.email.trim(),
        address: companyForm.address.trim(),
        paymentTermDays: Number(companyForm.paymentTermDays),
        contactPerson: companyForm.contactPerson.trim(),
        categories: companyForm.categories,
        note: companyForm.note.trim(),
      });
      toast.success(`เพิ่มบริษัท ${newComp.name} เรียบร้อยแล้ว`);
    }
    setCompanyDialogOpen(false);
  };

  const handleDeleteCompany = () => {
    if (!deleteCompanyTarget) return;
    const res = actions.deleteSupplierCompany(deleteCompanyTarget.id);
    if (!res.ok) {
      toast.error(res.reason ?? "ไม่สามารถลบได้");
    } else {
      toast.success(`ลบบริษัท ${deleteCompanyTarget.name} สำเร็จ`);
      if (selectedCompany?.id === deleteCompanyTarget.id) {
        setSelectedCompany(null);
      }
    }
    setDeleteCompanyTarget(null);
  };

  // Agent Handlers
  const openAddAgent = () => {
    if (!selectedCompany) return;
    setEditingAgent(null);
    setAgentForm(emptyAgentForm);
    setAgentErrors({});
    setAgentDialogOpen(true);
  };

  const openEditAgent = (agent: SupplierAgent) => {
    setEditingAgent(agent);
    setAgentForm({
      name: agent.name,
      nickname: agent.nickname ?? "",
      position: agent.position,
      phone: agent.phone,
      email: agent.email,
      lineId: agent.lineId ?? "",
      isPrimary: Boolean(agent.isPrimary),
    });
    setAgentErrors({});
    setAgentDialogOpen(true);
  };

  const validateAgent = (): boolean => {
    const errs: Record<string, string> = {};
    if (!agentForm.name.trim()) errs.name = "กรุณากรอกชื่อ-นามสกุลตัวแทน";
    if (!agentForm.phone.trim()) errs.phone = "กรุณากรอกเบอร์โทรศัพท์ติดต่อ";
    setAgentErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSaveAgent = () => {
    if (!selectedCompany || !validateAgent()) return;

    if (editingAgent) {
      actions.updateSupplierAgent(editingAgent.id, {
        name: agentForm.name.trim(),
        nickname: agentForm.nickname.trim(),
        position: agentForm.position.trim(),
        phone: agentForm.phone.trim(),
        email: agentForm.email.trim(),
        lineId: agentForm.lineId.trim(),
        isPrimary: agentForm.isPrimary,
      });
      toast.success(`อัปเดตข้อมูล ${agentForm.name} สำเร็จ`);
    } else {
      actions.addSupplierAgent({
        companyId: selectedCompany.id,
        name: agentForm.name.trim(),
        nickname: agentForm.nickname.trim(),
        position: agentForm.position.trim(),
        phone: agentForm.phone.trim(),
        email: agentForm.email.trim(),
        lineId: agentForm.lineId.trim(),
        isPrimary: agentForm.isPrimary,
      });
      toast.success(`เพิ่มตัวแทน ${agentForm.name} ประจำ ${selectedCompany.name} เรียบร้อยแล้ว`);
    }
    setAgentDialogOpen(false);
  };

  const handleDeleteAgent = () => {
    if (!deleteAgentTarget) return;
    actions.deleteSupplierAgent(deleteAgentTarget.id);
    toast.success(`ลบตัวแทน ${deleteAgentTarget.name} สำเร็จ`);
    setDeleteAgentTarget(null);
  };

  // Metrics
  const totalCompanies = state.supplierCompanies.length;
  const totalAgents = state.supplierAgents.length;
  const avgCreditDays = Math.round(
    state.supplierCompanies.reduce((acc, c) => acc + (c.paymentTermDays || 0), 0) / (totalCompanies || 1),
  );

  // Table Columns
  const columns: DataTableColumn<SupplierCompany>[] = [
    {
      id: "code",
      header: "รหัส",
      accessor: (c) => (
        <span className="font-mono text-xs font-semibold text-muted-foreground">{c.id}</span>
      ),
      className: "w-24",
    },
    {
      id: "name",
      header: "ชื่อบริษัทคู่ค้า",
      accessor: (c) => (
        <div>
          <span className="font-medium text-foreground">{c.name}</span>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
            <span>เลขผู้เสียภาษี: {c.taxId}</span>
          </div>
        </div>
      ),
      className: "min-w-[220px]",
    },
    {
      id: "contact",
      header: "เบอร์โทรศัพท์ / อีเมล",
      accessor: (c) => (
        <div className="text-xs space-y-0.5">
          <div className="flex items-center gap-1.5 text-foreground">
            <Phone className="size-3 text-muted-foreground" />
            <span>{c.phone}</span>
          </div>
          {c.email && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Mail className="size-3" />
              <span>{c.email}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      id: "credit",
      header: "เครดิตเทอม",
      accessor: (c) => (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-tone-indigo">
          <Calendar className="size-3.5" />
          {c.paymentTermDays} วัน
        </span>
      ),
      className: "w-28",
    },
    {
      id: "agents",
      header: "ตัวแทนจำหน่าย",
      accessor: (c) => {
        const agents = state.supplierAgents.filter((a) => a.companyId === c.id);
        return (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedCompany(c)}
            className="h-8 gap-1.5 text-xs font-medium"
          >
            <Users className="size-3.5 text-sun-600" />
            <span>{agents.length} ท่าน</span>
          </Button>
        );
      },
      className: "w-32",
    },
    {
      id: "categories",
      header: "หมวดหมู่สินค้าที่จำหน่าย",
      accessor: (c) => (
        <div className="flex flex-wrap gap-1">
          {c.categories.map((cat) => (
            <Badge key={cat} variant="secondary" className="text-[11px] font-normal px-1.5 py-0">
              {cat}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      id: "actions",
      header: "การกระทำ",
      align: "right",
      accessor: (c) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => openEditCompany(c)}
            title="แก้ไขข้อมูลบริษัท"
          >
            <Edit2 className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs text-danger/80 hover:bg-danger/10 hover:text-danger"
            onClick={() => setDeleteCompanyTarget(c)}
            title="ลบบริษัท"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ),
      className: "w-24",
    },
  ];

  // Active company agents in drawer
  const companyAgents = selectedCompany
    ? state.supplierAgents.filter((a) => a.companyId === selectedCompany.id)
    : [];

  return (
    <>
      <PageHeader
        title="ตัวแทนจำหน่ายและบริษัทคู่ค้า"
        description="จัดการข้อมูลบริษัทคู่ค้าและตัวแทนจำหน่าย (Sales Agents) แต่ละบริษัท"
        actions={
          <Button onClick={openAddCompany} className="gap-2 shadow-xs">
            <Plus className="size-4" />
            <span>เพิ่มบริษัทคู่ค้า</span>
          </Button>
        }
      />

      {/* Stats Summary */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={Building2}
          label="บริษัทคู่ค้าทั้งหมด"
          value={formatNumber(totalCompanies)}
          tone="sun"
          hint="บริษัทซัพพลายเออร์ที่ลงทะเบียน"
        />
        <StatCard
          icon={Users}
          label="ตัวแทนจำหน่าย (Agents)"
          value={formatNumber(totalAgents)}
          tone="teal"
          hint="ผู้ติดต่อประสานงานจัดซื้อ"
        />
        <StatCard
          icon={CreditCard}
          label="เครดิตเทอมเฉลี่ย"
          value={`${avgCreditDays} วัน`}
          tone="info"
          hint="ระยะเวลาการชำระเงินตามสัญญา"
        />
      </div>

      {/* Main Table */}
      <DataTable
        columns={columns}
        data={state.supplierCompanies}
        searchKey="name"
        searchPlaceholder="ค้นหาชื่อบริษัท, เลขประจำตัวผู้เสียภาษี..."
        emptyMessage="ไม่พบข้อมูลบริษัทคู่ค้า"
      />

      {/* Company Drawer for Agents (one company has many agents) */}
      <Sheet open={Boolean(selectedCompany)} onOpenChange={(open) => !open && setSelectedCompany(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader className="border-b pb-4">
            <SheetTitle className="text-lg font-bold flex items-center gap-2">
              <Building2 className="size-5 text-sun-600" />
              <span>{selectedCompany?.name}</span>
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground space-y-1">
              <div>เลขผู้เสียภาษี: {selectedCompany?.taxId} · เครดิต {selectedCompany?.paymentTermDays} วัน</div>
              <div>ที่อยู่: {selectedCompany?.address}</div>
            </SheetDescription>
          </SheetHeader>

          <div className="mt-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-foreground">
                  ตัวแทนจำหน่าย ({companyAgents.length} ท่าน)
                </h4>
                <p className="text-xs text-muted-foreground">
                  พนักงานหรือตัวแทนติดต่อประสานงานของบริษัทนี้
                </p>
              </div>
              <Button size="sm" onClick={openAddAgent} className="gap-1.5 text-xs h-8">
                <Plus className="size-3.5" />
                <span>เพิ่มตัวแทน</span>
              </Button>
            </div>

            {companyAgents.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                ยังไม่มีข้อมูลตัวแทนจำหน่ายของบริษัทนี้
              </div>
            ) : (
              <div className="space-y-3">
                {companyAgents.map((agent) => (
                  <div
                    key={agent.id}
                    className="group relative rounded-lg border bg-card p-3.5 shadow-xs transition hover:border-sun-300"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-foreground">{agent.name}</span>
                          {agent.nickname && (
                            <span className="text-xs text-muted-foreground">({agent.nickname})</span>
                          )}
                          {agent.isPrimary && (
                            <Badge className="bg-sun-100 text-sun-800 text-[10px] px-1.5 py-0 border-sun-200">
                              ตัวแทนหลัก
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs font-medium text-muted-foreground">
                          ตำแหน่ง: {agent.position || "ตัวแทนขาย"}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                          onClick={() => openEditAgent(agent)}
                          title="แก้ไขตัวแทน"
                        >
                          <Edit2 className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-danger/80 hover:bg-danger/10 hover:text-danger"
                          onClick={() => setDeleteAgentTarget(agent)}
                          title="ลบตัวแทน"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 border-t pt-2.5 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5 text-foreground">
                        <Phone className="size-3 text-muted-foreground" />
                        <span>{agent.phone}</span>
                      </div>
                      {agent.lineId && (
                        <div className="flex items-center gap-1.5 text-foreground">
                          <MessageSquare className="size-3 text-green-600" />
                          <span>LINE: {agent.lineId}</span>
                        </div>
                      )}
                      {agent.email && (
                        <div className="col-span-2 flex items-center gap-1.5 text-muted-foreground">
                          <Mail className="size-3" />
                          <span className="truncate">{agent.email}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* FormDialog: Company (Create / Edit) */}
      <FormDialog
        open={companyDialogOpen}
        onOpenChange={setCompanyDialogOpen}
        title={editingCompany ? `แก้ไขบริษัท: ${editingCompany.name}` : "เพิ่มบริษัทคู่ค้าใหม่"}
        description="กรอกข้อมูลบริษัทคู่ค้า เลขประจำตัวผู้เสียภาษี และหมวดหมู่สินค้าที่จัดจำหน่าย"
        submitLabel={editingCompany ? "บันทึกการแก้ไข" : "เพิ่มบริษัท"}
        onSubmit={handleSaveCompany}
        confirmLabel={editingCompany ? "บันทึกการแก้ไข" : "เพิ่มบริษัท"}
        onConfirm={handleSaveCompany}
      >
        <div className="space-y-3.5">
          <Field label="ชื่อบริษัทคู่ค้า" required error={companyErrors.name}>
            <Input
              value={companyForm.name}
              onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
              placeholder="เช่น บริษัท สหพัฒนพิบูล จำกัด (มหาชน)"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="เลขประจำตัวผู้เสียภาษี (13 หลัก)" required error={companyErrors.taxId}>
              <Input
                value={companyForm.taxId}
                onChange={(e) => setCompanyForm({ ...companyForm, taxId: e.target.value })}
                placeholder="0107537001421"
                maxLength={13}
              />
            </Field>
            <Field label="เครดิตเทอม (วัน)" required error={companyErrors.paymentTermDays}>
              <Input
                type="number"
                min={0}
                value={companyForm.paymentTermDays}
                onChange={(e) =>
                  setCompanyForm({ ...companyForm, paymentTermDays: Math.max(0, parseInt(e.target.value) || 0) })
                }
                placeholder="30"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="เบอร์โทรศัพท์ติดต่อ" required error={companyErrors.phone}>
              <Input
                value={companyForm.phone}
                onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                placeholder="02-293-9000"
              />
            </Field>
            <Field label="อีเมลสำหรับติดต่อ">
              <Input
                type="email"
                value={companyForm.email}
                onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                placeholder="contact@company.com"
              />
            </Field>
          </div>

          <Field label="ที่อยู่สำนักงาน / คลังสินค้า">
            <Textarea
              rows={2}
              value={companyForm.address}
              onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
              placeholder="ที่อยู่สำหรับออกเอกสารใบกำกับภาษีและส่งของ"
            />
          </Field>

          <Field label="หมวดหมู่สินค้าที่จัดจำหน่าย">
            <div className="grid grid-cols-2 gap-2 pt-1">
              {PRODUCT_CATEGORIES.map((cat) => {
                const checked = companyForm.categories.includes(cat);
                return (
                  <label
                    key={cat}
                    className="flex items-center gap-2 rounded-md border p-2 text-xs cursor-pointer hover:bg-accent"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setCompanyForm({ ...companyForm, categories: [...companyForm.categories, cat] });
                        } else {
                          setCompanyForm({
                            ...companyForm,
                            categories: companyForm.categories.filter((c) => c !== cat),
                          });
                        }
                      }}
                      className="rounded border-input text-sun-600 focus:ring-sun-500"
                    />
                    <span className="font-medium text-foreground">{cat}</span>
                  </label>
                );
              })}
            </div>
          </Field>

          <Field label="หมายเหตุ">
            <Input
              value={companyForm.note}
              onChange={(e) => setCompanyForm({ ...companyForm, note: e.target.value })}
              placeholder="เงื่อนไขการส่งสินค้า หรือข้อตกลงพิเศษ"
            />
          </Field>
        </div>
      </FormDialog>

      {/* FormDialog: Agent (Create / Edit) */}
      <FormDialog
        open={agentDialogOpen}
        onOpenChange={setAgentDialogOpen}
        title={editingAgent ? `แก้ไขข้อมูลตัวแทน: ${editingAgent.name}` : `เพิ่มตัวแทนจำหน่าย: ${selectedCompany?.name}`}
        description="กรอกข้อมูลตัวแทนจำหน่าย เบอร์โทรศัพท์ และ LINE สำหรับการติดต่อประสานงานจัดซื้อ"
        submitLabel={editingAgent ? "บันทึกการแก้ไข" : "เพิ่มตัวแทน"}
        onSubmit={handleSaveAgent}
        confirmLabel={editingAgent ? "บันทึกการแก้ไข" : "เพิ่มตัวแทน"}
        onConfirm={handleSaveAgent}
      >
        <div className="space-y-3.5">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Field label="ชื่อ-นามสกุลตัวแทน" required error={agentErrors.name}>
                <Input
                  value={agentForm.name}
                  onChange={(e) => setAgentForm({ ...agentForm, name: e.target.value })}
                  placeholder="เช่น คุณประสิทธิ์ ชัยมงคล"
                />
              </Field>
            </div>
            <Field label="ชื่อเล่น">
              <Input
                value={agentForm.nickname}
                onChange={(e) => setAgentForm({ ...agentForm, nickname: e.target.value })}
                placeholder="สิทธิ์"
              />
            </Field>
          </div>

          <Field label="ตำแหน่ง / หน้าที่">
            <Input
              value={agentForm.position}
              onChange={(e) => setAgentForm({ ...agentForm, position: e.target.value })}
              placeholder="เช่น ผู้จัดการฝ่ายขายโมเดิร์นเทรด"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="เบอร์โทรศัพท์" required error={agentErrors.phone}>
              <Input
                value={agentForm.phone}
                onChange={(e) => setAgentForm({ ...agentForm, phone: e.target.value })}
                placeholder="081-456-7890"
              />
            </Field>
            <Field label="LINE ID">
              <Input
                value={agentForm.lineId}
                onChange={(e) => setAgentForm({ ...agentForm, lineId: e.target.value })}
                placeholder="@prasit_sp"
              />
            </Field>
          </div>

          <Field label="อีเมลติดต่อ">
            <Input
              type="email"
              value={agentForm.email}
              onChange={(e) => setAgentForm({ ...agentForm, email: e.target.value })}
              placeholder="prasit.c@sahapat.co.th"
            />
          </Field>

          <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
            <div>
              <Label className="text-sm font-medium text-foreground cursor-pointer">
                ตั้งเป็นตัวแทนหลัก (Primary Contact)
              </Label>
              <p className="text-xs text-muted-foreground">
                ใช้เป็นตัวเลือกเริ่มต้นเวลาสร้างใบเสนอซื้อ (PR)
              </p>
            </div>
            <Switch
              checked={agentForm.isPrimary}
              onCheckedChange={(checked) => setAgentForm({ ...agentForm, isPrimary: checked })}
            />
          </div>
        </div>
      </FormDialog>

      {/* Delete Company Confirm */}
      <ConfirmDialog
        open={Boolean(deleteCompanyTarget)}
        onOpenChange={(open) => !open && setDeleteCompanyTarget(null)}
        title="ยืนยันการลบบริษัทคู่ค้า?"
        description={`คุณแน่ใจหรือไม่ว่าต้องการลบ "${deleteCompanyTarget?.name}"? ข้อมูลตัวแทนจำหน่ายทั้งหมดของบริษัทนี้จะถูกลบด้วย`}
        confirmLabel="ยืนยันการลบ"
        tone="danger"
        onConfirm={handleDeleteCompany}
      />

      {/* Delete Agent Confirm */}
      <ConfirmDialog
        open={Boolean(deleteAgentTarget)}
        onOpenChange={(open) => !open && setDeleteAgentTarget(null)}
        title="ยืนยันการลบตัวแทนจำหน่าย?"
        description={`คุณแน่ใจหรือไม่ว่าต้องการลบ "${deleteAgentTarget?.name}" ออกจากระบบ?`}
        confirmLabel="ยืนยันการลบ"
        tone="danger"
        onConfirm={handleDeleteAgent}
      />
    </>
  );
}

