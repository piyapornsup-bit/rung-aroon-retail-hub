import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import {
  AlertTriangle,
  BarChart3,
  Boxes,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  Layers,
  LineChart as LineChartIcon,
  PackageCheck,
  PieChart as PieChartIcon,
  Printer,
  ShieldAlert,
  ShoppingBag,
  ShoppingCart,
  Truck,
  Undo2,
  Wallet,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatCard } from "@/components/admin/StatCard";
import { SectionCard } from "@/components/admin/SectionCard";
import { EmptyState } from "@/components/admin/EmptyState";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
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
import { formatBaht, formatNumber, formatShortDate } from "@/lib/format";
import {
  salesLast7Days,
  ROLE_LABELS,
  orderTotal,
  type RoleKey,
  type Product,
  type OnlineOrder,
  type PurchaseOrder,
} from "@/lib/mock-data";
import { useStore, useCurrentUser, getDynamicSalesLast7Days } from "@/lib/store";

export const Route = createFileRoute("/_admin/reports")({
  validateSearch: (search: Record<string, unknown>) => ({
    type: typeof search.type === "string" ? search.type : undefined,
  }),
  head: () => ({
    meta: [
      { title: "รายงานวิเคราะห์ — ร้านรุ่งอรุณ มินิมาร์ท" },
      { name: "description", content: "รายงานสรุปผลการดำเนินงาน ยอดขาย สต็อก และการจัดซื้อตามบทบาทหน้าที่" },
      { property: "og:title", content: "รายงานวิเคราะห์ — ร้านรุ่งอรุณ มินิมาร์ท" },
      { property: "og:description", content: "รายงานสรุปผลการดำเนินงาน ยอดขาย สต็อก และการจัดซื้อตามบทบาทหน้าที่" },
    ],
  }),
  component: ReportsPage,
});

export type ReportType =
  | "overview"        // สรุปผลการดำเนินงาน
  | "sales_channels"  // ยอดขายแยกช่องทางออนไลน์ และเคาน์เตอร์
  | "inventory"       // สต๊อกสินค้า
  | "order_history"   // ประวัติการสั่งซื้อ
  | "fulfillment"     // คำสั่งซื้อและการจัดส่ง
  | "procurement";    // การรับสินค้าและการจ่ายเงิน

interface ReportConfig {
  id: ReportType;
  title: string;
  description: string;
  roles: RoleKey[];
  icon: any;
}

const ALL_REPORT_CONFIGS: ReportConfig[] = [
  {
    id: "overview",
    title: "สรุปผลการดำเนินงาน",
    description: "ภาพรวมรายได้ ยอดขายเฉลี่ย กำไรขั้นต้น และยอดขายรวมของร้านรุ่งอรุณ",
    roles: ["manager", "owner"],
    icon: BarChart3,
  },
  {
    id: "sales_channels",
    title: "ยอดขายแยกช่องทางออนไลน์ และเคาน์เตอร์",
    description: "เปรียบเทียบยอดขายหน้าร้าน (เคาน์เตอร์ POS) กับ ออเดอร์ออนไลน์",
    roles: ["sales", "manager", "owner"],
    icon: ShoppingBag,
  },
  {
    id: "inventory",
    title: "สต๊อกสินค้า",
    description: "มูลค่าสต็อกคงเหลือ การกระจายสินค้าในแต่ละโกดัง และสินค้าถึงจุดสั่งซื้อ",
    roles: ["warehouse", "manager", "owner"],
    icon: Layers,
  },
  {
    id: "order_history",
    title: "ประวัติการสั่งซื้อ",
    description: "รายการบิลขายและคำสั่งซื้อ ความถี่ในการซื้อ และยอดการใช้จ่าย",
    roles: ["purchasing", "sales", "manager", "owner"],
    icon: FileText,
  },
  {
    id: "fulfillment",
    title: "คำสั่งซื้อและการจัดส่ง",
    description: "สถิติการจัดเตรียมสินค้า การส่งมอบพัสดุ และสถานะการตีกลับ/คืนสินค้า",
    roles: ["warehouse", "manager", "owner"],
    icon: Truck,
  },
  {
    id: "procurement",
    title: "การรับสินค้าและการจ่ายเงิน",
    description: "ยอดการสั่งซื้อสินค้า (PO) การตรวจรับเข้าคลัง และการชำระเงินให้แก่ตัวแทน",
    roles: ["purchasing", "manager", "owner"],
    icon: ShoppingCart,
  },
];

type DateRangePreset = "today" | "7days" | "30days" | "thisMonth" | "custom";

const axisStyle = { fontSize: 12, fill: "var(--muted-foreground)" };
const tooltipStyle = {
  borderRadius: 8,
  border: "1px solid var(--border)",
  backgroundColor: "var(--card)",
  boxShadow: "var(--shadow-soft)",
  fontFamily: "var(--font-sans)",
  fontSize: 12,
};

const normalizeRole = (role?: string): RoleKey => {
  if (role === "stock") return "warehouse";
  if (role === "buy") return "purchasing";
  return (role as RoleKey) || "sales";
};

