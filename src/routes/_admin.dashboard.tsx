import { createFileRoute } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";
import {
  AlertTriangle,
  Banknote,
  Boxes,
  Building2,
  ChevronRight,
  CreditCard,
  FileText,
  FolderTree,
  Gift,
  PackageCheck,
  PackagePlus,
  PackageX,
  Receipt,
  ShoppingBag,
  Truck,
  Undo2,
  Users,
  Wallet,
  PiggyBank,
  ScanBarcode,
  CheckSquare,
  BadgePercent,
  UserCog,
  Settings,
  LineChart as LucideLineChart,
  BarChart3,
  Search,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatCard } from "@/components/admin/StatCard";
import { SectionCard } from "@/components/admin/SectionCard";
import { EmptyState } from "@/components/admin/EmptyState";
import { Money } from "@/components/admin/Money";
import { AppLink } from "@/components/admin/AppLink";
import { useFakeLoading, useNow } from "@/components/admin/hooks";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PRODUCT_CATEGORIES,
  ROLE_LABELS,
  receiptsIssuedToday,
  salesLast7Days,
  salesTodayByHour,
  type RoleKey,
} from "@/lib/mock-data";
import {
  selectLowStock,
  selectPendingGifts,
  selectPendingPayments,
  selectPendingReturns,
  selectReorderPointProducts,
  selectOrdersToPack,
  selectOrdersToShip,
  selectPendingReturnGoods,
  selectGiftsToShip,
  selectPendingReceivingPOs,
  selectPendingPRs,
  selectApprovedPRs,
  selectPendingPaymentRequests,
  selectPendingAgentReceipts,
  useStore,
  type AppState,
} from "@/lib/store";
import { formatBaht, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_admin/dashboard")({
  head: () => ({
    meta: [
      { title: "แดชบอร์ด — ร้านรุ่งอรุณ มินิมาร์ท" },
      { name: "description", content: "ภาพรวมงานประจำวันตามบทบาทของพนักงาน" },
      { property: "og:title", content: "แดชบอร์ด — ร้านรุ่งอรุณ มินิมาร์ท" },
      { property: "og:description", content: "ภาพรวมงานประจำวันตามบทบาทของพนักงาน" },
    ],
  }),
  component: DashboardPage,
});

interface Stat {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  tone?: "sun" | "teal" | "success" | "warning" | "danger" | "info";
  trend?: { value: number; label?: string };
  hint?: string;
}
interface Task {
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
  count?: number;
  urgent?: boolean;
}

