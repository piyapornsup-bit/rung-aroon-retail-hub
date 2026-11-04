import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Building2, Edit2, FolderTree, MapPin, Package, Phone, Plus, Trash2, User } from "lucide-react";
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
import { formatNumber } from "@/lib/format";
import {
  useStore,
  selectWarehouseCategoryCount,
  selectWarehouseTotalStock,
  selectWarehouseProductCount,
} from "@/lib/store";
import type { Warehouse } from "@/lib/mock-data";

export const Route = createFileRoute("/_admin/warehouse/warehouses")({
  head: () => ({
    meta: [
      { title: "จัดการโกดัง — ร้านรุ่งอรุณ มินิมาร์ท" },
      { name: "description", content: "จัดการโกดังและคลังสินค้าของร้านรุ่งอรุณ" },
      { property: "og:title", content: "จัดการโกดัง — ร้านรุ่งอรุณ มินิมาร์ท" },
      { property: "og:description", content: "จัดการโกดังและคลังสินค้าของร้านรุ่งอรุณ" },
    ],
  }),
  component: WarehousesPage,
});

interface WarehouseFormData {
  name: string;
  location: string;
  manager: string;
  phone: string;
  note: string;
}

const emptyForm: WarehouseFormData = {
  name: "",
  location: "",
  manager: "",
  phone: "",
  note: "",
};

