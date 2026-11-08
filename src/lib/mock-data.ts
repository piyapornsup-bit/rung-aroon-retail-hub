/**
 * Mock data for ร้านรุ่งอรุณ มินิมาร์ท back office.
 * Organized by domain. Later rounds append new domains (warehouse, purchasing, ...)
 * as new sections at the bottom — keep each section self-contained.
 */

/* ───────────────────────── Shared helpers ───────────────────────── */

const MINUTE = 60_000;
/** ISO timestamp n minutes before the app loaded (render via <ClientTime>). */
export const minutesAgo = (n: number) => new Date(Date.now() - n * MINUTE).toISOString();
export const daysFromNow = (n: number) => new Date(Date.now() + n * 24 * 60 * MINUTE).toISOString();

/* ───────────────────────── Roles & staff ───────────────────────── */

export type RoleKey = "sales" | "warehouse" | "purchasing" | "manager" | "owner";

export const ROLE_LABELS: Record<RoleKey, string> = {
  sales: "พนักงานขาย",
  warehouse: "พนักงานคลังสินค้า",
  purchasing: "พนักงานจัดซื้อ",
  manager: "ผู้จัดการร้าน",
  owner: "เจ้าของกิจการ",
};

export const ROLE_ORDER: RoleKey[] = ["sales", "warehouse", "purchasing", "manager", "owner"];

export interface EmployeeHistoryRecord {
  id: string;
  at: string;
  action: string;
  detail: string;
  category: "auth" | "sales" | "warehouse" | "purchasing" | "management";
}

export interface StaffUser {
  id: string;
  username: string;
  password: string; // demo only
  firstName?: string;
  lastName?: string;
  name: string;
  nickname: string;
  /** Every employee has exactly one duty. */
  role: RoleKey;
  position?: string;
  duty?: string;
  history?: EmployeeHistoryRecord[];
}

export const staffUsers: StaffUser[] = [
  {
    id: "U01",
    username: "sale01",
    password: "1234",
    firstName: "สมใจ",
    lastName: "ใจดี",
    name: "สมใจ ใจดี",
    nickname: "ใจ",
    role: "sales",
    position: "พนักงานแคชเชียร์และงานขาย",
    duty: "แคชเชียร์และบริการลูกค้าหน้าร้าน",
    history: [
      { id: "H01", at: minutesAgo(120), action: "เปิดกะขายหน้าร้าน", detail: "เปิดระบบ POS กะเช้า เงินทอน 2,000 บาท", category: "sales" },
      { id: "H02", at: minutesAgo(360), action: "ตรวจสอบสลิปโอนเงิน", detail: "ตรวจสอบคำสั่งซื้อออนไลน์ ORD-2611-002", category: "sales" },
    ],
  },
  {
    id: "U02",
    username: "stock01",
    password: "1234",
    firstName: "ประเสริฐ",
    lastName: "ขยันยิ่ง",
    name: "ประเสริฐ ขยันยิ่ง",
    nickname: "เสริฐ",
    role: "warehouse",
    position: "เจ้าหน้าที่คลังสินค้าอาวุโส",
    duty: "ตรวจรับและจัดเก็บสินค้าในคลัง",
    history: [
      { id: "H03", at: minutesAgo(180), action: "ตรวจรับสินค้า PO", detail: "ตรวจรับบะหมี่และของแห้งเข้าโกดัง 2", category: "warehouse" },
      { id: "H04", at: minutesAgo(480), action: "ตรวจนับสต็อกประจำสัปดาห์", detail: "ตรวจนับหมวดหมู่กิ๊ฟช็อปและสบู่ ปรับยอดสินค้าชำรุด", category: "warehouse" },
    ],
  },
  {
    id: "U03",
    username: "buy01",
    password: "1234",
    firstName: "วรรณา",
    lastName: "คุ้มค่า",
    name: "วรรณา คุ้มค่า",
    nickname: "วรรณ",
    role: "purchasing",
    position: "เจ้าหน้าที่จัดซื้อ",
    duty: "จัดซื้อ ตรวจสอบราคา และประสานงานตัวแทน",
    history: [
      { id: "H05", at: minutesAgo(240), action: "สร้างใบเสนอซื้อ (PR)", detail: "สร้าง PR-2611-001 เติมสต็อกสินค้าถึงจุดสั่งซื้อ", category: "purchasing" },
      { id: "H06", at: minutesAgo(600), action: "บันทึกใบเสนอราคา", detail: "บันทึกใบเสนอราคา QT-2611-001 จาก บจก.สหพัฒน์", category: "purchasing" },
    ],
  },
  {
    id: "U04",
    username: "manager",
    password: "1234",
    firstName: "ธนพล",
    lastName: "รุ่งเรือง",
    name: "ธนพล รุ่งเรือง",
    nickname: "พล",
    role: "manager",
    position: "ผู้จัดการทั่วไป",
    duty: "อนุมัติใบเสนอซื้อและบริหารจัดการร้าน",
    history: [
      { id: "H07", at: minutesAgo(300), action: "อนุมัติใบเสนอซื้อ", detail: "อนุมัติ PR-2611-002 ยอด ฿4,008 สำหรับโปรโมชัน", category: "management" },
      { id: "H08", at: minutesAgo(720), action: "อนุมัติเบิกจ่ายเงิน", detail: "อนุมัติจ่ายเงิน PAY-2611-001 ยอด ฿1,626", category: "management" },
      { id: "H09", at: minutesAgo(1200), action: "ไม่อนุมัติ PR", detail: "ไม่อนุมัติ PR-2611-003 เนื่องจากยอดสั่งซื้อเกินงบประจำสัปดาห์", category: "management" },
    ],
  },
  {
    id: "U05",
    username: "owner",
    password: "1234",
    firstName: "อรุณี",
    lastName: "รุ่งอรุณ",
    name: "อรุณี รุ่งอรุณ",
    nickname: "อรุณ",
    role: "owner",
    position: "เจ้าของกิจการและผู้บริหาร",
    duty: "บริหารธุรกิจและวางแผนยุทธศาสตร์",
    history: [
      { id: "H10", at: minutesAgo(720), action: "จัดเก็บใบเสร็จตัวแทน", detail: "ตรวจสอบและจัดเก็บใบเสร็จ RCP-2611-001 ของ บจก.สหพัฒน์", category: "management" },
      { id: "H11", at: minutesAgo(1440), action: "ทบทวนรายงานผลประกอบการ", detail: "ตรวจรายงานสรุปยอดขายและกำไรขั้นต้นรอบสัปดาห์", category: "management" },
    ],
  },
  {
    id: "U06",
    username: "stock02",
    password: "1234",
    firstName: "วิชัย",
    lastName: "ว่องไว",
    name: "วิชัย ว่องไว",
    nickname: "ชัย",
    role: "warehouse",
    position: "พนักงานจัดเตรียมสินค้าออนไลน์",
    duty: "จัดเตรียมและแพ็กสินค้าออเดอร์ออนไลน์",
    history: [
      { id: "H12", at: minutesAgo(90), action: "แพ็กสินค้าออเดอร์ออนไลน์", detail: "แพ็กออเดอร์ ORD-2611-001 และพิมพ์ใบปะหน้าพัสดุ", category: "warehouse" },
      { id: "H13", at: minutesAgo(300), action: "ส่งมอบพัสดุขนส่ง", detail: "ส่งมอบสินค้า 4 กล่องให้ Flash Express เข้ารับ", category: "warehouse" },
    ],
  },
];

/* ───────────────────────── Catalog ───────────────────────── */

export const PRODUCT_CATEGORIES = [
  "กิ๊ฟช็อป",
  "สบู่",
  "แชมพู",
  "แปรงสีฟัน",
  "ยาสีฟัน",
  "บะหมี่กึ่งสำเร็จรูป",
  "นม",
] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export interface Product {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  category: ProductCategory | string;
  price: number;
  stock: number;
  unit: string;
  /** Emoji used as a lightweight product thumbnail. */
  emoji: string;
  /** Optional custom image URL / data URL. */
  imageUrl?: string;
  /** Product details / specifications. */
  description?: string;
  /** Point at or below which restock is needed. */
  reorderPoint?: number;
  /** Switch to enable/disable online selling. */
  isOnline?: boolean;
}