function buildDashboard(role: RoleKey, s: AppState) {
  const payments = selectPendingPayments(s);
  const returns = selectPendingReturns(s);
  const gifts = selectPendingGifts(s);
  const low = selectLowStock(s);
  const out = s.catalog.products.filter((p) => p.stock === 0);
  const sessionSales = s.sales.receipts.reduce((a, r) => a + r.net, 0);
  const todayInStore = salesTodayByHour.reduce((a, h) => a + h.amount, 0) + sessionSales;
  const bills = receiptsIssuedToday + s.sales.receipts.length;
  const week = salesLast7Days.reduce((a, d) => a + d.inStore + d.online, 0);

  // Warehouse-specific metrics
  const reorderProducts = selectReorderPointProducts(s);
  const paidOrdersToPack = selectOrdersToPack(s);
  const ordersToShip = selectOrdersToShip(s);
  const returnGoodsToReceive = selectPendingReturnGoods(s);

  // Purchasing-specific metrics
  const pendingPRs = selectPendingPRs(s);
  const approvedPRs = selectApprovedPRs(s);
  const pendingReceivingPOs = selectPendingReceivingPOs(s);
  const pendingPaymentReqs = selectPendingPaymentRequests(s);

  // Manager & Owner metrics
  const pendingReceipts = selectPendingAgentReceipts(s);
  const activePromotions = s.promotions.filter((p) => p.status === "เผยแพร่");

  const stats: Record<RoleKey, Stat[]> = {
    sales: [
      { icon: Banknote, label: "ยอดขายหน้าร้านวันนี้", value: <Money value={todayInStore} decimals={false} />, trend: { value: 6.2, label: "เทียบเมื่อวาน" } },
      { icon: Receipt, label: "จำนวนบิลวันนี้", value: formatNumber(bills), tone: "teal", hint: "ใบเสร็จที่ออกแล้ว" },
      { icon: CreditCard, label: "สลิปรอตรวจสอบ", value: payments.length, tone: "warning", hint: "คำสั่งซื้อออนไลน์" },
      { icon: Gift, label: "ของขวัญรอจัดเตรียม", value: gifts.length, tone: "info", hint: "วันเกิดและปีใหม่" },
    ],
    warehouse: [
      { icon: AlertTriangle, label: "สินค้าถึงจุดสั่งซื้อ", value: formatNumber(reorderProducts.length), tone: "danger", hint: "สต็อกต่ำกว่าเกณฑ์ ต้องเติม" },
      { icon: PackageCheck, label: "ออเดอร์รอแพ็ก", value: formatNumber(paidOrdersToPack.length), tone: "sun", hint: "ชำระเงินแล้ว พร้อมแพ็กของ" },
      { icon: Truck, label: "รอจัดส่ง", value: formatNumber(ordersToShip.length), tone: "teal", hint: "แพ็กเสร็จ รอขนส่งเข้ารับ" },
      { icon: Undo2, label: "รอรับสินค้าคืน", value: formatNumber(returnGoodsToReceive.length), tone: "warning", hint: "ลูกค้าส่งคืน รอตรวจสภาพ" },
    ],
    purchasing: [
      { icon: FileText, label: "ใบขอซื้อรออนุมัติ", value: formatNumber(pendingPRs.length), tone: "warning", hint: "ส่งถึงผู้จัดการร้านแล้ว" },
      { icon: Truck, label: "ใบสั่งซื้อรอรับของ", value: formatNumber(pendingReceivingPOs.length), tone: "teal", hint: "สินค้ากำลังจัดส่งเข้าคลัง" },
      { icon: AlertTriangle, label: "สินค้าถึงจุดสั่งซื้อ", value: formatNumber(reorderProducts.length), tone: "danger", hint: "สต็อกต่ำกว่าเกณฑ์ ต้องเปิด PR" },
      { icon: Building2, label: "บริษัทคู่ค้าและตัวแทน", value: `${s.supplierCompanies.length} / ${s.supplierAgents.length}`, tone: "info", hint: `${s.supplierCompanies.length} บริษัท (${s.supplierAgents.length} ตัวแทน)` },
    ],
    manager: [
      { icon: CheckSquare, label: "ใบขอซื้อรออนุมัติ", value: formatNumber(pendingPRs.length), tone: pendingPRs.length > 0 ? "warning" : "teal", hint: "ส่งจากแผนกจัดซื้อ" },
      { icon: CreditCard, label: "คำขอจ่ายเงินรออนุมัติ", value: formatNumber(pendingPaymentReqs.length), tone: pendingPaymentReqs.length > 0 ? "danger" : "teal", hint: "จ่ายเงินสดและเครดิต" },
      { icon: BadgePercent, label: "โปรโมชันเผยแพร่อยู่", value: `${activePromotions.length} / ${s.promotions.length}`, tone: "info", hint: "แคมเปญและข่าวสาร" },
      { icon: UserCog, label: "พนักงานทั้งหมด", value: `${s.employees.length} คน`, tone: "sun", hint: "กำกับดูแลสิทธิ์และหน้าที่" },
    ],
    owner: [
      { icon: Wallet, label: "ยอดขาย 7 วัน", value: <Money value={week} decimals={false} />, trend: { value: 9.1, label: "เทียบสัปดาห์ก่อน" } },
      { icon: PiggyBank, label: "กำไรขั้นต้น (ประมาณ)", value: <Money value={Math.round(week * 0.24)} decimals={false} />, tone: "success", hint: "อัตราเฉลี่ย 24%" },
      { icon: Receipt, label: "ใบเสร็จตัวแทนรอจัดเก็บ", value: formatNumber(pendingReceipts.length), tone: pendingReceipts.length > 0 ? "warning" : "teal", hint: "รอตรวจสอบและจัดเก็บเข้าแฟ้ม" },
      { icon: Users, label: "สมาชิกทั้งหมด", value: formatNumber(s.members.length), tone: "info", hint: "ฐานสมาชิกร้าน" },
    ],
  };

  const tasks: Record<RoleKey, Task[]> = {
    sales: [
      ...payments.map<Task>((o) => ({ icon: CreditCard, title: `ตรวจสลิป ${o.id}`, description: `${o.customerName} · ${o.paymentMethod}`, href: "/sales/payments", urgent: true })),
      ...returns.map<Task>((r) => ({ icon: Undo2, title: `${r.kind} ${r.id}`, description: `${r.customerName} · ${r.reason}`, href: "/sales/returns" })),
      ...(gifts.length ? [{ icon: Gift, title: "จัดเตรียมของขวัญสมาชิก", description: "วันเกิดและปีใหม่ที่ใกล้ถึง", href: "/sales/gifts", count: gifts.length }] : []),
    ],
    warehouse: [
      ...(paidOrdersToPack.length
        ? [
            {
              icon: PackageCheck,
              title: "ออเดอร์รอแพ็ก (ชำระแล้ว)",
              description: `${paidOrdersToPack.length} รายการ: ${paidOrdersToPack.slice(0, 3).map((o) => o.id).join(", ")}${paidOrdersToPack.length > 3 ? "..." : ""}`,
              href: "/warehouse/fulfillment",
              count: paidOrdersToPack.length,
              urgent: true,
            },
          ]
        : []),
      ...(reorderProducts.length
        ? [
            {
              icon: AlertTriangle,
              title: "สินค้าถึงจุดสั่งซื้อ (ต้องเติมสต็อก)",
              description: `${reorderProducts.length} รายการ: ${reorderProducts.slice(0, 3).map((p) => p.name).join(", ")}${reorderProducts.length > 3 ? "..." : ""}`,
              href: "/warehouse/stock",
              count: reorderProducts.length,
              urgent: true,
            },
          ]
        : []),
      ...(ordersToShip.length
        ? [
            {
              icon: Truck,
              title: "ออเดอร์รอจัดส่งให้บริษัทขนส่ง",
              description: `${ordersToShip.length} รายการ: ${ordersToShip.map((o) => o.id).join(", ")} พร้อมส่งมอบ`,
              href: "/warehouse/fulfillment",
              count: ordersToShip.length,
              urgent: false,
            },
          ]
        : []),
      ...(returnGoodsToReceive.length
        ? [
            {
              icon: Undo2,
              title: "ตรวจรับสินค้าคืนจากลูกค้า",
              description: `${returnGoodsToReceive.map((r) => `${r.id} (${r.customerName})`).join(", ")}`,
              href: "/warehouse/returns",
              count: returnGoodsToReceive.length,
              urgent: false,
            },
          ]
        : []),
      ...(selectPendingReceivingPOs(s).length
        ? [
            {
              icon: PackagePlus,
              title: "ตรวจรับสินค้าจากใบสั่งซื้อ (PO)",
              description: `${selectPendingReceivingPOs(s).length} ใบสั่งซื้อรอตรวจรับเข้าคลัง`,
              href: "/warehouse/receiving",
              count: selectPendingReceivingPOs(s).length,
              urgent: false,
            },
          ]
        : []),
      ...(selectGiftsToShip(s).length
        ? [
            {
              icon: Gift,
              title: "จัดส่งของขวัญสมาชิก",
              description: `${selectGiftsToShip(s).length} รายการที่ฝ่ายขายจัดเตรียมแล้ว พร้อมจัดส่ง`,
              href: "/warehouse/gifts",
              count: selectGiftsToShip(s).length,
              urgent: false,
            },
          ]
        : []),
      {
        icon: Building2,
        title: "ตรวจสอบผังโกดังและหมวดหมู่สินค้า",
        description: `${s.warehouses.length} โกดัง · ${s.categories.length} หมวดหมู่จัดเก็บ`,
        href: "/warehouse/warehouses",
      },
    ],
    purchasing: [
      ...(reorderProducts.length
        ? [
            {
              icon: AlertTriangle,
              title: "สินค้าถึงจุดสั่งซื้อ (ต้องสร้าง PR)",
              description: `${reorderProducts.length} รายการ: ${reorderProducts.slice(0, 3).map((p) => p.name).join(", ")}${reorderProducts.length > 3 ? "..." : ""}`,
              href: "/purchasing/reorder",
              count: reorderProducts.length,
              urgent: true,
            },
          ]
        : []),
      ...(pendingPRs.length
        ? [
            {
              icon: FileText,
              title: "ติดตามใบเสนอซื้อ (PR) รออนุมัติ",
              description: `${pendingPRs.map((pr) => pr.prNumber).join(", ")} รอผู้จัดการพิจารณา`,
              href: "/purchasing/requisitions",
              count: pendingPRs.length,
              urgent: true,
            },
          ]
        : []),
      ...(approvedPRs.length
        ? [
            {
              icon: ShoppingBag,
              title: "ออกใบสั่งซื้อ (PO) จาก PR ที่อนุมัติแล้ว",
              description: `${approvedPRs.map((pr) => pr.prNumber).join(", ")} อนุมัติแล้ว พร้อมออก PO ส่งตัวแทน`,
              href: "/purchasing/orders",
              count: approvedPRs.length,
              urgent: false,
            },
          ]
        : []),
      ...(pendingPaymentReqs.length
        ? [
            {
              icon: CreditCard,
              title: "ขออนุมัติจ่ายเงินและแนบใบเสร็จตัวแทน",
              description: `${pendingPaymentReqs.length} คำขอรออนุมัติเบิกจ่าย`,
              href: "/purchasing/payments",
              count: pendingPaymentReqs.length,
              urgent: false,
            },
          ]
        : []),
      {
        icon: Truck,
        title: "จัดการข้อมูลตัวแทนและบริษัทคู่ค้า",
        description: `${s.supplierCompanies.length} บริษัท · ${s.supplierAgents.length} ตัวแทนจำหน่าย`,
        href: "/purchasing/suppliers",
      },
    ],
    manager: [
      ...(pendingPRs.length
        ? [
            {
              icon: CheckSquare,
              title: "อนุมัติใบเสนอซื้อ (PR)",
              description: `${pendingPRs.length} ฉบับรอพิจารณา: ${pendingPRs.map((p) => p.prNumber).join(", ")}`,
              href: "/manager/approve-pr",
              count: pendingPRs.length,
              urgent: true,
            },
          ]
        : []),
      ...(pendingPaymentReqs.length
        ? [
            {
              icon: CreditCard,
              title: "อนุมัติการจ่ายเงิน",
              description: `${pendingPaymentReqs.length} คำขอรออนุมัติ: ${pendingPaymentReqs.map((p) => p.requestNumber).join(", ")}`,
              href: "/manager/approve-payments",
              count: pendingPaymentReqs.length,
              urgent: true,
            },
          ]
        : []),
      ...(reorderProducts.length
        ? [
            {
              icon: AlertTriangle,
              title: "สินค้าถึงจุดสั่งซื้อ",
              description: `${reorderProducts.length} รายการสต็อกต่ำกว่าเกณฑ์ความปลอดภัย`,
              href: "/purchasing/reorder",
              count: reorderProducts.length,
              urgent: false,
            },
          ]
        : []),
      {
        icon: BadgePercent,
        title: "ข่าวสารและโปรโมชัน",
        description: `${activePromotions.length} โปรโมชันกำลังใช้งาน · ดูและตั้งค่าแคมเปญ`,
        href: "/manager/news",
      },
      {
        icon: Settings,
        title: "ตั้งค่าร้านออนไลน์",
        description: "กำหนดช่องทางจัดส่ง ช่องทางชำระเงิน และการแลกแต้ม",
        href: "/manager/settings",
      },
      {
        icon: UserCog,
        title: "จัดการข้อมูลพนักงาน",
        description: `${s.employees.length} บัญชีพนักงาน · กำหนดหน้าที่และรีเซ็ตรหัสผ่าน`,
        href: "/manager/employees",
      },
    ],
    owner: [
      ...(pendingReceipts.length
        ? [
            {
              icon: Receipt,
              title: "ตรวจสอบและจัดเก็บใบเสร็จตัวแทน",
              description: `${pendingReceipts.length} ใบเสร็จรอตรวจสอบและบันทึกเข้าแฟ้ม`,
              href: "/owner/receipts",
              count: pendingReceipts.length,
              urgent: true,
            },
          ]
        : []),
      {
        icon: LucideLineChart,
        title: "ภาพรวมธุรกิจและผลประกอบการ",
        description: `ยอดขายสัปดาห์นี้ ฿${formatBaht(week, { decimals: false })} · ประมาณการกำไรขั้นต้น ฿${formatBaht(Math.round(week * 0.24), { decimals: false })}`,
        href: "/owner/overview",
      },
      {
        icon: BarChart3,
        title: "รายงานวิเคราะห์ภาพรวมธุรกิจ",
        description: "สถิติยอดขาย การเติบโต และรายงานผลการดำเนินงาน",
        href: "/reports",
      },
      {
        icon: Search,
        title: "ค้นหาข้อมูลในระบบ",
        description: "สืบค้นข้อมูลสินค้า คำสั่งซื้อ บิลขาย และคู่ค้าตามสิทธิ์",
        href: "/search",
      },
    ],
  };

  return { stats: stats[role], tasks: tasks[role] };
}

