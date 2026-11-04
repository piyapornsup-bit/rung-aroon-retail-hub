import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  Check,
  Copy,
  Edit2,
  History,
  KeyRound,
  Lock,
  Plus,
  Shield,
  ShieldCheck,
  User,
  UserCheck,
  UserCog,
  Users,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { StatCard } from "@/components/admin/StatCard";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatShortDate } from "@/lib/format";
import { ROLE_LABELS, type RoleKey, type StaffUser, type EmployeeHistoryRecord } from "@/lib/mock-data";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/_admin/manager/employees")({
  head: () => ({
    meta: [
      { title: "จัดการพนักงาน — ร้านรุ่งอรุณ มินิมาร์ท" },
      { name: "description", content: "จัดการข้อมูลพนักงาน กำหนดหน้าที่รับผิดชอบ และรีเซ็ตรหัสผ่าน" },
      { property: "og:title", content: "จัดการพนักงาน — ร้านรุ่งอรุณ มินิมาร์ท" },
      { property: "og:description", content: "จัดการข้อมูลพนักงาน กำหนดหน้าที่รับผิดชอบ และรีเซ็ตรหัสผ่าน" },
    ],
  }),
  component: EmployeesPage,
});

const PREDEFINED_DUTIES = [
  { value: "งานขายและบริการหน้าร้าน", label: "งานขายและบริการหน้าร้าน (Cashier & Sales)", role: "sales" as RoleKey },
  { value: "จัดการคลังสินค้าและจัดส่ง", label: "จัดการคลังสินค้าและจัดส่ง (Warehouse & Inventory)", role: "warehouse" as RoleKey },
  { value: "งานจัดซื้อและประสานคู่ค้า", label: "งานจัดซื้อและประสานคู่ค้า (Purchasing & Procurement)", role: "purchasing" as RoleKey },
  { value: "บริหารจัดการร้านและอนุมัติ", label: "บริหารจัดการร้านและอนุมัติ (Store Management)", role: "manager" as RoleKey },
  { value: "เจ้าของกิจการและกำกับนโยบาย", label: "เจ้าของกิจการและกำกับนโยบาย (Owner & Governance)", role: "owner" as RoleKey },
];

interface EmployeeDraft {
  firstName: string;
  lastName: string;
  nickname: string;
  position: string;
  duty: string;
  username: string;
  role: RoleKey;
  password?: string;
}

const defaultDraft: EmployeeDraft = {
  firstName: "",
  lastName: "",
  nickname: "",
  position: "พนักงานขาย",
  duty: "งานขายและบริการหน้าร้าน",
  username: "",
  role: "sales",
};

