/**
 * In-memory app store. One reducer, organized by domain sections.
 * Later rounds: add a new slice to AppState, new Action variants, a reducer case
 * block and action creators in the matching "domain" section.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, type ReactNode } from "react";
import {
  giftTasks as seedGifts,
  members as seedMembers,
  onlineOrders as seedOrders,
  products as seedProducts,
  returnRequests as seedReturns,
  warehouses as seedWarehouses,
  initialCategories as seedCategories,
  purchaseOrders as seedPO,
  initialStockAdjustments as seedAdjustments,
  initialLowStockNotifications as seedNotifications,
  supplierCompanies as seedCompanies,
  supplierAgents as seedAgents,
  quotations as seedQuotations,
  purchaseRequisitions as seedPRs,
  paymentRequests as seedPayments,
  agentReceipts as seedReceipts,
  initialPromotions as seedPromotions,
  initialStoreSettings as seedSettings,
  salesLast7Days,
  staffUsers,
  orderSubtotal,
  orderTotal,
  type GiftTask,
  type Member,
  type OnlineOrder,
  type OrderStatus,
  type Product,
  type Receipt,
  type ReturnRequest,
  type RoleKey,
  type StaffUser,
  type Warehouse,
  type CategoryItem,
  type PurchaseOrder,
  type StockAdjustment,
  type LowStockNotification,
  type LowStockNotificationItem,
  type SupplierCompany,
  type SupplierAgent,
  type Quotation,
  type QuotationItem,
  type PurchaseRequisition,
  type PurchaseRequisitionLine,
  type PRStatus,
  type PaymentRequest,
  type PaymentRequestStatus,
  type PaymentType,
  type AgentReceipt,
  type PromotionItem,
  type NewsType,
  type NewsStatus,
  type OnlineStoreSettings,
  type ShippingChannel,
  type BankAccount,
  type PromptPaySetting,
  type PointRateSetting,
  type PaymentTimeoutSetting,
  type EmployeeHistoryRecord,
} from "./mock-data";
import { pointsEarnedFor } from "./pos";

/* ───────────────────────── State ───────────────────────── */

export interface AppState {
  session: { user: StaffUser; signedIn: boolean };
  catalog: { products: Product[] };
  warehouses: Warehouse[];
  categories: CategoryItem[];
  purchaseOrders: PurchaseOrder[];
  stockAdjustments: StockAdjustment[];
  lowStockNotifications: LowStockNotification[];
  members: Member[];
  orders: OnlineOrder[];
  returns: ReturnRequest[];
  gifts: GiftTask[];
  sales: { receipts: Receipt[]; seq: number };
  // Round 3 Purchasing slices
  supplierCompanies: SupplierCompany[];
  supplierAgents: SupplierAgent[];
  quotations: Quotation[];
  purchaseRequisitions: PurchaseRequisition[];
  paymentRequests: PaymentRequest[];
  agentReceipts: AgentReceipt[];
  // Round 3 Part 2 Manager & Owner slices
  promotions: PromotionItem[];
  storeSettings: OnlineStoreSettings;
  employees: StaffUser[];
}

const SESSION_STORAGE_KEY = "rung_aroon_session";

const getSavedSession = (): { user: StaffUser; signedIn: boolean } | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.signedIn === "boolean" && parsed.user) {
      return parsed;
    }
  } catch {
    // fallback
  }
  return null;
};

export const createInitialState = (): AppState => ({
  session: getSavedSession() ?? { user: staffUsers[0], signedIn: false },
  catalog: { products: seedProducts.map((p) => ({ ...p })) },
  warehouses: seedWarehouses.map((w) => ({ ...w })),
  categories: seedCategories.map((c) => ({ ...c })),
  purchaseOrders: seedPO.map((p) => ({ ...p, lines: p.lines.map((l) => ({ ...l })) })),
  stockAdjustments: seedAdjustments.map((a) => ({ ...a })),
  lowStockNotifications: seedNotifications.map((n) => ({
    ...n,
    items: n.items.map((i) => ({ ...i })),
  })),
  members: seedMembers.map((m) => ({ ...m })),
  orders: seedOrders.map((o) => ({ ...o, history: [...o.history] })),
  returns: seedReturns.map((r) => ({ ...r })),
  gifts: seedGifts.map((g) => ({ ...g })),
  sales: { receipts: [], seq: 1 },
  // Round 3 Purchasing state init
  supplierCompanies: seedCompanies.map((c) => ({ ...c })),
  supplierAgents: seedAgents.map((a) => ({ ...a })),
  quotations: seedQuotations.map((q) => ({ ...q, items: q.items.map((i) => ({ ...i })) })),
  purchaseRequisitions: seedPRs.map((pr) => ({ ...pr, lines: pr.lines.map((l) => ({ ...l })) })),
  paymentRequests: seedPayments.map((p) => ({ ...p })),
  agentReceipts: seedReceipts.map((r) => ({ ...r })),
  // Round 3 Part 2 Manager & Owner state init
  promotions: seedPromotions.map((p) => ({ ...p })),
  storeSettings: JSON.parse(JSON.stringify(seedSettings)),
  employees: staffUsers.map((u) => ({ ...u, history: u.history ? [...u.history] : [] })),
});

/* ───────────────────────── Actions ───────────────────────── */

export type Action =
  // session
  | { type: "session/login"; user: StaffUser }
  | { type: "session/logout" }
  | { type: "session/switchRole"; role: RoleKey }
  // pos
  | { type: "pos/completeSale"; receipt: Receipt }
  // members
  | { type: "members/add"; member: Member }
  // orders
  | { type: "orders/setStatus"; orderId: string; status: OrderStatus; at: string; note?: string }
  // returns
  | { type: "returns/decide"; id: string; approve: boolean; note?: string; at: string }
  // gifts
  | { type: "gifts/markPrepared"; id: string; at: string }
  // warehouses
  | { type: "warehouses/add"; warehouse: Warehouse }
  | { type: "warehouses/update"; id: string; name: string; location: string; note?: string; phone?: string; manager?: string }
  | { type: "warehouses/delete"; id: string }
  // categories
  | { type: "categories/add"; category: CategoryItem }
  | { type: "categories/update"; id: string; name: string; warehouseId: string; description?: string }
  | { type: "categories/delete"; id: string }
  // products & catalog
  | { type: "catalog/addProduct"; product: Product }
  | { type: "catalog/updateProduct"; id: string; updates: Partial<Product> }
  | { type: "catalog/deleteProduct"; id: string }
  // stock management
  | { type: "stock/adjust"; record: StockAdjustment }
  | { type: "stock/sendNotification"; notification: LowStockNotification }
  // fulfillment (round 2 part 3)
  | { type: "orders/startPacking"; orderId: string; at: string }
  | { type: "orders/togglePackedItem"; orderId: string; productId: string }
  | { type: "orders/ship"; orderId: string; carrier: string; trackingNumber: string; at: string; note?: string }
  | { type: "orders/setDeliveryResult"; orderId: string; status: "ส่งสำเร็จ" | "ส่งไม่สำเร็จ" | "ตีกลับ"; at: string; note?: string }
  // returns receipt (round 2 part 3)
  | { type: "returns/receive"; id: string; at: string; note?: string }
  // gifts shipping (round 2 part 4)
  | { type: "gifts/markShipped"; id: string; carrier?: string; trackingNumber?: string; note?: string; at: string }
  // receiving (round 2 part 4)
  | {
      type: "purchaseOrders/receive";
      poId: string;
      lineResults: {
        productId: string;
        deliveredQty: number;
        checkStatus: "ถูกต้อง" | "ไม่ถูกต้อง";
        note?: string;
      }[];
      receivingNote?: string;
      at: string;
    }
  // purchasing suppliers (round 3 part 1)
  | { type: "suppliers/addCompany"; company: SupplierCompany }
  | { type: "suppliers/updateCompany"; id: string; updates: Partial<SupplierCompany> }
  | { type: "suppliers/deleteCompany"; id: string }
  | { type: "suppliers/addAgent"; agent: SupplierAgent }
  | { type: "suppliers/updateAgent"; id: string; updates: Partial<SupplierAgent> }
  | { type: "suppliers/deleteAgent"; id: string }
  // purchasing quotations
  | { type: "quotations/add"; quotation: Quotation }
  | { type: "quotations/update"; id: string; updates: Partial<Quotation> }
  | { type: "quotations/delete"; id: string }
  // purchasing requisitions (PR)
  | { type: "requisitions/add"; pr: PurchaseRequisition }
  | { type: "requisitions/updateStatus"; id: string; status: PRStatus; rejectionReason?: string; at: string; by: string }
  | { type: "requisitions/convertToPO"; prId: string; newPO: PurchaseOrder }
  | { type: "requisitions/delete"; id: string }
  // purchasing payments & receipts
  | { type: "payments/addRequest"; request: PaymentRequest }
  | { type: "payments/updateStatus"; id: string; status: PaymentRequestStatus; rejectionReason?: string; at: string; by: string }
  | { type: "payments/addReceipt"; receipt: AgentReceipt; paymentRequestId?: string }
  // manager & owner actions (round 3 part 2)
  | { type: "promotions/add"; promotion: PromotionItem }
  | { type: "promotions/update"; id: string; updates: Partial<PromotionItem> }
  | { type: "promotions/delete"; id: string }
  | { type: "settings/update"; settings: OnlineStoreSettings }
  | { type: "employees/add"; employee: StaffUser }
  | { type: "employees/update"; id: string; updates: Partial<StaffUser> }
  | { type: "employees/resetPassword"; id: string; tempPass: string; at: string }
  | { type: "receipts/archive"; id: string; at: string; by: string };

const setOrderStatus = (
  orders: OnlineOrder[],
  orderId: string,
  status: OrderStatus,
  at: string,
  by: string,
  note?: string,
) =>
  orders.map((o) =>
    o.id === orderId ? { ...o, status, history: [...o.history, { at, status, by, note }] } : o,
  );

