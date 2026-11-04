import { useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/format";
import { EmptyState } from "./EmptyState";

export interface DataTableColumn<T> {
  key?: string;
  id?: string;
  header: ReactNode | string;
  cell?: (row: T) => ReactNode;
  accessor?: (row: T) => ReactNode;
  /** Provide to make the column sortable. */
  sortValue?: (row: T) => string | number;
  sortable?: boolean;
  searchable?: boolean;
  align?: "left" | "right" | "center";
  className?: string;
}

export interface DataTableFilter<T> {
  key: string;
  label: string;
  options: { label: string; value: string }[];
  predicate: (row: T, value: string) => boolean;
}

const ALL = "__all__";

export function DataTable<T>({
  data,
  columns,
  getRowId,
  searchPlaceholder = "ค้นหา...",
  searchFn,
  searchKey,
  filters = [],
  pageSize = 10,
  loading,
  emptyTitle,
  emptyDescription = "ลองเปลี่ยนคำค้นหาหรือตัวกรอง",
  emptyMessage,
  onRowClick,
  selectedRowId,
  toolbar,
}: {
  data: T[];
  columns: DataTableColumn<T>[];
  getRowId?: (row: T) => string;
  searchPlaceholder?: string;
  searchFn?: (row: T, query: string) => boolean;
  searchKey?: string;
  filters?: DataTableFilter<T>[];
  pageSize?: number;
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  selectedRowId?: string | null;
  toolbar?: ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);
  const [page, setPage] = useState(0);

  // Fallback getRowId if not supplied
  const resolveRowId = (row: T, index: number): string => {
    if (getRowId) return getRowId(row);
    const r = row as any;
    return r?.id ?? r?.sku ?? r?.code ?? r?.prNumber ?? r?.poNumber ?? r?.receiptNumber ?? `row-${index}`;
  };

  const getColKey = (c: DataTableColumn<T>, i: number) => c.key ?? c.id ?? `col-${i}`;
  const getColCell = (c: DataTableColumn<T>) => c.cell ?? c.accessor ?? (() => null);

  // Auto search predicate if no custom searchFn is given
  const effectiveSearchFn = useMemo(() => {
    if (searchFn) return searchFn;
    return (row: T, q: string) => {
      if (searchKey) {
        const val = (row as any)[searchKey];
        if (typeof val === "string" && val.toLowerCase().includes(q)) return true;
      }
      // Inspect all primitive string/number values of row
      return Object.values(row as any).some((val) => {
        if (typeof val === "string" || typeof val === "number") {
          return String(val).toLowerCase().includes(q);
        }
        return false;
      });
    };
  }, [searchFn, searchKey]);

  const rows = useMemo(() => {
    let out = data;
    const q = query.trim().toLowerCase();
    if (q && effectiveSearchFn) {
      out = out.filter((r) => effectiveSearchFn(r, q));
    }
    for (const f of filters) {
      const v = filterValues[f.key];
      if (v && v !== ALL) out = out.filter((r) => f.predicate(r, v));
    }
    if (sort) {
      const col = columns.find((c, i) => getColKey(c, i) === sort.key);
      if (col) {
        const sv =
          col.sortValue ??
          ((r: T) => {
            const k = col.key ?? col.id;
            return k ? (r as any)[k] ?? "" : "";
          });

        out = [...out].sort((a, b) => {
          const x = sv(a);
          const y = sv(b);
          const cmp =
            typeof x === "number" && typeof y === "number"
              ? x - y
              : String(x).localeCompare(String(y), "th");
          return sort.dir === "asc" ? cmp : -cmp;
        });
      }
    }
    return out;
  }, [data, query, effectiveSearchFn, filters, filterValues, sort, columns]);

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = rows.slice(safePage * pageSize, safePage * pageSize + pageSize);

  const toggleSort = (key: string) =>
    setSort((s) => (s?.key !== key ? { key, dir: "asc" } : s.dir === "asc" ? { key, dir: "desc" } : null));

  const alignCls = (a?: "left" | "right" | "center") =>
    a === "right" ? "text-right" : a === "center" ? "text-center" : "text-left";

  const resolvedEmptyTitle = emptyMessage ?? emptyTitle ?? "ไม่พบข้อมูล";

  return (
    <div className="rounded-lg border bg-card shadow-soft overflow-hidden">
      <div className="flex flex-wrap items-center gap-2.5 border-b p-3 sm:p-4 bg-card">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
            placeholder={searchPlaceholder}
            className="pl-9 h-10 text-sm focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            aria-label="ค้นหาในตาราง"
          />
        </div>
        {filters.map((f) => (
          <Select
            key={f.key}
            value={filterValues[f.key] ?? ALL}
            onValueChange={(v) => {
              setFilterValues((s) => ({ ...s, [f.key]: v }));
              setPage(0);
            }}
          >
            <SelectTrigger className="w-44 h-10 text-sm focus-visible:ring-2 focus-visible:ring-primary" aria-label={f.label}>
              <SelectValue placeholder={f.label} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{f.label}: ทั้งหมด</SelectItem>
              {f.options.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}
        {toolbar}
      </div>

      {/* Horizontal scroll container with momentum scrolling for tablet */}
      <div className="overflow-x-auto touch-pan-x" style={{ WebkitOverflowScrolling: "touch" }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/60">
              {columns.map((c, i) => {
                const colKey = getColKey(c, i);
                const isSortable = Boolean(c.sortValue || c.sortable);
                return (
                  <th
                    key={colKey}
                    scope="col"
                    className={cn(
                      "px-4 py-3 sm:py-3.5 font-medium text-muted-foreground whitespace-nowrap text-xs",
                      alignCls(c.align),
                      c.className,
                    )}
                  >
                    {isSortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(colKey)}
                        className="inline-flex items-center gap-1 rounded hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none transition-colors"
                      >
                        <span>{c.header}</span>
                        {sort?.key === colKey ? (
                          sort.dir === "asc" ? (
                            <ArrowUp className="size-3.5 text-primary" />
                          ) : (
                            <ArrowDown className="size-3.5 text-primary" />
                          )
                        ) : (
                          <ArrowUpDown className="size-3.5 opacity-40 hover:opacity-100" />
                        )}
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b last:border-0">
                  {columns.map((c, ci) => (
                    <td key={getColKey(c, ci)} className="px-4 py-3.5">
                      <Skeleton className="h-4 w-full max-w-36" />
                    </td>
                  ))}
                </tr>
              ))
            ) : pageRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="p-4">
                  <EmptyState compact title={resolvedEmptyTitle} description={emptyDescription} />
                </td>
              </tr>
            ) : (
              pageRows.map((row, rowIdx) => {
                const id = resolveRowId(row, rowIdx);
                return (
                  <tr
                    key={id}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    onKeyDown={
                      onRowClick
                        ? (e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              onRowClick(row);
                            }
                          }
                        : undefined
                    }
                    tabIndex={onRowClick ? 0 : undefined}
                    className={cn(
                      "border-b last:border-0 transition-colors",
                      onRowClick &&
                        "cursor-pointer hover:bg-sun-50/60 focus-visible:bg-sun-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary",
                      selectedRowId === id && "bg-sun-50",
                    )}
                  >
                    {columns.map((c, ci) => {
                      const cellRenderer = getColCell(c);
                      return (
                        <td
                          key={getColKey(c, ci)}
                          className={cn("px-4 py-3 sm:py-3.5 text-xs sm:text-sm", alignCls(c.align), c.className)}
                        >
                          {cellRenderer(row)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-xs sm:text-sm text-muted-foreground bg-card">
        <span className="num font-medium">
          {loading ? "กำลังโหลดข้อมูล..." : `ทั้งหมด ${formatNumber(rows.length)} รายการ`}
        </span>
        <div className="flex items-center gap-2">
          <span className="num text-xs">
            หน้า {safePage + 1} / {pageCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="size-8 sm:size-9 p-0 focus-visible:ring-2 focus-visible:ring-primary"
            onClick={() => setPage(safePage - 1)}
            disabled={safePage === 0}
            aria-label="หน้าก่อนหน้า"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="size-8 sm:size-9 p-0 focus-visible:ring-2 focus-visible:ring-primary"
            onClick={() => setPage(safePage + 1)}
            disabled={safePage >= pageCount - 1}
            aria-label="หน้าถัดไป"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
