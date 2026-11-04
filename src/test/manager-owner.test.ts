import { describe, expect, it } from "vitest";

import {
  staffUsers,
  initialPromotions,
  initialStoreSettings,
  agentReceipts,
  type PromotionItem,
  type OnlineStoreSettings,
  type StaffUser,
} from "@/lib/mock-data";
import {
  createInitialState,
  appReducer,
  selectPromotions,
  selectStoreSettings,
  selectEmployees,
  selectPendingAgentReceipts,
  selectArchivedAgentReceipts,
  selectPendingPRs,
  selectPendingPaymentRequests,
} from "@/lib/store";
import { BUILT_ROUTES, NAV_BY_ROLE, SEGMENT_LABELS } from "@/lib/navigation";

describe("Round 3 Part 2 - Manager & Owner Mock Data Specifications", () => {
  it("has staff users with full profile, exactly one duty, and audit history", () => {
    expect(staffUsers.length).toBeGreaterThanOrEqual(6);
    for (const u of staffUsers) {
      expect(u.name).toBeDefined();
      expect(u.duty).toBeDefined();
      expect(typeof u.duty).toBe("string");
      expect(u.duty.length).toBeGreaterThan(0);
      expect(u.position).toBeDefined();
      expect(u.username).toBeDefined();
      expect(Array.isArray(u.history)).toBe(true);
      expect(u.history!.length).toBeGreaterThan(0);
    }
  });

  it("has initial promotions including both news and promotional discounts", () => {
    expect(initialPromotions.length).toBeGreaterThanOrEqual(3);
    const promoTypes = new Set(initialPromotions.map((p) => p.type));
    expect(promoTypes.has("โปรโมชัน")).toBe(true);
    expect(promoTypes.has("ข่าวสาร")).toBe(true);

    for (const p of initialPromotions) {
      expect(p.id).toBeDefined();
      expect(p.title).toBeDefined();
      expect(p.description).toBeDefined();
      expect(p.startDate).toBeDefined();
      expect(p.endDate).toBeDefined();
      expect(["เผยแพร่", "เผยแพร่แล้ว", "ฉบับร่าง", "สิ้นสุดแล้ว"]).toContain(p.status);
    }
  });

  it("has online store settings with all 4 required operational sections", () => {
    // 1. Shipping channels
    expect(initialStoreSettings.shippingChannels.length).toBeGreaterThanOrEqual(2);
    for (const s of initialStoreSettings.shippingChannels) {
      expect(s.id).toBeDefined();
      expect(s.name).toBeDefined();
      expect(s.fee).toBeGreaterThanOrEqual(0);
      expect(s.estimatedDays).toBeDefined();
      expect(typeof s.enabled).toBe("boolean");
    }

    // 2. Bank accounts & PromptPay
    expect(initialStoreSettings.bankAccounts.length).toBeGreaterThanOrEqual(2);
    for (const b of initialStoreSettings.bankAccounts) {
      expect(b.bankName).toBeDefined();
      expect(b.accountNumber).toBeDefined();
      expect(b.accountName).toBeDefined();
    }
    expect(initialStoreSettings.promptPay).toBeDefined();
    expect(initialStoreSettings.promptPay.id).toBeDefined();
    expect(initialStoreSettings.promptPay.accountName).toBeDefined();

    // 3. Point redemption rate
    expect(initialStoreSettings.pointRate).toBeDefined();
    expect(initialStoreSettings.pointRate.pointsPerBaht).toBeGreaterThan(0);
    expect(initialStoreSettings.pointRate.spendBahtPerPoint).toBeGreaterThan(0);
    expect(initialStoreSettings.pointRate.minPointsToRedeem).toBeGreaterThanOrEqual(0);

    // 4. Payment timeout
    expect(initialStoreSettings.paymentTimeout).toBeDefined();
    expect(initialStoreSettings.paymentTimeout.timeoutHours).toBeGreaterThan(0);
    expect(typeof initialStoreSettings.paymentTimeout.autoCancelUnpaid).toBe("boolean");
  });

  it("has agent receipts with archive status tracking", () => {
    expect(agentReceipts.length).toBeGreaterThanOrEqual(3);
    for (const r of agentReceipts) {
      expect(r.id).toBeDefined();
      expect(r.receiptNumber).toBeDefined();
      expect(r.totalAmount).toBeGreaterThan(0);
      expect(r.archiveStatus).toBeDefined();
      expect(["รอจัดเก็บ", "จัดเก็บแล้ว"]).toContain(r.archiveStatus);
    }
  });
});

