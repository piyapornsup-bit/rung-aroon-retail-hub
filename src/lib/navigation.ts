import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  ScanBarcode,
  CreditCard,
  Undo2,
  Gift,
  Receipt,
  Users,
  Boxes,
  PackagePlus,
  PackageCheck,
  ClipboardList,
  AlertTriangle,
  FileText,
  ShoppingCart,
  Truck,
  Scale,
  CheckSquare,
  Package,
  UserCog,
  BadgePercent,
  BarChart3,
  LineChart,
  PieChart,
  Settings,
  Building2,
  FolderTree,
  Search,
} from "lucide-react";
import type { RoleKey } from "./mock-data";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  /** Key used to show a live count badge (see useNavBadges in store). */
  badgeKey?: "payments" | "returns" | "gifts";
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/** Routes that are fully built. Everything else renders the 404 page. */
export const BUILT_ROUTES = new Set([
  "/dashboard",
  "/sales/pos",
  "/sales/payments",
  "/sales/returns",
  "/sales/gifts",
  "/warehouse/warehouses",
  "/warehouse/categories",
  "/warehouse/products",
  "/warehouse/stock",
  "/warehouse/fulfillment",
  "/warehouse/returns",
  "/warehouse/receiving",
  "/warehouse/gifts",
  "/purchasing/suppliers",
  "/purchasing/quotations",
  "/purchasing/reorder",
  "/purchasing/requisitions",
  "/purchasing/orders",
  "/purchasing/payments",
  "/manager/approve-pr",
  "/manager/approve-payments",
  "/manager/news",
  "/manager/settings",
  "/manager/employees",
  "/owner/receipts",
  "/owner/overview",
  "/search",
  "/reports",
]);

const dashboard: NavItem = { title: "แดชบอร์ด", href: "/dashboard", icon: LayoutDashboard };

export const NAV_BY_ROLE: Record<RoleKey, NavGroup[]> = {
  sales: [
    { label: "ภาพรวม", items: [dashboard] },
    {
      label: "งานขาย",
      items: [
        { title: "ขายหน้าร้าน", href: "/sales/pos", icon: ScanBarcode },
        { title: "ตรวจสอบการชำระเงิน", href: "/sales/payments", icon: CreditCard, badgeKey: "payments" },
        { title: "คำขอยกเลิกและคืนสินค้า", href: "/sales/returns", icon: Undo2, badgeKey: "returns" },
        { title: "ของขวัญเทศกาลและวันเกิด", href: "/sales/gifts", icon: Gift, badgeKey: "gifts" },
      ],
    },
    {
      label: "รายงานและค้นหา",
      items: [
        { title: "ค้นหาข้อมูล", href: "/search", icon: Search },
        { title: "รายงานการขาย", href: "/reports", icon: BarChart3 },
      ],
    },
  ],
  warehouse: [
    { label: "ภาพรวม", items: [dashboard] },
    {
      label: "สินค้าและสต็อก",
      items: [
        { title: "จัดการสินค้า", href: "/warehouse/products", icon: Package },
        { title: "ตรวจเช็คสินค้าคงคลัง", href: "/warehouse/stock", icon: Boxes },
        { title: "จัดการโกดัง", href: "/warehouse/warehouses", icon: Building2 },
        { title: "จัดการหมวดหมู่สินค้า", href: "/warehouse/categories", icon: FolderTree },
      ],
    },
    {
      label: "งานคลังสินค้า",
      items: [
        { title: "ตรวจรับสินค้าเข้าคลัง", href: "/warehouse/receiving", icon: PackagePlus },
        { title: "จัดเตรียมและจัดส่งสินค้าออนไลน์", href: "/warehouse/fulfillment", icon: PackageCheck },
        { title: "รับสินค้าคืนจากลูกค้า", href: "/warehouse/returns", icon: Undo2 },
        { title: "จัดส่งของขวัญ", href: "/warehouse/gifts", icon: Gift },
      ],
    },
    {
      label: "รายงานและค้นหา",
      items: [
        { title: "ค้นหาข้อมูล", href: "/search", icon: Search },
        { title: "รายงานสต็อกและจัดส่ง", href: "/reports", icon: BarChart3 },
      ],
    },
  ],
  purchasing: [
    { label: "ภาพรวม", items: [dashboard] },
    {
      label: "งานจัดซื้อ",
      items: [
        { title: "ตัวแทนจำหน่ายและบริษัทคู่ค้า", href: "/purchasing/suppliers", icon: Truck },
        { title: "ใบเสนอราคา", href: "/purchasing/quotations", icon: FileText },
        { title: "สินค้าถึงจุดสั่งซื้อ", href: "/purchasing/reorder", icon: AlertTriangle },
        { title: "ใบเสนอซื้อ (PR)", href: "/purchasing/requisitions", icon: ClipboardList },
        { title: "ใบสั่งซื้อ (PO)", href: "/purchasing/orders", icon: ShoppingCart },
        { title: "ขออนุมัติจ่ายเงิน", href: "/purchasing/payments", icon: CreditCard },
      ],
    },
    {
      label: "รายงานและค้นหา",
      items: [
        { title: "ค้นหาข้อมูล", href: "/search", icon: Search },
        { title: "รายงานจัดซื้อและการเงิน", href: "/reports", icon: BarChart3 },
      ],
    },
  ],
  manager: [
    { label: "ภาพรวม", items: [dashboard] },
    {
      label: "งานอนุมัติ",
      items: [
        { title: "อนุมัติใบเสนอซื้อ", href: "/manager/approve-pr", icon: CheckSquare },
        { title: "อนุมัติการจ่ายเงิน", href: "/manager/approve-payments", icon: CreditCard },
      ],
    },
    {
      label: "บริหารร้าน",
      items: [
        { title: "ข่าวสารและโปรโมชัน", href: "/manager/news", icon: BadgePercent },
        { title: "ตั้งค่าร้านออนไลน์", href: "/manager/settings", icon: Settings },
        { title: "จัดการพนักงาน", href: "/manager/employees", icon: UserCog },
      ],
    },
    {
      label: "รายงานและค้นหา",
      items: [
        { title: "ค้นหาข้อมูล", href: "/search", icon: Search },
        { title: "รายงานวิเคราะห์ร้าน", href: "/reports", icon: BarChart3 },
      ],
    },
  ],
  owner: [
    { label: "ภาพรวม", items: [dashboard] },
    {
      label: "งานเอกสารและบัญชี",
      items: [
        { title: "ตรวจสอบและจัดเก็บใบเสร็จจากตัวแทน", href: "/owner/receipts", icon: Receipt },
      ],
    },
    {
      label: "รายงานและค้นหา",
      items: [
        { title: "ค้นหาข้อมูล", href: "/search", icon: Search },
        { title: "รายงานภาพรวมธุรกิจ", href: "/reports", icon: BarChart3 },
      ],
    },
    {
      label: "ธุรกิจ",
      items: [
        { title: "ภาพรวมธุรกิจ", href: "/owner/overview", icon: LineChart },
      ],
    },
  ],
};