function matchesDateRange(
  isoDate?: string,
  preset: DateRangePreset = "7days",
  start?: string,
  end?: string,
): boolean {
  if (!isoDate) return true;
  const d = new Date(isoDate);
  const time = d.getTime();
  if (isNaN(time)) return true;

  const refNow = new Date("2026-11-04T00:00:00.000Z").getTime();

  if (preset === "today") {
    const todayStart = new Date("2026-11-03T00:00:00.000Z").getTime();
    return time >= todayStart;
  }
  if (preset === "7days") {
    const sevenDaysAgo = refNow - 7 * 24 * 60 * 60 * 1000;
    return time >= sevenDaysAgo;
  }
  if (preset === "30days") {
    const thirtyDaysAgo = refNow - 30 * 24 * 60 * 60 * 1000;
    return time >= thirtyDaysAgo;
  }
  if (preset === "thisMonth") {
    const startOfMonth = new Date("2026-11-01T00:00:00.000Z").getTime();
    return time >= startOfMonth;
  }
  if (preset === "custom") {
    let ok = true;
    if (start) {
      const s = new Date(start).getTime();
      if (!isNaN(s)) ok = ok && time >= s;
    }
    if (end) {
      const e = new Date(end).getTime() + 24 * 60 * 60 * 1000 - 1;
      if (!isNaN(e)) ok = ok && time <= e;
    }
    return ok;
  }
  return true;
}