export const products: Product[] = [
  { id: "P01", sku: "GF-001", barcode: "8850001000011", name: "ตุ๊กตาหมีพวงกุญแจ", category: "กิ๊ฟช็อป", price: 59, stock: 18, unit: "ชิ้น", emoji: "🧸", reorderPoint: 10, isOnline: true, description: "ตุ๊กตาหมีขนนุ่มขนาดกะทัดรัด พร้อมห่วงพวงกุญแจโลหะ" },
  { id: "P02", sku: "GF-002", barcode: "8850001000028", name: "การ์ดอวยพรวันเกิด", category: "กิ๊ฟช็อป", price: 25, stock: 40, unit: "ใบ", emoji: "💌", reorderPoint: 15, isOnline: true, description: "การ์ดอวยพรพิมพ์ลายทองพร้อมซองจดหมายหรู" },
  { id: "P03", sku: "GF-003", barcode: "8850001000035", name: "แก้วมัคลายพระอาทิตย์", category: "กิ๊ฟช็อป", price: 129, stock: 0, unit: "ใบ", emoji: "☕", reorderPoint: 10, isOnline: true, description: "แก้วเซรามิกเคลือบเงา ลายพระอาทิตย์รุ่งอรุณ ความจุ 350 มล." },
  { id: "P04", sku: "GF-004", barcode: "8850001000042", name: "ถุงของขวัญกระดาษคราฟท์", category: "กิ๊ฟช็อป", price: 15, stock: 65, unit: "ใบ", emoji: "🎁", reorderPoint: 20, isOnline: true, description: "ถุงกระดาษคราฟท์สีน้ำตาล เชือกหูหิ้วแข็งแรง ทนทาน" },
  { id: "P05", sku: "SP-001", barcode: "8850002000010", name: "สบู่นกแก้ว 105 ก.", category: "สบู่", price: 22, stock: 56, unit: "ก้อน", emoji: "🧼", reorderPoint: 20, isOnline: true, description: "สบู่สมุนไพรพฤกษานกแก้ว กลิ่นพฤกษานานาพันธุ์ สดชื่น" },
  { id: "P06", sku: "SP-002", barcode: "8850002000027", name: "สบู่เหลวลักส์ 450 มล.", category: "สบู่", price: 129, stock: 12, unit: "ขวด", emoji: "🫧", reorderPoint: 10, isOnline: true, description: "ครีมอาบน้ำลักส์ สูตรผิวเนียนนุ่ม ชุ่มชื้นยาวนาน" },
  { id: "P07", sku: "SP-003", barcode: "8850002000034", name: "สบู่เด็กโล 75 ก.", category: "สบู่", price: 35, stock: 4, unit: "ก้อน", emoji: "🧴", reorderPoint: 10, isOnline: true, description: "สบู่เด็กสูตรอ่อนโยน ไม่ระคายเคืองต่อผิวบอบบาง" },
  { id: "P08", sku: "SH-001", barcode: "8850003000019", name: "แชมพูซันซิล 160 มล.", category: "แชมพู", price: 79, stock: 22, unit: "ขวด", emoji: "🧴", reorderPoint: 15, isOnline: true, description: "แชมพูบำรุงผมลื่น สลวย เรียบตรง ไม่ชี้ฟู" },
  { id: "P09", sku: "SH-002", barcode: "8850003000026", name: "แชมพูเฮดแอนด์โชว์เดอร์ 170 มล.", category: "แชมพู", price: 99, stock: 15, unit: "ขวด", emoji: "🧴", reorderPoint: 10, isOnline: true, description: "สูตรขจัดรังแค เย็นสดชื่น สะอาดล้ำลึก" },
  { id: "P10", sku: "SH-003", barcode: "8850003000033", name: "แชมพูซองแพนทีน", category: "แชมพู", price: 6, stock: 120, unit: "ซอง", emoji: "💧", reorderPoint: 30, isOnline: true, description: "แชมพูสูตรโททัล แดเมจ แคร์ ขนาดพกพา ซองละ 10 มล." },
  { id: "P11", sku: "TB-001", barcode: "8850004000018", name: "แปรงสีฟันคอลเกต ขนนุ่ม", category: "แปรงสีฟัน", price: 35, stock: 30, unit: "ด้าม", emoji: "🪥", reorderPoint: 15, isOnline: true, description: "ขนแปรงนุ่มพิเศษ ปลายเรียวแหลม ซอกซอนลึก" },
  { id: "P12", sku: "TB-002", barcode: "8850004000025", name: "แปรงสีฟันเด็ก ซิสเท็มมา", category: "แปรงสีฟัน", price: 45, stock: 0, unit: "ด้าม", emoji: "🪥", reorderPoint: 12, isOnline: true, description: "หัวแปรงขนาดกะทัดรัด สำหรับฟันน้ำนมและฟันแท้ของเด็ก" },
  { id: "P13", sku: "TB-003", barcode: "8850004000032", name: "แปรงสีฟันแพ็ค 3 ด้าม", category: "แปรงสีฟัน", price: 89, stock: 9, unit: "แพ็ค", emoji: "🪥", reorderPoint: 15, isOnline: true, description: "แพ็คสุดคุ้ม 3 ด้าม คละสี ขนแปรงนุ่มปานกลาง" },
  { id: "P14", sku: "TP-001", barcode: "8850005000017", name: "ยาสีฟันคอลเกต 150 ก.", category: "ยาสีฟัน", price: 65, stock: 26, unit: "หลอด", emoji: "🦷", reorderPoint: 15, isOnline: true, description: "สูตรรสยอดนิยม ฟลูออไรด์ป้องกันฟันผุ" },
  { id: "P15", sku: "TP-002", barcode: "8850005000024", name: "ยาสีฟันดาร์ลี่ 160 ก.", category: "ยาสีฟัน", price: 72, stock: 19, unit: "หลอด", emoji: "🦷", reorderPoint: 15, isOnline: true, description: "สูตรดับเบิ้ลแอ็คชั่น กลิ่นเปปเปอร์มินต์ ลมหายใจหอมสดชื่น" },
  { id: "P16", sku: "TP-003", barcode: "8850005000031", name: "ยาสีฟันสมุนไพรเทพไทย", category: "ยาสีฟัน", price: 39, stock: 3, unit: "หลอด", emoji: "🌿", reorderPoint: 10, isOnline: true, description: "ยาสีฟันสมุนไพรสูตรเข้มข้น ดูแลเหงือกและฟัน" },
  { id: "P17", sku: "NO-001", barcode: "8850006000016", name: "มาม่า ต้มยำกุ้ง", category: "บะหมี่กึ่งสำเร็จรูป", price: 7, stock: 240, unit: "ซอง", emoji: "🍜", reorderPoint: 50, isOnline: true, description: "รสชาติต้นตำรับ แซ่บเข้มข้นถึงรสต้มยำกุ้ง 55 ก." },
  { id: "P18", sku: "NO-002", barcode: "8850006000023", name: "ไวไว ปรุงสำเร็จ", category: "บะหมี่กึ่งสำเร็จรูป", price: 6, stock: 180, unit: "ซอง", emoji: "🍜", reorderPoint: 50, isOnline: true, description: "เส้นเหนียวนุ่ม ซุปกลมกล่อม หอมกลิ่นพริกไทย" },
  { id: "P19", sku: "NO-003", barcode: "8850006000030", name: "ยำยำ จัมโบ้ หมูสับ", category: "บะหมี่กึ่งสำเร็จรูป", price: 8, stock: 95, unit: "ซอง", emoji: "🍜", reorderPoint: 40, isOnline: true, description: "ขนาดจัมโบ้ อิ่มจุใจ กลิ่นหอมซุปหมูสับแท้" },
  { id: "P20", sku: "NO-004", barcode: "8850006000047", name: "มาม่าคัพ ต้มยำ", category: "บะหมี่กึ่งสำเร็จรูป", price: 15, stock: 48, unit: "ถ้วย", emoji: "🥡", reorderPoint: 30, isOnline: true, description: "มาม่าแบบถ้วยพร้อมรับประทาน ชงง่ายทุกที่ 60 ก." },
  { id: "P21", sku: "MK-001", barcode: "8850007000015", name: "นมจืดไทย-เดนมาร์ค 200 มล.", category: "นม", price: 14, stock: 72, unit: "กล่อง", emoji: "🥛", reorderPoint: 36, isOnline: true, description: "นมโคแท้ 100% ไม่ผสมนมผง หอมมัน อร่อย มีประโยชน์" },
  { id: "P22", sku: "MK-002", barcode: "8850007000022", name: "นมเปรี้ยวดัชมิลล์ 180 มล.", category: "นม", price: 15, stock: 36, unit: "ขวด", emoji: "🍶", reorderPoint: 24, isOnline: true, description: "รสผลไม้รวม มีจุลินทรีย์มีชีวิตและวิตามินบี" },
  { id: "P23", sku: "MK-003", barcode: "8850007000039", name: "นมโฟร์โมสต์ ช็อกโกแลต", category: "นม", price: 14, stock: 0, unit: "กล่อง", emoji: "🍫", reorderPoint: 24, isOnline: true, description: "รสช็อกโกแลตเข้มข้น อุดมด้วยแคลเซียมและโอเมก้า" },
  { id: "P24", sku: "MK-004", barcode: "8850007000046", name: "นมถั่วเหลืองแลคตาซอย", category: "นม", price: 12, stock: 60, unit: "กล่อง", emoji: "🫘", reorderPoint: 24, isOnline: false, description: "นมถั่วเหลืองสูตรผสมน้ำนมโคและธัญพืช 125 มล." },
];

/* ───────────────────────── Members ───────────────────────── */

export interface Member {
  code: string;
  name: string;
  phone: string;
  points: number;
  birthday: string; // "MM-DD"
  address: string;
  joinedYear: number;
  totalSpend?: number;
  tier?: string;
}

export const members: Member[] = [
  { code: "M0001", name: "คุณมานี มีสุข", phone: "0812345678", points: 1240, birthday: "11-05", address: "12/3 ซ.รุ่งอรุณ 4 ต.ในเมือง อ.เมือง จ.ขอนแก่น 40000", joinedYear: 2021 },
  { code: "M0002", name: "คุณปิติ พอใจ", phone: "0898765432", points: 85, birthday: "03-14", address: "88 ถ.มิตรภาพ ต.ในเมือง อ.เมือง จ.ขอนแก่น 40000", joinedYear: 2023 },
  { code: "M0003", name: "คุณชูใจ ใฝ่ดี", phone: "0861122334", points: 560, birthday: "11-09", address: "45 หมู่ 2 ต.ศิลา อ.เมือง จ.ขอนแก่น 40000", joinedYear: 2022 },
  { code: "M0004", name: "คุณวีระ กล้าหาญ", phone: "0823344556", points: 2310, birthday: "07-21", address: "199/7 ถ.ศรีจันทร์ ต.ในเมือง อ.เมือง จ.ขอนแก่น 40000", joinedYear: 2020 },
  { code: "M0005", name: "คุณสุดา แสงทอง", phone: "0854455667", points: 30, birthday: "01-01", address: "7 ซ.กลางเมือง 9 ต.ในเมือง อ.เมือง จ.ขอนแก่น 40000", joinedYear: 2025 },
  { code: "M0006", name: "คุณบุญมี ศรีสวัสดิ์", phone: "0875566778", points: 410, birthday: "12-25", address: "52 หมู่ 5 ต.บ้านเป็ด อ.เมือง จ.ขอนแก่น 40000", joinedYear: 2022 },
  { code: "M0007", name: "คุณกนกพร ทองดี", phone: "0836677889", points: 975, birthday: "11-12", address: "301 ถ.หน้าเมือง ต.ในเมือง อ.เมือง จ.ขอนแก่น 40000", joinedYear: 2021 },
  { code: "M0008", name: "คุณสมศักดิ์ เจริญผล", phone: "0847788990", points: 150, birthday: "05-30", address: "9/1 ซ.โพธิ์ทอง ต.ในเมือง อ.เมือง จ.ขอนแก่น 40000", joinedYear: 2024 },
  { code: "M0009", name: "คุณนภา ฟ้าใส", phone: "0818899001", points: 720, birthday: "09-18", address: "66 หมู่ 8 ต.ท่าพระ อ.เมือง จ.ขอนแก่น 40260", joinedYear: 2023 },
  { code: "M0010", name: "คุณอนันต์ ยืนยง", phone: "0899900112", points: 0, birthday: "02-08", address: "14 ถ.ประชาสโมสร ต.ในเมือง อ.เมือง จ.ขอนแก่น 40000", joinedYear: 2026 },
  { code: "M0011", name: "คุณรัชนี ดวงดี", phone: "0861010202", points: 1880, birthday: "01-01", address: "120 ซ.ศรีมงคล ต.ในเมือง อ.เมือง จ.ขอนแก่น 40000", joinedYear: 2020 },
  { code: "M0012", name: "คุณพิชัย ชัยชนะ", phone: "0822020303", points: 340, birthday: "08-02", address: "33/4 หมู่ 1 ต.พระลับ อ.เมือง จ.ขอนแก่น 40000", joinedYear: 2024 },
];

/* ───────────────────────── Online orders ───────────────────────── */

