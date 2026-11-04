import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  Banknote,
  BarChart3,
  Calendar,
  CheckCircle2,
  Coins,
  CreditCard,
  Download,
  FolderCheck,
  Layers,
  LineChart as LineChartIcon,
  PiggyBank,
  Receipt,
  ShoppingBag,
  TrendingUp,
  Users,
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
import { Money } from "@/components/admin/Money";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatBaht, formatNumber } from "@/lib/format";
import { salesLast7Days } from "@/lib/mock-data";
import { useStore, getDynamicSalesLast7Days } from "@/lib/store";

export const Route = createFileRoute("/_admin/owner/overview")({
  head: () => ({
    meta: [
      { title: "ภาพรวมธุรกิจ — ร้านรุ่งอรุณ มินิมาร์ท" },
      { name: "description", content: "สรุปผลประกอบการ กำไรขาดทุน และสถานะทางการเงินสำหรับเจ้าของกิจการ" },
      { property: "og:title", content: "ภาพรวมธุรกิจ — ร้านรุ่งอรุณ มินิมาร์ท" },
      { property: "og:description", content: "สรุปผลประกอบการ กำไรขาดทุน และสถานะทางการเงินสำหรับเจ้าของกิจการ" },
    ],
  }),
  component: OwnerOverviewPage,
});

const axisStyle = { fontSize: 12, fill: "var(--muted-foreground)" };
const tooltipStyle = {
  borderRadius: 8,
  border: "1px solid var(--border)",
  backgroundColor: "var(--card)",
  boxShadow: "var(--shadow-soft)",
  fontFamily: "var(--font-sans)",
  fontSize: 12,
};