function EmployeesPage() {
  const { state, actions } = useStore();
  const employees = state.employees;

  const [formOpen, setFormOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<StaffUser | null>(null);
  const [draft, setDraft] = useState<EmployeeDraft>(defaultDraft);

  // Reset password states
  const [confirmResetTarget, setConfirmResetTarget] = useState<StaffUser | null>(null);
  const [tempPasswordResult, setTempPasswordResult] = useState<{
    user: StaffUser;
    password: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // History view modal
  const [historyTarget, setHistoryTarget] = useState<StaffUser | null>(null);

  const handleOpenAdd = () => {
    setEditingEmp(null);
    setDraft({ ...defaultDraft });
    setFormOpen(true);
  };

  const handleOpenEdit = (emp: StaffUser) => {
    setEditingEmp(emp);
    setDraft({
      firstName: emp.firstName || emp.name.split(" ")[0] || "",
      lastName: emp.lastName || emp.name.split(" ")[1] || "",
      nickname: emp.nickname,
      position: emp.position || "",
      duty: emp.duty,
      username: emp.username,
      role: emp.role,
    });
    setFormOpen(true);
  };

  const handleDutyChange = (dutyVal: string) => {
    const matched = PREDEFINED_DUTIES.find((d) => d.value === dutyVal);
    setDraft((p) => ({
      ...p,
      duty: dutyVal,
      role: matched ? matched.role : p.role,
    }));
  };

  const handleSave = () => {
    if (!draft.firstName.trim() || !draft.lastName.trim()) {
      toast.error("กรุณาระบุชื่อและนามสกุลของพนักงาน");
      return;
    }
    if (!draft.username.trim()) {
      toast.error("กรุณาระบุชื่อผู้ใช้งานสำหรับเข้าสู่ระบบ");
      return;
    }
    if (!draft.duty) {
      toast.error("กรุณากำหนดหน้าที่รับผิดชอบ (พนักงาน 1 ท่านต้องมีหน้าที่หลัก 1 หน้าที่)");
      return;
    }

    const fullName = `${draft.firstName.trim()} ${draft.lastName.trim()}`;

    if (editingEmp) {
      actions.updateEmployee(editingEmp.id, {
        firstName: draft.firstName.trim(),
        lastName: draft.lastName.trim(),
        name: fullName,
        nickname: draft.nickname.trim() || draft.firstName.trim(),
        position: draft.position.trim(),
        duty: draft.duty,
        username: draft.username.trim().toLowerCase(),
        role: draft.role,
      });
      toast.success(`อัปเดตข้อมูลคุณ ${fullName} เรียบร้อยแล้ว`);
    } else {
      actions.addEmployee({
        name: fullName,
        firstName: draft.firstName.trim(),
        lastName: draft.lastName.trim(),
        nickname: draft.nickname.trim() || draft.firstName.trim(),
        position: draft.position.trim(),
        duty: draft.duty,
        username: draft.username.trim().toLowerCase(),
        role: draft.role,
        password: "password123",
      });
      toast.success(`เพิ่มพนักงานใหม่ ${fullName} เข้าสู่ระบบแล้ว`);
    }

    setFormOpen(false);
  };

  const handleConfirmReset = () => {
    if (!confirmResetTarget) return;
    const res = actions.resetEmployeePassword(confirmResetTarget.id);
    if (res.ok && res.tempPassword) {
      setTempPasswordResult({
        user: confirmResetTarget,
        password: res.tempPassword,
      });
      setConfirmResetTarget(null);
      setCopied(false);
    } else {
      toast.error("เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน");
      setConfirmResetTarget(null);
    }
  };

  const handleCopyPassword = () => {
    if (!tempPasswordResult) return;
    navigator.clipboard.writeText(tempPasswordResult.password);
    setCopied(true);
    toast.success("คัดลอกรหัสผ่านชั่วคราวแล้ว");
    setTimeout(() => setCopied(false), 2000);
  };

  const columns: DataTableColumn<StaffUser>[] = [
    {
      id: "name",
      header: "ชื่อ-นามสกุล",
      accessor: (r) => (
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-full bg-sun-100 text-sun-800 font-semibold flex items-center justify-center text-xs">
            {r.nickname ? r.nickname.slice(0, 2) : r.name.slice(0, 2)}
          </div>
          <div>
            <div className="font-semibold text-foreground">
              {r.name} {r.nickname ? `(${r.nickname})` : ""}
            </div>
            <div className="text-xs text-muted-foreground">{r.position || "-"}</div>
          </div>
        </div>
      ),
      sortable: true,
      searchable: true,
    },
    {
      id: "duty",
      header: "หน้าที่รับผิดชอบ (1 หน้าที่หลัก)",
      accessor: (r) => (
        <div>
          <Badge variant="outline" className="font-medium text-xs border-primary/30 text-primary bg-primary/5">
            {r.duty}
          </Badge>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            บทบาทในระบบ: {ROLE_LABELS[r.role]}
          </div>
        </div>
      ),
      searchable: true,
    },
    {
      id: "username",
      header: "ชื่อผู้ใช้ (Username)",
      accessor: (r) => (
        <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">
          {r.username}
        </span>
      ),
      sortable: true,
      searchable: true,
    },
    {
      id: "actions",
      header: "การจัดการ",
      accessor: (r) => (
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            title="ดูประวัติการดำเนินการ"
            onClick={(e) => {
              e.stopPropagation();
              setHistoryTarget(r);
            }}
          >
            <History className="size-4 text-muted-foreground" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            title="แก้ไขข้อมูล"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenEdit(r);
            }}
          >
            <Edit2 className="size-4 text-muted-foreground" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-xs text-amber-700 border-amber-300 hover:bg-amber-50"
            onClick={(e) => {
              e.stopPropagation();
              setConfirmResetTarget(r);
            }}
          >
            <KeyRound className="size-3.5 mr-1" />
            รีเซ็ตรหัสผ่าน
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="จัดการพนักงาน"
        description="บริหารจัดการบัญชีผู้ใช้งาน กำหนดหน้าที่รับผิดชอบ และดูแลความปลอดภัยของพนักงาน"
        actions={
          <Button onClick={handleOpenAdd}>
            <Plus className="size-4 mr-1.5" />
            เพิ่มพนักงานใหม่
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
        <StatCard
          icon={Users}
          label="พนักงานทั้งหมด"
          value={`${employees.length} คน`}
          tone="teal"
          hint="บัญชีผู้ใช้งานในระบบ"
        />
        <StatCard
          icon={UserCheck}
          label="หน้าที่รับผิดชอบ"
          value="5 ฝ่ายหลัก"
          tone="info"
          hint="1 คนต่อ 1 หน้าที่หลัก"
        />
        <StatCard
          icon={ShieldCheck}
          label="สิทธิ์การเข้าถึง"
          value="ตามบทบาท (RBAC)"
          tone="success"
          hint="ระบบความปลอดภัยตามหน้าที่"
        />
        <StatCard
          icon={KeyRound}
          label="รหัสผ่านชั่วคราว"
          value="สุ่มรหัสผ่านอัตโนมัติ"
          tone="sun"
          hint="แสดงครั้งเดียวเมื่อรีเซ็ต"
        />
      </div>

      <DataTable
        columns={columns}
        data={employees}
        searchPlaceholder="ค้นหาชื่อพนักงาน, ตำแหน่ง, หน้าที่ หรือชื่อผู้ใช้..."
        onRowClick={(r) => handleOpenEdit(r)}
        emptyMessage="ไม่มีข้อมูลพนักงาน"
      />

      {/* Add / Edit Employee Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingEmp ? `แก้ไขข้อมูลคุณ ${editingEmp.name}` : "เพิ่มพนักงานใหม่"}
            </DialogTitle>
            <DialogDescription>
              กรอกข้อมูลพนักงานและกำหนดหน้าที่รับผิดชอบหลักเพียง 1 หน้าที่
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="firstName">ชื่อ <span className="text-destructive">*</span></Label>
                <Input
                  id="firstName"
                  placeholder="เช่น สมชาย"
                  value={draft.firstName}
                  onChange={(e) => setDraft((p) => ({ ...p, firstName: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName">นามสกุล <span className="text-destructive">*</span></Label>
                <Input
                  id="lastName"
                  placeholder="เช่น ใจดี"
                  value={draft.lastName}
                  onChange={(e) => setDraft((p) => ({ ...p, lastName: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="nickname">ชื่อเล่น</Label>
                <Input
                  id="nickname"
                  placeholder="เช่น ชาย"
                  value={draft.nickname}
                  onChange={(e) => setDraft((p) => ({ ...p, nickname: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="position">ตำแหน่งงาน</Label>
                <Input
                  id="position"
                  placeholder="เช่น แคชเชียร์อาวุโส"
                  value={draft.position}
                  onChange={(e) => setDraft((p) => ({ ...p, position: e.target.value }))}
                />
              </div>
            </div>

            {/* Exactly ONE duty selection */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="duty">หน้าที่รับผิดชอบหลัก <span className="text-destructive">*</span></Label>
                <Badge variant="outline" className="text-[10px] text-amber-700 bg-amber-50">
                  ต้องเลือกเพียง 1 หน้าที่
                </Badge>
              </div>
              <Select value={draft.duty} onValueChange={handleDutyChange}>
                <SelectTrigger id="duty">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PREDEFINED_DUTIES.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground mt-1">
                * กฎของระบบ: พนักงาน 1 ท่านสามารถรับผิดชอบได้เพียง 1 หน้าที่หลักเท่านั้น สิทธิ์ในระบบจะถูกกำหนดตามหน้าที่นี้
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="username">ชื่อผู้ใช้งาน (Username สำหรับเข้าสู่ระบบ) <span className="text-destructive">*</span></Label>
              <Input
                id="username"
                placeholder="เช่น somchai"
                value={draft.username}
                onChange={(e) => setDraft((p) => ({ ...p, username: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              ยกเลิก
            </Button>
            <Button onClick={handleSave}>
              {editingEmp ? "บันทึกการแก้ไข" : "เพิ่มพนักงาน"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Password Reset Dialog */}
      <ConfirmDialog
        open={!!confirmResetTarget}
        onOpenChange={(open) => !open && setConfirmResetTarget(null)}
        title={`ยืนยันการรีเซ็ตรหัสผ่านสำหรับ คุณ${confirmResetTarget?.name}?`}
        description={
          <div className="space-y-2 text-sm">
            <p>
              ระบบจะทำการสุ่มสร้างรหัสผ่านชั่วคราวใหม่ให้แก่พนักงาน และบันทึกลงในประวัติการใช้งาน
            </p>
            <p className="text-xs text-amber-800 bg-amber-50 p-2 rounded border border-amber-200">
              * รหัสผ่านชั่วคราวจะปรากฏให้คัดลอกเพียงครั้งเดียวเท่านั้น กรุณาส่งมอบให้พนักงานทันที
            </p>
          </div>
        }
        confirmText="ยืนยันรีเซ็ตรหัสผ่าน"
        confirmTone="warning"
        onConfirm={handleConfirmReset}
      />

      {/* Show Temporary Password Dialog (SHOWN ONCE) */}
      <Dialog
        open={!!tempPasswordResult}
        onOpenChange={(open) => !open && setTempPasswordResult(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <KeyRound className="size-5" />
              <span>รหัสผ่านชั่วคราว (แสดงเพียงครั้งเดียว)</span>
            </DialogTitle>
            <DialogDescription>
              รีเซ็ตรหัสผ่านสำหรับ <strong>{tempPasswordResult?.user.name}</strong> ({tempPasswordResult?.user.username}) สำเร็จแล้ว
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-4 text-center space-y-2">
              <span className="text-xs text-muted-foreground block">รหัสผ่านชั่วคราวใหม่</span>
              <div className="font-mono text-2xl font-bold tracking-wider text-primary select-all">
                {tempPasswordResult?.password}
              </div>
              <Button
                size="sm"
                variant="outline"
                className="mt-2"
                onClick={handleCopyPassword}
              >
                {copied ? (
                  <>
                    <Check className="size-3.5 mr-1 text-emerald-600" />
                    คัดลอกแล้ว
                  </>
                ) : (
                  <>
                    <Copy className="size-3.5 mr-1" />
                    คัดลอกรหัสผ่าน
                  </>
                )}
              </Button>
            </div>

            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 flex items-start gap-2">
              <AlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>คำเตือน:</strong> หน้าต่างนี้จะแสดงรหัสผ่านชั่วคราวเพียงครั้งเดียวเท่านั้น เมื่อปิดหน้าต่างนี้แล้วจะไม่สามารถดูรหัสผ่านเดิมได้อีก กรุณาส่งมอบให้พนักงานทันทีและให้พนักงานเปลี่ยนรหัสผ่านในการเข้าสู่ระบบครั้งแรก
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              className="w-full sm:w-auto"
              onClick={() => setTempPasswordResult(null)}
            >
              รับทราบและปิดหน้าต่าง
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Employee History Timeline Modal */}
      <Dialog open={!!historyTarget} onOpenChange={(open) => !open && setHistoryTarget(null)}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          {historyTarget && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <History className="size-5 text-muted-foreground" />
                  <span>ประวัติการดำเนินการของ {historyTarget.name}</span>
                </DialogTitle>
                <DialogDescription>
                  ตำแหน่ง: {historyTarget.position || "-"} · หน้าที่: {historyTarget.duty}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 my-2">
                {(!historyTarget.history || historyTarget.history.length === 0) ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    ยังไม่มีบันทึกประวัติการเปลี่ยนแปลง
                  </div>
                ) : (
                  <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                    {historyTarget.history.map((h, idx) => (
                      <div key={h.id || idx} className="relative">
                        <div className="absolute -left-6 top-1 size-2.5 rounded-full bg-primary ring-4 ring-background" />
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-foreground">{h.action}</span>
                            <span className="text-[11px] text-muted-foreground">
                              {formatShortDate(h.at)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                            {h.detail}
                          </p>
                          {h.category && (
                            <Badge variant="outline" className="text-[10px] mt-1">
                              {h.category}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setHistoryTarget(null)}>
                  ปิด
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

