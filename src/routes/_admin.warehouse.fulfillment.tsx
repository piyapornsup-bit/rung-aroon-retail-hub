import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Boxes,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  MapPin,
  Package,
  PackageCheck,
  Phone,
  RotateCcw,
  Search,
  Send,
  Truck,
  User,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatCard } from "@/components/admin/StatCard";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Money } from "@/components/admin/Money";
import { ClientTime } from "@/components/admin/ClientTime";
import { FormDialog, Field } from "@/components/admin/FormDialog";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { EmptyState } from "@/components/admin/EmptyState";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
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
import {
  useStore,
  selectWarehouseForCategory,
  selectOrdersToPack,
  selectOrdersToShip,
  selectOrdersShipped,
  selectOrdersDelivered,
} from "@/lib/store";
import {
  CARRIERS,
  orderTotal,
  type OnlineOrder,
  type OrderStatus,
  type Carrier,
} from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_admin/warehouse/fulfillment")({
  head: () => ({
    meta: [
      { title: "จัดเตรียมและจัดส่งสินค้าออนไลน์ — ร้านรุ่งอรุณ มินิมาร์ท" },
      {
        name: "description",
        content: "กระดานติดตามการแพ็กสินค้า ตัดสต็อก จัดส่ง และบันทึกผลการจัดส่งคำสั่งซื้อออนไลน์",
      },
      { property: "og:title", content: "จัดเตรียมและจัดส่งสินค้าออนไลน์ — ร้านรุ่งอรุณ มินิมาร์ท" },
      {
        property: "og:description",
        content: "กระดานติดตามการแพ็กสินค้า ตัดสต็อก จัดส่ง และบันทึกผลการจัดส่งคำสั่งซื้อออนไลน์",
      },
    ],
  }),
  component: FulfillmentPage,
});

type TabView = "all" | "ชำระแล้ว" | "กำลังเตรียม" | "จัดส่งแล้ว" | "ผลการจัดส่ง";