export const ORDER_STATUSES = [
  "รอชำระ",
  "รอตรวจสอบ",
  "ชำระแล้ว",
  "กำลังเตรียม",
  "จัดส่งแล้ว",
  "ส่งสำเร็จ",
  "ส่งไม่สำเร็จ",
  "ตีกลับ",
  "หมดเวลา",
  "ยกเลิก",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface OrderLine {
  productId: string;
  name: string;
  price: number;
  qty: number;
}

export interface PaymentSlip {
  bank: string;
  amount: number;
  transferredAt: string;
  reference: string;
}

export interface OrderHistoryEntry {
  at: string;
  status: OrderStatus;
  by: string;
  note?: string;
}

export const CARRIERS = [
  "Flash Express",
  "Kerry Express",
  "J&T Express",
  "ไปรษณีย์ไทย (EMS)",
  "Shopee Xpress (SPX)",
  "Ninja Van",
  "รถส่งของทางร้าน",
] as const;
export type Carrier = (typeof CARRIERS)[number];

export interface OnlineOrder {
  id: string;
  memberCode: string;
  customerName: string;
  phone: string;
  address: string;
  lines: OrderLine[];
  shippingFee: number;
  status: OrderStatus;
  createdAt: string;
  /** When the slip was submitted (for the payment-review queue). */
  submittedAt?: string;
  paymentMethod: "โอนผ่านธนาคาร" | "พร้อมเพย์";
  slip?: PaymentSlip;
  history: OrderHistoryEntry[];
  carrier?: string;
  trackingNumber?: string;
  shippedAt?: string;
  deliveredAt?: string;
  deliveryNote?: string;
  packedLines?: string[];
  // Order options chosen by customer in the app
  pointsUsed?: number;
  pointsDiscount?: number;
  receiptType: "ย่อ" | "เต็ม";
  buyerName?: string;
  buyerAddress?: string;
  buyerTaxId?: string;
  shippingMethod?: string;
  paymentDueAt?: string;
}

const line = (productId: string, qty: number): OrderLine => {
  const p = products.find((x) => x.id === productId)!;
  return { productId, name: p.name, price: p.price, qty };
};

export const orderSubtotal = (o: Pick<OnlineOrder, "lines">) =>
  (o.lines || []).reduce((s, l) => s + (l.price || 0) * (l.qty || 0), 0);

export const orderTotal = (
  o: Pick<OnlineOrder, "lines"> & Partial<Pick<OnlineOrder, "shippingFee" | "pointsDiscount">>
) =>
  Math.max(0, orderSubtotal(o) + (o.shippingFee ?? 0) - (o.pointsDiscount ?? 0));

const mkOrder = (
  o: Omit<OnlineOrder, "customerName" | "phone" | "address" | "history"> & {
    customerName?: string;
    phone?: string;
    address?: string;
    history?: OrderHistoryEntry[];
  },
): OnlineOrder => {
  const m = members.find((x) => x.code === o.memberCode);
  return {
    receiptType: "ย่อ",
    shippingMethod: "Flash Express",
    paymentDueAt: daysFromNow(1),
    ...o,
    customerName: o.customerName ?? m?.name ?? "ลูกค้าทั่วไป",
    phone: o.phone ?? m?.phone ?? "081-000-0000",
    address: o.address ?? m?.address ?? "ขอนแก่น",
    history: o.history ?? [{ at: o.createdAt, status: o.status, by: "ระบบ" }],
  };
};

export const onlineOrders: OnlineOrder[] = [
  // 1. OD-26110301 (pointsUsed: 50, pointsDiscount: 5, slip: 336, short receipt)
  mkOrder({
    id: "OD-26110301", memberCode: "M0001", lines: [line("P08", 2), line("P14", 1), line("P05", 4)],
    shippingFee: 30, status: "รอตรวจสอบ", createdAt: minutesAgo(52), submittedAt: minutesAgo(38),
    paymentMethod: "พร้อมเพย์", slip: { bank: "กสิกรไทย", amount: 336, transferredAt: minutesAgo(39), reference: "KB2611031034A" },
    shippingMethod: "Flash Express", pointsUsed: 50, pointsDiscount: 5, receiptType: "ย่อ",
    paymentDueAt: minutesAgo(-180),
  }),
  // 2. OD-26110302 (receiptType: "เต็ม", slip: 154)
  mkOrder({
    id: "OD-26110302", memberCode: "M0007", lines: [line("P01", 1), line("P02", 2), line("P04", 1)],
    shippingFee: 30, status: "รอตรวจสอบ", createdAt: minutesAgo(25), submittedAt: minutesAgo(12),
    paymentMethod: "โอนผ่านธนาคาร", slip: { bank: "ไทยพาณิชย์", amount: 154, transferredAt: minutesAgo(13), reference: "SCB0311BX7781" },
    shippingMethod: "Kerry Express", pointsUsed: 0, pointsDiscount: 0, receiptType: "เต็ม",
    buyerName: "บจก. ขอนแก่นการค้า เจริญยนต์",
    buyerAddress: "88/1 ถ.มิตรภาพ ต.ในเมือง อ.เมือง จ.ขอนแก่น 40000",
    buyerTaxId: "0105559012345",
    paymentDueAt: minutesAgo(-240),
  }),
  // 3. OD-26110303 (pointsUsed: 100, pointsDiscount: 10, receiptType: "เต็ม", slip: 410, status: "ชำระแล้ว")
  mkOrder({
    id: "OD-26110303", memberCode: "M0004", lines: [line("P17", 20), line("P21", 12), line("P24", 6)],
    shippingFee: 40, status: "ชำระแล้ว", createdAt: minutesAgo(190), submittedAt: minutesAgo(150),
    paymentMethod: "พร้อมเพย์", slip: { bank: "กรุงเทพ", amount: 410, transferredAt: minutesAgo(151), reference: "BBL031126Q0921" },
    shippingMethod: "ไปรษณีย์ไทย (EMS)", pointsUsed: 100, pointsDiscount: 10, receiptType: "เต็ม",
    buyerName: "หจก. ศิลาพาณิชย์และวัสดุ",
    buyerAddress: "123 หมู่ 4 ถ.กสิกรทุ่งสร้าง ต.ศิลา อ.เมือง จ.ขอนแก่น 40000",
    buyerTaxId: "1300900123456",
    paymentDueAt: minutesAgo(-60),
  }),
  // 4. OD-26110304 (status: "รอชำระ")
  mkOrder({
    id: "OD-26110304", memberCode: "M0009", lines: [line("P09", 1), line("P15", 1)],
    shippingFee: 30, status: "รอชำระ", createdAt: minutesAgo(18), paymentMethod: "โอนผ่านธนาคาร",
    shippingMethod: "รถส่งของทางร้าน", receiptType: "ย่อ", paymentDueAt: daysFromNow(1),
  }),
  // 5. OD-26110205 (pointsUsed: 200, pointsDiscount: 20, receiptType: "เต็ม", slip: 209, status: "ชำระแล้ว")
  mkOrder({
    id: "OD-26110205", memberCode: "M0003", lines: [line("P06", 1), line("P11", 2)],
    shippingFee: 30, status: "ชำระแล้ว", createdAt: minutesAgo(1300), submittedAt: minutesAgo(1280),
    paymentMethod: "พร้อมเพย์", slip: { bank: "กรุงไทย", amount: 209, transferredAt: minutesAgo(1281), reference: "KTB021126A118" },
    shippingMethod: "Shopee Xpress (SPX)", pointsUsed: 200, pointsDiscount: 20, receiptType: "เต็ม",
    buyerName: "บจก. สยามฟาร์มาซี ริเทล",
    buyerAddress: "456 ถ.ศรีจันทร์ ต.ในเมือง อ.เมือง จ.ขอนแก่น 40000",
    buyerTaxId: "0994000123456",
    paymentDueAt: minutesAgo(1000),
  }),
  // 6. OD-26110206 (status: "ชำระแล้ว", slip: 210)
  mkOrder({
    id: "OD-26110206", memberCode: "M0011", lines: [line("P20", 6), line("P22", 6)],
    shippingFee: 30, status: "ชำระแล้ว", createdAt: minutesAgo(1500), submittedAt: minutesAgo(1490),
    paymentMethod: "โอนผ่านธนาคาร", slip: { bank: "กสิกรไทย", amount: 210, transferredAt: minutesAgo(1491), reference: "KB021126Z5512" },
    shippingMethod: "Ninja Van", receiptType: "ย่อ", paymentDueAt: minutesAgo(1200),
  }),
  // 7. OD-26103008 (status: "ชำระแล้ว", slip: 213)
  mkOrder({
    id: "OD-26103008", memberCode: "M0002", lines: [line("P08", 1), line("P10", 10), line("P05", 2)],
    shippingFee: 30, status: "ชำระแล้ว", createdAt: minutesAgo(5800), submittedAt: minutesAgo(5780),
    paymentMethod: "โอนผ่านธนาคาร", slip: { bank: "กรุงศรี", amount: 213, transferredAt: minutesAgo(5781), reference: "BAY301026K221" },
    carrier: "Flash Express", trackingNumber: "TH90123456", shippedAt: minutesAgo(5600), deliveredAt: minutesAgo(5000),
    shippingMethod: "Flash Express", receiptType: "ย่อ", paymentDueAt: minutesAgo(5500),
  }),
  // 8. OD-26102909 (status: "ชำระแล้ว", slip: 388)
  mkOrder({
    id: "OD-26102909", memberCode: "M0012", lines: [line("P06", 2), line("P14", 2)],
    shippingFee: 0, status: "ชำระแล้ว", createdAt: minutesAgo(7300), submittedAt: minutesAgo(7290),
    paymentMethod: "พร้อมเพย์", slip: { bank: "กสิกรไทย", amount: 388, transferredAt: minutesAgo(7291), reference: "KB291026P908" },
    carrier: "Kerry Express", trackingNumber: "KEX77889900", shippedAt: minutesAgo(7100), deliveredAt: minutesAgo(6500),
    shippingMethod: "Kerry Express", receiptType: "ย่อ", paymentDueAt: minutesAgo(7000),
  }),
  // 9. OD-26102810 (status: "หมดเวลา")
  mkOrder({
    id: "OD-26102810", memberCode: "M0005", lines: [line("P19", 10)],
    shippingFee: 30, status: "หมดเวลา", createdAt: minutesAgo(8700), paymentMethod: "โอนผ่านธนาคาร",
    shippingMethod: "รถส่งของทางร้าน", receiptType: "ย่อ", paymentDueAt: minutesAgo(8600),
  }),
  // 10. OD-26110305 (status: "ชำระแล้ว", slip: 178)
  mkOrder({
    id: "OD-26110305", memberCode: "M0001", lines: [line("P01", 2), line("P04", 2)],
    shippingFee: 30, status: "ชำระแล้ว", createdAt: minutesAgo(340), submittedAt: minutesAgo(310),
    paymentMethod: "พร้อมเพย์", slip: { bank: "กสิกรไทย", amount: 178, transferredAt: minutesAgo(311), reference: "KB26110305A" },
    shippingMethod: "ไปรษณีย์ไทย (EMS)", receiptType: "ย่อ", paymentDueAt: minutesAgo(200),
  }),
];

/* ───────────────────────── Cancel & return requests ───────────────────────── */

export const APPROVAL_STATUSES = ["รอพิจารณา", "อนุมัติ", "ไม่อนุมัติ"] as const;
export type ReviewStatus = (typeof APPROVAL_STATUSES)[number];
/** Purchase requests (round 2) use รออนุมัติ instead of รอพิจารณา. */
export type ApprovalStatus = ReviewStatus | "รออนุมัติ";

export type ReturnKind = "ยกเลิกคำสั่งซื้อ" | "คืนสินค้า";

export interface ReturnRequest {
  id: string;
  orderId: string;
  kind: ReturnKind;
  memberCode: string;
  customerName: string;
  lines: OrderLine[];
  reason: string;
  detail: string;
  photoCount: number;
  status: ReviewStatus;
  requestedAt: string;
  decidedAt?: string;
  decidedBy?: string;
  decisionNote?: string;
  receivedAt?: string;
  receivedBy?: string;
  restocked?: boolean;
}

export const returnRequests: ReturnRequest[] = [
  {
    id: "RT-0041", orderId: "OD-26110205", kind: "ยกเลิกคำสั่งซื้อ", memberCode: "M0003", customerName: "คุณชูใจ ใฝ่ดี",
    lines: [line("P06", 1), line("P11", 2)], reason: "สั่งซ้ำ",
    detail: "กดสั่งซ้ำสองรอบค่ะ ขอยกเลิกรายการนี้และคืนเงินด้วยค่ะ", photoCount: 0,
    status: "รอพิจารณา", requestedAt: minutesAgo(95),
  },
  {
    id: "RT-0042", orderId: "OD-26103008", kind: "คืนสินค้า", memberCode: "M0002", customerName: "คุณปิติ พอใจ",
    lines: [line("P08", 1)], reason: "สินค้าชำรุด",
    detail: "ขวดแชมพูแตก น้ำแชมพูรั่วออกมาเลอะกล่อง", photoCount: 3,
    status: "รอพิจารณา", requestedAt: minutesAgo(240),
  },
  {
    id: "RT-0039", orderId: "OD-26102909", kind: "คืนสินค้า", memberCode: "M0012", customerName: "คุณพิชัย ชัยชนะ",
    lines: [line("P14", 1)], reason: "ได้รับสินค้าผิด",
    detail: "สั่งคอลเกตสูตรเย็นแต่ได้สูตรธรรมดา", photoCount: 2,
    status: "อนุมัติ", requestedAt: minutesAgo(4300), decidedAt: minutesAgo(4100), decidedBy: "สมใจ ใจดี",
    decisionNote: "ส่งสินค้าใหม่ให้พร้อมรอบส่งถัดไป รอรับของเดิมคืน",
  },
  {
    id: "RT-0043", orderId: "OD-26103008", kind: "คืนสินค้า", memberCode: "M0002", customerName: "คุณปิติ พอใจ",
    lines: [line("P08", 1)], reason: "บรรจุภัณฑ์ชำรุด",
    detail: "สินค้าชำรุดจากขนส่ง ส่งคืนเปลี่ยนชิ้นใหม่", photoCount: 1,
    status: "อนุมัติ", requestedAt: minutesAgo(500), decidedAt: minutesAgo(300), decidedBy: "สมใจ ใจดี",
    decisionNote: "อนุมัติให้ลูกค้าส่งคืน รอสินค้าถึงคลัง",
  },
  {
    id: "RT-0038", orderId: "OD-26102810", kind: "คืนสินค้า", memberCode: "M0005", customerName: "คุณสมหมาย มุ่งมั่น",
    lines: [line("P19", 2)], reason: "สินค้ามีตำหนิ",
    detail: "พบรอยบุบที่กระป๋อง ขอส่งคืนเปลี่ยนชิ้นใหม่", photoCount: 1,
    status: "อนุมัติ", requestedAt: minutesAgo(6200), decidedAt: minutesAgo(6000), decidedBy: "สมใจ ใจดี",
    decisionNote: "อนุมัติรับคืน", receivedAt: minutesAgo(4000), receivedBy: "สมชาย คลังสินค้า", restocked: true,
  },
  {
    id: "RT-0040", orderId: "OD-26110206", kind: "ยกเลิกคำสั่งซื้อ", memberCode: "M0011", customerName: "คุณรัชนี ดวงดี",
    lines: [line("P20", 6), line("P22", 6)], reason: "เปลี่ยนใจ",
    detail: "ไม่ต้องการแล้วค่ะ", photoCount: 0,
    status: "ไม่อนุมัติ", requestedAt: minutesAgo(1400), decidedAt: minutesAgo(1380), decidedBy: "สมใจ ใจดี",
    decisionNote: "สินค้าอยู่ระหว่างจัดเตรียมแล้ว ไม่สามารถยกเลิกได้",
  },
];

/* ───────────────────────── Gift tasks ───────────────────────── */

export type GiftType = "วันเกิด" | "ปีใหม่";
export type GiftStatus = "รอจัดเตรียม" | "จัดเตรียมแล้ว" | "จัดส่งแล้ว";

export interface GiftTask {
  id: string;
  memberCode: string;
  type: GiftType;
  giftName: string;
  dueDate: string;
  status: GiftStatus;
  preparedAt?: string;
  preparedBy?: string;
  shippedAt?: string;
  shippedBy?: string;
  carrier?: string;
  trackingNumber?: string;
  deliveryNote?: string;
}

export const giftTasks: GiftTask[] = [
  { id: "GF-101", memberCode: "M0001", type: "วันเกิด", giftName: "กระเช้าของใช้ส่วนตัว + การ์ดอวยพร", dueDate: daysFromNow(2), status: "รอจัดเตรียม" },
  { id: "GF-102", memberCode: "M0003", type: "วันเกิด", giftName: "แก้วมัคลายพระอาทิตย์ + ถุงของขวัญ", dueDate: daysFromNow(6), status: "รอจัดเตรียม" },
  { id: "GF-103", memberCode: "M0007", type: "วันเกิด", giftName: "ตุ๊กตาหมีพวงกุญแจ + การ์ดอวยพร", dueDate: daysFromNow(9), status: "รอจัดเตรียม" },
  { id: "GF-104", memberCode: "M0011", type: "ปีใหม่", giftName: "ชุดของขวัญปีใหม่ รุ่งอรุณ", dueDate: daysFromNow(28), status: "รอจัดเตรียม" },
  { id: "GF-105", memberCode: "M0005", type: "ปีใหม่", giftName: "ชุดของขวัญปีใหม่ รุ่งอรุณ", dueDate: daysFromNow(28), status: "จัดเตรียมแล้ว", preparedAt: minutesAgo(600), preparedBy: "สมใจ ใจดี" },
  { id: "GF-106", memberCode: "M0002", type: "วันเกิด", giftName: "ชุดกิ๊ฟเซ็ตสบู่สมุนไพรรุ่งอรุณ", dueDate: daysFromNow(1), status: "จัดเตรียมแล้ว", preparedAt: minutesAgo(240), preparedBy: "สมใจ ใจดี" },
  { id: "GF-107", memberCode: "M0004", type: "วันเกิด", giftName: "แก้วมัคสกรีนชื่อสมาชิกพิเศษ", dueDate: daysFromNow(3), status: "จัดเตรียมแล้ว", preparedAt: minutesAgo(120), preparedBy: "สมใจ ใจดี" },
  { id: "GF-100", memberCode: "M0008", type: "วันเกิด", giftName: "บัตรกำนัลส่วนลด 100 บาท + การ์ดอวยพร", dueDate: minutesAgo(1440), status: "จัดส่งแล้ว", preparedAt: minutesAgo(2880), preparedBy: "สมใจ ใจดี", shippedAt: minutesAgo(1400), shippedBy: "ประเสริฐ ขยันยิ่ง", carrier: "Flash Express", trackingNumber: "TH99881122" },
];

/* ───────────────────────── Sales (POS) ───────────────────────── */

export type ReceiptType = "short" | "full";

export interface ReceiptLine {
  productId: string;
  name: string;
  price: number;
  qty: number;
}

export interface Receipt {
  id: string;
  createdAt: string;
  cashier: string;
  lines: ReceiptLine[];
  subtotal: number;
  discount: number;
  net: number;
  cash: number;
  change: number;
  memberCode?: string;
  memberName?: string;
  pointsUsed: number;
  pointsEarned: number;
  receiptType: ReceiptType;
  buyer?: { name: string; address: string; taxId: string };
  orderId?: string;
  paymentMethod?: "เงินสด";
}

/** Pre-aggregated sales for charts (THB). */
export const salesLast7Days = [
  { day: "พ.", inStore: 8420, online: 1260 },
  { day: "พฤ.", inStore: 9150, online: 1580 },
  { day: "ศ.", inStore: 10980, online: 2140 },
  { day: "ส.", inStore: 13240, online: 2610 },
  { day: "อา.", inStore: 12510, online: 2290 },
  { day: "จ.", inStore: 9030, online: 1720 },
  { day: "วันนี้", inStore: 6380, online: 1145 },
];

export const salesTodayByHour = [
  { hour: "07:00", amount: 420 },
  { hour: "08:00", amount: 1180 },
  { hour: "09:00", amount: 860 },
  { hour: "10:00", amount: 640 },
  { hour: "11:00", amount: 930 },
  { hour: "12:00", amount: 1460 },
  { hour: "13:00", amount: 890 },
];

/** Count of in-store receipts issued earlier today (before this session). */
export const receiptsIssuedToday = 86;

/* ───────────────────────── Warehouses & Categories (Round 2) ───────────────────────── */

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  location: string;
  manager: string;
  phone: string;
  note?: string;
  createdAt: string;
}

