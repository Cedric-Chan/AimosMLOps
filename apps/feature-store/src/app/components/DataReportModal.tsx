import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ChevronUp, ChevronDown, Database, Download, ListFilter, Search, X } from "lucide-react";

export type DataType = "FLOAT" | "INT" | "STRING" | "BOOL";

const DATA_TYPES: DataType[] = ["FLOAT", "FLOAT", "FLOAT", "INT", "INT", "STRING", "STRING", "BOOL", "FLOAT", "INT"];

export type ReportRow = {
  name: string;
  dataType: DataType;
  cnt: number;
  cntUniq: number;
  max: string;
  min: string;
  avg: string;
  zcnt: number;
  nullcnt: number;
  negcnt: number;
};

/** Parse "48", "1,234" or empty → positive integer, min 1 */
export function parseColumnCount(s: string | undefined): number {
  if (!s?.trim()) return 42;
  const n = parseInt(s.replace(/,/g, ""), 10);
  return Number.isFinite(n) && n > 0 ? n : 42;
}

function hashSeed(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function generateReportRows(columnCount: number): ReportRow[] {
  const n = Math.max(1, Math.min(columnCount, 5000));
  return Array.from({ length: n }, (_, i) => {
    const name = `feature_${i + 1}`;
    const seed = hashSeed(name);
    const base = 2_500_000 + (seed % 400_000);
    const dataType = DATA_TYPES[seed % DATA_TYPES.length];
    const isTextual = dataType === "STRING" || dataType === "BOOL";
    return {
      name,
      dataType,
      cnt: base + i * 13,
      cntUniq: 10 + (seed % 2000),
      max: isTextual ? "—" : String(800 + (seed % 100)),
      min: isTextual ? "—" : String(seed % 50),
      avg: isTextual ? "—" : ((seed % 1000) / 10).toFixed(1),
      zcnt: isTextual ? 0 : seed % 50_000,
      nullcnt: seed % 2000,
      negcnt: isTextual ? 0 : seed % 100,
    };
  });
}

export const DATA_REPORT_TABLE_HEADERS = [
  "Column Name",
  "Cnt",
  "Cnt Uniq",
  "Max",
  "Min",
  "Avg",
  "0 cnt",
  "null cnt",
  "neg cnt",
] as const;

export function downloadDataReportCsv(rows: ReportRow[], fileName: string) {
  const head = DATA_REPORT_TABLE_HEADERS.join(",");
  const lines = [head].concat(
    rows.map((r) =>
      [r.name, r.cnt, r.cntUniq, r.max, r.min, r.avg, r.zcnt, r.nullcnt, r.negcnt].join(",")
    )
  );
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(a.href);
}

type TabKey = "raw" | "clean";

export function DataReportTableSection({
  columnCount,
  pageSize = 20,
  tableClassName = "min-h-[160px]",
  toolbarEnd,
}: {
  columnCount: number;
  pageSize?: number;
  /** e.g. max-h-[240px] for embedded layouts */
  tableClassName?: string;
  /** Right side of the search toolbar row (e.g. updated time + download) */
  toolbarEnd?: ReactNode;
}) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ col: string; dir: "asc" | "desc" } | null>(null);
  const [dtFilter, setDtFilter] = useState<Set<DataType>>(new Set());
  const [dtFilterOpen, setDtFilterOpen] = useState(false);
  const dtFilterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dtFilterOpen) return;
    const h = (e: MouseEvent) => {
      if (dtFilterRef.current && !dtFilterRef.current.contains(e.target as Node)) setDtFilterOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [dtFilterOpen]);

  const activeCount = Math.max(1, columnCount);
  const allRows = useMemo(() => generateReportRows(activeCount), [activeCount]);

  const sortValue = (r: ReportRow, col: string): number | string => {
    const pct = (n: number) => r.cnt > 0 ? (n / r.cnt) * 100 : 0;
    switch (col) {
      case "name":     return r.name;
      case "dataType": return r.dataType;
      case "cnt":      return r.cnt;
      case "cntUniq":  return r.cntUniq;
      case "nullRate": return pct(r.nullcnt);
      case "zRate":    return pct(r.zcnt);
      case "negRate":  return pct(r.negcnt);
      case "max":      return parseFloat(r.max) || 0;
      case "min":      return parseFloat(r.min) || 0;
      case "avg":      return parseFloat(r.avg) || 0;
      default:         return 0;
    }
  };

  const cycleSort = (col: string) => {
    setSort((prev) => {
      if (!prev || prev.col !== col) return { col, dir: "asc" };
      if (prev.dir === "asc") return { col, dir: "desc" };
      return null;
    });
    setPage(1);
  };

  const filtered = useMemo(() => {
    let rows = allRows.filter((r) => r.name.toLowerCase().includes(q.trim().toLowerCase()));
    if (dtFilter.size > 0) rows = rows.filter((r) => dtFilter.has(r.dataType));
    if (sort) {
      const { col, dir } = sort;
      rows = [...rows].sort((a, b) => {
        const av = sortValue(a, col), bv = sortValue(b, col);
        if (typeof av === "string" && typeof bv === "string")
          return dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
        return dir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
      });
    }
    return rows;
  }, [allRows, q, dtFilter, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageSafe = Math.min(page, totalPages);
  const paged = useMemo(() => {
    const start = (pageSafe - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, pageSafe, pageSize]);

  const SortTh = ({ col, label }: { col: string; label: string }) => {
    const active = sort?.col === col;
    const dir = sort?.dir;
    return (
      <th
        className="px-3 py-2.5 font-medium whitespace-nowrap cursor-pointer select-none group"
        onClick={() => cycleSort(col)}
      >
        <span className="inline-flex items-center gap-1">
          {label}
          {active ? (
            dir === "asc"
              ? <ChevronUp size={11} strokeWidth={2.5} className="text-teal-600 shrink-0" />
              : <ChevronDown size={11} strokeWidth={2.5} className="text-teal-600 shrink-0" />
          ) : (
            <span className="inline-flex flex-col gap-0 leading-none text-gray-300 group-hover:text-gray-400 shrink-0">
              <ChevronUp size={8} strokeWidth={2} />
              <ChevronDown size={8} strokeWidth={2} />
            </span>
          )}
        </span>
      </th>
    );
  };

  return (
    <>
      <div className="px-0 py-3 border-b border-gray-50 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="relative max-w-sm flex-1 min-w-0">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Search feature name…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:border-teal-400 focus:bg-white transition-all"
          />
        </div>
        {toolbarEnd ? (
          <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">{toolbarEnd}</div>
        ) : null}
      </div>

      <div className={`flex-1 overflow-auto ${tableClassName}`}>
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-gray-50 border-b border-gray-100 z-[1]">
            <tr className="text-left text-gray-500">
              <SortTh col="name" label="Feature Name" />
              <th className="px-3 py-2.5 font-medium whitespace-nowrap">
                <div className="inline-flex items-center gap-1">
                  <span className="cursor-pointer select-none group inline-flex items-center gap-1" onClick={() => cycleSort("dataType")}>
                    Data Type
                    {sort?.col === "dataType" ? (
                      sort.dir === "asc"
                        ? <ChevronUp size={11} strokeWidth={2.5} className="text-teal-600 shrink-0" />
                        : <ChevronDown size={11} strokeWidth={2.5} className="text-teal-600 shrink-0" />
                    ) : (
                      <span className="inline-flex flex-col gap-0 leading-none text-gray-300 group-hover:text-gray-400 shrink-0">
                        <ChevronUp size={8} strokeWidth={2} />
                        <ChevronDown size={8} strokeWidth={2} />
                      </span>
                    )}
                  </span>
                  <div className="relative" ref={dtFilterRef}>
                    <button
                      type="button"
                      onClick={() => setDtFilterOpen((o) => !o)}
                      className={`p-0.5 rounded transition-colors ${dtFilter.size > 0 ? "text-teal-600" : "text-gray-300 hover:text-gray-500"}`}
                      title="Filter by type"
                    >
                      <ListFilter size={11} />
                    </button>
                    {dtFilterOpen && (
                      <div className="absolute left-0 top-full mt-1 z-20 w-32 rounded-xl border border-gray-200 bg-white shadow-lg p-2 space-y-1">
                        {(["FLOAT", "INT", "STRING", "BOOL"] as DataType[]).map((t) => {
                          const on = dtFilter.has(t);
                          return (
                            <button
                              key={t}
                              type="button"
                              onClick={() => {
                                setDtFilter((prev) => {
                                  const next = new Set(prev);
                                  on ? next.delete(t) : next.add(t);
                                  return next;
                                });
                                setPage(1);
                              }}
                              className="w-full flex items-center gap-2 px-1.5 py-1 rounded-lg hover:bg-teal-50 text-left"
                            >
                              <span className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border text-[8px] ${on ? "border-teal-500 bg-teal-500 text-white" : "border-gray-300 bg-white"}`}>
                                {on ? "✓" : ""}
                              </span>
                              <span className="text-[11px] font-mono text-gray-700">{t}</span>
                            </button>
                          );
                        })}
                        {dtFilter.size > 0 && (
                          <button type="button" onClick={() => { setDtFilter(new Set()); setPage(1); }}
                            className="w-full text-[10px] text-teal-600 hover:text-teal-700 text-center pt-1 border-t border-gray-100 mt-1">
                            Clear
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </th>
              <SortTh col="cnt" label="Cnt" />
              <SortTh col="cntUniq" label="Cnt Uniq" />
              <SortTh col="nullRate" label="null rate" />
              <SortTh col="zRate" label="0 rate" />
              <SortTh col="negRate" label="neg rate" />
              <SortTh col="max" label="Max" />
              <SortTh col="min" label="Min" />
              <SortTh col="avg" label="Avg" />
            </tr>
          </thead>
          <tbody>
            {paged.map((r) => {
              const isTextual = r.dataType === "STRING" || r.dataType === "BOOL";
              const dtColor = {
                FLOAT: "bg-blue-50 text-blue-700 border-blue-100",
                INT: "bg-violet-50 text-violet-700 border-violet-100",
                STRING: "bg-amber-50 text-amber-700 border-amber-100",
                BOOL: "bg-teal-50 text-teal-700 border-teal-100",
              }[r.dataType];
              const dash = <span className="text-gray-300">—</span>;
              const pct = (n: number) => r.cnt > 0 ? `${((n / r.cnt) * 100).toFixed(2)}%` : "0.00%";
              return (
                <tr key={r.name} className="border-b border-gray-50 hover:bg-teal-50/30">
                  <td className="px-3 py-2 font-mono text-gray-800">{r.name}</td>
                  <td className="px-3 py-2">
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${dtColor}`}>{r.dataType}</span>
                  </td>
                  <td className="px-3 py-2 tabular-nums text-gray-700">{r.cnt.toLocaleString()}</td>
                  <td className="px-3 py-2 tabular-nums text-gray-700">{r.cntUniq.toLocaleString()}</td>
                  <td className="px-3 py-2 tabular-nums text-gray-600">{pct(r.nullcnt)}</td>
                  <td className="px-3 py-2 tabular-nums text-gray-600">{isTextual ? dash : pct(r.zcnt)}</td>
                  <td className="px-3 py-2 tabular-nums text-gray-600">{isTextual ? dash : pct(r.negcnt)}</td>
                  <td className="px-3 py-2 font-mono text-gray-600">{isTextual ? dash : r.max}</td>
                  <td className="px-3 py-2 font-mono text-gray-600">{isTextual ? dash : r.min}</td>
                  <td className="px-3 py-2 font-mono text-gray-600">{isTextual ? dash : r.avg}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-gray-400">No columns match your search.</div>
        )}
      </div>

      <div className="px-0 py-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 bg-gray-50/60 rounded-b-xl">
        <span className="text-xs text-gray-500">
          Showing {(pageSafe - 1) * pageSize + 1}–{Math.min(pageSafe * pageSize, filtered.length)} of{" "}
          {filtered.length} rows
          {(q.trim() || dtFilter.size > 0) ? ` (filtered from ${allRows.length})` : ""}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={pageSafe <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-xs text-gray-600 tabular-nums">
            {pageSafe} / {totalPages}
          </span>
          <button
            type="button"
            disabled={pageSafe >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    </>
  );
}

export function DataReportModal({
  onClose,
  variant,
  columnCount,
  rawColumnCount,
  cleanColumnCount,
  defaultTab = "raw",
  singleTitle = "Data Report",
  showCleanTab = true,
}: {
  onClose: () => void;
  variant: "single" | "tabs";
  columnCount?: number;
  rawColumnCount?: number;
  cleanColumnCount?: number;
  defaultTab?: TabKey;
  singleTitle?: string;
  showCleanTab?: boolean;
}) {
  const [tab, setTab] = useState<TabKey>(defaultTab);

  useEffect(() => {
    if (variant === "tabs" && !showCleanTab && tab === "clean") setTab("raw");
  }, [variant, showCleanTab, tab]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const effectiveTab: TabKey = variant === "tabs" && !showCleanTab ? "raw" : tab;

  const activeCount =
    variant === "single"
      ? Math.max(1, columnCount ?? 42)
      : effectiveTab === "raw"
        ? Math.max(1, rawColumnCount ?? 42)
        : Math.max(1, cleanColumnCount ?? 38);

  const handleTab = (t: TabKey) => {
    setTab(t);
  };

  const filteredForDownload = useMemo(() => {
    const rows = generateReportRows(activeCount);
    return rows;
  }, [activeCount]);

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between gap-3 bg-gradient-to-r from-teal-50/80 to-white">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-teal-100 flex items-center justify-center shrink-0">
              <Database size={15} className="text-teal-600" />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-800">
                {variant === "tabs" ? "Data Report" : singleTitle}
              </div>
              <div className="text-xs text-gray-400">
                {variant === "tabs"
                  ? `${activeCount} columns · ${effectiveTab === "raw" ? "Raw" : "Clean"} statistics`
                  : `${activeCount} columns · column-level statistics`}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() =>
                downloadDataReportCsv(
                  filteredForDownload,
                  variant === "tabs" ? `data-report-${effectiveTab}-${activeCount}cols.csv` : "data-quality-report.csv"
                )
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-600 hover:border-teal-300 hover:text-teal-700 hover:bg-teal-50/50 transition-all"
            >
              <Download size={13} /> Download CSV
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {variant === "tabs" && (
          <div className="flex px-5 pt-3 gap-1 border-b border-gray-100">
            <button
              type="button"
              onClick={() => handleTab("raw")}
              className={`px-4 py-2 text-xs font-medium rounded-t-lg border-b-2 transition-colors ${
                effectiveTab === "raw"
                  ? "border-teal-500 text-teal-700 bg-teal-50/50"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Raw Data Report
            </button>
            {showCleanTab && (
              <button
                type="button"
                onClick={() => handleTab("clean")}
                className={`px-4 py-2 text-xs font-medium rounded-t-lg border-b-2 transition-colors ${
                  effectiveTab === "clean"
                    ? "border-violet-500 text-violet-700 bg-violet-50/40"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                Clean Data Report
              </button>
            )}
          </div>
        )}

        <div className="px-5 flex-1 flex flex-col min-h-0 overflow-hidden">
          <DataReportTableSection
            key={`${variant}-${effectiveTab}-${activeCount}`}
            columnCount={activeCount}
            tableClassName="min-h-[200px]"
          />
        </div>
      </div>
    </div>
  );
}
