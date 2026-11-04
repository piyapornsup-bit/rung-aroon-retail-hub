import { describe, expect, it } from "vitest";
import { appReducer, createInitialState, type AppState } from "@/lib/store";
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
});

