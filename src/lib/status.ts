import type { ApprovalStatus, GiftStatus, OrderStatus } from "./mock-data";

/**
 * Single source of truth for status colors. Extend here (never inline colors).
 * Class strings are literal so Tailwind keeps them.
 */
export type Tone =
  | "gray"
  | "amber"
  | "blue"
  | "indigo"
  | "cyan"
  | "green"
  | "red"
  | "slate"
  | "zinc";

export const TONE_CLASSES: Record<Tone, { badge: string; dot: string }> = {
  gray: { badge: "bg-tone-gray-soft text-tone-gray", dot: "bg-tone-gray" },
  amber: { badge: "bg-tone-amber-soft text-tone-amber", dot: "bg-tone-amber" },
  blue: { badge: "bg-tone-blue-soft text-tone-blue", dot: "bg-tone-blue" },
  indigo: { badge: "bg-tone-indigo-soft text-tone-indigo", dot: "bg-tone-indigo" },
  cyan: { badge: "bg-tone-cyan-soft text-tone-cyan", dot: "bg-tone-cyan" },
  green: { badge: "bg-tone-green-soft text-tone-green", dot: "bg-tone-green" },
  red: { badge: "bg-tone-red-soft text-tone-red", dot: "bg-tone-red" },
  slate: { badge: "bg-tone-slate-soft text-tone-slate", dot: "bg-tone-slate" },
  zinc: { badge: "bg-tone-zinc-soft text-tone-zinc", dot: "bg-tone-zinc" },
};

export const ORDER_STATUS_TONE: Record<OrderStatus, Tone> = {
  รอชำระ: "gray",
  รอตรวจสอบ: "amber",
  ชำระแล้ว: "blue",
  กำลังเตรียม: "indigo",
  จัดส่งแล้ว: "cyan",
  ส่งสำเร็จ: "green",
  ส่งไม่สำเร็จ: "red",
  ตีกลับ: "red",
  หมดเวลา: "slate",
  ยกเลิก: "zinc",
};

export const APPROVAL_STATUS_TONE: Record<ApprovalStatus, Tone> = {
  รออนุมัติ: "amber",
  รอพิจารณา: "amber",
  อนุมัติ: "green",
  ไม่อนุมัติ: "red",
};

export const GIFT_STATUS_TONE: Record<GiftStatus, Tone> = {
  รอจัดเตรียม: "amber",
  จัดเตรียมแล้ว: "blue",
  จัดส่งแล้ว: "green",
};

export const STOCK_STATUS_TONE: Record<string, Tone> = {
  ถึงจุดสั่งซื้อ: "amber",
  สินค้าหมด: "red",
  ปกติ: "green",
  สต็อกปกติ: "green",
  รอจัดซื้อดำเนินการ: "amber",
  "เปิด PO แล้ว": "blue",
  "รับเข้าคลังแล้ว": "green",
  "รอรับเข้าคลัง": "amber",
  รอรับสินค้า: "blue",
  รับครบแล้ว: "green",
  รับสินค้าบางส่วน: "amber",
  ถูกต้อง: "green",
  ไม่ถูกต้อง: "red",
  ต้องส่งคืนตัวแทน: "red",
  // Purchasing domain statuses
  "แปลงเป็น PO แล้ว": "blue",
  "สั่งซื้อแล้ว": "blue",
  ORDERED: "blue",
  PENDING_APPROVAL: "amber",
  APPROVED: "green",
  REJECTED: "red",
  รออนุมัติจ่าย: "amber",
  รออนุมัติจ่ายเงิน: "amber",
  อนุมัติจ่ายแล้ว: "cyan",
  จ่ายเงินแล้ว: "green",
  ยังไม่ขอจ่าย: "gray",
  เงินสด: "blue",
  เงินเชื่อ: "indigo",
  ใช้งานอยู่: "green",
  หมดอายุ: "slate",
  อนุมัติแล้ว: "green",
};

export type KnownStatus = OrderStatus | ApprovalStatus | GiftStatus;

const ALL_TONES: Record<string, Tone> = {
  ...ORDER_STATUS_TONE,
  ...APPROVAL_STATUS_TONE,
  ...GIFT_STATUS_TONE,
  ...STOCK_STATUS_TONE,
};

export const toneForStatus = (status: string): Tone => ALL_TONES[status] ?? "gray";
