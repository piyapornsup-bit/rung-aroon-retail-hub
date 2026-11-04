import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useRef } from "react";
import {
  Boxes,
  Building2,
  CheckCircle2,
  Edit2,
  FolderTree,
  Globe,
  Image as ImageIcon,
  Package,
  Plus,
  Trash2,
  Upload,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable, type DataTableColumn, type DataTableFilter } from "@/components/admin/DataTable";
import { FormDialog, Field } from "@/components/admin/FormDialog";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { StatCard } from "@/components/admin/StatCard";
import { Money } from "@/components/admin/Money";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatNumber } from "@/lib/format";
import { useStore, selectWarehouseForCategory, selectReorderPointProducts } from "@/lib/store";
import type { Product } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_admin/warehouse/products")({
  head: () => ({
    meta: [
      { title: "จัดการสินค้า — ร้านรุ่งอรุณ มินิมาร์ท" },
      { name: "description", content: "จัดการรายการสินค้า ข้อมูล รูปภาพ สต็อก และสถานะการวางจำหน่ายออนไลน์" },
      { property: "og:title", content: "จัดการสินค้า — ร้านรุ่งอรุณ มินิมาร์ท" },
      { property: "og:description", content: "จัดการรายการสินค้า ข้อมูล รูปภาพ สต็อก และสถานะการวางจำหน่ายออนไลน์" },
    ],
  }),
  component: ProductsPage,
});

interface ProductFormData {
  sku: string;
  barcode: string;
  name: string;
  description: string;
  category: string;
  price: number | string;
  stock: number | string;
  unit: string;
  reorderPoint: number | string;
  emoji: string;
  imageUrl: string;
  isOnline: boolean;
}

const emptyForm: ProductFormData = {
  sku: "",
  barcode: "",
  name: "",
  description: "",
  category: "",
  price: "",
  stock: "",
  unit: "ชิ้น",
  reorderPoint: 10,
  emoji: "📦",
  imageUrl: "",
  isOnline: true,
};

const COMMON_EMOJIS = ["📦", "🧸", "💌", "☕", "🎁", "🧼", "🫧", "🧴", "💧", "🪥", "🦷", "🌿", "🍜", "🥡", "🥛", "🍶", "🍫", "🫘", "🍞", "🧃"];