function WarehousesPage() {
  const { state, actions } = useStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [formData, setFormData] = useState<WarehouseFormData>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<Warehouse | null>(null);

  const openAdd = () => {
    setEditingWarehouse(null);
    setFormData({
      name: "",
      location: "",
      manager: state.session.user.name,
      phone: "081-000-0000",
      note: "",
    });
    setErrors({});
    setDialogOpen(true);
  };

  const openEdit = (w: Warehouse) => {
    setEditingWarehouse(w);
    setFormData({
      name: w.name,
      location: w.location,
      manager: w.manager,
      phone: w.phone,
      note: w.note ?? "",
    });
    setErrors({});
    setDialogOpen(true);
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!formData.name.trim()) {
      errs.name = "กรุณาระบุชื่อโกดัง";
    }
    if (!formData.location.trim()) {
      errs.location = "กรุณาระบุที่ตั้งของโกดัง";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return false;

    if (editingWarehouse) {
      actions.updateWarehouse(editingWarehouse.id, {
        name: formData.name,
        location: formData.location,
        manager: formData.manager,
        phone: formData.phone,
        note: formData.note,
      });
      toast.success("อัปเดตข้อมูลโกดังสำเร็จ", {
        description: formData.name,
      });
    } else {
      const created = actions.addWarehouse({
        name: formData.name,
        location: formData.location,
        manager: formData.manager,
        phone: formData.phone,
        note: formData.note,
      });
      toast.success("เพิ่มโกดังใหม่สำเร็จ", {
        description: `${created.name} (${created.id})`,
      });
    }
    return true;
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    const res = actions.deleteWarehouse(deleteTarget.id);
    if (!res.ok) {
      toast.error("ไม่สามารถลบโกดังได้", {
        description: res.reason,
      });
    } else {
      toast.success("ลบโกดังสำเร็จ", {
        description: deleteTarget.name,
      });
    }
    setDeleteTarget(null);
  };

  const totalCategories = state.categories.length;
  const totalStockAll = state.catalog.products.reduce((s, p) => s + p.stock, 0);

  const columns: DataTableColumn<Warehouse>[] = [
    {
      key: "id",
      header: "รหัสโกดัง",
      cell: (w) => (
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-xs font-semibold">
            {w.id}
          </Badge>
          <span className="text-xs text-muted-foreground">({w.code})</span>
        </div>
      ),
      sortValue: (w) => w.id,
      className: "w-36",
    },
    {
      key: "name",
      header: "ชื่อโกดัง",
      cell: (w) => (
        <div>
          <span className="font-medium text-foreground">{w.name}</span>
          {w.note && (
            <p className="line-clamp-1 text-xs text-muted-foreground">{w.note}</p>
          )}
        </div>
      ),
      sortValue: (w) => w.name,
    },
    {
      key: "location",
      header: "ที่ตั้ง",
      cell: (w) => (
        <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <MapPin className="mt-0.5 size-3.5 shrink-0 text-sun-600" />
          <span className="max-w-md">{w.location}</span>
        </div>
      ),
    },
    {
      key: "manager",
      header: "ผู้รับผิดชอบ",
      cell: (w) => (
        <div className="text-xs">
          <div className="flex items-center gap-1 font-medium text-foreground">
            <User className="size-3 text-muted-foreground" />
            <span>{w.manager}</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Phone className="size-3" />
            <span>{w.phone}</span>
          </div>
        </div>
      ),
    },
    {
      key: "categoriesCount",
      header: "จำนวนหมวดหมู่สินค้า",
      align: "center",
      cell: (w) => {
        const catCount = selectWarehouseCategoryCount(state, w.id);
        const prodCount = selectWarehouseProductCount(state, w.id);
        return (
          <div className="text-center">
            <Badge
              variant="secondary"
              className="bg-sun-100 font-semibold text-sun-800 hover:bg-sun-200"
            >
              <FolderTree className="mr-1 size-3" />
              {catCount} หมวดหมู่
            </Badge>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {prodCount} รายการสินค้า
            </p>
          </div>
        );
      },
      sortValue: (w) => selectWarehouseCategoryCount(state, w.id),
      className: "w-44",
    },
    {
      key: "stockCount",
      header: "สต็อกรวม",
      align: "right",
      cell: (w) => {
        const totalStock = selectWarehouseTotalStock(state, w.id);
        return (
          <div className="text-right">
            <span className="font-semibold text-foreground">
              {formatNumber(totalStock)}
            </span>
            <span className="ml-1 text-xs text-muted-foreground">ชิ้น</span>
          </div>
        );
      },
      sortValue: (w) => selectWarehouseTotalStock(state, w.id),
      className: "w-32",
    },
    {
      key: "actions",
      header: "จัดการ",
      align: "center",
      cell: (w) => {
        const catCount = selectWarehouseCategoryCount(state, w.id);
        return (
          <div className="flex items-center justify-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openEdit(w)}
              className="h-8 px-2 text-muted-foreground hover:text-foreground"
              title="แก้ไขข้อมูลโกดัง"
            >
              <Edit2 className="size-3.5" />
              <span className="sr-only">แก้ไข</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeleteTarget(w)}
              className="h-8 px-2 text-muted-foreground hover:text-danger"
              title={catCount > 0 ? "มีหมวดหมู่สินค้าสังกัดอยู่ ไม่สามารถลบได้" : "ลบโกดัง"}
            >
              <Trash2 className="size-3.5" />
              <span className="sr-only">ลบ</span>
            </Button>
          </div>
        );
      },
      className: "w-24",
    },
  ];

  return (
    <>
      <PageHeader
        title="จัดการโกดัง"
        description="บริหารจัดการสถานที่เก็บสินค้าและคลังจัดส่งของร้านรุ่งอรุณ มินิมาร์ท"
        actions={
          <Button onClick={openAdd} className="gap-1.5">
            <Plus className="size-4" /> เพิ่มโกดังใหม่
          </Button>
        }
      />

      {/* Top Stat Summary Cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={Building2}
          label="จำนวนโกดังทั้งหมด"
          value={`${state.warehouses.length} แห่ง`}
          tone="sun"
          hint="พร้อมใช้งานทุกสาขา"
        />
        <StatCard
          icon={FolderTree}
          label="หมวดหมู่สินค้าที่กระจายจัดเก็บ"
          value={`${totalCategories} หมวด`}
          tone="teal"
          hint="สังกัดโกดังละ 1 แห่ง"
        />
        <StatCard
          icon={Package}
          label="สต็อกสินค้ารวมทุกโกดัง"
          value={`${formatNumber(totalStockAll)} ชิ้น`}
          tone="info"
          hint="สินค้าพร้อมขาย"
        />
      </div>

      {/* Warehouses DataTable */}
      <DataTable
        data={state.warehouses}
        columns={columns}
        getRowId={(w) => w.id}
        searchPlaceholder="ค้นหาชื่อโกดัง, ที่ตั้ง หรือผู้รับผิดชอบ..."
        searchFn={(w, q) =>
          w.name.toLowerCase().includes(q) ||
          w.location.toLowerCase().includes(q) ||
          w.manager.toLowerCase().includes(q) ||
          w.id.toLowerCase().includes(q)
        }
        emptyTitle="ไม่พบข้อมูลโกดัง"
        emptyDescription="ลองค้นหาด้วยคำค้นอื่น หรือคลิกปุ่มเพิ่มโกดังใหม่ด้านบน"
      />

      {/* Add / Edit Form Dialog */}
      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editingWarehouse ? "แก้ไขข้อมูลโกดัง" : "เพิ่มโกดังจัดเก็บใหม่"}
        description="กรอกข้อมูลโกดังจัดเก็บและที่ตั้งสำหรับกระจายหมวดหมู่สินค้า"
        submitLabel={editingWarehouse ? "บันทึกการแก้ไข" : "บันทึกโกดัง"}
        onSubmit={handleSubmit}
      >
        <Field
          label="ชื่อโกดัง"
          htmlFor="wh-name"
          required
          error={errors.name}
          hint="เช่น โกดังหลัก (หลังร้าน), โกดัง 2 (ศิลา)"
        >
          <Input
            id="wh-name"
            value={formData.name}
            onChange={(e) => {
              setFormData((s) => ({ ...s, name: e.target.value }));
              if (errors.name) setErrors((s) => ({ ...s, name: "" }));
            }}
            placeholder="ระบุชื่อโกดัง..."
          />
        </Field>

        <Field
          label="ที่ตั้ง"
          htmlFor="wh-location"
          required
          error={errors.location}
          hint="ที่อยู่ เลขที่ ถนน ตำบล อำเภอ จังหวัด รหัสไปรษณีย์"
        >
          <Textarea
            id="wh-location"
            rows={2}
            value={formData.location}
            onChange={(e) => {
              setFormData((s) => ({ ...s, location: e.target.value }));
              if (errors.location) setErrors((s) => ({ ...s, location: "" }));
            }}
            placeholder="ระบุที่ตั้งโกดัง..."
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="ผู้รับผิดชอบ / ผู้ดูแล" htmlFor="wh-manager">
            <Input
              id="wh-manager"
              value={formData.manager}
              onChange={(e) => setFormData((s) => ({ ...s, manager: e.target.value }))}
              placeholder="ชื่อผู้รับผิดชอบ..."
            />
          </Field>
          <Field label="เบอร์โทรศัพท์" htmlFor="wh-phone">
            <Input
              id="wh-phone"
              value={formData.phone}
              onChange={(e) => setFormData((s) => ({ ...s, phone: e.target.value }))}
              placeholder="08x-xxx-xxxx"
            />
          </Field>
        </div>

        <Field label="หมายเหตุ / รายละเอียดการจัดเก็บ" htmlFor="wh-note" hint="เช่น สินค้าควบคุมอุณหภูมิ, ของใช้ส่วนตัว">
          <Input
            id="wh-note"
            value={formData.note}
            onChange={(e) => setFormData((s) => ({ ...s, note: e.target.value }))}
            placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)..."
          />
        </Field>
      </FormDialog>

      {/* Delete Confirmation Dialog */}
      {deleteTarget && (
        <ConfirmDialog
          open={!!deleteTarget}
          onOpenChange={(o) => !o && setDeleteTarget(null)}
          tone="danger"
          title={`ต้องการลบ “${deleteTarget.name}” หรือไม่?`}
          description={
            selectWarehouseCategoryCount(state, deleteTarget.id) > 0
              ? `ไม่สามารถลบโกดังนี้ได้ เนื่องจากมีหมวดหมู่สินค้า ${selectWarehouseCategoryCount(state, deleteTarget.id)} หมวดสังกัดอยู่ กรุณาย้ายหมวดหมู่สินค้าไปยังโกดังอื่นก่อนทำการลบ`
              : "การลบโกดังนี้ไม่สามารถย้อนกลับได้ คุณแน่ใจหรือไม่ว่าต้องการดำเนินการต่อ?"
          }
          confirmLabel={
            selectWarehouseCategoryCount(state, deleteTarget.id) > 0 ? "รับทราบ" : "ยืนยันการลบ"
          }
          onConfirm={() => {
            if (selectWarehouseCategoryCount(state, deleteTarget.id) > 0) {
              setDeleteTarget(null);
            } else {
              handleDeleteConfirm();
            }
          }}
        />
      )}
    </>
  );
}