export function appReducer(state: AppState, action: Action): AppState {
  const by = state.session.user.name;
  switch (action.type) {
    /* session */
    case "session/login":
      return { ...state, session: { user: action.user, signedIn: true } };
    case "session/logout":
      return { ...state, session: { ...state.session, signedIn: false } };
    case "session/switchRole": {
      const user =
        state.employees.find((u) => u.role === action.role) ||
        staffUsers.find((u) => u.role === action.role) ||
        state.session.user;
      return { ...state, session: { user, signedIn: true } };
    }

    /* pos */
    case "pos/completeSale": {
      const r = action.receipt;
      const qtyById = new Map(r.lines.map((l) => [l.productId, l.qty]));
      return {
        ...state,
        catalog: {
          products: state.catalog.products.map((p) =>
            qtyById.has(p.id) ? { ...p, stock: Math.max(0, p.stock - qtyById.get(p.id)!) } : p,
          ),
        },
        members: r.memberCode
          ? state.members.map((m) =>
              m.code === r.memberCode
                ? {
                    ...m,
                    points: Math.max(0, m.points - (r.pointsUsed || 0)) + (r.pointsEarned || 0),
                    totalSpend: (m.totalSpend || 0) + r.net,
                  }
                : m,
            )
          : state.members,
        sales: { receipts: [r, ...state.sales.receipts], seq: state.sales.seq + 1 },
      };
    }

    /* members */
    case "members/add":
      return {
        ...state,
        members: [action.member, ...state.members],
      };

    /* orders */
    case "orders/setStatus": {
      const targetOrder = state.orders.find((o) => o.id === action.orderId);
      if (!targetOrder) return state;

      if (action.status === "ชำระแล้ว") {
        // Idempotency: if already paid or a receipt exists for this order, do not duplicate deduction or points
        const alreadyApproved =
          targetOrder.status === "ชำระแล้ว" ||
          state.sales.receipts.some((r) => r.orderId === targetOrder.id);

        if (alreadyApproved) {
          return state;
        }

        // 1. Deduct stock for each order line from catalog (clamp at 0)
        const lineQtyMap = new Map<string, number>();
        for (const line of targetOrder.lines) {
          lineQtyMap.set(line.productId, (lineQtyMap.get(line.productId) || 0) + line.qty);
        }

        const updatedProducts = state.catalog.products.map((p) => {
          if (!lineQtyMap.has(p.id)) return p;
          const deduct = lineQtyMap.get(p.id)!;
          return { ...p, stock: Math.max(0, p.stock - deduct) };
        });

        // 2. Log stock adjustment with reason "ขายออนไลน์ <orderId>"
        const newAdjustments: StockAdjustment[] = targetOrder.lines.map((line, idx) => {
          const p = state.catalog.products.find((prod) => prod.id === line.productId);
          const cat = p ? state.categories.find((c) => c.name === p.category) : undefined;
          const wh = cat ? state.warehouses.find((w) => w.id === cat.warehouseId) : state.warehouses[0];
          const prevStock = p?.stock ?? 0;
          const countedStock = Math.max(0, prevStock - line.qty);
          const diff = countedStock - prevStock;

          return {
            id: `ADJ-ORD-${targetOrder.id.replace(/[^a-zA-Z0-9]/g, "")}-${idx + 1}`,
            productId: line.productId,
            productName: p?.name ?? line.name,
            sku: p?.sku ?? line.productId,
            warehouseId: wh?.id ?? "WH-01",
            warehouseName: wh?.name ?? "โกดังหลัก (ศิลา)",
            previousStock: prevStock,
            countedStock,
            diff,
            reason: `ขายออนไลน์ ${targetOrder.id}`,
            countedBy: by,
            createdAt: action.at,
          };
        });

        // 3. Create a sales record/receipt linked to the order
        const subtotal = orderSubtotal(targetOrder);
        const net = orderTotal(targetOrder);
        const pointsUsed = targetOrder.pointsUsed ?? 0;
        const pointsDiscount = targetOrder.pointsDiscount ?? 0;
        const earnStepBaht = state.storeSettings.pointRate.earnStepBaht ?? 50;
        const earnPointsPerStep = state.storeSettings.pointRate.earnPointsPerStep ?? 5;
        const pointsEarned = pointsEarnedFor(net, { earnStepBaht, earnPointsPerStep });

        const d = new Date(action.at || Date.now());
        const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
        const newReceipt: Receipt = {
          id: `RC-${ymd}-${String(87 + state.sales.seq).padStart(4, "0")}`,
          createdAt: action.at,
          cashier: by || "เจ้าหน้าที่ขายออนไลน์",
          lines: targetOrder.lines.map((l) => ({
            productId: l.productId,
            name: l.name,
            price: l.price,
            qty: l.qty,
          })),
          subtotal,
          discount: pointsDiscount,
          net,
          cash: net,
          change: 0,
          memberCode: targetOrder.memberCode || undefined,
          memberName: targetOrder.customerName || undefined,
          pointsUsed,
          pointsEarned,
          receiptType: targetOrder.receiptType === "เต็ม" ? "full" : "short",
          buyer:
            targetOrder.receiptType === "เต็ม"
              ? {
                  name: targetOrder.buyerName || targetOrder.customerName,
                  address: targetOrder.buyerAddress || targetOrder.address,
                  taxId: targetOrder.buyerTaxId || "",
                }
              : undefined,
          orderId: targetOrder.id,
          paymentMethod: "เงินสด",
        };

        // 4. Deduct pointsUsed and award earned points based on net total, and add totalSpend
        const updatedMembers = targetOrder.memberCode
          ? state.members.map((m) =>
              m.code === targetOrder.memberCode
                ? {
                    ...m,
                    points: Math.max(0, m.points - pointsUsed) + pointsEarned,
                    totalSpend: (m.totalSpend || 0) + net,
                  }
                : m,
            )
          : state.members;

        // 5. Update order status
        const updatedOrders = setOrderStatus(
          state.orders,
          action.orderId,
          "ชำระแล้ว",
          action.at,
          by,
          action.note,
        );

        return {
          ...state,
          catalog: { products: updatedProducts },
          stockAdjustments: [...newAdjustments, ...state.stockAdjustments],
          sales: {
            receipts: [newReceipt, ...state.sales.receipts],
            seq: state.sales.seq + 1,
          },
          members: updatedMembers,
          orders: updatedOrders,
        };
      }

      return {
        ...state,
        orders: setOrderStatus(state.orders, action.orderId, action.status, action.at, by, action.note),
      };
    }

    /* returns */
    case "returns/decide": {
      const req = state.returns.find((r) => r.id === action.id);
      if (!req || req.status !== "รอพิจารณา") return state;
      const returns = state.returns.map((r) =>
        r.id === action.id
          ? {
              ...r,
              status: action.approve ? ("อนุมัติ" as const) : ("ไม่อนุมัติ" as const),
              decidedAt: action.at,
              decidedBy: by,
              decisionNote: action.note,
            }
          : r,
      );
      const orders =
        action.approve && req.kind === "ยกเลิกคำสั่งซื้อ"
          ? setOrderStatus(state.orders, req.orderId, "ยกเลิก", action.at, by, `อนุมัติคำขอ ${req.id}`)
          : state.orders;
      return { ...state, returns, orders };
    }

    /* gifts */
    case "gifts/markPrepared":
      return {
        ...state,
        gifts: state.gifts.map((g) =>
          g.id === action.id ? { ...g, status: "จัดเตรียมแล้ว", preparedAt: action.at, preparedBy: by } : g,
        ),
      };
    case "gifts/markShipped":
      return {
        ...state,
        gifts: state.gifts.map((g) =>
          g.id === action.id
            ? {
                ...g,
                status: "จัดส่งแล้ว",
                shippedAt: action.at,
                shippedBy: by,
                carrier: action.carrier,
                trackingNumber: action.trackingNumber,
                deliveryNote: action.note,
              }
            : g,
        ),
      };

    /* warehouses */
    case "warehouses/add":
      return {
        ...state,
        warehouses: [...state.warehouses, action.warehouse],
      };
    case "warehouses/update":
      return {
        ...state,
        warehouses: state.warehouses.map((w) =>
          w.id === action.id
            ? {
                ...w,
                name: action.name,
                location: action.location,
                note: action.note ?? w.note,
                phone: action.phone ?? w.phone,
                manager: action.manager ?? w.manager,
              }
            : w,
        ),
      };
    case "warehouses/delete":
      return {
        ...state,
        warehouses: state.warehouses.filter((w) => w.id !== action.id),
      };

    /* categories */
    case "categories/add":
      return {
        ...state,
        categories: [...state.categories, action.category],
      };
    case "categories/update":
      return {
        ...state,
        categories: state.categories.map((c) =>
          c.id === action.id
            ? {
                ...c,
                name: action.name,
                warehouseId: action.warehouseId,
                description: action.description ?? c.description,
              }
            : c,
        ),
      };
    case "categories/delete":
      return {
        ...state,
        categories: state.categories.filter((c) => c.id !== action.id),
      };

    /* products & catalog */
    case "catalog/addProduct":
      return {
        ...state,
        catalog: {
          products: [...state.catalog.products, action.product],
        },
      };
    case "catalog/updateProduct":
      return {
        ...state,
        catalog: {
          products: state.catalog.products.map((p) =>
            p.id === action.id ? { ...p, ...action.updates } : p,
          ),
        },
      };
    case "catalog/deleteProduct":
      return {
        ...state,
        catalog: {
          products: state.catalog.products.filter((p) => p.id !== action.id),
        },
      };

    /* stock management */
    case "stock/adjust": {
      const rec = action.record;
      return {
        ...state,
        catalog: {
          products: state.catalog.products.map((p) =>
            p.id === rec.productId ? { ...p, stock: rec.countedStock } : p,
          ),
        },
        stockAdjustments: [rec, ...state.stockAdjustments],
      };
    }
    case "stock/sendNotification":
      return {
        ...state,
        lowStockNotifications: [action.notification, ...state.lowStockNotifications],
      };

    /* fulfillment (round 2 part 3) */
    case "orders/startPacking":
      return {
        ...state,
        orders: state.orders.map((o) =>
          o.id === action.orderId
            ? {
                ...o,
                status: "กำลังเตรียม" as const,
                packedLines: o.packedLines ?? [],
                history: [
                  ...o.history,
                  { at: action.at, status: "กำลังเตรียม" as const, by, note: "เริ่มจัดเตรียมและแพ็กสินค้า" },
                ],
              }
            : o,
        ),
      };

    case "orders/togglePackedItem":
      return {
        ...state,
        orders: state.orders.map((o) => {
          if (o.id !== action.orderId) return o;
          const current = o.packedLines ?? [];
          const exists = current.includes(action.productId);
          const next = exists
            ? current.filter((id) => id !== action.productId)
            : [...current, action.productId];
          return { ...o, packedLines: next };
        }),
      };

    case "orders/ship":
      return {
        ...state,
        orders: state.orders.map((o) =>
          o.id === action.orderId
            ? {
                ...o,
                status: "จัดส่งแล้ว" as const,
                carrier: action.carrier,
                trackingNumber: action.trackingNumber,
                shippedAt: action.at,
                history: [
                  ...o.history,
                  {
                    at: action.at,
                    status: "จัดส่งแล้ว" as const,
                    by,
                    note: action.note
                      ? `จัดส่งผ่าน ${action.carrier} (${action.trackingNumber}) - ${action.note}`
                      : `จัดส่งผ่าน ${action.carrier} (${action.trackingNumber})`,
                  },
                ],
              }
            : o,
        ),
      };

    case "orders/setDeliveryResult":
      return {
        ...state,
        orders: state.orders.map((o) =>
          o.id === action.orderId
            ? {
                ...o,
                status: action.status,
                deliveredAt: action.at,
                deliveryNote: action.note,
                history: [
                  ...o.history,
                  {
                    at: action.at,
                    status: action.status,
                    by,
                    note: action.note
                      ? `ผลการจัดส่ง: ${action.status} (${action.note})`
                      : `ผลการจัดส่ง: ${action.status}`,
                  },
                ],
              }
            : o,
        ),
      };

    /* returns receipt (round 2 part 3) */
    case "returns/receive": {
      const targetReturn = state.returns.find((r) => r.id === action.id);
      if (!targetReturn || targetReturn.receivedAt) return state;

      const qtyByProd = new Map(targetReturn.lines.map((l) => [l.productId, l.qty]));

      // 1. Restock products in catalog
      const updatedProducts = state.catalog.products.map((p) => {
        if (!qtyByProd.has(p.id)) return p;
        const restockQty = qtyByProd.get(p.id)!;
        return { ...p, stock: p.stock + restockQty };
      });

      // 2. Mark return as received
      const updatedReturns = state.returns.map((r) =>
        r.id === action.id
          ? {
              ...r,
              receivedAt: action.at,
              receivedBy: by,
              restocked: true,
              decisionNote: r.decisionNote
                ? `${r.decisionNote} | รับเข้าคลังและคืนสต็อกเรียบร้อยโดย ${by}`
                : `รับเข้าคลังและคืนสต็อกเรียบร้อยโดย ${by}${action.note ? ` (${action.note})` : ""}`,
            }
          : r,
      );

      // 3. Log stock adjustments
      const newAdjustments: StockAdjustment[] = targetReturn.lines.map((l, idx) => {
        const p = state.catalog.products.find((prod) => prod.id === l.productId);
        const cat = p ? state.categories.find((c) => c.name === p.category) : undefined;
        const wh = cat ? state.warehouses.find((w) => w.id === cat.warehouseId) : undefined;
        const prevStock = p?.stock ?? 0;
        return {
          id: `ADJ-RET-${Date.now().toString().slice(-4)}${idx + 1}`,
          productId: l.productId,
          productName: l.name,
          sku: p?.sku ?? l.productId,
          warehouseId: wh?.id ?? "WH-01",
          warehouseName: wh?.name ?? "โกดังหลัก (หลังร้าน)",
          previousStock: prevStock,
          countedStock: prevStock + l.qty,
          diff: l.qty,
          reason: `รับสินค้าคืนจากลูกค้า (${targetReturn.customerName} - คำขอ ${targetReturn.id})`,
          countedBy: by,
          note: action.note,
          createdAt: action.at,
        };
      });

      return {
        ...state,
        catalog: { products: updatedProducts },
        returns: updatedReturns,
        stockAdjustments: [...newAdjustments, ...state.stockAdjustments],
      };
    }

    /* receiving (round 2 part 4) */
    case "purchaseOrders/receive": {
      const targetPO = state.purchaseOrders.find((p) => p.id === action.poId);
      if (!targetPO) return state;

      const resultMap = new Map(action.lineResults.map((r) => [r.productId, r]));

      // 1. Separate correct lines from incorrect lines
      const correctLines: { productId: string; qty: number }[] = [];
      const discrepancies: PODiscrepancyItem[] = [];

      for (const line of targetPO.lines) {
        const result = resultMap.get(line.productId);
        const delivered = result?.deliveredQty ?? line.qty;
        const status = result?.checkStatus ?? "ถูกต้อง";
        const note = result?.note;

        if (status === "ถูกต้อง") {
          correctLines.push({ productId: line.productId, qty: delivered });
        } else {
          discrepancies.push({
            productId: line.productId,
            productName: line.name,
            sku: line.sku,
            orderedQty: line.qty,
            deliveredQty: delivered,
            discrepancyQty: Math.max(0, line.qty - delivered) || line.qty,
            reason: note || "สินค้าไม่ถูกต้องตามรายการสั่งซื้อ",
            note,
          });
        }
      }

      // 2. Only correct lines are added to stock
      const addStockMap = new Map(correctLines.map((c) => [c.productId, c.qty]));
      const updatedProducts = state.catalog.products.map((p) => {
        if (!addStockMap.has(p.id)) return p;
        const addedQty = addStockMap.get(p.id)!;
        return { ...p, stock: p.stock + addedQty };
      });

      // 3. Log stock adjustments for accepted lines
      const newStockAdjustments: StockAdjustment[] = correctLines.map((c, idx) => {
        const p = state.catalog.products.find((prod) => prod.id === c.productId);
        const cat = p ? state.categories.find((catItem) => catItem.name === p.category) : undefined;
        const wh = cat ? state.warehouses.find((w) => w.id === cat.warehouseId) : undefined;
        const prevStock = p?.stock ?? 0;
        return {
          id: `ADJ-RCV-${Date.now().toString().slice(-4)}${idx + 1}`,
          productId: c.productId,
          productName: p?.name ?? c.productId,
          sku: p?.sku ?? c.productId,
          warehouseId: wh?.id ?? targetPO.warehouseId,
          warehouseName: wh?.name ?? targetPO.warehouseName,
          previousStock: prevStock,
          countedStock: prevStock + c.qty,
          diff: c.qty,
          reason: `ตรวจรับสินค้าเข้าคลังตามใบสั่งซื้อ ${targetPO.poNumber} (${targetPO.supplierName})`,
          countedBy: by,
          createdAt: action.at,
        };
      });

      // 4. Create purchasing notification if any discrepancies exist
      let updatedNotifications = state.lowStockNotifications;
      if (discrepancies.length > 0) {
        const notifId = `NOTIF-DISC-${Date.now().toString().slice(-4)}`;
        const notification: LowStockNotification = {
          id: notifId,
          createdAt: action.at,
          sentBy: by,
          itemCount: discrepancies.length,
          items: discrepancies.map((d) => {
            const p = state.catalog.products.find((prod) => prod.id === d.productId);
            return {
              productId: d.productId,
              sku: d.sku,
              name: d.productName,
              category: p?.category ?? "",
              warehouseId: targetPO.warehouseId,
              warehouseName: targetPO.warehouseName,
              currentStock: p?.stock ?? 0,
              reorderPoint: p?.reorderPoint ?? 10,
              suggestedQty: d.discrepancyQty,
            };
          }),
          status: "รอจัดซื้อดำเนินการ",
          note: `แจ้งส่งคืนตัวแทน ${targetPO.supplierName} จาก PO ${targetPO.poNumber}: ${discrepancies.map((d) => `${d.productName} (${d.reason})`).join(", ")}`,
        };
        updatedNotifications = [notification, ...updatedNotifications];
      }

      // 5. Update purchase orders state
      const allCorrect = targetPO.lines.every((l) => resultMap.get(l.productId)?.checkStatus === "ถูกต้อง");
      const poStatus: POStatus = allCorrect ? "รับครบแล้ว" : "รับสินค้าบางส่วน";

      const updatedLines: PurchaseOrderLine[] = targetPO.lines.map((l) => {
        const res = resultMap.get(l.productId);
        const p = state.catalog.products.find((prod) => prod.id === l.productId);
        const cat = p ? state.categories.find((c) => c.name === p.category) : undefined;
        const wh = cat ? state.warehouses.find((w) => w.id === cat.warehouseId) : undefined;

        return {
          ...l,
          receivedQty: res?.deliveredQty ?? l.qty,
          checkStatus: res?.checkStatus ?? "ถูกต้อง",
          note: res?.note,
          warehouseId: wh?.id ?? targetPO.warehouseId,
          warehouseName: wh?.name ?? targetPO.warehouseName,
        };
      });

      const updatedPOs = state.purchaseOrders.map((p) =>
        p.id === action.poId
          ? {
              ...p,
              status: poStatus,
              lines: updatedLines,
              receivedAt: action.at,
              receivedBy: by,
              receivingNote: action.receivingNote,
              discrepancies: discrepancies.length > 0 ? discrepancies : undefined,
            }
          : p,
      );

      return {
        ...state,
        catalog: { products: updatedProducts },
        stockAdjustments: [...newStockAdjustments, ...state.stockAdjustments],
        lowStockNotifications: updatedNotifications,
        purchaseOrders: updatedPOs,
      };
    }

    /* purchasing suppliers (round 3 part 1) */
    case "suppliers/addCompany":
      return { ...state, supplierCompanies: [...state.supplierCompanies, action.company] };
    case "suppliers/updateCompany":
      return {
        ...state,
        supplierCompanies: state.supplierCompanies.map((c) => (c.id === action.id ? { ...c, ...action.updates } : c)),
      };
    case "suppliers/deleteCompany":
      return {
        ...state,
        supplierCompanies: state.supplierCompanies.filter((c) => c.id !== action.id),
        supplierAgents: state.supplierAgents.filter((a) => a.companyId !== action.id),
      };
    case "suppliers/addAgent":
      return { ...state, supplierAgents: [...state.supplierAgents, action.agent] };
    case "suppliers/updateAgent":
      return {
        ...state,
        supplierAgents: state.supplierAgents.map((a) => (a.id === action.id ? { ...a, ...action.updates } : a)),
      };
    case "suppliers/deleteAgent":
      return { ...state, supplierAgents: state.supplierAgents.filter((a) => a.id !== action.id) };

    /* purchasing quotations */
    case "quotations/add":
      return { ...state, quotations: [action.quotation, ...state.quotations] };
    case "quotations/update":
      return {
        ...state,
        quotations: state.quotations.map((q) => (q.id === action.id ? { ...q, ...action.updates } : q)),
      };
    case "quotations/delete":
      return { ...state, quotations: state.quotations.filter((q) => q.id !== action.id) };

    /* purchasing requisitions (PR) */
    case "requisitions/add":
      return { ...state, purchaseRequisitions: [action.pr, ...state.purchaseRequisitions] };
    case "requisitions/updateStatus":
      return {
        ...state,
        purchaseRequisitions: state.purchaseRequisitions.map((pr) =>
          pr.id === action.id
            ? {
                ...pr,
                status: action.status,
                rejectionReason: action.rejectionReason,
                approvedBy: action.status === "อนุมัติ" ? action.by : pr.approvedBy,
                approvedAt: action.status === "อนุมัติ" || action.status === "ไม่อนุมัติ" ? action.at : pr.approvedAt,
              }
            : pr,
        ),
      };
    case "requisitions/convertToPO":
      return {
        ...state,
        purchaseOrders: [action.newPO, ...state.purchaseOrders],
        purchaseRequisitions: state.purchaseRequisitions.map((pr) =>
          pr.id === action.prId ? { ...pr, status: "แปลงเป็น PO แล้ว", poId: action.newPO.id } : pr,
        ),
      };
    case "requisitions/delete":
      return {
        ...state,
        purchaseRequisitions: state.purchaseRequisitions.filter((pr) => pr.id !== action.id),
      };

    /* purchasing payments & receipts */
    case "payments/addRequest":
      return {
        ...state,
        paymentRequests: [action.request, ...state.paymentRequests],
        purchaseOrders: state.purchaseOrders.map((po) =>
          po.id === action.request.poId ? { ...po, paymentStatus: "รออนุมัติจ่าย" } : po,
        ),
      };
    case "payments/updateStatus":
      return {
        ...state,
        paymentRequests: state.paymentRequests.map((p) =>
          p.id === action.id
            ? {
                ...p,
                status: action.status,
                rejectionReason: action.rejectionReason,
                approvedBy: action.status === "อนุมัติจ่ายแล้ว" ? action.by : p.approvedBy,
                approvedAt: action.status === "อนุมัติจ่ายแล้ว" ? action.at : p.approvedAt,
                paidAt: action.status === "จ่ายเงินแล้ว" ? action.at : p.paidAt,
              }
            : p,
        ),
        purchaseOrders: state.purchaseOrders.map((po) => {
          const req = state.paymentRequests.find((r) => r.id === action.id);
          if (req && po.id === req.poId) {
            return {
              ...po,
              paymentStatus:
                action.status === "จ่ายเงินแล้ว"
                  ? "จ่ายเงินแล้ว"
                  : action.status === "อนุมัติจ่ายแล้ว"
                    ? "อนุมัติจ่ายแล้ว"
                    : po.paymentStatus,
            };
          }
          return po;
        }),
      };
    case "payments/addReceipt":
      return {
        ...state,
        agentReceipts: [action.receipt, ...state.agentReceipts],
        paymentRequests: action.paymentRequestId
          ? state.paymentRequests.map((p) =>
              p.id === action.paymentRequestId
                ? {
                    ...p,
                    receiptId: action.receipt.id,
                    receiptNumber: action.receipt.receiptNumber,
                    receiptFileName: action.receipt.fileName,
                  }
                : p,
            )
          : state.paymentRequests,
      };

    /* promotions & news (round 3 part 2) */
    case "promotions/add":
      return { ...state, promotions: [action.promotion, ...state.promotions] };
    case "promotions/update":
      return {
        ...state,
        promotions: state.promotions.map((p) => (p.id === action.id ? { ...p, ...action.updates } : p)),
      };
    case "promotions/delete":
      return { ...state, promotions: state.promotions.filter((p) => p.id !== action.id) };

    /* settings (round 3 part 2) */
    case "settings/update":
      return { ...state, storeSettings: action.settings };

    /* employees (round 3 part 2) */
    case "employees/add":
      return { ...state, employees: [...state.employees, action.employee] };
    case "employees/update":
      return {
        ...state,
        employees: state.employees.map((e) => (e.id === action.id ? { ...e, ...action.updates } : e)),
      };
    case "employees/resetPassword":
      return {
        ...state,
        employees: state.employees.map((e) =>
          e.id === action.id
            ? {
                ...e,
                password: action.tempPass,
                history: [
                  {
                    id: `H-RESET-${Date.now().toString().slice(-4)}`,
                    at: action.at,
                    action: "รีเซ็ตรหัสผ่าน",
                    detail: "ผู้จัดการทำการรีเซ็ตรหัสผ่านชั่วคราวให้ผู้ใช้",
                    category: "auth",
                  },
                  ...(e.history ?? []),
                ],
              }
            : e,
        ),
      };

    /* receipts archiving (round 3 part 2) */
    case "receipts/archive":
      return {
        ...state,
        agentReceipts: state.agentReceipts.map((r) =>
          r.id === action.id
            ? { ...r, archiveStatus: "จัดเก็บแล้ว", archivedAt: action.at, archivedBy: action.by }
            : r,
        ),
      };
  }
}

