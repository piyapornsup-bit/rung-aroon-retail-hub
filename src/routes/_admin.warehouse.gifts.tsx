import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Gift,
  MapPin,
  PackageCheck,
  Phone,
  Search,
  Send,
  Truck,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { StatCard } from "@/components/admin/StatCard";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ClientTime } from "@/components/admin/ClientTime";
import { FormDialog, Field } from "@/components/admin/FormDialog";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { EmptyState } from "@/components/admin/EmptyState";
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
  selectGiftsToShip,
  selectShippedGifts,
} from "@/lib/store";
import { CARRIERS, type GiftTask, type Carrier } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_admin/warehouse/gifts")({
  head: () => ({
    meta: [
      { title: "จัดส่งของขวัญ — ร้านรุ่งอรุณ มินิมาร์ท" },
      {
        name: "description",
        content: "รายการของขวัญสมาชิกที่ฝ่ายขายจัดเตรียมแล้ว พร้อมที่อยู่จัดส่งและบันทึกการจัดส่ง",
      },
      { property: "og:title", content: "จัดส่งของขวัญ — ร้านรุ่งอรุณ มินิมาร์ท" },
      {
        property: "og:description",
        content: "รายการของขวัญสมาชิกที่ฝ่ายขายจัดเตรียมแล้ว พร้อมที่อยู่จัดส่งและบันทึกการจัดส่ง",
      },
    ],
  }),
  component: WarehouseGiftsPage,
});

type GiftTab = "toShip" | "shipped" | "all";