function ReportsPage() {
  const { state } = useStore();
  const rawUser = useCurrentUser();
  const currentRole = normalizeRole(rawUser?.role);
  const searchParams = Route.useSearch();

  // Permitted reports for this role:
  // - manager & owner: see all 6 reports
  // - warehouse (stock): inventory & fulfillment only
  // - purchasing: order_history & procurement only
  // - sales: sales_channels & order_history
  const allowedReports = useMemo(() => {
    if (currentRole === "manager" || currentRole === "owner") return ALL_REPORT_CONFIGS;
    return ALL_REPORT_CONFIGS.filter((r) => r.roles.includes(currentRole));
  }, [currentRole]);

  // Safe fallback default tab for the current role
  const defaultReportId: ReportType = allowedReports[0]?.id || "inventory";

  const [selectedReportId, setSelectedReportId] = useState<ReportType>(() => {
    const fromSearch = searchParams?.type as ReportType;
    if (fromSearch && allowedReports.some((r) => r.id === fromSearch)) {
      return fromSearch;
    }
    return defaultReportId;
  });

  // Whenever allowedReports changes (e.g. role switch), automatically switch to permitted report
  useEffect(() => {
    if (!allowedReports.some((r) => r.id === selectedReportId)) {
      setSelectedReportId(defaultReportId);
    }
  }, [allowedReports, selectedReportId, defaultReportId]);

  // Guaranteed safe active report ID
  const activeReportId: ReportType = useMemo(() => {
    if (allowedReports.some((r) => r.id === selectedReportId)) {
      return selectedReportId;
    }
    return defaultReportId;
  }, [allowedReports, selectedReportId, defaultReportId]);

  const [datePreset, setDatePreset] = useState<DateRangePreset>("7days");
  const [startDate, setStartDate] = useState<string>("2026-10-27");
  const [endDate, setEndDate] = useState<string>("2026-11-03");

  const currentReport = useMemo(
    () => ALL_REPORT_CONFIGS.find((r) => r.id === activeReportId) || ALL_REPORT_CONFIGS[0],
    [activeReportId],
  );

  const hasAccess = useMemo(() => {
    if (currentRole === "manager" || currentRole === "owner") return true;
    return currentReport.roles.includes(currentRole);
  }, [currentRole, currentReport]);

  const dateFilter = useMemo(
    () => (iso?: string) => matchesDateRange(iso, datePreset, startDate, endDate),
    [datePreset, startDate, endDate],
  );

  // ────────── Export CSV Function ──────────
  const handleExportCSV = () => {
    const rows: string[][] = [];
    const filename = `รายงาน_${currentReport.title}_${datePreset}.csv`;

    if (activeReportId === "overview" || activeReportId === "sales_channels") {
      rows.push(["วันที่", "ยอดขายหน้าร้าน (เคาน์เตอร์)", "ยอดขายออนไลน์", "ยอดขายรวม", "กำไรขั้นต้น (ประมาณการ)"]);
      const dynamicSalesData = getDynamicSalesLast7Days(state);
      for (const d of dynamicSalesData ?? []) {
        const total = (d.inStore ?? 0) + (d.online ?? 0);
        const profit = Math.round(total * 0.24);
        rows.push([d.day, (d.inStore ?? 0).toString(), (d.online ?? 0).toString(), total.toString(), profit.toString()]);
      }
    } else if (activeReportId === "inventory") {
      rows.push(["รหัส SKU", "ชื่อสินค้า", "หมวดหมู่", "สต็อกคงเหลือ", "หน่วย", "ราคาขาย", "ราคาทุน", "จุดสั่งซื้อ", "สถานะ"]);
      for (const p of state?.catalog?.products ?? []) {
        const cost = typeof p.costPrice === "number" ? p.costPrice : Math.round((p.price ?? 0) * 0.7);
        const reorder = typeof p.reorderPoint === "number" ? p.reorderPoint : 10;
        rows.push([
          p.sku ?? "-",
          p.name ?? "-",
          p.category ?? "-",
          (p.stock ?? 0).toString(),
          p.unit ?? "ชิ้น",
          (p.price ?? 0).toString(),
          cost.toString(),
          reorder.toString(),
          (p.stock ?? 0) <= reorder ? "ถึงจุดสั่งซื้อ" : "ปกติ",
        ]);
      }
    } else if (activeReportId === "fulfillment") {
      rows.push(["เลขที่คำสั่งซื้อ", "ชื่อลูกค้า", "เบอร์โทร", "ยอดสุทธิ", "สถานะจัดส่ง", "บริษัทขนส่ง", "เลขพัสดุ"]);
      for (const o of state?.orders ?? []) {
        const total = typeof (o as any).netTotal === "number" ? (o as any).netTotal : orderTotal(o);
        rows.push([
          o.id ?? "-",
          o.customerName ?? "-",
          o.phone ?? "-",
          total.toString(),
          o.status ?? "-",
          o.carrier || "-",
          o.trackingNumber || "-",
        ]);
      }
    } else if (activeReportId === "procurement") {
      rows.push(["เลขที่ PO", "บริษัทคู่ค้า", "ตัวแทนจำหน่าย", "โกดังปลายทาง", "ยอดเงินรวม", "สถานะ"]);
      for (const po of state?.purchaseOrders ?? []) {
        rows.push([
          po.poNumber ?? po.id ?? "-",
          po.supplierName ?? "-",
          po.agentName ?? "-",
          po.warehouseName ?? "-",
          (po.totalAmount ?? 0).toString(),
          po.status ?? "-",
        ]);
      }
    } else if (activeReportId === "order_history") {
      rows.push(["เลขที่เอกสาร", "ประเภท", "ลูกค้า / ผู้รับ", "วันที่", "ยอดเงินรวม (บาท)", "สถานะ"]);
      for (const o of state?.orders ?? []) {
        const total = typeof (o as any).netTotal === "number" ? (o as any).netTotal : orderTotal(o);
        rows.push([
          o.id ?? "-",
          "ออเดอร์ออนไลน์",
          o.customerName ?? "-",
          formatShortDate(o.createdAt),
          total.toString(),
          o.status ?? "-",
        ]);
      }
      for (const r of state?.sales?.receipts ?? []) {
        rows.push([
          r.id ?? "-",
          "บิลขายหน้าร้าน",
          r.memberName || (r.memberCode ? `สมาชิก ${r.memberCode}` : "ลูกค้าทั่วไป"),
          formatShortDate(r.createdAt),
          (r.net ?? 0).toString(),
          "สำเร็จ",
        ]);
      }
    }

    // Convert to CSV with UTF-8 BOM
    const csvContent =
      "\uFEFF" +
      rows
        .map((e) => e.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
        .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`ส่งออก ${currentReport.title} เรียบร้อยแล้ว`, {
      description: `ดาวน์โหลดไฟล์ ${filename}`,
    });
  };

  return (
    <>
      <PageHeader
        title="รายงาน"
        description="วิเคราะห์ข้อมูลทางธุรกิจ ยอดขาย สต็อกสินค้า และกระบวนการดำเนินงานตามหน้าที่รับผิดชอบ"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleExportCSV}>
              <Download className="size-4 mr-1.5" />
              ส่งออกรายงาน (CSV)
            </Button>
          </div>
        }
      />

      {/* Control Filters Bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-card p-4 rounded-xl border border-border shadow-xs mb-6">
        {/* Report Type Selector */}
        <div className="md:col-span-6 space-y-1.5">
          <Label className="text-xs">ประเภทรายงาน</Label>
          <Select
            value={activeReportId}
            onValueChange={(val) => setSelectedReportId(val as ReportType)}
          >
            <SelectTrigger className="h-10 font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {allowedReports.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date Range Preset */}
        <div className="md:col-span-3 space-y-1.5">
          <Label className="text-xs">ช่วงเวลา</Label>
          <Select
            value={datePreset}
            onValueChange={(val) => setDatePreset(val as DateRangePreset)}
          >
            <SelectTrigger className="h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">วันนี้</SelectItem>
              <SelectItem value="7days">7 วันล่าสุด</SelectItem>
              <SelectItem value="30days">30 วันล่าสุด</SelectItem>
              <SelectItem value="thisMonth">เดือนนี้ (พ.ย. 2026)</SelectItem>
              <SelectItem value="custom">กำหนดช่วงวันที่เอง</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Custom Date Inputs (if selected) */}
        {datePreset === "custom" ? (
          <div className="md:col-span-3 grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs">เริ่มต้น</Label>
              <Input
                type="date"
                className="h-10 text-xs"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">สิ้นสุด</Label>
              <Input
                type="date"
                className="h-10 text-xs"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        ) : (
          <div className="md:col-span-3 flex items-center gap-2 pt-6 text-xs text-muted-foreground">
            <Calendar className="size-4 shrink-0" />
            <span>
              {datePreset === "today"
                ? "ข้อมูลประจำวันปัจจุบัน"
                : datePreset === "7days"
                  ? "27 ต.ค. - 3 พ.ย. 2026"
                  : datePreset === "30days"
                    ? "4 ต.ค. - 3 พ.ย. 2026"
                    : "1 พ.ย. - 30 พ.ย. 2026"}
            </span>
          </div>
        )}
      </div>

      {/* Permission check */}
      {!hasAccess ? (
        <div className="rounded-2xl border bg-card p-10 text-center shadow-soft max-w-xl mx-auto my-8">
          <EmptyState
            icon={ShieldAlert}
            title="ไม่มีสิทธิ์เข้าถึงรายงานนี้"
            description={`บทบาท “${ROLE_LABELS[currentRole] || currentRole}” ได้รับสิทธิ์เข้าถึงเฉพาะรายงานที่เกี่ยวข้องกับหน้าที่รับผิดชอบเท่านั้น`}
            action={
              <Button
                variant="default"
                onClick={() => setSelectedReportId(defaultReportId)}
                className="mt-2"
              >
                ดูรายงาน {allowedReports[0]?.title}
              </Button>
            }
          />
        </div>
      ) : (
        /* Report Content */
        <div className="space-y-6">
          {activeReportId === "overview" && (
            <OverviewReportSection state={state} onExport={handleExportCSV} />
          )}

          {activeReportId === "sales_channels" && (
            <SalesChannelsReportSection state={state} onExport={handleExportCSV} />
          )}

          {activeReportId === "inventory" && (
            <InventoryReportSection state={state} onExport={handleExportCSV} />
          )}

          {activeReportId === "order_history" && (
            <OrderHistoryReportSection
              state={state}
              dateFilter={dateFilter}
              onExport={handleExportCSV}
            />
          )}

          {activeReportId === "fulfillment" && (
            <FulfillmentReportSection
              state={state}
              dateFilter={dateFilter}
              onExport={handleExportCSV}
            />
          )}

          {activeReportId === "procurement" && (
            <ProcurementReportSection
              state={state}
              dateFilter={dateFilter}
              onExport={handleExportCSV}
            />
          )}
        </div>
      )}
    </>
  );
}

