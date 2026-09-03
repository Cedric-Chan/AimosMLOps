import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ChevronDown,
  Check,
  Database,
  Download,
  Maximize2,
  Pencil,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import type { DataCleaningSnapshot, DataIngestionConfigSnapshot } from "@/data/widetableCanvasModel";
import { getCleaningFeatureNameOptions } from "@/data/featureGroupCatalog";
import type { Instance, WideTableRow } from "@/app/components/WideTableList";
import {
  DataReportTableSection,
  downloadDataReportCsv,
  generateReportRows,
  parseColumnCount,
} from "@/app/components/DataReportModal";

const FILLNA_METHODS = ["mean", "median", "fixed_value"] as const;

/** Mock cleaning task lifecycle until backend API is wired. */
export type CleaningTaskStatus = "NONE" | "PENDING" | "RUNNING" | "SUCCESS" | "FAILED";

export type CleaningTaskState = {
  taskId: string;
  status: CleaningTaskStatus;
  finishedAt?: string;
};

function parseFeaturesCsv(csv: string): string[] {
  return csv.split(",").map((s) => s.trim()).filter(Boolean);
}

function joinFeaturesCsv(names: string[]): string {
  return names.join(", ");
}

function FillnaFeatureNamesMultiSelect({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (csv: string) => void;
}) {
  const selectedSet = useMemo(() => new Set(parseFeaturesCsv(value)), [value]);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const filtered = useMemo(
    () => options.filter((o) => o.toLowerCase().includes(q.trim().toLowerCase())),
    [options, q]
  );

  const toggle = (name: string) => {
    const next = new Set(selectedSet);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    const sorted = [...next].sort((a, b) => a.localeCompare(b));
    onChange(joinFeaturesCsv(sorted));
  };

  const summary =
    selectedSet.size === 0
      ? "Select features…"
      : selectedSet.size <= 2
        ? joinFeaturesCsv([...selectedSet].sort((a, b) => a.localeCompare(b)))
        : `${selectedSet.size} features selected`;

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 text-left text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-gray-50 focus:outline-none focus:border-teal-400"
      >
        <span className={`truncate min-w-0 ${selectedSet.size ? "text-gray-800 font-mono" : "text-gray-400"}`}>
          {summary}
        </span>
        <ChevronDown size={14} className="shrink-0 text-gray-400" />
      </button>
      {open && (
        <div className="absolute left-0 right-0 z-50 mt-1 rounded-xl border border-gray-200 bg-white shadow-lg flex flex-col max-h-56 overflow-hidden">
          <div className="p-2 border-b border-gray-100 shrink-0 space-y-1.5">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search features…"
              className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-gray-50 focus:outline-none focus:border-teal-400"
            />
            <button
              type="button"
              onClick={() => {
                const allSelected = options.every((o) => selectedSet.has(o));
                onChange(allSelected ? "" : joinFeaturesCsv(options));
              }}
              className="w-full text-left text-[11px] text-teal-600 hover:text-teal-700 px-0.5"
            >
              {options.every((o) => selectedSet.has(o)) ? "Deselect all" : "Select all"}
            </button>
          </div>
          <div className="overflow-y-auto py-1">
            {filtered.length === 0 && (
              <div className="px-3 py-2 text-xs text-gray-400 text-center">No matches</div>
            )}
            {filtered.map((name) => {
              const on = selectedSet.has(name);
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => toggle(name)}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left hover:bg-teal-50/80 transition-colors"
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                      on ? "border-teal-500 bg-teal-500 text-white" : "border-gray-300 bg-white"
                    }`}
                  >
                    {on ? <Check size={10} strokeWidth={3} /> : null}
                  </span>
                  <span className="text-xs font-mono text-gray-700 truncate">{name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const FILLNA_TAG_MAX = 3;

function FillnaRowCompact({
  rrow,
  options,
  onUpdate,
  onDelete,
}: {
  rrow: { id: string; method: string; features: string; fixedValue?: string };
  options: string[];
  onUpdate: (patch: Partial<{ method: string; features: string; fixedValue: string }>) => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const handleEditClick = () => {
    if (open) { setOpen(false); return; }
    if (triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      setPopoverPos({ top: r.bottom + 6, left: Math.max(8, r.right - 256) });
    }
    setOpen(true);
  };

  const features = useMemo(() => parseFeaturesCsv(rrow.features), [rrow.features]);
  const visibleTags = features.slice(0, FILLNA_TAG_MAX);
  const overflow = features.length - FILLNA_TAG_MAX;

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white min-w-0">
      {rrow.method === "fixed_value" ? (
        <span className="text-xs px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-mono shrink-0 border border-amber-200">
          ={rrow.fixedValue !== undefined && rrow.fixedValue !== "" ? rrow.fixedValue : <span className="italic text-amber-400">value</span>}
        </span>
      ) : (
        <span className="text-xs px-2 py-0.5 rounded-md bg-teal-100 text-teal-700 font-mono shrink-0">
          {rrow.method}
        </span>
      )}
      <div className="flex items-center gap-1 flex-1 min-w-0 flex-wrap">
        {visibleTags.map((f) => (
          <span key={f} className="text-xs px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-600 font-mono truncate max-w-[120px]">
            {f}
          </span>
        ))}
        {overflow > 0 && (
          <span className="text-xs text-gray-400 shrink-0">+{overflow}</span>
        )}
        {features.length === 0 && (
          <span className="text-xs text-gray-400 italic">No features</span>
        )}
      </div>
      <div className="shrink-0 flex items-center gap-1.5">
        <button
          ref={triggerRef}
          type="button"
          onClick={handleEditClick}
          className="text-gray-400 hover:text-teal-600 transition-colors"
        >
          <Pencil size={13} />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="text-gray-300 hover:text-red-400 transition-colors"
        >
          <Trash2 size={13} />
        </button>
      </div>
      {open && popoverPos && createPortal(
        <div
          ref={popoverRef}
          style={{ position: "fixed", top: popoverPos.top, left: popoverPos.left, zIndex: 9999, width: 256 }}
          className="rounded-xl border border-gray-200 bg-white shadow-2xl p-3 space-y-3"
        >
          <div>
            <div className="text-[10px] text-gray-400 mb-1">Fill method</div>
            <select
              value={rrow.method}
              onChange={(e) => onUpdate({ method: e.target.value, fixedValue: "" })}
              className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-gray-50 focus:outline-none focus:border-teal-400"
            >
              {FILLNA_METHODS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          {rrow.method === "fixed_value" && (
            <div>
              <div className="text-[10px] text-gray-400 mb-1">Value</div>
              <input
                type="text"
                value={rrow.fixedValue ?? ""}
                onChange={(e) => onUpdate({ fixedValue: e.target.value })}
                placeholder="e.g. 0, unknown, -1"
                className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-gray-50 focus:outline-none focus:border-teal-400 font-mono"
              />
            </div>
          )}
          <div>
            <div className="text-[10px] text-gray-400 mb-1">Feature names</div>
            <FillnaFeatureNamesMultiSelect
              value={rrow.features}
              options={options}
              onChange={(csv) => onUpdate({ features: csv })}
            />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

function sqlSyntaxStatus(sql: string): "ok" | "warn" | null {
  const s = sql.trim();
  if (!s) return null;
  return /^(CASE|SELECT|IF|COALESCE|IIF|WHEN)\b/i.test(s) ? "ok" : "warn";
}

function VmRowCompact({
  rrow,
  options,
  onUpdate,
  onDelete,
}: {
  rrow: { id: string; feature: string; sql: string };
  options: string[];
  onUpdate: (patch: Partial<{ feature: string; sql: string }>) => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const handleEditClick = () => {
    if (open) { setOpen(false); return; }
    if (triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      setPopoverPos({ top: r.bottom + 6, left: Math.max(8, r.right - 288) });
    }
    setOpen(true);
  };

  const status = sqlSyntaxStatus(rrow.sql);

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white min-w-0">
      <span className="text-xs font-mono text-gray-700 truncate flex-1 min-w-0">
        {rrow.feature || <span className="text-gray-400 italic">No feature</span>}
      </span>
      {status === "ok" && (
        <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-green-50 text-green-600 border border-green-200 shrink-0">
          <Check size={10} strokeWidth={3} /> OK
        </span>
      )}
      {status === "warn" && (
        <span className="text-[11px] px-2 py-0.5 rounded-md bg-amber-50 text-amber-600 border border-amber-200 shrink-0">
          ⚠ Check SQL
        </span>
      )}
      <div className="shrink-0 flex items-center gap-1.5">
        <button
          ref={triggerRef}
          type="button"
          onClick={handleEditClick}
          className="text-gray-400 hover:text-teal-600 transition-colors"
        >
          <Pencil size={13} />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="text-gray-300 hover:text-red-400 transition-colors"
        >
          <Trash2 size={13} />
        </button>
      </div>
      {open && popoverPos && createPortal(
        <div
          ref={popoverRef}
          style={{ position: "fixed", top: popoverPos.top, left: popoverPos.left, zIndex: 9999, width: 288 }}
          className="rounded-xl border border-gray-200 bg-white shadow-2xl p-3 space-y-3"
        >
          <div>
            <div className="text-[10px] text-gray-400 mb-1">Feature name</div>
            <select
              value={rrow.feature}
              onChange={(e) => onUpdate({ feature: e.target.value })}
              className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 font-mono bg-gray-50 focus:outline-none focus:border-teal-400"
            >
              <option value="">Select feature…</option>
              {options.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
          <div>
            <div className="text-[10px] text-gray-400 mb-1">SQL expression</div>
            <textarea
              value={rrow.sql}
              onChange={(e) => onUpdate({ sql: e.target.value })}
              rows={4}
              placeholder={"CASE WHEN credit_score >= 700\n  THEN 'low'\n  ELSE 'high'\nEND"}
              className="w-full text-xs font-mono border border-gray-200 rounded-lg px-2 py-1.5 bg-gray-50 resize-y focus:outline-none focus:border-teal-400 leading-relaxed"
            />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

function latestSuccessfulInstance(instances: Instance[]): Instance | null {
  const success = instances.filter((i) => i.status === "SUCCESS");
  if (success.length === 0) return null;
  return [...success].sort((a, b) => b.finishTime.localeCompare(a.finishTime))[0];
}

function latestSuccessfulInstanceColumnsCnt(instances: Instance[]): string | undefined {
  const inst = latestSuccessfulInstance(instances);
  return inst?.columnsCnt;
}

function instanceUpdatedAtLabel(inst: Instance | null): string {
  if (!inst) return "—";
  return (inst.finishTime || inst.startTime || "—").trim() || "—";
}

export function DataCleaningAndReportsModal({
  row,
  initialCleaning,
  cleaningTask,
  ingestionConfig,
  onClose,
  onRunTask,
}: {
  row: WideTableRow;
  initialCleaning: DataCleaningSnapshot;
  cleaningTask: CleaningTaskState;
  ingestionConfig?: DataIngestionConfigSnapshot;
  onClose: () => void;
  /** Trigger mock task lifecycle; list page persists snapshot with enabled on SUCCESS. */
  onRunTask: (payload: Pick<DataCleaningSnapshot, "fillnaRows" | "vmRows">) => void;
}) {
  const cleaningFeatureOptions = useMemo(() => getCleaningFeatureNameOptions(), []);
  const [mainTab, setMainTab] = useState<"report" | "config">("report");
  const [reportSubTab, setReportSubTab] = useState<"raw" | "clean">("raw");
  const [fillnaRows, setFillnaRows] = useState<{ id: string; method: string; features: string; fixedValue?: string }[]>(() =>
    initialCleaning.fillnaRows?.length ? initialCleaning.fillnaRows.map((r) => ({ ...r })) : []
  );
  const [vmRows, setVmRows] = useState<{ id: string; feature: string; sql: string }[]>(() =>
    initialCleaning.vmRows?.length ? initialCleaning.vmRows.map((r) => ({ ...r })) : []
  );
  const [vmFullscreen, setVmFullscreen] = useState<string | null>(null);

  useEffect(() => {
    if (!vmFullscreen) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") setVmFullscreen(null);
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [vmFullscreen]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  const rawSuccessInst = useMemo(() => latestSuccessfulInstance(row.instances), [row.instances]);
  const rawHasData = rawSuccessInst !== null;
  const rawColCount = parseColumnCount(latestSuccessfulInstanceColumnsCnt(row.instances));
  const cleanColCount = Math.max(1, rawColCount - 4);
  const cleanHasData = cleaningTask.status === "SUCCESS" && Boolean(cleaningTask.finishedAt);

  const rawUpdatedLabel = instanceUpdatedAtLabel(rawSuccessInst);
  const cleanUpdatedLabel =
    cleaningTask.status === "SUCCESS" && cleaningTask.finishedAt ? cleaningTask.finishedAt : "—";

  const reportColumnCount = reportSubTab === "raw" ? rawColCount : cleanColCount;

  const rawTable = ingestionConfig?.rawTable ?? "feature_store.dwd_wide_raw_feat_v1";
  const rawS3 = ingestionConfig?.rawS3 ?? "s3://data-lake-prod/widetable/reports/ts_demo/20240315/raw_stats.json";
  const cleanedTable =
    ingestionConfig?.cleanedTable ?? "feature_store.dwd_wide_clean_feat_v1";
  const cleanedReportPath =
    ingestionConfig?.cleanedReportPath ??
    "s3://data-lake-prod/widetable/reports/ts_demo/20240315/clean_stats.json";

  const addFillna = () =>
    setFillnaRows((p) => [...p, { id: `fn-${Date.now()}`, method: "mean", features: "" }]);
  const addVm = () =>
    setVmRows((p) => [...p, { id: `vm-${Date.now()}`, feature: "", sql: "" }]);

  const handleRunTaskClick = () => {
    onRunTask({
      fillnaRows: fillnaRows.map((r) => ({ ...r })),
      vmRows: vmRows.map((r) => ({ ...r })),
    });
  };

  const downloadCurrentReport = () => {
    const rows = generateReportRows(reportColumnCount);
    const kind = reportSubTab === "raw" ? "raw" : "clean";
    downloadDataReportCsv(rows, `data-report-${kind}-${row.name.replace(/\s+/g, "_")}-${reportColumnCount}cols.csv`);
  };

  const reportToolbarEnd = (
    <>
      <span className="text-[11px] text-gray-500 whitespace-nowrap tabular-nums">
        Updated: {reportSubTab === "raw" ? rawUpdatedLabel : cleanUpdatedLabel}
      </span>
      <button
        type="button"
        onClick={downloadCurrentReport}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] rounded-lg border border-gray-200 text-gray-600 hover:border-teal-300 hover:text-teal-700 hover:bg-teal-50/50 transition-all"
      >
        <Download size={12} /> Download CSV
      </button>
    </>
  );

  const runDisabled =
    mainTab !== "config" ||
    cleaningTask.status === "PENDING" ||
    cleaningTask.status === "RUNNING";

  return (
    <>
      <div className="fixed inset-0 z-[125] flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
        <div
          className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between gap-3 bg-gradient-to-r from-teal-50/80 via-violet-50/30 to-white">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-teal-100 flex items-center justify-center shrink-0">
                <Sparkles size={16} className="text-teal-600" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-gray-800 truncate">Clean · {row.name}</div>
                <div className="text-[10px] text-gray-400 mt-0.5 font-mono truncate">
                  Raw Table Result: feature_store.dwd_{row.region[0]?.toLowerCase()}_{row.name}__raw
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5 font-mono truncate">
                  Cleaned Table Result: feature_store.dwd_{row.region[0]?.toLowerCase()}_{row.name}__clean
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 shrink-0"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex border-b border-gray-200 px-5 gap-1 shrink-0 bg-white">
            <button
              type="button"
              onClick={() => setMainTab("report")}
              className={`px-4 py-2.5 text-xs font-medium border-b-2 -mb-px transition-colors ${
                mainTab === "report"
                  ? "border-teal-500 text-teal-700"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Data Report
            </button>
            <button
              type="button"
              onClick={() => setMainTab("config")}
              className={`px-4 py-2.5 text-xs font-medium border-b-2 -mb-px transition-colors ${
                mainTab === "config"
                  ? "border-teal-500 text-teal-700"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Cleaning Config
            </button>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0">
            {mainTab === "report" && (
              <div className="px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2 mb-3">
                  <Database size={14} className="text-teal-600 shrink-0" />
                  <span className="text-xs font-medium text-gray-600 tracking-wide uppercase">Data report</span>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white border-l-4 border-l-teal-400 shadow-sm overflow-hidden">
                  <div className="px-3 pt-3 pb-2 border-b border-gray-100 bg-slate-50/50">
                    <div className="flex flex-wrap gap-1">
                      <button
                        type="button"
                        onClick={() => setReportSubTab("raw")}
                        className={`px-2.5 py-1 text-[11px] font-medium rounded-full border transition-colors ${
                          reportSubTab === "raw"
                            ? "border-teal-300 bg-teal-50 text-teal-800"
                            : "border-transparent text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        Raw Data
                      </button>
                      <button
                        type="button"
                        onClick={() => setReportSubTab("clean")}
                        className={`px-2.5 py-1 text-[11px] font-medium rounded-full border transition-colors ${
                          reportSubTab === "clean"
                            ? "border-violet-300 bg-violet-50 text-violet-800"
                            : "border-transparent text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        Cleaned Data
                      </button>
                    </div>
                  </div>

                  <div className="p-3 flex flex-col min-h-[200px]">
                    {reportSubTab === "raw" && !rawHasData && (
                      <div className="flex-1 flex items-center justify-center py-14 px-4 text-center text-sm text-gray-500">
                        No successful wide table instance yet. Run an instance first to generate a raw data
                        report.
                      </div>
                    )}
                    {reportSubTab === "raw" && rawHasData && (
                      <div className="rounded-lg border border-gray-100 overflow-hidden flex flex-col max-h-[320px]">
                        <DataReportTableSection
                          key={`raw-${reportColumnCount}`}
                          columnCount={rawColCount}
                          pageSize={12}
                          tableClassName="max-h-[200px]"
                          toolbarEnd={reportToolbarEnd}
                        />
                      </div>
                    )}
                    {reportSubTab === "clean" && !cleanHasData && (
                      <div className="flex-1 flex items-center justify-center py-14 px-4 text-center text-sm text-gray-500">
                        No cleaned data report yet. Open{" "}
                        <button
                          type="button"
                          className="text-teal-600 font-medium hover:underline"
                          onClick={() => setMainTab("config")}
                        >
                          Cleaning Config
                        </button>
                        , set Fillna / Value mapping, and click Run Cleaning.
                      </div>
                    )}
                    {reportSubTab === "clean" && cleanHasData && (
                      <div className="rounded-lg border border-gray-100 overflow-hidden flex flex-col max-h-[320px]">
                        <DataReportTableSection
                          key={`clean-${reportColumnCount}`}
                          columnCount={cleanColCount}
                          pageSize={12}
                          tableClassName="max-h-[200px]"
                          toolbarEnd={reportToolbarEnd}
                        />
                      </div>
                    )}
                  </div>
                </div>

              </div>
            )}

            {mainTab === "config" && (
              <div className="px-5 py-4">
                <div className="text-xs font-medium text-gray-500 tracking-wide uppercase mb-3">Cleaning config</div>

                <div className="rounded-xl border border-gray-200 bg-gray-50/80 px-3 py-2.5 mb-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase tracking-wide mb-0.5">
                      Latest background task ID
                    </span>
                    <span className="font-mono text-gray-800">{cleaningTask.taskId || "—"}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase tracking-wide mb-0.5">
                      Task status
                    </span>
                    <span
                      className={`font-medium ${
                        cleaningTask.status === "SUCCESS"
                          ? "text-teal-700"
                          : cleaningTask.status === "FAILED"
                            ? "text-red-600"
                            : cleaningTask.status === "RUNNING" || cleaningTask.status === "PENDING"
                              ? "text-amber-700"
                              : "text-gray-600"
                      }`}
                    >
                      {cleaningTask.status}
                    </span>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500 tracking-wide">Fillna</span>
                    <button
                      type="button"
                      onClick={addFillna}
                      className="text-xs text-teal-600 hover:text-teal-700 font-medium"
                    >
                      + Add row
                    </button>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {fillnaRows.map((rrow) => (
                      <FillnaRowCompact
                        key={rrow.id}
                        rrow={rrow}
                        options={cleaningFeatureOptions}
                        onUpdate={(patch) =>
                          setFillnaRows((p) =>
                            p.map((r) => (r.id === rrow.id ? { ...r, ...patch } : r))
                          )
                        }
                        onDelete={() => setFillnaRows((p) => p.filter((r) => r.id !== rrow.id))}
                      />
                    ))}
                    {fillnaRows.length === 0 && (
                      <p className="text-xs text-gray-400 border border-dashed border-gray-200 rounded-xl py-4 text-center">
                        No Fillna rules — optional
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500 tracking-wide">Value mapping</span>
                    <button
                      type="button"
                      onClick={addVm}
                      className="text-xs text-teal-600 hover:text-teal-700 font-medium"
                    >
                      + Add row
                    </button>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {vmRows.map((rrow) => (
                      <VmRowCompact
                        key={rrow.id}
                        rrow={rrow}
                        options={cleaningFeatureOptions}
                        onUpdate={(patch) =>
                          setVmRows((p) =>
                            p.map((r) => (r.id === rrow.id ? { ...r, ...patch } : r))
                          )
                        }
                        onDelete={() => setVmRows((p) => p.filter((r) => r.id !== rrow.id))}
                      />
                    ))}
                    {vmRows.length === 0 && (
                      <p className="text-xs text-gray-400 border border-dashed border-gray-200 rounded-xl py-4 text-center">
                        No value mappings — optional
                      </p>
                    )}
                  </div>
                </div>

              </div>
            )}
          </div>

          <div className="px-5 py-3 border-t border-gray-100 flex justify-end gap-2 bg-gray-50/60 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-xl border border-gray-200 text-gray-600 hover:bg-white"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={runDisabled}
              onClick={handleRunTaskClick}
              className={`px-4 py-2 text-sm rounded-xl shadow-sm ${
                runDisabled
                  ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                  : "bg-teal-500 text-white hover:bg-teal-600"
              }`}
            >
              Run Cleaning
            </button>
          </div>
        </div>
      </div>

      {vmFullscreen && (
        <div
          className="fixed inset-0 z-[135] flex items-center justify-center p-6 bg-black/50"
          onClick={() => setVmFullscreen(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl border border-gray-100 flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
              <span className="text-sm font-medium text-gray-800">SQL editor</span>
              <button
                type="button"
                onClick={() => setVmFullscreen(null)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            </div>
            <textarea
              value={vmRows.find((r) => r.id === vmFullscreen)?.sql ?? ""}
              onChange={(e) =>
                setVmRows((p) => p.map((r) => (r.id === vmFullscreen ? { ...r, sql: e.target.value } : r)))
              }
              className="flex-1 min-h-[240px] m-4 font-mono text-sm border border-gray-200 rounded-xl p-3 focus:outline-none focus:border-teal-400"
            />
            <div className="px-4 py-3 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                onClick={() => setVmFullscreen(null)}
                className="px-4 py-2 text-sm bg-teal-500 text-white rounded-lg hover:bg-teal-600"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