function FulfillmentPage() {
  const { state, actions } = useStore();
  const [activeTab, setActiveTab] = useState<TabView>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Ship Order Dialog State
  const [shippingTarget, setShippingTarget] = useState<OnlineOrder | null>(null);
  const [selectedCarrier, setSelectedCarrier] = useState<Carrier>(CARRIERS[0]);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [shippingNote, setShippingNote] = useState("");
  const [shipErrors, setShipErrors] = useState<Record<string, string>>({});

  // Delivery Outcome Dialog State
  const [outcomeTarget, setOutcomeTarget] = useState<OnlineOrder | null>(null);
  const [selectedOutcome, setSelectedOutcome] = useState<"ส่งสำเร็จ" | "ส่งไม่สำเร็จ" | "ตีกลับ">("ส่งสำเร็จ");
  const [outcomeNote, setOutcomeNote] = useState("");

  // Selectors for 4 stages
  const toPackOrders = useMemo(() => selectOrdersToPack(state), [state]);
  const packingOrders = useMemo(() => selectOrdersToShip(state), [state]);
  const shippedOrders = useMemo(() => selectOrdersShipped(state), [state]);
  const completedOrders = useMemo(() => selectOrdersDelivered(state), [state]);

  // Filter orders by search
  const filterOrders = (list: OnlineOrder[]) => {
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter(
      (o) =>
        o.id.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.phone.includes(q) ||
        (o.trackingNumber?.toLowerCase().includes(q) ?? false) ||
        (o.carrier?.toLowerCase().includes(q) ?? false) ||
        o.lines.some((l) => l.name.toLowerCase().includes(q)),
    );
  };

  const filteredToPack = useMemo(() => filterOrders(toPackOrders), [toPackOrders, searchQuery]);
  const filteredPacking = useMemo(() => filterOrders(packingOrders), [packingOrders, searchQuery]);
  const filteredShipped = useMemo(() => filterOrders(shippedOrders), [shippedOrders, searchQuery]);
  const filteredCompleted = useMemo(() => filterOrders(completedOrders), [completedOrders, searchQuery]);

  // Stage Action Handlers
  const handleStartPacking = (order: OnlineOrder) => {
    actions.startPackingOrder(order.id);
    toast.success("เริ่มจัดเตรียมสินค้าแล้ว", {
      description: `คำสั่งซื้อ ${order.id} ย้ายไปยังขั้นตอน “กำลังเตรียม”`,
    });
  };

  const handleOpenShipDialog = (order: OnlineOrder) => {
    setShippingTarget(order);
    setSelectedCarrier(CARRIERS[0]);
    // Generate a suggested realistic tracking prefix based on carrier
    setTrackingNumber(`TH${Date.now().toString().slice(-8)}`);
    setShippingNote("");
    setShipErrors({});
  };

  const handleConfirmShip = () => {
    if (!shippingTarget) return false;
    if (!trackingNumber.trim()) {
      setShipErrors({ trackingNumber: "กรุณาระบุเลขพัสดุ (Tracking Number)" });
      return false;
    }

    actions.shipOrder(shippingTarget.id, selectedCarrier, trackingNumber.trim(), shippingNote.trim());
    toast.success("บันทึกการจัดส่งสินค้าเรียบร้อย", {
      description: `ส่งผ่าน ${selectedCarrier} (${trackingNumber.trim()})`,
    });
    setShippingTarget(null);
    return true;
  };

  const handleOpenOutcomeDialog = (order: OnlineOrder) => {
    setOutcomeTarget(order);
    setSelectedOutcome("ส่งสำเร็จ");
    setOutcomeNote("");
  };

  const handleConfirmOutcome = () => {
    if (!outcomeTarget) return;

    actions.setDeliveryResult(outcomeTarget.id, selectedOutcome, outcomeNote.trim());
    if (selectedOutcome === "ส่งสำเร็จ") {
      toast.success("บันทึกผลการจัดส่งสำเร็จ", {
        description: `คำสั่งซื้อ ${outcomeTarget.id} ส่งมอบให้ลูกค้าเรียบร้อยแล้ว`,
      });
    } else {
      toast.warning(`บันทึกผล: ${selectedOutcome}`, {
        description: outcomeNote ? `หมายเหตุ: ${outcomeNote}` : undefined,
      });
    }
    setOutcomeTarget(null);
  };

  return (
    <>
      <PageHeader
        title="จัดเตรียมและจัดส่งสินค้าออนไลน์"
        description="กระดานติดตามสถานะคำสั่งซื้อ ตรวจสอบคลังจัดเก็บ แพ็กสินค้า ตัดสต็อก และจัดส่งพัสดุ"
      />

      {/* Top Stat Summary Cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <StatCard
          icon={PackageCheck}
          label="ชำระแล้ว (รอแพ็ก)"
          value={`${toPackOrders.length} ออเดอร์`}
          tone={toPackOrders.length > 0 ? "sun" : "info"}
          hint="ได้รับอนุมัติยอดชำระแล้ว"
        />
        <StatCard
          icon={Boxes}
          label="กำลังเตรียม (รอจัดส่ง)"
          value={`${packingOrders.length} ออเดอร์`}
          tone={packingOrders.length > 0 ? "warning" : "info"}
          hint="อยู่ระหว่างหยิบและแพ็กของ"
        />
        <StatCard
          icon={Truck}
          label="จัดส่งแล้ว (ระหว่างขนส่ง)"
          value={`${shippedOrders.length} ออเดอร์`}
          tone="teal"
          hint="ขนส่งรับพัสดุเรียบร้อย"
        />
        <StatCard
          icon={CheckCircle2}
          label="ผลการจัดส่ง"
          value={`${completedOrders.length} ออเดอร์`}
          tone="success"
          hint="ส่งสำเร็จ / ตีกลับ"
        />
      </div>

      {/* Search and Tab Navigation */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as TabView)}
          className="w-full sm:w-auto"
        >
          <TabsList className="h-10 rounded-md bg-card p-1 shadow-soft">
            <TabsTrigger
              value="all"
              className="h-8 gap-1.5 px-3 text-xs data-[state=active]:bg-sun-50 data-[state=active]:text-sun-800"
            >
              กระดานทั้งหมด (Kanban)
            </TabsTrigger>
            <TabsTrigger
              value="ชำระแล้ว"
              className="h-8 gap-1.5 px-3 text-xs data-[state=active]:bg-sun-50 data-[state=active]:text-sun-800"
            >
              ชำระแล้ว
              <span className="rounded-full bg-blue-100 px-1.5 py-0.2 text-[10px] font-semibold text-blue-900">
                {toPackOrders.length}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="กำลังเตรียม"
              className="h-8 gap-1.5 px-3 text-xs data-[state=active]:bg-sun-50 data-[state=active]:text-sun-800"
            >
              กำลังเตรียม
              <span className="rounded-full bg-indigo-100 px-1.5 py-0.2 text-[10px] font-semibold text-indigo-900">
                {packingOrders.length}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="จัดส่งแล้ว"
              className="h-8 gap-1.5 px-3 text-xs data-[state=active]:bg-sun-50 data-[state=active]:text-sun-800"
            >
              จัดส่งแล้ว
              <span className="rounded-full bg-cyan-100 px-1.5 py-0.2 text-[10px] font-semibold text-cyan-900">
                {shippedOrders.length}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="ผลการจัดส่ง"
              className="h-8 gap-1.5 px-3 text-xs data-[state=active]:bg-sun-50 data-[state=active]:text-sun-800"
            >
              ผลการจัดส่ง
              <span className="rounded-full bg-muted px-1.5 py-0.2 text-[10px]">
                {completedOrders.length}
              </span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาเลขออเดอร์, ลูกค้า, สินค้า หรือเลขพัสดุ..."
            className="pl-9 h-9 text-xs"
          />
        </div>
      </div>

      {/* Kanban Board Container */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4 items-start">
        {/* Column 1: ชำระแล้ว */}
        {(activeTab === "all" || activeTab === "ชำระแล้ว") && (
          <KanbanColumn
            title="ชำระแล้ว (รอแพ็ก)"
            badgeCount={filteredToPack.length}
            tone="blue"
            description="อนุมัติการชำระเงินแล้ว พร้อมเริ่มหยิบสินค้า"
          >
            {filteredToPack.length === 0 ? (
              <EmptyColumn label="ไม่มีออเดอร์รอแพ็กในขณะนี้" />
            ) : (
              filteredToPack.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  state={state}
                  onToggleItem={(productId) => actions.togglePackedItem(order.id, productId)}
                  primaryAction={
                    <Button
                      size="sm"
                      onClick={() => handleStartPacking(order)}
                      className="w-full gap-1.5 text-xs bg-sun-600 text-white hover:bg-sun-700"
                    >
                      <Package className="size-3.5" />
                      <span>เริ่มจัดเตรียมสินค้า</span>
                      <ChevronRight className="size-3.5 ml-auto" />
                    </Button>
                  }
                />
              ))
            )}
          </KanbanColumn>
        )}

        {/* Column 2: กำลังเตรียม */}
        {(activeTab === "all" || activeTab === "กำลังเตรียม") && (
          <KanbanColumn
            title="กำลังเตรียม (แพ็กของ)"
            badgeCount={filteredPacking.length}
            tone="indigo"
            description="เช็คลิสต์รายการสินค้าและบรรจุลงกล่องพัสดุ"
          >
            {filteredPacking.length === 0 ? (
              <EmptyColumn label="ไม่มีออเดอร์ที่กำลังจัดเตรียม" />
            ) : (
              filteredPacking.map((order) => {
                const isAllPacked =
                  order.packedLines &&
                  order.packedLines.length >= order.lines.length &&
                  order.lines.every((l) => order.packedLines?.includes(l.productId));

                return (
                  <OrderCard
                    key={order.id}
                    order={order}
                    state={state}
                    onToggleItem={(productId) => actions.togglePackedItem(order.id, productId)}
                    primaryAction={
                      <Button
                        size="sm"
                        onClick={() => handleOpenShipDialog(order)}
                        variant={isAllPacked ? "default" : "outline"}
                        className={cn(
                          "w-full gap-1.5 text-xs",
                          isAllPacked && "bg-emerald-600 hover:bg-emerald-700 text-white",
                        )}
                      >
                        <Truck className="size-3.5" />
                        <span>จัดส่งสินค้า (ระบุขนส่ง & เลขพัสดุ)</span>
                        <ChevronRight className="size-3.5 ml-auto" />
                      </Button>
                    }
                  />
                );
              })
            )}
          </KanbanColumn>
        )}

        {/* Column 3: จัดส่งแล้ว */}
        {(activeTab === "all" || activeTab === "จัดส่งแล้ว") && (
          <KanbanColumn
            title="จัดส่งแล้ว (ระหว่างทาง)"
            badgeCount={filteredShipped.length}
            tone="cyan"
            description="ส่งมอบพัสดุให้บริษัทขนส่งแล้ว ติดตามสถานะ"
          >
            {filteredShipped.length === 0 ? (
              <EmptyColumn label="ไม่มีออเดอร์ระหว่างจัดส่ง" />
            ) : (
              filteredShipped.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  state={state}
                  readonlyChecklist
                  extraInfo={
                    <div className="rounded-md border border-cyan-200 bg-cyan-50/70 p-2.5 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-cyan-900 flex items-center gap-1">
                          <Truck className="size-3.5" />
                          {order.carrier ?? "ไม่ระบุขนส่ง"}
                        </span>
                        {order.shippedAt && (
                          <ClientTime iso={order.shippedAt} mode="ago" className="text-[11px] text-cyan-800" />
                        )}
                      </div>
                      <div className="flex items-center justify-between text-cyan-950 font-mono text-[11px] pt-1 border-t border-cyan-200/60">
                        <span>เลขพัสดุ:</span>
                        <span className="font-bold select-all">{order.trackingNumber ?? "-"}</span>
                      </div>
                    </div>
                  }
                  primaryAction={
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenOutcomeDialog(order)}
                      className="w-full gap-1.5 text-xs hover:bg-cyan-50 hover:text-cyan-900"
                    >
                      <CheckCircle2 className="size-3.5 text-cyan-600" />
                      <span>บันทึกผลการจัดส่ง</span>
                      <ChevronRight className="size-3.5 ml-auto" />
                    </Button>
                  }
                />
              ))
            )}
          </KanbanColumn>
        )}

        {/* Column 4: ผลการจัดส่ง */}
        {(activeTab === "all" || activeTab === "ผลการจัดส่ง") && (
          <KanbanColumn
            title="ผลการจัดส่ง"
            badgeCount={filteredCompleted.length}
            tone="green"
            description="จัดส่งสำเร็จ / ส่งไม่สำเร็จ / พัสดุตีกลับ"
          >
            {filteredCompleted.length === 0 ? (
              <EmptyColumn label="ยังไม่มีรายการผลการจัดส่ง" />
            ) : (
              filteredCompleted.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  state={state}
                  readonlyChecklist
                  extraInfo={
                    <div
                      className={cn(
                        "rounded-md border p-2.5 text-xs space-y-1.5",
                        order.status === "ส่งสำเร็จ"
                          ? "border-emerald-200 bg-emerald-50/80 text-emerald-950"
                          : "border-red-200 bg-red-50/80 text-red-950",
                      )}
                    >
                      <div className="flex items-center justify-between font-semibold">
                        <span className="flex items-center gap-1.5">
                          {order.status === "ส่งสำเร็จ" ? (
                            <CheckCircle2 className="size-3.5 text-emerald-600" />
                          ) : (
                            <XCircle className="size-3.5 text-red-600" />
                          )}
                          {order.status}
                        </span>
                        {order.deliveredAt && (
                          <ClientTime iso={order.deliveredAt} mode="ago" className="text-[11px] opacity-80" />
                        )}
                      </div>
                      {order.carrier && (
                        <p className="text-[11px] opacity-80 font-mono">
                          {order.carrier} · เลขพัสดุ: {order.trackingNumber}
                        </p>
                      )}
                      {order.deliveryNote && (
                        <p className="text-xs pt-1 border-t border-current/20 italic">
                          หมายเหตุ: {order.deliveryNote}
                        </p>
                      )}
                    </div>
                  }
                />
              ))
            )}
          </KanbanColumn>
        )}
      </div>

      {/* Moving to "จัดส่งแล้ว" Form Dialog */}
      {shippingTarget && (
        <FormDialog
          open={!!shippingTarget}
          onOpenChange={(open) => !open && setShippingTarget(null)}
          title="บันทึกข้อมูลการจัดส่งสินค้า"
          description={`คำสั่งซื้อ ${shippingTarget.id} ลูกค้า: ${shippingTarget.customerName}`}
          submitLabel="ยืนยันการจัดส่ง (ย้ายไป จัดส่งแล้ว)"
          onSubmit={handleConfirmShip}
        >
          {/* Order Summary */}
          <div className="rounded-lg border bg-muted/40 p-3 text-xs space-y-1">
            <div className="flex justify-between font-semibold text-foreground">
              <span>ยอดรวมทั้งสิ้น: <Money value={orderTotal(shippingTarget)} /></span>
              <span>จำนวน {shippingTarget.lines.reduce((s, l) => s + l.qty, 0)} ชิ้น</span>
            </div>
            <p className="text-muted-foreground truncate">
              ที่อยู่จัดส่ง: {shippingTarget.address} ({shippingTarget.phone})
            </p>
          </div>

          {/* Carrier Dropdown */}
          <Field label="ผู้ให้บริการขนส่ง (Carrier)" htmlFor="carrier-select" required>
            <Select value={selectedCarrier} onValueChange={(val) => setSelectedCarrier(val as Carrier)}>
              <SelectTrigger id="carrier-select">
                <SelectValue placeholder="เลือกบริษัทขนส่ง..." />
              </SelectTrigger>
              <SelectContent>
                {CARRIERS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {/* Tracking Number */}
          <Field
            label="เลขพัสดุ (Tracking Number)"
            htmlFor="tracking-input"
            required
            error={shipErrors.trackingNumber}
            hint="รหัสพัสดุสำหรับติดตามสถานะการจัดส่ง"
          >
            <Input
              id="tracking-input"
              value={trackingNumber}
              onChange={(e) => {
                setTrackingNumber(e.target.value);
                if (shipErrors.trackingNumber) setShipErrors((s) => ({ ...s, trackingNumber: "" }));
              }}
              placeholder="เช่น TH012389472, KEX90123456"
              className="font-mono"
            />
          </Field>

          {/* Shipping Note */}
          <Field label="หมายเหตุการจัดส่ง (ไม่บังคับ)" htmlFor="ship-note">
            <Input
              id="ship-note"
              value={shippingNote}
              onChange={(e) => setShippingNote(e.target.value)}
              placeholder="เช่น ฝากไว้กับเจ้าหน้าที่รักษาความปลอดภัย, ส่งรอบเช้า"
            />
          </Field>
        </FormDialog>
      )}

      {/* Record Final Delivery Outcome Dialog */}
      {outcomeTarget && (
        <ConfirmDialog
          open={!!outcomeTarget}
          onOpenChange={(open) => !open && setOutcomeTarget(null)}
          title={`บันทึกผลการจัดส่ง — ${outcomeTarget.id}`}
          description={
            <div className="space-y-3 pt-2 text-left">
              <p className="text-xs text-muted-foreground">
                ระบุผลการนำส่งพัสดุให้แก่คุณ <strong>{outcomeTarget.customerName}</strong> ({outcomeTarget.phone})
              </p>

              {/* Choices */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground block">เลือกผลการจัดส่ง:</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedOutcome("ส่งสำเร็จ")}
                    className={cn(
                      "flex flex-col items-center justify-center p-2.5 rounded-lg border text-xs font-medium gap-1.5 transition-all",
                      selectedOutcome === "ส่งสำเร็จ"
                        ? "border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500"
                        : "border-border hover:bg-muted text-muted-foreground",
                    )}
                  >
                    <CheckCircle2 className="size-4 text-emerald-600" />
                    <span>ส่งสำเร็จ</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedOutcome("ส่งไม่สำเร็จ")}
                    className={cn(
                      "flex flex-col items-center justify-center p-2.5 rounded-lg border text-xs font-medium gap-1.5 transition-all",
                      selectedOutcome === "ส่งไม่สำเร็จ"
                        ? "border-red-500 bg-red-50 text-red-900 ring-2 ring-red-500"
                        : "border-border hover:bg-muted text-muted-foreground",
                    )}
                  >
                    <XCircle className="size-4 text-red-600" />
                    <span>ส่งไม่สำเร็จ</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedOutcome("ตีกลับ")}
                    className={cn(
                      "flex flex-col items-center justify-center p-2.5 rounded-lg border text-xs font-medium gap-1.5 transition-all",
                      selectedOutcome === "ตีกลับ"
                        ? "border-amber-500 bg-amber-50 text-amber-900 ring-2 ring-amber-500"
                        : "border-border hover:bg-muted text-muted-foreground",
                    )}
                  >
                    <RotateCcw className="size-4 text-amber-600" />
                    <span>ตีกลับ</span>
                  </button>
                </div>
              </div>

              {/* Optional Note */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground block">
                  หมายเหตุเพิ่มเติม (เหตุผล):
                </label>
                <Input
                  value={outcomeNote}
                  onChange={(e) => setOutcomeNote(e.target.value)}
                  placeholder={
                    selectedOutcome === "ส่งสำเร็จ"
                      ? "เช่น ผู้รับลงชื่อรับของเรียบร้อย"
                      : "เช่น ไม่สามารถติดต่อผู้รับได้, ลูกค้าปฏิเสธการรับ"
                  }
                  className="text-xs"
                />
              </div>
            </div>
          }
          tone={selectedOutcome === "ส่งสำเร็จ" ? "success" : "danger"}
          confirmLabel={`บันทึกเป็น “${selectedOutcome}”`}
          onConfirm={handleConfirmOutcome}
        />
      )}
    </>
  );
}

