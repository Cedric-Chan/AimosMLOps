import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import {
  Search,
  RotateCcw,
  ChevronDown,
  Plus,
  RefreshCw,
  Download,
  Settings,
  Layers,
  CheckCircle2,
  XCircle,
  Trash2,
  Ban,
  ToggleLeft,
  AlertTriangle,
} from "lucide-react";
import {
  INITIAL_TRANSFORMATION_ROWS,
  TF_FILTER_REGIONS,
  TF_TYPES,
  TF_LANGUAGES,
  sortRowsForTable,
  computeNameRowspans,
  type TransformationVersionRow,
  type TransformationStatus,
} from "./transformationData";
import { TransformationTestModal } from "./TransformationTestModal";

const CURRENT_USER = "cedric.chencan@seamoney.com";

function StatusTag({ status }: { status: TransformationStatus }) {
  const cfg: Record<
    TransformationStatus,
    { label: string; dot: string; cls: string }
  > = {
    DRAFT: {
      label: "DRAFT",
      dot: "bg-slate-400",
      cls: "bg-slate-50 text-slate-600 border-slate-200",
    },
    ENABLED: {
      label: "ENABLED",
      dot: "bg-emerald-500",
      cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    DISABLED: {
      label: "DISABLED",
      dot: "bg-red-500",
      cls: "bg-red-50 text-red-600 border-red-200",
    },
    PENDING: {
      label: "PENDING",
      dot: "bg-amber-500",
      cls: "bg-amber-50 text-amber-700 border-amber-200",
    },
  };
  const c = cfg[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs border ${c.cls}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

function RegionTags({ regions }: { regions: string[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {regions.map((r) => (
        <span
          key={r}
          className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200"
        >
          {r}
        </span>
      ))}
    </div>
  );
}

function useClickOutside(cb: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function h(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) cb();
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [cb]);
  return ref;
}

function MoreMenu({
  onEdit,
  onAdd,
  onMonitor,
}: {
  onEdit: () => void;
  onAdd: () => void;
  onMonitor: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(() => setOpen(false));
  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-0.5 text-xs text-teal-600 hover:underline"
      >
        More
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 min-w-[120px] bg-white border border-gray-200 rounded-lg shadow-lg py-1">
          <button
            type="button"
            className="w-full text-left px-3 py-2 hover:bg-slate-50 text-xs text-teal-600 hover:underline"
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
          >
            Edit
          </button>
          <button
            type="button"
            className="w-full text-left px-3 py-2 hover:bg-slate-50 text-xs text-teal-600 hover:underline"
            onClick={() => {
              setOpen(false);
              onAdd();
            }}
          >
            Add
          </button>
          <button
            type="button"
            className="w-full text-left px-3 py-2 hover:bg-slate-50 text-xs text-teal-600 hover:underline"
            onClick={() => {
              setOpen(false);
              onMonitor();
            }}
          >
            Monitor
          </button>
        </div>
      )}
    </div>
  );
}

function ManageMenuTf({
  status,
  onDraft,
  onEnable,
  onDisable,
  onDelete,
}: {
  status: TransformationStatus;
  onDraft: () => void;
  onEnable: () => void;
  onDisable: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [confirmDisable, setConfirmDisable] = useState(false);
  const ref = useClickOutside(() => {
    setOpen(false);
    setConfirmDisable(false);
  });

  const canEnable = status === "DRAFT";
  const canDisable = status === "ENABLED";
  const canDraft = status === "DISABLED";
  const canDelete = status === "DRAFT" || status === "DISABLED";

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          setConfirmDisable(false);
        }}
        className="inline-flex items-center gap-0.5 text-xs text-teal-600 hover:text-teal-800 hover:underline"
      >
        Manage
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 min-w-[168px] bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden">
          {!confirmDisable ? (
            <div className="py-1">
              <button
                type="button"
                disabled={!canDraft}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs ${
                  canDraft
                    ? "text-slate-700 hover:bg-slate-50"
                    : "text-slate-300 cursor-not-allowed"
                }`}
                onClick={() => {
                  if (!canDraft) return;
                  onDraft();
                  setOpen(false);
                }}
              >
                <ToggleLeft className="w-3.5 h-3.5" />
                Draft
                {!canDraft && (
                  <span className="ml-auto text-[10px] text-slate-300">DISABLE only</span>
                )}
              </button>
              <button
                type="button"
                disabled={!canEnable}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs ${
                  canEnable
                    ? "text-emerald-600 hover:bg-emerald-50"
                    : "text-slate-300 cursor-not-allowed"
                }`}
                onClick={() => {
                  if (!canEnable) return;
                  onEnable();
                  setOpen(false);
                }}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Enable
                {!canEnable && (
                  <span className="ml-auto text-[10px] text-slate-300">DRAFT only</span>
                )}
              </button>
              <button
                type="button"
                disabled={!canDisable}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs ${
                  canDisable
                    ? "text-orange-600 hover:bg-orange-50"
                    : "text-slate-300 cursor-not-allowed"
                }`}
                onClick={() => canDisable && setConfirmDisable(true)}
              >
                <Ban className="w-3.5 h-3.5" />
                Disable
                {!canDisable && (
                  <span className="ml-auto text-[10px] text-slate-300">ENABLED only</span>
                )}
              </button>
              <div className="h-px bg-gray-100 my-1" />
              <button
                type="button"
                disabled={!canDelete}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs ${
                  canDelete
                    ? "text-red-600 hover:bg-red-50"
                    : "text-slate-300 cursor-not-allowed"
                }`}
                onClick={() => {
                  if (!canDelete) return;
                  onDelete();
                  setOpen(false);
                }}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            </div>
          ) : (
            <div className="p-3 w-52">
              <div className="flex gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                <p className="text-xs text-slate-600">Disable this version?</p>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="px-2 py-1 text-xs border border-slate-200 rounded hover:bg-slate-50"
                  onClick={() => setConfirmDisable(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="px-2 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600"
                  onClick={() => {
                    onDisable();
                    setOpen(false);
                    setConfirmDisable(false);
                  }}
                >
                  Disable
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function TransformationList() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<TransformationVersionRow[]>(() => [
    ...INITIAL_TRANSFORMATION_ROWS,
  ]);

  const [name, setName] = useState("");
  const [owner, setOwner] = useState("");
  const [type, setType] = useState("");
  const [language, setLanguage] = useState("");
  const [region, setRegion] = useState("");
  const [script, setScript] = useState("");
  const [filterExpanded, setFilterExpanded] = useState(false);
  const [applied, setApplied] = useState({
    name: "",
    owner: "",
    type: "",
    language: "",
    region: "",
    script: "",
  });
  const [ownedByMe, setOwnedByMe] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [testRow, setTestRow] = useState<TransformationVersionRow | null>(null);
  const [monitorOpen, setMonitorOpen] = useState(false);

  useEffect(() => {
    if (!monitorOpen) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMonitorOpen(false);
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [monitorOpen]);

  const activeFilterCount = [
    applied.name,
    applied.owner,
    applied.type,
    applied.language,
    applied.region,
    applied.script,
  ].filter(Boolean).length;

  const handleQuery = () => {
    setApplied({
      name: name.trim(),
      owner: owner.trim(),
      type,
      language,
      region,
      script: script.trim(),
    });
    setCurrentPage(1);
  };

  const handleReset = () => {
    setName("");
    setOwner("");
    setType("");
    setLanguage("");
    setRegion("");
    setScript("");
    setApplied({
      name: "",
      owner: "",
      type: "",
      language: "",
      region: "",
      script: "",
    });
    setCurrentPage(1);
  };

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (ownedByMe && r.owner !== CURRENT_USER) return false;
      if (applied.name && !r.name.toLowerCase().includes(applied.name.toLowerCase()))
        return false;
      if (applied.owner && !r.owner.toLowerCase().includes(applied.owner.toLowerCase()))
        return false;
      if (applied.type && r.type !== applied.type) return false;
      if (applied.language && r.language !== applied.language) return false;
      if (applied.region && !r.regions.includes(applied.region)) return false;
      if (
        applied.script &&
        !r.script.toLowerCase().includes(applied.script.toLowerCase())
      )
        return false;
      return true;
    });
  }, [rows, applied, ownedByMe]);

  const sorted = useMemo(() => sortRowsForTable(filtered), [filtered]);

  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const paged = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, currentPage, pageSize]);
  const rowspan = useMemo(() => computeNameRowspans(paged), [paged]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const editPath = (r: TransformationVersionRow) =>
    `/tf/edit/${encodeURIComponent(r.name)}/${encodeURIComponent(r.version)}`;

  const setStatus = (id: string, s: TransformationStatus) => {
    setRows((prev) => prev.map((x) => (x.id === id ? { ...x, status: s } : x)));
  };

  const removeRow = (id: string) => {
    if (!window.confirm("Delete this transformation version?")) return;
    setRows((prev) => prev.filter((x) => x.id !== id));
  };

  return (
    <div className="min-h-full bg-[#f5f7fa]">
      <header className="bg-white border-b border-gray-100 px-6 py-3 flex items-center gap-3 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#13c2c2] flex items-center justify-center shadow-sm">
            <Layers size={14} className="text-white" />
          </div>
          <h1 className="text-gray-800 leading-tight text-[15px] font-semibold">
            Transformation
          </h1>
        </div>
        <div className="ml-auto flex items-center gap-2 text-xs text-gray-400">
          <RefreshCw size={11} />
          <span>FeatureStore prototype</span>
        </div>
      </header>

      <main className="p-5 flex flex-col gap-4 max-w-screen-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div
            className="flex items-center justify-between px-6 py-4 border-b border-gray-50 cursor-pointer select-none hover:bg-black/[0.02]"
            onClick={() => setFilterExpanded((v) => !v)}
          >
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 bg-teal-500 rounded-full" />
              <span className="text-sm text-gray-500 tracking-wide uppercase">
                Filters
              </span>
              {activeFilterCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full text-xs bg-emerald-500 text-white font-medium">
                  {activeFilterCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 min-w-0">
              {!filterExpanded && (
                <div className="flex flex-wrap gap-2 justify-end text-xs">
                  {activeFilterCount === 0 ? (
                    <span className="text-gray-400">No filters applied</span>
                  ) : (
                    <>
                      {applied.name && (
                        <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                          Name: {applied.name}
                        </span>
                      )}
                      {applied.owner && (
                        <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                          Owner: {applied.owner}
                        </span>
                      )}
                      {applied.type && (
                        <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                          Type: {applied.type}
                        </span>
                      )}
                      {applied.language && (
                        <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                          Lang: {applied.language}
                        </span>
                      )}
                      {applied.region && (
                        <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                          Region: {applied.region}
                        </span>
                      )}
                      {applied.script && (
                        <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200 truncate max-w-[140px]">
                          Script: {applied.script}
                        </span>
                      )}
                    </>
                  )}
                </div>
              )}
              <span className="flex items-center gap-1.5 text-teal-600 text-sm shrink-0">
                {filterExpanded ? "Collapse" : "Expand"}
                <ChevronDown
                  size={14}
                  className={`transition-transform ${filterExpanded ? "rotate-180" : ""}`}
                />
              </span>
            </div>
          </div>
          {filterExpanded && (
            <div className="px-6 pb-5 pt-2 border-t border-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4 mt-3">
                <Field label="Name">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Please enter"
                      className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-teal-400 focus:bg-white"
                    />
                  </div>
                </Field>
                <Field label="Owner">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      value={owner}
                      onChange={(e) => setOwner(e.target.value)}
                      placeholder="Please enter"
                      className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-teal-400 focus:bg-white"
                    />
                  </div>
                </Field>
                <Field label="Type">
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-teal-400 focus:bg-white text-gray-700"
                  >
                    {TF_TYPES.map((t) => (
                      <option key={t || "all"} value={t}>
                        {t || "Please select"}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Language">
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-teal-400 focus:bg-white text-gray-700"
                  >
                    {TF_LANGUAGES.map((t) => (
                      <option key={t || "all"} value={t}>
                        {t || "Please select"}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Region">
                  <select
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-teal-400 focus:bg-white text-gray-700"
                  >
                    {TF_FILTER_REGIONS.map((t) => (
                      <option key={t || "all"} value={t}>
                        {t || "Please select"}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Script">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      value={script}
                      onChange={(e) => setScript(e.target.value)}
                      placeholder="Please enter"
                      className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-teal-400 focus:bg-white"
                    />
                  </div>
                </Field>
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <RotateCcw size={13} />
                  Reset
                </button>
                <button
                  type="button"
                  onClick={handleQuery}
                  className="flex items-center gap-1.5 px-5 py-2 text-sm text-white bg-teal-500 rounded-lg hover:bg-teal-600 shadow-sm"
                >
                  <Search size={13} />
                  Query
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="w-2 h-2 rounded-full bg-teal-400" />
              <span>
                Total <strong className="text-gray-800">{total}</strong> records
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ownedByMe}
                  onChange={(e) => {
                    setOwnedByMe(e.target.checked);
                    setCurrentPage(1);
                  }}
                  className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                Owned by me
              </label>
              <button
                type="button"
                onClick={() => navigate("/tf/new")}
                className="flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-teal-500 rounded-lg hover:bg-teal-600 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Add Transformation
              </button>
              <button
                type="button"
                className="p-2 text-gray-400 border border-gray-200 rounded-lg hover:text-teal-600 hover:bg-teal-50 transition-colors"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                type="button"
                className="p-2 text-gray-400 border border-gray-200 rounded-lg hover:text-teal-600 hover:bg-teal-50 transition-colors"
                title="Export"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                type="button"
                className="p-2 text-gray-400 border border-gray-200 rounded-lg hover:text-teal-600 hover:bg-teal-50 transition-colors"
                title="Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-slate-50 to-slate-100/80 border-b border-slate-200">
                  {[
                    "Name",
                    "Version",
                    "Type",
                    "Language",
                    "Status",
                    "Region",
                    "Owner",
                    "CreateTime",
                    "Description",
                    "Action",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs text-slate-500 font-medium whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paged.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center text-slate-400 text-sm">
                      No records match the current filters.
                    </td>
                  </tr>
                ) : (
                  paged.map((r, idx) => {
                    const rs = rowspan.get(r.id) ?? 1;
                    const showName = rs > 0;
                    return (
                      <tr
                        key={r.id}
                        className={`border-b border-slate-100 ${
                          idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                        } hover:bg-teal-50/20`}
                      >
                        {showName && (
                          <td
                            className="px-4 py-3 align-top font-medium text-slate-800 border-r border-slate-100"
                            rowSpan={rs}
                          >
                            {r.name}
                          </td>
                        )}
                        <td className="px-4 py-3 text-xs font-mono text-slate-600">{r.version}</td>
                        <td className="px-4 py-3 text-xs text-slate-600">{r.type}</td>
                        <td className="px-4 py-3 text-xs text-slate-600">{r.language}</td>
                        <td className="px-4 py-3">
                          <StatusTag status={r.status} />
                        </td>
                        <td className="px-4 py-3">
                          <RegionTags regions={r.regions} />
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600 max-w-[160px] truncate">
                          {r.owner}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                          {r.createTime}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 max-w-[200px]">
                          <span className="truncate block" title={r.description}>
                            {r.description}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <button
                              type="button"
                              onClick={() =>
                                navigate(editPath(r), { state: { readOnly: true } })
                              }
                              className="text-xs text-teal-600 hover:underline"
                            >
                              View
                            </button>
                            <button
                              type="button"
                              onClick={() => setTestRow(r)}
                              className="text-xs text-teal-600 hover:underline"
                            >
                              Test
                            </button>
                            <MoreMenu
                              onEdit={() => navigate(editPath(r))}
                              onAdd={() =>
                                navigate(
                                  `/tf/new?copyFrom=${encodeURIComponent(r.name)}&copyVersion=${encodeURIComponent(r.version)}`
                                )
                              }
                              onMonitor={() => setMonitorOpen(true)}
                            />
                            <ManageMenuTf
                              status={r.status}
                              onDraft={() => setStatus(r.id, "DRAFT")}
                              onEnable={() => setStatus(r.id, "ENABLED")}
                              onDisable={() => setStatus(r.id, "DISABLED")}
                              onDelete={() => removeRow(r.id)}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100 bg-slate-50/50">
            <span className="text-xs text-slate-500">
              {total === 0 ? (
                "0 of 0 items"
              ) : (
                <>
                  {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, total)} of{" "}
                  {total} items
                </>
              )}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage <= 1 || total === 0}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-30"
              >
                <ChevronDown className="w-4 h-4 -rotate-90" />
              </button>
              <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-teal-500 text-white text-xs">
                {currentPage}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages || total === 0}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-30"
              >
                <ChevronDown className="w-4 h-4 rotate-90" />
              </button>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="ml-2 text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white"
              >
                {[10, 20, 50, 100].map((s) => (
                  <option key={s} value={s}>
                    {s} / page
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </main>

      <TransformationTestModal
        open={!!testRow}
        row={testRow}
        onClose={() => setTestRow(null)}
      />

      {monitorOpen && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40"
          onClick={() => setMonitorOpen(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl p-6 max-w-sm mx-4 border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold text-slate-800 mb-2">Monitor</h3>
            <p className="text-xs text-slate-500 mb-4">
              Monitoring for Transformation is not wired in this prototype.
            </p>
            <button
              type="button"
              onClick={() => setMonitorOpen(false)}
              className="w-full py-2 text-sm bg-teal-500 text-white rounded-lg hover:bg-teal-600"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs text-gray-500">{label}</label>
      {children}
    </div>
  );
}