/* ────────── Report 1: สรุปผลการดำเนินงาน ────────── */
function OverviewReportSection({ state, onExport }: { state: any; onExport: () => void }) {
  const data = useMemo(
    () => getDynamicSalesLast7Days(state),
    [state?.sales?.receipts, state?.orders],
  );
  const totalInStore = data.reduce((a, d) => a + (d.inStore ?? 0), 0);
  const totalOnline = data.reduce((a, d) => a + (d.online ?? 0), 0);
  const grandTotal = totalInStore + totalOnline;
  const estimatedGrossProfit = Math.round(grandTotal * 0.24);

  if (data.length === 0) {
    return (
      <EmptyState
        icon={BarChart3}
        title="ยังไม่มีข้อมูลรายงานสรุปผล"
        description="ไม่พบข้อมูลยอดขายย้อนหลังสำหรับการสรุปผลการดำเนินงาน"
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Wallet}
          label="ยอดขายรวม 7 วัน"
          value={<Money value={grandTotal} decimals={false} />}
          trend={{ value: 9.1, label: "เทียบสัปดาห์ก่อน" }}
          tone="teal"
          hint="หน้าร้าน + ออนไลน์"
        />
        <StatCard
          icon={BarChart3}
          label="กำไรขั้นต้น (ประมาณการ)"
          value={<Money value={estimatedGrossProfit} decimals={false} />}
          tone="success"
          hint="อัตรากำไรเฉลี่ย 24%"
        />
        <StatCard
          icon={ShoppingBag}
          label="สัดส่วนออนไลน์"
          value={`${grandTotal > 0 ? Math.round((totalOnline / grandTotal) * 100) : 0}%`}
          tone="sun"
          hint={`฿${formatNumber(totalOnline)}`}
        />
        <StatCard
          icon={CheckCircle2}
          label="คำสั่งซื้อรวม"
          value={`${(state?.orders?.length ?? 0) + 185} รายการ`}
          tone="info"
          hint="หน้าร้านและออนไลน์"
        />
      </div>

      <SectionCard
        title="แนวโน้มยอดขายและกำไรขั้นต้น (7 วันล่าสุด)"
        description="เปรียบเทียบยอดขายรวมกับกำไรขั้นต้นประมาณการ (บาท)"
      >
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ left: -10, right: 8, top: 8 }}>
              <defs>
                <linearGradient id="gTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="day" tick={axisStyle} axisLine={false} tickLine={false} />
              <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000}k`} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v: number, name) => [
                  `฿${formatBaht(v, { decimals: false })}`,
                  name === "inStore" ? "หน้าร้าน" : "ออนไลน์",
                ]}
              />
              <Area type="monotone" dataKey="inStore" stackId="1" stroke="var(--chart-1)" fill="url(#gTotal)" name="inStore" />
              <Area type="monotone" dataKey="online" stackId="1" stroke="var(--chart-2)" fill="var(--chart-2)" fillOpacity={0.2} name="online" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      {/* Breakdown Table */}
      <SectionCard title="ตารางแจกแจงรายวัน">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/60 text-muted-foreground">
              <tr>
                <th className="p-3 text-left">วันที่</th>
                <th className="p-3 text-right">ยอดขายหน้าร้าน (฿)</th>
                <th className="p-3 text-right">ยอดขายออนไลน์ (฿)</th>
                <th className="p-3 text-right">ยอดขายรวม (฿)</th>
                <th className="p-3 text-right">กำไรขั้นต้น 24% (฿)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.map((d) => {
                const total = (d.inStore ?? 0) + (d.online ?? 0);
                return (
                  <tr key={d.day} className="hover:bg-muted/30">
                    <td className="p-3 font-medium text-foreground">{d.day}</td>
                    <td className="p-3 text-right"><Money value={d.inStore ?? 0} /></td>
                    <td className="p-3 text-right"><Money value={d.online ?? 0} /></td>
                    <td className="p-3 text-right font-semibold"><Money value={total} /></td>
                    <td className="p-3 text-right text-emerald-600 font-semibold"><Money value={Math.round(total * 0.24)} /></td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-muted/60 font-bold border-t border-border">
              <tr>
                <td className="p-3">รวมทั้งสิ้น</td>
                <td className="p-3 text-right"><Money value={totalInStore} /></td>
                <td className="p-3 text-right"><Money value={totalOnline} /></td>
                <td className="p-3 text-right text-primary text-sm"><Money value={grandTotal} /></td>
                <td className="p-3 text-right text-emerald-600 text-sm"><Money value={estimatedGrossProfit} /></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}

/* ────────── Report 2: ยอดขายแยกช่องทางออนไลน์ และเคาน์เตอร์ ────────── */
function SalesChannelsReportSection({ state, onExport }: { state: any; onExport: () => void }) {
  const data = useMemo(
    () => getDynamicSalesLast7Days(state),
    [state?.sales?.receipts, state?.orders],
  );
  const channelData = data.map((d) => ({
    day: d.day,
    หน้าร้าน: d.inStore ?? 0,
    ออนไลน์: d.online ?? 0,
  }));

  const totalStore = data.reduce((a, d) => a + (d.inStore ?? 0), 0);
  const totalOnline = data.reduce((a, d) => a + (d.online ?? 0), 0);
  const totalAll = totalStore + totalOnline;

  const pieData = [
    { name: "หน้าร้าน (เคาน์เตอร์ POS)", value: totalStore, color: "var(--chart-1)" },
    { name: "ออนไลน์ (Website & App)", value: totalOnline, color: "var(--chart-2)" },
  ];

  if (channelData.length === 0) {
    return (
      <EmptyState
        icon={ShoppingBag}
        title="ไม่มีข้อมูลยอดขายแยกช่องทาง"
        description="ยังไม่มีข้อมูลยอดขายหน้าร้านและออนไลน์ในระบบ"
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          icon={Wallet}
          label="ยอดขายเคาน์เตอร์หน้าร้าน"
          value={<Money value={totalStore} decimals={false} />}
          tone="teal"
          hint={`คิดเป็น ${totalAll > 0 ? Math.round((totalStore / totalAll) * 100) : 0}% ของยอดรวม`}
        />
        <StatCard
          icon={ShoppingBag}
          label="ยอดขายร้านออนไลน์"
          value={<Money value={totalOnline} decimals={false} />}
          tone="sun"
          hint={`คิดเป็น ${totalAll > 0 ? Math.round((totalOnline / totalAll) * 100) : 0}% ของยอดรวม`}
        />
        <StatCard
          icon={BarChart3}
          label="ยอดขายรวมทุกช่องทาง"
          value={<Money value={totalAll} decimals={false} />}
          tone="info"
          hint={`${data.length} วันทำการล่าสุด`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <SectionCard title="เปรียบเทียบยอดขายรายวัน: หน้าร้าน vs ออนไลน์">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={channelData} margin={{ left: -10, right: 8, top: 8 }}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="day" tick={axisStyle} axisLine={false} tickLine={false} />
                  <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`฿${formatBaht(v, { decimals: false })}`]} />
                  <Bar dataKey="หน้าร้าน" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="ออนไลน์" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
        </div>

        <div className="lg:col-span-4">
          <SectionCard title="สัดส่วนรายได้แยกตามช่องทาง">
            <div className="h-72 flex flex-col items-center justify-center">
              <ResponsiveContainer width="100%" height="80%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} labelLine={false}>
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`฿${formatBaht(v, { decimals: false })}`]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex gap-4 text-xs mt-2">
                <span className="flex items-center gap-1.5"><span className="size-3 rounded-full bg-[var(--chart-1)]" /> หน้าร้าน</span>
                <span className="flex items-center gap-1.5"><span className="size-3 rounded-full bg-[var(--chart-2)]" /> ออนไลน์</span>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

/* ────────── Report 3: สต๊อกสินค้า ────────── */
function InventoryReportSection({ state, onExport }: { state: any; onExport: () => void }) {
  const products: Product[] = state?.catalog?.products ?? [];
  const categories = state?.categories ?? [];
  const warehouses = state?.warehouses ?? [];

  const getProductCost = (p: any) =>
    typeof p.costPrice === "number" ? p.costPrice : Math.round((p.price ?? 0) * 0.7);
  const getProductReorderPoint = (p: any) =>
    typeof p.reorderPoint === "number" ? p.reorderPoint : 10;

  const totalStockQty = products.reduce((sum: number, p) => sum + (p.stock ?? 0), 0);
  const totalStockValue = products.reduce((sum: number, p) => sum + (p.stock ?? 0) * getProductCost(p), 0);
  const reorderProducts = products.filter((p) => (p.stock ?? 0) <= getProductReorderPoint(p));
  const reorderCount = reorderProducts.length;

  const categoryStock = categories.map((c: any) => {
    const inCat = products.filter((p) => p.category === c.name);
    const qty = inCat.reduce((sum: number, p) => sum + (p.stock ?? 0), 0);
    const value = inCat.reduce((sum: number, p) => sum + (p.stock ?? 0) * getProductCost(p), 0);
    return { name: c.name ?? "-", qty, value };
  });

  if (products.length === 0) {
    return (
      <EmptyState
        icon={Layers}
        title="ไม่พบข้อมูลสินค้าในคลัง"
        description="ยังไม่มีข้อมูลสินค้าหรือสต็อกสินค้าในระบบ"
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Layers}
          label="จำนวนสินค้าคงคลังรวม"
          value={`${formatNumber(totalStockQty)} ชิ้น`}
          tone="teal"
          hint={`จากทั้งหมด ${products.length} รายการ (SKU)`}
        />
        <StatCard
          icon={Wallet}
          label="มูลค่าสต็อกต้นทุนรวม"
          value={<Money value={totalStockValue} decimals={false} />}
          tone="info"
          hint="ประเมินตามราคาทุนเฉลี่ย"
        />
        <StatCard
          icon={AlertTriangle}
          label="สินค้าถึงจุดสั่งซื้อ"
          value={`${reorderCount} รายการ`}
          tone={reorderCount > 0 ? "danger" : "teal"}
          hint="จำเป็นต้องเปิดใบเสนอซื้อ (PR)"
        />
        <StatCard
          icon={Boxes}
          label="โกดังจัดเก็บ"
          value={`${warehouses.length} โกดัง`}
          tone="sun"
          hint={`${categories.length} หมวดหมู่สินค้า`}
        />
      </div>

      <SectionCard title="จำนวนสต็อกคงเหลือแยกตามหมวดหมู่สินค้า">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={categoryStock} margin={{ left: -10, right: 8, top: 8 }}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" tick={axisStyle} axisLine={false} tickLine={false} />
              <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v: number, name) => [
                  name === "qty" ? `${formatNumber(v)} ชิ้น` : `฿${formatBaht(v)}`,
                  name === "qty" ? "จำนวนชิ้น" : "มูลค่าต้นทุน",
                ]}
              />
              <Bar dataKey="qty" fill="var(--chart-1)" radius={[4, 4, 0, 0]} name="qty" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      <SectionCard title="รายการสินค้าที่ต้องจับตามอง (สต็อกต่ำกว่าเกณฑ์)">
        {reorderProducts.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="ไม่มีสินค้าที่ต้องสั่งซื้อเพิ่ม"
            description="สต็อกสินค้าทุกรายการมีจำนวนคงเหลือเพียงพอตามเกณฑ์ขั้นต่ำ"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/60 text-muted-foreground">
                <tr>
                  <th className="p-3 text-left">รหัส SKU</th>
                  <th className="p-3 text-left">ชื่อสินค้า</th>
                  <th className="p-3 text-left">หมวดหมู่</th>
                  <th className="p-3 text-right">คงเหลือ</th>
                  <th className="p-3 text-right">จุดสั่งซื้อ</th>
                  <th className="p-3 text-right">ราคาทุน</th>
                  <th className="p-3 text-center">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {reorderProducts.map((p) => {
                  const cost = getProductCost(p);
                  const reorderPoint = getProductReorderPoint(p);
                  return (
                    <tr key={p.id} className="hover:bg-muted/30">
                      <td className="p-3 font-mono font-medium">{p.sku ?? "-"}</td>
                      <td className="p-3 font-semibold text-foreground">{p.name ?? "-"}</td>
                      <td className="p-3 text-muted-foreground">{p.category ?? "-"}</td>
                      <td className="p-3 text-right font-bold text-amber-600">
                        {formatNumber(p.stock ?? 0)} {p.unit ?? "ชิ้น"}
                      </td>
                      <td className="p-3 text-right text-muted-foreground">
                        {formatNumber(reorderPoint)} {p.unit ?? "ชิ้น"}
                      </td>
                      <td className="p-3 text-right"><Money value={cost} /></td>
                      <td className="p-3 text-center">
                        <Badge variant="outline" className="text-amber-700 bg-amber-50 border-amber-300 text-[10px]">
                          ถึงจุดสั่งซื้อ
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

/* ────────── Report 4: ประวัติการสั่งซื้อ ────────── */
function OrderHistoryReportSection({
  state,
  dateFilter,
  onExport,
}: {
  state: any;
  dateFilter: (iso?: string) => boolean;
  onExport: () => void;
}) {
  const allOrders: OnlineOrder[] = state?.orders ?? [];
  const allReceipts = state?.sales?.receipts ?? [];

  const orders = allOrders.filter((o) => dateFilter(o.createdAt));
  const receipts = allReceipts.filter((r) => dateFilter(r.createdAt));

  const getOrderNet = (o: any) =>
    typeof o.netTotal === "number" ? o.netTotal : orderTotal(o);

  const totalSalesCount = orders.length + receipts.length;
  const totalSalesAmount =
    orders.reduce((sum: number, o) => sum + getOrderNet(o), 0) +
    receipts.reduce((sum: number, r) => sum + (r.net ?? 0), 0);

  const completedOnlineCount = orders.filter((o) => o.status === "สำเร็จ").length;

  const orderColumns: DataTableColumn<OnlineOrder>[] = [
    {
      key: "id",
      header: "เลขที่ออเดอร์",
      cell: (o) => <span className="font-semibold text-foreground font-mono">{o.id}</span>,
      sortValue: (o) => o.id,
    },
    {
      key: "customer",
      header: "ลูกค้า",
      cell: (o) => (
        <div>
          <div className="font-medium text-foreground">{o.customerName ?? "-"}</div>
          <div className="text-[11px] text-muted-foreground">{o.phone ?? "-"}</div>
        </div>
      ),
      sortValue: (o) => o.customerName ?? "",
    },
    {
      key: "createdAt",
      header: "วันที่สั่งซื้อ",
      cell: (o) => <span className="text-muted-foreground">{formatShortDate(o.createdAt)}</span>,
      sortValue: (o) => o.createdAt,
    },
    {
      key: "paymentMethod",
      header: "วิธีชำระ",
      cell: (o) => <Badge variant="outline">{o.paymentMethod ?? "-"}</Badge>,
    },
    {
      key: "total",
      header: "ยอดสุทธิ",
      align: "right",
      cell: (o) => <Money value={getOrderNet(o)} className="font-semibold" />,
      sortValue: (o) => getOrderNet(o),
    },
    {
      key: "status",
      header: "สถานะ",
      align: "center",
      cell: (o) => <Badge variant="secondary">{o.status ?? "-"}</Badge>,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          icon={FileText}
          label="รายการสั่งซื้อทั้งหมด"
          value={`${totalSalesCount} รายการ`}
          tone="teal"
          hint="ออนไลน์และหน้าร้าน"
        />
        <StatCard
          icon={Wallet}
          label="ยอดซื้อสุทธิรวม"
          value={<Money value={totalSalesAmount} decimals={false} />}
          tone="info"
          hint="รายได้จากการขาย"
        />
        <StatCard
          icon={CheckCircle2}
          label="คำสั่งซื้อออนไลน์สำเร็จ"
          value={`${completedOnlineCount} ออเดอร์`}
          tone="success"
          hint="ส่งมอบลูกค้าเรียบร้อย"
        />
      </div>

      <SectionCard title="รายการคำสั่งซื้อออนไลน์ล่าสุด">
        {orders.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="ไม่พบรายการคำสั่งซื้อในช่วงเวลานี้"
            description="ลองปรับเปลี่ยนช่วงเวลาการค้นหา หรือตรวจสอบรายการใหม่อีกครั้ง"
          />
        ) : (
          <DataTable
            data={orders}
            columns={orderColumns}
            searchPlaceholder="ค้นหาเลขที่ออเดอร์, ชื่อลูกค้า, เบอร์โทร..."
            searchFn={(row, query) =>
              (row.id?.toLowerCase().includes(query.toLowerCase()) ?? false) ||
              (row.customerName?.toLowerCase().includes(query.toLowerCase()) ?? false) ||
              (row.phone?.includes(query) ?? false)
            }
          />
        )}
      </SectionCard>
    </div>
  );
}

/* ────────── Report 5: คำสั่งซื้อและการจัดส่ง ────────── */
function FulfillmentReportSection({
  state,
  dateFilter,
  onExport,
}: {
  state: any;
  dateFilter: (iso?: string) => boolean;
  onExport: () => void;
}) {
  const allOrders: OnlineOrder[] = state?.orders ?? [];
  const returnsList = state?.returns ?? [];

  const orders = allOrders.filter((o) => dateFilter(o.createdAt));
  const toPack = orders.filter((o) => o.status === "ชำระแล้ว").length;
  const toShip = orders.filter((o) => o.status === "กำลังเตรียม").length;
  const shipped = orders.filter((o) => o.status === "จัดส่งแล้ว" || o.status === "สำเร็จ").length;
  const returns = returnsList.length;

  const deliveredCount = orders.filter(
    (o) => o.status === "สำเร็จ" || (o as any).deliveryResult === "ส่งสำเร็จ",
  ).length;
  const inTransitCount = orders.filter((o) => o.status === "จัดส่งแล้ว").length;
  const failedCount = orders.filter(
    (o) =>
      (o as any).deliveryResult === "ตีกลับ" ||
      (o as any).deliveryResult === "ส่งไม่สำเร็จ" ||
      o.status === "ยกเลิก",
  ).length;

  const deliveryStats = [
    { name: "จัดส่งสำเร็จ", count: deliveredCount },
    { name: "กำลังจัดส่ง", count: inTransitCount },
    { name: "ส่งไม่สำเร็จ/ตีกลับ", count: failedCount },
    { name: "ขอคืนสินค้า", count: returns },
  ];

  if (orders.length === 0 && returnsList.length === 0) {
    return (
      <EmptyState
        icon={Truck}
        title="ไม่มีข้อมูลคำสั่งซื้อและการจัดส่ง"
        description="ยังไม่มีคำสั่งซื้อที่ต้องดำเนินการจัดส่งในช่วงเวลาที่เลือก"
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={PackageCheck}
          label="ออเดอร์รอแพ็ก"
          value={`${toPack} รายการ`}
          tone="sun"
          hint="ชำระเงินแล้ว พร้อมแพ็ก"
        />
        <StatCard
          icon={Clock}
          label="กำลังเตรียม/รอส่ง"
          value={`${toShip} รายการ`}
          tone="warning"
          hint="รอส่งมอบให้บริษัทขนส่ง"
        />
        <StatCard
          icon={Truck}
          label="ส่งมอบแล้ว"
          value={`${shipped} รายการ`}
          tone="success"
          hint="มีเลขพัสดุในระบบ"
        />
        <StatCard
          icon={Undo2}
          label="รายการคืนสินค้า"
          value={`${returns} รายการ`}
          tone="danger"
          hint="คำขอคืนจากลูกค้า"
        />
      </div>

      <SectionCard title="สัดส่วนสถานะการจัดส่งพัสดุ">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={deliveryStats} margin={{ left: -10, right: 8, top: 8 }}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" tick={axisStyle} axisLine={false} tickLine={false} />
              <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v} รายการ`]} />
              <Bar dataKey="count" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>
    </div>
  );
}