export const warehouses: Warehouse[] = [
  {
    id: "WH-01",
    code: "WH-MAIN",
    name: "โกดังหลัก (หลังร้าน)",
    location: "12/3 ซ.รุ่งอรุณ 4 ต.ในเมือง อ.เมือง จ.ขอนแก่น 40000",
    manager: "ประเสริฐ ขยันยิ่ง",
    phone: "081-222-3344",
    note: "โกดังติดตัวร้าน จัดเก็บของใช้ส่วนตัว สบู่ แชมพู แปรงสีฟัน ยาสีฟัน",
    createdAt: minutesAgo(30000),
  },
  {
    id: "WH-02",
    code: "WH-SILA",
    name: "โกดัง 2 (ศิลา)",
    location: "88 หมู่ 2 ถ.มิตรภาพ ต.ศิลา อ.เมือง จ.ขอนแก่น 40000",
    manager: "ประเสริฐ ขยันยิ่ง",
    phone: "081-555-6677",
    note: "โกดังควบคุมอุณหภูมิ จัดเก็บอาหารสำเร็จรูป เครื่องดื่ม และนม",
    createdAt: minutesAgo(25000),
  },
  {
    id: "WH-03",
    code: "WH-TPRA",
    name: "โกดัง 3 (ท่าพระ)",
    location: "145 หมู่ 8 ต.ท่าพระ อ.เมือง จ.ขอนแก่น 40260",
    manager: "ประเสริฐ ขยันยิ่ง",
    phone: "081-888-9900",
    note: "โกดังจัดเก็บสินค้ากิ๊ฟช็อป ของขวัญ และบรรจุภัณฑ์เทศกาล",
    createdAt: minutesAgo(20000),
  },
];

export interface CategoryItem {
  id: string;
  name: string;
  /** Each category belongs to exactly ONE warehouse. */
  warehouseId: string;
  description?: string;
}

export const initialCategories: CategoryItem[] = [
  { id: "CAT-01", name: "สบู่", warehouseId: "WH-01", description: "สบู่ก้อน สบู่เหลว ผลิตภัณฑ์ทำความสะอาดผิวกาย" },
  { id: "CAT-02", name: "แชมพู", warehouseId: "WH-01", description: "แชมพูสระผม ครีมนวดผม ทรีทเม้นท์" },
  { id: "CAT-03", name: "แปรงสีฟัน", warehouseId: "WH-01", description: "แปรงสีฟันเด็ก แปรงสีฟันผู้ใหญ่ แพ็คคู่" },
  { id: "CAT-04", name: "ยาสีฟัน", warehouseId: "WH-01", description: "ยาสีฟันสูตรต่าง ๆ สมุนไพรและสูตรสดชื่น" },
  { id: "CAT-05", name: "บะหมี่กึ่งสำเร็จรูป", warehouseId: "WH-02", description: "บะหมี่กึ่งสำเร็จรูป ซอง ถ้วย อาหารกึ่งสำเร็จรูป" },
  { id: "CAT-06", name: "นม", warehouseId: "WH-02", description: "นมยูเอชที นมเปรี้ยว นมถั่วเหลือง" },
  { id: "CAT-07", name: "กิ๊ฟช็อป", warehouseId: "WH-03", description: "ของขวัญ ตุ๊กตา การ์ดอวยพร ถุงของขวัญ" },
];

/* ───────────────────────── Purchase Orders (Round 2) ───────────────────────── */

export const PO_STATUSES = [
  "แบบร่าง",
  "รออนุมัติ",
  "อนุมัติแล้ว",
  "รอรับสินค้า",
  "รับสินค้าบางส่วน",
  "รับครบแล้ว",
  "ยกเลิก",
] as const;
export type POStatus = (typeof PO_STATUSES)[number];

export interface PurchaseOrderLine {
  id?: string;
  prLineId?: string;
  prItemId?: string;
  pr_item_id?: string;
  productId: string;
  sku: string;
  name: string;
  unit: string;
  qty: number;
  costPrice: number;
  total: number;
  receivedQty?: number;
  checkStatus?: "ถูกต้อง" | "ไม่ถูกต้อง";
  note?: string;
  warehouseId?: string;
  warehouseName?: string;
}

export interface PODiscrepancyItem {
  productId: string;
  productName: string;
  sku: string;
  orderedQty: number;
  deliveredQty: number;
  discrepancyQty: number;
  reason: string;
  note?: string;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierName: string;
  warehouseId: string;
  warehouseName: string;
  orderDate: string;
  expectedDate: string;
  status: POStatus;
  lines: PurchaseOrderLine[];
  totalAmount: number;
  createdBy: string;
  note?: string;
  receivedAt?: string;
  receivedBy?: string;
  receivingNote?: string;
  discrepancies?: PODiscrepancyItem[];
  // Linked purchasing data (Round 3)
  prId?: string;
  prNumber?: string;
  pr_id?: string;
  requisition_id?: string;
  companyId?: string;
  agentId?: string;
  agentName?: string;
  agentPhone?: string;
  paymentType?: "เงินสด" | "เงินเชื่อ";
  creditTermDays?: number;
  paymentStatus?: "ยังไม่ขอจ่าย" | "รออนุมัติจ่าย" | "อนุมัติจ่ายแล้ว" | "จ่ายเงินแล้ว";
}

