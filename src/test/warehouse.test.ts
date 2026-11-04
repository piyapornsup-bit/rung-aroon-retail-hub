import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";
import {
  warehouses,
  initialCategories,
  purchaseOrders,
  products,
  onlineOrders,
} from "@/lib/mock-data";
import {
  createInitialState,
  appReducer,
  selectReorderPointProducts,
  selectOrdersToPack,
  selectOrdersToShip,
  selectOrdersShipped,
  selectOrdersDelivered,
  selectWarehouseCategoryCount,
  selectWarehouseForCategory,
  selectApprovedReturnRequests,
  selectPendingReturnGoods,
  selectGiftsToShip,
  selectShippedGifts,
  selectPendingReceivingPOs,
  selectCompletedPOs,
} from "@/lib/store";

describe("Round 2 Setup & Mock Data", () => {
  it("has exactly 3 warehouses in mock data", () => {
    expect(warehouses).toHaveLength(3);
    const ids = warehouses.map((w) => w.id);
    expect(ids).toEqual(["WH-01", "WH-02", "WH-03"]);
  });

  it("assigns every category to exactly one warehouse", () => {
    expect(initialCategories.length).toBeGreaterThan(0);
    const warehouseIds = new Set(warehouses.map((w) => w.id));

    // Every category must have a valid warehouseId
    for (const cat of initialCategories) {
      expect(warehouseIds.has(cat.warehouseId)).toBe(true);
    }

    // No duplicate category names
    const names = initialCategories.map((c) => c.name);
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(names.length);
  });

  it("has some products below reorder point", () => {
    const belowReorder = products.filter(
      (p) => p.reorderPoint !== undefined && p.stock <= p.reorderPoint,
    );
    expect(belowReorder.length).toBeGreaterThan(0);
  });

  it("has exactly 3 purchase orders with lines", () => {
    expect(purchaseOrders).toHaveLength(3);
    for (const po of purchaseOrders) {
      expect(po.lines.length).toBeGreaterThan(0);
      expect(po.totalAmount).toBeGreaterThan(0);
    }
  });

  it("has 6 paid orders ready to pack", () => {
    const paidOrders = onlineOrders.filter((o) => o.status === "ชำระแล้ว");
    expect(paidOrders).toHaveLength(6);
  });

  it("correctly calculates warehouse selectors in store", () => {
    const state = createInitialState();
    expect(state.warehouses).toHaveLength(3);
    expect(state.categories).toHaveLength(7);

    const reorderProds = selectReorderPointProducts(state);
    expect(reorderProds.length).toBeGreaterThanOrEqual(5);

    const toPack = selectOrdersToPack(state);
    expect(toPack).toHaveLength(6);

    // Categories distributed across 3 warehouses
    const c1 = selectWarehouseCategoryCount(state, "WH-01");
    const c2 = selectWarehouseCategoryCount(state, "WH-02");
    const c3 = selectWarehouseCategoryCount(state, "WH-03");
    expect(c1 + c2 + c3).toBe(7);
    expect(c1).toBeGreaterThan(0);
    expect(c2).toBeGreaterThan(0);
    expect(c3).toBeGreaterThan(0);
  });

  it("matches routes for /warehouse/warehouses and /warehouse/categories", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const whMatches = router.matchRoutes("/warehouse/warehouses");
    expect(whMatches.at(-1)?.routeId).not.toBe(rootRouteId);
    expect(whMatches.at(-1)?.routeId).toBe("/_admin/warehouse/warehouses");

    const catMatches = router.matchRoutes("/warehouse/categories");
    expect(catMatches.at(-1)?.routeId).not.toBe(rootRouteId);
    expect(catMatches.at(-1)?.routeId).toBe("/_admin/warehouse/categories");
  });

  it("matches routes for /warehouse/products and /warehouse/stock", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const prodMatches = router.matchRoutes("/warehouse/products");
    expect(prodMatches.at(-1)?.routeId).not.toBe(rootRouteId);
    expect(prodMatches.at(-1)?.routeId).toBe("/_admin/warehouse/products");

    const stockMatches = router.matchRoutes("/warehouse/stock");
    expect(stockMatches.at(-1)?.routeId).not.toBe(rootRouteId);
    expect(stockMatches.at(-1)?.routeId).toBe("/_admin/warehouse/stock");
  });

  it("matches routes for /warehouse/fulfillment and /warehouse/returns", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const fulMatches = router.matchRoutes("/warehouse/fulfillment");
    expect(fulMatches.at(-1)?.routeId).not.toBe(rootRouteId);
    expect(fulMatches.at(-1)?.routeId).toBe("/_admin/warehouse/fulfillment");

    const retMatches = router.matchRoutes("/warehouse/returns");
    expect(retMatches.at(-1)?.routeId).not.toBe(rootRouteId);
    expect(retMatches.at(-1)?.routeId).toBe("/_admin/warehouse/returns");
  });

  it("matches routes for /warehouse/receiving and /warehouse/gifts", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const rcvMatches = router.matchRoutes("/warehouse/receiving");
    expect(rcvMatches.at(-1)?.routeId).not.toBe(rootRouteId);
    expect(rcvMatches.at(-1)?.routeId).toBe("/_admin/warehouse/receiving");

    const giftMatches = router.matchRoutes("/warehouse/gifts");
    expect(giftMatches.at(-1)?.routeId).not.toBe(rootRouteId);
    expect(giftMatches.at(-1)?.routeId).toBe("/_admin/warehouse/gifts");
  });
});

