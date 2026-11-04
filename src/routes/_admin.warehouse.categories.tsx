import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Edit2,
  FolderTree,
  Package,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable, type DataTableColumn, type DataTableFilter } from "@/components/admin/DataTable";
import { FormDialog, Field } from "@/components/admin/FormDialog";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { StatCard } from "@/components/admin/StatCard";
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
import { formatNumber } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { CategoryItem, Warehouse } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_admin/warehouse/categories")({
  head: () => ({
    meta: [
      { title: "จัดการหมวดหมู่สินค้า — ร้านรุ่งอรุณ มินิมาร์ท" },
      { name: "description", content: "กำหนดหมวดหมู่สินค้าและโกดังจัดเก็บ สินค้า 1 หมวดหมู่สังกัดได้เพียง 1 โกดังเท่านั้น" },
      { property: "og:title", content: "จัดการหมวดหมู่สินค้า — ร้านรุ่งอรุณ มินิมาร์ท" },
      { property: "og:description", content: "กำหนดหมวดหมู่สินค้าและโกดังจัดเก็บ สินค้า 1 หมวดหมู่สังกัดได้เพียง 1 โกดังเท่านั้น" },
    ],
  }),
  component: CategoriesPage,
});

interface CategoryFormData {
  name: string;
  warehouseId: string;
  description: string;
}

const emptyForm: CategoryFormData = {
  name: "",
  warehouseId: "",
  description: "",
};

/** Visual color styling palette per warehouse for clear visual separation. */
const WAREHOUSE_COLORS: Record<
  string,
  {
    badge: string;
    border: string;
    lightBg: string;
    dot: string;
  }
> = {
  "WH-01": {
    badge: "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300",
    border: "border-l-amber-500",
    lightBg: "bg-amber-50/30",
    dot: "bg-amber-500",
  },
  "WH-02": {
    badge: "bg-teal-100 text-teal-900 border-teal-300 dark:bg-teal-950/50 dark:text-teal-300",
    border: "border-l-teal-500",
    lightBg: "bg-teal-50/30",
    dot: "bg-teal-500",
  },
  "WH-03": {
    badge: "bg-indigo-100 text-indigo-900 border-indigo-300 dark:bg-indigo-950/50 dark:text-indigo-300",
    border: "border-l-indigo-500",
    lightBg: "bg-indigo-50/30",
    dot: "bg-indigo-500",
  },
};

const defaultWarehouseColor = {
  badge: "bg-muted text-muted-foreground border-border",
  border: "border-l-muted-foreground",
  lightBg: "bg-muted/10",
  dot: "bg-muted-foreground",
};

