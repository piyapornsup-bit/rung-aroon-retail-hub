import { describe, expect, it } from "vitest";

import {
  createInitialState,
  appReducer,
  selectPendingPRs,
  selectApprovedPRs,
  selectPendingReceivingPOs,
  selectPendingPaymentRequests,
  selectPendingAgentReceipts,
  selectArchivedAgentReceipts,
  type AppState,
} from "@/lib/store";
import type {
  PurchaseOrder,
  PurchaseRequisition,
  PaymentRequest,
  AgentReceipt,
  LowStockNotification,
} from "@/lib/mock-data";

describe("Round 3 Part 4 - End-to-End Cross-Role Data Flow & State Consistency", () => {
  it("completes full happy path: Low Stock -> PR -> Manager Approval -> PO -> Receiving -> Stock Increase -> Payment Request -> Manager Payment Approval -> Receipt Archiving", () => {
    let state: AppState = createInitialState();

    // 1. Warehouse detects low stock and alerts purchasing
    const lowStockProduct = state.catalog.products.find((p) => p.stock <= p.reorderPoint);
    expect(lowStockProduct).toBeDefined();
    const initialStock = lowStockProduct!.stock;

    const notification: LowStockNotification = {
      id: "NOTIF-FLOW-01",
      createdAt: new Date().toISOString(),
      senderName: "สมบูรณ์ คลังดี",
      status: "ส่งแจ้งเตือนแล้ว",
      items: [
        {
          productId: lowStockProduct!.id,
          productName: lowStockProduct!.name,
          sku: lowStockProduct!.sku,
          currentStock: lowStockProduct!.stock,
          reorderPoint: lowStockProduct!.reorderPoint,
          warehouseName: "โกดังหลัก (A1)",
        },
      ],
      totalItems: 1,
    };
    state = appReducer(state, { type: "stock/sendNotification", notification });
    expect(state.lowStockNotifications[0].id).toBe("NOTIF-FLOW-01");

    // 2. Purchasing creates PR for the item
    const prId = "PR-FLOW-001";
    const orderQty = 50;
    const unitPrice = 120;
    const prTotal = orderQty * unitPrice;

    const draftPR: PurchaseRequisition = {
      id: prId,
      prNumber: prId,
      companyId: "COMP-001",
      companyName: "บริษัท เบอร์ลี่ ยุคเกอร์ จำกัด (มหาชน)",
      agentId: "AGT-001",
      agentName: "คุณกิตติศักดิ์ เจริญผล",
      requestedAt: new Date().toISOString(),
      requestedBy: "วรรณา คุ้มค่า",
      status: "รออนุมัติ",
      lines: [
        {
          productId: lowStockProduct!.id,
          sku: lowStockProduct!.sku,
          name: lowStockProduct!.name,
          unit: lowStockProduct!.unit,
          qty: orderQty,
          unitPrice: unitPrice,
          total: prTotal,
        },
      ],
      totalAmount: prTotal,
      reason: "สต็อกต่ำกว่าเกณฑ์ความปลอดภัยตามที่คลังสินค้าแจ้งเตือน",
    };
    state = appReducer(state, { type: "requisitions/add", pr: draftPR });

    // Verify PR is in pending list
    expect(selectPendingPRs(state).some((p) => p.id === prId)).toBe(true);

    // 3. Manager reviews and approves PR
    state = appReducer(state, {
      type: "requisitions/updateStatus",
      id: prId,
      status: "อนุมัติ",
      at: new Date().toISOString(),
      by: "ผู้จัดการ ประเสริฐ",
    });

    const approvedPR = state.purchaseRequisitions.find((p) => p.id === prId);
    expect(approvedPR?.status).toBe("อนุมัติ");
    expect(approvedPR?.approvedBy).toBe("ผู้จัดการ ประเสริฐ");
    expect(selectApprovedPRs(state).some((p) => p.id === prId)).toBe(true);

    // 4. Purchasing converts approved PR to PO
    const poId = "PO-FLOW-001";
    const newPO: PurchaseOrder = {
      id: poId,
      poNumber: poId,
      supplierName: approvedPR!.companyName,
      companyId: approvedPR!.companyId,
      agentId: approvedPR!.agentId,
      agentName: approvedPR!.agentName,
      prId: approvedPR!.id,
      prNumber: approvedPR!.prNumber,
      warehouseId: "WH-001",
      warehouseName: "โกดังหลัก (A1)",
      orderDate: new Date().toISOString(),
      expectedDate: new Date(Date.now() + 3 * 86400000).toISOString(),
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
        warehouseId: "WH-001",
        warehouseName: "โกดังหลัก (A1)",
      })),
      totalAmount: approvedPR!.totalAmount,
      createdBy: "วรรณา คุ้มค่า",
      paymentType: "เงินเชื่อ",
      paymentStatus: "ยังไม่ขอจ่าย",
    };

    state = appReducer(state, { type: "requisitions/convertToPO", prId, newPO });

    // PR status must become "แปลงเป็น PO แล้ว"
    const convertedPR = state.purchaseRequisitions.find((p) => p.id === prId);
    expect(convertedPR?.status).toBe("แปลงเป็น PO แล้ว");
    expect(convertedPR?.poId).toBe(poId);

    // PO must be waiting in warehouse receiving
    expect(selectPendingReceivingPOs(state).some((po) => po.id === poId)).toBe(true);

    // 5. Warehouse inspects and confirms receiving
    state = appReducer(state, {
      type: "purchaseOrders/receive",
      poId: poId,
      lineResults: [
        {
          productId: lowStockProduct!.id,
          deliveredQty: orderQty,
          checkStatus: "ถูกต้อง",
          note: "สินค้าครบถ้วน สภาพสมบูรณ์",
        },
      ],
      at: new Date().toISOString(),
      receivingNote: "ตรวจรับเข้าคลังเรียบร้อย",
    });

    // Check PO status
    const receivedPO = state.purchaseOrders.find((p) => p.id === poId);
    expect(receivedPO?.status).toBe("รับครบแล้ว");

    // Product stock MUST BE INCREASED by orderQty
    const updatedProduct = state.catalog.products.find((p) => p.id === lowStockProduct!.id);
    expect(updatedProduct?.stock).toBe(initialStock + orderQty);

    // 6. Purchasing requests payment for the received PO
    const paymentReqId = "PAY-FLOW-001";
    const paymentRequest: PaymentRequest = {
      id: paymentReqId,
      requestNumber: paymentReqId,
      poId: poId,
      poNumber: poId,
      companyId: receivedPO!.companyId,
      companyName: receivedPO!.supplierName,
      agentId: receivedPO!.agentId,
      agentName: receivedPO!.agentName,
      paymentType: "เงินเชื่อ",
      amount: receivedPO!.totalAmount,
      requestedAt: new Date().toISOString(),
      requestedBy: "วรรณา คุ้มค่า",
      status: "รออนุมัติจ่าย",
      payee: receivedPO!.supplierName,
      bankAccount: "ธนาคารกสิกรไทย 012-3-45678-9",
    };

    state = appReducer(state, { type: "payments/addRequest", request: paymentRequest });

    // Payment request must be pending in manager's approval queue
    expect(selectPendingPaymentRequests(state).some((p) => p.id === paymentReqId)).toBe(true);

    // Associated PO payment status must reflect "รออนุมัติจ่าย"
    const poAfterReq = state.purchaseOrders.find((p) => p.id === poId);
    expect(poAfterReq?.paymentStatus).toBe("รออนุมัติจ่าย");

    // 7. Manager reviews and approves payment
    state = appReducer(state, {
      type: "payments/updateStatus",
      id: paymentReqId,
      status: "อนุมัติจ่ายแล้ว",
      at: new Date().toISOString(),
      by: "ผู้จัดการ ประเสริฐ",
    });

    const approvedPay = state.paymentRequests.find((p) => p.id === paymentReqId);
    expect(approvedPay?.status).toBe("อนุมัติจ่ายแล้ว");

    // PO payment status updates to "อนุมัติจ่ายแล้ว"
    const poAfterPay = state.purchaseOrders.find((p) => p.id === poId);
    expect(poAfterPay?.paymentStatus).toBe("อนุมัติจ่ายแล้ว");

    // 8. Agent receipt is uploaded and pending archiving for Owner
    const receiptId = "RCP-FLOW-001";
    const agentReceipt: AgentReceipt = {
      id: receiptId,
      receiptNumber: "INV-BJC-2026-9999",
      companyId: receivedPO!.companyId,
      companyName: receivedPO!.supplierName,
      agentId: receivedPO!.agentId,
      agentName: receivedPO!.agentName,
      poId: poId,
      poNumber: poId,
      paymentRequestId: paymentReqId,
      receiptDate: new Date().toISOString().slice(0, 10),
      totalAmount: receivedPO!.totalAmount,
      taxInvoiceNumber: "TAX-9999",
      uploadedAt: new Date().toISOString(),
      uploadedBy: "วรรณา คุ้มค่า",
      archiveStatus: "รอจัดเก็บ",
    };

    state = appReducer(state, {
      type: "payments/addReceipt",
      receipt: agentReceipt,
      paymentRequestId: paymentReqId,
    });

    // Owner sees receipt in pending list
    expect(selectPendingAgentReceipts(state).some((r) => r.id === receiptId)).toBe(true);

    // 9. Owner archives the receipt
    const archiveTime = new Date().toISOString();
    state = appReducer(state, {
      type: "receipts/archive",
      id: receiptId,
      at: archiveTime,
      by: "วิชัย รุ่งอรุณ",
    });

    const archived = state.agentReceipts.find((r) => r.id === receiptId);
    expect(archived?.archiveStatus).toBe("จัดเก็บแล้ว");
    expect(archived?.archivedAt).toBe(archiveTime);
    expect(archived?.archivedBy).toBe("วิชัย รุ่งอรุณ");
    expect(selectArchivedAgentReceipts(state).some((r) => r.id === receiptId)).toBe(true);
  });

  it("handles alternative path: PR rejection cleanly terminates purchase without affecting POs or stock", () => {
    let state = createInitialState();
    const pendingPR = state.purchaseRequisitions.find((p) => p.status === "รออนุมัติ");
    expect(pendingPR).toBeDefined();

    const initialPOCount = state.purchaseOrders.length;

    // Manager rejects PR
    state = appReducer(state, {
      type: "requisitions/updateStatus",
      id: pendingPR!.id,
      status: "ไม่อนุมัติ",
      rejectionReason: "ราคาเกินงบประมาณที่ตั้งไว้",
      at: new Date().toISOString(),
      by: "ผู้จัดการ ประเสริฐ",
    });

    const rejectedPR = state.purchaseRequisitions.find((p) => p.id === pendingPR!.id);
    expect(rejectedPR?.status).toBe("ไม่อนุมัติ");
    expect(rejectedPR?.rejectionReason).toBe("ราคาเกินงบประมาณที่ตั้งไว้");

    // No PO was created
    expect(state.purchaseOrders.length).toBe(initialPOCount);
  });

  it("handles alternative path: payment rejection cleanly sets status to ปฏิเสธ", () => {
    let state = createInitialState();
    const pendingPay = state.paymentRequests.find((p) => p.status === "รออนุมัติจ่าย");
    expect(pendingPay).toBeDefined();

    // Manager rejects payment request
    state = appReducer(state, {
      type: "payments/updateStatus",
      id: pendingPay!.id,
      status: "ปฏิเสธ",
      rejectionReason: "เอกสารใบแจ้งหนี้ไม่ตรงกับคำขอ",
      at: new Date().toISOString(),
      by: "ผู้จัดการ ประเสริฐ",
    });

    const rejectedPay = state.paymentRequests.find((p) => p.id === pendingPay!.id);
    expect(rejectedPay?.status).toBe("ปฏิเสธ");
    expect(rejectedPay?.rejectionReason).toBe("เอกสารใบแจ้งหนี้ไม่ตรงกับคำขอ");
  });
});