describe("Round 2 Part 2: Product & Stock Management Store", () => {
  it("resolves the single warehouse for each category (1:1 rule)", () => {
    const state = createInitialState();
    const soapWh = selectWarehouseForCategory(state, "สบู่");
    expect(soapWh).toBeDefined();
    expect(soapWh?.id).toBe("WH-01");

    const giftWh = selectWarehouseForCategory(state, "กิ๊ฟช็อป");
    expect(giftWh).toBeDefined();
    expect(giftWh?.id).toBe("WH-03");

    const nonExistent = selectWarehouseForCategory(state, "หมวดที่ไม่มี");
    expect(nonExistent).toBeUndefined();
  });

  it("adds, updates, and deletes products in the catalog", () => {
    let state = createInitialState();
    const initialCount = state.catalog.products.length;

    // Add new product
    const newProduct = {
      id: "P99",
      sku: "TEST-SKU-99",
      barcode: "8850000999999",
      name: "สินค้าทดสอบ",
      category: "เครื่องดื่ม",
      price: 59,
      cost: 40,
      stock: 15,
      unit: "ขวด",
      reorderPoint: 20,
      isOnline: true,
      description: "ทดสอบคำอธิบายสินค้า",
    };

    state = appReducer(state, { type: "catalog/addProduct", product: newProduct });
    expect(state.catalog.products).toHaveLength(initialCount + 1);
    expect(state.catalog.products.find((p) => p.id === "P99")?.name).toBe("สินค้าทดสอบ");

    // Update product
    state = appReducer(state, {
      type: "catalog/updateProduct",
      id: "P99",
      updates: { price: 65, reorderPoint: 25, isOnline: false },
    });
    const updated = state.catalog.products.find((p) => p.id === "P99");
    expect(updated?.price).toBe(65);
    expect(updated?.reorderPoint).toBe(25);
    expect(updated?.isOnline).toBe(false);

    // Delete product
    state = appReducer(state, { type: "catalog/deleteProduct", id: "P99" });
    expect(state.catalog.products).toHaveLength(initialCount);
    expect(state.catalog.products.find((p) => p.id === "P99")).toBeUndefined();
  });

  it("records physical stock count adjustments and updates product stock", () => {
    let state = createInitialState();
    const targetProduct = state.catalog.products[0];
    const prevStock = targetProduct.stock;
    const countedStock = prevStock + 5;
    const diff = countedStock - prevStock;

    const adjustmentRecord = {
      id: "ADJ-TEST-01",
      productId: targetProduct.id,
      productName: targetProduct.name,
      sku: targetProduct.sku,
      warehouseId: "WH-01",
      warehouseName: "โกดังหลัก (หลังร้าน)",
      previousStock: prevStock,
      countedStock,
      diff,
      reason: "ตรวจนับประจำสัปดาห์พบสินค้าเกิน",
      countedBy: "สมชาย คลังสินค้า",
      note: "นับซ้ำ 2 รอบ ยืนยันถูกต้อง",
      createdAt: new Date().toISOString(),
    };

    state = appReducer(state, { type: "stock/adjust", record: adjustmentRecord });

    // Product stock must be updated to countedStock
    const updatedProd = state.catalog.products.find((p) => p.id === targetProduct.id);
    expect(updatedProd?.stock).toBe(countedStock);

    // Adjustment record must be prepended to history
    expect(state.stockAdjustments[0].id).toBe("ADJ-TEST-01");
    expect(state.stockAdjustments[0].diff).toBe(5);
  });

  it("dispatches low-stock notification for purchasing department", () => {
    let state = createInitialState();
    const lowStockItems = selectReorderPointProducts(state);
    expect(lowStockItems.length).toBeGreaterThan(0);

    const notification = {
      id: "NOTIF-TEST-01",
      createdAt: new Date().toISOString(),
      sentBy: "สมชาย มีทรัพย์",
      itemCount: lowStockItems.length,
      items: lowStockItems.map((p) => ({
        productId: p.id,
        sku: p.sku,
        name: p.name,
        category: p.category,
        warehouseId: "WH-01",
        warehouseName: "โกดังหลัก (หลังร้าน)",
        currentStock: p.stock,
        reorderPoint: p.reorderPoint ?? 10,
        suggestedQty: Math.max((p.reorderPoint ?? 10) * 2 - p.stock, p.reorderPoint ?? 10),
      })),
      status: "รอจัดซื้อดำเนินการ" as const,
      note: "รายการสินค้าคงคลังถึงจุดสั่งซื้อ แจ้งฝ่ายจัดซื้อเปิดใบสั่งซื้อ",
    };

    state = appReducer(state, { type: "stock/sendNotification", notification });

    expect(state.lowStockNotifications).toHaveLength(2); // initial 1 + test 1
    expect(state.lowStockNotifications[0].id).toBe("NOTIF-TEST-01");
    expect(state.lowStockNotifications[0].status).toBe("รอจัดซื้อดำเนินการ");
    expect(state.lowStockNotifications[0].itemCount).toBe(lowStockItems.length);
  });
});