describe("Round 3 Part 2 - Reducer & Store Actions for Manager & Owner", () => {
  it("handles PR approval and PR rejection with termination of purchase", () => {
    let state = createInitialState();
    const pendingPR = state.purchaseRequisitions.find((p) => p.status === "รออนุมัติ");
    expect(pendingPR).toBeDefined();

    // Test PR Approval
    state = appReducer(state, {
      type: "requisitions/updateStatus",
      id: pendingPR!.id,
      status: "อนุมัติ",
      at: new Date().toISOString(),
      by: "ผู้จัดการ ประเสริฐ",
    });
    const approved = state.purchaseRequisitions.find((p) => p.id === pendingPR!.id);
    expect(approved?.status).toBe("อนุมัติ");
    expect(approved?.approvedBy).toBe("ผู้จัดการ ประเสริฐ");

    // Test PR Rejection
    const anotherPR = state.purchaseRequisitions.find((p) => p.id !== pendingPR!.id);
    expect(anotherPR).toBeDefined();
    state = appReducer(state, {
      type: "requisitions/updateStatus",
      id: anotherPR!.id,
      status: "ไม่อนุมัติ",
      rejectionReason: "งบประมาณประจำเดือนเกินโควต้า",
      at: new Date().toISOString(),
      by: "ผู้จัดการ ประเสริฐ",
    });
    const rejected = state.purchaseRequisitions.find((p) => p.id === anotherPR!.id);
    expect(rejected?.status).toBe("ไม่อนุมัติ");
    expect(rejected?.rejectionReason).toBe("งบประมาณประจำเดือนเกินโควต้า");
  });

  it("handles payment request approval and rejection", () => {
    let state = createInitialState();
    const pending = state.paymentRequests.find((p) => p.status === "รออนุมัติจ่าย");
    expect(pending).toBeDefined();

    // Approve
    state = appReducer(state, {
      type: "payments/updateStatus",
      id: pending!.id,
      status: "อนุมัติจ่ายแล้ว",
      at: new Date().toISOString(),
      by: "ผู้จัดการ ประเสริฐ",
    });
    let target = state.paymentRequests.find((p) => p.id === pending!.id);
    expect(target?.status).toBe("อนุมัติจ่ายแล้ว");

    // Reject
    state = appReducer(state, {
      type: "payments/updateStatus",
      id: pending!.id,
      status: "ปฏิเสธ",
      rejectionReason: "เอกสารใบแจ้งหนี้ไม่สมบูรณ์",
      at: new Date().toISOString(),
      by: "ผู้จัดการ ประเสริฐ",
    });
    target = state.paymentRequests.find((p) => p.id === pending!.id);
    expect(target?.status).toBe("ปฏิเสธ");
    expect(target?.rejectionReason).toBe("เอกสารใบแจ้งหนี้ไม่สมบูรณ์");
  });

  it("manages promotions: add, update, delete", () => {
    let state = createInitialState();
    const initialCount = state.promotions.length;

    const newPromo: PromotionItem = {
      id: "PROMO-TEST-001",
      type: "โปรโมชัน",
      title: "โปรโมชันวันหยุดพิเศษ",
      description: "ลด 20% ทุกรายการเครื่องดื่ม",
      discountType: "เปอร์เซ็นต์",
      discountValue: 20,
      startDate: "2026-11-01",
      endDate: "2026-11-30",
      status: "เผยแพร่",
      createdAt: new Date().toISOString(),
      createdBy: "ผู้จัดการ ประเสริฐ",
    };

    // Add
    state = appReducer(state, { type: "promotions/add", promotion: newPromo });
    expect(state.promotions).toHaveLength(initialCount + 1);

    // Update
    state = appReducer(state, {
      type: "promotions/update",
      id: "PROMO-TEST-001",
      updates: { title: "โปรโมชันวันหยุดพิเศษ (ขยายเวลา)", discountValue: 25 },
    });
    const updated = state.promotions.find((p) => p.id === "PROMO-TEST-001");
    expect(updated?.title).toBe("โปรโมชันวันหยุดพิเศษ (ขยายเวลา)");
    expect(updated?.discountValue).toBe(25);

    // Delete
    state = appReducer(state, { type: "promotions/delete", id: "PROMO-TEST-001" });
    expect(state.promotions).toHaveLength(initialCount);
    expect(state.promotions.find((p) => p.id === "PROMO-TEST-001")).toBeUndefined();
  });

  it("manages store online settings update", () => {
    let state = createInitialState();
    const modifiedSettings: OnlineStoreSettings = {
      ...state.storeSettings,
      pointRate: {
        ...state.storeSettings.pointRate,
        pointsPerBaht: 20,
        minPointsToRedeem: 100,
      },
      paymentTimeout: {
        ...state.storeSettings.paymentTimeout,
        timeoutHours: 12,
      },
    };

    state = appReducer(state, { type: "settings/update", settings: modifiedSettings });
    expect(state.storeSettings.pointRate.pointsPerBaht).toBe(20);
    expect(state.storeSettings.pointRate.minPointsToRedeem).toBe(100);
    expect(state.storeSettings.paymentTimeout.timeoutHours).toBe(12);
  });

  it("manages employees: add, update, and reset password with history logging", () => {
    let state = createInitialState();
    const initialCount = state.employees.length;

    const newEmp: StaffUser = {
      id: "U99",
      name: "สมหญิง จริงใจ",
      firstName: "สมหญิง",
      lastName: "จริงใจ",
      nickname: "หญิง",
      duty: "งานขายและบริการหน้าร้าน",
      position: "พนักงานบริการลูกค้า",
      username: "somying",
      role: "sales",
      history: [],
    };

    // Add
    state = appReducer(state, { type: "employees/add", employee: newEmp });
    expect(state.employees).toHaveLength(initialCount + 1);

    // Update
    state = appReducer(state, {
      type: "employees/update",
      id: "U99",
      updates: { position: "หัวหน้าพนักงานขาย" },
    });
    let emp = state.employees.find((e) => e.id === "U99");
    expect(emp?.position).toBe("หัวหน้าพนักงานขาย");

    // Reset Password
    state = appReducer(state, {
      type: "employees/resetPassword",
      id: "U99",
      tempPass: "RungAroon#7721",
      at: new Date().toISOString(),
    });
    emp = state.employees.find((e) => e.id === "U99");
    expect(emp?.password).toBe("RungAroon#7721");
    expect(emp?.history).toBeDefined();
    const lastHistory = emp!.history![emp!.history!.length - 1];
    expect(lastHistory.action).toBe("รีเซ็ตรหัสผ่าน");
    expect(lastHistory.category).toBe("auth");
  });

  it("archives agent receipts with date and owner name", () => {
    let state = createInitialState();
    const pending = state.agentReceipts.find((r) => r.archiveStatus !== "จัดเก็บแล้ว");
    expect(pending).toBeDefined();

    const archiveTime = new Date().toISOString();
    state = appReducer(state, {
      type: "receipts/archive",
      id: pending!.id,
      at: archiveTime,
      by: "วิชัย รุ่งอรุณ",
    });

    const archived = state.agentReceipts.find((r) => r.id === pending!.id);
    expect(archived?.archiveStatus).toBe("จัดเก็บแล้ว");
    expect(archived?.archivedAt).toBe(archiveTime);
    expect(archived?.archivedBy).toBe("วิชัย รุ่งอรุณ");
  });
});