/* ────────── Report 6: การรับสินค้าและการจ่ายเงิน ────────── */
function ProcurementReportSection({
  state,
  dateFilter,
  onExport,
}: {
  state: any;
  dateFilter: (iso?: string) => boolean;
  onExport: () => void;
}) {
  const allPOs: PurchaseOrder[] = state?.purchaseOrders ?? [];
  const paymentRequests = state?.paymentRequests ?? [];

  const pos = allPOs.filter((p) => dateFilter(p.orderDate || p.expectedDate));
  const totalPOAmount = pos.reduce((sum, p) => sum + (p?.totalAmount ?? 0), 0);
  const pendingReceiving = pos.filter((p) => p.status === "รอรับสินค้า" || p.status === "รับสินค้าบางส่วน").length;
  const completedPOs = pos.filter((p) => p.status === "รับครบแล้ว").length;
  const pendingPayments = paymentRequests.filter((p) => p.status === "รออนุมัติจ่ายเงิน" || p.status === "รออนุมัติจ่าย").length;

  const poColumns: DataTableColumn<PurchaseOrder>[] = [
    {
      key: "poNumber",
      header: "เลขที่ PO",
      cell: (po) => <span className="font-semibold text-foreground font-mono">{po.poNumber ?? po.id}</span>,
      sortValue: (po) => po.poNumber ?? po.id,
    },
    {
      key: "supplier",
      header: "บริษัทคู่ค้า",
      cell: (po) => <span className="font-medium text-foreground">{po.supplierName ?? "-"}</span>,
      sortValue: (po) => po.supplierName ?? "",
    },
    {
      key: "agent",
      header: "ตัวแทนจำหน่าย",
      cell: (po) => <span className="text-muted-foreground">{po.agentName ?? "-"}</span>,
      sortValue: (po) => po.agentName ?? "",
    },
    {
      key: "warehouse",
      header: "โกดังปลายทาง",
      cell: (po) => <span className="text-muted-foreground">{po.warehouseName ?? "-"}</span>,
      sortValue: (po) => po.warehouseName ?? "",
    },
    {
      key: "amount",
      header: "ยอดรวม (฿)",
      align: "right",
      cell: (po) => <Money value={po.totalAmount ?? 0} className="font-semibold" />,
      sortValue: (po) => po.totalAmount ?? 0,
    },
    {
      key: "status",
      header: "สถานะรับของ",
      align: "center",
      cell: (po) => <Badge variant="outline">{po.status ?? "-"}</Badge>,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={ShoppingCart}
          label="มูลค่าใบสั่งซื้อ (PO) รวม"
          value={<Money value={totalPOAmount} decimals={false} />}
          tone="teal"
          hint={`${pos.length} ใบสั่งซื้อ`}
        />
        <StatCard
          icon={Clock}
          label="PO รอตรวจรับเข้าคลัง"
          value={`${pendingReceiving} รายการ`}
          tone="warning"
          hint="สินค้ากำลังจัดส่งเข้าคลัง"
        />
        <StatCard
          icon={CheckCircle2}
          label="ตรวจรับครบแล้ว"
          value={`${completedPOs} รายการ`}
          tone="success"
          hint="สต็อกถูกบันทึกเรียบร้อย"
        />
        <StatCard
          icon={Wallet}
          label="คำขอจ่ายเงินรออนุมัติ"
          value={`${pendingPayments} รายการ`}
          tone="danger"
          hint="รอผู้จัดการพิจารณา"
        />
      </div>

      <SectionCard title="สถานะใบสั่งซื้อ (PO) และการตรวจรับ">
        {pos.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title="ไม่พบรายการใบสั่งซื้อ (PO)"
            description="ยังไม่มีรายการใบสั่งซื้อสินค้าในช่วงเวลาที่เลือก"
          />
        ) : (
          <DataTable
            data={pos}
            columns={poColumns}
            searchPlaceholder="ค้นหาเลขที่ PO, บริษัทคู่ค้า, ตัวแทนจำหน่าย..."
            searchFn={(row, query) =>
              (row.poNumber?.toLowerCase().includes(query.toLowerCase()) ?? false) ||
              (row.supplierName?.toLowerCase().includes(query.toLowerCase()) ?? false) ||
              (row.agentName?.toLowerCase().includes(query.toLowerCase()) ?? false)
            }
          />
        )}
      </SectionCard>
    </div>
  );
}
