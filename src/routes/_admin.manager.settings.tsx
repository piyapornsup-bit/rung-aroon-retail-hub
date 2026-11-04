import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Banknote,
  Building2,
  CheckCircle2,
  Clock,
  Coins,
  CreditCard,
  Edit2,
  Plus,
  QrCode,
  Save,
  Settings as SettingsIcon,
  ShieldAlert,
  Trash2,
  Truck,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin/PageHeader";
import { SectionCard } from "@/components/admin/SectionCard";
import { Money } from "@/components/admin/Money";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatNumber } from "@/lib/format";
import { useStore } from "@/lib/store";
import type {
  OnlineStoreSettings,
  ShippingChannel,
  BankAccount,
} from "@/lib/mock-data";

export const Route = createFileRoute("/_admin/manager/settings")({
  head: () => ({
    meta: [
      { title: "ตั้งค่าร้านออนไลน์ — ร้านรุ่งอรุณ มินิมาร์ท" },
      { name: "description", content: "ตั้งค่าช่องทางจัดส่ง ช่องทางรับชำระเงิน อัตราแลกแต้ม และระยะเวลาชำระเงิน" },
      { property: "og:title", content: "ตั้งค่าร้านออนไลน์ — ร้านรุ่งอรุณ มินิมาร์ท" },
      { property: "og:description", content: "ตั้งค่าช่องทางจัดส่ง ช่องทางรับชำระเงิน อัตราแลกแต้ม และระยะเวลาชำระเงิน" },
    ],
  }),
  component: OnlineStoreSettingsPage,
});