describe("Round 3 Part 2 - Selectors", () => {
  it("correctly filters pending and archived agent receipts", () => {
    const state = createInitialState();
    const pending = selectPendingAgentReceipts(state);
    const archived = selectArchivedAgentReceipts(state);

    expect(pending.every((r) => r.archiveStatus === "รอจัดเก็บ")).toBe(true);
    expect(archived.every((r) => r.archiveStatus === "จัดเก็บแล้ว")).toBe(true);
    expect(pending.length + archived.length).toBe(state.agentReceipts.length);
  });

  it("correctly selects promotions, store settings, and employees", () => {
    const state = createInitialState();
    expect(selectPromotions(state)).toBe(state.promotions);
    expect(selectStoreSettings(state)).toBe(state.storeSettings);
    expect(selectEmployees(state)).toBe(state.employees);
  });
});

describe("Round 3 Part 2 - Navigation & Built Routes", () => {
  it("includes all 5 manager routes and 1 owner route in BUILT_ROUTES", () => {
    const expected = [
      "/manager/approve-pr",
      "/manager/approve-payments",
      "/manager/news",
      "/manager/settings",
      "/manager/employees",
      "/owner/receipts",
    ];

    for (const route of expected) {
      expect(BUILT_ROUTES.has(route)).toBe(true);
    }
  });

  it("replaces placeholder links in NAV_BY_ROLE for manager with fully built pages", () => {
    const managerGroups = NAV_BY_ROLE.manager;
    const allManagerHrefs = managerGroups.flatMap((g) => g.items.map((i) => i.href));

    expect(allManagerHrefs).toContain("/manager/approve-pr");
    expect(allManagerHrefs).toContain("/manager/approve-payments");
    expect(allManagerHrefs).toContain("/manager/news");
    expect(allManagerHrefs).toContain("/manager/settings");
    expect(allManagerHrefs).toContain("/manager/employees");
  });

  it("includes /owner/receipts in NAV_BY_ROLE for owner", () => {
    const ownerGroups = NAV_BY_ROLE.owner;
    const allOwnerHrefs = ownerGroups.flatMap((g) => g.items.map((i) => i.href));

    expect(allOwnerHrefs).toContain("/owner/receipts");
  });

  it("has Thai breadcrumb labels in SEGMENT_LABELS for new route segments", () => {
    expect(SEGMENT_LABELS["approve-pr"]).toBe("อนุมัติใบเสนอซื้อ");
    expect(SEGMENT_LABELS["approve-payments"]).toBe("อนุมัติการจ่ายเงิน");
    expect(SEGMENT_LABELS.news).toBe("ข่าวสารและโปรโมชัน");
    expect(SEGMENT_LABELS.settings).toBe("ตั้งค่าร้านออนไลน์");
    expect(SEGMENT_LABELS.employees).toBe("จัดการพนักงาน");
    expect(SEGMENT_LABELS.receipts).toBe("ตรวจสอบและจัดเก็บใบเสร็จจากตัวแทน");
  });
});

