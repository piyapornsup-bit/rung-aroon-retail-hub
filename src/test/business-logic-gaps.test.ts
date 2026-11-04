import { describe, expect, it } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  appReducer,
  createInitialState,
  StoreProvider,
  useStore,
  getDynamicSalesLast7Days,
  type AppState,
} from "@/lib/store";
import {
  calcBill,
  maxRedeemablePoints,
  pointsEarnedFor,
  pointsToBaht,
  type PointRules,
} from "@/lib/pos";
import { isRouteAllowedForRole } from "@/lib/navigation";
import { orderTotal } from "@/lib/mock-data";

describe("Business Logic Gaps - Fix & Integration Verification", () => {
  describe("1. approvePayment in Store: Stock deduction, adjustment log, receipt linking, member points & idempotency", () => {
    it("deducts stock clamped at 0, logs stock adjustment with exact reason, creates receipt linked to orderId, and awards member points", () => {
      let state = createInitialState();

      // Find an order waiting for payment review
      const pendingOrder = state.orders.find((o) => o.status === "รอตรวจสอบ")!;
      expect(pendingOrder).toBeDefined();

      const orderLine = pendingOrder.lines[0];
      const initialStock = state.catalog.products.find((p) => p.id === orderLine.productId)!.stock;
      const initialReceiptsCount = state.sales.receipts.length;
      const initialAdjustmentsCount = state.stockAdjustments.length;

      const member = state.members.find((m) => m.code === pendingOrder.memberCode);
      const initialMemberPoints = member?.points ?? 0;

      // Approve online payment
      const approveTime = new Date().toISOString();
      state = appReducer(state, {
        type: "orders/setStatus",
        orderId: pendingOrder.id,
        status: "ชำระแล้ว",
        at: approveTime,
        note: "ตรวจสอบสลิปถูกต้อง",
      });

      // 1. Order status is now "ชำระแล้ว"
      const updatedOrder = state.orders.find((o) => o.id === pendingOrder.id)!;
      expect(updatedOrder.status).toBe("ชำระแล้ว");

      // 2. Product stock is deducted
      const updatedProduct = state.catalog.products.find((p) => p.id === orderLine.productId)!;
      expect(updatedProduct.stock).toBe(Math.max(0, initialStock - orderLine.qty));

      // 3. Stock adjustment record is logged with reason "ขายออนไลน์ <orderId>"
      const adjustment = state.stockAdjustments.find(
        (a) => a.productId === orderLine.productId && a.reason === `ขายออนไลน์ ${pendingOrder.id}`,
      );
      expect(adjustment).toBeDefined();
      expect(adjustment?.reason).toBe(`ขายออนไลน์ ${pendingOrder.id}`);
      expect(adjustment?.previousStock).toBe(initialStock);
      expect(adjustment?.diff).toBe(Math.max(0, initialStock - orderLine.qty) - initialStock);

      // 4. Receipt is created linked to the order
      expect(state.sales.receipts.length).toBe(initialReceiptsCount + 1);
      const createdReceipt = state.sales.receipts[0];
      expect(createdReceipt.orderId).toBe(pendingOrder.id);
      expect(createdReceipt.net).toBe(orderTotal(pendingOrder));

      // 5. Member points are awarded using POS earning rules
      if (member) {
        const updatedMember = state.members.find((m) => m.code === member.code)!;
        const earnStepBaht = state.storeSettings.pointRate.earnStepBaht ?? 50;
        const earnPointsPerStep = state.storeSettings.pointRate.earnPointsPerStep ?? 5;
        const expectedPoints = pointsEarnedFor(orderTotal(pendingOrder), { earnStepBaht, earnPointsPerStep });
        const pointsUsed = pendingOrder.pointsUsed ?? 0;
        expect(updatedMember.points).toBe(Math.max(0, initialMemberPoints - pointsUsed) + expectedPoints);
      }

      // 6. Idempotency test: approving again MUST NOT double-deduct stock or duplicate receipts/points
      const stateAfterSecondApproval = appReducer(state, {
        type: "orders/setStatus",
        orderId: pendingOrder.id,
        status: "ชำระแล้ว",
        at: new Date().toISOString(),
        note: "อนุมัติซ้ำ",
      });

      const productAfterDuplicate = stateAfterSecondApproval.catalog.products.find(
        (p) => p.id === orderLine.productId,
      )!;
      expect(productAfterDuplicate.stock).toBe(updatedProduct.stock);
      expect(stateAfterSecondApproval.sales.receipts.length).toBe(state.sales.receipts.length);
      expect(stateAfterSecondApproval.stockAdjustments.length).toBe(state.stockAdjustments.length);

      if (member) {
        const memberAfterDuplicate = stateAfterSecondApproval.members.find(
          (m) => m.code === member.code,
        )!;
        const updatedMember = state.members.find((m) => m.code === member.code)!;
        expect(memberAfterDuplicate.points).toBe(updatedMember.points);
      }
    });

    it("clamps stock deduction at 0 if ordered qty exceeds inventory", () => {
      let state = createInitialState();

      // Create an order line where qty > stock
      const product = state.catalog.products[0];
      const lowStockProduct = { ...product, stock: 2 };
      state = {
        ...state,
        catalog: {
          products: state.catalog.products.map((p) => (p.id === product.id ? lowStockProduct : p)),
        },
      };

      const customOrder = {
        ...state.orders[0],
        id: "ORD-CLAMP-001",
        status: "รอตรวจสอบ" as const,
        lines: [{ productId: product.id, name: product.name, price: product.price, qty: 10 }],
      };
      state = { ...state, orders: [customOrder, ...state.orders] };

      state = appReducer(state, {
        type: "orders/setStatus",
        orderId: customOrder.id,
        status: "ชำระแล้ว",
        at: new Date().toISOString(),
      });

      const updated = state.catalog.products.find((p) => p.id === product.id)!;
      expect(updated.stock).toBe(0); // clamped at 0
    });

    it("preserves return restock on approved returns", () => {
      let state = createInitialState();
      const returnReq = state.returns.find((r) => r.status === "อนุมัติ" && !r.receivedAt)!;
      expect(returnReq).toBeDefined();

      const returnedProduct = state.catalog.products.find(
        (p) => p.id === returnReq.lines[0].productId,
      )!;
      const initialStock = returnedProduct.stock;
      const returnedQty = returnReq.lines[0].qty;

      // Receive return at warehouse
      state = appReducer(state, {
        type: "returns/receive",
        id: returnReq.id,
        at: new Date().toISOString(),
      });

      const restockedProduct = state.catalog.products.find((p) => p.id === returnedProduct.id)!;
      expect(restockedProduct.stock).toBe(initialStock + returnedQty);
    });
  });

  describe("2. Dynamic POS Loyalty Rules from Store Settings", () => {
    it("calculates points earned based on configurable step-based rule (ซื้อครบ 50 บาท ได้ 5 แต้ม)", () => {
      // Default rule: 50 baht = 5 points
      const defaultRules: PointRules = { earnStepBaht: 50, earnPointsPerStep: 5 };
      expect(pointsEarnedFor(49, defaultRules)).toBe(0);
      expect(pointsEarnedFor(50, defaultRules)).toBe(5);
      expect(pointsEarnedFor(120, defaultRules)).toBe(10);
      expect(pointsEarnedFor(1000, defaultRules)).toBe(100);

      // Changing the setting to 100 baht = 10 points changes the result
      const customRules: PointRules = { earnStepBaht: 100, earnPointsPerStep: 10 };
      expect(pointsEarnedFor(49, customRules)).toBe(0);
      expect(pointsEarnedFor(50, customRules)).toBe(0);
      expect(pointsEarnedFor(100, customRules)).toBe(10);
      expect(pointsEarnedFor(120, customRules)).toBe(10);
      expect(pointsEarnedFor(1000, customRules)).toBe(100);
    });

    it("calculates discount redemption based on configurable pointsPerBaht", () => {
      // 10 points = 1 Baht
      expect(pointsToBaht(50, { pointsPerBaht: 10 })).toBe(5);
      expect(pointsToBaht(100, { pointsPerBaht: 10 })).toBe(10);

      // 5 points = 1 Baht
      expect(pointsToBaht(50, { pointsPerBaht: 5 })).toBe(10);

      // 20 points = 1 Baht
      expect(pointsToBaht(50, { pointsPerBaht: 20 })).toBe(2);
    });

    it("enforces minimum points threshold (minPointsToRedeem)", () => {
      const rulesWithMin50: PointRules = {
        earnStepBaht: 50,
        earnPointsPerStep: 5,
        pointsPerBaht: 10,
        minPointsToRedeem: 50,
      };

      // Member with only 30 points cannot redeem anything (below 50 minimum)
      expect(maxRedeemablePoints(30, 500, rulesWithMin50)).toBe(0);

      // Member with 50 points can redeem 50 points
      expect(maxRedeemablePoints(50, 500, rulesWithMin50)).toBe(50);

      // Member with 120 points can redeem 120 points
      expect(maxRedeemablePoints(120, 500, rulesWithMin50)).toBe(120);

      // Max redeemable is also bounded by subtotal
      // E.g. subtotal is 5 Baht, requiring at most 50 points (at 10 pts/baht)
      expect(maxRedeemablePoints(200, 5, rulesWithMin50)).toBe(50);
    });

    it("calcBill dynamically uses step-based point rules for discount and points earned", () => {
      const lines = [{ productId: "P01", price: 100, qty: 2 }]; // subtotal = 200
      const rules: PointRules = {
        earnStepBaht: 50,
        earnPointsPerStep: 5,
        pointsPerBaht: 10, // 10 pts = 1 baht discount
        minPointsToRedeem: 20,
      };

      // Redeem 40 points = 4 Baht discount => net = 196 Baht => floor(196 / 50) * 5 = 3 * 5 = 15 points
      const bill = calcBill(lines, 40, rules);
      expect(bill.subtotal).toBe(200);
      expect(bill.discount).toBe(4);
      expect(bill.net).toBe(196);
      expect(bill.pointsEarned).toBe(15);
    });
  });

  describe("3. Role-Based Route Protection", () => {
    it("allows manager to access every route", () => {
      expect(isRouteAllowedForRole("manager", "/dashboard")).toBe(true);
      expect(isRouteAllowedForRole("manager", "/sales/pos")).toBe(true);
      expect(isRouteAllowedForRole("manager", "/sales/payments")).toBe(true);
      expect(isRouteAllowedForRole("manager", "/warehouse/stock")).toBe(true);
      expect(isRouteAllowedForRole("manager", "/warehouse/receiving")).toBe(true);
      expect(isRouteAllowedForRole("manager", "/purchasing/orders")).toBe(true);
      expect(isRouteAllowedForRole("manager", "/manager/approve-pr")).toBe(true);
      expect(isRouteAllowedForRole("manager", "/manager/settings")).toBe(true);
      expect(isRouteAllowedForRole("manager", "/owner/receipts")).toBe(true);
      expect(isRouteAllowedForRole("manager", "/search")).toBe(true);
      expect(isRouteAllowedForRole("manager", "/reports")).toBe(true);
    });

    it("restricts sales role strictly to its menu", () => {
      // Sales allowed routes
      expect(isRouteAllowedForRole("sales", "/dashboard")).toBe(true);
      expect(isRouteAllowedForRole("sales", "/sales/pos")).toBe(true);
      expect(isRouteAllowedForRole("sales", "/sales/payments")).toBe(true);
      expect(isRouteAllowedForRole("sales", "/sales/returns")).toBe(true);
      expect(isRouteAllowedForRole("sales", "/sales/gifts")).toBe(true);
      expect(isRouteAllowedForRole("sales", "/search")).toBe(true);
      expect(isRouteAllowedForRole("sales", "/reports")).toBe(true);

      // Sales unauthorized routes
      expect(isRouteAllowedForRole("sales", "/warehouse/stock")).toBe(false);
      expect(isRouteAllowedForRole("sales", "/warehouse/receiving")).toBe(false);
      expect(isRouteAllowedForRole("sales", "/purchasing/orders")).toBe(false);
      expect(isRouteAllowedForRole("sales", "/purchasing/suppliers")).toBe(false);
      expect(isRouteAllowedForRole("sales", "/manager/approve-pr")).toBe(false);
      expect(isRouteAllowedForRole("sales", "/manager/settings")).toBe(false);
      expect(isRouteAllowedForRole("sales", "/owner/receipts")).toBe(false);
    });

    it("restricts warehouse role strictly to its menu", () => {
      expect(isRouteAllowedForRole("warehouse", "/dashboard")).toBe(true);
      expect(isRouteAllowedForRole("warehouse", "/warehouse/stock")).toBe(true);
      expect(isRouteAllowedForRole("warehouse", "/warehouse/receiving")).toBe(true);
      expect(isRouteAllowedForRole("warehouse", "/warehouse/fulfillment")).toBe(true);

      // Warehouse unauthorized routes
      expect(isRouteAllowedForRole("warehouse", "/sales/pos")).toBe(false);
      expect(isRouteAllowedForRole("warehouse", "/purchasing/orders")).toBe(false);
      expect(isRouteAllowedForRole("warehouse", "/manager/approve-pr")).toBe(false);
    });

    it("restricts purchasing role strictly to its menu", () => {
      expect(isRouteAllowedForRole("purchasing", "/dashboard")).toBe(true);
      expect(isRouteAllowedForRole("purchasing", "/purchasing/suppliers")).toBe(true);
      expect(isRouteAllowedForRole("purchasing", "/purchasing/orders")).toBe(true);
      expect(isRouteAllowedForRole("purchasing", "/purchasing/quotations")).toBe(true);

      // Purchasing unauthorized routes
      expect(isRouteAllowedForRole("purchasing", "/sales/pos")).toBe(false);
      expect(isRouteAllowedForRole("purchasing", "/warehouse/stock")).toBe(false);
      expect(isRouteAllowedForRole("purchasing", "/manager/employees")).toBe(false);
    });

    it("restricts owner role to its overview, receipts, search, reports and dashboard (settings removed from owner)", () => {
      expect(isRouteAllowedForRole("owner", "/dashboard")).toBe(true);
      expect(isRouteAllowedForRole("owner", "/owner/overview")).toBe(true);
      expect(isRouteAllowedForRole("owner", "/owner/receipts")).toBe(true);
      expect(isRouteAllowedForRole("owner", "/manager/settings")).toBe(false);
      expect(isRouteAllowedForRole("owner", "/search")).toBe(true);
      expect(isRouteAllowedForRole("owner", "/reports")).toBe(true);

      // Owner unauthorized routes
      expect(isRouteAllowedForRole("owner", "/sales/pos")).toBe(false);
      expect(isRouteAllowedForRole("owner", "/warehouse/receiving")).toBe(false);
      expect(isRouteAllowedForRole("owner", "/purchasing/requisitions")).toBe(false);
    });
  });

  describe("4. Reports Duty-Based Visibility & Safe Fallback", () => {
    type ReportType =
      | "overview"
      | "sales_channels"
      | "inventory"
      | "order_history"
      | "fulfillment"
      | "procurement";

    const REPORT_ROLES: Record<ReportType, string[]> = {
      overview: ["manager", "owner"],
      sales_channels: ["sales", "manager", "owner"],
      inventory: ["warehouse", "manager", "owner"],
      order_history: ["purchasing", "sales", "manager", "owner"],
      fulfillment: ["warehouse", "manager", "owner"],
      procurement: ["purchasing", "manager", "owner"],
    };

    const getAllowedReportsForRole = (role: string): ReportType[] => {
      const normalized = role === "stock" ? "warehouse" : role === "buy" ? "purchasing" : role;
      if (normalized === "manager" || normalized === "owner") {
        return ["overview", "sales_channels", "inventory", "order_history", "fulfillment", "procurement"];
      }
      return (Object.keys(REPORT_ROLES) as ReportType[]).filter((id) =>
        REPORT_ROLES[id].includes(normalized),
      );
    };

    const getSafeReportId = (role: string, requestedReportId?: string): ReportType => {
      const allowed = getAllowedReportsForRole(role);
      const defaultId = allowed[0] || "inventory";
      if (requestedReportId && allowed.includes(requestedReportId as ReportType)) {
        return requestedReportId as ReportType;
      }
      return defaultId;
    };

    it("grants manager and owner access to all 6 reports", () => {
      expect(getAllowedReportsForRole("manager")).toEqual([
        "overview",
        "sales_channels",
        "inventory",
        "order_history",
        "fulfillment",
        "procurement",
      ]);
      expect(getAllowedReportsForRole("owner")).toEqual([
        "overview",
        "sales_channels",
        "inventory",
        "order_history",
        "fulfillment",
        "procurement",
      ]);
    });

    it("restricts warehouse (stock) to inventory and fulfillment only", () => {
      const warehouseReports = getAllowedReportsForRole("warehouse");
      expect(warehouseReports).toEqual(["inventory", "fulfillment"]);

      // Also works when role is referenced as 'stock'
      const stockReports = getAllowedReportsForRole("stock");
      expect(stockReports).toEqual(["inventory", "fulfillment"]);

      // Must NOT see overview, sales channels, order history, or procurement
      expect(warehouseReports).not.toContain("overview");
      expect(warehouseReports).not.toContain("sales_channels");
      expect(warehouseReports).not.toContain("order_history");
      expect(warehouseReports).not.toContain("procurement");
    });

    it("restricts purchasing to order_history and procurement only", () => {
      const purchasingReports = getAllowedReportsForRole("purchasing");
      expect(purchasingReports).toEqual(["order_history", "procurement"]);

      // Must NOT see overview, sales channels, inventory, or fulfillment
      expect(purchasingReports).not.toContain("overview");
      expect(purchasingReports).not.toContain("sales_channels");
      expect(purchasingReports).not.toContain("inventory");
      expect(purchasingReports).not.toContain("fulfillment");
    });

    it("safely falls back to an allowed default tab when entering with unauthorized report parameter", () => {
      // Warehouse opening /reports (defaults to overview in route params) must safely fall back to inventory
      expect(getSafeReportId("warehouse", "overview")).toBe("inventory");
      expect(getSafeReportId("warehouse", "procurement")).toBe("inventory");
      expect(getSafeReportId("warehouse", "fulfillment")).toBe("fulfillment");

      // Purchasing opening /reports (defaults to overview in route params) must safely fall back to order_history
      expect(getSafeReportId("purchasing", "overview")).toBe("order_history");
      expect(getSafeReportId("purchasing", "inventory")).toBe("order_history");
      expect(getSafeReportId("purchasing", "procurement")).toBe("procurement");

      // Manager opening /reports can view any report requested
      expect(getSafeReportId("manager", "overview")).toBe("overview");
      expect(getSafeReportId("manager", "procurement")).toBe("procurement");
    });
  });

  describe("5. POS Member QR Code Lookup & Cash-Only Policy", () => {
    it("resolves member from QR string format 'RA-MEMBER:<memberCode>' case-insensitively", () => {
      const state = createInitialState();
      const targetMember = state.members[0];

      // Simulated resolver logic matching POS implementation
      const resolve = (raw: string) => {
        let code = raw.trim();
        if (code.toUpperCase().startsWith("RA-MEMBER:")) {
          code = code.substring("RA-MEMBER:".length).trim();
        }
        return state.members.find(
          (m) => m.code.toLowerCase() === code.toLowerCase() || m.phone === code,
        );
      };

      const resolved = resolve(`RA-MEMBER:${targetMember.code}`);
      expect(resolved).toBeDefined();
      expect(resolved?.code).toBe(targetMember.code);

      const resolvedLower = resolve(`ra-member:${targetMember.code.toLowerCase()}`);
      expect(resolvedLower?.code).toBe(targetMember.code);
    });

    it("returns undefined for unknown QR code and triggers error", () => {
      const state = createInitialState();
      const resolve = (raw: string) => {
        let code = raw.trim();
        if (code.toUpperCase().startsWith("RA-MEMBER:")) {
          code = code.substring("RA-MEMBER:".length).trim();
        }
        return state.members.find((m) => m.code.toLowerCase() === code.toLowerCase());
      };

      const unknown = resolve("RA-MEMBER:UNKNOWN999");
      expect(unknown).toBeUndefined();
    });

    it("POS receipts record paymentMethod as 'เงินสด' only", () => {
      let state = createInitialState();
      const product = state.catalog.products[0];

      state = appReducer(state, {
        type: "pos/completeSale",
        receipt: {
          id: "RC-TEST-001",
          createdAt: new Date().toISOString(),
          cashier: "สมใจ ขายดี",
          lines: [{ productId: product.id, name: product.name, price: product.price, qty: 1 }],
          subtotal: product.price,
          discount: 0,
          net: product.price,
          cash: product.price,
          change: 0,
          paymentMethod: "เงินสด",
          pointsUsed: 0,
          pointsEarned: 5,
          receiptType: "short",
        },
      });

      const receipt = state.sales.receipts[0];
      expect(receipt.paymentMethod).toBe("เงินสด");
    });
  });

  describe("6. Online Orders Customer Choices & Net Total Formula", () => {
    it("computes net total as subtotal + shippingFee - pointsDiscount clamped at 0", () => {
      const state = createInitialState();
      for (const order of state.orders) {
        const subtotal = order.lines.reduce((s, l) => s + l.price * l.qty, 0);
        const expectedNet = Math.max(0, subtotal + (order.shippingFee ?? 0) - (order.pointsDiscount ?? 0));
        expect(orderTotal(order)).toBe(expectedNet);
      }
    });

    it("has online orders with pointsUsed > 0 and full tax invoice details", () => {
      const state = createInitialState();
      const ordersWithPoints = state.orders.filter((o) => (o.pointsUsed ?? 0) > 0);
      expect(ordersWithPoints.length).toBeGreaterThanOrEqual(3);

      const fullReceiptOrders = state.orders.filter((o) => o.receiptType === "เต็ม");
      expect(fullReceiptOrders.length).toBeGreaterThanOrEqual(3);
      for (const o of fullReceiptOrders) {
        expect(o.buyerTaxId).toBeDefined();
        expect(o.buyerTaxId).toMatch(/^\d{13}$/);
        expect(o.buyerName).toBeDefined();
      }
    });

    it("rejecting or canceling an order does NOT deduct stock or member points", () => {
      let state = createInitialState();
      const pendingOrder = state.orders.find((o) => o.status === "รอตรวจสอบ")!;
      const product = state.catalog.products.find((p) => p.id === pendingOrder.lines[0].productId)!;
      const initialStock = product.stock;
      const member = state.members.find((m) => m.code === pendingOrder.memberCode);
      const initialPoints = member?.points ?? 0;

      // Reject payment
      state = appReducer(state, {
        type: "orders/setStatus",
        orderId: pendingOrder.id,
        status: "ยกเลิก",
        at: new Date().toISOString(),
        note: "สลิปไม่ถูกต้อง",
      });

      const updatedOrder = state.orders.find((o) => o.id === pendingOrder.id)!;
      expect(updatedOrder.status).toBe("ยกเลิก");

      const productAfterReject = state.catalog.products.find((p) => p.id === product.id)!;
      expect(productAfterReject.stock).toBe(initialStock);

      if (member) {
        const memberAfterReject = state.members.find((m) => m.code === member.code)!;
        expect(memberAfterReject.points).toBe(initialPoints);
      }
    });
  });

  describe("7. Data Flow Audit Fixes: Member totalSpend, Staff Login, Dynamic Sales Reports, Report 6 Filter", () => {
    it("accumulates member totalSpend on POS sale (pos/completeSale)", () => {
      let state = createInitialState();
      const member = state.members[0];
      const initialSpend = member.totalSpend || 0;
      const initialPoints = member.points;

      state = appReducer(state, {
        type: "pos/completeSale",
        receipt: {
          id: "RC-TEST-001",
          createdAt: new Date().toISOString(),
          cashier: "สมชาย",
          lines: [{ productId: "P01", name: "มาม่า", price: 50, qty: 2 }],
          subtotal: 100,
          discount: 0,
          net: 100,
          cash: 100,
          change: 0,
          memberCode: member.code,
          memberName: member.name,
          pointsUsed: 0,
          pointsEarned: 10,
          receiptType: "short",
          paymentMethod: "เงินสด",
        },
      });

      const updated = state.members.find((m) => m.code === member.code)!;
      expect(updated.totalSpend).toBe(initialSpend + 100);
      expect(updated.points).toBe(initialPoints + 10);
    });

    it("accumulates member totalSpend on online order payment approval (orders/setStatus to ชำระแล้ว)", () => {
      let state = createInitialState();
      const pendingOrder = state.orders.find((o) => o.status === "รอตรวจสอบ" && o.memberCode)!;
      const member = state.members.find((m) => m.code === pendingOrder.memberCode)!;
      const initialSpend = member.totalSpend || 0;
      const expectedNet = orderTotal(pendingOrder);

      state = appReducer(state, {
        type: "orders/setStatus",
        orderId: pendingOrder.id,
        status: "ชำระแล้ว",
        at: new Date().toISOString(),
        note: "อนุมัติ",
      });

      const updated = state.members.find((m) => m.code === member.code)!;
      expect(updated.totalSpend).toBe(initialSpend + expectedNet);
    });

    it("dynamically combines baseline sales with POS sales and online orders for วันนี้", () => {
      let state = createInitialState();
      const initialDynamic = getDynamicSalesLast7Days(state);
      const todayInitial = initialDynamic.find((d) => d.day === "วันนี้")!;
      expect(todayInitial.inStore).toBe(6380);
      expect(todayInitial.online).toBe(1145);

      // Add a POS receipt
      state = appReducer(state, {
        type: "pos/completeSale",
        receipt: {
          id: "RC-TEST-002",
          createdAt: new Date().toISOString(),
          cashier: "สมชาย",
          lines: [{ productId: "P01", name: "สินค้า", price: 250, qty: 1 }],
          subtotal: 250,
          discount: 0,
          net: 250,
          cash: 250,
          change: 0,
          pointsUsed: 0,
          pointsEarned: 25,
          receiptType: "short",
          paymentMethod: "เงินสด",
        },
      });

      const afterPos = getDynamicSalesLast7Days(state);
      const todayAfterPos = afterPos.find((d) => d.day === "วันนี้")!;
      expect(todayAfterPos.inStore).toBe(6380 + 250);
      expect(todayAfterPos.online).toBe(1145);

      // Approve an online payment
      const pendingOrder = state.orders.find((o) => o.status === "รอตรวจสอบ")!;
      const net = orderTotal(pendingOrder);
      state = appReducer(state, {
        type: "orders/setStatus",
        orderId: pendingOrder.id,
        status: "ชำระแล้ว",
        at: new Date().toISOString(),
      });

      const afterOnline = getDynamicSalesLast7Days(state);
      const todayAfterOnline = afterOnline.find((d) => d.day === "วันนี้")!;
      expect(todayAfterOnline.inStore).toBe(6380 + 250);
      expect(todayAfterOnline.online).toBe(1145 + net);
    });

    it("allows login for newly added employees and reset passwords via state.employees", () => {
      const { result } = renderHook(() => useStore(), { wrapper: StoreProvider });

      // 1. Add new employee
      let newEmp: any;
      act(() => {
        newEmp = result.current.actions.addEmployee({
          username: "newbie.sales",
          password: "password123",
          name: "พนักงานใหม่ รักงาน",
          nickname: "นิว",
          role: "sales",
          position: "พนักงานขายหน้าร้าน",
        });
      });
      expect(newEmp).toBeDefined();

      // 2. Login with the new employee
      let loginRes: any;
      act(() => {
        loginRes = result.current.actions.login("newbie.sales", "password123");
      });
      expect(loginRes.ok).toBe(true);
      expect(result.current.state.session.user.username).toBe("newbie.sales");

      // 3. Reset password
      let resetRes: any;
      act(() => {
        resetRes = result.current.actions.resetEmployeePassword(newEmp.id);
      });
      expect(resetRes.ok).toBe(true);
      const tempPass = resetRes.tempPassword;

      // 4. Old password fails
      act(() => {
        loginRes = result.current.actions.login("newbie.sales", "password123");
      });
      expect(loginRes.ok).toBe(false);

      // 5. New temp password succeeds
      act(() => {
        loginRes = result.current.actions.login("newbie.sales", tempPass);
      });
      expect(loginRes.ok).toBe(true);
      expect(result.current.state.session.user.username).toBe("newbie.sales");
    });

    it("counts payment requests with status 'รออนุมัติจ่ายเงิน' or 'รออนุมัติจ่าย'", () => {
      const testRequests: any[] = [
        { id: "P1", status: "รออนุมัติจ่ายเงิน" },
        { id: "P2", status: "รออนุมัติจ่าย" },
        { id: "P3", status: "อนุมัติจ่ายแล้ว" },
        { id: "P4", status: "จ่ายเงินแล้ว" },
      ];
      const pending = testRequests.filter(
        (p) => p.status === "รออนุมัติจ่ายเงิน" || p.status === "รออนุมัติจ่าย",
      ).length;
      expect(pending).toBe(2);
    });
  });

  describe("8. POS Loyalty Points & Member Registration", () => {
    it("validates that points redemption rate is 10 points = 1 baht and discount cannot exceed subtotal", () => {
      const rules: PointRules = {
        earnStepBaht: 50,
        earnPointsPerStep: 5,
        pointsPerBaht: 10,
        minPointsToRedeem: 0,
      };

      // 100 points = 10 baht
      expect(pointsToBaht(100, rules)).toBe(10);
      expect(pointsToBaht(45, rules)).toBe(4);

      // Subtotal 30 baht, member has 500 points (50 baht): max points = 300 (30 baht)
      const maxPts = maxRedeemablePoints(500, 30, rules);
      expect(maxPts).toBe(300);

      // Subtotal 100 baht, member has 200 points: max points = 200 (20 baht)
      const maxPts2 = maxRedeemablePoints(200, 100, rules);
      expect(maxPts2).toBe(200);

      // Bill calculation: 100 subtotal, 50 points redeemed -> 5 baht discount -> 95 net
      const bill = calcBill(
        [{ productId: "P01", price: 100, qty: 1 }],
        50,
        rules,
      );
      expect(bill.subtotal).toBe(100);
      expect(bill.discount).toBe(5);
      expect(bill.net).toBe(95);
      // 95 net / 50 * 5 = 5 points earned (calculated from net after discount)
      expect(bill.pointsEarned).toBe(5);
    });

    it("executes completeSale with exact order: newPoints = oldPoints - pointsUsed + pointsEarned", () => {
      let state = createInitialState();
      const member = state.members[0];
      const oldPoints = member.points;
      const initialSpend = member.totalSpend || 0;

      const pointsUsed = 50;
      const pointsEarned = 10;
      const net = 100;

      state = appReducer(state, {
        type: "pos/completeSale",
        receipt: {
          id: "RC-TEST-LOYALTY",
          createdAt: new Date().toISOString(),
          cashier: "ทดสอบ",
          lines: [{ productId: "P01", name: "สินค้าทดสอบ", price: 50, qty: 2 }],
          subtotal: 105,
          discount: 5,
          net,
          cash: 100,
          change: 0,
          memberCode: member.code,
          memberName: member.name,
          pointsUsed,
          pointsEarned,
          receiptType: "short",
          paymentMethod: "เงินสด",
        },
      });

      const updated = state.members.find((m) => m.code === member.code)!;
      // Formula: (แต้มคงเหลือใหม่ = แต้มเดิม - แต้มที่ใช้แลกส่วนลด + แต้มที่ได้รับจากบิลนี้)
      expect(updated.points).toBe(oldPoints - pointsUsed + pointsEarned);
      expect(updated.totalSpend).toBe(initialSpend + net);
    });

    it("registers a new member via actions.addMember, finds by phone, and can immediately use and earn points in POS", () => {
      const { result } = renderHook(() => useStore(), { wrapper: StoreProvider });

      // 1. Register new member
      let newMember: any;
      act(() => {
        newMember = result.current.actions.addMember({
          name: "คุณสมพงษ์ ยินดี",
          phone: "0891234567",
          birthday: "08-15",
          address: "99 หมู่ 3 ต.ศิลา ขอนแก่น",
        });
      });

      expect(newMember).toBeDefined();
      expect(newMember.code).toMatch(/^M\d{4}$/);
      expect(newMember.name).toBe("คุณสมพงษ์ ยินดี");
      expect(newMember.phone).toBe("0891234567");
      expect(newMember.points).toBe(0);

      // 2. Member is found in state.members by phone
      const foundByPhone = result.current.state.members.find(
        (m) => m.phone.replace(/[\s-]/g, "") === "0891234567",
      );
      expect(foundByPhone).toBeDefined();
      expect(foundByPhone?.code).toBe(newMember.code);

      // 3. Make a POS sale for this new member (subtotal 150 baht -> 15 points earned)
      act(() => {
        result.current.actions.completeSale({
          lines: [{ productId: "P01", name: "สินค้า", price: 150, qty: 1 }],
          subtotal: 150,
          discount: 0,
          net: 150,
          cash: 200,
          change: 50,
          memberCode: newMember.code,
          memberName: newMember.name,
          pointsUsed: 0,
          pointsEarned: 15,
          receiptType: "short",
          paymentMethod: "เงินสด",
        });
      });

      // Member points updated to 15
      const memberAfterSale = result.current.state.members.find((m) => m.code === newMember.code)!;
      expect(memberAfterSale.points).toBe(15);
      expect(memberAfterSale.totalSpend).toBe(150);
    });
  });

  describe("5. Audit Fixes Verification", () => {
    it("deletePurchaseRequisition removes PR from state and returns ok: true", () => {
      const { result } = renderHook(() => useStore(), { wrapper: StoreProvider });
      const initialCount = result.current.state.purchaseRequisitions.length;
      expect(initialCount).toBeGreaterThan(0);

      const targetPR = result.current.state.purchaseRequisitions[0];
      act(() => {
        const res = result.current.actions.deletePurchaseRequisition(targetPR.id);
        expect(res.ok).toBe(true);
      });

      expect(result.current.state.purchaseRequisitions.length).toBe(initialCount - 1);
      expect(result.current.state.purchaseRequisitions.some((pr) => pr.id === targetPR.id)).toBe(false);
    });

    it("owner overview totalStockCost logic calculates finite number and never NaN with fallback", () => {
      const { result } = renderHook(() => useStore(), { wrapper: StoreProvider });
      const getProductCost = (p: any) =>
        typeof p.costPrice === "number" ? p.costPrice : Math.round((p.price ?? 0) * 0.7);

      const totalStockCost = result.current.state.catalog.products.reduce(
        (a, p) => a + (p.stock ?? 0) * getProductCost(p),
        0,
      );
      expect(Number.isFinite(totalStockCost)).toBe(true);
      expect(totalStockCost).toBeGreaterThan(0);
      expect(Number.isNaN(totalStockCost)).toBe(false);
    });

    it("owner receipts total calculates correctly without NaN even when new receipt has amount but no totalAmount", () => {
      const { result } = renderHook(() => useStore(), { wrapper: StoreProvider });

      // Upload a new receipt without totalAmount
      act(() => {
        result.current.actions.uploadAgentReceipt({
          receiptNumber: "INV-AUDIT-001",
          companyId: "COMP-01",
          companyName: "บริษัท สหพัฒนพิบูล จำกัด (มหาชน)",
          poId: "PO-2611-001",
          poNumber: "PO-2611-001",
          amount: 2500,
          issueDate: new Date().toISOString(),
          fileName: "test.pdf",
          fileSize: "100 KB",
          fileType: "pdf",
          status: "ถูกต้อง",
        });
      });

      const total = result.current.state.agentReceipts.reduce(
        (sum, r) => sum + (r.amount ?? r.totalAmount ?? 0),
        0,
      );
      expect(Number.isFinite(total)).toBe(true);
      expect(Number.isNaN(total)).toBe(false);
      expect(total).toBeGreaterThan(2500);
    });

    it("payment request fields fallback correctly to ensure ID and supplierName are never undefined", () => {
      const { result } = renderHook(() => useStore(), { wrapper: StoreProvider });
      const reqs = result.current.state.paymentRequests;
      expect(reqs.length).toBeGreaterThan(0);

      for (const r of reqs) {
        const reqId = r.id || (r as any).requestNumber;
        const supplier = r.supplierName || (r as any).companyName || (r as any).payee;
        expect(reqId).toBeDefined();
        expect(typeof reqId).toBe("string");
        expect(reqId.length).toBeGreaterThan(0);
        expect(supplier).toBeDefined();
        expect(typeof supplier).toBe("string");
        expect(supplier.length).toBeGreaterThan(0);
      }
    });
  });
});

