import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useRef, useEffect } from "react";
import {
  AlertCircle,
  Barcode,
  Building2,
  Camera,
  CheckCircle2,
  Coins,
  History,
  Layers,
  Minus,
  Package,
  Plus,
  Printer,
  QrCode,
  Receipt as ReceiptIcon,
  RotateCcw,
  Search,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Tag,
  Trash2,
  User,
  UserCheck,
  UserPlus,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin/PageHeader";
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
import {
  calcBill,
  calcChange,
  maxRedeemablePoints,
  pointsEarnedFor,
  pointsToBaht,
  vatIncluded,
  isValidTaxId,
  type BillLine,
  type PointRules,
} from "@/lib/pos";
import { formatBaht, formatNumber, formatDateTime, formatPhone } from "@/lib/format";
import { type Product, type Member, type Receipt, type ReceiptType } from "@/lib/mock-data";
import { useStore, useCurrentUser } from "@/lib/store";

export const Route = createFileRoute("/_admin/sales/pos")({
  head: () => ({
    meta: [
      { title: "ขายหน้าร้าน (POS) — ร้านรุ่งอรุณ มินิมาร์ท" },
      { name: "description", content: "ระบบคิดเงินหน้าร้าน จัดการบิล สแกนบาร์โค้ด และสะสมแต้มสมาชิกร้านรุ่งอรุณ" },
      { property: "og:title", content: "ขายหน้าร้าน (POS) — ร้านรุ่งอรุณ มินิมาร์ท" },
      { property: "og:description", content: "ระบบคิดเงินหน้าร้าน จัดการบิล สแกนบาร์โค้ด และสะสมแต้มสมาชิกร้านรุ่งอรุณ" },
    ],
  }),
  component: PosPage,
});

interface CartItem {
  product: Product;
  qty: number;
}

function PosPage() {
  const { state, actions } = useStore();
  const user = useCurrentUser();

  // Search & Category Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);

  // Member & Loyalty
  const [memberSearch, setMemberSearch] = useState("");
  const [activeMember, setActiveMember] = useState<Member | null>(null);
  const [pointsToRedeem, setPointsToRedeem] = useState<number>(0);

  // Member Registration Dialog
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);
  const [regName, setRegName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regBirthday, setRegBirthday] = useState("");
  const [regAddress, setRegAddress] = useState("");
  const [regError, setRegError] = useState("");

  // Member QR Scan Dialog & Simulation
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [qrInput, setQrInput] = useState("");
  const [qrError, setQrError] = useState("");

  // Payment: Counter accepts CASH ONLY
  const paymentMethod = "เงินสด" as const;
  const [cashTendered, setCashTendered] = useState<string>("");

  // Full Tax Invoice fields
  const [receiptType, setReceiptType] = useState<ReceiptType>("short");
  const [buyerName, setBuyerName] = useState("");
  const [buyerAddress, setBuyerAddress] = useState("");
  const [buyerTaxId, setBuyerTaxId] = useState("");

  // Completed Receipt Dialog
  const [completedReceipt, setCompletedReceipt] = useState<Receipt | null>(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);

  // Today's Sales Receipts Drawer/Modal
  const [historyOpen, setHistoryOpen] = useState(false);

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Filter Catalog Products
  const filteredProducts = useMemo(() => {
    let list = state.catalog.products;
    if (selectedCategory !== "all") {
      list = list.filter((p) => p.category === selectedCategory);
    }
    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.includes(q)),
    );
  }, [state.catalog.products, selectedCategory, searchQuery]);

  // Dynamic loyalty point rules from store settings (managed by store manager)
  const pointRateSettings = state.storeSettings.pointRate;
  const earnStepBaht = pointRateSettings.earnStepBaht ?? 50;
  const earnPointsPerStep = pointRateSettings.earnPointsPerStep ?? 5;
  const pointsPerBaht =
    pointRateSettings.pointsPerBaht ??
    pointRateSettings.pointsPerBahtDiscount ??
    10;
  const minPointsToRedeem = pointRateSettings.minPointsToRedeem ?? 0;

  const pointRules: PointRules = useMemo(
    () => ({
      earnStepBaht,
      earnPointsPerStep,
      pointsPerBaht,
      minPointsToRedeem,
    }),
    [earnStepBaht, earnPointsPerStep, pointsPerBaht, minPointsToRedeem],
  );

  // Bill calculations via pure POS rules
  const billLines: BillLine[] = useMemo(
    () => cart.map((c) => ({ productId: c.product.id, price: c.product.price, qty: c.qty })),
    [cart],
  );

  const maxPoints = useMemo(() => {
    if (!activeMember) return 0;
    const subtotal = cart.reduce((s, c) => s + c.product.price * c.qty, 0);
    return maxRedeemablePoints(activeMember.points, subtotal, pointRules);
  }, [activeMember, cart, pointRules]);

  const bill = useMemo(() => {
    return calcBill(billLines, pointsToRedeem, pointRules);
  }, [billLines, pointsToRedeem, pointRules]);

  // Keep pointsToRedeem within maxPoints if cart or settings change
  useEffect(() => {
    if (pointsToRedeem > maxPoints) {
      setPointsToRedeem(maxPoints);
    }
  }, [maxPoints, pointsToRedeem]);

  const vat = useMemo(() => vatIncluded(bill.net), [bill.net]);

  const numericCash = Number(cashTendered) || 0;
  const change = useMemo(() => {
    return calcChange(numericCash, bill.net);
  }, [numericCash, bill.net]);

  // Cart operations
  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
      toast.error(`สินค้า “${product.name}” หมดสต็อก`, { description: "ไม่สามารถเพิ่มลงในตะกร้าได้" });
      return;
    }

    setCart((prev) => {
      const idx = prev.findIndex((item) => item.product.id === product.id);
      if (idx >= 0) {
        const cur = prev[idx];
        if (cur.qty >= product.stock) {
          toast.warning(`สต็อกสินค้ามีจำกัด`, {
            description: `มีสินค้าในคลังเพียง ${product.stock} ${product.unit}`,
          });
          return prev;
        }
        const updated = [...prev];
        updated[idx] = { ...cur, qty: cur.qty + 1 };
        return updated;
      }
      return [...prev, { product, qty: 1 }];
    });
  };

  const updateCartQty = (productId: string, newQty: number) => {
    const targetProduct = state.catalog.products.find((p) => p.id === productId);
    if (!targetProduct) return;

    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }

    if (newQty > targetProduct.stock) {
      toast.warning(`เกินจำนวนสต็อกที่มีอยู่`, {
        description: `มีสต็อกคงเหลือ ${targetProduct.stock} ${targetProduct.unit}`,
      });
      newQty = targetProduct.stock;
    }

    setCart((prev) =>
      prev.map((item) => (item.product.id === productId ? { ...item, qty: newQty } : item)),
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setPointsToRedeem(0);
    setCashTendered("");
    setReceiptType("short");
    setBuyerName("");
    setBuyerAddress("");
    setBuyerTaxId("");
  };

  // Member search handler
  const handleMemberSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = memberSearch.trim();
    if (!query) return;

    const found = state.members.find(
      (m) =>
        m.phone.replace(/[\s-]/g, "") === query.replace(/[\s-]/g, "") ||
        m.code.toLowerCase() === query.toLowerCase(),
    );

    if (found) {
      setActiveMember(found);
      setMemberSearch("");
      setPointsToRedeem(0);
      toast.success(`พบข้อมูลสมาชิก: ${found.name}`, {
        description: `ระดับ ${found.tier || "ทั่วไป"} · มีแต้มสะสม ${formatNumber(found.points)} แต้ม`,
      });
    } else {
      toast.error("ไม่พบข้อมูลสมาชิก", {
        description: "ลองค้นหาด้วยเบอร์โทรศัพท์ 10 หลัก หรือรหัสสมาชิก",
        action: {
          label: "สมัครสมาชิกใหม่",
          onClick: () => {
            setRegError("");
            setRegName("");
            setRegPhone(query);
            setRegBirthday("");
            setRegAddress("");
            setRegisterDialogOpen(true);
          },
        },
      });
    }
  };

  // Member Registration Handler
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

    // Check duplicate phone
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

    setActiveMember(newMember);
    setMemberSearch("");
    setPointsToRedeem(0);
    setRegisterDialogOpen(false);
    setRegName("");
    setRegPhone("");
    setRegBirthday("");
    setRegAddress("");
    setRegError("");

    toast.success(`สมัครสมาชิกสำเร็จ! รหัสสมาชิก: ${newMember.code}`, {
      description: `คุณ ${newMember.name} เบอร์โทร ${newMember.phone} เริ่มสะสมแต้มได้ทันที`,
    });
  };

  const removeMember = () => {
    setActiveMember(null);
    setPointsToRedeem(0);
  };

  // QR Code Member Lookup & Simulation (format: RA-MEMBER:<memberCode>)
  const resolveQrCode = (raw: string) => {
    setQrError("");
    const cleaned = raw.trim();
    if (!cleaned) {
      setQrError("กรุณาระบุรหัส QR สมาชิก");
      return;
    }

    let codeToMatch = cleaned;
    if (cleaned.toUpperCase().startsWith("RA-MEMBER:")) {
      codeToMatch = cleaned.substring("RA-MEMBER:".length).trim();
    }

    const found = state.members.find(
      (m) =>
        m.code.toLowerCase() === codeToMatch.toLowerCase() ||
        m.phone.replace(/[\s-]/g, "") === codeToMatch.replace(/[\s-]/g, ""),
    );

    if (found) {
      setActiveMember(found);
      setPointsToRedeem(0);
      setQrDialogOpen(false);
      setQrInput("");
      setQrError("");
      toast.success(`พบข้อมูลสมาชิก: ${found.name}`, {
        description: `ระดับ ${found.tier} · แต้มสะสม ${formatNumber(found.points)} แต้ม`,
      });
    } else {
      const err = "ไม่พบสมาชิกจากรหัส QR นี้";
      setQrError(err);
      toast.error(err);
    }
  };

  // Quick cash buttons
  const setQuickCash = (val: number | "exact") => {
    if (val === "exact") {
      setCashTendered(bill.net.toString());
    } else {
      setCashTendered(val.toString());
    }
  };

  // Complete checkout & issue receipt (CASH ONLY)
  const handleCheckout = () => {
    if (cart.length === 0) {
      toast.error("ไม่มีสินค้าในตะกร้า");
      return;
    }

    if (numericCash < bill.net) {
      toast.error("จำนวนเงินสดที่รับมาไม่เพียงพอ", {
        description: `ยอดที่ต้องชำระคือ ฿${formatBaht(bill.net)} ขาดอีก ฿${formatBaht(bill.net - numericCash)}`,
      });
      return;
    }

    if (receiptType === "full") {
      if (!buyerName.trim()) {
        toast.error("กรุณาระบุชื่อผู้ซื้อ / บริษัท สำหรับใบกำกับภาษีเต็มรูป");
        return;
      }
      if (!buyerTaxId.trim() || !isValidTaxId(buyerTaxId)) {
        toast.error("กรุณาระบุเลขประจำตัวผู้เสียภาษี 13 หลักให้ถูกต้อง");
        return;
      }
    }

    const receiptLines = cart.map((c) => ({
      productId: c.product.id,
      name: c.product.name,
      price: c.product.price,
      qty: c.qty,
    }));

    const receiptData = {
      lines: receiptLines,
      subtotal: bill.subtotal,
      discount: bill.discount,
      net: bill.net,
      cash: numericCash,
      change: Math.max(0, change),
      paymentMethod: "เงินสด" as const,
      memberCode: activeMember?.code,
      memberName: activeMember?.name,
      pointsUsed: pointsToRedeem,
      pointsEarned: bill.pointsEarned,
      receiptType,
      buyer:
        receiptType === "full"
          ? {
              name: buyerName.trim(),
              address: buyerAddress.trim(),
              taxId: buyerTaxId.trim(),
            }
          : undefined,
    };

    const newReceipt = actions.completeSale(receiptData);
    setCompletedReceipt(newReceipt);
    setReceiptModalOpen(true);

    toast.success("บันทึกการขายสำเร็จ!", {
      description: `เลขที่บิล: ${newReceipt.id} ยอดเงิน ฿${formatBaht(newReceipt.net)}`,
    });

    // Reset current sale
    clearCart();
    setActiveMember(null);
  };

  // Print invoice helper
  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <PageHeader
        title="ขายหน้าร้าน (POS)"
        description="ระบบคิดเงินแคชเชียร์หน้าร้าน สแกนบาร์โค้ด ตัดสต็อกอัตโนมัติ และสะสมแต้มสมาชิกร้านรุ่งอรุณ"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setHistoryOpen(true)}
              className="gap-1.5 text-xs bg-card border-border shadow-xs"
            >
              <History className="size-3.5 text-muted-foreground" />
              ประวัติบิลขายวันนี้ ({state.sales.receipts.length})
            </Button>
            {cart.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearCart}
                className="gap-1 text-xs text-danger hover:text-danger hover:bg-danger/10"
              >
                <Trash2 className="size-3.5" /> ล้างตะกร้า
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ────────── Left Column: Product Catalog & Search (7 Cols) ────────── */}
        <div className="lg:col-span-7 space-y-4">
          {/* Search & Category Filter Card */}
          <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-soft space-y-3">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-sun-600 pointer-events-none" />
              <Input
                ref={barcodeInputRef}
                placeholder="สแกนบาร์โค้ด หรือพิมพ์ค้นหารหัส SKU / ชื่อสินค้า..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && filteredProducts.length === 1) {
                    addToCart(filteredProducts[0]);
                    setSearchQuery("");
                  }
                }}
                className="pl-10 pr-9 h-11 text-sm bg-background border-border/80 focus-visible:ring-2 focus-visible:ring-sun-500/40 rounded-xl"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 size-5 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>

            {/* Category Selector Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
              <button
                type="button"
                onClick={() => setSelectedCategory("all")}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all shrink-0 ${
                  selectedCategory === "all"
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "bg-muted/50 hover:bg-muted text-muted-foreground border border-border/60"
                }`}
              >
                ทั้งหมด ({state.catalog.products.length})
              </button>
              {state.categories.map((c) => {
                const count = state.catalog.products.filter((p) => p.category === c.name).length;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCategory(c.name)}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-all shrink-0 ${
                      selectedCategory === c.name
                        ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                        : "bg-muted/50 hover:bg-muted text-muted-foreground border border-border/60"
                    }`}
                  >
                    {c.name} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredProducts.map((p) => {
              const inCartItem = cart.find((c) => c.product.id === p.id);
              const isOutOfStock = p.stock <= 0;
              const isLowStock = p.stock <= p.reorderPoint && !isOutOfStock;

              return (
                <div
                  key={p.id}
                  onClick={() => !isOutOfStock && addToCart(p)}
                  className={`group relative rounded-2xl border p-3.5 transition-all flex flex-col justify-between select-none ${
                    isOutOfStock
                      ? "border-border/60 bg-muted/40 opacity-60 cursor-not-allowed"
                      : "border-border/80 bg-card hover:border-sun-300 hover:shadow-soft cursor-pointer hover:-translate-y-0.5"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between text-[11px] mb-1.5">
                      <span className="font-mono text-muted-foreground font-medium">{p.sku}</span>
                      {isOutOfStock ? (
                        <span className="text-danger font-semibold">สินค้าหมด</span>
                      ) : (
                        <span className={`font-medium ${isLowStock ? "text-amber-600" : "text-muted-foreground"}`}>
                          เหลือ {formatNumber(p.stock)} {p.unit}
                        </span>
                      )}
                    </div>

                    <h4 className="text-xs sm:text-sm font-semibold text-foreground line-clamp-2 leading-tight">
                      {p.name}
                    </h4>
                    <span className="text-[11px] text-muted-foreground block mt-0.5">{p.category}</span>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center justify-between">
                    <span className="text-sm font-bold text-primary">
                      <Money value={p.price} />
                    </span>

                    {inCartItem ? (
                      <span className="flex size-6 items-center justify-center rounded-full bg-sun-600 text-white text-xs font-bold shadow-xs">
                        {inCartItem.qty}
                      </span>
                    ) : (
                      <span className="flex size-6 items-center justify-center rounded-full bg-muted text-muted-foreground group-hover:bg-sun-100 group-hover:text-sun-700 transition-colors">
                        <Plus className="size-3.5" />
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {filteredProducts.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border bg-card/60 p-12 text-center text-muted-foreground space-y-2">
              <Package className="size-8 mx-auto text-muted-foreground/60" />
              <p className="text-sm font-medium">ไม่พบสินค้าที่ตรงกับคำค้นหาหรือหมวดหมู่</p>
              <Button variant="ghost" size="sm" onClick={() => { setSearchQuery(""); setSelectedCategory("all"); }}>
                ล้างคำค้นหา
              </Button>
            </div>
          )}
        </div>

        {/* ────────── Right Column: Cart & Checkout Panel (5 Cols) ────────── */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-soft space-y-4">
            {/* Header: Cart Title & Count */}
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <ShoppingCart className="size-5 text-sun-600" />
                <h3 className="font-bold text-foreground text-base">ตะกร้าสินค้า</h3>
                <Badge variant="outline" className="text-xs bg-sun-50 border-sun-200 text-sun-800">
                  {cart.reduce((s, c) => s + c.qty, 0)} ชิ้น
                </Badge>
              </div>
              <span className="text-xs text-muted-foreground">แคชเชียร์: {user.name}</span>
            </div>

            {/* Member Lookup Bar */}
            <div className="p-3 rounded-xl bg-sun-50/70 border border-sun-200/80 space-y-2">
              {activeMember ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="size-8 rounded-full bg-sun-200 text-sun-800 font-bold flex items-center justify-center text-xs">
                      <UserCheck className="size-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-foreground">{activeMember.name}</span>
                        <Badge variant="outline" className={activeMember.tier === "VIP" ? "bg-amber-100 text-amber-800 text-[10px]" : "text-[10px]"}>
                          {activeMember.tier}
                        </Badge>
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        แต้มสะสม: <strong className="text-sun-700 font-semibold">{formatNumber(activeMember.points)}</strong> แต้ม
                      </span>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-danger" onClick={removeMember} title="ยกเลิกสมาชิก">
                    <X className="size-3.5" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <form onSubmit={handleMemberSearch} className="flex flex-wrap sm:flex-nowrap gap-1.5">
                    <div className="relative flex-1 min-w-[140px]">
                      <User className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                      <Input
                        placeholder="เบอร์โทรศัพท์ หรือรหัสสมาชิก..."
                        value={memberSearch}
                        onChange={(e) => setMemberSearch(e.target.value)}
                        className="h-8 text-xs pl-8 bg-card border-sun-200"
                      />
                    </div>
                    <Button type="submit" size="sm" variant="outline" className="h-8 text-xs bg-card border-sun-300 text-sun-800 shrink-0">
                      ค้นหาสมาชิก
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setQrDialogOpen(true);
                        setQrInput("");
                        setQrError("");
                      }}
                      className="h-8 text-xs bg-sun-100 hover:bg-sun-200 border-sun-300 text-sun-900 font-medium shrink-0 gap-1.5"
                    >
                      <QrCode className="size-3.5 text-sun-700" />
                      สแกน QR สมาชิก
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setRegError("");
                        setRegName("");
                        setRegPhone(memberSearch.trim());
                        setRegBirthday("");
                        setRegAddress("");
                        setRegisterDialogOpen(true);
                      }}
                      className="h-8 text-xs bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-800 font-medium shrink-0 gap-1.5"
                    >
                      <UserPlus className="size-3.5 text-emerald-600" />
                      สมัครสมาชิกใหม่
                    </Button>
                  </form>
                </div>
              )}

              {/* Point Earning Rule Hint */}
              <div className="flex items-center gap-1.5 text-[11px] text-amber-800 bg-sun-100/70 px-2 py-1 rounded">
                <Sparkles className="size-3 text-amber-600 shrink-0" />
                <span>สิทธิประโยชน์สมาชิก: ซื้อครบ {earnStepBaht} บาท ได้ {earnPointsPerStep} แต้ม (คำนวณจากยอดสุทธิหลังหักส่วนลด)</span>
              </div>

              {/* Points Redemption Slider / Input if Member is Present */}
              {activeMember && cart.length > 0 && (
                activeMember.points < minPointsToRedeem ? (
                  <div className="pt-2 border-t border-sun-200/60 text-xs">
                    <p className="text-[11px] text-amber-700 bg-amber-50/80 rounded px-2 py-1 border border-amber-200/60">
                      ต้องมีแต้มสะสมขั้นต่ำ {minPointsToRedeem} แต้ม จึงจะสามารถใช้แต้มลดหย่อนได้ (ปัจจุบันมี {activeMember.points} แต้ม)
                    </p>
                  </div>
                ) : (
                  <div className="pt-2 border-t border-sun-200/60 text-xs space-y-2">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-muted-foreground">ใช้แต้มแลกส่วนลด ({pointsPerBaht} แต้ม = 1 บาท):</span>
                      <span className="font-semibold text-sun-800">
                        {pointsToRedeem > 0 ? (
                          <>ใช้ {pointsToRedeem} แต้ม (ลด ฿{bill.discount})</>
                        ) : (
                          <span className="text-muted-foreground font-normal">ยังไม่ได้ระบุแต้ม</span>
                        )}
                      </span>
                    </div>

                    {/* Manual Point Input & Quick Max */}
                    <div className="flex items-center gap-1.5">
                      <div className="relative flex-1">
                        <Input
                          type="number"
                          min={0}
                          max={maxPoints}
                          step={pointsPerBaht}
                          placeholder={`ระบุแต้มที่ต้องการใช้ (สูงสุด ${maxPoints})...`}
                          value={pointsToRedeem === 0 ? "" : pointsToRedeem}
                          onChange={(e) => {
                            const raw = e.target.value;
                            if (raw === "") {
                              setPointsToRedeem(0);
                              return;
                            }
                            const val = parseInt(raw, 10);
                            if (isNaN(val) || val < 0) {
                              setPointsToRedeem(0);
                              return;
                            }
                            if (val > activeMember.points) {
                              toast.warning(`แต้มที่กรอกเกินแต้มสะสมที่มี (${formatNumber(activeMember.points)} แต้ม)`);
                              setPointsToRedeem(maxPoints);
                              return;
                            }
                            if (val > maxPoints) {
                              toast.warning(`ยอดส่วนลดต้องไม่เกินยอดรวมของบิล (ใช้ได้สูงสุด ${formatNumber(maxPoints)} แต้ม)`);
                              setPointsToRedeem(maxPoints);
                              return;
                            }
                            setPointsToRedeem(val);
                          }}
                          className="h-8 text-xs bg-card border-sun-300 font-mono"
                        />
                      </div>
                      {maxPoints > 0 && (
                        <button
                          type="button"
                          onClick={() => setPointsToRedeem(maxPoints)}
                          className={`px-2.5 h-8 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
                            pointsToRedeem === maxPoints
                              ? "bg-sun-600 text-white shadow-xs"
                              : "bg-sun-100 hover:bg-sun-200 text-sun-900 border border-sun-300"
                          }`}
                        >
                          ใช้สูงสุด ({maxPoints})
                        </button>
                      )}
                    </div>

                    {/* Quick Preset Buttons */}
                    <div className="flex flex-wrap gap-1.5 items-center">
                      {[0, minPointsToRedeem, minPointsToRedeem > 0 ? minPointsToRedeem * 2 : 20, minPointsToRedeem > 0 ? minPointsToRedeem * 4 : 50, 100]
                        .filter((v, i, a) => a.indexOf(v) === i && v <= maxPoints)
                        .map((pts) => (
                          <button
                            key={pts}
                            type="button"
                            onClick={() => setPointsToRedeem(pts)}
                            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                              pointsToRedeem === pts ? "bg-sun-600 text-white font-bold" : "bg-card text-muted-foreground border border-sun-200"
                            }`}
                          >
                            {pts === 0 ? "ไม่ใช้" : `${pts} แต้ม`}
                          </button>
                        ))}
                    </div>
                  </div>
                )
              )}
            </div>

            {/* Cart Line Items */}
            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
              {cart.map((item) => (
                <div
                  key={item.product.id}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-border/80 bg-muted/20 text-xs"
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <h5 className="font-semibold text-foreground truncate">{item.product.name}</h5>
                    <span className="text-muted-foreground text-[11px]">
                      ฿{formatBaht(item.product.price)} × {item.qty} {item.product.unit}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-bold text-foreground text-right w-16">
                      <Money value={item.product.price * item.qty} />
                    </span>

                    {/* Quantity Stepper */}
                    <div className="flex items-center border border-border rounded-lg bg-card overflow-hidden">
                      <button
                        type="button"
                        onClick={() => updateCartQty(item.product.id, item.qty - 1)}
                        className="px-1.5 py-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <Minus className="size-3" />
                      </button>
                      <span className="px-2 font-mono font-semibold text-xs">{item.qty}</span>
                      <button
                        type="button"
                        onClick={() => updateCartQty(item.product.id, item.qty + 1)}
                        className="px-1.5 py-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <Plus className="size-3" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeFromCart(item.product.id)}
                      className="text-muted-foreground hover:text-danger p-1"
                      title="ลบรายการ"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {cart.length === 0 && (
                <div className="p-8 text-center text-muted-foreground text-xs space-y-1">
                  <ShoppingBag className="size-7 mx-auto text-muted-foreground/50 mb-1" />
                  <p className="font-medium text-foreground">ยังไม่มีสินค้าในตะกร้า</p>
                  <p className="text-[11px]">คลิกเลือกสินค้าหรือสแกนบาร์โค้ดเพื่อเริ่มคิดเงิน</p>
                </div>
              )}
            </div>

            {/* Bill Summary Calculations */}
            <div className="p-3.5 rounded-xl border border-border/80 bg-muted/40 space-y-2 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>ยอดรวมสินค้า ({cart.reduce((s, c) => s + c.qty, 0)} ชิ้น)</span>
                <span className="font-semibold text-foreground"><Money value={bill.subtotal} /></span>
              </div>
              {bill.discount > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>ส่วนลดแต้มสมาชิก ({pointsToRedeem} แต้ม)</span>
                  <span>- ฿{formatBaht(bill.discount)}</span>
                </div>
              )}
              {receiptType === "full" && (
                <div className="flex justify-between text-muted-foreground text-[11px]">
                  <span>รวมภาษีมูลค่าเพิ่ม 7% (ในตัว)</span>
                  <span>฿{formatBaht(vat)}</span>
                </div>
              )}
              <div className="pt-2 border-t border-border flex justify-between items-baseline">
                <div>
                  <span className="text-sm font-bold text-foreground block">ยอดสุทธิที่ต้องชำระ</span>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Sparkles className="size-3 text-amber-500" />
                    ซื้อครบ {earnStepBaht} บาท ได้ {earnPointsPerStep} แต้ม (บิลนี้ได้รับ: +{bill.pointsEarned} แต้ม)
                  </span>
                </div>
                <span className="text-2xl font-black text-primary">
                  <Money value={bill.net} />
                </span>
              </div>
            </div>

            {/* Payment: Cash Only Notice & Tender Input */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Coins className="size-4 text-sun-600" />
                  ช่องทางการชำระเงิน
                </Label>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 text-[11px] font-semibold">
                  ชำระด้วยเงินสดเท่านั้น (CASH ONLY)
                </Badge>
              </div>

              {/* Cash Tender Input & Quick Buttons */}
              <div className="space-y-2 p-3 rounded-xl border border-border/80 bg-card">
                <div className="flex justify-between items-center text-xs">
                  <Label className="text-xs">จำนวนเงินสดที่รับมา (บาท):</Label>
                  {numericCash > 0 && (
                    <span className={`font-bold ${change >= 0 ? "text-emerald-700" : "text-danger"}`}>
                      {change >= 0 ? `เงินทอน: ฿${formatBaht(change)}` : `ขาดอีก: ฿${formatBaht(Math.abs(change))}`}
                    </span>
                  )}
                </div>
                <Input
                  type="number"
                  placeholder="ระบุจำนวนเงินสดที่รับ..."
                  value={cashTendered}
                  onChange={(e) => setCashTendered(e.target.value)}
                  className="h-10 text-base font-bold font-mono"
                />
                <div className="flex gap-1.5">
                  <Button type="button" size="sm" variant="outline" className="flex-1 text-xs h-7" onClick={() => setQuickCash("exact")}>
                    พอดี
                  </Button>
                  <Button type="button" size="sm" variant="outline" className="flex-1 text-xs h-7" onClick={() => setQuickCash(100)}>
                    100
                  </Button>
                  <Button type="button" size="sm" variant="outline" className="flex-1 text-xs h-7" onClick={() => setQuickCash(500)}>
                    500
                  </Button>
                  <Button type="button" size="sm" variant="outline" className="flex-1 text-xs h-7" onClick={() => setQuickCash(1000)}>
                    1,000
                  </Button>
                </div>
              </div>
            </div>

            {/* Receipt Type Toggle */}
            <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
              <span className="text-muted-foreground">ประเภทเอกสารใบเสร็จ:</span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setReceiptType("short")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                    receiptType === "short" ? "bg-sun-600 text-white font-semibold" : "bg-muted text-muted-foreground"
                  }`}
                >
                  อย่างย่อ
                </button>
                <button
                  type="button"
                  onClick={() => setReceiptType("full")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                    receiptType === "full" ? "bg-sun-600 text-white font-semibold" : "bg-muted text-muted-foreground"
                  }`}
                >
                  เต็มรูป (ภาษี)
                </button>
              </div>
            </div>

            {/* Full Tax Invoice Buyer Inputs */}
            {receiptType === "full" && (
              <div className="p-3 rounded-xl border border-sun-200 bg-sun-50/50 space-y-2 text-xs">
                <div className="space-y-1">
                  <Label className="text-[11px]">ชื่อผู้ซื้อ / นิติบุคคล *</Label>
                  <Input
                    placeholder="เช่น บริษัท สยามเทรดดิ้ง จำกัด หรือ นายสมชาย มีสุข"
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    className="h-8 text-xs bg-card"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">เลขประจำตัวผู้เสียภาษี (13 หลัก) *</Label>
                  <Input
                    placeholder="0105559012345"
                    value={buyerTaxId}
                    onChange={(e) => setBuyerTaxId(e.target.value)}
                    className="h-8 text-xs bg-card font-mono"
                    maxLength={13}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">ที่อยู่สำหรับออกใบกำกับภาษี</Label>
                  <Input
                    placeholder="เลขที่ ถนน แขวง/ตำบล เขต/อำเภอ จังหวัด รหัสไปรษณีย์"
                    value={buyerAddress}
                    onChange={(e) => setBuyerAddress(e.target.value)}
                    className="h-8 text-xs bg-card"
                  />
                </div>
              </div>
            )}

            {/* Main Action Button */}
            <Button
              size="lg"
              disabled={cart.length === 0 || numericCash < bill.net}
              onClick={handleCheckout}
              className="w-full h-12 text-sm font-bold bg-primary hover:bg-sun-700 text-primary-foreground rounded-xl shadow-md gap-2"
            >
              <CheckCircle2 className="size-5" />
              ชำระเงินสดและออกใบเสร็จ (฿{formatBaht(bill.net)})
            </Button>
          </div>
        </div>
      </div>

      {/* ────────── Completed Receipt Modal (Printable) ────────── */}
      <Dialog open={receiptModalOpen} onOpenChange={setReceiptModalOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto rounded-2xl shadow-lift">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700">
              <CheckCircle2 className="size-5" />
              <span>ทำรายการสำเร็จ</span>
            </DialogTitle>
            <DialogDescription>
              ระบบได้บันทึกการขายและตัดสต็อกสินค้าในคลังเรียบร้อยแล้ว
            </DialogDescription>
          </DialogHeader>

          {completedReceipt && (
            <div className="my-2 p-4 rounded-xl bg-white border border-border shadow-xs font-mono text-xs text-foreground space-y-3 print:border-0 print:p-0">
              {/* Receipt Header */}
              <div className="text-center space-y-0.5 border-b border-dashed border-border pb-3">
                <h3 className="font-display font-bold text-sm">ร้านรุ่งอรุณ มินิมาร์ท</h3>
                <p className="text-[11px] text-muted-foreground">สาขาศิลา ขอนแก่น โทร. 043-221-489</p>
                <p className="text-[11px] text-muted-foreground">เลขประจำตัวผู้เสียภาษี: 0105559012345</p>
                <div className="mt-1 font-bold text-xs">
                  {completedReceipt.receiptType === "full" ? "ใบกำกับภาษีเต็มรูป / ใบเสร็จรับเงิน" : "ใบเสร็จรับเงิน / ใบกำกับภาษีอย่างย่อ"}
                </div>
                <div className="text-[10px] text-muted-foreground">เลขที่บิล: {completedReceipt.id}</div>
                <div className="text-[10px] text-muted-foreground">วันที่: {formatDateTime(completedReceipt.createdAt)}</div>
                <div className="text-[10px] text-muted-foreground">แคชเชียร์: {completedReceipt.cashier}</div>
              </div>

              {/* Full tax invoice buyer info */}
              {completedReceipt.buyer && (
                <div className="text-[11px] border-b border-dashed border-border pb-2 space-y-0.5">
                  <div><strong>ลูกค้า:</strong> {completedReceipt.buyer.name}</div>
                  <div><strong>เลขภาษี:</strong> {completedReceipt.buyer.taxId}</div>
                  {completedReceipt.buyer.address && <div><strong>ที่อยู่:</strong> {completedReceipt.buyer.address}</div>}
                </div>
              )}

              {/* Line items table */}
              <div className="space-y-1.5 border-b border-dashed border-border pb-2 text-[11px]">
                {completedReceipt.lines.map((l, idx) => (
                  <div key={idx} className="flex justify-between items-start">
                    <div className="flex-1 pr-2">
                      <div>{l.name}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {l.qty} × ฿{formatBaht(l.price)}
                      </div>
                    </div>
                    <span className="font-bold">฿{formatBaht(l.price * l.qty)}</span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="space-y-1 text-xs border-b border-dashed border-border pb-2">
                <div className="flex justify-between">
                  <span>ยอดรวม (Subtotal)</span>
                  <span>฿{formatBaht(completedReceipt.subtotal)}</span>
                </div>
                {completedReceipt.discount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>ส่วนลดแต้มสมาชิก</span>
                    <span>- ฿{formatBaht(completedReceipt.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm pt-1 border-t border-border/50">
                  <span>ยอดสุทธิ (Total)</span>
                  <span className="text-primary">฿{formatBaht(completedReceipt.net)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>ชำระด้วย: เงินสด</span>
                  <span>รับเงิน: ฿{formatBaht(completedReceipt.cash)}</span>
                </div>
                {completedReceipt.change > 0 && (
                  <div className="flex justify-between text-[11px] font-bold">
                    <span>เงินทอน (Change)</span>
                    <span>฿{formatBaht(completedReceipt.change)}</span>
                  </div>
                )}
                {completedReceipt.receiptType === "full" && (
                  <div className="flex justify-between text-[10px] text-muted-foreground pt-1">
                    <span>รวมภาษีมูลค่าเพิ่ม 7% (ในตัว)</span>
                    <span>฿{formatBaht(vatIncluded(completedReceipt.net))}</span>
                  </div>
                )}
              </div>

              {/* Loyalty summary */}
              {completedReceipt.memberCode && (
                <div className="text-[11px] text-muted-foreground border-b border-dashed border-border pb-2 space-y-0.5">
                  <div>สมาชิก: {completedReceipt.memberName} ({completedReceipt.memberCode})</div>
                  {completedReceipt.pointsUsed > 0 && <div>แต้มที่ใช้ลดหย่อน: {completedReceipt.pointsUsed} แต้ม</div>}
                  <div className="text-sun-700 font-semibold">แต้มที่ได้รับจากบิลนี้: +{completedReceipt.pointsEarned} แต้ม</div>
                </div>
              )}

              {/* Footer */}
              <div className="text-center text-[10px] text-muted-foreground pt-1">
                <p>*** ขอบคุณที่ไว้วางใจใช้บริการ ***</p>
                <p>ร้านรุ่งอรุณ มินิมาร์ท</p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={handlePrint}
              className="gap-1.5 text-xs"
            >
              <Printer className="size-4" />
              พิมพ์ใบเสร็จ
            </Button>
            <Button
              onClick={() => setReceiptModalOpen(false)}
              className="bg-primary hover:bg-sun-700 text-xs font-bold"
            >
              เริ่มการขายใหม่
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ────────── Member QR Code Scanner Dialog ────────── */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl shadow-lift">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="size-5 text-sun-600" />
              <span>สแกน QR สมาชิก</span>
            </DialogTitle>
            <DialogDescription>
              หันกล้องไปที่ QR Code ของสมาชิก หรือใช้ตัวจำลองการสแกนด้านล่าง
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-2">
            {/* Camera Viewfinder Placeholder */}
            <div className="relative rounded-2xl bg-neutral-900 text-neutral-200 p-6 flex flex-col items-center justify-center min-h-[170px] overflow-hidden border border-neutral-700 shadow-inner">
              <div className="relative flex flex-col items-center justify-center z-10 space-y-2 text-center">
                <div className="size-14 rounded-2xl bg-neutral-800/80 border-2 border-dashed border-sun-400 flex items-center justify-center animate-pulse">
                  <Camera className="size-7 text-sun-400" />
                </div>
                <p className="text-xs text-neutral-300 font-medium">
                  ช่องมองภาพกล้อง (Camera Viewfinder)
                </p>
                <p className="text-[10px] text-neutral-400 max-w-[220px]">
                  รองรับ QR Code ในรูปแบบ <span className="font-mono text-sun-300">RA-MEMBER:&lt;รหัสสมาชิก&gt;</span>
                </p>
              </div>

              {/* Viewfinder Target Corner Brackets */}
              <div className="absolute top-3.5 left-3.5 size-4 border-t-2 border-l-2 border-sun-400" />
              <div className="absolute top-3.5 right-3.5 size-4 border-t-2 border-r-2 border-sun-400" />
              <div className="absolute bottom-3.5 left-3.5 size-4 border-b-2 border-l-2 border-sun-400" />
              <div className="absolute bottom-3.5 right-3.5 size-4 border-b-2 border-r-2 border-sun-400" />
            </div>

            {/* Error Message if Unknown */}
            {qrError && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                <AlertCircle className="size-4 shrink-0" />
                <span className="font-medium">{qrError}</span>
              </div>
            )}

            {/* Simulation Controls */}
            <div className="space-y-3 p-3.5 rounded-xl border border-sun-200/80 bg-sun-50/50">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-sun-900">จำลองการสแกน QR Code</span>
                <span className="text-[10px] text-muted-foreground">เลือกลูกค้าตัวอย่างหรือพิมพ์รหัส</span>
              </div>

              {/* Quick Pick Member from List */}
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">เลือกลูกค้าสมาชิกจากระบบ:</Label>
                <Select
                  onValueChange={(val) => {
                    setQrInput(`RA-MEMBER:${val}`);
                    setQrError("");
                  }}
                >
                  <SelectTrigger className="h-8 text-xs bg-card">
                    <SelectValue placeholder="-- เลือกสมาชิกเพื่อจำลองการสแกน --" />
                  </SelectTrigger>
                  <SelectContent className="max-h-52">
                    {state.members.map((m) => (
                      <SelectItem key={m.code} value={m.code}>
                        {m.name} ({m.code}) — {formatNumber(m.points)} แต้ม
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Manual QR Text Input */}
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">หรือระบุข้อความ QR Code (RA-MEMBER:&lt;memberCode&gt;):</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="เช่น RA-MEMBER:M0001"
                    value={qrInput}
                    onChange={(e) => {
                      setQrInput(e.target.value);
                      if (qrError) setQrError("");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        resolveQrCode(qrInput);
                      }
                    }}
                    className="h-8 text-xs bg-card font-mono"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => resolveQrCode(qrInput)}
                    className="h-8 text-xs font-semibold bg-sun-600 hover:bg-sun-700 text-white shrink-0"
                  >
                    จำลองการสแกน
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setQrDialogOpen(false);
                setQrInput("");
                setQrError("");
              }}
              className="text-xs"
            >
              ปิดหน้าต่าง
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ────────── Member Registration Dialog ────────── */}
      <Dialog open={registerDialogOpen} onOpenChange={setRegisterDialogOpen}>
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
                onClick={() => setRegisterDialogOpen(false)}
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

      {/* ────────── Today's Sales Receipts History Modal ────────── */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl shadow-lift">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="size-5 text-primary" />
              <span>ประวัติบิลขายหน้าร้านวันนี้</span>
            </DialogTitle>
            <DialogDescription>
              รายการบิลที่ออกผ่านเครื่อง POS ในกะการทำงานปัจจุบัน ({state.sales.receipts.length} รายการ)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2.5 my-2">
            {state.sales.receipts.map((r) => (
              <div
                key={r.id}
                className="p-3 rounded-xl border border-border/80 bg-muted/20 text-xs space-y-1.5 hover:bg-muted/40 transition-colors"
              >
                <div className="flex justify-between items-center">
                  <span className="font-mono font-bold text-foreground">{r.id}</span>
                  <Badge variant="outline" className="text-[10px] bg-sun-50 border-sun-200 text-sun-800">
                    ชำระด้วย: {r.paymentMethod || "เงินสด"}
                  </Badge>
                </div>
                <div className="flex justify-between text-muted-foreground text-[11px]">
                  <span>{formatDateTime(r.createdAt)} · แคชเชียร์: {r.cashier}</span>
                  <span className="font-bold text-foreground text-xs"><Money value={r.net} /></span>
                </div>
                {r.memberCode && (
                  <div className="text-[10px] text-sun-700 font-medium">
                    สมาชิก: {r.memberName} (+{r.pointsEarned} แต้ม)
                  </div>
                )}
              </div>
            ))}

            {state.sales.receipts.length === 0 && (
              <div className="p-8 text-center text-muted-foreground text-xs">
                ยังไม่มีการบันทึกบิลขายในวันนี้
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setHistoryOpen(false)} className="text-xs">
              ปิด
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