const greetingFor = (hour: number) =>
  hour < 12 ? "สวัสดีตอนเช้า" : hour < 17 ? "สวัสดีตอนบ่าย" : "สวัสดีตอนเย็น";

function DashboardPage() {
  const { state } = useStore();
  const user = state.session.user;
  const now = useNow();
  const loading = useFakeLoading();
  const { stats, tasks } = buildDashboard(user.role, state);
  const showSales = user.role === "owner" || user.role === "manager";

  return (
    <>
      <PageHeader
        title={`${now === null ? "สวัสดี" : greetingFor(new Date(now).getHours())} คุณ${user.nickname}`}
        description={`${ROLE_LABELS[user.role]} · นี่คือภาพรวมงานของคุณวันนี้`}
        actions={
          user.role === "sales" ? (
            <Button asChild>
              <AppLink href="/sales/pos">
                <ScanBarcode /> เปิดหน้าขาย
              </AppLink>
            </Button>
          ) : undefined
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} loading={loading} />
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_1fr]">
        <SectionCard
          title="งานที่รอดำเนินการ"
          description={tasks.length ? `${tasks.length} รายการ` : undefined}
          bodyClassName="p-2"
        >
          {loading ? (
            <div className="space-y-2 p-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : tasks.length === 0 ? (
            <EmptyState compact title="ไม่มีงานค้าง" description="เยี่ยมมาก! งานวันนี้เรียบร้อยแล้ว" />
          ) : (
            <ul className="divide-y">
              {tasks.map((t, i) => (
                <li key={i}>
                  <AppLink
                    href={t.href}
                    className="group flex items-center gap-3 rounded-md px-3 py-3 transition-colors hover:bg-sun-50"
                  >
                    <span
                      className={cn(
                        "rounded-md p-2",
                        t.urgent ? "bg-warning-soft text-warning" : "bg-muted text-muted-foreground",
                      )}
                    >
                      <t.icon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">{t.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">{t.description}</span>
                    </span>
                    {t.count !== undefined && (
                      <span className="num rounded-full bg-sun-100 px-2 py-0.5 text-xs font-semibold text-sun-700">
                        {t.count}
                      </span>
                    )}
                    <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </AppLink>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title={
            showSales
              ? "ยอดขาย 7 วันล่าสุด"
              : user.role === "sales"
                ? "ยอดขายหน้าร้านรายชั่วโมง (วันนี้)"
                : user.role === "purchasing"
                  ? "มูลค่าการจัดซื้อ (PO และ PR)"
                  : "จำนวนสต็อกตามหมวดหมู่"
          }
          description={
            showSales
              ? "หน้าร้านและออนไลน์ (บาท)"
              : user.role === "purchasing"
                ? "ยอดรวมตามบริษัทคู่ค้าและสถานะเอกสาร"
                : undefined
          }
        >
          <div className="h-64">
            {loading ? (
              <Skeleton className="h-full w-full" />
            ) : showSales ? (
              <WeekSalesChart />
            ) : user.role === "sales" ? (
              <HourlyChart />
            ) : user.role === "purchasing" ? (
              <PurchasingSpendChart state={state} />
            ) : (
              <StockChart state={state} />
            )}
          </div>
        </SectionCard>
      </div>
    </>
  );
}

const axis = { fontSize: 12, fill: "var(--muted-foreground)" };
const tooltipStyle = {
  borderRadius: 10,
  border: "1px solid var(--border)",
  boxShadow: "var(--shadow-soft)",
  fontFamily: "var(--font-sans)",
};

function WeekSalesChart() {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={salesLast7Days} margin={{ left: -10, right: 8, top: 8 }}>
        <defs>
          <linearGradient id="gStore" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gOnline" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.3} />
            <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--border)" vertical={false} />
        <XAxis dataKey="day" tick={axis} axisLine={false} tickLine={false} />
        <YAxis tick={axis} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000}k`} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v: number, n) => [`฿${formatBaht(v, { decimals: false })}`, n === "inStore" ? "หน้าร้าน" : "ออนไลน์"]} />
        <Area type="monotone" dataKey="inStore" stroke="var(--chart-1)" strokeWidth={2} fill="url(#gStore)" />
        <Area type="monotone" dataKey="online" stroke="var(--chart-2)" strokeWidth={2} fill="url(#gOnline)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function HourlyChart() {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={salesTodayByHour} margin={{ left: -10, right: 8, top: 8 }}>
        <CartesianGrid stroke="var(--border)" vertical={false} />
        <XAxis dataKey="hour" tick={axis} axisLine={false} tickLine={false} />
        <YAxis tick={axis} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--sun-50)" }} formatter={(v: number) => [`฿${formatBaht(v, { decimals: false })}`, "ยอดขาย"]} />
        <Bar dataKey="amount" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function StockChart({ state }: { state: AppState }) {
  const [view, setView] = useState<"category" | "warehouse">("category");

  const categoryData = state.categories.map((c) => {
    const wh = state.warehouses.find((w) => w.id === c.warehouseId);
    const qty = state.catalog.products
      .filter((p) => p.category === c.name)
      .reduce((a, p) => a + p.stock, 0);
    return {
      name: c.name.length > 7 ? c.name.slice(0, 6) + "…" : c.name,
      fullName: c.name,
      warehouse: wh?.name ?? c.warehouseId,
      qty,
    };
  });

  const warehouseData = state.warehouses.map((w) => {
    const catNames = new Set(
      state.categories.filter((c) => c.warehouseId === w.id).map((c) => c.name),
    );
    const qty = state.catalog.products
      .filter((p) => catNames.has(p.category))
      .reduce((a, p) => a + p.stock, 0);
    return {
      name: w.name.length > 10 ? w.name.slice(0, 9) + "…" : w.name,
      fullName: w.name,
      warehouse: w.location,
      qty,
    };
  });

  const data = view === "category" ? categoryData : warehouseData;

  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {view === "category" ? "แยกตามหมวดหมู่สินค้า" : "แยกตามโกดังจัดเก็บ"}
        </span>
        <div className="flex gap-1 rounded-md bg-muted/60 p-0.5">
          <button
            type="button"
            onClick={() => setView("category")}
            className={cn(
              "rounded px-2 py-0.5 text-xs font-medium transition-colors",
              view === "category"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            หมวดหมู่
          </button>
          <button
            type="button"
            onClick={() => setView("warehouse")}
            className={cn(
              "rounded px-2 py-0.5 text-xs font-medium transition-colors",
              view === "warehouse"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            โกดัง
          </button>
        </div>
      </div>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: -10, right: 8, top: 8 }}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis dataKey="name" tick={axis} axisLine={false} tickLine={false} interval={0} />
            <YAxis tick={axis} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={tooltipStyle}
              cursor={{ fill: "var(--sun-50)" }}
              formatter={(v: number, _name, item: any) => [
                `${formatNumber(v)} ชิ้น`,
                view === "category"
                  ? `สังกัด ${item?.payload?.warehouse ?? ""}`
                  : "สต็อกรวมในโกดัง",
              ]}
              labelFormatter={(_label, payload: any[]) => payload?.[0]?.payload?.fullName || _label}
            />
            <Bar dataKey="qty" fill="var(--chart-2)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function PurchasingSpendChart({ state }: { state: AppState }) {
  const [view, setView] = useState<"company" | "status">("company");

  const companyData = state.supplierCompanies.map((c) => {
    const totalPO = state.purchaseOrders
      .filter((p) => p.companyId === c.id || p.supplierName.includes(c.name.slice(0, 10)))
      .reduce((sum, p) => sum + p.totalAmount, 0);
    const shortName = c.name.replace("บริษัท ", "").replace(" จำกัด (มหาชน)", "").replace(" จำกัด", "");
    return {
      name: shortName.length > 8 ? shortName.slice(0, 7) + "…" : shortName,
      fullName: c.name,
      amount: totalPO,
    };
  });

  const statusCounts: Record<string, number> = {
    รออนุมัติ: 0,
    อนุมัติ: 0,
    "แปลงเป็น PO": 0,
    ไม่อนุมัติ: 0,
  };
  for (const pr of state.purchaseRequisitions) {
    if (pr.status === "แปลงเป็น PO แล้ว") statusCounts["แปลงเป็น PO"] += pr.totalAmount;
    else if (pr.status in statusCounts) statusCounts[pr.status] += pr.totalAmount;
  }

  const statusData = Object.entries(statusCounts).map(([status, amount]) => ({
    name: status,
    fullName: `มูลค่ารวม PR (${status})`,
    amount,
  }));

  const data = view === "company" ? companyData : statusData;

  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {view === "company" ? "มูลค่าใบสั่งซื้อ (PO) ตามบริษัทคู่ค้า" : "มูลค่าใบเสนอซื้อ (PR) ตามสถานะ"}
        </span>
        <div className="flex gap-1 rounded-md bg-muted/60 p-0.5">
          <button
            type="button"
            onClick={() => setView("company")}
            className={cn(
              "rounded px-2 py-0.5 text-xs font-medium transition-colors",
              view === "company"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            คู่ค้า
          </button>
          <button
            type="button"
            onClick={() => setView("status")}
            className={cn(
              "rounded px-2 py-0.5 text-xs font-medium transition-colors",
              view === "status"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            สถานะ PR
          </button>
        </div>
      </div>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: -10, right: 8, top: 8 }}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis dataKey="name" tick={axis} axisLine={false} tickLine={false} interval={0} />
            <YAxis
              tick={axis}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `฿${v >= 1000 ? `${Math.round(v / 1000)}k` : v}`}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              cursor={{ fill: "var(--sun-50)" }}
              formatter={(v: number) => [
                `฿${formatBaht(v, { decimals: false })}`,
                view === "company" ? "ยอดสั่งซื้อ PO" : "มูลค่ารวม",
              ]}
              labelFormatter={(_label, payload: any[]) => payload?.[0]?.payload?.fullName || _label}
            />
            <Bar dataKey="amount" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
