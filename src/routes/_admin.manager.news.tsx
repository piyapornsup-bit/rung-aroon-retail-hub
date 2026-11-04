import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  BadgePercent,
  Calendar,
  Clock,
  Edit2,
  Eye,
  Megaphone,
  Plus,
  Sparkles,
  Tag,
  Trash2,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  ShoppingBag,
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatNumber, formatShortDate } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { PromotionItem, NewsType, NewsStatus } from "@/lib/mock-data";

export const Route = createFileRoute("/_admin/manager/news")({
  head: () => ({
    meta: [
      { title: "ข่าวสารและโปรโมชัน — ร้านรุ่งอรุณ มินิมาร์ท" },
      { name: "description", content: "จัดการข่าวสาร แคมเปญส่วนลด และโปรโมชันบนหน้าร้านค้าออนไลน์" },
      { property: "og:title", content: "ข่าวสารและโปรโมชัน — ร้านรุ่งอรุณ มินิมาร์ท" },
      { property: "og:description", content: "จัดการข่าวสาร แคมเปญส่วนลด และโปรโมชันบนหน้าร้านค้าออนไลน์" },
    ],
  }),
  component: NewsAndPromotionsPage,
});

const SAMPLE_IMAGES = [
  { label: "เครื่องดื่มและนม", url: "https://images.unsplash.com/photo-1527661591475-527312dd65f5?auto=format&fit=crop&w=600&q=80" },
  { label: "บะหมี่และอาหารแห้ง", url: "https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&w=600&q=80" },
  { label: "ขนมและของว่าง", url: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=600&q=80" },
  { label: "ข่าวประชาสัมพันธ์ร้าน", url: "https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=600&q=80" },
];

interface FormDraft {
  type: NewsType;
  title: string;
  description: string;
  imageUrl: string;
  applicableProducts: string[];
  discountType: "ไม่มีส่วนลด" | "เปอร์เซ็นต์" | "บาท";
  discountValue: number;
  startDate: string;
  endDate: string;
  status: NewsStatus;
}

const defaultDraft: FormDraft = {
  type: "โปรโมชัน",
  title: "",
  description: "",
  imageUrl: SAMPLE_IMAGES[0].url,
  applicableProducts: [],
  discountType: "เปอร์เซ็นต์",
  discountValue: 10,
  startDate: new Date().toISOString().slice(0, 10),
  endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  status: "เผยแพร่",
};

function NewsAndPromotionsPage() {
  const { state, actions } = useStore();
  const promotions = state.promotions;
  const products = state.catalog.products;

  const [activeTab, setActiveTab] = useState<string>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PromotionItem | null>(null);
  const [draft, setDraft] = useState<FormDraft>(defaultDraft);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTarget, setPreviewTarget] = useState<PromotionItem | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<PromotionItem | null>(null);

  const activePromos = useMemo(
    () => promotions.filter((p) => p.status === "เผยแพร่"),
    [promotions],
  );
  const discountPromos = useMemo(
    () => promotions.filter((p) => p.type === "โปรโมชัน"),
    [promotions],
  );
  const newsItems = useMemo(
    () => promotions.filter((p) => p.type === "ข่าวสาร"),
    [promotions],
  );

  const filteredData = useMemo(() => {
    switch (activeTab) {
      case "published":
        return activePromos;
      case "promo":
        return discountPromos;
      case "news":
        return newsItems;
      default:
        return promotions;
    }
  }, [promotions, activeTab, activePromos, discountPromos, newsItems]);

  const handleOpenCreate = () => {
    setEditingItem(null);
    setDraft({
      ...defaultDraft,
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    });
    setFormOpen(true);
  };

  const handleOpenEdit = (item: PromotionItem) => {
    setEditingItem(item);
    setDraft({
      type: item.type,
      title: item.title,
      description: item.description,
      imageUrl: item.imageUrl || "",
      applicableProducts: item.applicableProducts ? [...item.applicableProducts] : [],
      discountType: item.discountType || "ไม่มีส่วนลด",
      discountValue: item.discountValue || 0,
      startDate: item.startDate.slice(0, 10),
      endDate: item.endDate.slice(0, 10),
      status: item.status,
    });
    setFormOpen(true);
  };

  const handleSave = () => {
    if (!draft.title.trim()) {
      toast.error("กรุณาระบุหัวข้อข่าวหรือโปรโมชัน");
      return;
    }
    if (!draft.description.trim()) {
      toast.error("กรุณาระบุรายละเอียด");
      return;
    }

    if (editingItem) {
      actions.updatePromotion(editingItem.id, {
        type: draft.type,
        title: draft.title.trim(),
        description: draft.description.trim(),
        imageUrl: draft.imageUrl.trim() || undefined,
        applicableProducts: draft.applicableProducts,
        discountType: draft.discountType,
        discountValue: draft.discountType === "ไม่มีส่วนลด" ? 0 : Number(draft.discountValue),
        startDate: draft.startDate,
        endDate: draft.endDate,
        status: draft.status,
      });
      toast.success(`อัปเดต "${draft.title}" เรียบร้อยแล้ว`);
    } else {
      actions.addPromotion({
        type: draft.type,
        title: draft.title.trim(),
        description: draft.description.trim(),
        imageUrl: draft.imageUrl.trim() || undefined,
        applicableProducts: draft.applicableProducts,
        discountType: draft.discountType,
        discountValue: draft.discountType === "ไม่มีส่วนลด" ? 0 : Number(draft.discountValue),
        startDate: draft.startDate,
        endDate: draft.endDate,
        status: draft.status,
      });
      toast.success(`เพิ่ม "${draft.title}" เรียบร้อยแล้ว`);
    }

    setFormOpen(false);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    actions.deletePromotion(deleteTarget.id);
    toast.success(`ลบรายการ "${deleteTarget.title}" แล้ว`);
    setDeleteTarget(null);
  };

  const toggleProductSelection = (productId: string) => {
    setDraft((prev) => {
      const exists = prev.applicableProducts.includes(productId);
      return {
        ...prev,
        applicableProducts: exists
          ? prev.applicableProducts.filter((id) => id !== productId)
          : [...prev.applicableProducts, productId],
      };
    });
  };

  const columns: DataTableColumn<PromotionItem>[] = [
    {
      id: "title",
      header: "หัวข้อและประเภท",
      accessor: (r) => (
        <div className="flex items-center gap-3">
          <div className="size-12 shrink-0 rounded-md overflow-hidden bg-muted border border-border">
            {r.imageUrl ? (
              <img
                src={r.imageUrl}
                alt={r.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                <ImageIcon className="size-5" />
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <Badge
                variant="outline"
                className={
                  r.type === "โปรโมชัน"
                    ? "border-amber-500/40 text-amber-700 bg-amber-50 dark:bg-amber-950/20"
                    : "border-blue-500/40 text-blue-700 bg-blue-50 dark:bg-blue-950/20"
                }
              >
                {r.type === "โปรโมชัน" ? (
                  <Tag className="size-3 mr-1 inline" />
                ) : (
                  <Megaphone className="size-3 mr-1 inline" />
                )}
                {r.type}
              </Badge>
              {r.discountType && r.discountType !== "ไม่มีส่วนลด" && r.discountValue ? (
                <span className="text-xs font-semibold text-rose-600 bg-rose-50 dark:bg-rose-950/30 px-1.5 py-0.5 rounded border border-rose-200">
                  ลด {r.discountValue}
                  {r.discountType === "เปอร์เซ็นต์" ? "%" : " บาท"}
                </span>
              ) : null}
            </div>
            <span className="font-semibold text-foreground block line-clamp-1">{r.title}</span>
            <span className="text-xs text-muted-foreground line-clamp-1">{r.description}</span>
          </div>
        </div>
      ),
      sortable: true,
      searchable: true,
    },
    {
      id: "date",
      header: "ระยะเวลา",
      accessor: (r) => (
        <div className="text-xs text-muted-foreground">
          <div>เริ่ม: {formatShortDate(r.startDate)}</div>
          <div>ถึง: {formatShortDate(r.endDate)}</div>
        </div>
      ),
      sortable: true,
    },
    {
      id: "products",
      header: "สินค้าที่ร่วมรายการ",
      accessor: (r) => {
        const count = r.applicableProducts?.length || 0;
        return (
          <span className="text-xs">
            {count === 0 ? "ทุกสินค้า" : `${count} รายการ`}
          </span>
        );
      },
    },
    {
      id: "status",
      header: "สถานะ",
      accessor: (r) => <StatusBadge status={r.status} />,
      sortable: true,
    },
    {
      id: "actions",
      header: "จัดการ",
      accessor: (r) => (
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            title="ดูตัวอย่างมุมมองลูกค้า"
            onClick={(e) => {
              e.stopPropagation();
              setPreviewTarget(r);
              setPreviewOpen(true);
            }}
          >
            <Eye className="size-4 text-muted-foreground" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            title="แก้ไข"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenEdit(r);
            }}
          >
            <Edit2 className="size-4 text-muted-foreground" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            title="ลบ"
            className="text-destructive hover:bg-destructive/10"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteTarget(r);
            }}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="ข่าวสารและโปรโมชัน"
        description="สร้างและบริหารแคมเปญโปรโมชัน ส่วนลด และข่าวสารสำหรับลูกค้าหน้าร้านออนไลน์"
        actions={
          <Button onClick={handleOpenCreate}>
            <Plus className="size-4 mr-1.5" />
            สร้างข่าวหรือโปรโมชันใหม่
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
        <StatCard
          icon={BadgePercent}
          label="แคมเปญทั้งหมด"
          value={`${promotions.length} รายการ`}
          tone="teal"
          hint="ข่าวและโปรโมชันในระบบ"
        />
        <StatCard
          icon={CheckCircle2}
          label="กำลังเผยแพร่"
          value={`${activePromos.length} รายการ`}
          tone="success"
          hint="แสดงผลบนหน้าเว็บไซต์"
        />
        <StatCard
          icon={Tag}
          label="โปรโมชันส่วนลด"
          value={`${discountPromos.length} รายการ`}
          tone="sun"
          hint="แคมเปญกระตุ้นยอดขาย"
        />
        <StatCard
          icon={Megaphone}
          label="ข่าวประชาสัมพันธ์"
          value={`${newsItems.length} ข่าว`}
          tone="info"
          hint="ประกาศและข้อมูลร้าน"
        />
      </div>

      <div className="mb-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted/70">
            <TabsTrigger value="all">
              ทั้งหมด ({promotions.length})
            </TabsTrigger>
            <TabsTrigger value="published">
              กำลังเผยแพร่ ({activePromos.length})
            </TabsTrigger>
            <TabsTrigger value="promo">
              เฉพาะโปรโมชัน ({discountPromos.length})
            </TabsTrigger>
            <TabsTrigger value="news">
              เฉพาะข่าวสาร ({newsItems.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <DataTable
        columns={columns}
        data={filteredData}
        searchPlaceholder="ค้นหาหัวข้อข่าว, โปรโมชัน..."
        onRowClick={(r) => {
          setPreviewTarget(r);
          setPreviewOpen(true);
        }}
        emptyMessage="ไม่มีรายการข่าวสารหรือโปรโมชันในหมวดนี้"
      />

      {/* Create / Edit Dialog with Real-Time Customer Live Preview Card */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "แก้ไขข่าวสาร / โปรโมชัน" : "สร้างข่าวสารหรือโปรโมชันใหม่"}
            </DialogTitle>
            <DialogDescription>
              กำหนดรายละเอียด รูปภาพ ส่วนลด พร้อมดูตัวอย่างการแสดงผลบนหน้าร้านค้าออนไลน์แบบเรียลไทม์
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 my-2">
            {/* Left Column: Form Controls (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>ประเภท</Label>
                  <Select
                    value={draft.type}
                    onValueChange={(v) => setDraft((p) => ({ ...p, type: v as NewsType }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="โปรโมชัน">โปรโมชัน (มีส่วนลด)</SelectItem>
                      <SelectItem value="ข่าวสาร">ข่าวสาร (ประชาสัมพันธ์)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>สถานะการเผยแพร่</Label>
                  <Select
                    value={draft.status}
                    onValueChange={(v) => setDraft((p) => ({ ...p, status: v as NewsStatus }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="เผยแพร่">เผยแพร่ (แสดงผลทันที)</SelectItem>
                      <SelectItem value="ฉบับร่าง">ฉบับร่าง (ยังไม่เผยแพร่)</SelectItem>
                      <SelectItem value="สิ้นสุดแล้ว">สิ้นสุดแล้ว</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="formTitle">
                  หัวข้อ <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="formTitle"
                  placeholder="เช่น มหกรรมลดกระหน่ำรับลมหนาว ลด 15% ทุกชิ้น"
                  value={draft.title}
                  onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="formDesc">
                  รายละเอียด <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="formDesc"
                  rows={3}
                  placeholder="รายละเอียดโปรโมชัน เงื่อนไข และสินค้าที่ร่วมรายการ..."
                  value={draft.description}
                  onChange={(e) => setDraft((p) => ({ ...p, description: e.target.value }))}
                />
              </div>

              {/* Discount Section (shown if type === โปรโมชัน) */}
              {draft.type === "โปรโมชัน" && (
                <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20 space-y-3">
                  <span className="text-xs font-semibold text-amber-900 dark:text-amber-200 block">
                    การตั้งค่าส่วนลด
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">ประเภทส่วนลด</Label>
                      <Select
                        value={draft.discountType}
                        onValueChange={(v: any) => setDraft((p) => ({ ...p, discountType: v }))}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="เปอร์เซ็นต์">เปอร์เซ็นต์ (%)</SelectItem>
                          <SelectItem value="บาท">จำนวนเงิน (บาท)</SelectItem>
                          <SelectItem value="ไม่มีส่วนลด">ไม่มีส่วนลด</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {draft.discountType !== "ไม่มีส่วนลด" && (
                      <div className="space-y-1.5">
                        <Label className="text-xs">
                          มูลค่าส่วนลด ({draft.discountType === "เปอร์เซ็นต์" ? "%" : "บาท"})
                        </Label>
                        <Input
                          type="number"
                          min={1}
                          max={draft.discountType === "เปอร์เซ็นต์" ? 100 : 10000}
                          className="h-9"
                          value={draft.discountValue}
                          onChange={(e) =>
                            setDraft((p) => ({ ...p, discountValue: Number(e.target.value) }))
                          }
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Image URL & Preset Picker */}
              <div className="space-y-2">
                <Label htmlFor="formImg">ลิงก์รูปภาพประกอบ (URL)</Label>
                <Input
                  id="formImg"
                  placeholder="https://..."
                  value={draft.imageUrl}
                  onChange={(e) => setDraft((p) => ({ ...p, imageUrl: e.target.value }))}
                />
                <div className="flex flex-wrap gap-1.5 text-xs">
                  <span className="text-muted-foreground mr-1 self-center">เลือกภาพตัวอย่าง:</span>
                  {SAMPLE_IMAGES.map((img) => (
                    <button
                      key={img.label}
                      type="button"
                      className="px-2 py-0.5 rounded border border-border bg-card hover:bg-muted text-xs transition-colors"
                      onClick={() => setDraft((p) => ({ ...p, imageUrl: img.url }))}
                    >
                      {img.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Applicable products */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>สินค้าที่ร่วมรายการ</Label>
                  <span className="text-xs text-muted-foreground">
                    เลือก {draft.applicableProducts.length} รายการ (ไม่เลือก = ทุกสินค้า)
                  </span>
                </div>
                <div className="max-h-28 overflow-y-auto rounded-md border border-border p-2 space-y-1 text-xs bg-card">
                  {products.map((prod) => {
                    const isSelected = draft.applicableProducts.includes(prod.id);
                    return (
                      <div
                        key={prod.id}
                        className={`flex items-center justify-between p-1.5 rounded cursor-pointer transition-colors ${
                          isSelected ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"
                        }`}
                        onClick={() => toggleProductSelection(prod.id)}
                      >
                        <span className="truncate">{prod.name} ({prod.sku})</span>
                        <Badge variant={isSelected ? "default" : "outline"} className="text-[10px] h-5">
                          {isSelected ? "เลือกแล้ว" : "เลือก"}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Date range */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="formStart">วันที่เริ่มต้น</Label>
                  <Input
                    id="formStart"
                    type="date"
                    value={draft.startDate}
                    onChange={(e) => setDraft((p) => ({ ...p, startDate: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="formEnd">วันที่สิ้นสุด</Label>
                  <Input
                    id="formEnd"
                    type="date"
                    value={draft.endDate}
                    onChange={(e) => setDraft((p) => ({ ...p, endDate: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            {/* Right Column: Live Customer Preview Card (5 cols) */}
            <div className="lg:col-span-5 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-amber-500" />
                  ตัวอย่างการแสดงผลบนเว็บลูกค้า (Live Preview)
                </span>
                <Badge variant="outline" className="text-[10px] bg-muted/50">
                  Customer Storefront Card
                </Badge>
              </div>

              {/* Mimic Customer Web Store Promo Card */}
              <div className="flex-1 rounded-xl border-2 border-dashed border-border p-3 bg-muted/20 flex flex-col justify-center">
                <div className="w-full bg-card rounded-xl border border-border shadow-md overflow-hidden transition-all hover:shadow-lg">
                  {/* Card Banner Image */}
                  <div className="relative w-full h-44 bg-gradient-to-tr from-sun-100 to-amber-100 overflow-hidden">
                    {draft.imageUrl ? (
                      <img
                        src={draft.imageUrl}
                        alt="Preview"
                        className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground p-4 text-center">
                        <ImageIcon className="size-8 mb-1 opacity-50" />
                        <span className="text-xs">ไม่มีรูปภาพ</span>
                      </div>
                    )}

                    {/* Floating badges on preview */}
                    <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 items-start">
                      <Badge className="bg-primary/95 text-white shadow-sm text-xs font-medium">
                        {draft.type === "โปรโมชัน" ? "โปรโมชันพิเศษ" : "ข่าวสารจากร้าน"}
                      </Badge>
                    </div>

                    {draft.discountType !== "ไม่มีส่วนลด" && draft.discountValue > 0 && (
                      <div className="absolute top-2.5 right-2.5">
                        <span className="inline-flex items-center gap-1 bg-rose-600 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-md animate-pulse">
                          ลด {draft.discountValue}
                          {draft.discountType === "เปอร์เซ็นต์" ? "%" : "฿"}
                        </span>
                      </div>
                    )}

                    {draft.status === "ฉบับร่าง" && (
                      <div className="absolute bottom-2 left-2">
                        <Badge variant="secondary" className="text-[10px] bg-black/60 text-white">
                          ฉบับร่าง (ลูกค้ายังไม่เห็น)
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Card Content */}
                  <div className="p-4 space-y-2.5">
                    <div>
                      <h3 className="font-bold text-base text-foreground line-clamp-2">
                        {draft.title || "หัวข้อข่าวหรือโปรโมชันจะปรากฏที่นี่..."}
                      </h3>
                      <p className="text-xs text-muted-foreground line-clamp-3 mt-1 leading-relaxed">
                        {draft.description ||
                          "รายละเอียดโปรโมชัน สิทธิพิเศษ และเงื่อนไขการรับส่วนลดของร้านรุ่งอรุณ..."}
                      </p>
                    </div>

                    {/* Applicable products indicator */}
                    <div className="pt-1">
                      <span className="text-[11px] text-muted-foreground block mb-1">
                        สินค้าที่เข้าร่วม:
                      </span>
                      {draft.applicableProducts.length === 0 ? (
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                          ✓ ทุกสินค้าในร้านรุ่งอรุณ
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {draft.applicableProducts.slice(0, 3).map((id) => {
                            const p = products.find((x) => x.id === id);
                            return (
                              <span
                                key={id}
                                className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-foreground line-clamp-1 max-w-[120px]"
                              >
                                {p?.name || id}
                              </span>
                            );
                          })}
                          {draft.applicableProducts.length > 3 && (
                            <span className="text-[10px] text-muted-foreground self-center">
                              +{draft.applicableProducts.length - 3} อื่นๆ
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Card Footer: Date & Storefront Button */}
                    <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
                      <span className="text-muted-foreground flex items-center gap-1 text-[11px]">
                        <Clock className="size-3 text-muted-foreground" />
                        ถึง {draft.endDate ? formatShortDate(draft.endDate) : "-"}
                      </span>
                      <Button size="sm" className="h-7 text-xs px-3">
                        <ShoppingBag className="size-3 mr-1" />
                        ช้อปเลย
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              ยกเลิก
            </Button>
            <Button onClick={handleSave}>
              {editingItem ? "บันทึกการแก้ไข" : "สร้างและเผยแพร่"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Standalone Live Customer View Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-md">
          {previewTarget && (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="size-4 text-amber-500" />
                  <span>ตัวอย่างหน้าร้านค้าออนไลน์</span>
                </DialogTitle>
                <DialogDescription>
                  การแสดงผลการ์ดโปรโมชันเมื่อลูกค้าเปิดเข้าชมเว็บไซต์ร้านรุ่งอรุณ
                </DialogDescription>
              </DialogHeader>

              <div className="w-full bg-card rounded-xl border border-border shadow-md overflow-hidden my-2">
                <div className="relative w-full h-48 bg-muted overflow-hidden">
                  {previewTarget.imageUrl ? (
                    <img
                      src={previewTarget.imageUrl}
                      alt={previewTarget.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <ImageIcon className="size-10" />
                    </div>
                  )}

                  <div className="absolute top-2.5 left-2.5">
                    <Badge className="bg-primary/95 text-white shadow-sm text-xs font-medium">
                      {previewTarget.type}
                    </Badge>
                  </div>

                  {previewTarget.discountType && previewTarget.discountType !== "ไม่มีส่วนลด" && (
                    <div className="absolute top-2.5 right-2.5">
                      <span className="inline-flex items-center gap-1 bg-rose-600 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-md">
                        ลด {previewTarget.discountValue}
                        {previewTarget.discountType === "เปอร์เซ็นต์" ? "%" : "฿"}
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-4 space-y-3">
                  <h3 className="font-bold text-base text-foreground leading-snug">
                    {previewTarget.title}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {previewTarget.description}
                  </p>

                  <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Clock className="size-3.5" />
                      ระยะเวลา: {formatShortDate(previewTarget.startDate)} - {formatShortDate(previewTarget.endDate)}
                    </span>
                    <Button size="sm" className="h-8 text-xs">
                      ดูสินค้า
                    </Button>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setPreviewOpen(false)}>
                  ปิดหน้าต่าง
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`ยืนยันการลบ "${deleteTarget?.title}"?`}
        description="การลบจะไม่สามารถกู้คืนได้ และแคมเปญนี้จะถูกนำออกจากหน้าร้านค้าออนไลน์ทันที"
        confirmText="ยืนยันการลบ"
        confirmTone="danger"
        onConfirm={handleDelete}
      />
    </>
  );
}

