import { describe, expect, it } from "vitest";

import {
  staffUsers,
  supplierCompanies,
  supplierAgents,
  quotations,
  purchaseRequisitions,
  purchaseOrders,
  paymentRequests,
  agentReceipts,
  type PurchaseOrder,
} from "@/lib/mock-data";
import {
  createInitialState,
  appReducer,
  selectSupplierCompanies,
  selectSupplierAgents,
  selectQuotations,
  selectPurchaseRequisitions,
  selectPendingPRs,
  selectApprovedPRs,
  selectPaymentRequests,
  selectPendingPaymentRequests,
  selectAgentReceipts,
} from "@/lib/store";
import { BUILT_ROUTES, NAV_BY_ROLE, SEGMENT_LABELS } from "@/lib/navigation";

describe("Round 3 Part 1 - Purchasing Mock Data Specifications", () => {
  it("has exactly 6 employees, each with one distinct duty", () => {
    expect(staffUsers).toHaveLength(6);
    for (const u of staffUsers) {
      expect(u.duty).toBeDefined();
      expect(typeof u.duty).toBe("string");
      expect(u.duty!.length).toBeGreaterThan(0);
    }
    // All duties are unique
    const duties = staffUsers.map((u) => u.duty);
    const uniqueDuties = new Set(duties);
    expect(uniqueDuties.size).toBe(staffUsers.length);
  });

  it("has exactly 3 supplier companies with several agents each", () => {
    expect(supplierCompanies).toHaveLength(3);
    for (const comp of supplierCompanies) {
      expect(comp.id).toBeDefined();
      expect(comp.name).toBeDefined();
      expect(comp.taxId).toBeDefined();
      expect(comp.paymentTermDays).toBeGreaterThan(0);
      expect(comp.categories.length).toBeGreaterThan(0);

      // Several agents (at least 2) for this company
      const agents = supplierAgents.filter((a) => a.companyId === comp.id);
      expect(agents.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("has 3 quotations, each linked to multiple agents (multi-select)", () => {
    expect(quotations).toHaveLength(3);
    for (const q of quotations) {
      expect(q.agentIds.length).toBeGreaterThanOrEqual(2);
      expect(q.items.length).toBeGreaterThan(0);
      expect(q.validityDays).toBeGreaterThan(0);
      expect(q.totalEstimatedAmount).toBeGreaterThan(0);

      // Verify all agentIds exist in supplierAgents
      for (const aId of q.agentIds) {
        expect(supplierAgents.some((a) => a.id === aId)).toBe(true);
      }
    }
  });

  it("has 4 PRs in 4 distinct statuses", () => {
    expect(purchaseRequisitions).toHaveLength(4);
    const statuses = purchaseRequisitions.map((pr) => pr.status);
    expect(statuses).toContain("รออนุมัติ");
    expect(statuses).toContain("อนุมัติ");
    expect(statuses).toContain("ไม่อนุมัติ");
    expect(statuses).toContain("แปลงเป็น PO แล้ว");
  });

  it("has 3 POs enriched with purchasing and payment details", () => {
    expect(purchaseOrders).toHaveLength(3);
    for (const po of purchaseOrders) {
      expect(po.lines.length).toBeGreaterThan(0);
      expect(po.totalAmount).toBeGreaterThan(0);
      expect(po.supplierName).toBeDefined();
    }
  });

  it("has 4 payment requests covering cash and credit", () => {
    expect(paymentRequests).toHaveLength(4);
    const types = paymentRequests.map((p) => p.paymentType);
    expect(types).toContain("เงินสด");
    expect(types).toContain("เงินเชื่อ");

    const statuses = paymentRequests.map((p) => p.status);
    expect(statuses).toContain("รออนุมัติจ่าย");
    expect(statuses).toContain("อนุมัติจ่ายแล้ว");
    expect(statuses).toContain("จ่ายเงินแล้ว");
  });

  it("has 3 agent receipts from suppliers", () => {
    expect(agentReceipts).toHaveLength(3);
    for (const r of agentReceipts) {
      expect(r.receiptNumber).toBeDefined();
      expect(r.companyId).toBeDefined();
      expect(r.amount).toBeGreaterThan(0);
      expect(r.fileName).toBeDefined();
    }
  });
});

describe("Round 3 Store Reducer & Purchasing Actions", () => {
  it("initializes state with purchasing slices", () => {
    const s = createInitialState();
    expect(s.supplierCompanies).toHaveLength(3);
    expect(s.supplierAgents.length).toBeGreaterThanOrEqual(6);
    expect(s.quotations).toHaveLength(3);
    expect(s.purchaseRequisitions).toHaveLength(4);
    expect(s.paymentRequests).toHaveLength(4);
    expect(s.agentReceipts).toHaveLength(3);
  });

  it("adds and updates supplier companies and agents", () => {
    let s = createInitialState();
    const newCompany = {
      id: "COMP-TEST",
      name: "บริษัท ทดสอบ จำกัด",
      taxId: "0100000000000",
      phone: "02-111-2222",
      email: "test@test.com",
      address: "ขอนแก่น",
      paymentTermDays: 30,
      categories: ["สบู่"],
    };

    s = appReducer(s, { type: "suppliers/addCompany", company: newCompany });
    expect(s.supplierCompanies.some((c) => c.id === "COMP-TEST")).toBe(true);

    s = appReducer(s, {
      type: "suppliers/updateCompany",
      id: "COMP-TEST",
      updates: { paymentTermDays: 60 },
    });
    expect(s.supplierCompanies.find((c) => c.id === "COMP-TEST")?.paymentTermDays).toBe(60);

    const newAgent = {
      id: "AGT-TEST",
      companyId: "COMP-TEST",
      name: "นายทดสอบ ตัวแทน",
      phone: "089-999-9999",
      email: "agent@test.com",
      position: "ฝ่ายขาย",
    };
    s = appReducer(s, { type: "suppliers/addAgent", agent: newAgent });
    expect(s.supplierAgents.some((a) => a.id === "AGT-TEST")).toBe(true);

    s = appReducer(s, { type: "suppliers/deleteCompany", id: "COMP-TEST" });
    expect(s.supplierCompanies.some((c) => c.id === "COMP-TEST")).toBe(false);
    expect(s.supplierAgents.some((a) => a.id === "AGT-TEST")).toBe(false);
  });

  it("converts approved PR to PO and feeds purchaseOrders", () => {
    let s = createInitialState();
    const approvedPR = s.purchaseRequisitions.find((pr) => pr.status === "อนุมัติ");
    expect(approvedPR).toBeDefined();

    const newPO: PurchaseOrder = {
      id: "PO-CONVERT-TEST",
      poNumber: "PO-CONVERT-TEST",
      supplierName: approvedPR!.companyName,
      companyId: approvedPR!.companyId,
      agentId: approvedPR!.agentId,
      agentName: approvedPR!.agentName,
      warehouseId: "WH-01",
      warehouseName: "โกดังหลัก (หลังร้าน)",
      orderDate: new Date().toISOString(),
      expectedDate: new Date().toISOString(),
      status: "รอรับสินค้า",
      lines: approvedPR!.lines.map((l) => ({
        productId: l.productId,
        sku: l.sku,
        name: l.name,
        unit: l.unit,
        qty: l.qty,
        costPrice: l.unitPrice,
        total: l.total,
        receivedQty: 0,
      })),
      totalAmount: approvedPR!.totalAmount,
      createdBy: "วรรณา คุ้มค่า",
      paymentType: "เงินเชื่อ",
      paymentStatus: "ยังไม่ขอจ่าย",
    };

    s = appReducer(s, {
      type: "requisitions/convertToPO",
      prId: approvedPR!.id,
      newPO,
    });

    // PR status updated to "แปลงเป็น PO แล้ว"
    const updatedPR = s.purchaseRequisitions.find((pr) => pr.id === approvedPR!.id);
    expect(updatedPR?.status).toBe("แปลงเป็น PO แล้ว");
    expect(updatedPR?.poId).toBe("PO-CONVERT-TEST");

    // PO appended to purchaseOrders (which feeds round 2 receiving)
    expect(s.purchaseOrders.some((p) => p.id === "PO-CONVERT-TEST")).toBe(true);
  });

  it("handles payment requests and agent receipts", () => {
    let s = createInitialState();
    const newReq = {
      id: "PAY-TEST-001",
      poId: "PO-2611-001",
      poNumber: "PO-2611-001",
      supplierName: "บริษัท สหพัฒนพิบูล จำกัด (มหาชน)",
      paymentType: "เงินเชื่อ" as const,
      amount: 1626,
      dueDate: new Date().toISOString(),
      creditDays: 30,
      status: "รออนุมัติจ่าย" as const,
      requestedBy: "วรรณา คุ้มค่า",
      requestedAt: new Date().toISOString(),
    };

    s = appReducer(s, { type: "payments/addRequest", request: newReq });
    expect(s.paymentRequests.some((p) => p.id === "PAY-TEST-001")).toBe(true);

    s = appReducer(s, {
      type: "payments/updateStatus",
      id: "PAY-TEST-001",
      status: "อนุมัติจ่ายแล้ว",
      at: new Date().toISOString(),
      by: "ผู้จัดการ",
    });
    expect(s.paymentRequests.find((p) => p.id === "PAY-TEST-001")?.status).toBe("อนุมัติจ่ายแล้ว");

    // Add agent receipt
    const newReceipt = {
      id: "RCP-TEST-001",
      receiptNumber: "INV-TAX-99999",
      companyId: "COMP-01",
      companyName: "บริษัท สหพัฒนพิบูล จำกัด (มหาชน)",
      poId: "PO-2611-001",
      poNumber: "PO-2611-001",
      amount: 1626,
      issueDate: new Date().toISOString(),
      fileName: "ใบเสร็จทดสอบ.pdf",
      fileSize: "100 KB",
      fileType: "pdf" as const,
      status: "ถูกต้อง" as const,
    };
    s = appReducer(s, {
      type: "payments/addReceipt",
      receipt: newReceipt,
      paymentRequestId: "PAY-TEST-001",
    });
    expect(s.agentReceipts.some((r) => r.id === "RCP-TEST-001")).toBe(true);
    expect(s.paymentRequests.find((p) => p.id === "PAY-TEST-001")?.receiptId).toBe("RCP-TEST-001");
  });
});

describe("Round 3 Navigation & Built Routes", () => {
  it("has all 6 purchasing routes in BUILT_ROUTES", () => {
    const requiredRoutes = [
      "/purchasing/suppliers",
      "/purchasing/quotations",
      "/purchasing/reorder",
      "/purchasing/requisitions",
      "/purchasing/orders",
      "/purchasing/payments",
    ];
    for (const r of requiredRoutes) {
      expect(BUILT_ROUTES.has(r)).toBe(true);
    }
  });

  it("has purchasing items configured in NAV_BY_ROLE", () => {
    const purchasingNav = NAV_BY_ROLE.purchasing;
    expect(purchasingNav).toBeDefined();

    const allItems = purchasingNav.flatMap((g) => g.items);
    const hrefs = allItems.map((i) => i.href);

    expect(hrefs).toContain("/purchasing/suppliers");
    expect(hrefs).toContain("/purchasing/quotations");
    expect(hrefs).toContain("/purchasing/reorder");
    expect(hrefs).toContain("/purchasing/requisitions");
    expect(hrefs).toContain("/purchasing/orders");
    expect(hrefs).toContain("/purchasing/payments");
  });

  it("has Thai breadcrumb segment labels for all purchasing routes", () => {
    expect(SEGMENT_LABELS.suppliers).toBe("ตัวแทนจำหน่ายและบริษัทคู่ค้า");
    expect(SEGMENT_LABELS.quotations).toBe("ใบเสนอราคา");
    expect(SEGMENT_LABELS.reorder).toBe("สินค้าถึงจุดสั่งซื้อ");
    expect(SEGMENT_LABELS.requisitions).toBe("ใบเสนอซื้อ (PR)");
    expect(SEGMENT_LABELS.orders).toBe("ใบสั่งซื้อ (PO)");
    expect(SEGMENT_LABELS.payments).toBe("ขออนุมัติจ่ายเงิน");
  });
});