/* ───────────────────────── Context ───────────────────────── */

type LoginResult = { ok: true; user: StaffUser } | { ok: false; error: string };

export interface StoreActions {
  // session
  login: (username: string, password: string) => LoginResult;
  logout: () => void;
  switchRole: (role: RoleKey) => void;
  // pos & members
  completeSale: (draft: Omit<Receipt, "id" | "createdAt" | "cashier">) => Receipt;
  addMember: (data: {
    name: string;
    phone: string;
    birthday?: string;
    address?: string;
  }) => Member;
  // orders
  approvePayment: (orderId: string) => void;
  rejectPayment: (orderId: string, note: string) => void;
  // returns
  decideReturn: (id: string, approve: boolean, note?: string) => void;
  // gifts
  markGiftPrepared: (id: string) => void;
  // warehouses
  addWarehouse: (data: { name: string; location: string; note?: string; phone?: string; manager?: string }) => Warehouse;
  updateWarehouse: (id: string, data: { name: string; location: string; note?: string; phone?: string; manager?: string }) => void;
  deleteWarehouse: (id: string) => { ok: boolean; reason?: string };
  // categories
  addCategory: (data: { name: string; warehouseId: string; description?: string }) => { ok: boolean; error?: string };
  updateCategory: (id: string, data: { name: string; warehouseId: string; description?: string }) => { ok: boolean; error?: string };
  deleteCategory: (id: string) => { ok: boolean; reason?: string };
  // products
  addProduct: (draft: Omit<Product, "id">) => Product;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => { ok: boolean; reason?: string };
  // stock management
  recordStockCount: (data: {
    productId: string;
    countedStock: number;
    reason: string;
    countedBy?: string;
    note?: string;
  }) => StockAdjustment;
  sendLowStockToPurchasing: (note?: string) => LowStockNotification | null;
  // fulfillment (round 2 part 3)
  startPackingOrder: (orderId: string) => void;
  togglePackedItem: (orderId: string, productId: string) => void;
  shipOrder: (orderId: string, carrier: string, trackingNumber: string, note?: string) => void;
  setDeliveryResult: (orderId: string, status: "ส่งสำเร็จ" | "ส่งไม่สำเร็จ" | "ตีกลับ", note?: string) => void;
  // returns receipt (round 2 part 3)
  confirmReturnReceived: (returnId: string, note?: string) => { ok: boolean; reason?: string };
  // receiving & gifts (round 2 part 4)
  receivePurchaseOrder: (
    poId: string,
    lineResults: {
      productId: string;
      deliveredQty: number;
      checkStatus: "ถูกต้อง" | "ไม่ถูกต้อง";
      note?: string;
    }[],
    receivingNote?: string,
  ) => { ok: boolean; reason?: string };
  shipGift: (
    giftId: string,
    data?: { carrier?: string; trackingNumber?: string; note?: string },
  ) => { ok: boolean };
  // purchasing (round 3 part 1)
  addSupplierCompany: (data: Omit<SupplierCompany, "id">) => SupplierCompany;
  updateSupplierCompany: (id: string, updates: Partial<SupplierCompany>) => void;
  deleteSupplierCompany: (id: string) => { ok: boolean; reason?: string };
  addSupplierAgent: (data: Omit<SupplierAgent, "id">) => SupplierAgent;
  updateSupplierAgent: (id: string, updates: Partial<SupplierAgent>) => void;
  deleteSupplierAgent: (id: string) => { ok: boolean; reason?: string };
  addQuotation: (data: Omit<Quotation, "id" | "createdAt" | "createdBy">) => Quotation;
  updateQuotation: (id: string, updates: Partial<Quotation>) => void;
  deleteQuotation: (id: string) => { ok: boolean; reason?: string };
  addPurchaseRequisition: (
    data: Omit<PurchaseRequisition, "id" | "prNumber" | "requestedAt" | "requestedBy" | "status">,
  ) => PurchaseRequisition;
  decidePurchaseRequisition: (
    id: string,
    status: "อนุมัติ" | "ไม่อนุมัติ" | "APPROVED" | "REJECTED",
    rejectionReason?: string,
  ) => { ok: boolean };
  deletePurchaseRequisition: (id: string) => { ok: boolean };
  convertPRToPO: (
    prId: string,
    warehouseId: string,
    warehouseName: string,
    expectedDays?: number,
  ) => { ok: boolean; po?: PurchaseOrder; error?: string };
  requestPayment: (
    data: Omit<PaymentRequest, "id" | "requestedAt" | "requestedBy" | "status">,
  ) => { ok: boolean; request?: PaymentRequest; error?: string };
  decidePaymentRequest: (
    id: string,
    status: "อนุมัติจ่ายแล้ว" | "จ่ายเงินแล้ว" | "ปฏิเสธ",
    rejectionReason?: string,
  ) => { ok: boolean };
  uploadAgentReceipt: (
    receiptData: Omit<AgentReceipt, "id">,
    paymentRequestId?: string,
  ) => { ok: boolean; receipt?: AgentReceipt };
  // promotions & news (round 3 part 2)
  addPromotion: (data: Omit<PromotionItem, "id" | "createdAt" | "createdBy">) => PromotionItem;
  updatePromotion: (id: string, updates: Partial<PromotionItem>) => void;
  deletePromotion: (id: string) => { ok: boolean };
  // online settings (round 3 part 2)
  updateStoreSettings: (settings: OnlineStoreSettings) => void;
  // employees (round 3 part 2)
  addEmployee: (data: Omit<StaffUser, "id">) => StaffUser;
  updateEmployee: (id: string, updates: Partial<StaffUser>) => void;
  resetEmployeePassword: (id: string) => { ok: boolean; tempPassword?: string };
  // receipts archiving (round 3 part 2)
  archiveAgentReceipt: (id: string) => { ok: boolean };
}

