import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  Eye,
  FileCheck,
  FileText,
  Filter,
  Layers,
  Lock,
  Mail,
  MapPin,
  Package,
  Phone,
  Receipt,
  RotateCcw,
  Search as SearchIcon,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Tag,
  Truck,
  User,
  UserCheck,
  UserCog,
  UserPlus,
  Users,
  X,
  XCircle,
  ClipboardList,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Money } from "@/components/admin/Money";
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
import { formatNumber, formatShortDate, formatDate, formatDateTime, formatPhone } from "@/lib/format";
import { ROLE_LABELS, type RoleKey, orderTotal } from "@/lib/mock-data";
import { useStore, useCurrentUser, selectWarehouseForCategory } from "@/lib/store";

export const Route = createFileRoute("/_admin/search")({
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search.q === "string" ? search.q : "",
    type: typeof search.type === "string" ? search.type : "products",
  }),
  head: () => ({
    meta: [
      { title: "ค้นหาข้อมูล — ร้านรุ่งอรุณ มินิมาร์ท" },
      { name: "description", content: "ค้นหาข้อมูลสินค้า คำสั่งซื้อ บิลขาย สมาชิก พนักงาน และเอกสารในระบบ" },
      { property: "og:title", content: "ค้นหาข้อมูล — ร้านรุ่งอรุณ มินิมาร์ท" },
      { property: "og:description", content: "ค้นหาข้อมูลสินค้า คำสั่งซื้อ บิลขาย สมาชิก พนักงาน และเอกสารในระบบ" },
    ],
  }),
  component: GlobalSearchPage,
});

export type SearchDataType =
  | "products"
  | "orders"
  | "receipts"
  | "members"
  | "employees"
  | "pos"
  | "prs"
  | "agentReceipts"
  | "suppliers";

interface TypeConfig {
  id: SearchDataType;
  label: string;
  shortLabel: string;
  icon: any;
  placeholder: string;
  description: string;
}

const TYPE_CONFIGS: TypeConfig[] = [
  {
    id: "products",
    label: "สินค้าและสต็อก",
    shortLabel: "สินค้า",
    icon: Package,
    placeholder: "ค้นหารหัส SKU, ชื่อสินค้า, หมวดหมู่, บาร์โค้ด...",
    description: "รายการสินค้าคงคลัง จุดสั่งซื้อ ราคาขาย และสถานะออนไลน์",
  },
  {
    id: "orders",
    label: "คำสั่งซื้อออนไลน์",
    shortLabel: "คำสั่งซื้อ",
    icon: ShoppingBag,
    placeholder: "ค้นหาเลขที่คำสั่งซื้อ, ชื่อลูกค้า, เบอร์โทรศัพท์...",
    description: "รายการออเดอร์ สถานะการชำระ และข้อมูลการจัดส่งพัสดุ",
  },
  {
    id: "receipts",
    label: "บิลขายหน้าร้าน",
    shortLabel: "บิลขาย",
    icon: Receipt,
    placeholder: "ค้นหาเลขที่ใบเสร็จ POS, ชื่อแคชเชียร์...",
    description: "ประวัติการขายเคาน์เตอร์ ยอดสุทธิ และวิธีการชำระเงิน",
  },
  {
    id: "members",
    label: "สมาชิกและสะสมแต้ม",
    shortLabel: "สมาชิก",
    icon: Users,
    placeholder: "ค้นหารหัสสมาชิก, ชื่อ-นามสกุล, เบอร์โทรศัพท์...",
    description: "ข้อมูลสมาชิกร้าน ระดับชั้น แต้มสะสม และประวัติยอดซื้อ",
  },
  {
    id: "employees",
    label: "ข้อมูลพนักงาน",
    shortLabel: "พนักงาน",
    icon: UserCog,
    placeholder: "ค้นหาชื่อพนักงาน, ชื่อเล่น, ตำแหน่ง, หน้าที่...",
    description: "บุคลากร บทบาทสิทธิ์การใช้งาน และหน้าที่รับผิดชอบ",
  },
  {
    id: "pos",
    label: "ใบสั่งซื้อสินค้า (PO)",
    shortLabel: "ใบสั่งซื้อ (PO)",
    icon: ShoppingCart,
    placeholder: "ค้นหาเลขที่ PO, ชื่อบริษัทคู่ค้า, ตัวแทนจำหน่าย...",
    description: "เอกสารสั่งซื้อส่งให้ตัวแทน โกดังปลายทาง และสถานะจัดส่ง",
  },
  {
    id: "prs",
    label: "ใบเสนอซื้อ (PR)",
    shortLabel: "ใบเสนอซื้อ (PR)",
    icon: ClipboardList,
    placeholder: "ค้นหาเลขที่ PR, ผู้ขอซื้อ, บริษัทคู่ค้า...",
    description: "คำขอสั่งซื้อสินค้า รอการอนุมัติจากผู้จัดการร้าน",
  },
  {
    id: "agentReceipts",
    label: "ใบเสร็จตัวแทน",
    shortLabel: "ใบเสร็จตัวแทน",
    icon: FileText,
    placeholder: "ค้นหาเลขที่ใบเสร็จตัวแทน, บริษัทคู่ค้า, ตัวแทน...",
    description: "หลักฐานการชำระเงินและใบเสร็จรับเงินจากตัวแทนจำหน่าย",
  },
  {
    id: "suppliers",
    label: "บริษัทคู่ค้าและตัวแทน",
    shortLabel: "บริษัทคู่ค้า",
    icon: Truck,
    placeholder: "ค้นหาชื่อบริษัท, ตัวแทนจำหน่าย, เลขภาษี...",
    description: "ฐานข้อมูลคู่ค้า ตัวแทนจำหน่ายในสังกัด และเครดิตเทอม",
  },
];

/** Role-based access control matrix */
const ROLE_PERMISSIONS: Record<RoleKey, SearchDataType[]> = {
  owner: ["products", "orders", "receipts", "members", "employees", "pos", "prs", "agentReceipts", "suppliers"],
  manager: ["products", "orders", "receipts", "members", "employees", "pos", "prs", "agentReceipts", "suppliers"],
  sales: ["products", "orders", "receipts", "members"],
  warehouse: ["products", "orders", "pos"],
  purchasing: ["products", "pos", "prs", "agentReceipts", "suppliers"],
};