function WarehouseGiftsPage() {
  const { state, actions } = useStore();
  const [tab, setTab] = useState<GiftTab>("toShip");

  // Shipping Modal State
  const [shippingTarget, setShippingTarget] = useState<GiftTask | null>(null);
  const [carrier, setCarrier] = useState<Carrier>(CARRIERS[0]);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [deliveryNote, setDeliveryNote] = useState("");

  const giftsToShip = useMemo(() => selectGiftsToShip(state), [state]);
  const shippedGifts = useMemo(() => selectShippedGifts(state), [state]);
  const allGifts = useMemo(() => state.gifts, [state.gifts]);

  const birthdayToShipCount = useMemo(
    () => giftsToShip.filter((g) => g.type === "วันเกิด").length,
    [giftsToShip],
  );
  const newYearToShipCount = useMemo(
    () => giftsToShip.filter((g) => g.type === "ปีใหม่").length,
    [giftsToShip],
  );

  // Rows by tab
  const rows = useMemo(() => {
    if (tab === "toShip") return giftsToShip;
    if (tab === "shipped") return shippedGifts;
    return allGifts;
  }, [tab, giftsToShip, shippedGifts, allGifts]);

  const handleOpenShipDialog = (gift: GiftTask) => {
    setShippingTarget(gift);
    setCarrier(CARRIERS[0]);
    setTrackingNumber(`GF${Date.now().toString().slice(-7)}`);
    setDeliveryNote("ของขวัญสมบูรณ์ แพ็กใส่กล่องเรียบร้อย");
  };

  const handleConfirmShip = () => {
    if (!shippingTarget) return;

    actions.shipGift(shippingTarget.id, {
      carrier,
      trackingNumber: trackingNumber.trim(),
      note: deliveryNote.trim(),
    });

    const member = state.members.find((m) => m.code === shippingTarget.memberCode);
    toast.success("บันทึกการจัดส่งของขวัญสำเร็จ", {
      description: `จัดส่งให้คุณ ${member?.name ?? shippingTarget.memberCode} (${carrier})`,
    });
    setShippingTarget(null);
  };

  const columns: DataTableColumn<GiftTask>[] = [
    {
      key: "id",
      header: "รหัส / เทศกาล",
      cell: (g) => (
        <div className="space-y-1">
          <Badge variant="outline" className="font-mono text-xs font-semibold">
            {g.id}
          </Badge>
          <div>
            <Badge
              variant="secondary"
              className={cn(
                "text-[10px] font-semibold",
                g.type === "วันเกิด" ? "bg-amber-100 text-amber-900" : "bg-teal-100 text-teal-900",
              )}
            >
              {g.type}
            </Badge>
          </div>
        </div>
      ),
      sortValue: (g) => g.id,
      className: "w-32",
    },
    {
      key: "member",
      header: "สมาชิกผู้รับ",
      cell: (g) => {
        const member = state.members.find((m) => m.code === g.memberCode);
        return (
          <div className="space-y-0.5">
            <span className="font-semibold text-foreground text-xs flex items-center gap-1">
              <User className="size-3 text-muted-foreground" />
              {member?.name ?? g.memberCode}
            </span>
            <div className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
              <Phone className="size-3" />
              {member?.phone ?? "-"}
            </div>
            <span className="text-[10px] text-muted-foreground block font-mono">
              รหัสสมาชิก: {g.memberCode}
            </span>
          </div>
        );
      },
      sortValue: (g) => {
        const member = state.members.find((m) => m.code === g.memberCode);
        return member?.name ?? g.memberCode;
      },
      className: "w-44",
    },
    {
      key: "address",
      header: "ที่อยู่จัดส่งของขวัญ (Delivery Address)",
      cell: (g) => {
        const member = state.members.find((m) => m.code === g.memberCode);
        return (
          <div className="max-w-xs space-y-1 text-xs">
            <p className="flex items-start gap-1.5 text-foreground leading-relaxed">
              <MapPin className="size-3.5 text-sun-600 shrink-0 mt-0.5" />
              <span className="line-clamp-2">{member?.address ?? "ไม่พบที่อยู่"}</span>
            </p>
          </div>
        );
      },
    },
    {
      key: "gift",
      header: "รายการของขวัญ",
      cell: (g) => (
        <div className="space-y-1 text-xs">
          <span className="font-semibold text-foreground flex items-center gap-1">
            <Gift className="size-3.5 text-sun-600" />
            {g.giftName}
          </span>
          {g.preparedBy && (
            <p className="text-[11px] text-muted-foreground">
              จัดเตรียมโดย: <strong>{g.preparedBy}</strong> ({g.preparedAt ? <ClientTime iso={g.preparedAt} mode="ago" /> : "-"})
            </p>
          )}
          {g.carrier && (
            <p className="text-[11px] text-cyan-900 font-mono">
              {g.carrier} · {g.trackingNumber}
            </p>
          )}
        </div>
      ),
      sortValue: (g) => g.giftName,
    },
    {
      key: "dueDate",
      header: "กำหนดส่ง",
      cell: (g) => (
        <div className="space-y-0.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-1 font-mono">
            <Calendar className="size-3" />
            <ClientTime iso={g.dueDate} mode="date" />
          </div>
          <span className="text-[10px] block opacity-80">
            <ClientTime iso={g.dueDate} mode="ago" />
          </span>
        </div>
      ),
      sortValue: (g) => g.dueDate,
      className: "w-32",
    },
    {
      key: "status",
      header: "สถานะ",
      align: "center",
      cell: (g) => {
        if (g.status === "จัดส่งแล้ว") {
          return (
            <div className="space-y-0.5">
              <StatusBadge status="จัดส่งแล้ว" tone="green" />
              {g.shippedAt && (
                <span className="text-[10px] text-muted-foreground block">
                  <ClientTime iso={g.shippedAt} mode="ago" />
                </span>
              )}
            </div>
          );
        }
        return <StatusBadge status={g.status} tone={g.status === "จัดเตรียมแล้ว" ? "blue" : "amber"} />;
      },
      sortValue: (g) => g.status,
      className: "w-32",
    },
    {
      key: "actions",
      header: "การจัดส่ง",
      align: "center",
      cell: (g) => {
        if (g.status === "จัดส่งแล้ว") {
          return (
            <span className="text-xs text-emerald-700 flex items-center justify-center gap-1 font-medium">
              <CheckCircle2 className="size-3.5" />
              จัดส่งแล้ว
            </span>
          );
        }

        if (g.status === "จัดเตรียมแล้ว") {
          return (
            <Button
              size="sm"
              onClick={() => handleOpenShipDialog(g)}
              className="h-8 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
            >
              <Truck className="size-3.5" />
              <span>จัดส่งแล้ว</span>
            </Button>
          );
        }

        return (
          <span className="text-xs text-muted-foreground italic">
            รอฝ่ายขายจัดเตรียม
          </span>
        );
      },
      className: "w-36",
    },
  ];

  return (
    <>
      <PageHeader
        title="จัดส่งของขวัญสมาชิก"
        description="ตรวจสอบรายการของขวัญเทศกาลและวันเกิดที่ฝ่ายขายจัดเตรียมแล้ว จัดส่งตามที่อยู่สมาชิก และบันทึกผลการจัดส่ง"
      />

      {/* Top Stat Summary Cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <StatCard
          icon={Gift}
          label="รอจัดส่ง (จัดเตรียมแล้ว)"
          value={`${giftsToShip.length} รายการ`}
          tone={giftsToShip.length > 0 ? "sun" : "info"}
          hint="พร้อมส่งตามที่อยู่สมาชิก"
        />
        <StatCard
          icon={CheckCircle2}
          label="จัดส่งเรียบร้อยแล้ว"
          value={`${shippedGifts.length} รายการ`}
          tone="success"
          hint="ส่งมอบให้ขนส่งแล้ว"
        />
        <StatCard
          icon={Calendar}
          label="ของขวัญวันเกิดรอส่ง"
          value={`${birthdayToShipCount} รายการ`}
          tone="teal"
          hint="ตามรอบวันเกิดสมาชิก"
        />
        <StatCard
          icon={PackageCheck}
          label="ของขวัญปีใหม่รอส่ง"
          value={`${newYearToShipCount} รายการ`}
          tone="info"
          hint="ชุดของขวัญเทศกาลปีใหม่"
        />
      </div>

      {/* Tab Navigation */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as GiftTab)} className="mb-4">
        <TabsList className="h-10 rounded-md bg-card p-1 shadow-soft">
          <TabsTrigger
            value="toShip"
            className="h-8 gap-1.5 px-3 text-xs data-[state=active]:bg-blue-100 data-[state=active]:text-blue-900"
          >
            <Truck className="size-3.5 text-blue-700" />
            รอจัดส่ง (พร้อมส่ง)
            <span className="rounded-full bg-blue-200 px-1.5 py-0.2 text-[10px] font-semibold text-blue-950">
              {giftsToShip.length}
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="shipped"
            className="h-8 gap-1.5 px-3 text-xs data-[state=active]:bg-sun-50 data-[state=active]:text-sun-800"
          >
            <CheckCircle2 className="size-3.5 text-emerald-600" />
            จัดส่งแล้ว (ประวัติการส่ง)
            <span className="rounded-full bg-muted px-1.5 py-0.2 text-[10px]">
              {shippedGifts.length}
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="all"
            className="h-8 gap-1.5 px-3 text-xs data-[state=active]:bg-sun-50 data-[state=active]:text-sun-800"
          >
            ของขวัญทั้งหมด
            <span className="rounded-full bg-muted px-1.5 py-0.2 text-[10px]">
              {allGifts.length}
            </span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Gifts DataTable */}
      <DataTable
        data={rows}
        columns={columns}
        getRowId={(g) => g.id}
        searchPlaceholder="ค้นหารหัสของขวัญ, ชื่อสมาชิก, รหัสสมาชิก หรือของขวัญ..."
        searchFn={(g, q) => {
          const member = state.members.find((m) => m.code === g.memberCode);
          return (
            g.id.toLowerCase().includes(q) ||
            g.giftName.toLowerCase().includes(q) ||
            g.memberCode.toLowerCase().includes(q) ||
            (member?.name.toLowerCase().includes(q) ?? false) ||
            (member?.phone.includes(q) ?? false) ||
            (member?.address.toLowerCase().includes(q) ?? false)
          );
        }}
        emptyTitle="ไม่พบรายการของขวัญ"
        emptyDescription="เมื่อฝ่ายขายกดยืนยันจัดเตรียมของขวัญเรียบร้อย รายการจะแสดงที่นี่เพื่อให้คลังสินค้าดำเนินการจัดส่ง"
      />

      {/* Ship Gift Dialog */}
      {shippingTarget && (
        <FormDialog
          open={!!shippingTarget}
          onOpenChange={(open) => !open && setShippingTarget(null)}
          title="ยืนยันการจัดส่งของขวัญสมาชิก"
          description={`รหัสของขวัญ: ${shippingTarget.id} — ${shippingTarget.giftName}`}
          submitLabel="บันทึกการจัดส่ง (จัดส่งแล้ว)"
          onSubmit={() => {
            handleConfirmShip();
            return true;
          }}
        >
          {(() => {
            const member = state.members.find((m) => m.code === shippingTarget.memberCode);
            return (
              <div className="space-y-3 text-xs">
                {/* Member & Address Card */}
                <div className="rounded-lg border bg-muted/40 p-3 space-y-1.5">
                  <div className="flex items-center justify-between font-semibold text-foreground text-sm">
                    <span className="flex items-center gap-1.5">
                      <User className="size-4 text-muted-foreground" />
                      {member?.name ?? shippingTarget.memberCode}
                    </span>
                    <span className="font-mono text-xs">{member?.phone}</span>
                  </div>
                  <div className="flex items-start gap-1.5 text-muted-foreground pt-1 border-t">
                    <MapPin className="size-3.5 text-sun-600 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">ที่อยู่จัดส่ง: {member?.address ?? "ไม่พบที่อยู่"}</p>
                  </div>
                </div>

                {/* Carrier Dropdown */}
                <Field label="ผู้ให้บริการจัดส่ง (Carrier)" htmlFor="gift-carrier" required>
                  <Select value={carrier} onValueChange={(val) => setCarrier(val as Carrier)}>
                    <SelectTrigger id="gift-carrier">
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
                  label="เลขพัสดุ / หมายเลขอ้างอิง"
                  htmlFor="gift-tracking"
                  hint="รหัสพัสดุสำหรับติดตามสถานะ"
                >
                  <Input
                    id="gift-tracking"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="เช่น TH012345678"
                    className="font-mono"
                  />
                </Field>

                {/* Delivery Note */}
                <Field label="หมายเหตุการจัดส่ง" htmlFor="gift-note">
                  <Input
                    id="gift-note"
                    value={deliveryNote}
                    onChange={(e) => setDeliveryNote(e.target.value)}
                    placeholder="เช่น แพ็กกันกระแทกอย่างดี, ส่งรอบเช้า"
                  />
                </Field>
              </div>
            );
          })()}
        </FormDialog>
      )}
    </>
  );
}

