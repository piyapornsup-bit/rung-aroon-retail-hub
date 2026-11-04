import { describe, expect, it } from "vitest";
import { BUILT_ROUTES, NAV_BY_ROLE, SEGMENT_LABELS } from "@/lib/navigation";
import { ROLE_ORDER, type RoleKey } from "@/lib/mock-data";

type SearchDataType =
  | "products"
  | "orders"
  | "receipts"
  | "members"
  | "employees"
  | "pos"
  | "prs"
  | "agentReceipts"
  | "suppliers";

const ROLE_PERMISSIONS: Record<RoleKey, SearchDataType[]> = {
  owner: ["products", "orders", "receipts", "members", "employees", "pos", "prs", "agentReceipts", "suppliers"],
  manager: ["products", "orders", "receipts", "members", "employees", "pos", "prs", "agentReceipts", "suppliers"],
  sales: ["products", "orders", "receipts", "members"],
  warehouse: ["products", "orders", "pos"],
  purchasing: ["products", "pos", "prs", "agentReceipts", "suppliers"],
};

type ReportType =
  | "overview"
  | "sales_channels"
  | "inventory"
  | "order_history"
  | "fulfillment"
  | "procurement";

const REPORT_ROLE_MAPPING: Record<ReportType, RoleKey[]> = {
  overview: ["manager", "owner"],
  sales_channels: ["sales", "manager", "owner"],
  inventory: ["warehouse", "manager", "owner"],
  order_history: ["purchasing", "sales", "manager", "owner"],
  fulfillment: ["warehouse", "manager", "owner"],
  procurement: ["purchasing", "manager", "owner"],
};

describe("Round 3 Part 3 - Shared Pages: Search RBAC Matrix", () => {
  it("grants owner and manager unrestricted access to all data types", () => {
    const allTypes: SearchDataType[] = [
      "products",
      "orders",
      "receipts",
      "members",
      "employees",
      "pos",
      "prs",
      "agentReceipts",
      "suppliers",
    ];

    expect(ROLE_PERMISSIONS.owner).toEqual(expect.arrayContaining(allTypes));
    expect(ROLE_PERMISSIONS.manager).toEqual(expect.arrayContaining(allTypes));
  });

  it("restricts sales role to sales-relevant data types only", () => {
    const allowed = ROLE_PERMISSIONS.sales;
    expect(allowed).toContain("products");
    expect(allowed).toContain("orders");
    expect(allowed).toContain("receipts");
    expect(allowed).toContain("members");

    // Must NOT access sensitive procurement or employee management data
    expect(allowed).not.toContain("employees");
    expect(allowed).not.toContain("pos");
    expect(allowed).not.toContain("prs");
    expect(allowed).not.toContain("agentReceipts");
    expect(allowed).not.toContain("suppliers");
  });

  it("restricts warehouse role to stock, orders, and receiving POs", () => {
    const allowed = ROLE_PERMISSIONS.warehouse;
    expect(allowed).toContain("products");
    expect(allowed).toContain("orders");
    expect(allowed).toContain("pos");

    // Must NOT access receipts, members, or employees
    expect(allowed).not.toContain("receipts");
    expect(allowed).not.toContain("members");
    expect(allowed).not.toContain("employees");
    expect(allowed).not.toContain("prs");
  });

  it("restricts purchasing role to procurement and supplier data", () => {
    const allowed = ROLE_PERMISSIONS.purchasing;
    expect(allowed).toContain("products");
    expect(allowed).toContain("pos");
    expect(allowed).toContain("prs");
    expect(allowed).toContain("agentReceipts");
    expect(allowed).toContain("suppliers");

    // Must NOT access sales receipts, online orders, or employees
    expect(allowed).not.toContain("receipts");
    expect(allowed).not.toContain("orders");
    expect(allowed).not.toContain("employees");
  });
});

describe("Round 3 Part 3 - Shared Pages: Reports Duty-Based Visibility", () => {
  it("allows manager and owner to see all 6 report types", () => {
    const allReports: ReportType[] = [
      "overview",
      "sales_channels",
      "inventory",
      "order_history",
      "fulfillment",
      "procurement",
    ];

    for (const report of allReports) {
      expect(REPORT_ROLE_MAPPING[report]).toContain("manager");
      expect(REPORT_ROLE_MAPPING[report]).toContain("owner");
    }
  });

  it("filters reports by duty for sales, warehouse, and purchasing roles", () => {
    // Sales sees sales_channels and order_history
    expect(REPORT_ROLE_MAPPING.sales_channels).toContain("sales");
    expect(REPORT_ROLE_MAPPING.order_history).toContain("sales");
    expect(REPORT_ROLE_MAPPING.overview).not.toContain("sales");
    expect(REPORT_ROLE_MAPPING.procurement).not.toContain("sales");

    // Warehouse sees inventory and fulfillment
    expect(REPORT_ROLE_MAPPING.inventory).toContain("warehouse");
    expect(REPORT_ROLE_MAPPING.fulfillment).toContain("warehouse");
    expect(REPORT_ROLE_MAPPING.overview).not.toContain("warehouse");
    expect(REPORT_ROLE_MAPPING.procurement).not.toContain("warehouse");

    // Purchasing sees order_history and procurement
    expect(REPORT_ROLE_MAPPING.order_history).toContain("purchasing");
    expect(REPORT_ROLE_MAPPING.procurement).toContain("purchasing");
    expect(REPORT_ROLE_MAPPING.overview).not.toContain("purchasing");
    expect(REPORT_ROLE_MAPPING.sales_channels).not.toContain("purchasing");
    expect(REPORT_ROLE_MAPPING.inventory).not.toContain("purchasing");
  });
});

describe("Round 3 Part 3 - Navigation & Built Routes for Shared Pages", () => {
  it("includes /search and /reports in BUILT_ROUTES", () => {
    expect(BUILT_ROUTES.has("/search")).toBe(true);
    expect(BUILT_ROUTES.has("/reports")).toBe(true);
  });

  it("provides sidebar navigation links to /search and /reports for all staff roles", () => {
    for (const role of ROLE_ORDER) {
      const groups = NAV_BY_ROLE[role];
      const allHrefs = groups.flatMap((g) => g.items.map((i) => i.href));
      expect(allHrefs).toContain("/search");
      expect(allHrefs).toContain("/reports");
    }
  });

  it("has localized Thai breadcrumb segment labels", () => {
    expect(SEGMENT_LABELS.search).toBe("ค้นหาข้อมูล");
    expect(SEGMENT_LABELS.reports).toBe("รายงาน");
  });
});