function CategoriesPage() {
  const { state, actions } = useStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<CategoryItem | null>(null);
  const [activeTab, setActiveTab] = useState<string>("all");

  const openAdd = () => {
    setEditingCategory(null);
    setFormData({
      name: "",
      warehouseId: state.warehouses[0]?.id ?? "",
      description: "",
    });
    setErrors({});
    setDialogOpen(true);
  };

  const openEdit = (c: CategoryItem) => {
    setEditingCategory(c);
    setFormData({
      name: c.name,
      warehouseId: c.warehouseId,
      description: c.description ?? "",
    });
    setErrors({});
    setDialogOpen(true);
  };

  const warehouseMap = useMemo(() => {
    return new Map<string, Warehouse>(state.warehouses.map((w) => [w.id, w]));
  }, [state.warehouses]);

  const validate = () => {
    const errs: Record<string, string> = {};
    const trimmed = formData.name.trim();

    if (!trimmed) {
      errs.name = "กรุณาระบุชื่อหมวดหมู่สินค้า";
    }

    if (!formData.warehouseId) {
      errs.warehouseId = "กรุณาเลือกโกดังที่สังกัด (1 หมวดหมู่สังกัดได้เพียง 1 โกดังเท่านั้น)";
    }

    // Check duplicate category name
    const existing = state.categories.find(
      (c) =>
        (!editingCategory || c.id !== editingCategory.id) &&
        c.name.trim().toLowerCase() === trimmed.toLowerCase(),
    );

    if (existing) {
      const wh = warehouseMap.get(existing.warehouseId);
      errs.name = `หมวดหมู่ “${trimmed}” สังกัดอยู่ที่ ${wh?.name ?? existing.warehouseId} แล้ว ไม่สามารถสังกัดโกดังซ้ำได้ (1 หมวดหมู่สังกัดได้เพียง 1 โกดังเท่านั้น)`;
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return false;

    if (editingCategory) {
      const res = actions.updateCategory(editingCategory.id, {
        name: formData.name,
        warehouseId: formData.warehouseId,
        description: formData.description,
      });
      if (!res.ok) {
        setErrors({ form: res.error ?? "เกิดข้อผิดพลาดในการบันทึก" });
        return false;
      }
      toast.success("อัปเดตหมวดหมู่สินค้าสำเร็จ", {
        description: `“${formData.name}” สังกัด ${warehouseMap.get(formData.warehouseId)?.name}`,
      });
    } else {
      const res = actions.addCategory({
        name: formData.name,
        warehouseId: formData.warehouseId,
        description: formData.description,
      });
      if (!res.ok) {
        setErrors({ form: res.error ?? "เกิดข้อผิดพลาดในการเพิ่มหมวดหมู่" });
        return false;
      }
      toast.success("เพิ่มหมวดหมู่สินค้าใหม่สำเร็จ", {
        description: `“${formData.name}” สังกัด ${warehouseMap.get(formData.warehouseId)?.name}`,
      });
    }
    return true;
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    const res = actions.deleteCategory(deleteTarget.id);
    if (!res.ok) {
      toast.error("ไม่สามารถลบหมวดหมู่ได้", {
        description: res.reason,
      });
    } else {
      toast.success("ลบหมวดหมู่สินค้าสำเร็จ", {
        description: deleteTarget.name,
      });
    }
    setDeleteTarget(null);
  };

  // Filter list by selected warehouse tab
  const filteredCategories = useMemo(() => {
    if (activeTab === "all") return state.categories;
    return state.categories.filter((c) => c.warehouseId === activeTab);
  }, [state.categories, activeTab]);

  const categoryProductCount = (categoryName: string) =>
    state.catalog.products.filter((p) => p.category === categoryName).length;

  const categoryStockCount = (categoryName: string) =>
    state.catalog.products
      .filter((p) => p.category === categoryName)
      .reduce((sum, p) => sum + p.stock, 0);

  const columns: DataTableColumn<CategoryItem>[] = [
    {
      key: "id",
      header: "รหัสหมวด",
      cell: (c) => (
        <Badge variant="outline" className="font-mono text-xs">
          {c.id}
        </Badge>
      ),
      sortValue: (c) => c.id,
      className: "w-28",
    },
    {
      key: "name",
      header: "หมวดหมู่สินค้า",
      cell: (c) => {
        const whColor = WAREHOUSE_COLORS[c.warehouseId] ?? defaultWarehouseColor;
        return (
          <div className="flex items-center gap-2.5">
            <span className={cn("size-2 shrink-0 rounded-full", whColor.dot)} />
            <div>
              <span className="font-medium text-foreground">{c.name}</span>
              {c.description && (
                <p className="line-clamp-1 text-xs text-muted-foreground">{c.description}</p>
              )}
            </div>
          </div>
        );
      },
      sortValue: (c) => c.name,
    },
    {
      key: "warehouse",
      header: "โกดังที่สังกัด (1:1)",
      cell: (c) => {
        const wh = warehouseMap.get(c.warehouseId);
        const whColor = WAREHOUSE_COLORS[c.warehouseId] ?? defaultWarehouseColor;
        return (
          <div className="flex flex-col gap-0.5">
            <Badge
              variant="outline"
              className={cn("w-fit font-medium text-xs border gap-1 py-0.5", whColor.badge)}
            >
              <Building2 className="size-3" />
              {wh?.name ?? c.warehouseId}
            </Badge>
            <span className="text-[11px] text-muted-foreground">
              สังกัดโกดังเดียวเท่านั้น
            </span>
          </div>
        );
      },
      sortValue: (c) => warehouseMap.get(c.warehouseId)?.name ?? c.warehouseId,
      className: "w-56",
    },
    {
      key: "productsCount",
      header: "จำนวนสินค้า",
      align: "center",
      cell: (c) => {
        const count = categoryProductCount(c.name);
        return (
          <div className="text-center">
            <span className="font-semibold text-foreground">{count}</span>
            <span className="ml-1 text-xs text-muted-foreground">รายการ</span>
          </div>
        );
      },
      sortValue: (c) => categoryProductCount(c.name),
      className: "w-32",
    },
    {
      key: "stockCount",
      header: "สต็อกคงเหลือ",
      align: "right",
      cell: (c) => {
        const stock = categoryStockCount(c.name);
        return (
          <div className="text-right">
            <span className="font-semibold text-foreground">{formatNumber(stock)}</span>
            <span className="ml-1 text-xs text-muted-foreground">ชิ้น</span>
          </div>
        );
      },
      sortValue: (c) => categoryStockCount(c.name),
      className: "w-32",
    },
    {
      key: "actions",
      header: "จัดการ",
      align: "center",
      cell: (c) => {
        const count = categoryProductCount(c.name);
        return (
          <div className="flex items-center justify-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openEdit(c)}
              className="h-8 px-2 text-muted-foreground hover:text-foreground"
              title="แก้ไขหมวดหมู่สินค้า"
            >
              <Edit2 className="size-3.5" />
              <span className="sr-only">แก้ไข</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeleteTarget(c)}
              className="h-8 px-2 text-muted-foreground hover:text-danger"
              title={count > 0 ? `มีสินค้า ${count} รายการใช้งานอยู่ ไม่สามารถลบได้` : "ลบหมวดหมู่"}
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

  const filters: DataTableFilter<CategoryItem>[] = [
    {
      key: "warehouseId",
      label: "โกดังจัดเก็บ",
      options: state.warehouses.map((w) => ({
        label: w.name,
        value: w.id,
      })),
      predicate: (c, v) => c.warehouseId === v,
    },
  ];

  return (
    <>
      <PageHeader
        title="จัดการหมวดหมู่สินค้า"
        description="กำหนดหมวดหมู่สินค้าและโกดังจัดเก็บ โดยแต่ละหมวดหมู่สังกัดได้เพียง 1 โกดังเท่านั้น"
        actions={
          <Button onClick={openAdd} className="gap-1.5">
            <Plus className="size-4" /> เพิ่มหมวดหมู่สินค้า
          </Button>
        }
      />

      {/* Helper Rule Banner */}
      <div className="mb-6 flex items-start gap-3 rounded-lg border border-sun-200 bg-sun-50/70 p-4 text-sun-900 shadow-xs dark:border-sun-900/40 dark:bg-sun-950/20 dark:text-sun-200">
        <AlertCircle className="mt-0.5 size-5 shrink-0 text-sun-600" />
        <div className="space-y-1 text-sm">
          <p className="font-semibold text-sun-950 dark:text-sun-100">
            กฎการจัดเก็บสินค้า: สินค้า 1 หมวดหมู่สังกัดได้เพียง 1 โกดังเท่านั้น
          </p>
          <p className="text-xs text-sun-800/90 dark:text-sun-300">
            เพื่อความแม่นยำในการนับสต็อกและการหยิบสินค้าสำหรับคำสั่งซื้อออนไลน์
            สินค้าแต่ละหมวดหมู่จะถูกจัดเก็บที่โกดังเพียงแห่งเดียวเท่านั้น ระบบจะบล็อกการผูกหมวดหมู่ซ้ำซ้อน
          </p>
        </div>
      </div>

      {/* Top Stat Summary Cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={FolderTree}
          label="หมวดหมู่สินค้าทั้งหมด"
          value={`${state.categories.length} หมวด`}
          tone="sun"
          hint="กระจายตามโกดัง 3 แห่ง"
        />
        <StatCard
          icon={Building2}
          label="โกดังที่รองรับการจัดเก็บ"
          value={`${state.warehouses.length} แห่ง`}
          tone="teal"
          hint="โกดังหลัก, ศิลา, ท่าพระ"
        />
        <StatCard
          icon={CheckCircle2}
          label="การสังกัดโกดัง (1:1)"
          value="100%"
          tone="success"
          hint="ทุกหมวดสังกัดโกดังเดียวถูกต้อง"
        />
      </div>

      {/* Quick Warehouse Filter Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
        <TabsList className="h-10 rounded-md bg-card p-1 shadow-soft">
          <TabsTrigger
            value="all"
            className="h-8 gap-1.5 rounded-sm px-3 text-xs data-[state=active]:bg-sun-50 data-[state=active]:text-sun-800"
          >
            ทั้งหมด
            <span className="rounded-full bg-muted px-1.5 py-0.2 text-[10px]">
              {state.categories.length}
            </span>
          </TabsTrigger>
          {state.warehouses.map((w) => {
            const count = state.categories.filter((c) => c.warehouseId === w.id).length;
            const whColor = WAREHOUSE_COLORS[w.id] ?? defaultWarehouseColor;
            return (
              <TabsTrigger
                key={w.id}
                value={w.id}
                className="h-8 gap-1.5 rounded-sm px-3 text-xs data-[state=active]:bg-sun-50 data-[state=active]:text-sun-800"
              >
                <span className={cn("size-2 rounded-full", whColor.dot)} />
                {w.name}
                <span className="rounded-full bg-muted px-1.5 py-0.2 text-[10px]">
                  {count}
                </span>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      {/* Categories DataTable */}
      <DataTable
        data={filteredCategories}
        columns={columns}
        getRowId={(c) => c.id}
        searchPlaceholder="ค้นหาชื่อหมวดหมู่สินค้า หรือคำอธิบาย..."
        searchFn={(c, q) =>
          c.name.toLowerCase().includes(q) ||
          (c.description?.toLowerCase().includes(q) ?? false) ||
          c.id.toLowerCase().includes(q)
        }
        filters={filters}
        emptyTitle="ไม่พบหมวดหมู่สินค้า"
        emptyDescription="ลองค้นหาด้วยคำค้นอื่น หรือคลิกปุ่มเพิ่มหมวดหมู่สินค้าด้านบน"
      />

      {/* Add / Edit Category Form Dialog */}
      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editingCategory ? "แก้ไขหมวดหมู่สินค้า" : "เพิ่มหมวดหมู่สินค้าใหม่"}
        description="กรอกข้อมูลหมวดหมู่สินค้าและกำหนดโกดังที่สังกัด (1 หมวดหมู่สังกัดได้ 1 โกดังเท่านั้น)"
        submitLabel={editingCategory ? "บันทึกการแก้ไข" : "บันทึกหมวดหมู่"}
        onSubmit={handleSubmit}
      >
        {/* Form-level rule alert */}
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
          <p className="font-semibold">💡 ข้อกำหนดสำคัญเรื่องการสังกัดโกดัง:</p>
          <p className="mt-0.5">
            แต่ละหมวดหมู่สินค้าจะถูกเก็บไว้ที่โกดังเพียงแห่งเดียวเท่านั้น ระบบไม่อนุญาตให้หมวดหมู่เดียวกันสังกัดมากกว่าหนึ่งโกดัง
          </p>
        </div>

        {errors.form && (
          <div className="rounded-md border border-danger/30 bg-danger-soft p-3 text-xs text-danger">
            {errors.form}
          </div>
        )}

        <Field
          label="ชื่อหมวดหมู่สินค้า"
          htmlFor="cat-name"
          required
          error={errors.name}
          hint="เช่น สบู่, แชมพู, บะหมี่กึ่งสำเร็จรูป, กิ๊ฟช็อป"
        >
          <Input
            id="cat-name"
            value={formData.name}
            onChange={(e) => {
              setFormData((s) => ({ ...s, name: e.target.value }));
              if (errors.name) setErrors((s) => ({ ...s, name: "" }));
            }}
            placeholder="ระบุชื่อหมวดหมู่สินค้า..."
          />
        </Field>

        <Field
          label="โกดังที่สังกัด"
          htmlFor="cat-warehouse"
          required
          error={errors.warehouseId}
          hint="เลือกโกดังที่หมวดหมู่นี้จะถูกจัดเก็บ (สังกัดได้เพียง 1 โกดังเท่านั้น)"
        >
          <Select
            value={formData.warehouseId}
            onValueChange={(val) => {
              setFormData((s) => ({ ...s, warehouseId: val }));
              if (errors.warehouseId) setErrors((s) => ({ ...s, warehouseId: "" }));
            }}
          >
            <SelectTrigger id="cat-warehouse" className="w-full">
              <SelectValue placeholder="เลือกโกดังที่สังกัด..." />
            </SelectTrigger>
            <SelectContent>
              {state.warehouses.map((w) => (
                <SelectItem key={w.id} value={w.id}>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "size-2 rounded-full",
                        WAREHOUSE_COLORS[w.id]?.dot ?? "bg-muted-foreground",
                      )}
                    />
                    <span>{w.name}</span>
                    <span className="text-xs text-muted-foreground">({w.id})</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field
          label="คำอธิบายหมวดหมู่ / ชนิดสินค้าที่จัดเก็บ"
          htmlFor="cat-desc"
          hint="รายละเอียดชนิดสินค้าที่อยู่ในหมวดนี้ (ไม่บังคับ)"
        >
          <Textarea
            id="cat-desc"
            rows={2}
            value={formData.description}
            onChange={(e) => setFormData((s) => ({ ...s, description: e.target.value }))}
            placeholder="ระบุรายละเอียดสินค้าในหมวดหมู่นี้..."
          />
        </Field>
      </FormDialog>

      {/* Delete Confirmation Dialog */}
      {deleteTarget && (
        <ConfirmDialog
          open={!!deleteTarget}
          onOpenChange={(o) => !o && setDeleteTarget(null)}
          tone="danger"
          title={`ต้องการลบหมวดหมู่ “${deleteTarget.name}” หรือไม่?`}
          description={
            categoryProductCount(deleteTarget.name) > 0
              ? `ไม่สามารถลบหมวดหมู่ “${deleteTarget.name}” ได้ เนื่องจากมีสินค้าในระบบจำนวน ${categoryProductCount(deleteTarget.name)} รายการสังกัดหมวดหมู่นี้อยู่ กรุณาย้ายหมวดหมู่ของสินค้าก่อน`
              : `การลบหมวดหมู่สินค้าไม่สามารถย้อนกลับได้ คุณแน่ใจหรือไม่ว่าต้องการลบหมวดหมู่นี้ออกจาก ${warehouseMap.get(deleteTarget.warehouseId)?.name ?? "โกดัง"}?`
          }
          confirmLabel={
            categoryProductCount(deleteTarget.name) > 0 ? "รับทราบ" : "ยืนยันการลบ"
          }
          onConfirm={() => {
            if (categoryProductCount(deleteTarget.name) > 0) {
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