function OwnerOverviewPage() {
  const { state } = useStore();

  const dynamicSales = useMemo(
    () => getDynamicSalesLast7Days(state),
    [state?.sales?.receipts, state?.orders],
  );
  const totalStoreSales = dynamicSales.reduce((a, d) => a + d.inStore, 0);
  const totalOnlineSales = dynamicSales.reduce((a, d) => a + d.online, 0);
  const totalRevenue = totalStoreSales + totalOnlineSales;
  const estimatedGrossProfit = Math.round(totalRevenue * 0.24);

  const getProductCost = (p: any) =>
    typeof p.costPrice === "number" ? p.costPrice : Math.round((p.price ?? 0) * 0.7);

  const totalStockCost = state.catalog.products.reduce(
    (a, p) => a + (p.stock ?? 0) * getProductCost(p),
    0,
  );
  const archivedReceiptsCount = state.agentReceipts.filter((r) => r.archiveStatus === "จัดเก็บแล้ว").length;
  const pendingReceiptsCount = state.agentReceipts.filter((r) => r.archiveStatus !== "จัดเก็บแล้ว").length;

  const categoryBreakdown = state.categories.map((c) => {
    const prods = state.catalog.products.filter((p) => p.category === c.name);
    const stockQty = prods.reduce((a, p) => a + (p.stock ?? 0), 0);
    const stockVal = prods.reduce((a, p) => a + (p.stock ?? 0) * getProductCost(p), 0);
    return { name: c.name, stockQty, stockVal };
  });

  const channelPieData = [
    { name: "ยอดขายหน้าร้าน", value: totalStoreSales, color: "var(--chart-1)" },
    { name: "ยอดขายออนไลน์", value: totalOnlineSales, color: "var(--chart-2)" },
  ];

  return (
    <>
      <PageHeader
        title="ภาพรวมธุรกิจ"
        description="แดชบอร์ดสรุปผลประกอบการ กำไรขั้นต้น กระแสเงินสด และสินทรัพย์คงคลังสำหรับเจ้าของกิจการ"
      />

      {/* Top 4 Key Business Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
        <StatCard
          icon={Wallet}
          label="ยอดขายรวม 7 วัน"
          value={<Money value={totalRevenue} decimals={false} />}
          trend={{ value: 9.1, label: "เทียบสัปดาห์ก่อน" }}
          tone="teal"
          hint="หน้าร้าน + ร้านค้าออนไลน์"
        />
        <StatCard
          icon={PiggyBank}
          label="กำไรขั้นต้น (ประมาณการ)"
          value={<Money value={estimatedGrossProfit} decimals={false} />}
          trend={{ value: 8.4, label: "อัตรากำไร 24%" }}
          tone="success"
          hint="รายได้หลังหักต้นทุนขาย"
        />
        <StatCard
          icon={Layers}
          label="มูลค่าสต็อกคงคลัง"
          value={<Money value={totalStockCost} decimals={false} />}
          tone="info"
          hint={`สินค้าพร้อมขาย ${state.catalog.products.length} SKU`}
        />
        <StatCard
          icon={FolderCheck}
          label="ใบเสร็จตัวแทนจัดเก็บแล้ว"
          value={`${archivedReceiptsCount} / ${state.agentReceipts.length}`}
          tone="sun"
          hint={`${pendingReceiptsCount} ใบเสร็จรอจัดเก็บ`}
        />
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        {/* Sales & Profit Trend */}
        <div className="lg:col-span-8">
          <SectionCard
            title="แนวโน้มรายได้และยอดขายรวม (7 วันล่าสุด)"
            description="แยกตามช่องทางหน้าร้านและออนไลน์ (บาท)"
          >
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dynamicSales} margin={{ left: -10, right: 8, top: 8 }}>
                  <defs>
                    <linearGradient id="gStoreOv" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gOnlineOv" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0} />
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
                  <Area type="monotone" dataKey="inStore" stroke="var(--chart-1)" strokeWidth={2} fill="url(#gStoreOv)" name="inStore" />
                  <Area type="monotone" dataKey="online" stroke="var(--chart-2)" strokeWidth={2} fill="url(#gOnlineOv)" name="online" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
        </div>

        {/* Revenue Share Pie */}
        <div className="lg:col-span-4">
          <SectionCard title="สัดส่วนรายได้แยกตามช่องทาง">
            <div className="h-72 flex flex-col items-center justify-center">
              <ResponsiveContainer width="100%" height="80%">
                <PieChart>
                  <Pie data={channelPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} labelLine={false}>
                    {channelPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`฿${formatBaht(v, { decimals: false })}`]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex gap-4 text-xs mt-2">
                <span className="flex items-center gap-1.5 font-medium"><span className="size-3 rounded-full bg-[var(--chart-1)]" /> หน้าร้าน ({Math.round((totalStoreSales / totalRevenue) * 100)}%)</span>
                <span className="flex items-center gap-1.5 font-medium"><span className="size-3 rounded-full bg-[var(--chart-2)]" /> ออนไลน์ ({Math.round((totalOnlineSales / totalRevenue) * 100)}%)</span>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>

      {/* Inventory & Category Distribution Table */}
      <SectionCard
        title="การจัดสรรเงินทุนและมูลค่าสต็อกตามหมวดหมู่"
        description="วิเคราะห์มูลค่าต้นทุนสินค้าในคลังและการกระจายตัวในหมวดหมู่หลัก"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/60 text-muted-foreground">
              <tr>
                <th className="p-3 text-left">หมวดหมู่สินค้า</th>
                <th className="p-3 text-right">จำนวนชิ้นคงคลัง</th>
                <th className="p-3 text-right">มูลค่าต้นทุนรวม (฿)</th>
                <th className="p-3 text-right">สัดส่วนเงินทุนในสต็อก</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {categoryBreakdown.map((cat) => {
                const percent = totalStockCost > 0 ? Math.round((cat.stockVal / totalStockCost) * 100) : 0;
                return (
                  <tr key={cat.name} className="hover:bg-muted/30">
                    <td className="p-3 font-semibold text-foreground">{cat.name}</td>
                    <td className="p-3 text-right">{formatNumber(cat.stockQty)} ชิ้น</td>
                    <td className="p-3 text-right font-medium"><Money value={cat.stockVal} /></td>
                    <td className="p-3 text-right">
                      <Badge variant="outline" className="text-xs">
                        {percent}%
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-muted/60 font-bold border-t border-border">
              <tr>
                <td className="p-3">รวมมูลค่าสต็อกทั้งสิ้น</td>
                <td className="p-3 text-right">
                  {formatNumber(categoryBreakdown.reduce((s, c) => s + c.stockQty, 0))} ชิ้น
                </td>
                <td className="p-3 text-right text-primary text-sm font-bold">
                  <Money value={totalStockCost} />
                </td>
                <td className="p-3 text-right">100%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </SectionCard>
    </>
  );
}