export const purchaseOrders: PurchaseOrder[] = [
  {
    id: "PO-2611-001",
    poNumber: "PO-2611-001",
    supplierName: "บริษัท สหพัฒนพิบูล จำกัด (มหาชน)",
    companyId: "COMP-01",
    agentId: "AGT-01",
    agentName: "คุณประสิทธิ์ ชัยมงคล",
    agentPhone: "081-456-7890",
    prId: "PR-2611-004",
    prNumber: "PR-2611-004",
    pr_id: "PR-2611-004",
    requisition_id: "PR-2611-004",
    warehouseId: "WH-02",
    warehouseName: "โกดัง 2 (ศิลา)",
    orderDate: minutesAgo(1440),
    expectedDate: daysFromNow(1),
    status: "รอรับสินค้า",
    paymentType: "เงินเชื่อ",
    creditTermDays: 30,
    paymentStatus: "อนุมัติจ่ายแล้ว",
    lines: [
      { id: "POL-001-1", pr_item_id: "PRL-2611-004-1", prItemId: "PRL-2611-004-1", prLineId: "PRL-2611-004-1", productId: "P17", sku: "NO-001", name: "มาม่า ต้มยำกุ้ง", unit: "ซอง", qty: 120, costPrice: 5.2, total: 624, receivedQty: 0 },
      { id: "POL-001-2", pr_item_id: "PRL-2611-004-2", prItemId: "PRL-2611-004-2", prLineId: "PRL-2611-004-2", productId: "P18", sku: "NO-002", name: "ไวไว ปรุงสำเร็จ", unit: "ซอง", qty: 100, costPrice: 4.5, total: 450, receivedQty: 0 },
      { id: "POL-001-3", pr_item_id: "PRL-2611-004-3", prItemId: "PRL-2611-004-3", prLineId: "PRL-2611-004-3", productId: "P20", sku: "NO-004", name: "มาม่าคัพ ต้มยำ", unit: "ถ้วย", qty: 48, costPrice: 11.5, total: 552, receivedQty: 0 },
    ],
    totalAmount: 1626,
    createdBy: "วรรณา คุ้มค่า",
    note: "เติมสต็อกบะหมี่กึ่งสำเร็จรูป รองรับยอดขายสัปดาห์นี้",
  },
  {
    id: "PO-2611-002",
    poNumber: "PO-2611-002",
    supplierName: "บริษัท ยูนิลีเวอร์ ไทย เทรดดิ้ง จำกัด",
    companyId: "COMP-02",
    agentId: "AGT-04",
    agentName: "คุณนันทพร สดใส",
    agentPhone: "082-345-6789",
    warehouseId: "WH-01",
    warehouseName: "โกดังหลัก (หลังร้าน)",
    orderDate: minutesAgo(2880),
    expectedDate: daysFromNow(2),
    status: "รอรับสินค้า",
    paymentType: "เงินสด",
    paymentStatus: "รออนุมัติจ่าย",
    lines: [
      { productId: "P05", sku: "SP-001", name: "สบู่นกแก้ว 105 ก.", unit: "ก้อน", qty: 60, costPrice: 16, total: 960, receivedQty: 0 },
      { productId: "P08", sku: "SH-001", name: "แชมพูซันซิล 160 มล.", unit: "ขวด", qty: 36, costPrice: 58, total: 2088, receivedQty: 0 },
      { productId: "P14", sku: "TP-001", name: "ยาสีฟันคอลเกต 150 ก.", unit: "หลอด", qty: 30, costPrice: 48, total: 1440, receivedQty: 0 },
    ],
    totalAmount: 4488,
    createdBy: "วรรณา คุ้มค่า",
    note: "สั่งของใช้ส่วนตัวเข้าโกดังหลัก",
  },
  {
    id: "PO-2611-003",
    poNumber: "PO-2611-003",
    supplierName: "บริษัท ฟรีสแลนด์คัมพิน่า (ประเทศไทย) จำกัด (มหาชน)",
    companyId: "COMP-03",
    agentId: "AGT-06",
    agentName: "คุณชัชวาล เลิศรัศมี",
    agentPhone: "085-678-9012",
    warehouseId: "WH-02",
    warehouseName: "โกดัง 2 (ศิลา)",
    orderDate: minutesAgo(720),
    expectedDate: daysFromNow(4),
    status: "อนุมัติแล้ว",
    paymentType: "เงินเชื่อ",
    creditTermDays: 45,
    paymentStatus: "จ่ายเงินแล้ว",
    lines: [
      { productId: "P23", sku: "MK-003", name: "นมโฟร์โมสต์ ช็อกโกแลต", unit: "กล่อง", qty: 96, costPrice: 10.5, total: 1008, receivedQty: 0 },
      { productId: "P21", sku: "MK-001", name: "นมจืดไทย-เดนมาร์ค 200 มล.", unit: "กล่อง", qty: 72, costPrice: 10.8, total: 777.6, receivedQty: 0 },
    ],
    totalAmount: 1785.6,
    createdBy: "วรรณา คุ้มค่า",
    note: "นมรสช็อกโกแลตหมดสต็อก สั่งด่วน",
  },
];

/* ───────────────────────── Stock Adjustments & Low-Stock Alerts (Round 2 Part 2) ───────────────────────── */

export interface StockAdjustment {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  warehouseId: string;
  warehouseName: string;
  previousStock: number;
  countedStock: number;
  diff: number;
  reason: string;
  countedBy: string;
  note?: string;
  createdAt: string;
}

export const initialStockAdjustments: StockAdjustment[] = [
  {
    id: "ADJ-001",
    productId: "P03",
    productName: "แก้วมัคลายพระอาทิตย์",
    sku: "GF-003",
    warehouseId: "WH-03",
    warehouseName: "โกดัง 3 (ท่าพระ)",
    previousStock: 2,
    countedStock: 0,
    diff: -2,
    reason: "สินค้าชำรุดเสียหาย (แตกหัก)",
    countedBy: "ประเสริฐ ขยันยิ่ง",
    note: "สินค้าตกแตกขณะจัดเรียงในคลัง ตัดสต็อกเหลือ 0",
    createdAt: minutesAgo(480),
  },
  {
    id: "ADJ-002",
    productId: "P07",
    productName: "สบู่เด็กโล 75 ก.",
    sku: "SP-003",
    warehouseId: "WH-01",
    warehouseName: "โกดังหลัก (หลังร้าน)",
    previousStock: 5,
    countedStock: 4,
    diff: -1,
    reason: "ตรวจนับสต็อกประจำสัปดาห์",
    countedBy: "ประเสริฐ ขยันยิ่ง",
    note: "พบกล่องบุบเสียหาย ไม่สามารถวางจำหน่ายได้",
    createdAt: minutesAgo(1200),
  },
  {
    id: "ADJ-003",
    productId: "P17",
    productName: "มาม่า ต้มยำกุ้ง",
    sku: "NO-001",
    warehouseId: "WH-02",
    warehouseName: "โกดัง 2 (ศิลา)",
    previousStock: 235,
    countedStock: 240,
    diff: 5,
    reason: "พบสินค้าตกหล่นในคลัง",
    countedBy: "ประเสริฐ ขยันยิ่ง",
    note: "ตรวจพบ 1 แพ็คเล็กที่มุมชั้นวาง ปรับยอดเพิ่มให้ตรงกับความเป็นจริง",
    createdAt: minutesAgo(1800),
  },
];

export interface LowStockNotificationItem {
  productId: string;
  sku: string;
  name: string;
  category: string;
  warehouseId: string;
  warehouseName: string;
  currentStock: number;
  reorderPoint: number;
  suggestedQty: number;
}

export interface LowStockNotification {
  id: string;
  createdAt: string;
  sentBy: string;
  itemCount: number;
  items: LowStockNotificationItem[];
  status: "รอจัดซื้อดำเนินการ" | "เปิด PO แล้ว";
  note?: string;
}

export const initialLowStockNotifications: LowStockNotification[] = [
  {
    id: "NOTIF-001",
    createdAt: minutesAgo(360),
    sentBy: "ประเสริฐ ขยันยิ่ง",
    itemCount: 4,
    items: [
      {
        productId: "P03",
        sku: "GF-003",
        name: "แก้วมัคลายพระอาทิตย์",
        category: "กิ๊ฟช็อป",
        warehouseId: "WH-03",
        warehouseName: "โกดัง 3 (ท่าพระ)",
        currentStock: 0,
        reorderPoint: 10,
        suggestedQty: 20,
      },
      {
        productId: "P07",
        sku: "SP-003",
        name: "สบู่เด็กโล 75 ก.",
        category: "สบู่",
        warehouseId: "WH-01",
        warehouseName: "โกดังหลัก (หลังร้าน)",
        currentStock: 4,
        reorderPoint: 10,
        suggestedQty: 30,
      },
      {
        productId: "P12",
        sku: "TB-002",
        name: "แปรงสีฟันเด็ก ซิสเท็มมา",
        category: "แปรงสีฟัน",
        warehouseId: "WH-01",
        warehouseName: "โกดังหลัก (หลังร้าน)",
        currentStock: 0,
        reorderPoint: 12,
        suggestedQty: 24,
      },
      {
        productId: "P23",
        sku: "MK-003",
        name: "นมโฟร์โมสต์ ช็อกโกแลต",
        category: "นม",
        warehouseId: "WH-02",
        warehouseName: "โกดัง 2 (ศิลา)",
        currentStock: 0,
        reorderPoint: 24,
        suggestedQty: 96,
      },
    ],
    status: "รอจัดซื้อดำเนินการ",
    note: "สินค้าหมดสต็อกและถึงจุดสั่งซื้อด่วน ขอให้เปิด PO",
  },
];

/* ───────────────────────── Purchasing Domain (Round 3 Part 1) ───────────────────────── */

export interface SupplierAgent {
  id: string;
  companyId: string;
  name: string;
  nickname?: string;
  phone: string;
  email: string;
  lineId?: string;
  position: string;
  isPrimary?: boolean;
}

export interface SupplierCompany {
  id: string;
  name: string;
  taxId: string;
  phone: string;
  email: string;
  address: string;
  paymentTermDays: number;
  contactPerson?: string;
  categories: string[];
  note?: string;
}