/** Human labels for breadcrumb segments. */
export const SEGMENT_LABELS: Record<string, string> = {
  dashboard: "แดชบอร์ด",
  sales: "งานขาย",
  pos: "ขายหน้าร้าน (POS)",
  warehouse: "คลังสินค้า",
  warehouses: "จัดการโกดัง",
  categories: "จัดการหมวดหมู่สินค้า",
  products: "จัดการสินค้า",
  stock: "ตรวจเช็คสินค้าคงคลัง",
  receiving: "ตรวจรับสินค้าเข้าคลัง",
  fulfillment: "จัดเตรียมและจัดส่งสินค้าออนไลน์",
  returns: "รับสินค้าคืนจากลูกค้า",
  gifts: "จัดส่งของขวัญ",
  purchasing: "จัดซื้อ",
  suppliers: "ตัวแทนจำหน่ายและบริษัทคู่ค้า",
  quotations: "ใบเสนอราคา",
  reorder: "สินค้าถึงจุดสั่งซื้อ",
  requisitions: "ใบเสนอซื้อ (PR)",
  orders: "ใบสั่งซื้อ (PO)",
  payments: "ขออนุมัติจ่ายเงิน",
  "approve-pr": "อนุมัติใบเสนอซื้อ",
  "approve-payments": "อนุมัติการจ่ายเงิน",
  news: "ข่าวสารและโปรโมชัน",
  settings: "ตั้งค่าร้านออนไลน์",
  employees: "จัดการพนักงาน",
  receipts: "ตรวจสอบและจัดเก็บใบเสร็จจากตัวแทน",
  manager: "บริหารร้าน",
  owner: "เจ้าของกิจการ",
  reports: "รายงาน",
  search: "ค้นหาข้อมูล",
};

export const findNavItem = (href: string): NavItem | undefined => {
  for (const groups of Object.values(NAV_BY_ROLE))
    for (const g of groups) for (const i of g.items) if (i.href === href) return i;
  return undefined;
};

/** Check whether a given route is accessible to a role based on NAV_BY_ROLE. Manager can open every page. */
export function isRouteAllowedForRole(role: RoleKey, pathname: string): boolean {
  // The manager may open every page
  if (role === "manager") return true;

  const cleanPath = pathname.replace(/\/+$/, "") || "/";
  if (cleanPath === "/dashboard") return true;

  const groups = NAV_BY_ROLE[role] || [];
  return groups.some((g) => g.items.some((item) => item.href === cleanPath));
}

export function getAllowedRoutesForRole(role: RoleKey): Set<string> {
  const allowed = new Set<string>(["/dashboard"]);
  const groups = NAV_BY_ROLE[role] || [];
  for (const g of groups) {
    for (const item of g.items) {
      allowed.add(item.href);
    }
  }
  return allowed;
}