function ProductsPage() {
  const { state, actions } = useStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormData>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openAdd = () => {
    setEditingProduct(null);
    const defaultCat = state.categories[0]?.name ?? "สบู่";
    const nextNum = state.catalog.products.length + 1;
    setFormData({
      sku: `PRD-${String(nextNum).padStart(3, "0")}`,
      barcode: `885000${String(nextNum).padStart(7, "0")}`,
      name: "",
      description: "",
      category: defaultCat,
      price: "",
      stock: 0,
      unit: "ชิ้น",
      reorderPoint: 10,
      emoji: "📦",
      imageUrl: "",
      isOnline: true,
    });
    setErrors({});
    setDialogOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditingProduct(p);
    setFormData({
      sku: p.sku,
      barcode: p.barcode,
      name: p.name,
      description: p.description ?? "",
      category: p.category,
      price: p.price,
      stock: p.stock,
      unit: p.unit,
      reorderPoint: p.reorderPoint ?? 10,
      emoji: p.emoji || "📦",
      imageUrl: p.imageUrl ?? "",
      isOnline: p.isOnline !== false,
    });
    setErrors({});
    setDialogOpen(true);
  };

  // Automatically derive the warehouse from the selected category (1:1 rule)
  const autoWarehouse = useMemo(() => {
    if (!formData.category) return undefined;
    return selectWarehouseForCategory(state, formData.category);
  }, [state, formData.category]);

  const handleSimulatedUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // In web app, create a local preview URL
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setFormData((s) => ({ ...s, imageUrl: result }));
        toast.info("เลือกรูปภาพสินค้าแล้ว", { description: file.name });
      };
      reader.readAsDataURL(file);
    }
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!formData.sku.trim()) errs.sku = "กรุณาระบุรหัสสินค้า (SKU)";
    if (!formData.name.trim()) errs.name = "กรุณาระบุชื่อสินค้า";
    if (!formData.category.trim()) errs.category = "กรุณาเลือกหมวดหมู่สินค้า";

    const priceNum = Number(formData.price);
    if (isNaN(priceNum) || priceNum <= 0) {
      errs.price = "ราคาขายต้องเป็นตัวเลขที่มากกว่า 0";
    }

    const rpNum = Number(formData.reorderPoint);
    if (isNaN(rpNum) || rpNum < 0) {
      errs.reorderPoint = "จุดสั่งซื้อต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return false;

    const price = Number(formData.price);
    const stock = Number(formData.stock) || 0;
    const reorderPoint = Number(formData.reorderPoint) || 10;

    if (editingProduct) {
      actions.updateProduct(editingProduct.id, {
        sku: formData.sku.trim(),
        barcode: formData.barcode.trim() || editingProduct.barcode,
        name: formData.name.trim(),
        description: formData.description.trim(),
        category: formData.category as any,
        price,
        stock,
        unit: formData.unit.trim() || "ชิ้น",
        reorderPoint,
        emoji: formData.emoji,
        imageUrl: formData.imageUrl,
        isOnline: formData.isOnline,
      });
      toast.success("อัปเดตข้อมูลสินค้าสำเร็จ", {
        description: `${formData.name} (ซิงค์กับระบบขายหน้าร้าน POS เรียบร้อย)`,
      });
    } else {
      actions.addProduct({
        sku: formData.sku.trim(),
        barcode: formData.barcode.trim() || `885000${Date.now().toString().slice(-7)}`,
        name: formData.name.trim(),
        description: formData.description.trim(),
        category: formData.category as any,
        price,
        stock,
        unit: formData.unit.trim() || "ชิ้น",
        reorderPoint,
        emoji: formData.emoji,
        imageUrl: formData.imageUrl,
        isOnline: formData.isOnline,
      });
      toast.success("เพิ่มสินค้าใหม่สำเร็จ", {
        description: `${formData.name} (พร้อมขายหน้าร้านและออนไลน์)`,
      });
    }
    return true;
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    const res = actions.deleteProduct(deleteTarget.id);
    if (!res.ok) {
      toast.error("ไม่สามารถลบสินค้าได้", { description: res.reason });
    } else {
      toast.success("ลบสินค้าสำเร็จ", { description: deleteTarget.name });
    }
    setDeleteTarget(null);
  };

  // Metrics
  const totalProducts = state.catalog.products.length;
  const onlineCount = state.catalog.products.filter((p) => p.isOnline !== false).length;
  const reorderCount = selectReorderPointProducts(state).length;

  const columns: DataTableColumn<Product>[] = [
    {
      key: "thumbnail",
      header: "รูปสินค้า",
      align: "center",
      cell: (p) => (
        <div className="flex justify-center">
          <div className="flex size-11 items-center justify-center overflow-hidden rounded-md border bg-muted/40 shadow-xs">
            {p.imageUrl ? (
              <img src={p.imageUrl} alt={p.name} className="size-full object-cover" />
            ) : (
              <span className="text-2xl leading-none select-none">{p.emoji || "📦"}</span>
            )}
          </div>
        </div>
      ),
      className: "w-16",
    },
    {
      key: "sku",
      header: "รหัส / บาร์โค้ด",
      cell: (p) => (
        <div className="space-y-0.5">
          <Badge variant="outline" className="font-mono text-xs font-semibold">
            {p.sku}
          </Badge>
          <p className="font-mono text-[11px] text-muted-foreground">{p.barcode}</p>
        </div>
      ),
      sortValue: (p) => p.sku,
      className: "w-36",
    },
    {
      key: "name",
      header: "ชื่อสินค้า",
      cell: (p) => (
        <div className="max-w-xs space-y-0.5">
          <span className="font-medium text-foreground line-clamp-1">{p.name}</span>
          {p.description && (
            <p className="text-xs text-muted-foreground line-clamp-1">{p.description}</p>
          )}
        </div>
      ),
      sortValue: (p) => p.name,
    },
    {
      key: "category",
      header: "หมวดหมู่ & โกดัง",
      cell: (p) => {
        const wh = selectWarehouseForCategory(state, p.category);
        return (
          <div className="space-y-1">
            <Badge variant="secondary" className="font-medium text-xs">
              {p.category}
            </Badge>
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Building2 className="size-3 shrink-0 text-sun-600" />
              <span className="truncate">{wh?.name ?? "ไม่ระบุ"}</span>
            </div>
          </div>
        );
      },
      sortValue: (p) => p.category,
      className: "w-44",
    },
    {
      key: "price",
      header: "ราคาขาย",
      align: "right",
      cell: (p) => (
        <div className="text-right font-medium">
          <Money value={p.price} decimals={false} />
        </div>
      ),
      sortValue: (p) => p.price,
      className: "w-28",
    },
    {
      key: "stock",
      header: "สต็อก / จุดสั่งซื้อ",
      align: "right",
      cell: (p) => {
        const rp = p.reorderPoint ?? 10;
        const isBelow = p.stock <= rp;
        return (
          <div className="text-right">
            <span
              className={cn(
                "font-semibold",
                p.stock === 0 ? "text-danger" : isBelow ? "text-warning" : "text-foreground",
              )}
            >
              {formatNumber(p.stock)}
            </span>
            <span className="text-xs text-muted-foreground"> / {rp} {p.unit}</span>
            {isBelow && (
              <Badge
                variant="outline"
                className="mt-0.5 block w-fit ml-auto border-amber-300 bg-amber-50 px-1 py-0 text-[10px] text-amber-800"
              >
                {p.stock === 0 ? "หมด" : "ใกล้หมด"}
              </Badge>
            )}
          </div>
        );
      },
      sortValue: (p) => p.stock,
      className: "w-32",
    },
    {
      key: "online",
      header: "ขายออนไลน์",
      align: "center",
      cell: (p) => {
        const online = p.isOnline !== false;
        return (
          <div className="flex justify-center">
            <Badge
              variant="outline"
              className={cn(
                "gap-1 text-xs",
                online
                  ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                  : "border-border bg-muted/60 text-muted-foreground",
              )}
            >
              <Globe className="size-3" />
              {online ? "เปิดขาย" : "ปิดขาย"}
            </Badge>
          </div>
        );
      },
      sortValue: (p) => (p.isOnline !== false ? 1 : 0),
      className: "w-28",
    },
    {
      key: "actions",
      header: "จัดการ",
      align: "center",
      cell: (p) => (
        <div className="flex items-center justify-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openEdit(p)}
            className="h-8 px-2 text-muted-foreground hover:text-foreground"
            title="แก้ไขข้อมูลสินค้า"
          >
            <Edit2 className="size-3.5" />
            <span className="sr-only">แก้ไข</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeleteTarget(p)}
            className="h-8 px-2 text-muted-foreground hover:text-danger"
            title="ลบสินค้า"
          >
            <Trash2 className="size-3.5" />
            <span className="sr-only">ลบ</span>
          </Button>
        </div>
      ),
      className: "w-24",
    },
  ];

  const filters: DataTableFilter<Product>[] = [
    {
      key: "category",
      label: "หมวดหมู่สินค้า",
      options: state.categories.map((c) => ({ label: c.name, value: c.name })),
      predicate: (p, v) => p.category === v,
    },
    {
      key: "warehouseId",
      label: "โกดังที่จัดเก็บ",
      options: state.warehouses.map((w) => ({ label: w.name, value: w.id })),
      predicate: (p, v) => {
        const wh = selectWarehouseForCategory(state, p.category);
        return wh?.id === v;
      },
    },
    {
      key: "onlineStatus",
      label: "สถานะขายออนไลน์",
      options: [
        { label: "เปิดขายออนไลน์", value: "online" },
        { label: "ปิดขายออนไลน์", value: "offline" },
      ],
      predicate: (p, v) => (v === "online" ? p.isOnline !== false : p.isOnline === false),
    },
  ];

  return (
    <>
      <PageHeader
        title="จัดการสินค้า"
        description="บริหารจัดการรายการสินค้า ราคา รูปภาพ และกำหนดการวางจำหน่าย (เชื่อมโยงข้อมูลกับระบบหน้าร้าน POS)"
        actions={
          <Button onClick={openAdd} className="gap-1.5">
            <Plus className="size-4" /> เพิ่มสินค้าใหม่
          </Button>
        }
      />

      {/* Top Stat Summary Cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={Package}
          label="รายการสินค้าทั้งหมด"
          value={`${totalProducts} รายการ`}
          tone="sun"
          hint="พร้อมขายในระบบ"
        />
        <StatCard
          icon={Globe}
          label="เปิดขายในช่องทางออนไลน์"
          value={`${onlineCount} รายการ`}
          tone="teal"
          hint="ลูกค้าสั่งซื้อได้ทันที"
        />
        <StatCard
          icon={AlertTriangle}
          label="สินค้าถึงจุดสั่งซื้อ"
          value={`${reorderCount} รายการ`}
          tone={reorderCount > 0 ? "danger" : "success"}
          hint="สต็อกคงเหลือต่ำกว่าเกณฑ์"
        />
      </div>

      {/* Products DataTable */}
      <DataTable
        data={state.catalog.products}
        columns={columns}
        getRowId={(p) => p.id}
        searchPlaceholder="ค้นหาชื่อสินค้า, SKU, บาร์โค้ด หรือหมวดหมู่..."
        searchFn={(p, q) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.barcode.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          (p.description?.toLowerCase().includes(q) ?? false)
        }
        filters={filters}
        emptyTitle="ไม่พบรายการสินค้า"
        emptyDescription="ลองค้นหาด้วยคำค้นอื่น หรือคลิกปุ่มเพิ่มสินค้าใหม่ด้านบน"
      />

      {/* Add / Edit Form Dialog */}
      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editingProduct ? "แก้ไขข้อมูลสินค้า" : "เพิ่มสินค้าใหม่เข้าคลัง"}
        description="กรอกข้อมูลสินค้า โดยโกดังจัดเก็บจะถูกกำหนดอัตโนมัติตามหมวดหมู่ที่เลือก"
        submitLabel={editingProduct ? "บันทึกการแก้ไข" : "บันทึกสินค้า"}
        onSubmit={handleSubmit}
        className="sm:max-w-xl max-h-[90vh] overflow-y-auto"
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="รหัสสินค้า (SKU)" htmlFor="p-sku" required error={errors.sku}>
            <Input
              id="p-sku"
              value={formData.sku}
              onChange={(e) => {
                setFormData((s) => ({ ...s, sku: e.target.value }));
                if (errors.sku) setErrors((s) => ({ ...s, sku: "" }));
              }}
              placeholder="เช่น SP-005, MK-005"
            />
          </Field>
          <Field label="บาร์โค้ด" htmlFor="p-barcode" hint="ตัวเลข 13 หลัก">
            <Input
              id="p-barcode"
              value={formData.barcode}
              onChange={(e) => setFormData((s) => ({ ...s, barcode: e.target.value }))}
              placeholder="885000xxxxxxx"
            />
          </Field>
        </div>

        <Field label="ชื่อสินค้า" htmlFor="p-name" required error={errors.name}>
          <Input
            id="p-name"
            value={formData.name}
            onChange={(e) => {
              setFormData((s) => ({ ...s, name: e.target.value }));
              if (errors.name) setErrors((s) => ({ ...s, name: "" }));
            }}
            placeholder="ระบุชื่อสินค้า..."
          />
        </Field>

        <Field label="รายละเอียดสินค้า" htmlFor="p-desc">
          <Textarea
            id="p-desc"
            rows={2}
            value={formData.description}
            onChange={(e) => setFormData((s) => ({ ...s, description: e.target.value }))}
            placeholder="รายละเอียด ขนาด ปริมาณ หรือคำแนะนำสินค้า..."
          />
        </Field>

        {/* Image Upload Placeholder & Thumbnail */}
        <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
          <label className="text-sm font-medium text-foreground">
            รูปภาพสินค้า (Image Upload Placeholder)
          </label>
          <div className="flex items-center gap-4">
            <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-card text-3xl shadow-xs">
              {formData.imageUrl ? (
                <img src={formData.imageUrl} alt="preview" className="size-full object-cover" />
              ) : (
                <span>{formData.emoji || "📦"}</span>
              )}
            </div>

            <div className="flex-1 space-y-2">
              <div className="flex gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleSimulatedUpload}
                  accept="image/*"
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-1.5 text-xs"
                >
                  <Upload className="size-3.5" /> อัปโหลดรูปภาพ
                </Button>
                {formData.imageUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setFormData((s) => ({ ...s, imageUrl: "" }))}
                    className="text-xs text-danger"
                  >
                    ลบรูปภาพ
                  </Button>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                รองรับไฟล์ PNG, JPG หรือเลือกไอคอนอีโมจิด้านล่าง
              </p>
            </div>
          </div>

          {/* Emoji fast picker */}
          <div className="pt-2 border-t">
            <span className="text-xs text-muted-foreground block mb-1.5">หรือเลือกสัญลักษณ์แทนรูป:</span>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_EMOJIS.map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => setFormData((s) => ({ ...s, emoji: em, imageUrl: "" }))}
                  className={cn(
                    "flex size-7 items-center justify-center rounded hover:bg-muted text-base transition-transform active:scale-90",
                    formData.emoji === em && !formData.imageUrl && "bg-sun-100 ring-2 ring-sun-500",
                  )}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Category & Warehouse (Read-Only taken from Category) */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="หมวดหมู่สินค้า" htmlFor="p-cat" required error={errors.category}>
            <Select
              value={formData.category}
              onValueChange={(val) => {
                setFormData((s) => ({ ...s, category: val }));
                if (errors.category) setErrors((s) => ({ ...s, category: "" }));
              }}
            >
              <SelectTrigger id="p-cat">
                <SelectValue placeholder="เลือกหมวดหมู่..." />
              </SelectTrigger>
              <SelectContent>
                {state.categories.map((c) => (
                  <SelectItem key={c.id} value={c.name}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {/* Warehouse is shown automatically as READ-ONLY */}
          <Field
            label="โกดังที่จัดเก็บ (อิงตามหมวดหมู่)"
            htmlFor="p-warehouse-readonly"
            hint="กำหนดอัตโนมัติตามกฎ 1 หมวดหมู่: 1 โกดัง"
          >
            <div className="flex items-center gap-2 rounded-md border bg-muted/60 px-3 py-2 text-sm text-foreground cursor-not-allowed">
              <Building2 className="size-4 shrink-0 text-sun-600" />
              <span className="truncate font-medium">
                {autoWarehouse ? `${autoWarehouse.name} (${autoWarehouse.id})` : "ยังไม่ได้เลือกหมวดหมู่"}
              </span>
            </div>
          </Field>
        </div>

        {/* Pricing & Unit */}
        <div className="grid grid-cols-3 gap-3">
          <Field label="ราคาขาย (บาท)" htmlFor="p-price" required error={errors.price}>
            <Input
              id="p-price"
              type="number"
              min="0"
              step="1"
              value={formData.price}
              onChange={(e) => {
                setFormData((s) => ({ ...s, price: e.target.value }));
                if (errors.price) setErrors((s) => ({ ...s, price: "" }));
              }}
              placeholder="0.00"
            />
          </Field>

          <Field label="หน่วยนับ" htmlFor="p-unit">
            <Input
              id="p-unit"
              value={formData.unit}
              onChange={(e) => setFormData((s) => ({ ...s, unit: e.target.value }))}
              placeholder="ชิ้น, ขวด, กล่อง"
            />
          </Field>

          <Field label="จุดสั่งซื้อ (Reorder Pt.)" htmlFor="p-rp" required error={errors.reorderPoint}>
            <Input
              id="p-rp"
              type="number"
              min="0"
              value={formData.reorderPoint}
              onChange={(e) => {
                setFormData((s) => ({ ...s, reorderPoint: e.target.value }));
                if (errors.reorderPoint) setErrors((s) => ({ ...s, reorderPoint: "" }));
              }}
              placeholder="10"
            />
          </Field>
        </div>

        {/* Initial Stock */}
        <Field label="จำนวนสต็อกปัจจุบัน" htmlFor="p-stock" hint="สินค้าคงเหลือในระบบ">
          <Input
            id="p-stock"
            type="number"
            min="0"
            value={formData.stock}
            onChange={(e) => setFormData((s) => ({ ...s, stock: e.target.value }))}
            placeholder="0"
          />
        </Field>

        {/* "เปิดขายออนไลน์" Switch */}
        <div className="flex items-center justify-between rounded-lg border bg-card p-3 shadow-xs">
          <div className="space-y-0.5">
            <label htmlFor="online-switch" className="text-sm font-medium text-foreground cursor-pointer">
              เปิดขายในช่องทางออนไลน์
            </label>
            <p className="text-xs text-muted-foreground">
              เปิดให้ลูกค้าเห็นและสั่งซื้อสินค้านี้ในระบบสั่งซื้อออนไลน์
            </p>
          </div>
          <Switch
            id="online-switch"
            checked={formData.isOnline}
            onCheckedChange={(val) => setFormData((s) => ({ ...s, isOnline: val }))}
          />
        </div>
      </FormDialog>

      {/* Delete Confirmation Dialog */}
      {deleteTarget && (
        <ConfirmDialog
          open={!!deleteTarget}
          onOpenChange={(o) => !o && setDeleteTarget(null)}
          tone="danger"
          title={`ต้องการลบสินค้า “${deleteTarget.name}” หรือไม่?`}
          description={`การลบสินค้านี้จะนำรายการออกจากระบบคลังและระบบขายหน้าร้าน (POS) รหัส SKU: ${deleteTarget.sku}`}
          confirmLabel="ยืนยันการลบ"
          onConfirm={handleDeleteConfirm}
        />
      )}
    </>
  );
}