export const supplierCompanies: SupplierCompany[] = [
  {
    id: "COMP-01",
    name: "บริษัท สหพัฒนพิบูล จำกัด (มหาชน)",
    taxId: "0107537001421",
    phone: "02-293-9000",
    email: "contact@sahapat.co.th",
    address: "2156 ถนนเพชรบุรีตัดใหม่ แขวงบางกะปิ เขตห้วยขวาง กรุงเทพฯ 10310",
    paymentTermDays: 30,
    contactPerson: "คุณประสิทธิ์ ชัยมงคล",
    categories: ["บะหมี่กึ่งสำเร็จรูป", "สบู่", "แชมพู"],
    note: "ตัวแทนจำหน่ายสินค้าอุปโภคบริโภคหลัก จัดส่งตรงเวลา เครดิตเทอม 30 วัน",
  },
  {
    id: "COMP-02",
    name: "บริษัท ยูนิลีเวอร์ ไทย เทรดดิ้ง จำกัด",
    taxId: "0105509002148",
    phone: "02-554-2000",
    email: "customercare.th@unilever.com",
    address: "161 ถนนพระราม 9 แขวงห้วยขวาง เขตห้วยขวาง กรุงเทพฯ 10310",
    paymentTermDays: 30,
    contactPerson: "คุณนันทพร สดใส",
    categories: ["สบู่", "แชมพู", "ยาสีฟัน"],
    note: "ผู้ผลิตและจัดจำหน่ายผลิตภัณฑ์ดูแลสุขอนามัยส่วนบุคคล ยอดสั่งซื้อขั้นต่ำ 3,000 บาท",
  },
  {
    id: "COMP-03",
    name: "บริษัท ฟรีสแลนด์คัมพิน่า (ประเทศไทย) จำกัด (มหาชน)",
    taxId: "0107536000854",
    phone: "02-620-1999",
    email: "foremost.callcenter@frieslandcampina.com",
    address: "เลขที่ 89 อาคารเอไอเอ แคปปิตอล เซ็นเตอร์ ชั้น 6 ถนนรัชดาภิเษก เขตดินแดง กรุงเทพฯ 10400",
    paymentTermDays: 45,
    contactPerson: "คุณชัชวาล เลิศรัศมี",
    categories: ["นม", "กิ๊ฟช็อป"],
    note: "ผู้ผลิตและจำหน่ายนมโฟร์โมสต์และผลิตภัณฑ์นมพร้อมดื่ม เครดิตเทอมพิเศษ 45 วัน",
  },
];

export const supplierAgents: SupplierAgent[] = [
  // Agents for COMP-01
  {
    id: "AGT-01",
    companyId: "COMP-01",
    name: "คุณประสิทธิ์ ชัยมงคล",
    nickname: "สิทธิ์",
    phone: "081-456-7890",
    email: "prasit.c@sahapat.co.th",
    lineId: "@prasit_sp",
    position: "ผู้จัดการฝ่ายขายโมเดิร์นเทรด",
    isPrimary: true,
  },
  {
    id: "AGT-02",
    companyId: "COMP-01",
    name: "คุณสุภาวดี มั่งคั่ง",
    nickname: "แหม่ม",
    phone: "089-123-4567",
    email: "supawadee.m@sahapat.co.th",
    lineId: "@supa_sp",
    position: "เจ้าหน้าที่ประสานงานคำสั่งซื้อและการจัดส่ง",
    isPrimary: false,
  },
  {
    id: "AGT-03",
    companyId: "COMP-01",
    name: "คุณกิตติศักดิ์ เจริญดี",
    nickname: "กิต",
    phone: "086-778-8990",
    email: "kittisak.k@sahapat.co.th",
    lineId: "@kitti_sp",
    position: "ฝ่ายบริการสินเชื่อและการเงิน",
    isPrimary: false,
  },
  // Agents for COMP-02
  {
    id: "AGT-04",
    companyId: "COMP-02",
    name: "คุณนันทพร สดใส",
    nickname: "แนน",
    phone: "082-345-6789",
    email: "nantaporn.s@unilever.com",
    lineId: "@nanta_uni",
    position: "หัวหน้าฝ่ายขายค้าปลีก",
    isPrimary: true,
  },
  {
    id: "AGT-05",
    companyId: "COMP-02",
    name: "คุณธวัชชัย มั่นคง",
    nickname: "วัช",
    phone: "084-567-8901",
    email: "thawatchai.m@unilever.com",
    lineId: "@thawat_uni",
    position: "ตัวแทนประสานงานคลังและการกระจายสินค้า",
    isPrimary: false,
  },
  // Agents for COMP-03
  {
    id: "AGT-06",
    companyId: "COMP-03",
    name: "คุณชัชวาล เลิศรัศมี",
    nickname: "ชัช",
    phone: "085-678-9012",
    email: "chatchawal.l@frieslandcampina.com",
    lineId: "@chatchawal_fc",
    position: "ผู้จัดการเขตการขายภาคตะวันออกเฉียงเหนือ",
    isPrimary: true,
  },
  {
    id: "AGT-07",
    companyId: "COMP-03",
    name: "คุณพิมลวรรณ สุขุม",
    nickname: "พิม",
    phone: "087-890-1234",
    email: "pimonwan.s@frieslandcampina.com",
    lineId: "@pimonwan_fc",
    position: "เจ้าหน้าที่ฝ่ายประสานงานจัดซื้อและโปรโมชัน",
    isPrimary: false,
  },
];

/* ───────────────────────── Quotations (ใบเสนอราคา) ───────────────────────── */

export interface QuotationItem {
  productId: string;
  sku: string;
  name: string;
  unit: string;
  unitPrice: number;
  minOrderQty?: number;
}

export interface Quotation {
  id: string;
  quotationNumber: string;
  title: string;
  companyId: string;
  companyName: string;
  /** Linked to MANY agents (multi-select) */
  agentIds: string[];
  items: QuotationItem[];
  validityDays: number;
  validUntil: string;
  totalEstimatedAmount: number;
  status: "ใช้งานอยู่" | "หมดอายุ" | "ยกเลิก";
  createdBy: string;
  createdAt: string;
  note?: string;
}

export const quotations: Quotation[] = [
  {
    id: "QT-2611-001",
    quotationNumber: "QT-2611-001",
    title: "ใบเสนอราคาบะหมี่กึ่งสำเร็จรูปและของใช้ประจำไตรมาส 4/2569",
    companyId: "COMP-01",
    companyName: "บริษัท สหพัฒนพิบูล จำกัด (มหาชน)",
    agentIds: ["AGT-01", "AGT-02"],
    validityDays: 30,
    validUntil: daysFromNow(20),
    totalEstimatedAmount: 18450,
    status: "ใช้งานอยู่",
    createdBy: "วรรณา คุ้มค่า",
    createdAt: minutesAgo(2880),
    note: "ราคารวมภาษีมูลค่าเพิ่มแล้ว ส่งมอบฟรีเมื่อสั่งซื้อครบ 5,000 บาท",
    items: [
      { productId: "P17", sku: "NO-001", name: "มาม่า ต้มยำกุ้ง", unit: "ซอง", unitPrice: 5.2, minOrderQty: 60 },
      { productId: "P18", sku: "NO-002", name: "ไวไว ปรุงสำเร็จ", unit: "ซอง", unitPrice: 4.5, minOrderQty: 60 },
      { productId: "P19", sku: "NO-003", name: "ยำยำ จัมโบ้ หมูสับ", unit: "ซอง", unitPrice: 6.0, minOrderQty: 40 },
      { productId: "P20", sku: "NO-004", name: "มาม่าคัพ ต้มยำ", unit: "ถ้วย", unitPrice: 11.5, minOrderQty: 24 },
      { productId: "P05", sku: "SP-001", name: "สบู่นกแก้ว 105 ก.", unit: "ก้อน", unitPrice: 16.0, minOrderQty: 30 },
    ],
  },
  {
    id: "QT-2611-002",
    quotationNumber: "QT-2611-002",
    title: "ใบเสนอราคาผลิตภัณฑ์ดูแลสุขอนามัยและช่องปาก",
    companyId: "COMP-02",
    companyName: "บริษัท ยูนิลีเวอร์ ไทย เทรดดิ้ง จำกัด",
    agentIds: ["AGT-04", "AGT-05"],
    validityDays: 45,
    validUntil: daysFromNow(32),
    totalEstimatedAmount: 14200,
    status: "ใช้งานอยู่",
    createdBy: "วรรณา คุ้มค่า",
    createdAt: minutesAgo(4320),
    note: "มีส่วนลดพิเศษ 3% สำหรับคำสั่งซื้อเงินสด",
    items: [
      { productId: "P06", sku: "SP-002", name: "สบู่เหลวลักส์ 450 มล.", unit: "ขวด", unitPrice: 95.0, minOrderQty: 12 },
      { productId: "P07", sku: "SP-003", name: "สบู่เด็กโล 75 ก.", unit: "ก้อน", unitPrice: 24.5, minOrderQty: 24 },
      { productId: "P08", sku: "SH-001", name: "แชมพูซันซิล 160 มล.", unit: "ขวด", unitPrice: 58.0, minOrderQty: 24 },
      { productId: "P09", sku: "SH-002", name: "แชมพูเฮดแอนด์โชว์เดอร์ 170 มล.", unit: "ขวด", unitPrice: 72.0, minOrderQty: 12 },
      { productId: "P14", sku: "TP-001", name: "ยาสีฟันคอลเกต 150 ก.", unit: "หลอด", unitPrice: 48.0, minOrderQty: 24 },
    ],
  },
  {
    id: "QT-2611-003",
    quotationNumber: "QT-2611-003",
    title: "ใบเสนอราคาผลิตภัณฑ์นมพร้อมดื่มและของพรีเมียม",
    companyId: "COMP-03",
    companyName: "บริษัท ฟรีสแลนด์คัมพิน่า (ประเทศไทย) จำกัด (มหาชน)",
    agentIds: ["AGT-06", "AGT-07"],
    validityDays: 60,
    validUntil: daysFromNow(50),
    totalEstimatedAmount: 22800,
    status: "ใช้งานอยู่",
    createdBy: "วรรณา คุ้มค่า",
    createdAt: minutesAgo(1440),
    note: "เครดิตเทอม 45 วัน จัดส่งตรงถึงคลังสินค้าภายใน 3 วันทำการ",
    items: [
      { productId: "P21", sku: "MK-001", name: "นมจืดไทย-เดนมาร์ค 200 มล.", unit: "กล่อง", unitPrice: 10.8, minOrderQty: 72 },
      { productId: "P22", sku: "MK-002", name: "นมถั่วเหลืองแลคตาซอย 300 มล.", unit: "กล่อง", unitPrice: 9.2, minOrderQty: 72 },
      { productId: "P23", sku: "MK-003", name: "นมโฟร์โมสต์ ช็อกโกแลต", unit: "กล่อง", unitPrice: 10.5, minOrderQty: 96 },
      { productId: "P01", sku: "GF-001", name: "ตุ๊กตาหมีพวงกุญแจ", unit: "ชิ้น", unitPrice: 38.0, minOrderQty: 20 },
    ],
  },
];

/* ───────────────────────── Purchase Requisitions (ใบเสนอซื้อ - PR) ───────────────────────── */

export type PRStatus =
  | "รออนุมัติ"
  | "อนุมัติ"
  | "ไม่อนุมัติ"
  | "แปลงเป็น PO แล้ว"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "ORDERED"
  | "สั่งซื้อแล้ว";

export interface PurchaseRequisitionLine {
  id?: string;
  productId: string;
  sku: string;
  name: string;
  unit: string;
  qty: number;
  unitPrice: number;
  total: number;
}

export interface PurchaseRequisition {
  id: string;
  prNumber: string;
  companyId: string;
  companyName: string;
  agentId: string;
  agentName: string;
  quotationId?: string;
  quotationNumber?: string;
  reason: string;
  status: PRStatus;
  lines: PurchaseRequisitionLine[];
  totalAmount: number;
  requestedBy: string;
  requestedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  poId?: string;
  orderedAt?: string;
}