const StoreContext = createContext<{ state: AppState; actions: StoreActions } | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, undefined, createInitialState);
  const now = () => new Date().toISOString();

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(state.session));
      } catch {
        // ignore
      }
    }
  }, [state.session]);

  const completeSale = useCallback<StoreActions["completeSale"]>(
    (draft) => {
      const d = new Date();
      const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
      const receipt: Receipt = {
        ...draft,
        id: `RC-${ymd}-${String(87 + state.sales.seq).padStart(4, "0")}`,
        createdAt: d.toISOString(),
        cashier: state.session.user.name,
      };
      dispatch({ type: "pos/completeSale", receipt });
      return receipt;
    },
    [state.sales.seq, state.session.user.name],
  );

  const addMember = useCallback<StoreActions["addMember"]>(
    (data) => {
      const numList = state.members
        .map((m) => {
          const match = m.code.match(/\d+/);
          return match ? parseInt(match[0], 10) : 0;
        })
        .filter((n) => !isNaN(n));
      const nextNum = (numList.length > 0 ? Math.max(...numList) : state.members.length) + 1;
      const code = `M${String(nextNum).padStart(4, "0")}`;

      const newMember: Member = {
        code,
        name: data.name.trim(),
        phone: data.phone.trim(),
        points: 0,
        birthday: data.birthday?.trim() || "",
        address: data.address?.trim() || "",
        joinedYear: new Date().getFullYear(),
        totalSpend: 0,
        tier: "ทั่วไป",
      };

      dispatch({ type: "members/add", member: newMember });
      return newMember;
    },
    [state.members],
  );

  const addWarehouse = useCallback<StoreActions["addWarehouse"]>(
    (data) => {
      const count = state.warehouses.length + 1;
      const id = `WH-${String(count).padStart(2, "0")}`;
      const code = `WH-0${count}`;
      const warehouse: Warehouse = {
        id,
        code,
        name: data.name.trim(),
        location: data.location.trim(),
        manager: data.manager?.trim() || state.session.user.name,
        phone: data.phone?.trim() || "081-000-0000",
        note: data.note?.trim() || "",
        createdAt: now(),
      };
      dispatch({ type: "warehouses/add", warehouse });
      return warehouse;
    },
    [state.warehouses.length, state.session.user.name],
  );

  const updateWarehouse = useCallback<StoreActions["updateWarehouse"]>(
    (id, data) => {
      dispatch({
        type: "warehouses/update",
        id,
        name: data.name.trim(),
        location: data.location.trim(),
        note: data.note?.trim(),
        phone: data.phone?.trim(),
        manager: data.manager?.trim(),
      });
    },
    [],
  );

  const deleteWarehouse = useCallback<StoreActions["deleteWarehouse"]>(
    (id) => {
      const assigned = state.categories.filter((c) => c.warehouseId === id);
      if (assigned.length > 0) {
        return {
          ok: false,
          reason: `ไม่สามารถลบโกดังนี้ได้ เนื่องจากมีหมวดหมู่สินค้า ${assigned.length} หมวดสังกัดอยู่ กรุณาย้ายหมวดหมู่ออกก่อน`,
        };
      }
      dispatch({ type: "warehouses/delete", id });
      return { ok: true };
    },
    [state.categories],
  );

  const addCategory = useCallback<StoreActions["addCategory"]>(
    (data) => {
      const trimmedName = data.name.trim();
      if (!trimmedName) {
        return { ok: false, error: "กรุณาระบุชื่อหมวดหมู่สินค้า" };
      }
      if (!data.warehouseId) {
        return { ok: false, error: "กรุณาเลือกโกดังที่สังกัด (1 หมวดหมู่ต้องสังกัด 1 โกดัง)" };
      }
      // Rule: Each category belongs to exactly ONE warehouse
      const existing = state.categories.find(
        (c) => c.name.toLowerCase() === trimmedName.toLowerCase(),
      );
      if (existing) {
        const wh = state.warehouses.find((w) => w.id === existing.warehouseId);
        return {
          ok: false,
          error: `หมวดหมู่ “${trimmedName}” สังกัดอยู่ที่ ${wh?.name ?? existing.warehouseId} แล้ว ไม่สามารถสังกัดโกดังซ้ำได้ (1 หมวดหมู่สังกัดได้เพียง 1 โกดังเท่านั้น)`,
        };
      }
      const newId = `CAT-${String(state.categories.length + 1).padStart(2, "0")}`;
      const category: CategoryItem = {
        id: newId,
        name: trimmedName,
        warehouseId: data.warehouseId,
        description: data.description?.trim(),
      };
      dispatch({ type: "categories/add", category });
      return { ok: true };
    },
    [state.categories, state.warehouses],
  );

  const updateCategory = useCallback<StoreActions["updateCategory"]>(
    (id, data) => {
      const trimmedName = data.name.trim();
      if (!trimmedName) {
        return { ok: false, error: "กรุณาระบุชื่อหมวดหมู่สินค้า" };
      }
      if (!data.warehouseId) {
        return { ok: false, error: "กรุณาเลือกโกดังที่สังกัด (1 หมวดหมู่ต้องสังกัด 1 โกดัง)" };
      }
      // Check if duplicate name in other categories
      const duplicate = state.categories.find(
        (c) => c.id !== id && c.name.toLowerCase() === trimmedName.toLowerCase(),
      );
      if (duplicate) {
        const wh = state.warehouses.find((w) => w.id === duplicate.warehouseId);
        return {
          ok: false,
          error: `ชื่อหมวดหมู่นี้สังกัดอยู่ที่ ${wh?.name ?? duplicate.warehouseId} แล้ว ไม่สามารถใช้ซ้ำได้`,
        };
      }
      dispatch({
        type: "categories/update",
        id,
        name: trimmedName,
        warehouseId: data.warehouseId,
        description: data.description?.trim(),
      });
      return { ok: true };
    },
    [state.categories, state.warehouses],
  );

  const deleteCategory = useCallback<StoreActions["deleteCategory"]>(
    (id) => {
      const target = state.categories.find((c) => c.id === id);
      if (!target) return { ok: false, reason: "ไม่พบหมวดหมู่สินค้านี้" };
      const productsInCat = state.catalog.products.filter((p) => p.category === target.name);
      if (productsInCat.length > 0) {
        return {
          ok: false,
          reason: `ไม่สามารถลบหมวดหมู่ “${target.name}” ได้ เนื่องจากมีสินค้า ${productsInCat.length} รายการใช้งานอยู่`,
        };
      }
      dispatch({ type: "categories/delete", id });
      return { ok: true };
    },
    [state.categories, state.catalog.products],
  );

  const addProduct = useCallback<StoreActions["addProduct"]>(
    (draft) => {
      const nextNum = state.catalog.products.length + 1;
      const id = `P${String(nextNum).padStart(2, "0")}`;
      const product: Product = {
        ...draft,
        id,
        isOnline: draft.isOnline ?? true,
      };
      dispatch({ type: "catalog/addProduct", product });
      return product;
    },
    [state.catalog.products.length],
  );

  const updateProduct = useCallback<StoreActions["updateProduct"]>(
    (id, updates) => {
      dispatch({ type: "catalog/updateProduct", id, updates });
    },
    [],
  );

  const deleteProduct = useCallback<StoreActions["deleteProduct"]>(
    (id) => {
      const hasOrder = state.orders.some((o) =>
        o.lines.some((l) => l.productId === id),
      );
      if (hasOrder) {
        return {
          ok: false,
          reason: "ไม่สามารถลบสินค้านี้ได้ เนื่องจากมีประวัติคำสั่งซื้ออ้างอิงอยู่",
        };
      }
      dispatch({ type: "catalog/deleteProduct", id });
      return { ok: true };
    },
    [state.orders],
  );

  const recordStockCount = useCallback<StoreActions["recordStockCount"]>(
    (data) => {
      const p = state.catalog.products.find((prod) => prod.id === data.productId);
      if (!p) throw new Error("ไม่พบสินค้าที่ต้องการปรับปรุงยอด");

      const cat = state.categories.find((c) => c.name === p.category);
      const wh = cat ? state.warehouses.find((w) => w.id === cat.warehouseId) : undefined;
      const count = state.stockAdjustments.length + 1;
      const id = `ADJ-${String(count).padStart(3, "0")}`;
      const diff = data.countedStock - p.stock;

      const record: StockAdjustment = {
        id,
        productId: p.id,
        productName: p.name,
        sku: p.sku,
        warehouseId: wh?.id ?? "WH-01",
        warehouseName: wh?.name ?? "โกดังหลัก (หลังร้าน)",
        previousStock: p.stock,
        countedStock: data.countedStock,
        diff,
        reason: data.reason,
        countedBy: data.countedBy?.trim() || state.session.user.name,
        note: data.note?.trim(),
        createdAt: now(),
      };
      dispatch({ type: "stock/adjust", record });
      return record;
    },
    [
      state.catalog.products,
      state.categories,
      state.warehouses,
      state.stockAdjustments.length,
      state.session.user.name,
    ],
  );

  const sendLowStockToPurchasing = useCallback<StoreActions["sendLowStockToPurchasing"]>(
    (note) => {
      const lowStockProducts = state.catalog.products.filter(
        (p) => p.stock <= (p.reorderPoint ?? 10),
      );
      if (lowStockProducts.length === 0) return null;

      const items: LowStockNotificationItem[] = lowStockProducts.map((p) => {
        const cat = state.categories.find((c) => c.name === p.category);
        const wh = cat ? state.warehouses.find((w) => w.id === cat.warehouseId) : undefined;
        const rp = p.reorderPoint ?? 10;
        const suggestedQty = Math.max(rp * 2 - p.stock, rp);
        return {
          productId: p.id,
          sku: p.sku,
          name: p.name,
          category: p.category,
          warehouseId: wh?.id ?? "WH-01",
          warehouseName: wh?.name ?? "โกดังหลัก (หลังร้าน)",
          currentStock: p.stock,
          reorderPoint: rp,
          suggestedQty,
        };
      });

      const count = state.lowStockNotifications.length + 1;
      const notification: LowStockNotification = {
        id: `NOTIF-${String(count).padStart(3, "0")}`,
        createdAt: now(),
        sentBy: state.session.user.name,
        itemCount: items.length,
        items,
        status: "รอจัดซื้อดำเนินการ",
        note: note?.trim() || "รายการสินค้าคงคลังถึงจุดสั่งซื้อ แจ้งฝ่ายจัดซื้อเปิดใบสั่งซื้อ",
      };
      dispatch({ type: "stock/sendNotification", notification });
      return notification;
    },
    [
      state.catalog.products,
      state.categories,
      state.warehouses,
      state.lowStockNotifications.length,
      state.session.user.name,
    ],
  );

  const startPackingOrder = useCallback<StoreActions["startPackingOrder"]>(
    (orderId) => {
      dispatch({ type: "orders/startPacking", orderId, at: now() });
    },
    [],
  );

  const togglePackedItem = useCallback<StoreActions["togglePackedItem"]>(
    (orderId, productId) => {
      dispatch({ type: "orders/togglePackedItem", orderId, productId });
    },
    [],
  );

  const shipOrder = useCallback<StoreActions["shipOrder"]>(
    (orderId, carrier, trackingNumber, note) => {
      dispatch({ type: "orders/ship", orderId, carrier, trackingNumber, at: now(), note });
    },
    [],
  );

  const setDeliveryResult = useCallback<StoreActions["setDeliveryResult"]>(
    (orderId, status, note) => {
      dispatch({ type: "orders/setDeliveryResult", orderId, status, at: now(), note });
    },
    [],
  );

  const confirmReturnReceived = useCallback<StoreActions["confirmReturnReceived"]>(
    (returnId, note) => {
      const target = state.returns.find((r) => r.id === returnId);
      if (!target) return { ok: false, reason: "ไม่พบคำขอคืนสินค้านี้" };
      if (target.receivedAt) return { ok: false, reason: "คำขอนี้ได้รับการตรวจรับเข้าคลังเรียบร้อยแล้ว" };
      if (target.status !== "อนุมัติ" || target.kind !== "คืนสินค้า") {
        return { ok: false, reason: "สามารถรับสินค้าคืนได้เฉพาะคำขอที่ผ่านการอนุมัติแล้วเท่านั้น" };
      }
      dispatch({ type: "returns/receive", id: returnId, at: now(), note });
      return { ok: true };
    },
    [state.returns],
  );

  const receivePurchaseOrder = useCallback<StoreActions["receivePurchaseOrder"]>(
    (poId, lineResults, receivingNote) => {
      const target = state.purchaseOrders.find((p) => p.id === poId);
      if (!target) return { ok: false, reason: "ไม่พบใบสั่งซื้อนี้" };
      dispatch({ type: "purchaseOrders/receive", poId, lineResults, receivingNote, at: now() });
      return { ok: true };
    },
    [state.purchaseOrders],
  );

  const shipGift = useCallback<StoreActions["shipGift"]>(
    (giftId, data) => {
      const target = state.gifts.find((g) => g.id === giftId);
      if (!target) return { ok: false };
      dispatch({
        type: "gifts/markShipped",
        id: giftId,
        carrier: data?.carrier,
        trackingNumber: data?.trackingNumber,
        note: data?.note,
        at: now(),
      });
      return { ok: true };
    },
    [state.gifts],
  );

  /* Purchasing Callbacks (Round 3 Part 1) */
  const addSupplierCompany = useCallback<StoreActions["addSupplierCompany"]>((data) => {
    const id = `COMP-${Date.now().toString().slice(-4)}`;
    const company: SupplierCompany = { id, ...data };
    dispatch({ type: "suppliers/addCompany", company });
    return company;
  }, []);

  const updateSupplierCompany = useCallback<StoreActions["updateSupplierCompany"]>((id, updates) => {
    dispatch({ type: "suppliers/updateCompany", id, updates });
  }, []);

  const deleteSupplierCompany = useCallback<StoreActions["deleteSupplierCompany"]>(
    (id) => {
      const hasPO = state.purchaseOrders.some((p) => p.companyId === id);
      const hasPR = state.purchaseRequisitions.some((pr) => pr.companyId === id);
      if (hasPO || hasPR) {
        return { ok: false, reason: "ไม่สามารถลบได้เนื่องจากมีประวัติเอกสาร PO หรือ PR อ้างอิงอยู่" };
      }
      dispatch({ type: "suppliers/deleteCompany", id });
      return { ok: true };
    },
    [state.purchaseOrders, state.purchaseRequisitions],
  );

  const addSupplierAgent = useCallback<StoreActions["addSupplierAgent"]>((data) => {
    const id = `AGT-${Date.now().toString().slice(-4)}`;
    const agent: SupplierAgent = { id, ...data };
    dispatch({ type: "suppliers/addAgent", agent });
    return agent;
  }, []);

  const updateSupplierAgent = useCallback<StoreActions["updateSupplierAgent"]>((id, updates) => {
    dispatch({ type: "suppliers/updateAgent", id, updates });
  }, []);

  const deleteSupplierAgent = useCallback<StoreActions["deleteSupplierAgent"]>((id) => {
    dispatch({ type: "suppliers/deleteAgent", id });
    return { ok: true };
  }, []);

  const addQuotation = useCallback<StoreActions["addQuotation"]>(
    (data) => {
      const seq = state.quotations.length + 1;
      const id = `QT-2611-${seq.toString().padStart(3, "0")}`;
      const quotation: Quotation = {
        id,
        createdAt: now(),
        createdBy: state.session.user.name,
        ...data,
      };
      dispatch({ type: "quotations/add", quotation });
      return quotation;
    },
    [state.quotations.length, state.session.user.name],
  );

  const updateQuotation = useCallback<StoreActions["updateQuotation"]>((id, updates) => {
    dispatch({ type: "quotations/update", id, updates });
  }, []);

  const deleteQuotation = useCallback<StoreActions["deleteQuotation"]>((id) => {
    dispatch({ type: "quotations/delete", id });
    return { ok: true };
  }, []);

  const addPurchaseRequisition = useCallback<StoreActions["addPurchaseRequisition"]>(
    (data) => {
      const seq = state.purchaseRequisitions.length + 1;
      const prNumber = `PR-2611-${seq.toString().padStart(3, "0")}`;
      const pr: PurchaseRequisition = {
        id: prNumber,
        prNumber,
        requestedAt: now(),
        requestedBy: state.session.user.name,
        status: "รออนุมัติ",
        ...data,
        lines: (data.lines || []).map((l, idx) => ({
          ...l,
          id: l.id || `PRL-${prNumber}-${idx + 1}`,
        })),
      };
      dispatch({ type: "requisitions/add", pr });
      return pr;
    },
    [state.purchaseRequisitions.length, state.session.user.name],
  );

  const decidePurchaseRequisition = useCallback<StoreActions["decidePurchaseRequisition"]>(
    (id, status, rejectionReason) => {
      const normalizedStatus =
        status === "APPROVED" ? "อนุมัติ" : status === "REJECTED" ? "ไม่อนุมัติ" : status;
      dispatch({
        type: "requisitions/updateStatus",
        id,
        status: normalizedStatus,
        rejectionReason,
        at: now(),
        by: state.session.user.name,
      });
      return { ok: true };
    },
    [state.session.user.name],
  );

  const deletePurchaseRequisition = useCallback<StoreActions["deletePurchaseRequisition"]>(
    (id) => {
      dispatch({ type: "requisitions/delete", id });
      return { ok: true };
    },
    [],
  );

  const convertPRToPO = useCallback<StoreActions["convertPRToPO"]>(
    (prId, warehouseId, warehouseName, expectedDays = 3) => {
      const pr = state.purchaseRequisitions.find((p) => p.id === prId);
      if (!pr) return { ok: false, error: "ไม่พบใบเสนอซื้อนี้" };
      if (pr.status !== "อนุมัติ" && pr.status !== "APPROVED") {
        return { ok: false, error: "สร้าง PO ได้เฉพาะใบเสนอซื้อที่ผ่านการอนุมัติแล้วเท่านั้น" };
      }
      if (pr.poId || pr.status === "แปลงเป็น PO แล้ว" || pr.status === "ORDERED" || pr.status === "สั่งซื้อแล้ว") {
        return { ok: false, error: "ใบเสนอซื้อนี้ถูกนำไปสร้างใบสั่งซื้อ (PO) แล้ว" };
      }

      const poSeq = state.purchaseOrders.length + 1;
      const poId = `PO-2611-${poSeq.toString().padStart(3, "0")}`;
      const expectedDate = new Date(Date.now() + expectedDays * 24 * 60 * 60 * 1000).toISOString();

      const newPO: PurchaseOrder = {
        id: poId,
        poNumber: poId,
        supplierName: pr.companyName,
        companyId: pr.companyId,
        agentId: pr.agentId,
        agentName: pr.agentName,
        prId: pr.id,
        prNumber: pr.prNumber,
        pr_id: pr.id,
        requisition_id: pr.id,
        warehouseId,
        warehouseName,
        orderDate: now(),
        expectedDate,
        status: "รอรับสินค้า",
        lines: pr.lines.map((l, idx) => {
          const prItemId = l.id || `PRL-${pr.id}-${idx + 1}`;
          return {
            id: `POL-${poId}-${idx + 1}`,
            prLineId: prItemId,
            prItemId: prItemId,
            pr_item_id: prItemId,
            productId: l.productId,
            sku: l.sku,
            name: l.name,
            unit: l.unit,
            qty: l.qty,
            costPrice: l.unitPrice,
            total: l.total,
            receivedQty: 0,
            warehouseId,
            warehouseName,
          };
        }),
        totalAmount: pr.totalAmount,
        createdBy: state.session.user.name,
        note: `ออกใบสั่งซื้ออัตโนมัติจาก ${pr.prNumber} (${pr.reason})`,
        paymentType: "เงินเชื่อ",
        paymentStatus: "ยังไม่ขอจ่าย",
      };

      dispatch({ type: "requisitions/convertToPO", prId, newPO });
      return { ok: true, po: newPO };
    },
    [state.purchaseRequisitions, state.purchaseOrders.length, state.session.user.name],
  );

  const requestPayment = useCallback<StoreActions["requestPayment"]>(
    (data) => {
      const seq = state.paymentRequests.length + 1;
      const id = `PAY-2611-${seq.toString().padStart(3, "0")}`;
      const request: PaymentRequest = {
        id,
        requestedAt: now(),
        requestedBy: state.session.user.name,
        status: "รออนุมัติจ่าย",
        ...data,
      };
      dispatch({ type: "payments/addRequest", request });
      return { ok: true, request };
    },
    [state.paymentRequests.length, state.session.user.name],
  );

  const decidePaymentRequest = useCallback<StoreActions["decidePaymentRequest"]>(
    (id, status, rejectionReason) => {
      dispatch({
        type: "payments/updateStatus",
        id,
        status,
        rejectionReason,
        at: now(),
        by: state.session.user.name,
      });
      return { ok: true };
    },
    [state.session.user.name],
  );

  const uploadAgentReceipt = useCallback<StoreActions["uploadAgentReceipt"]>(
    (receiptData, paymentRequestId) => {
      const seq = state.agentReceipts.length + 1;
      const id = `RCP-2611-${seq.toString().padStart(3, "0")}`;
      const receipt: AgentReceipt = {
        id,
        archiveStatus: "รอจัดเก็บ",
        ...receiptData,
      };
      dispatch({ type: "payments/addReceipt", receipt, paymentRequestId });
      return { ok: true, receipt };
    },
    [state.agentReceipts.length],
  );

  /* Manager & Owner Callbacks (Round 3 Part 2) */
  const addPromotion = useCallback<StoreActions["addPromotion"]>(
    (data) => {
      const seq = state.promotions.length + 1;
      const id = `PROMO-${seq.toString().padStart(3, "0")}`;
      const promotion: PromotionItem = {
        id,
        createdAt: now(),
        createdBy: state.session.user.name,
        ...data,
      };
      dispatch({ type: "promotions/add", promotion });
      return promotion;
    },
    [state.promotions.length, state.session.user.name],
  );

  const updatePromotion = useCallback<StoreActions["updatePromotion"]>((id, updates) => {
    dispatch({ type: "promotions/update", id, updates });
  }, []);

  const deletePromotion = useCallback<StoreActions["deletePromotion"]>((id) => {
    dispatch({ type: "promotions/delete", id });
    return { ok: true };
  }, []);

  const updateStoreSettings = useCallback<StoreActions["updateStoreSettings"]>((settings) => {
    dispatch({ type: "settings/update", settings });
  }, []);

  const addEmployee = useCallback<StoreActions["addEmployee"]>(
    (data) => {
      const seq = state.employees.length + 1;
      const id = `U${seq.toString().padStart(2, "0")}`;
      const employee: StaffUser = {
        id,
        ...data,
        history: [
          {
            id: `H-ADD-${Date.now().toString().slice(-4)}`,
            at: now(),
            action: "สร้างบัญชีผู้ใช้ใหม่",
            detail: `สร้างผู้ใช้งานสำหรับ ${data.name} ตำแหน่ง ${data.position ?? "-"}`,
            category: "auth",
          },
        ],
      };
      dispatch({ type: "employees/add", employee });
      return employee;
    },
    [state.employees.length],
  );

  const updateEmployee = useCallback<StoreActions["updateEmployee"]>((id, updates) => {
    dispatch({ type: "employees/update", id, updates });
  }, []);

  const resetEmployeePassword = useCallback<StoreActions["resetEmployeePassword"]>(
    (id) => {
      const target = state.employees.find((e) => e.id === id);
      if (!target) return { ok: false };
      // Generate temporary random password
      const rand = Math.floor(1000 + Math.random() * 9000);
      const tempPassword = `RungAroon#${rand}`;
      dispatch({ type: "employees/resetPassword", id, tempPass: tempPassword, at: now() });
      return { ok: true, tempPassword };
    },
    [state.employees],
  );

  const archiveAgentReceipt = useCallback<StoreActions["archiveAgentReceipt"]>(
    (id) => {
      const target = state.agentReceipts.find((r) => r.id === id);
      if (!target) return { ok: false };
      dispatch({ type: "receipts/archive", id, at: now(), by: state.session.user.name });
      return { ok: true };
    },
    [state.agentReceipts, state.session.user.name],
  );

  const login = useCallback<StoreActions["login"]>(
    (username, password) => {
      const normalized = username.trim().toLowerCase();
      const user =
        state.employees.find((u) => u.username.trim().toLowerCase() === normalized) ||
        staffUsers.find((u) => u.username.trim().toLowerCase() === normalized);
      if (!user || user.password !== password)
        return { ok: false, error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" };
      dispatch({ type: "session/login", user });
      return { ok: true, user };
    },
    [state.employees],
  );

  const actions = useMemo<StoreActions>(
    () => ({
      login,
      logout: () => {
        if (typeof window !== "undefined") {
          try {
            sessionStorage.removeItem(SESSION_STORAGE_KEY);
          } catch {
            // ignore
          }
        }
        dispatch({ type: "session/logout" });
      },
      switchRole: (role) => dispatch({ type: "session/switchRole", role }),
      completeSale,
      addMember,
      approvePayment: (orderId) =>
        dispatch({ type: "orders/setStatus", orderId, status: "ชำระแล้ว", at: now(), note: "ตรวจสอบสลิปถูกต้อง" }),
      rejectPayment: (orderId, note) =>
        dispatch({ type: "orders/setStatus", orderId, status: "รอชำระ", at: now(), note: `สลิปไม่ถูกต้อง: ${note}` }),
      decideReturn: (id, approve, note) => dispatch({ type: "returns/decide", id, approve, note, at: now() }),
      markGiftPrepared: (id) => dispatch({ type: "gifts/markPrepared", id, at: now() }),
      addWarehouse,
      updateWarehouse,
      deleteWarehouse,
      addCategory,
      updateCategory,
      deleteCategory,
      addProduct,
      updateProduct,
      deleteProduct,
      recordStockCount,
      sendLowStockToPurchasing,
      startPackingOrder,
      togglePackedItem,
      shipOrder,
      setDeliveryResult,
      confirmReturnReceived,
      receivePurchaseOrder,
      shipGift,
      // purchasing (round 3 part 1)
      addSupplierCompany,
      updateSupplierCompany,
      deleteSupplierCompany,
      addSupplierAgent,
      updateSupplierAgent,
      deleteSupplierAgent,
      addQuotation,
      updateQuotation,
      deleteQuotation,
      addPurchaseRequisition,
      decidePurchaseRequisition,
      deletePurchaseRequisition,
      convertPRToPO,
      requestPayment,
      decidePaymentRequest,
      uploadAgentReceipt,
      // manager & owner (round 3 part 2)
      addPromotion,
      updatePromotion,
      deletePromotion,
      updateStoreSettings,
      addEmployee,
      updateEmployee,
      resetEmployeePassword,
      archiveAgentReceipt,
    }),
    [
      completeSale,
      addWarehouse,
      updateWarehouse,
      deleteWarehouse,
      addCategory,
      updateCategory,
      deleteCategory,
      addProduct,
      updateProduct,
      deleteProduct,
      recordStockCount,
      sendLowStockToPurchasing,
      startPackingOrder,
      togglePackedItem,
      shipOrder,
      setDeliveryResult,
      confirmReturnReceived,
      receivePurchaseOrder,
      shipGift,
      addSupplierCompany,
      updateSupplierCompany,
      deleteSupplierCompany,
      addSupplierAgent,
      updateSupplierAgent,
      deleteSupplierAgent,
      addQuotation,
      updateQuotation,
      deleteQuotation,
      addPurchaseRequisition,
      decidePurchaseRequisition,
      deletePurchaseRequisition,
      convertPRToPO,
      requestPayment,
      decidePaymentRequest,
      uploadAgentReceipt,
      addPromotion,
      updatePromotion,
      deletePromotion,
      updateStoreSettings,
      addEmployee,
      updateEmployee,
      resetEmployeePassword,
      archiveAgentReceipt,
      login,
      addMember,
    ],
  );

  const value = useMemo(() => ({ state, actions }), [state, actions]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>");
  return ctx;
}

/* ───────────────────────── Selectors ───────────────────────── */

export const selectPendingPayments = (s: AppState) => s.orders.filter((o) => o.status === "รอตรวจสอบ");
export const selectPendingReturns = (s: AppState) => s.returns.filter((r) => r.status === "รอพิจารณา");
export const selectPendingGifts = (s: AppState) => s.gifts.filter((g) => g.status === "รอจัดเตรียม");
export const selectLowStock = (s: AppState, threshold = 5) =>
  s.catalog.products.filter((p) => p.stock <= threshold);

/** Products at or below their individual reorderPoint (or fallback 10). */
export const selectReorderPointProducts = (s: AppState) =>
  s.catalog.products.filter((p) => p.stock <= (p.reorderPoint ?? 10));

/** Paid orders waiting to be packed (status = ชำระแล้ว). */
export const selectOrdersToPack = (s: AppState) =>
  s.orders.filter((o) => o.status === "ชำระแล้ว");

/** Orders ready to ship / dispatching (status = กำลังเตรียม). */
export const selectOrdersToShip = (s: AppState) =>
  s.orders.filter((o) => o.status === "กำลังเตรียม");

/** Orders in transit / shipped (status = จัดส่งแล้ว). */
export const selectOrdersShipped = (s: AppState) =>
  s.orders.filter((o) => o.status === "จัดส่งแล้ว");

/** Completed delivery orders (status = ส่งสำเร็จ | ส่งไม่สำเร็จ | ตีกลับ). */
export const selectOrdersDelivered = (s: AppState) =>
  s.orders.filter((o) => ["ส่งสำเร็จ", "ส่งไม่สำเร็จ", "ตีกลับ"].includes(o.status));

/** Approved return requests (kind = คืนสินค้า & status = อนุมัติ). */
export const selectApprovedReturnRequests = (s: AppState) =>
  s.returns.filter((r) => r.kind === "คืนสินค้า" && r.status === "อนุมัติ");

/** Return goods waiting to be received / inspected at warehouse (kind = คืนสินค้า & not yet received). */
export const selectPendingReturnGoods = (s: AppState) =>
  s.returns.filter((r) => r.kind === "คืนสินค้า" && r.status === "อนุมัติ" && !r.receivedAt);

/** Gifts ready to ship (status = จัดเตรียมแล้ว). */
export const selectGiftsToShip = (s: AppState) =>
  s.gifts.filter((g) => g.status === "จัดเตรียมแล้ว");

/** Gifts already shipped (status = จัดส่งแล้ว). */
export const selectShippedGifts = (s: AppState) =>
  s.gifts.filter((g) => g.status === "จัดส่งแล้ว");

/** Purchase orders waiting to be received (status = รอรับสินค้า | อนุมัติแล้ว | รับสินค้าบางส่วน). */
export const selectPendingReceivingPOs = (s: AppState) =>
  s.purchaseOrders.filter(
    (p) => p.status === "รอรับสินค้า" || p.status === "อนุมัติแล้ว" || p.status === "รับสินค้าบางส่วน",
  );

/** Purchase orders completed (status = รับครบแล้ว). */
export const selectCompletedPOs = (s: AppState) =>
  s.purchaseOrders.filter((p) => p.status === "รับครบแล้ว");

/** Count categories belonging to a warehouse. */
export const selectWarehouseCategoryCount = (s: AppState, warehouseId: string) =>
  s.categories.filter((c) => c.warehouseId === warehouseId).length;

/** Total stock count across all products in categories belonging to a warehouse. */
export const selectWarehouseTotalStock = (s: AppState, warehouseId: string) => {
  const catNames = new Set(s.categories.filter((c) => c.warehouseId === warehouseId).map((c) => c.name));
  return s.catalog.products
    .filter((p) => catNames.has(p.category))
    .reduce((sum, p) => sum + p.stock, 0);
};

/** Total product SKUs count across categories in a warehouse. */
export const selectWarehouseProductCount = (s: AppState, warehouseId: string) => {
  const catNames = new Set(s.categories.filter((c) => c.warehouseId === warehouseId).map((c) => c.name));
  return s.catalog.products.filter((p) => catNames.has(p.category)).length;
};

/** Get the single warehouse for a category name (1:1 rule). */
export const selectWarehouseForCategory = (s: AppState, categoryName: string): Warehouse | undefined => {
  const cat = s.categories.find((c) => c.name === categoryName);
  if (!cat) return undefined;
  return s.warehouses.find((w) => w.id === cat.warehouseId);
};

/** Stock count adjustment audit history. */
export const selectStockAdjustmentHistory = (s: AppState) => s.stockAdjustments;

/** Notifications sent to purchasing department. */
export const selectLowStockNotifications = (s: AppState) => s.lowStockNotifications;

/** Purchasing domain selectors (Round 3 Part 1) */
export const selectSupplierCompanies = (s: AppState) => s.supplierCompanies;
export const selectSupplierAgents = (s: AppState, companyId?: string) =>
  companyId ? s.supplierAgents.filter((a) => a.companyId === companyId) : s.supplierAgents;
export const selectQuotations = (s: AppState) => s.quotations;
export const selectPurchaseRequisitions = (s: AppState) => s.purchaseRequisitions;
export const selectPaymentRequests = (s: AppState) => s.paymentRequests;
export const selectAgentReceipts = (s: AppState) => s.agentReceipts;
export const selectPendingPRs = (s: AppState) =>
  s.purchaseRequisitions.filter((pr) => pr.status === "รออนุมัติ" || pr.status === "PENDING_APPROVAL");
export const selectApprovedPRs = (s: AppState) =>
  s.purchaseRequisitions.filter(
    (pr) =>
      (pr.status === "อนุมัติ" || pr.status === "APPROVED") &&
      !pr.poId &&
      pr.status !== "แปลงเป็น PO แล้ว" &&
      pr.status !== "ORDERED" &&
      pr.status !== "สั่งซื้อแล้ว",
  );
export const selectPendingPaymentRequests = (s: AppState) =>
  s.paymentRequests.filter((p) => p.status === "รออนุมัติจ่าย" || p.status === "รออนุมัติจ่ายเงิน");

/** Manager & Owner domain selectors (Round 3 Part 2) */
export const selectPromotions = (s: AppState) => s.promotions;
export const selectStoreSettings = (s: AppState) => s.storeSettings;
export const selectEmployees = (s: AppState) => s.employees;
export const selectPendingAgentReceipts = (s: AppState) =>
  s.agentReceipts.filter((r) => r.archiveStatus === "รอจัดเก็บ");
export const selectArchivedAgentReceipts = (s: AppState) =>
  s.agentReceipts.filter((r) => r.archiveStatus === "จัดเก็บแล้ว");

/**
 * Dynamic 7-day sales combining historical baseline sales with runtime POS receipts
 * and online orders (specifically updating "วันนี้").
 */
export function getDynamicSalesLast7Days(state?: {
  sales?: { receipts?: Receipt[] };
  orders?: OnlineOrder[];
}) {
  const receipts: Receipt[] = state?.sales?.receipts ?? [];
  const orders: OnlineOrder[] = state?.orders ?? [];

  // In-store POS receipts (no orderId attached)
  const inStoreNew = receipts
    .filter((r) => !r.orderId)
    .reduce((sum, r) => sum + (r.net ?? 0), 0);

  // Online orders approved / created
  const onlineReceiptOrderIds = new Set(
    receipts.filter((r) => !!r.orderId).map((r) => r.orderId!),
  );
  const onlineFromReceipts = receipts
    .filter((r) => !!r.orderId)
    .reduce((sum, r) => sum + (r.net ?? 0), 0);

  const initialPaidOrderIds = new Set([
    "OD-26110303",
    "OD-26110205",
    "OD-26110206",
    "OD-26103008",
    "OD-26102909",
    "OD-26110305",
  ]);

  const additionalPaidOrders = orders.filter(
    (o) =>
      ["ชำระแล้ว", "กำลังเตรียม", "จัดส่งแล้ว", "ส่งสำเร็จ"].includes(o.status) &&
      !initialPaidOrderIds.has(o.id) &&
      !onlineReceiptOrderIds.has(o.id),
  );

  const onlineFromOrders = additionalPaidOrders.reduce(
    (sum, o) => sum + (typeof (o as any).netTotal === "number" ? (o as any).netTotal : orderTotal(o)),
    0,
  );

  const onlineNew = onlineFromReceipts + onlineFromOrders;

  return (salesLast7Days ?? []).map((d) => {
    if (d.day === "วันนี้") {
      return {
        ...d,
        inStore: (d.inStore ?? 0) + inStoreNew,
        online: (d.online ?? 0) + onlineNew,
      };
    }
    return d;
  });
}

export function useNavBadges() {
  const { state } = useStore();
  return {
    payments: selectPendingPayments(state).length,
    returns: selectPendingReturns(state).length,
    gifts: selectPendingGifts(state).length,
  };
}

export const useCurrentUser = () => useStore().state.session.user;