describe("Round 2 Part 3: Fulfillment & Returns Store", () => {
  it("automatically displays sales-approved orders in fulfillment 'ชำระแล้ว' stage", () => {
    let state = createInitialState();
    const pendingOrder = state.orders.find((o) => o.status === "รอตรวจสอบ")!;
    expect(pendingOrder).toBeDefined();

    // Sales approves payment in round 1
    state = appReducer(state, {
      type: "orders/setStatus",
      orderId: pendingOrder.id,
      status: "ชำระแล้ว",
      at: new Date().toISOString(),
      note: "ตรวจสอบสลิปถูกต้อง",
    });

    // Automatically appears in toPack in fulfillment
    const toPack = selectOrdersToPack(state);
    expect(toPack.some((o) => o.id === pendingOrder.id)).toBe(true);
  });

  it("progresses order through fulfillment lifecycle (กำลังเตรียม -> จัดส่งแล้ว -> ส่งสำเร็จ)", () => {
    let state = createInitialState();
    const targetOrder = state.orders.find((o) => o.status === "ชำระแล้ว")!;
    expect(targetOrder).toBeDefined();

    const nowIso = new Date().toISOString();

    // 1. Move to กำลังเตรียม (Packing)
    state = appReducer(state, {
      type: "orders/startPacking",
      orderId: targetOrder.id,
      at: nowIso,
    });
    let updated = state.orders.find((o) => o.id === targetOrder.id)!;
    expect(updated.status).toBe("กำลังเตรียม");

    // 2. Check items in pack checklist
    const firstItem = updated.lines[0].productId;
    state = appReducer(state, {
      type: "orders/togglePackedItem",
      orderId: targetOrder.id,
      productId: firstItem,
    });
    updated = state.orders.find((o) => o.id === targetOrder.id)!;
    expect(updated.packedLines).toContain(firstItem);

    // Toggle again unchecks
    state = appReducer(state, {
      type: "orders/togglePackedItem",
      orderId: targetOrder.id,
      productId: firstItem,
    });
    updated = state.orders.find((o) => o.id === targetOrder.id)!;
    expect(updated.packedLines).not.toContain(firstItem);

    // Recheck
    state = appReducer(state, {
      type: "orders/togglePackedItem",
      orderId: targetOrder.id,
      productId: firstItem,
    });

    // 3. Move to จัดส่งแล้ว (Shipped) with carrier and trackingNumber
    state = appReducer(state, {
      type: "orders/ship",
      orderId: targetOrder.id,
      carrier: "Flash Express",
      trackingNumber: "TH9988776655",
      at: nowIso,
      note: "ส่งรอบบ่าย",
    });
    updated = state.orders.find((o) => o.id === targetOrder.id)!;
    expect(updated.status).toBe("จัดส่งแล้ว");
    expect(updated.carrier).toBe("Flash Express");
    expect(updated.trackingNumber).toBe("TH9988776655");
    expect(selectOrdersShipped(state).some((o) => o.id === targetOrder.id)).toBe(true);

    // 4. Record delivery result (ส่งสำเร็จ)
    state = appReducer(state, {
      type: "orders/setDeliveryResult",
      orderId: targetOrder.id,
      status: "ส่งสำเร็จ",
      at: nowIso,
      note: "ผู้รับลงชื่อรับของเรียบร้อย",
    });
    updated = state.orders.find((o) => o.id === targetOrder.id)!;
    expect(updated.status).toBe("ส่งสำเร็จ");
    expect(selectOrdersDelivered(state).some((o) => o.id === targetOrder.id)).toBe(true);
  });

  it("confirms return receipt and adds quantity back to product stock in catalog", () => {
    let state = createInitialState();
    const approvedReturns = selectApprovedReturnRequests(state);
    const pendingReturn = approvedReturns.find((r) => !r.receivedAt)!;
    expect(pendingReturn).toBeDefined();

    const returnedLine = pendingReturn.lines[0];
    const initialProduct = state.catalog.products.find((p) => p.id === returnedLine.productId)!;
    const initialStock = initialProduct.stock;

    // Confirm receipt of return
    state = appReducer(state, {
      type: "returns/receive",
      id: pendingReturn.id,
      at: new Date().toISOString(),
      note: "ตรวจสภาพเรียบร้อย สภาพสมบูรณ์พร้อมขายต่อ",
    });

    // Product stock must be incremented by returnedLine.qty
    const restockedProduct = state.catalog.products.find((p) => p.id === returnedLine.productId)!;
    expect(restockedProduct.stock).toBe(initialStock + returnedLine.qty);

    // Return request must be marked received and restocked
    const updatedReturn = state.returns.find((r) => r.id === pendingReturn.id)!;
    expect(updatedReturn.receivedAt).toBeDefined();
    expect(updatedReturn.restocked).toBe(true);

    // StockAdjustment record must be logged
    const adj = state.stockAdjustments.find(
      (a) => a.productId === returnedLine.productId && a.reason.includes(pendingReturn.id),
    );
    expect(adj).toBeDefined();
    expect(adj?.diff).toBe(returnedLine.qty);
  });
});