export const purchaseRequisitions: PurchaseRequisition[] = [
  {
    id: "PR-2611-001",
    prNumber: "PR-2611-001",
    companyId: "COMP-01",
    companyName: "บริษัท สหพัฒนพิบูล จำกัด (มหาชน)",
    agentId: "AGT-01",
    agentName: "คุณประสิทธิ์ ชัยมงคล",
    quotationId: "QT-2611-001",
    quotationNumber: "QT-2611-001",
    reason: "สินค้าถึงจุดสั่งซื้อด่วนตามแจ้งเตือนคลังสินค้า (มาม่า, ไวไว, สบู่นกแก้ว)",
    status: "รออนุมัติ",
    lines: [
      { id: "PRL-2611-001-1", productId: "P17", sku: "NO-001", name: "มาม่า ต้มยำกุ้ง", unit: "ซอง", qty: 120, unitPrice: 5.2, total: 624 },
      { id: "PRL-2611-001-2", productId: "P18", sku: "NO-002", name: "ไวไว ปรุงสำเร็จ", unit: "ซอง", qty: 100, unitPrice: 4.5, total: 450 },
      { id: "PRL-2611-001-3", productId: "P05", sku: "SP-001", name: "สบู่นกแก้ว 105 ก.", unit: "ก้อน", qty: 50, unitPrice: 16.0, total: 800 },
    ],
    totalAmount: 1874,
    requestedBy: "วรรณา คุ้มค่า",
    requestedAt: minutesAgo(180),
  },
  {
    id: "PR-2611-002",
    prNumber: "PR-2611-002",
    companyId: "COMP-02",
    companyName: "บริษัท ยูนิลีเวอร์ ไทย เทรดดิ้ง จำกัด",
    agentId: "AGT-04",
    agentName: "คุณนันทพร สดใส",
    quotationId: "QT-2611-002",
    quotationNumber: "QT-2611-002",
    reason: "สต็อกสบู่เหลวลักส์และแชมพูเหลือน้อย สั่งซื้อเติมสต็อกสำหรับโปรโมชันปลายปี",
    status: "อนุมัติ",
    lines: [
      { id: "PRL-2611-002-1", productId: "P06", sku: "SP-002", name: "สบู่เหลวลักส์ 450 มล.", unit: "ขวด", qty: 24, unitPrice: 95.0, total: 2280 },
      { id: "PRL-2611-002-2", productId: "P09", sku: "SH-002", name: "แชมพูเฮดแอนด์โชว์เดอร์ 170 มล.", unit: "ขวด", qty: 24, unitPrice: 72.0, total: 1728 },
    ],
    totalAmount: 4008,
    requestedBy: "วรรณา คุ้มค่า",
    requestedAt: minutesAgo(480),
    approvedBy: "ธนพล รุ่งเรือง (ผู้จัดการร้าน)",
    approvedAt: minutesAgo(300),
  },
  {
    id: "PR-2611-003",
    prNumber: "PR-2611-003",
    companyId: "COMP-03",
    companyName: "บริษัท ฟรีสแลนด์คัมพิน่า (ประเทศไทย) จำกัด (มหาชน)",
    agentId: "AGT-06",
    agentName: "คุณชัชวาล เลิศรัศมี",
    quotationId: "QT-2611-003",
    quotationNumber: "QT-2611-003",
    reason: "สั่งซื้อนมยูเอชทีจำนวนมากเกินโควตารอบสัปดาห์",
    status: "ไม่อนุมัติ",
    lines: [
      { id: "PRL-2611-003-1", productId: "P23", sku: "MK-003", name: "นมโฟร์โมสต์ ช็อกโกแลต", unit: "กล่อง", qty: 500, unitPrice: 10.5, total: 5250 },
      { id: "PRL-2611-003-2", productId: "P21", sku: "MK-001", name: "นมจืดไทย-เดนมาร์ค 200 มล.", unit: "กล่อง", qty: 300, unitPrice: 10.8, total: 3240 },
    ],
    totalAmount: 8490,
    requestedBy: "วรรณา คุ้มค่า",
    requestedAt: minutesAgo(1440),
    approvedBy: "ธนพล รุ่งเรือง (ผู้จัดการร้าน)",
    approvedAt: minutesAgo(1200),
    rejectionReason: "ยอดสั่งซื้อเกินงบประมาณจัดซื้อประจำสัปดาห์ ขอให้ปรับลดยอดลงครึ่งหนึ่งแล้วเสนอเข้ามาใหม่",
  },
  {
    id: "PR-2611-004",
    prNumber: "PR-2611-004",
    companyId: "COMP-01",
    companyName: "บริษัท สหพัฒนพิบูล จำกัด (มหาชน)",
    agentId: "AGT-01",
    agentName: "คุณประสิทธิ์ ชัยมงคล",
    quotationId: "QT-2611-001",
    quotationNumber: "QT-2611-001",
    reason: "เติมสต็อกบะหมี่กึ่งสำเร็จรูปและของใช้ประจำสัปดาห์ตามแผนงาน",
    status: "แปลงเป็น PO แล้ว",
    lines: [
      { id: "PRL-2611-004-1", productId: "P17", sku: "NO-001", name: "มาม่า ต้มยำกุ้ง", unit: "ซอง", qty: 120, unitPrice: 5.2, total: 624 },
      { id: "PRL-2611-004-2", productId: "P18", sku: "NO-002", name: "ไวไว ปรุงสำเร็จ", unit: "ซอง", qty: 100, unitPrice: 4.5, total: 450 },
      { id: "PRL-2611-004-3", productId: "P20", sku: "NO-004", name: "มาม่าคัพ ต้มยำ", unit: "ถ้วย", qty: 48, unitPrice: 11.5, total: 552 },
    ],
    totalAmount: 1626,
    requestedBy: "วรรณา คุ้มค่า",
    requestedAt: minutesAgo(1800),
    approvedBy: "ธนพล รุ่งเรือง (ผู้จัดการร้าน)",
    approvedAt: minutesAgo(1500),
    poId: "PO-2611-001",
  },
];

/* ───────────────────────── Payment Requests & Receipts (Round 3 Part 1) ───────────────────────── */

export type PaymentType = "เงินสด" | "เงินเชื่อ";
export type PaymentRequestStatus = "รออนุมัติจ่าย" | "รออนุมัติจ่ายเงิน" | "อนุมัติจ่ายแล้ว" | "จ่ายเงินแล้ว" | "ปฏิเสธ";

export interface PaymentRequest {
  id: string;
  poId: string;
  poNumber: string;
  supplierName: string;
  companyId?: string;
  agentName?: string;
  paymentType: PaymentType;
  amount: number;
  /** If credit (เงินเชื่อ), the due date */
  dueDate?: string;
  creditDays?: number;
  /** Cash conditions (paid after goods checked complete) */
  cashConditionVerified?: boolean;
  receiptId?: string;
  receiptNumber?: string;
  receiptFileName?: string;
  status: PaymentRequestStatus;
  requestedBy: string;
  requestedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  paidAt?: string;
  rejectionReason?: string;
  note?: string;
}

export const paymentRequests: PaymentRequest[] = [
  {
    id: "PAY-2611-001",
    poId: "PO-2611-001",
    poNumber: "PO-2611-001",
    supplierName: "บริษัท สหพัฒนพิบูล จำกัด (มหาชน)",
    companyId: "COMP-01",
    agentName: "คุณประสิทธิ์ ชัยมงคล",
    paymentType: "เงินเชื่อ",
    amount: 1626,
    totalAmount: 1626,
    dueDate: daysFromNow(28),
    creditDays: 30,
    receiptId: "RCP-2611-001",
    receiptNumber: "INV-SP-691104",
    receiptFileName: "ใบกำกับภาษี_สหพัฒน์_PO-2611-001.pdf",
    status: "อนุมัติจ่ายแล้ว",
    requestedBy: "วรรณา คุ้มค่า",
    requestedAt: minutesAgo(1380),
    approvedBy: "ธนพล รุ่งเรือง (ผู้จัดการร้าน)",
    approvedAt: minutesAgo(720),
    note: "วางบิลรอบสิ้นเดือน เครดิต 30 วัน แนบใบกำกับภาษีเรียบร้อย",
  },
  {
    id: "PAY-2611-002",
    poId: "PO-2611-002",
    poNumber: "PO-2611-002",
    supplierName: "บริษัท ยูนิลีเวอร์ ไทย เทรดดิ้ง จำกัด",
    companyId: "COMP-02",
    agentName: "คุณนันทพร สดใส",
    paymentType: "เงินสด",
    amount: 4488,
    totalAmount: 4488,
    cashConditionVerified: true,
    receiptId: "RCP-2611-002",
    receiptNumber: "INV-UNI-88402",
    receiptFileName: "ใบเสร็จรับเงิน_ยูนิลีเวอร์_PO-2611-002.jpg",
    status: "รออนุมัติจ่าย",
    requestedBy: "วรรณา คุ้มค่า",
    requestedAt: minutesAgo(240),
    note: "เงื่อนไขเงินสด: ตรวจรับสินค้าเข้าคลังครบถ้วนสมบูรณ์แล้ว ขออนุมัติเบิกจ่ายเงินสด",
  },
  {
    id: "PAY-2611-003",
    poId: "PO-2611-003",
    poNumber: "PO-2611-003",
    supplierName: "บริษัท ฟรีสแลนด์คัมพิน่า (ประเทศไทย) จำกัด (มหาชน)",
    companyId: "COMP-03",
    agentName: "คุณชัชวาล เลิศรัศมี",
    paymentType: "เงินเชื่อ",
    amount: 1785.6,
    totalAmount: 1785.6,
    dueDate: daysFromNow(45),
    creditDays: 45,
    receiptId: "RCP-2611-003",
    receiptNumber: "INV-FC-33921",
    receiptFileName: "ใบส่งของ_ใบกำกับภาษี_ฟรีสแลนด์_PO-2611-003.pdf",
    status: "จ่ายเงินแล้ว",
    requestedBy: "วรรณา คุ้มค่า",
    requestedAt: minutesAgo(700),
    approvedBy: "ธนพล รุ่งเรือง (ผู้จัดการร้าน)",
    approvedAt: minutesAgo(400),
    paidAt: minutesAgo(300),
    note: "ชำระเงินเรียบร้อยผ่านการโอนบัญชีธนาคารกสิกรไทย",
  },
  {
    id: "PAY-2611-004",
    poId: "PO-2611-001",
    poNumber: "PO-2611-001",
    supplierName: "บริษัท สหพัฒนพิบูล จำกัด (มหาชน)",
    companyId: "COMP-01",
    agentName: "คุณสุภาวดี มั่งคั่ง",
    paymentType: "เงินสด",
    amount: 500,
    cashConditionVerified: true,
    status: "รออนุมัติจ่าย",
    requestedBy: "วรรณา คุ้มค่า",
    requestedAt: minutesAgo(120),
    note: "ค่าจัดส่งด่วนพิเศษนอกรอบ สำหรับสินค้าถึงจุดสั่งซื้อวิกฤต",
  },
];

export interface AgentReceipt {
  id: string;
  receiptNumber: string;
  companyId: string;
  companyName: string;
  agentId?: string;
  agentName?: string;
  poId: string;
  poNumber: string;
  amount: number;
  totalAmount?: number;
  issueDate: string;
  receiptDate?: string;
  fileName: string;
  fileSize: string;
  fileType: "image" | "pdf";
  status: "ถูกต้อง" | "รอตรวจสอบ";
  archiveStatus?: "รอจัดเก็บ" | "จัดเก็บแล้ว";
  archivedAt?: string;
  archivedBy?: string;
  uploadedAt?: string;
  uploadedBy?: string;
  note?: string;
}