function GlobalSearchPage() {
  const { state, actions } = useStore();
  const user = useCurrentUser();
  const searchParams = Route.useSearch();
  const navigate = useNavigate();

  const [query, setQuery] = useState(searchParams.q || "");
  const [selectedType, setSelectedType] = useState<SearchDataType>(
    (searchParams.type as SearchDataType) || "products",
  );
  const [secondaryFilter, setSecondaryFilter] = useState<string>("all");
  const [detailItem, setDetailItem] = useState<any | null>(null);

  // Member Registration State
  const [registerOpen, setRegisterOpen] = useState(false);
  const [regName, setRegName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regBirthday, setRegBirthday] = useState("");
  const [regAddress, setRegAddress] = useState("");
  const [regError, setRegError] = useState("");

  const handleRegisterMember = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError("");

    const name = regName.trim();
    const phone = regPhone.trim().replace(/[\s-]/g, "");

    if (!name) {
      setRegError("กรุณากรอกชื่อ-นามสกุลสมาชิก");
      return;
    }

    if (!phone || phone.length < 9 || phone.length > 10 || !/^\d+$/.test(phone)) {
      setRegError("กรุณากรอกเบอร์โทรศัพท์ 9-10 หลักให้ถูกต้อง");
      return;
    }

    const existing = state.members.find(
      (m) => m.phone.replace(/[\s-]/g, "") === phone,
    );
    if (existing) {
      setRegError(`เบอร์โทรศัพท์นี้ลงทะเบียนสมาชิกแล้ว (${existing.name} รหัส ${existing.code})`);
      return;
    }

    const newMember = actions.addMember({
      name,
      phone,
      birthday: regBirthday.trim(),
      address: regAddress.trim(),
    });

    setRegisterOpen(false);
    setRegName("");
    setRegPhone("");
    setRegBirthday("");
    setRegAddress("");
    setRegError("");

    toast.success(`สมัครสมาชิกสำเร็จ! รหัสสมาชิก: ${newMember.code}`, {
      description: `คุณ ${newMember.name} เบอร์โทร ${newMember.phone}`,
    });
  };

  const allowedTypes = useMemo(() => ROLE_PERMISSIONS[user.role] || ["products"], [user.role]);
  const isAllowed = allowedTypes.includes(selectedType);

  const currentTypeConfig = TYPE_CONFIGS.find((t) => t.id === selectedType) || TYPE_CONFIGS[0];

  // Helper to switch type
  const handleTypeSelect = (type: SearchDataType) => {
    setSelectedType(type);
    setSecondaryFilter("all");
    navigate({
      to: "/search",
      search: { q: query, type },
      replace: true,
    });
  };

  // Helper to copy code to clipboard
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`คัดลอก ${label} เรียบร้อยแล้ว`, { description: text });
  };

  // Live item counts across all entities
  const dataCounts = useMemo<Record<SearchDataType, number>>(() => {
    return {
      products: state.catalog?.products?.length ?? 0,
      orders: state.orders?.length ?? 0,
      receipts: state.sales?.receipts?.length ?? 0,
      members: state.members?.length ?? 0,
      employees: state.employees?.length ?? 0,
      pos: state.purchaseOrders?.length ?? 0,
      prs: state.purchaseRequisitions?.length ?? 0,
      agentReceipts: state.agentReceipts?.length ?? 0,
      suppliers: state.supplierCompanies?.length ?? 0,
    };
  }, [
    state.catalog?.products?.length,
    state.orders?.length,
    state.sales?.receipts?.length,
    state.members?.length,
    state.employees?.length,
    state.purchaseOrders?.length,
    state.purchaseRequisitions?.length,
    state.agentReceipts?.length,
    state.supplierCompanies?.length,
  ]);

  // ────────── Data Filtering by Type ──────────
  const results = useMemo(() => {
    if (!isAllowed) return [];
    const q = query.trim().toLowerCase();

    switch (selectedType) {
      case "products": {
        let list = state.catalog.products;
        if (secondaryFilter !== "all") {
          list = list.filter((p) => p.category === secondaryFilter);
        }
        if (!q) return list;
        return list.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.sku.toLowerCase().includes(q) ||
            p.category.toLowerCase().includes(q) ||
            p.barcode?.includes(q),
        );
      }
      case "orders": {
        let list = state.orders || [];
        if (secondaryFilter !== "all") {
          list = list.filter((o) => o.status === secondaryFilter);
        }
        if (!q) return list;
        return list.filter(
          (o) =>
            o.id.toLowerCase().includes(q) ||
            o.customerName?.toLowerCase().includes(q) ||
            o.phone?.includes(q) ||
            (o.lines || []).some((i) => i.name?.toLowerCase().includes(q)),
        );
      }
      case "receipts": {
        let list = state.sales?.receipts || [];
        if (secondaryFilter !== "all") {
          list = list.filter((r) => ((r as any).paymentMethod || "เงินสด") === secondaryFilter);
        }
        if (!q) return list;
        return list.filter(
          (r) =>
            r.id.toLowerCase().includes(q) ||
            r.cashier.toLowerCase().includes(q) ||
            ((r as any).paymentMethod && (r as any).paymentMethod.toLowerCase().includes(q)) ||
            (r.memberName && r.memberName.toLowerCase().includes(q)) ||
            (r.memberCode && r.memberCode.toLowerCase().includes(q)),
        );
      }
      case "members": {
        let list = state.members || [];
        if (secondaryFilter !== "all") {
          list = list.filter((m) => m.tier === secondaryFilter);
        }
        if (!q) return list;
        return list.filter(
          (m) =>
            m.name.toLowerCase().includes(q) ||
            m.code.toLowerCase().includes(q) ||
            m.phone.includes(q),
        );
      }
      case "employees": {
        let list = state.employees || [];
        if (secondaryFilter !== "all") {
          list = list.filter((e) => e.role === secondaryFilter);
        }
        if (!q) return list;
        return list.filter(
          (e) =>
            e.name.toLowerCase().includes(q) ||
            e.nickname.toLowerCase().includes(q) ||
            e.duty?.toLowerCase().includes(q) ||
            e.position?.toLowerCase().includes(q) ||
            e.username.toLowerCase().includes(q),
        );
      }
      case "pos": {
        let list = state.purchaseOrders;
        if (secondaryFilter !== "all") {
          list = list.filter((po) => po.status === secondaryFilter);
        }
        if (!q) return list;
        return list.filter(
          (po) =>
            po.poNumber.toLowerCase().includes(q) ||
            po.supplierName.toLowerCase().includes(q) ||
            po.agentName.toLowerCase().includes(q),
        );
      }
      case "prs": {
        let list = state.purchaseRequisitions;
        if (secondaryFilter !== "all") {
          list = list.filter((pr) => pr.status === secondaryFilter);
        }
        if (!q) return list;
        return list.filter(
          (pr) =>
            pr.prNumber.toLowerCase().includes(q) ||
            pr.companyName.toLowerCase().includes(q) ||
            pr.requestedBy.toLowerCase().includes(q),
        );
      }
      case "agentReceipts": {
        let list = state.agentReceipts;
        if (secondaryFilter !== "all") {
          list = list.filter((ar) => ar.archiveStatus === secondaryFilter);
        }
        if (!q) return list;
        return list.filter(
          (ar) =>
            ar.receiptNumber.toLowerCase().includes(q) ||
            ar.companyName.toLowerCase().includes(q) ||
            ar.agentName?.toLowerCase().includes(q) ||
            ar.poNumber.toLowerCase().includes(q),
        );
      }
      case "suppliers": {
        let list = state.supplierCompanies;
        if (secondaryFilter !== "all") {
          list = list.filter((s) => s.categoryIds.includes(secondaryFilter));
        }
        if (!q) return list;
        return list.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            s.taxId.includes(q) ||
            s.contactPerson.toLowerCase().includes(q) ||
            s.phone.includes(q),
        );
      }
      default:
        return [];
    }
  }, [isAllowed, selectedType, query, secondaryFilter, state]);

  // ────────── Secondary Filter Options ──────────
  const secondaryFilterOptions = useMemo<{ value: string; label: string }[]>(() => {
    switch (selectedType) {
      case "products":
        return [
          { value: "all", label: "ทุกหมวดหมู่" },
          ...state.categories.map((c) => ({ value: c.name, label: c.name })),
        ];
      case "orders":
        return [
          { value: "all", label: "ทุกสถานะคำสั่งซื้อ" },
          { value: "รอชำระ", label: "รอชำระ" },
          { value: "ชำระแล้ว", label: "ชำระแล้ว" },
          { value: "กำลังเตรียม", label: "กำลังเตรียม" },
          { value: "จัดส่งแล้ว", label: "จัดส่งแล้ว" },
          { value: "สำเร็จ", label: "สำเร็จ" },
          { value: "ยกเลิก", label: "ยกเลิก" },
        ];
      case "receipts":
        return [
          { value: "all", label: "ทุกวิธีชำระเงิน" },
          { value: "เงินสด", label: "เงินสด" },
        ];
      case "members":
        return [
          { value: "all", label: "ทุกระดับสมาชิก" },
          { value: "ทั่วไป", label: "ระดับทั่วไป" },
          { value: "VIP", label: "ระดับ VIP" },
        ];
      case "employees":
        return [
          { value: "all", label: "ทุกบทบาทหน้าที่" },
          { value: "sales", label: "พนักงานขาย (sales)" },
          { value: "warehouse", label: "คลังสินค้า (warehouse)" },
          { value: "purchasing", label: "ฝ่ายจัดซื้อ (purchasing)" },
          { value: "manager", label: "ผู้จัดการ (manager)" },
          { value: "owner", label: "เจ้าของกิจการ (owner)" },
        ];
      case "pos":
        return [
          { value: "all", label: "ทุกสถานะ PO" },
          { value: "รอรับสินค้า", label: "รอรับสินค้า" },
          { value: "รับสินค้าบางส่วน", label: "รับสินค้าบางส่วน" },
          { value: "รับครบแล้ว", label: "รับครบแล้ว" },
        ];
      case "prs":
        return [
          { value: "all", label: "ทุกสถานะ PR" },
          { value: "รออนุมัติ", label: "รออนุมัติ" },
          { value: "อนุมัติ", label: "อนุมัติ" },
          { value: "แปลงเป็น PO แล้ว", label: "แปลงเป็น PO แล้ว" },
          { value: "ไม่อนุมัติ", label: "ไม่อนุมัติ" },
        ];
      case "agentReceipts":
        return [
          { value: "all", label: "ทุกสถานะการจัดเก็บ" },
          { value: "รอจัดเก็บ", label: "รอจัดเก็บ" },
          { value: "จัดเก็บแล้ว", label: "จัดเก็บแล้ว" },
        ];
      case "suppliers":
        return [
          { value: "all", label: "ทุกกลุ่มสินค้าคู่ค้า" },
          ...state.categories.map((c) => ({ value: c.id, label: c.name })),
        ];
      default:
        return [];
    }
  }, [selectedType, state.categories]);

  // Reset filters helper
  const handleResetFilters = () => {
    setQuery("");
    setSecondaryFilter("all");
    navigate({
      to: "/search",
      search: { q: "", type: selectedType },
      replace: true,
    });
  };

  // ────────── Dynamic Columns by Type ──────────
  const columns: DataTableColumn<any>[] = useMemo(() => {
    switch (selectedType) {
      case "products":
        return [
          {
            id: "sku",
            header: "รหัส SKU",
            accessor: (p) => (
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-sun-50 text-sun-700 border border-sun-200/70 inline-block">
                {p.sku}
              </span>
            ),
            sortable: true,
          },
          {
            id: "name",
            header: "ชื่อสินค้า",
            accessor: (p) => (
              <div>
                <span className="font-medium text-foreground block">{p.name}</span>
                <span className="text-xs text-muted-foreground">{p.category}</span>
              </div>
            ),
            sortable: true,
          },
          {
            id: "stock",
            header: "สต็อกคงเหลือ",
            accessor: (p) => {
              const isLow = p.stock <= p.reorderPoint;
              return (
                <div className="flex items-center gap-1.5">
                  <span
                    className={`font-semibold ${
                      isLow ? "text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200" : "text-foreground"
                    }`}
                  >
                    {formatNumber(p.stock)} {p.unit}
                  </span>
                  {isLow && (
                    <span className="text-[10px] text-amber-700 font-medium">
                      (ต่ำกว่าจุดสั่งซื้อ)
                    </span>
                  )}
                </div>
              );
            },
            sortable: true,
          },
          {
            id: "price",
            header: "ราคาขาย",
            accessor: (p) => <span className="font-semibold text-foreground"><Money value={p.price} /></span>,
            sortable: true,
          },
          {
            id: "reorder",
            header: "จุดสั่งซื้อ",
            accessor: (p) => (
              <span className="text-xs text-muted-foreground">
                {formatNumber(p.reorderPoint)} {p.unit}
              </span>
            ),
          },
          {
            id: "online",
            header: "ขายออนไลน์",
            accessor: (p) => (
              <Badge
                variant="outline"
                className={
                  p.online
                    ? "border-emerald-300 text-emerald-700 bg-emerald-50 text-[11px]"
                    : "border-muted-foreground/30 text-muted-foreground bg-muted text-[11px]"
                }
              >
                {p.online ? "เปิดขายออนไลน์" : "เฉพาะหน้าร้าน"}
              </Badge>
            ),
          },
        ];
      case "orders":
        return [
          {
            id: "id",
            header: "เลขที่คำสั่งซื้อ",
            accessor: (o) => (
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-sun-50 text-sun-700 border border-sun-200/70 inline-block">
                {o.id}
              </span>
            ),
            sortable: true,
          },
          {
            id: "customer",
            header: "ลูกค้า",
            accessor: (o) => (
              <div>
                <div className="font-medium text-foreground">{o.customerName}</div>
                <div className="text-xs text-muted-foreground">{o.phone}</div>
              </div>
            ),
          },
          {
            id: "items",
            header: "รายการสินค้า",
            accessor: (o) => {
              const lines = o.lines || [];
              const totalQty = lines.reduce((s: number, i: any) => s + (i.qty || 0), 0);
              return (
                <span className="text-xs text-muted-foreground">
                  {lines.length} รายการ ({formatNumber(totalQty)} ชิ้น)
                </span>
              );
            },
          },
          {
            id: "total",
            header: "ยอดสุทธิ",
            accessor: (o) => (
              <span className="font-bold text-primary">
                <Money value={typeof (o as any).netTotal === "number" ? (o as any).netTotal : orderTotal(o)} />
              </span>
            ),
            sortable: true,
          },
          {
            id: "status",
            header: "สถานะ",
            accessor: (o) => <StatusBadge status={o.status} />,
            sortable: true,
          },
        ];
      case "receipts":
        return [
          {
            id: "id",
            header: "เลขที่ใบเสร็จ",
            accessor: (r) => (
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-muted text-foreground border border-border inline-block">
                {r.id}
              </span>
            ),
            sortable: true,
          },
          {
            id: "time",
            header: "เวลาออกบิล",
            accessor: (r) => <span className="text-xs text-muted-foreground">{formatShortDate(r.createdAt)}</span>,
          },
          {
            id: "cashier",
            header: "แคชเชียร์",
            accessor: (r) => <span className="text-xs font-medium text-foreground">{r.cashier}</span>,
          },
          {
            id: "method",
            header: "วิธีชำระ",
            accessor: (r) => (
              <Badge variant="outline" className="text-xs border-sun-200 bg-sun-50 text-sun-700">
                {(r as any).paymentMethod || "เงินสด"}
              </Badge>
            ),
          },
          {
            id: "total",
            header: "ยอดชำระ",
            accessor: (r) => (
              <span className="font-bold text-foreground">
                <Money value={r.net} />
              </span>
            ),
            sortable: true,
          },
        ];
      case "members":
        return [
          {
            id: "code",
            header: "รหัสสมาชิก",
            accessor: (m) => (
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-sun-50 text-sun-700 border border-sun-200/70 inline-block">
                {m.code}
              </span>
            ),
            sortable: true,
          },
          {
            id: "name",
            header: "ชื่อสมาชิก",
            accessor: (m) => (
              <div>
                <span className="font-medium text-foreground block">{m.name}</span>
                <span className="text-xs text-muted-foreground">{formatPhone(m.phone)}</span>
              </div>
            ),
            sortable: true,
          },
          {
            id: "tier",
            header: "ระดับ",
            accessor: (m) => (
              <Badge
                variant="outline"
                className={
                  m.tier === "VIP"
                    ? "border-amber-400 bg-amber-50 text-amber-800 font-semibold"
                    : "border-border bg-muted/50 text-muted-foreground"
                }
              >
                {m.tier}
              </Badge>
            ),
          },
          {
            id: "points",
            header: "แต้มสะสม",
            accessor: (m) => (
              <span className="font-semibold text-sun-700">
                {formatNumber(m.points)} แต้ม
              </span>
            ),
            sortable: true,
          },
          {
            id: "totalSpend",
            header: "ยอดซื้อสะสม",
            accessor: (m) => <Money value={m.totalSpend} />,
            sortable: true,
          },
        ];
      case "employees":
        return [
          {
            id: "name",
            header: "ชื่อ-นามสกุล",
            accessor: (e) => (
              <div>
                <div className="font-semibold text-foreground">
                  {e.name} <span className="text-muted-foreground font-normal">({e.nickname})</span>
                </div>
                <div className="text-xs text-muted-foreground">{e.position || "-"}</div>
              </div>
            ),
            sortable: true,
          },
          {
            id: "duty",
            header: "หน้าที่รับผิดชอบ",
            accessor: (e) => (
              <Badge variant="outline" className="text-xs border-sun-200 bg-sun-50 text-sun-800">
                {e.duty}
              </Badge>
            ),
          },
          {
            id: "role",
            header: "บทบาทระบบ",
            accessor: (e) => (
              <span className="text-xs font-medium text-foreground">{ROLE_LABELS[e.role]}</span>
            ),
          },
          {
            id: "username",
            header: "Username",
            accessor: (e) => (
              <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded border border-border">
                {e.username}
              </span>
            ),
          },
        ];
      case "pos":
        return [
          {
            id: "poNumber",
            header: "เลขที่ PO",
            accessor: (po) => (
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-sun-50 text-sun-700 border border-sun-200/70 inline-block">
                {po.poNumber}
              </span>
            ),
            sortable: true,
          },
          {
            id: "supplier",
            header: "บริษัทคู่ค้า / ตัวแทน",
            accessor: (po) => (
              <div>
                <div className="font-medium text-foreground">{po.supplierName}</div>
                <div className="text-xs text-muted-foreground">{po.agentName}</div>
              </div>
            ),
          },
          {
            id: "warehouse",
            header: "โกดังปลายทาง",
            accessor: (po) => (
              <span className="text-xs text-muted-foreground font-medium">{po.warehouseName}</span>
            ),
          },
          {
            id: "total",
            header: "ยอดเงินรวม",
            accessor: (po) => (
              <span className="font-bold text-foreground">
                <Money value={po.totalAmount} />
              </span>
            ),
            sortable: true,
          },
          {
            id: "status",
            header: "สถานะ",
            accessor: (po) => <StatusBadge status={po.status} />,
            sortable: true,
          },
        ];
      case "prs":
        return [
          {
            id: "prNumber",
            header: "เลขที่ PR",
            accessor: (pr) => (
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-sun-50 text-sun-700 border border-sun-200/70 inline-block">
                {pr.prNumber}
              </span>
            ),
            sortable: true,
          },
          {
            id: "supplier",
            header: "บริษัทคู่ค้า",
            accessor: (pr) => <span className="font-medium text-foreground">{pr.companyName}</span>,
          },
          {
            id: "requestedBy",
            header: "ผู้ขอซื้อ",
            accessor: (pr) => <span className="text-xs text-muted-foreground">{pr.requestedBy}</span>,
          },
          {
            id: "total",
            header: "มูลค่ารวม",
            accessor: (pr) => (
              <span className="font-bold text-primary">
                <Money value={pr.totalAmount} />
              </span>
            ),
            sortable: true,
          },
          {
            id: "status",
            header: "สถานะ",
            accessor: (pr) => <StatusBadge status={pr.status} />,
            sortable: true,
          },
        ];
      case "agentReceipts":
        return [
          {
            id: "receiptNumber",
            header: "เลขที่ใบเสร็จ",
            accessor: (ar) => (
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-muted text-foreground border border-border inline-block">
                {ar.receiptNumber}
              </span>
            ),
            sortable: true,
          },
          {
            id: "company",
            header: "บริษัท / ตัวแทน",
            accessor: (ar) => (
              <div>
                <div className="font-medium text-foreground">{ar.companyName}</div>
                <div className="text-xs text-muted-foreground">{ar.agentName}</div>
              </div>
            ),
          },
          {
            id: "poNumber",
            header: "อ้างอิง PO",
            accessor: (ar) => (
              <span className="font-mono text-xs text-muted-foreground">{ar.poNumber || "-"}</span>
            ),
          },
          {
            id: "total",
            header: "ยอดเงิน",
            accessor: (ar) => (
              <span className="font-bold text-foreground">
                <Money value={ar.amount ?? ar.totalAmount} />
              </span>
            ),
            sortable: true,
          },
          {
            id: "archiveStatus",
            header: "สถานะจัดเก็บ",
            accessor: (ar) => (
              <Badge
                variant="outline"
                className={
                  ar.archiveStatus === "จัดเก็บแล้ว"
                    ? "border-emerald-300 text-emerald-700 bg-emerald-50 text-[11px]"
                    : "border-amber-300 text-amber-700 bg-amber-50 text-[11px]"
                }
              >
                {ar.archiveStatus || "รอจัดเก็บ"}
              </Badge>
            ),
          },
        ];
      case "suppliers":
        return [
          {
            id: "name",
            header: "ชื่อบริษัทคู่ค้า",
            accessor: (s) => <span className="font-semibold text-foreground">{s.name}</span>,
            sortable: true,
          },
          {
            id: "taxId",
            header: "เลขประจำตัวผู้เสียภาษี",
            accessor: (s) => <span className="font-mono text-xs text-muted-foreground">{s.taxId}</span>,
          },
          {
            id: "contact",
            header: "ผู้ติดต่อ / เบอร์โทร",
            accessor: (s) => (
              <div>
                <div className="text-xs text-foreground font-medium">{s.contactPerson}</div>
                <div className="text-[11px] text-muted-foreground">{s.phone}</div>
              </div>
            ),
          },
          {
            id: "term",
            header: "เครดิตเทอม",
            accessor: (s) => (
              <Badge variant="outline" className="text-xs border-sun-200 bg-sun-50 text-sun-800">
                {s.paymentTermDays} วัน
              </Badge>
            ),
          },
        ];
      default:
        return [];
    }
  }, [selectedType]);

  // ────────── Render Detail Modal Content ──────────
  const renderDetailContent = (item: any) => {
    if (!item) return null;

    switch (selectedType) {
      case "products": {
        const wh = selectWarehouseForCategory(state, item.category);
        const isLow = item.stock <= item.reorderPoint;
        return (
          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-sun-50/70 border border-sun-200/80">
              <div>
                <span className="font-mono text-xs font-bold text-sun-700 bg-sun-100 px-2 py-0.5 rounded">
                  {item.sku}
                </span>
                <h4 className="text-base font-bold text-foreground mt-1">{item.name}</h4>
                <p className="text-xs text-muted-foreground">หมวดหมู่: {item.category}</p>
              </div>
              <Badge variant="outline" className={item.online ? "bg-emerald-50 text-emerald-700 border-emerald-300" : "bg-muted text-muted-foreground"}>
                {item.online ? "เปิดขายออนไลน์" : "เฉพาะหน้าร้าน"}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl border border-border/80 bg-card space-y-1">
                <span className="text-xs text-muted-foreground block">ราคาขาย</span>
                <span className="text-lg font-bold text-foreground block"><Money value={item.price} /></span>
                <span className="text-[11px] text-muted-foreground">ต้นทุน: ฿{item.costPrice}</span>
              </div>
              <div className={`p-3 rounded-xl border space-y-1 ${isLow ? "border-amber-300 bg-amber-50/50" : "border-border/80 bg-card"}`}>
                <span className="text-xs text-muted-foreground block">สต็อกคงเหลือ</span>
                <span className={`text-lg font-bold block ${isLow ? "text-amber-700" : "text-foreground"}`}>
                  {formatNumber(item.stock)} {item.unit}
                </span>
                <span className="text-[11px] text-muted-foreground">จุดสั่งซื้อ: {item.reorderPoint} {item.unit}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-border/80 bg-muted/30 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">โกดังจัดเก็บหลัก:</span>
                <span className="font-semibold text-foreground">{wh?.name || "โกดังกลาง"} ({wh?.id || "-"})</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">บาร์โค้ดสินค้า:</span>
                <span className="font-mono text-foreground">{item.barcode || "-"}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">รายละเอียดสินค้า:</span>
                <span className="text-foreground text-right max-w-[220px]">{item.description || "-"}</span>
              </div>
            </div>
          </div>
        );
      }
      case "orders":
        return (
          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-sun-50/70 border border-sun-200/80">
              <div>
                <span className="font-mono text-xs font-bold text-sun-700 bg-sun-100 px-2 py-0.5 rounded">
                  {item.id}
                </span>
                <h4 className="text-base font-bold text-foreground mt-1">{item.customerName}</h4>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                  <Phone className="size-3" /> {item.phone}
                </p>
              </div>
              <StatusBadge status={item.status} />
            </div>

            <div className="p-3.5 rounded-xl border border-border/80 bg-card space-y-2">
              <span className="text-xs font-semibold text-foreground block">
                รายการสินค้าในคำสั่งซื้อ ({(item.lines || []).length} รายการ)
              </span>
              <div className="divide-y divide-border/60 text-xs">
                {(item.lines || []).map((it: any, idx: number) => (
                  <div key={idx} className="flex justify-between py-1.5">
                    <span className="text-foreground">
                      {it.name} <span className="text-muted-foreground">× {it.qty}</span>
                    </span>
                    <span className="font-medium text-foreground">
                      <Money value={(it.price || 0) * (it.qty || 0)} />
                    </span>
                  </div>
                ))}
              </div>
              <div className="pt-2 border-t border-border flex justify-between font-bold text-sm">
                <span>ยอดสุทธิ</span>
                <span className="text-primary">
                  <Money value={typeof item.netTotal === "number" ? item.netTotal : orderTotal(item)} />
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl border border-border/80 bg-muted/30 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">ที่อยู่จัดส่ง:</span>
                <span className="text-foreground text-right max-w-[240px]">{item.address || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">ขนส่ง:</span>
                <span className="font-medium text-foreground">{item.carrier || "รอดำเนินการ"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">เลขพัสดุ (Tracking):</span>
                <span className="font-mono font-medium text-foreground">{item.trackingNumber || "-"}</span>
              </div>
            </div>
          </div>
        );
      case "receipts":
        return (
          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-sun-50/70 border border-sun-200/80">
              <div>
                <span className="font-mono text-xs font-bold text-sun-700 bg-sun-100 px-2 py-0.5 rounded">
                  {item.id}
                </span>
                <h4 className="text-base font-bold text-foreground mt-1">บิลขายเคาน์เตอร์ POS</h4>
                <p className="text-xs text-muted-foreground">เวลาออกบิล: {formatShortDate(item.createdAt)}</p>
              </div>
              <Badge variant="outline" className="border-sun-200 bg-sun-50 text-sun-800">
                {item.paymentMethod || "เงินสด"}
              </Badge>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 rounded-xl border border-border/80 bg-card">
                <span className="text-[11px] text-muted-foreground block">ยอดสุทธิ</span>
                <span className="font-bold text-foreground text-sm block"><Money value={item.net} /></span>
              </div>
              <div className="p-2.5 rounded-xl border border-border/80 bg-card">
                <span className="text-[11px] text-muted-foreground block">รับเงิน</span>
                <span className="font-bold text-foreground text-sm block"><Money value={item.cash ?? item.received ?? item.net} /></span>
              </div>
              <div className="p-2.5 rounded-xl border border-border/80 bg-card">
                <span className="text-[11px] text-muted-foreground block">เงินทอน</span>
                <span className="font-bold text-foreground text-sm block"><Money value={item.change || 0} /></span>
              </div>
            </div>

            <div className="p-3 rounded-xl border border-border/80 bg-muted/30 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">แคชเชียร์ผู้ทำรายการ:</span>
                <span className="font-semibold text-foreground">{item.cashier}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">จำนวนรายการสินค้า:</span>
                <span className="text-foreground">{(item.lines || item.items || []).length} รายการ</span>
              </div>
            </div>
          </div>
        );
      case "members":
        return (
          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-sun-50/70 border border-sun-200/80">
              <div>
                <span className="font-mono text-xs font-bold text-sun-700 bg-sun-100 px-2 py-0.5 rounded">
                  {item.code}
                </span>
                <h4 className="text-base font-bold text-foreground mt-1">{item.name}</h4>
                <p className="text-xs text-muted-foreground">{formatPhone(item.phone)}</p>
              </div>
              <Badge variant="outline" className={item.tier === "VIP" ? "bg-amber-100 text-amber-800 border-amber-300 font-bold" : "bg-muted text-muted-foreground"}>
                {item.tier}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl border border-border/80 bg-card text-center">
                <span className="text-xs text-muted-foreground block">แต้มสะสมปัจจุบัน</span>
                <span className="text-xl font-bold text-sun-700 block mt-1">{formatNumber(item.points)} แต้ม</span>
              </div>
              <div className="p-3 rounded-xl border border-border/80 bg-card text-center">
                <span className="text-xs text-muted-foreground block">ยอดซื้อสะสมทั้งหมด</span>
                <span className="text-xl font-bold text-foreground block mt-1"><Money value={item.totalSpend} /></span>
              </div>
            </div>

            <div className="p-3 rounded-xl border border-border/80 bg-muted/30 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">วันที่สมัครสมาชิก:</span>
                <span className="text-foreground">{formatDate(item.joinedAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">วันเกิดสมาชิก:</span>
                <span className="text-foreground">{item.birthday ? formatDate(item.birthday) : "-"}</span>
              </div>
            </div>
          </div>
        );
      case "employees":
        return (
          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-sun-50/70 border border-sun-200/80">
              <div>
                <span className="font-mono text-xs font-semibold text-sun-700 bg-sun-100 px-2 py-0.5 rounded">
                  @{item.username}
                </span>
                <h4 className="text-base font-bold text-foreground mt-1">
                  {item.name} <span className="font-normal text-muted-foreground">({item.nickname})</span>
                </h4>
                <p className="text-xs text-muted-foreground">{item.position || "พนักงานประจำ"}</p>
              </div>
              <Badge variant="outline" className="border-sun-300 bg-sun-50 text-sun-800">
                {ROLE_LABELS[item.role]}
              </Badge>
            </div>

            <div className="p-3.5 rounded-xl border border-border/80 bg-card space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-border/60">
                <span className="text-muted-foreground">หน้าที่รับผิดชอบ (1 หน้าที่):</span>
                <span className="font-semibold text-foreground">{item.duty}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/60">
                <span className="text-muted-foreground">เบอร์โทรศัพท์ติดต่อ:</span>
                <span className="font-medium text-foreground">{formatPhone(item.phone || "-")}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">อีเมล:</span>
                <span className="font-medium text-foreground">{item.email || "-"}</span>
              </div>
            </div>
          </div>
        );
      case "pos":
        return (
          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-sun-50/70 border border-sun-200/80">
              <div>
                <span className="font-mono text-xs font-bold text-sun-700 bg-sun-100 px-2 py-0.5 rounded">
                  {item.poNumber}
                </span>
                <h4 className="text-base font-bold text-foreground mt-1">{item.supplierName}</h4>
                <p className="text-xs text-muted-foreground">ตัวแทน: {item.agentName}</p>
              </div>
              <StatusBadge status={item.status} />
            </div>

            <div className="p-3.5 rounded-xl border border-border/80 bg-card space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-border/60">
                <span className="text-muted-foreground">โกดังปลายทาง:</span>
                <span className="font-semibold text-foreground">{item.warehouseName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/60">
                <span className="text-muted-foreground">วันที่สั่งซื้อ:</span>
                <span className="text-foreground">{formatShortDate(item.orderDate)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/60">
                <span className="text-muted-foreground">กำหนดส่งสินค้า:</span>
                <span className="text-foreground">{formatShortDate(item.expectedDate)}</span>
              </div>
              <div className="flex justify-between py-1.5 font-bold text-sm">
                <span>มูลค่ารวม PO:</span>
                <span className="text-primary"><Money value={item.totalAmount} /></span>
              </div>
            </div>
          </div>
        );
      case "prs":
        return (
          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-sun-50/70 border border-sun-200/80">
              <div>
                <span className="font-mono text-xs font-bold text-sun-700 bg-sun-100 px-2 py-0.5 rounded">
                  {item.prNumber}
                </span>
                <h4 className="text-base font-bold text-foreground mt-1">{item.companyName}</h4>
                <p className="text-xs text-muted-foreground">ผู้ขอซื้อ: {item.requestedBy}</p>
              </div>
              <StatusBadge status={item.status} />
            </div>

            <div className="p-3.5 rounded-xl border border-border/80 bg-card space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-border/60">
                <span className="text-muted-foreground">เหตุผลการขอซื้อ:</span>
                <span className="text-foreground text-right max-w-[220px]">{item.reason || "สินค้าใกล้ถึงจุดสั่งซื้อ"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/60">
                <span className="text-muted-foreground">วันที่ขอซื้อ:</span>
                <span className="text-foreground">{formatShortDate(item.requestedAt)}</span>
              </div>
              <div className="flex justify-between py-1.5 font-bold text-sm">
                <span>มูลค่ารวม PR:</span>
                <span className="text-primary"><Money value={item.totalAmount} /></span>
              </div>
            </div>
          </div>
        );
      case "agentReceipts":
        return (
          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-sun-50/70 border border-sun-200/80">
              <div>
                <span className="font-mono text-xs font-bold text-sun-700 bg-sun-100 px-2 py-0.5 rounded">
                  {item.receiptNumber}
                </span>
                <h4 className="text-base font-bold text-foreground mt-1">{item.companyName}</h4>
                <p className="text-xs text-muted-foreground">ตัวแทน: {item.agentName}</p>
              </div>
              <Badge variant="outline" className={item.archiveStatus === "จัดเก็บแล้ว" ? "bg-emerald-50 text-emerald-700 border-emerald-300" : "bg-amber-50 text-amber-700 border-amber-300"}>
                {item.archiveStatus || "รอจัดเก็บ"}
              </Badge>
            </div>

            <div className="p-3.5 rounded-xl border border-border/80 bg-card space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-border/60">
                <span className="text-muted-foreground">อ้างอิงใบสั่งซื้อ (PO):</span>
                <span className="font-mono font-semibold text-foreground">{item.poNumber || "-"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/60">
                <span className="text-muted-foreground">ชื่อไฟล์แนบ:</span>
                <span className="text-foreground">{item.fileName || "-"}</span>
              </div>
              <div className="flex justify-between py-1.5 font-bold text-sm">
                <span>ยอดเงินในใบเสร็จ:</span>
                <span className="text-primary"><Money value={item.amount ?? item.totalAmount} /></span>
              </div>
            </div>
          </div>
        );
      case "suppliers":
        return (
          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-sun-50/70 border border-sun-200/80">
              <div>
                <span className="font-mono text-xs font-semibold text-sun-700 bg-sun-100 px-2 py-0.5 rounded">
                  Tax ID: {item.taxId}
                </span>
                <h4 className="text-base font-bold text-foreground mt-1">{item.name}</h4>
                <p className="text-xs text-muted-foreground">ผู้ติดต่อ: {item.contactPerson} ({item.phone})</p>
              </div>
              <Badge variant="outline" className="border-sun-300 bg-sun-50 text-sun-800">
                เครดิต {item.paymentTermDays} วัน
              </Badge>
            </div>

            <div className="p-3.5 rounded-xl border border-border/80 bg-card space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-border/60">
                <span className="text-muted-foreground">ที่อยู่บริษัท:</span>
                <span className="text-foreground text-right max-w-[240px]">{item.address || "-"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/60">
                <span className="text-muted-foreground">อีเมล:</span>
                <span className="text-foreground">{item.email || "-"}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">กลุ่มสินค้าหลัก:</span>
                <span className="text-foreground">{item.categoryIds?.join(", ") || "-"}</span>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <PageHeader
        title="ค้นหาข้อมูล"
        description="ศูนย์กลางสืบค้นข้อมูลร้านรุ่งอรุณ เชื่อมโยงสินค้า คำสั่งซื้อ บิลขาย บุคลากร และเอกสารจัดซื้อตามสิทธิ์"
      />

      {/* ────────── Modern Segmented Type Selector ────────── */}
      <div className="mb-6 rounded-2xl border border-border/80 bg-card p-2 shadow-soft">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {TYPE_CONFIGS.map((t) => {
            const permitted = allowedTypes.includes(t.id);
            const isSelected = selectedType === t.id;
            const count = dataCounts[t.id];

            return (
              <button
                key={t.id}
                type="button"
                onClick={() => handleTypeSelect(t.id)}
                className={`group relative flex shrink-0 items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 ${
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-sm shadow-sun-600/30 font-semibold ring-1 ring-sun-600"
                    : permitted
                      ? "text-muted-foreground hover:text-foreground hover:bg-sun-50/70 border border-transparent hover:border-sun-200/60"
                      : "opacity-55 text-muted-foreground/80 bg-muted/30 border border-dashed border-border/60 cursor-not-allowed"
                }`}
              >
                <t.icon className={`size-4 ${isSelected ? "text-primary-foreground" : permitted ? "text-sun-600" : "text-muted-foreground"}`} />
                <span>{t.shortLabel}</span>
                {permitted ? (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono transition-colors ${
                      isSelected
                        ? "bg-white/25 text-white font-bold"
                        : "bg-muted text-muted-foreground group-hover:bg-sun-100 group-hover:text-sun-800"
                    }`}
                  >
                    {count}
                  </span>
                ) : (
                  <Lock className="size-3 text-muted-foreground ml-0.5" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ────────── If Not Permitted -> Designated "ไม่มีสิทธิ์เข้าถึง" State ────────── */}
      {!isAllowed ? (
        <div className="rounded-3xl border border-amber-200/80 bg-linear-to-b from-amber-50/70 to-orange-50/30 p-8 sm:p-12 text-center my-6 shadow-soft space-y-4">
          <div className="size-16 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto shadow-inner">
            <ShieldAlert className="size-8" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-lg font-bold text-foreground">
              ไม่มีสิทธิ์เข้าถึงข้อมูล{currentTypeConfig.label}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              ผู้ใช้งานในบทบาท <strong className="text-foreground">{ROLE_LABELS[user.role]}</strong> ไม่ได้รับสิทธิ์ในการสืบค้นข้อมูลในส่วนนี้ตามมาตรการควบคุมความปลอดภัยของร้านรุ่งอรุณ
            </p>
          </div>
          <div className="pt-2 flex flex-wrap justify-center gap-2">
            {allowedTypes.map((tid) => {
              const cfg = TYPE_CONFIGS.find((c) => c.id === tid);
              if (!cfg) return null;
              return (
                <Button
                  key={tid}
                  variant="outline"
                  size="sm"
                  className="bg-card hover:bg-sun-50 border-sun-200 text-sun-800 text-xs"
                  onClick={() => handleTypeSelect(tid)}
                >
                  <cfg.icon className="size-3.5 mr-1 text-sun-600" />
                  สลับไปค้นหา {cfg.shortLabel}
                </Button>
              );
            })}
          </div>
        </div>
      ) : (
        /* ────────── If Permitted -> Search & Filters Bar + Results Table ────────── */
        <div className="space-y-4">
          <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-soft space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
              {/* Main Search Input */}
              <div className="sm:col-span-8 relative">
                <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-sun-600 pointer-events-none" />
                <Input
                  placeholder={currentTypeConfig.placeholder}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-10 pr-9 h-11 text-sm bg-background border-border/80 focus-visible:ring-2 focus-visible:ring-sun-500/40 shadow-2xs rounded-xl"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 size-5 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
                    title="ล้างคำค้นหา"
                  >
                    <X className="size-3" />
                  </button>
                )}
              </div>

              {/* Secondary Category / Status Dropdown */}
              {secondaryFilterOptions.length > 0 && (
                <div className="sm:col-span-4">
                  <Select value={secondaryFilter} onValueChange={setSecondaryFilter}>
                    <SelectTrigger className="h-11 text-sm bg-background border-border/80 shadow-2xs rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {secondaryFilterOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Quick Filter Tag Chips */}
            {secondaryFilterOptions.length > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pt-1 text-xs scrollbar-none">
                <span className="text-muted-foreground font-medium shrink-0 flex items-center gap-1 mr-1">
                  <Tag className="size-3 text-sun-600" /> ตัวกรองด่วน:
                </span>
                {secondaryFilterOptions.slice(0, 6).map((opt) => {
                  const isActive = secondaryFilter === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setSecondaryFilter(opt.value)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all shrink-0 ${
                        isActive
                          ? "bg-sun-100 text-sun-800 border border-sun-300 font-semibold"
                          : "bg-muted/40 hover:bg-muted text-muted-foreground border border-border/60"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Results Summary & Reset Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs">
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-emerald-600" />
                พบข้อมูล <strong className="text-foreground font-semibold">{results.length}</strong> รายการ
                {query.trim() && (
                  <span>
                    จากคำค้นหา <strong className="text-foreground">“{query.trim()}”</strong>
                  </span>
                )}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {selectedType === "members" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setRegName("");
                    setRegPhone("");
                    setRegBirthday("");
                    setRegAddress("");
                    setRegError("");
                    setRegisterOpen(true);
                  }}
                  className="h-7 text-xs bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-800 gap-1 px-2.5 font-medium"
                >
                  <UserPlus className="size-3 text-emerald-600" /> สมัครสมาชิกใหม่
                </Button>
              )}
              {(query.trim() || secondaryFilter !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetFilters}
                  className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1 px-2"
                >
                  <RotateCcw className="size-3" /> ล้างตัวกรองทั้งหมด
                </Button>
              )}
              <Badge variant="outline" className="text-[11px] bg-card border-sun-200 text-sun-800">
                {currentTypeConfig.label}
              </Badge>
            </div>
          </div>

          {/* Results DataTable */}
          <div className="rounded-2xl border border-border/80 bg-card shadow-soft overflow-hidden">
            <DataTable
              columns={columns}
              data={results}
              onRowClick={(item) => setDetailItem(item)}
              emptyMessage={`ไม่พบข้อมูล${currentTypeConfig.shortLabel}ที่ตรงกับคำค้นหาหรือตัวกรองที่เลือก`}
            />
          </div>
        </div>
      )}

      {/* ────────── Polished Quick View Detail Modal ────────── */}
      <Dialog open={!!detailItem} onOpenChange={(open) => !open && setDetailItem(null)}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto rounded-2xl shadow-lift">
          {detailItem && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-sun-100 text-sun-700">
                    <currentTypeConfig.icon className="size-5" />
                  </div>
                  <div>
                    <DialogTitle className="text-base font-bold text-foreground">
                      รายละเอียด{currentTypeConfig.shortLabel}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                      ข้อมูลเจาะลึกจากฐานข้อมูลระบบร้านรุ่งอรุณ
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="my-2">
                {renderDetailContent(detailItem)}
              </div>

              <DialogFooter className="flex items-center justify-between sm:justify-between border-t border-border pt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground gap-1.5"
                  onClick={() => {
                    const code = detailItem.sku || detailItem.id || detailItem.code || detailItem.poNumber || detailItem.prNumber || detailItem.receiptNumber;
                    if (code) handleCopy(code, "รหัสรายการ");
                  }}
                >
                  <Copy className="size-3.5" /> คัดลอกรหัส
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs rounded-xl"
                  onClick={() => setDetailItem(null)}
                >
                  ปิดหน้าต่าง
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ────────── Member Registration Dialog ────────── */}
      <Dialog open={registerOpen} onOpenChange={setRegisterOpen}>
        <DialogContent className="max-w-md rounded-2xl shadow-lift">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <UserPlus className="size-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">สมัครสมาชิกใหม่</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  ลงทะเบียนสมาชิกร้านรุ่งอรุณ เพื่อสะสมแต้มและรับสิทธิประโยชน์
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleRegisterMember} className="space-y-3.5 py-1">
            {regError && (
              <div className="p-2.5 rounded-lg bg-danger/10 border border-danger/30 text-danger text-xs flex items-center gap-2">
                <AlertCircle className="size-4 shrink-0" />
                <span>{regError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">
                ชื่อ-นามสกุล <span className="text-danger">*</span>
              </Label>
              <Input
                placeholder="เช่น คุณสมศรี ใจดี"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                className="text-xs h-9 bg-card"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">
                เบอร์โทรศัพท์ (10 หลัก) <span className="text-danger">*</span>
              </Label>
              <Input
                type="tel"
                placeholder="เช่น 0812345678"
                value={regPhone}
                onChange={(e) => setRegPhone(e.target.value)}
                className="text-xs h-9 bg-card font-mono"
                required
              />
              <p className="text-[11px] text-muted-foreground">ใช้เบอร์โทรศัพท์นี้สำหรับค้นหาและสะสมแต้มที่หน้าร้าน</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">วันเกิด (เดือน-วัน หรือ วว/ดด)</Label>
              <Input
                placeholder="เช่น 11-05 (5 พฤศจิกายน)"
                value={regBirthday}
                onChange={(e) => setRegBirthday(e.target.value)}
                className="text-xs h-9 bg-card font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">ที่อยู่ (ถ้ามี)</Label>
              <Input
                placeholder="เช่น 123 หมู่ 4 ต.ศิลา อ.เมือง จ.ขอนแก่น 40000"
                value={regAddress}
                onChange={(e) => setRegAddress(e.target.value)}
                className="text-xs h-9 bg-card"
              />
            </div>

            <DialogFooter className="pt-2 gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRegisterOpen(false)}
                className="text-xs"
              >
                ยกเลิก
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-sun-600 hover:bg-sun-700 text-white text-xs gap-1.5"
              >
                <CheckCircle2 className="size-3.5" />
                ยืนยันการสมัครสมาชิก
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