describe("Round 2 Part 4: Receiving & Gifts Store", () => {
  it("inspects purchase order lines and adds only correct lines to stock in warehouse", () => {
    let state = createInitialState();
    const po = state.purchaseOrders.find((p) => p.id === "PO-2611-001")!;
    expect(po).toBeDefined();
    expect(po.lines).toHaveLength(3);

    const p17Before = state.catalog.products.find((p) => p.id === "P17")!.stock;
    const p18Before = state.catalog.products.find((p) => p.id === "P18")!.stock;
    const p20Before = state.catalog.products.find((p) => p.id === "P20")!.stock;

    const lineResults = [
      {
        productId: "P17",
        deliveredQty: 120,
        checkStatus: "ถูกต้อง" as const,
        note: "สินค้าครบถ้วน",
      },
      {
        productId: "P18",
        deliveredQty: 80,
        checkStatus: "ไม่ถูกต้อง" as const,
        note: "สินค้าขาด 20 ซอง และกล่องฉีกขาด ต้องส่งคืนตัวแทน",
      },
      {
        productId: "P20",
        deliveredQty: 48,
        checkStatus: "ถูกต้อง" as const,
        note: "สินค้าครบถ้วน",
      },
    ];

    state = appReducer(state, {
      type: "purchaseOrders/receive",
      poId: po.id,
      lineResults,
      receivingNote: "ตรวจรับโดยพนักงานคลังสินค้า มีสินค้าชำรุด 1 รายการ",
      at: new Date().toISOString(),
    });

    // 1. Correct lines are added to stock
    const p17After = state.catalog.products.find((p) => p.id === "P17")!.stock;
    const p20After = state.catalog.products.find((p) => p.id === "P20")!.stock;
    expect(p17After).toBe(p17Before + 120);
    expect(p20After).toBe(p20Before + 48);

    // 2. Incorrect line is NOT added to stock
    const p18After = state.catalog.products.find((p) => p.id === "P18")!.stock;
    expect(p18After).toBe(p18Before);

    // 3. Discrepancy item added to PO
    const updatedPO = state.purchaseOrders.find((p) => p.id === po.id)!;
    expect(updatedPO.status).toBe("รับสินค้าบางส่วน");
    expect(updatedPO.discrepancies).toHaveLength(1);
    expect(updatedPO.discrepancies![0].productId).toBe("P18");
    expect(updatedPO.discrepancies![0].reason).toContain("ต้องส่งคืนตัวแทน");

    // 4. Purchasing notification created
    const purchasingNotif = state.lowStockNotifications.find((n) =>
      n.note.includes(po.poNumber),
    );
    expect(purchasingNotif).toBeDefined();
    expect(purchasingNotif?.status).toBe("รอจัดซื้อดำเนินการ");

    // 5. Stock adjustments logged for correct lines
    const adj17 = state.stockAdjustments.find(
      (a) => a.productId === "P17" && a.reason.includes(po.poNumber),
    );
    expect(adj17).toBeDefined();
    expect(adj17?.diff).toBe(120);
  });

  it("ships gifts marked 'จัดเตรียมแล้ว' by sales in round 1", () => {
    let state = createInitialState();
    const giftsToShip = selectGiftsToShip(state);
    expect(giftsToShip.length).toBeGreaterThan(0);

    const targetGift = giftsToShip[0];
    const initialShipCount = selectShippedGifts(state).length;

    state = appReducer(state, {
      type: "gifts/markShipped",
      id: targetGift.id,
      carrier: "Kerry Express",
      trackingNumber: "KEX99887766",
      note: "จัดส่งรอบบ่าย สภาพกล่องของขวัญเรียบร้อย",
      at: new Date().toISOString(),
    });

    const updatedGift = state.gifts.find((g) => g.id === targetGift.id)!;
    expect(updatedGift.status).toBe("จัดส่งแล้ว");
    expect(updatedGift.carrier).toBe("Kerry Express");
    expect(updatedGift.trackingNumber).toBe("KEX99887766");
    expect(updatedGift.shippedAt).toBeDefined();

    // Verify selector count changes
    expect(selectGiftsToShip(state).length).toBe(giftsToShip.length - 1);
    expect(selectShippedGifts(state).length).toBe(initialShipCount + 1);
  });
});