export const agentReceipts: AgentReceipt[] = [
  {
    id: "RCP-2611-001",
    receiptNumber: "INV-SP-691104",
    companyId: "COMP-01",
    companyName: "บริษัท สหพัฒนพิบูล จำกัด (มหาชน)",
    agentId: "AGT-01",
    agentName: "คุณประสิทธิ์ ชัยมงคล",
    poId: "PO-2611-001",
    poNumber: "PO-2611-001",
    amount: 1626,
    totalAmount: 1626,
    issueDate: minutesAgo(1400),
    fileName: "ใบกำกับภาษี_สหพัฒน์_PO-2611-001.pdf",
    fileSize: "245 KB",
    fileType: "pdf",
    status: "ถูกต้อง",
    archiveStatus: "จัดเก็บแล้ว",
    archivedAt: minutesAgo(720),
    archivedBy: "อรุณี รุ่งอรุณ (เจ้าของกิจการ)",
    note: "เอกสารต้นฉบับส่งทางไปรษณีย์ถึงร้านแล้ว",
  },
  {
    id: "RCP-2611-002",
    receiptNumber: "INV-UNI-88402",
    companyId: "COMP-02",
    companyName: "บริษัท ยูนิลีเวอร์ ไทย เทรดดิ้ง จำกัด",
    agentId: "AGT-04",
    agentName: "คุณนันทพร สดใส",
    poId: "PO-2611-002",
    poNumber: "PO-2611-002",
    amount: 4488,
    totalAmount: 4488,
    issueDate: minutesAgo(2800),
    fileName: "ใบเสร็จรับเงิน_ยูนิลีเวอร์_PO-2611-002.jpg",
    fileSize: "1.2 MB",
    fileType: "image",
    status: "รอตรวจสอบ",
    archiveStatus: "รอจัดเก็บ",
    note: "ส่งผ่าน LINE ตัวแทนจำหน่าย รอฝ่ายบัญชีเทียบเลขที่",
  },
  {
    id: "RCP-2611-003",
    receiptNumber: "INV-FC-33921",
    companyId: "COMP-03",
    companyName: "บริษัท ฟรีสแลนด์คัมพิน่า (ประเทศไทย) จำกัด (มหาชน)",
    agentId: "AGT-06",
    agentName: "คุณชัชวาล เลิศรัศมี",
    poId: "PO-2611-003",
    poNumber: "PO-2611-003",
    amount: 1785.6,
    totalAmount: 1785.6,
    issueDate: minutesAgo(700),
    fileName: "ใบส่งของ_ใบกำกับภาษี_ฟรีสแลนด์_PO-2611-003.pdf",
    fileSize: "312 KB",
    fileType: "pdf",
    status: "ถูกต้อง",
    archiveStatus: "รอจัดเก็บ",
    note: "แนบสลิปการโอนเงินคู่กับใบเสร็จแล้ว",
  },
];

/* ───────────────────────── Promotions & News (Round 3 Part 2) ───────────────────────── */

export type NewsType = "ข่าวสาร" | "โปรโมชัน";
export type NewsStatus = "เผยแพร่แล้ว" | "ฉบับร่าง" | "สิ้นสุดแล้ว";

export interface PromotionItem {
  id: string;
  type: NewsType;
  title: string;
  content: string;
  description?: string;
  imageUrl?: string;
  emoji?: string;
  relatedProductIds?: string[];
  discountPercent?: number;
  discountAmount?: number;
  startDate: string;
  endDate: string;
  status: NewsStatus;
  createdAt: string;
  createdBy: string;
}

export const initialPromotions: PromotionItem[] = [
  {
    id: "PROMO-001",
    type: "โปรโมชัน",
    title: "ฉลองเทศกาลปีใหม่ 2570 กิ๊ฟช็อปและของขวัญลดพิเศษ 15%",
    content: "ต้อนรับเทศกาลแห่งความสุข สินค้าหมวดหมู่กิ๊ฟช็อป ตุ๊กตาหมี การ์ดอวยพร และถุงของขวัญ ลดทันที 15% เมื่อสั่งซื้อผ่านช่องทางออนไลน์",
    description: "ต้อนรับเทศกาลแห่งความสุข สินค้าหมวดหมู่กิ๊ฟช็อป ตุ๊กตาหมี การ์ดอวยพร และถุงของขวัญ ลดทันที 15% เมื่อสั่งซื้อผ่านช่องทางออนไลน์",
    emoji: "🎁",
    discountPercent: 15,
    relatedProductIds: ["P01", "P02", "P04"],
    startDate: "2026-11-01",
    endDate: "2027-01-05",
    status: "เผยแพร่แล้ว",
    createdAt: minutesAgo(1440),
    createdBy: "ธนพล รุ่งเรือง (ผู้จัดการร้าน)",
  },
  {
    id: "PROMO-002",
    type: "โปรโมชัน",
    title: "แพ็คคู่สุดคุ้ม สบู่นกแก้วและแชมพูซันซิล ลดทันที 30 บาท",
    content: "โปรโมชันดูแลความสะอาดส่วนตัว ซื้อสบู่นกแก้วคู่กับแชมพูซันซิล รับส่วนลดพิเศษทันที 30 บาท สินค้ามีจำนวนจำกัด",
    description: "โปรโมชันดูแลความสะอาดส่วนตัว ซื้อสบู่นกแก้วคู่กับแชมพูซันซิล รับส่วนลดพิเศษทันที 30 บาท สินค้ามีจำนวนจำกัด",
    emoji: "🫧",
    discountAmount: 30,
    relatedProductIds: ["P05", "P08"],
    startDate: "2026-11-01",
    endDate: "2026-11-30",
    status: "เผยแพร่แล้ว",
    createdAt: minutesAgo(2880),
    createdBy: "ธนพล รุ่งเรือง (ผู้จัดการร้าน)",
  },
  {
    id: "PROMO-003",
    type: "ข่าวสาร",
    title: "แจ้งปรับเวลาเปิดบริการหน้าร้าน และรอบการจัดส่งพัสดุ",
    content: "ร้านรุ่งอรุณ มินิมาร์ท เปิดให้บริการหน้าร้านทุกวัน 06:00 - 22:00 น. สำหรับออเดอร์ออนไลน์ ตัดรอบจัดส่งทุกวันจันทร์ - เสาร์ เวลา 14:00 น.",
    description: "ร้านรุ่งอรุณ มินิมาร์ท เปิดให้บริการหน้าร้านทุกวัน 06:00 - 22:00 น. สำหรับออเดอร์ออนไลน์ ตัดรอบจัดส่งทุกวันจันทร์ - เสาร์ เวลา 14:00 น.",
    emoji: "📢",
    startDate: "2026-11-01",
    endDate: "2026-12-31",
    status: "เผยแพร่แล้ว",
    createdAt: minutesAgo(4320),
    createdBy: "ธนพล รุ่งเรือง (ผู้จัดการร้าน)",
  },
  {
    id: "PROMO-004",
    type: "โปรโมชัน",
    title: "สัปดาห์นมพร้อมดื่มเพื่อสุขภาพ ลด 10% ทุกกล่อง",
    content: "โปรโมชันสินค้านมโฟร์โมสต์และนมจืดไทย-เดนมาร์ค สำหรับสมาชิกรับแต้มสะสมเพิ่ม 2 เท่า",
    description: "โปรโมชันสินค้านมโฟร์โมสต์และนมจืดไทย-เดนมาร์ค สำหรับสมาชิกรับแต้มสะสมเพิ่ม 2 เท่า",
    emoji: "🥛",
    discountPercent: 10,
    relatedProductIds: ["P21", "P23"],
    startDate: "2026-11-15",
    endDate: "2026-11-20",
    status: "ฉบับร่าง",
    createdAt: minutesAgo(720),
    createdBy: "ธนพล รุ่งเรือง (ผู้จัดการร้าน)",
  },
];

/* ───────────────────────── Online Store Settings (Round 3 Part 2) ───────────────────────── */

export interface ShippingChannel {
  id: string;
  name: string;
  carrier: string;
  rate: number;
  fee?: number;
  freeThreshold?: number;
  estimatedDays: string;
  isActive: boolean;
  enabled?: boolean;
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  branch: string;
  isActive: boolean;
}

export interface PromptPaySetting {
  id?: string;
  type: "เลขผู้เสียภาษี" | "เบอร์โทรศัพท์";
  idNumber: string;
  accountName: string;
  isActive: boolean;
}

export interface PointRateSetting {
  earnStepBaht: number; // ทุกยอดซื้อ (บาท), default 50
  earnPointsPerStep: number; // ได้รับแต้ม, default 5
  pointsPerBaht: number; // แต้มต่อ 1 บาท, default 10
  pointsPerBahtDiscount?: number;
  minPointsToRedeem: number;
  maxDiscountPercentPerOrder: number;
  enabled?: boolean;
  spendingPerPoint?: number;
  spendBahtPerPoint?: number;
}

export interface PaymentTimeoutSetting {
  timeoutHours: number;
  notifyBeforeHours: number;
  autoCancelOnTimeout: boolean;
  autoCancelUnpaid?: boolean;
  cancelMessage: string;
}

export interface OnlineStoreSettings {
  shippingChannels: ShippingChannel[];
  bankAccounts: BankAccount[];
  promptPay: PromptPaySetting;
  pointRate: PointRateSetting;
  paymentTimeout: PaymentTimeoutSetting;
}

export const initialStoreSettings: OnlineStoreSettings = {
  shippingChannels: [
    {
      id: "SHIP-01",
      name: "จัดส่งด่วน Flash Express",
      carrier: "Flash Express",
      rate: 40,
      fee: 40,
      freeThreshold: 500,
      estimatedDays: "1-2 วันทำการ",
      isActive: true,
      enabled: true,
    },
    {
      id: "SHIP-02",
      name: "ไปรษณีย์ไทย EMS",
      carrier: "ไปรษณีย์ไทย",
      rate: 50,
      fee: 50,
      freeThreshold: 600,
      estimatedDays: "1-3 วันทำการ",
      isActive: true,
      enabled: true,
    },
    {
      id: "SHIP-03",
      name: "รับสินค้าเองที่หน้าร้าน (สาขาศิลา ขอนแก่น)",
      carrier: "รับเองที่ร้าน",
      rate: 0,
      fee: 0,
      estimatedDays: "พร้อมรับใน 2 ชั่วโมง",
      isActive: true,
      enabled: true,
    },
    {
      id: "SHIP-04",
      name: "จัดส่งมาตรฐาน Kerry Express",
      carrier: "Kerry Express",
      rate: 45,
      fee: 45,
      freeThreshold: 500,
      estimatedDays: "1-2 วันทำการ",
      isActive: false,
      enabled: false,
    },
  ],
  bankAccounts: [
    {
      id: "BANK-01",
      bankName: "ธนาคารกสิกรไทย (KBANK)",
      accountNumber: "048-2-91823-1",
      accountName: "ร้านรุ่งอรุณ มินิมาร์ท โดย นางอรุณี รุ่งอรุณ",
      branch: "สาขาถนนหน้าเมือง ขอนแก่น",
      isActive: true,
    },
    {
      id: "BANK-02",
      bankName: "ธนาคารไทยพาณิชย์ (SCB)",
      accountNumber: "511-3-48291-0",
      accountName: "ร้านรุ่งอรุณ มินิมาร์ท",
      branch: "สาขาเซ็นทรัลพลาซา ขอนแก่น",
      isActive: true,
    },
  ],
  promptPay: {
    id: "PROMPTPAY-01",
    type: "เลขผู้เสียภาษี",
    idNumber: "0105559012345",
    accountName: "ร้านรุ่งอรุณ มินิมาร์ท",
    isActive: true,
  },
  pointRate: {
    earnStepBaht: 50, // ซื้อครบ 50 บาท
    earnPointsPerStep: 5, // ได้ 5 แต้ม
    pointsPerBaht: 10, // 10 แต้ม = 1 บาท
    pointsPerBahtDiscount: 10,
    minPointsToRedeem: 50,
    maxDiscountPercentPerOrder: 50,
    enabled: true,
    spendBahtPerPoint: 10,
    spendingPerPoint: 10,
  },
  paymentTimeout: {
    timeoutHours: 24,
    notifyBeforeHours: 2,
    autoCancelOnTimeout: true,
    autoCancelUnpaid: true,
    cancelMessage: "คำสั่งซื้อถูกยกเลิกอัตโนมัติเนื่องจากไม่ได้รับการชำระเงินภายในกำหนดเวลา 24 ชั่วโมง",
  },
};