export function OnlineStoreSettingsPage() {
  const { state, actions } = useStore();
  const [settings, setSettings] = useState<OnlineStoreSettings>(() =>
    JSON.parse(JSON.stringify(state.storeSettings)),
  );
  const [isDirty, setIsDirty] = useState(false);

  // Modals for Shipping
  const [shippingModalOpen, setShippingModalOpen] = useState(false);
  const [editingShipping, setEditingShipping] = useState<ShippingChannel | null>(null);
  const [shippingDraft, setShippingDraft] = useState<ShippingChannel>({
    id: "",
    name: "",
    fee: 40,
    freeThreshold: 500,
    estimatedDays: "1-2 วันทำการ",
    enabled: true,
  });

  // Modals for Bank
  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<BankAccount | null>(null);
  const [bankDraft, setBankDraft] = useState<BankAccount>({
    id: "",
    bankName: "ธนาคารกสิกรไทย",
    accountNumber: "",
    accountName: "บจก. รุ่งอรุณ มินิมาร์ท",
    branch: "สาขาตลาดสดพัฒนา",
    enabled: true,
  });

  const markDirty = () => setIsDirty(true);

  const handleSaveAll = () => {
    actions.updateStoreSettings(settings);
    setIsDirty(false);
    toast.success("บันทึกการตั้งค่าร้านออนไลน์เรียบร้อยแล้ว", {
      description: "ข้อมูลช่องทางจัดส่ง บัญชีชำระเงิน และเงื่อนไขต่างๆ มีผลใช้งานทันที",
    });
  };

  const handleReset = () => {
    setSettings(JSON.parse(JSON.stringify(state.storeSettings)));
    setIsDirty(false);
    toast.info("ยกเลิกการเปลี่ยนแปลงแล้ว");
  };

  // Shipping handlers
  const handleOpenAddShipping = () => {
    setEditingShipping(null);
    setShippingDraft({
      id: `SHIP-${Date.now().toString().slice(-4)}`,
      name: "",
      fee: 45,
      freeThreshold: 500,
      estimatedDays: "1-2 วันทำการ",
      enabled: true,
    });
    setShippingModalOpen(true);
  };

  const handleOpenEditShipping = (item: ShippingChannel) => {
    setEditingShipping(item);
    setShippingDraft({ ...item });
    setShippingModalOpen(true);
  };

  const handleSaveShipping = () => {
    if (!shippingDraft.name.trim()) {
      toast.error("กรุณาระบุชื่อผู้ให้บริการจัดส่ง");
      return;
    }
    setSettings((prev) => {
      const list = editingShipping
        ? prev.shippingChannels.map((c) => (c.id === editingShipping.id ? shippingDraft : c))
        : [...prev.shippingChannels, shippingDraft];
      return { ...prev, shippingChannels: list };
    });
    markDirty();
    setShippingModalOpen(false);
  };

  const handleDeleteShipping = (id: string) => {
    setSettings((prev) => ({
      ...prev,
      shippingChannels: prev.shippingChannels.filter((c) => c.id !== id),
    }));
    markDirty();
    toast.success("ลบช่องทางจัดส่งแล้ว");
  };

  // Bank handlers
  const handleOpenAddBank = () => {
    setEditingBank(null);
    setBankDraft({
      id: `BANK-${Date.now().toString().slice(-4)}`,
      bankName: "ธนาคารกสิกรไทย",
      accountNumber: "",
      accountName: "บจก. รุ่งอรุณ มินิมาร์ท",
      branch: "สาขาตลาดสดพัฒนา",
      enabled: true,
    });
    setBankModalOpen(true);
  };

  const handleOpenEditBank = (item: BankAccount) => {
    setEditingBank(item);
    setBankDraft({ ...item });
    setBankModalOpen(true);
  };

  const handleSaveBank = () => {
    if (!bankDraft.accountNumber.trim()) {
      toast.error("กรุณาระบุเลขที่บัญชีธนาคาร");
      return;
    }
    setSettings((prev) => {
      const list = editingBank
        ? prev.bankAccounts.map((b) => (b.id === editingBank.id ? bankDraft : b))
        : [...prev.bankAccounts, bankDraft];
      return { ...prev, bankAccounts: list };
    });
    markDirty();
    setBankModalOpen(false);
  };

  const handleDeleteBank = (id: string) => {
    setSettings((prev) => ({
      ...prev,
      bankAccounts: prev.bankAccounts.filter((b) => b.id !== id),
    }));
    markDirty();
    toast.success("ลบบัญชีธนาคารแล้ว");
  };

  return (
    <>
      <PageHeader
        title="ตั้งค่าร้านออนไลน์"
        description="บริหารจัดการช่องทางการจัดส่ง ช่องทางชำระเงิน อัตราแต้มสะสม และกำหนดเวลาชำระเงิน"
        actions={
          <div className="flex items-center gap-2">
            {isDirty && (
              <Button variant="outline" onClick={handleReset}>
                <RotateCcw className="size-4 mr-1.5" />
                ยกเลิกการเปลี่ยนแปลง
              </Button>
            )}
            <Button
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
              onClick={handleSaveAll}
            >
              <Save className="size-4 mr-1.5" />
              บันทึกการตั้งค่า
            </Button>
          </div>
        }
      />

      {isDirty && (
        <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 text-amber-800 dark:text-amber-300 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="size-4 text-amber-600" />
            <span>คุณมีการเปลี่ยนแปลงการตั้งค่าที่ยังไม่ได้บันทึก</span>
          </div>
          <Button size="sm" onClick={handleSaveAll} className="h-7 text-xs">
            บันทึกทันที
          </Button>
        </div>
      )}

      <Tabs defaultValue="shipping" className="space-y-4">
        <TabsList className="bg-muted/70 p-1">
          <TabsTrigger value="shipping" className="flex items-center gap-2">
            <Truck className="size-4" />
            <span>ช่องทางและค่าจัดส่ง</span>
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-2">
            <CreditCard className="size-4" />
            <span>ช่องทางรับชำระเงิน</span>
          </TabsTrigger>
          <TabsTrigger value="points" className="flex items-center gap-2">
            <Coins className="size-4" />
            <span>อัตราแลกแต้มส่วนลด</span>
          </TabsTrigger>
          <TabsTrigger value="timeout" className="flex items-center gap-2">
            <Clock className="size-4" />
            <span>ระยะเวลาชำระเงิน</span>
          </TabsTrigger>
        </TabsList>

        {/* ────────── Tab 1: Shipping Channels ────────── */}
        <TabsContent value="shipping">
          <SectionCard
            title="ช่องทางการจัดส่งสินค้า"
            description="กำหนดผู้ให้บริการ ค่าจัดส่งพื้นฐาน และยอดซื้อขั้นต่ำสำหรับจัดส่งฟรี"
            actions={
              <Button size="sm" onClick={handleOpenAddShipping}>
                <Plus className="size-3.5 mr-1" />
                เพิ่มช่องทางจัดส่ง
              </Button>
            }
          >
            <div className="divide-y divide-border">
              {settings.shippingChannels.map((c) => (
                <div key={c.id} className="py-3.5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-lg bg-sun-50 border border-sun-100 flex items-center justify-center text-sun-600">
                      <Truck className="size-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground text-sm">{c.name}</span>
                        <Badge
                          variant={c.enabled ? "default" : "secondary"}
                          className="text-[10px] h-4"
                        >
                          {c.enabled ? "เปิดใช้งาน" : "ปิด"}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        ระยะเวลาจัดส่ง: {c.estimatedDays} · ค่าส่งปกติ ฿{c.fee}
                        {c.freeThreshold ? ` (ส่งฟรีเมื่อซื้อครบ ฿${formatNumber(c.freeThreshold)})` : ""}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={c.enabled}
                        onCheckedChange={(val) => {
                          setSettings((prev) => ({
                            ...prev,
                            shippingChannels: prev.shippingChannels.map((item) =>
                              item.id === c.id ? { ...item, enabled: val } : item,
                            ),
                          }));
                          markDirty();
                        }}
                      />
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleOpenEditShipping(c)}
                    >
                      <Edit2 className="size-4 text-muted-foreground" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => handleDeleteShipping(c.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </TabsContent>

        {/* ────────── Tab 2: Payment Channels (Bank & QR) ────────── */}
        <TabsContent value="payments" className="space-y-6">
          {/* Bank Accounts Section */}
          <SectionCard
            title="บัญชีธนาคารสำหรับรับโอนเงิน"
            description="ข้อมูลบัญชีสำหรับแสดงให้ลูกค้าโอนเงินและแนบสลิปชำระเงิน"
            actions={
              <Button size="sm" onClick={handleOpenAddBank}>
                <Plus className="size-3.5 mr-1" />
                เพิ่มบัญชีธนาคาร
              </Button>
            }
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {settings.bankAccounts.map((b) => (
                <div
                  key={b.id}
                  className="rounded-lg border border-border p-4 bg-card shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Building2 className="size-4 text-primary" />
                        <span className="font-semibold text-sm text-foreground">{b.bankName}</span>
                      </div>
                      <Switch
                        checked={b.enabled}
                        onCheckedChange={(val) => {
                          setSettings((prev) => ({
                            ...prev,
                            bankAccounts: prev.bankAccounts.map((item) =>
                              item.id === b.id ? { ...item, enabled: val } : item,
                            ),
                          }));
                          markDirty();
                        }}
                      />
                    </div>
                    <div className="space-y-1 text-xs">
                      <div>
                        <span className="text-muted-foreground">เลขที่บัญชี: </span>
                        <span className="font-mono font-bold text-foreground text-sm tracking-wide">
                          {b.accountNumber}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">ชื่อบัญชี: </span>
                        <span className="text-foreground">{b.accountName}</span>
                      </div>
                      {b.branch && (
                        <div>
                          <span className="text-muted-foreground">สาขา: </span>
                          <span className="text-foreground">{b.branch}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border flex items-center justify-end gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-xs"
                      onClick={() => handleOpenEditBank(b)}
                    >
                      <Edit2 className="size-3 mr-1" /> แก้ไข
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-xs text-destructive hover:bg-destructive/10"
                      onClick={() => handleDeleteBank(b.id)}
                    >
                      <Trash2 className="size-3 mr-1" /> ลบ
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* PromptPay QR Code Section */}
          <SectionCard
            title="พร้อมเพย์ คิวอาร์โค้ด (PromptPay QR)"
            description="เปิดใช้งานการสร้าง QR Code สำหรับรับชำระเงินอัตโนมัติ"
          >
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              <div className="md:col-span-7 space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
                  <div>
                    <span className="text-sm font-medium text-foreground block">
                      เปิดรับชำระเงินด้วย PromptPay
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ลูกค้าสามารถสแกน QR Code จากแอปธนาคารใดก็ได้
                    </span>
                  </div>
                  <Switch
                    checked={settings.promptPay.enabled}
                    onCheckedChange={(val) => {
                      setSettings((prev) => ({
                        ...prev,
                        promptPay: { ...prev.promptPay, enabled: val },
                      }));
                      markDirty();
                    }}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="ppId">หมายเลขพร้อมเพย์ (เบอร์โทรศัพท์ หรือ เลขผู้เสียภาษี 13 หลัก)</Label>
                  <Input
                    id="ppId"
                    value={settings.promptPay.id}
                    onChange={(e) => {
                      setSettings((prev) => ({
                        ...prev,
                        promptPay: { ...prev.promptPay, id: e.target.value },
                      }));
                      markDirty();
                    }}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="ppName">ชื่อบัญชีพร้อมเพย์ (ระบุเพื่อความถูกต้อง)</Label>
                  <Input
                    id="ppName"
                    value={settings.promptPay.accountName}
                    onChange={(e) => {
                      setSettings((prev) => ({
                        ...prev,
                        promptPay: { ...prev.promptPay, accountName: e.target.value },
                      }));
                      markDirty();
                    }}
                  />
                </div>
              </div>

              {/* PromptPay Card Preview */}
              <div className="md:col-span-5 flex flex-col items-center justify-center p-4 bg-muted/20 border-2 border-dashed border-border rounded-xl">
                <div className="w-56 bg-card rounded-xl border border-border shadow-md p-4 text-center">
                  <div className="bg-[#003b66] text-white py-1.5 px-3 rounded-md mb-3 flex items-center justify-center gap-1.5 text-xs font-bold tracking-wide">
                    <QrCode className="size-4" />
                    <span>Thai QR Payment</span>
                  </div>
                  {/* QR Image Box */}
                  <div className="w-36 h-36 mx-auto bg-white p-2 rounded-lg border border-border flex items-center justify-center">
                    <img
                      src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=RungAroonPromptPayDemo"
                      alt="PromptPay QR"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="mt-3">
                    <span className="text-xs font-bold text-foreground block">
                      {settings.promptPay.accountName || "ร้านรุ่งอรุณ มินิมาร์ท"}
                    </span>
                    <span className="text-[11px] font-mono text-muted-foreground">
                      {settings.promptPay.id}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>
        </TabsContent>

        {/* ────────── Tab 3: Point Exchange Rate ────────── */}
        <TabsContent value="points">
          <SectionCard
            title="ระบบสะสมแต้มและแลกเป็นส่วนลด"
            description="กำหนดอัตราการได้รับแต้มจากยอดสั่งซื้อ และอัตราการแลกแต้มเป็นเงินส่วนลด"
          >
            <div className="space-y-5 max-w-2xl">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
                <div>
                  <span className="text-sm font-medium text-foreground block">
                    เปิดใช้งานระบบแต้มสมาชิก (Rung-Aroon Points)
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ให้สมาชิกสะสมแต้มทุกครั้งที่ซื้อสินค้า และนำมาแลกส่วนลดในออเดอร์ถัดไป
                  </span>
                </div>
                <Switch
                  checked={settings.pointRate.enabled}
                  onCheckedChange={(val) => {
                    setSettings((prev) => ({
                      ...prev,
                      pointRate: { ...prev.pointRate, enabled: val },
                    }));
                    markDirty();
                  }}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="earnStepBaht">ทุกยอดซื้อ (บาท)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="earnStepBaht"
                      type="number"
                      min={1}
                      value={settings.pointRate.earnStepBaht ?? 50}
                      onChange={(e) => {
                        const earnStepBaht = Number(e.target.value) || 1;
                        setSettings((prev) => ({
                          ...prev,
                          pointRate: { ...prev.pointRate, earnStepBaht },
                        }));
                        markDirty();
                      }}
                    />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">บาท</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground">เช่น ซื้อครบทุกๆ 50 บาท</span>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="earnPointsPerStep">ได้รับแต้ม</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="earnPointsPerStep"
                      type="number"
                      min={1}
                      value={settings.pointRate.earnPointsPerStep ?? 5}
                      onChange={(e) => {
                        const earnPointsPerStep = Number(e.target.value) || 1;
                        setSettings((prev) => ({
                          ...prev,
                          pointRate: { ...prev.pointRate, earnPointsPerStep },
                        }));
                        markDirty();
                      }}
                    />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">แต้ม</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground">เช่น ได้รับ 5 แต้ม</span>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="pointsPerBaht">อัตราแลกแต้มเป็นส่วนลด (แต้มต่อ 1 บาท)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="pointsPerBaht"
                      type="number"
                      min={1}
                      value={settings.pointRate.pointsPerBaht ?? 10}
                      onChange={(e) => {
                        setSettings((prev) => ({
                          ...prev,
                          pointRate: { ...prev.pointRate, pointsPerBaht: Number(e.target.value) || 1 },
                        }));
                        markDirty();
                      }}
                    />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">แต้ม = 1 บาท</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground">เช่น 10 แต้ม แลกส่วนลดได้ 1 บาท</span>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="minRedeem">แต้มขั้นต่ำในการแลกส่วนลด</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="minRedeem"
                      type="number"
                      min={0}
                      value={settings.pointRate.minPointsToRedeem ?? 50}
                      onChange={(e) => {
                        setSettings((prev) => ({
                          ...prev,
                          pointRate: { ...prev.pointRate, minPointsToRedeem: Number(e.target.value) },
                        }));
                        markDirty();
                      }}
                    />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">แต้ม</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground">เช่น ต้องมีอย่างน้อย 50 แต้มจึงแลกได้</span>
                </div>
              </div>

              {/* Live Points Simulator Note */}
              <div className="p-4 rounded-lg bg-sun-50/60 dark:bg-sun-950/20 border border-sun-200 text-xs text-sun-900 dark:text-sun-200">
                <div className="font-semibold mb-1 flex items-center gap-1.5">
                  <Coins className="size-4 text-sun-600" />
                  <span>ตัวอย่างการคำนวณตามการตั้งค่าปัจจุบัน</span>
                </div>
                <p>
                  ลูกค้าสั่งซื้อสินค้า <strong>฿1,000</strong> จะได้รับ{" "}
                  <strong>
                    {Math.floor(1000 / (settings.pointRate.earnStepBaht || 50)) * (settings.pointRate.earnPointsPerStep || 5)} แต้ม
                  </strong>{" "}
                  (ซื้อครบทุกๆ {settings.pointRate.earnStepBaht || 50} บาท ได้ {settings.pointRate.earnPointsPerStep || 5} แต้ม)
                  และสามารถนำแต้มไปแลกเป็นส่วนลดได้{" "}
                  <strong>
                    ฿{Math.floor(
                      (Math.floor(1000 / (settings.pointRate.earnStepBaht || 50)) * (settings.pointRate.earnPointsPerStep || 5)) /
                        (settings.pointRate.pointsPerBaht || 10)
                    )}
                  </strong>
                </p>
              </div>
            </div>
          </SectionCard>
        </TabsContent>

        {/* ────────── Tab 4: Payment Timeout ────────── */}
        <TabsContent value="timeout">
          <SectionCard
            title="กำหนดระยะเวลาในการชำระเงิน"
            description="เงื่อนไขการรอชำระเงินและการยกเลิกออเดอร์อัตโนมัติเพื่อคืนสต็อกสินค้า"
          >
            <div className="space-y-5 max-w-2xl">
              <div className="space-y-1.5">
                <Label htmlFor="timeoutHours">ระยะเวลาที่ให้ลูกค้าชำระเงิน (ชั่วโมง)</Label>
                <div className="flex items-center gap-2 max-w-xs">
                  <Input
                    id="timeoutHours"
                    type="number"
                    min={1}
                    max={72}
                    value={settings.paymentTimeout.timeoutHours}
                    onChange={(e) => {
                      setSettings((prev) => ({
                        ...prev,
                        paymentTimeout: { ...prev.paymentTimeout, timeoutHours: Number(e.target.value) },
                      }));
                      markDirty();
                    }}
                  />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">ชั่วโมง</span>
                </div>
                <span className="text-[11px] text-muted-foreground">
                  นับตั้งแต่เวลาที่ลูกค้ากดยืนยันสั่งซื้อสินค้า
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
                <div>
                  <span className="text-sm font-medium text-foreground block">
                    ยกเลิกคำสั่งซื้ออัตโนมัติเมื่อหมดเวลา
                  </span>
                  <span className="text-xs text-muted-foreground">
                    หากลูกค้าไม่โอนเงินภายในเวลาที่กำหนด ระบบจะยกเลิกออเดอร์และคืนสต็อกทันที
                  </span>
                </div>
                <Switch
                  checked={settings.paymentTimeout.autoCancelUnpaid}
                  onCheckedChange={(val) => {
                    setSettings((prev) => ({
                      ...prev,
                      paymentTimeout: { ...prev.paymentTimeout, autoCancelUnpaid: val },
                    }));
                    markDirty();
                  }}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="remindBefore">ส่งการแจ้งเตือนเตือนชำระเงินก่อนหมดเวลา (ชั่วโมง)</Label>
                <div className="flex items-center gap-2 max-w-xs">
                  <Input
                    id="remindBefore"
                    type="number"
                    min={1}
                    max={12}
                    value={settings.paymentTimeout.remindBeforeHours}
                    onChange={(e) => {
                      setSettings((prev) => ({
                        ...prev,
                        paymentTimeout: { ...prev.paymentTimeout, remindBeforeHours: Number(e.target.value) },
                      }));
                      markDirty();
                    }}
                  />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">ชั่วโมงก่อนหมดเวลา</span>
                </div>
              </div>
            </div>
          </SectionCard>
        </TabsContent>
      </Tabs>

      {/* Shipping Channel Dialog */}
      <Dialog open={shippingModalOpen} onOpenChange={setShippingModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingShipping ? "แก้ไขช่องทางจัดส่ง" : "เพิ่มช่องทางจัดส่งใหม่"}
            </DialogTitle>
            <DialogDescription>
              กำหนดชื่อผู้ให้บริการจัดส่งและเงื่อนไขค่าธรรมเนียม
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>ชื่อช่องทางจัดส่ง <span className="text-destructive">*</span></Label>
              <Input
                placeholder="เช่น Flash Express, Kerry Express"
                value={shippingDraft.name}
                onChange={(e) => setShippingDraft((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>ค่าจัดส่ง (บาท)</Label>
                <Input
                  type="number"
                  min={0}
                  value={shippingDraft.fee}
                  onChange={(e) => setShippingDraft((p) => ({ ...p, fee: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>ส่งฟรีเมื่อซื้อครบ (บาท)</Label>
                <Input
                  type="number"
                  min={0}
                  value={shippingDraft.freeThreshold || 0}
                  onChange={(e) =>
                    setShippingDraft((p) => ({ ...p, freeThreshold: Number(e.target.value) }))
                  }
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>ระยะเวลาประมาณการ</Label>
              <Input
                placeholder="เช่น 1-2 วันทำการ"
                value={shippingDraft.estimatedDays}
                onChange={(e) => setShippingDraft((p) => ({ ...p, estimatedDays: e.target.value }))}
              />
            </div>
            <div className="flex items-center justify-between pt-2">
              <Label>เปิดใช้งานช่องทางนี้</Label>
              <Switch
                checked={shippingDraft.enabled}
                onCheckedChange={(val) => setShippingDraft((p) => ({ ...p, enabled: val }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShippingModalOpen(false)}>
              ยกเลิก
            </Button>
            <Button onClick={handleSaveShipping}>
              บันทึกช่องทางจัดส่ง
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bank Account Dialog */}
      <Dialog open={bankModalOpen} onOpenChange={setBankModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingBank ? "แก้ไขบัญชีธนาคาร" : "เพิ่มบัญชีธนาคาร"}
            </DialogTitle>
            <DialogDescription>
              ข้อมูลบัญชีธนาคารสำหรับลูกค้าโอนเงินชำระค่าสินค้า
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>ชื่อธนาคาร</Label>
              <Input
                placeholder="เช่น ธนาคารกสิกรไทย, ธนาคารกรุงไทย"
                value={bankDraft.bankName}
                onChange={(e) => setBankDraft((p) => ({ ...p, bankName: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>เลขที่บัญชี <span className="text-destructive">*</span></Label>
              <Input
                placeholder="000-0-00000-0"
                value={bankDraft.accountNumber}
                onChange={(e) => setBankDraft((p) => ({ ...p, accountNumber: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>ชื่อบัญชี</Label>
              <Input
                placeholder="บจก. รุ่งอรุณ มินิมาร์ท"
                value={bankDraft.accountName}
                onChange={(e) => setBankDraft((p) => ({ ...p, accountName: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>สาขา</Label>
              <Input
                placeholder="สาขา..."
                value={bankDraft.branch || ""}
                onChange={(e) => setBankDraft((p) => ({ ...p, branch: e.target.value }))}
              />
            </div>
            <div className="flex items-center justify-between pt-2">
              <Label>เปิดรับโอนเงินผ่านบัญชีนี้</Label>
              <Switch
                checked={bankDraft.enabled}
                onCheckedChange={(val) => setBankDraft((p) => ({ ...p, enabled: val }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBankModalOpen(false)}>
              ยกเลิก
            </Button>
            <Button onClick={handleSaveBank}>
              บันทึกข้อมูลบัญชี
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

