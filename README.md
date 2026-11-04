# Rung Aroon Retail Hub

Build the foundation of a back-office web app for a Thai convenience store "ร้านรุ่งอรุณ มินิมาร์ท" using Next.js App Router, Tailwind CSS, shadcn/ui, lucide-react, recharts and framer-motion. All UI text in Thai. Desktop-first, tablet-friendly (the counter uses a tablet). No backend. This is ROUND 1 of 3: build the foundation carefully because later rounds will extend it without rewriting it.

DESIGN SYSTEM (same brand as the customer website, calmer for daily work)

- Fonts: "Noto Sans Thai" for everything, "Prompt" (600) only for page titles and big KPI numbers. Use tabular numbers for money and quantities.

- Tokens as CSS variables mapped to shadcn: primary sun-600 #EA580C (buttons, active states), sun-50 #FFF7ED and sun-100 #FFEDD5 (soft highlights), app background #F6F4F1, card white, border #E7E2DC, ink #2A1F14, muted #7A6A5B, sidebar warm charcoal #1E1B18 with text #E9E2DA and active item = sun-600 left bar + soft sun tint, secondary teal #0F766E.

  Semantic: success #16A34A, warning #D97706, danger #DC2626, info #2563EB.

- Shape: radius 12px cards, 10px inputs and buttons, soft shadow 0 1px 2px rgba(42,31,20,0.06), 0 6px 18px rgba(42,31,20,0.06). 

- Layout: collapsible left sidebar (icons plus labels, tooltips when collapsed), top bar (page title, global search, notification bell with count, role switcher, user menu), content max width 1440 with comfortable spacing. Breadcrumbs on every page.

- Components to build and REUSE later (put in components/admin/): PageHeader (title, description, actions), DataTable (search, filters, sorting, pagination, empty and loading states), StatusBadge, StatCard (icon, label, value, trend), ConfirmDialog, FormDialog, EmptyState (with the small rising-sun SVG), Money (baht formatting), SectionCard.

- StatusBadge color map (define once, reuse everywhere):

  Online order: รอชำระ gray, รอตรวจสอบ amber, ชำระแล้ว blue, กำลังเตรียม indigo, จัดส่งแล้ว cyan, ส่งสำเร็จ green, ส่งไม่สำเร็จ red, ตีกลับ red, หมดเวลา slate, ยกเลิก zinc.

  PR and returns: รออนุมัติ / รอพิจารณา amber, อนุมัติ green, ไม่อนุมัติ red.

- Feedback: toasts for every action, confirmation dialogs for approve/reject, inline validation messages in Thai, skeleton loaders, keyboard focus rings.

STATE: Create lib/mock-data.ts (typed data) and lib/store.tsx (React context holding all data in memory) with actions so that changes made on one page appear on others (for example approving a payment updates the order status everywhere). Later rounds will extend these two files, so keep them well organized by domain.

ROLES (role switcher in the top bar for demo only; each role has its own sidebar menu): พนักงานขาย, พนักงานคลังสินค้า, พนักงานจัดซื้อ, ผู้จัดการร้าน, เจ้าของกิจการ. Build the sidebars for ALL five roles now, linking unfinished pages to a friendly "กำลังพัฒนา" placeholder page that uses EmptyState. Every employee has exactly one duty.

BUILD NOW

1. Login page (/login): split layout, left sunrise gradient panel with the sun SVG and store name, right form (username, password, show/hide password, "ลืมรหัสผ่าน" with text "กรุณาติดต่อผู้จัดการร้านเพื่อรีเซ็ตรหัสผ่าน"). Show error and success states.

2. Dashboard (/dashboard) per role: greeting, 4 StatCards, "งานที่รอดำเนินการ" list with deep links, and a small recharts chart (sales for owner and manager).

3. พนักงานขาย pages:

 a. /sales/pos "ขายหน้าร้าน" (the most important screen, make it excellent): two-column layout. Left: product search with barcode field and quick category chips, product grid. Right: bill panel with line items (quantity stepper, remove), member lookup by member code, phone number, or "สแกน QR สมาชิก" (simulate) showing member card with name and points, option to redeem points as discount (show points to baht rate), subtotal, discount, net total in a large number, cash received with quick buttons (100, 500, 1000, exact), change shown big, receipt type segmented control "ใบเสร็จแบบย่อ" (default) or "ใบเสร็จแบบเต็ม" (reveals buyer name, address, tax ID fields), button "ชำระเงินและออกใบเสร็จ". Show hint "ซื้อครบ 50 บาท ได้ 5 แต้ม" and the points that will be earned. Block items with no stock and show "สินค้าหมด ไม่สามารถขายได้". After payment show a receipt preview dialog (paper-style, dashed edges) with print button, then reset the bill.

 b. /sales/payments "ตรวจสอบการชำระเงินออนไลน์": queue list of orders in "รอตรวจสอบ" with time since submitted; detail split view: order summary on the left, payment slip image placeholder with zoom on the right, buttons "ถูกต้อง" (green) and "ไม่ถูกต้อง" (opens required note). On approve the order becomes "ชำระแล้ว".

 c. /sales/returns "คำขอยกเลิกและคืนสินค้า": tabs by status, list, detail drawer with items, reason, photo placeholders, approve or reject with note.

 d. /sales/gifts "ของขวัญเทศกาลและวันเกิด": cards of members due a gift (type วันเกิด or ปีใหม่), delivery address, button "จัดเตรียมของขวัญแล้ว", status flow รอจัดเตรียม -> จัดเตรียมแล้ว.

MOCK DATA for this round: 24 products (categories กิ๊ฟช็อป, สบู่, แชมพู, แปรงสีฟัน, ยาสีฟัน, บะหมี่กึ่งสำเร็จรูป, นม; with barcodes, prices, stock), 12 members with points, 10 online orders in various statuses, 4 return requests, 5 gift tasks.

DO NOT build in this round: warehouse, purchasing, manager, owner pages, reports, global search (use the placeholder page for them). No customer pages. No mobile screens.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://rung-aroon-retail-hub.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/a1bdc82e-7f1b-5380-b0bf-ca059b75de75).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