/* ───────────────────────── Helper Sub-components ───────────────────────── */

interface KanbanColumnProps {
  title: string;
  badgeCount: number;
  tone: "blue" | "indigo" | "cyan" | "green";
  description: string;
  children: React.ReactNode;
}

function KanbanColumn({ title, badgeCount, tone, description, children }: KanbanColumnProps) {
  const badgeClasses = {
    blue: "bg-blue-100 text-blue-900 border-blue-200",
    indigo: "bg-indigo-100 text-indigo-900 border-indigo-200",
    cyan: "bg-cyan-100 text-cyan-900 border-cyan-200",
    green: "bg-emerald-100 text-emerald-900 border-emerald-200",
  }[tone];

  return (
    <div className="flex flex-col rounded-lg border bg-muted/20 p-3 shadow-xs min-h-[500px]">
      <div className="mb-3 space-y-1">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <Badge variant="outline" className={cn("text-xs font-bold font-mono", badgeClasses)}>
            {badgeCount}
          </Badge>
        </div>
        <p className="text-[11px] text-muted-foreground">{description}</p>
      </div>
      <div className="flex-1 space-y-3">{children}</div>
    </div>
  );
}

function EmptyColumn({ label }: { label: string }) {
  return (
    <div className="flex h-36 items-center justify-center rounded-md border border-dashed border-muted-foreground/25 p-4 text-center">
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

interface OrderCardProps {
  order: OnlineOrder;
  state: any;
  onToggleItem?: (productId: string) => void;
  readonlyChecklist?: boolean;
  extraInfo?: React.ReactNode;
  primaryAction?: React.ReactNode;
}

function OrderCard({
  order,
  state,
  onToggleItem,
  readonlyChecklist = false,
  extraInfo,
  primaryAction,
}: OrderCardProps) {
  const packedSet = useMemo(() => new Set(order.packedLines ?? []), [order.packedLines]);
  const isAllPacked = order.lines.length > 0 && order.lines.every((l) => packedSet.has(l.productId));

  return (
    <div className="rounded-lg border bg-card p-3 shadow-xs space-y-3 transition-shadow hover:shadow-soft text-xs">
      {/* Order Header */}
      <div className="flex items-start justify-between gap-2 border-b pb-2">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5">
            <span className="font-mono font-bold text-foreground text-sm">{order.id}</span>
            <StatusBadge status={order.status} />
          </div>
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Clock className="size-3" />
            <ClientTime iso={order.createdAt} mode="ago" />
          </div>
        </div>

        <div className="text-right space-y-0.5">
          <Money value={orderTotal(order)} className="font-bold text-sm text-foreground" />
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-[10px] text-muted-foreground">{order.paymentMethod}</span>
            <Badge
              variant="outline"
              className={
                order.receiptType === "เต็ม"
                  ? "border-amber-400 bg-amber-50 text-amber-900 text-[10px] font-semibold"
                  : "border-border text-muted-foreground text-[10px]"
              }
            >
              {order.receiptType === "เต็ม" ? "ใบกำกับภาษีเต็มรูป" : "ใบเสร็จอย่างย่อ"}
            </Badge>
          </div>
        </div>
      </div>

      {/* Customer & Shipping Info */}
      <div className="space-y-1 text-muted-foreground">
        <div className="flex items-center justify-between">
          <span className="font-medium text-foreground flex items-center gap-1">
            <User className="size-3 text-muted-foreground" />
            {order.customerName}
          </span>
          <span className="font-mono text-[11px] flex items-center gap-1">
            <Phone className="size-3" />
            {order.phone}
          </span>
        </div>
        <p className="line-clamp-1 text-[11px] flex items-center gap-1">
          <MapPin className="size-3 shrink-0" />
          <span className="truncate">{order.address}</span>
        </p>
        <div className="flex items-center justify-between text-[11px] pt-1 border-t border-border/50">
          <span className="flex items-center gap-1 text-muted-foreground">
            <Truck className="size-3 text-sun-600" /> วิธีจัดส่ง:
          </span>
          <span className="font-semibold text-foreground">
            {order.shippingMethod || order.carrier || "Flash Express"}
          </span>
        </div>

        {/* Full tax invoice buyer details */}
        {order.receiptType === "เต็ม" && (
          <div className="mt-1.5 p-2 rounded-md border border-amber-200 bg-amber-50/60 text-[11px] text-amber-950 space-y-0.5">
            <div className="font-bold text-amber-900 flex items-center gap-1">
              <span>ข้อมูลออกใบกำกับภาษีเต็มรูป:</span>
            </div>
            <div><span className="text-muted-foreground">ผู้ซื้อ/บริษัท:</span> <strong>{order.buyerName || order.customerName}</strong></div>
            <div><span className="text-muted-foreground">เลขประจำตัวผู้เสียภาษี:</span> <strong className="font-mono">{order.buyerTaxId || "-"}</strong></div>
            {order.buyerAddress && (
              <div className="truncate"><span className="text-muted-foreground">ที่อยู่ออกใบกำกับ:</span> {order.buyerAddress}</div>
            )}
          </div>
        )}
      </div>

      {/* Pack Checklist & Items picked from Warehouse */}
      <div className="space-y-1.5 rounded-md border bg-muted/30 p-2.5">
        <div className="flex items-center justify-between text-[11px] font-semibold text-foreground">
          <span>รายการสินค้า & โกดังจัดเก็บ:</span>
          {!readonlyChecklist && (
            <span
              className={cn(
                "font-mono text-[10px] px-1.5 py-0.2 rounded-full",
                isAllPacked ? "bg-emerald-100 text-emerald-900" : "bg-muted text-muted-foreground",
              )}
            >
              {packedSet.size}/{order.lines.length} แพ็กแล้ว
            </span>
          )}
        </div>

        <div className="space-y-1.5 pt-1">
          {order.lines.map((line) => {
            const product = state.catalog.products.find((p: any) => p.id === line.productId);
            const category = product?.category ?? "";
            const warehouse = selectWarehouseForCategory(state, category);
            const isChecked = packedSet.has(line.productId);

            return (
              <div
                key={line.productId}
                className={cn(
                  "flex items-start justify-between gap-2 rounded p-1.5 transition-colors",
                  isChecked && !readonlyChecklist ? "bg-emerald-50/70 border border-emerald-200/50" : "bg-card border",
                )}
              >
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  {!readonlyChecklist ? (
                    <Checkbox
                      id={`chk-${order.id}-${line.productId}`}
                      checked={isChecked}
                      onCheckedChange={() => onToggleItem?.(line.productId)}
                      className="mt-0.5"
                    />
                  ) : (
                    <span className="text-emerald-600 mt-0.5">
                      <Check className="size-3.5" />
                    </span>
                  )}

                  <div className="space-y-0.5 flex-1 min-w-0">
                    <label
                      htmlFor={`chk-${order.id}-${line.productId}`}
                      className={cn(
                        "font-medium text-foreground block truncate cursor-pointer",
                        isChecked && !readonlyChecklist && "line-through text-muted-foreground",
                      )}
                    >
                      {product?.emoji} {line.name}
                    </label>

                    {/* Warehouse Pick Location */}
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Building2 className="size-2.5 text-sun-600 shrink-0" />
                      <span className="truncate">
                        หยิบจาก: <strong>{warehouse?.name ?? "โกดังหลัก"}</strong> ({warehouse?.id ?? "WH-01"})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Line Qty & Price */}
                <div className="text-right shrink-0">
                  <span className="font-semibold text-foreground font-mono">x{line.qty}</span>
                  <span className="text-[10px] text-muted-foreground block">
                    <Money value={line.price * line.qty} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Extra Info (Carrier badge / Delivery Result) */}
      {extraInfo}

      {/* Primary Action Button */}
      {primaryAction && <div className="pt-1">{primaryAction}</div>}
    </div>
  );
}
