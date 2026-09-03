import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import { useFeatureGroups } from "@/app/feature-group/FeatureGroupsProvider";
import FeatureGroupModal, {
  type FGFormData,
  normalizeFgFormData,
} from "./FeatureGroupModal";
import type { FeatureGroup } from "./fgSeed";

export type { FeatureGroup } from "./fgSeed";
export { INITIAL_FG_LIST_SEED, INITIAL_MODULES } from "./fgSeed";
import {
  MapPin,
  Layers,
  User,
  Clock,
  Plus,
  FolderOpen,
  RefreshCw,
  ChevronRight,
  Search,
  X,
  FilePlus,
  AlertCircle,
  Database,
  Zap,
  Copy,
  Trash2,
  AlertTriangle,
} from "lucide-react";
// ─── Mock downstream lineage (WideTable references) ──────────────────────────
const MOCK_FG_DOWNSTREAM: Record<string, string[]> = {
  "1": ["risk_wide_table", "fraud_signal_table_ph"],
  "2": ["acard_wide_table_mx"],
  "3": ["risk_wide_table"],
  "5": ["fraud_signal_table_ph"],
  "6": ["acard_wide_table_mx"],
};

// ─── Fts count tags ───────────────────────────────────────────────────────────
const MOCK_FT_COUNTS: Record<string, { train: number; serve: number }> = {
  "1": { train: 13, serve: 11 },
  "2": { train: 8,  serve: 8  },
  "3": { train: 20, serve: 15 },
  "4": { train: 5,  serve: 0  },
  "5": { train: 17, serve: 12 },
  "6": { train: 10, serve: 9  },
};

function FtsTag({ type, count }: { type: "training" | "serving"; count: number }) {
  const isTraining = type === "training";
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs border"
      style={{ background: "#ffffff", borderColor: "#e5e7eb" }}
    >
      {isTraining
        ? <Database size={10} style={{ color: "#b0b8c4", flexShrink: 0 }} />
        : <Zap       size={10} style={{ color: "#b0b8c4", flexShrink: 0 }} />
      }
      <span style={{ color: "#9ca3af" }}>{isTraining ? "for Training" : "for Serving"}</span>
      <span style={{ color: "#374151" }}>{count}</span>
    </span>
  );
}

function MetaItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 text-sm text-gray-500 min-w-0">
      <span className="flex-shrink-0 text-gray-400">{icon}</span>
      <span className="flex-shrink-0 text-gray-400 text-xs">{label}:</span>
      <span
        className="truncate px-2 py-0.5 rounded-md text-xs"
        style={{
          fontWeight: 600,
          backgroundColor: "rgba(19,194,194,0.08)",
          color: "#0e9494",
          border: "1px solid rgba(19,194,194,0.18)",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function EntityPill({ value }: { value: string }) {
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded text-xs"
      style={{
        fontWeight: 500,
        backgroundColor: "rgba(19,194,194,0.06)",
        color: "#0e9494",
        border: "1px solid rgba(19,194,194,0.15)",
        fontFamily: "monospace",
        letterSpacing: "-0.01em",
      }}
    >
      {value}
    </span>
  );
}
// ─── Main List Page ───────────────────────────────────────────────────────────
export default function FeatureGroupList() {
  const navigate = useNavigate();

  // Core list state (lifted so modal can mutate it)
  const { fgList, setFgList, updateFg, syncFgMetadata, modules, setModules } =
    useFeatureGroups();

  const SYNC_ARIA =
    "Manually refresh latest Training Config metadata";

  // UI state
  const [search, setSearch] = useState("");
  const [offlineTableSearch, setOfflineTableSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;
  const [showModuleDir, setShowModuleDir] = useState(false);
  const moduleDirWrapRef = useRef<HTMLDivElement>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalInitData, setModalInitData] = useState<
    Partial<FGFormData> | undefined
  >();

  function openCreateModal() {
    setModalInitData(undefined);
    setModalOpen(true);
  }

  function openCopyModal(fg: FeatureGroup) {
    const prefill = { ...(fg._formData ?? {}), name: "" };
    setModalInitData(prefill);
    setModalOpen(true);
  }

  function handleBasicModalSubmit(data: FGFormData) {
    const now = new Date().toISOString().slice(0, 19).replace("T", " ");
    const full = normalizeFgFormData(
      data as Partial<FGFormData> & Record<string, unknown>
    );
    const newId = `draft_${Date.now()}`;
    const newFg: FeatureGroup = {
      id: newId,
      name: full.name || "(Untitled)",
      region: full.region || "—",
      module: full.module || "—",
      owner: full.owners.join(",") || "—",
      createTime: now,
      updateTime: now,
      description: full.description || "",
      _formData: full,
    };
    setFgList((list) => [newFg, ...list]);
    setModalOpen(false);
    navigate(`/fg/${newId}`);
  }


  const filtered = fgList.filter(
    (fg) =>
      !fg.deleted &&
      (fg.name.toLowerCase().includes(search.toLowerCase()) ||
        fg.owner.toLowerCase().includes(search.toLowerCase()) ||
        fg.region.toLowerCase().includes(search.toLowerCase()))
  );

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Toolbar */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#13c2c2] flex items-center justify-center shadow-sm">
                <Layers size={14} className="text-white" />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1
                  className="text-gray-800 leading-tight"
                  style={{ fontSize: "15px", fontWeight: 600 }}
                >
                  Feature Groups
                </h1>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                  {filtered.length} items
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search feature groups..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                className="pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded bg-white focus:outline-none focus:border-[#13c2c2] w-52 transition-colors"
              />
            </div>

            <div className="w-px h-5 bg-gray-200 mx-1" />

            {/* Add Feature Group */}
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded border border-transparent text-white transition-all hover:opacity-90 active:opacity-80"
              style={{ backgroundColor: "#13c2c2", fontWeight: 500 }}
            >
              <Plus size={13} />
              Add Feature Group
            </button>

            {/* Module Dir */}
            <div ref={moduleDirWrapRef} className="relative">
              <button
                onClick={() => setShowModuleDir((v) => !v)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded border bg-white transition-all ${
                  showModuleDir
                    ? "border-[#13c2c2] text-[#13c2c2]"
                    : "border-gray-300 text-gray-700 hover:border-[#13c2c2] hover:text-[#13c2c2]"
                }`}
                style={{ fontWeight: 500 }}
              >
                <FolderOpen size={13} />
                Module Dir
              </button>

              {showModuleDir && (
                <ModuleDirPopover
                  onClose={() => setShowModuleDir(false)}
                  modules={modules}
                  setModules={setModules}
                  fgList={fgList}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Card list */}
      <div className="px-6 py-5 space-y-4">
        {paged.map((fg, idx) => (
          <FeatureGroupCard
            key={fg.id}
            fg={fg}
            index={(currentPage - 1) * pageSize + idx}
            onNavigate={() => navigate(`/fg/${fg.id}`)}
            onCopy={() => openCopyModal(fg)}
            onDeleteConfirm={() => updateFg(fg.id, { deleted: true })}
          />
        ))}
        {paged.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <Search size={40} className="mx-auto mb-3 opacity-30" />
            <p>No feature groups found</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {filtered.length > 0 && (
        <div className="px-6 pb-8 flex items-center justify-between text-sm text-gray-500">
          <span>
            {(currentPage - 1) * pageSize + 1}–
            {Math.min(currentPage * pageSize, filtered.length)} of {filtered.length} items
          </span>
          <div className="flex items-center gap-1">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="px-2.5 py-1 rounded border border-gray-300 bg-white hover:border-[#13c2c2] hover:text-[#13c2c2] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              «
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setCurrentPage(p)}
                className="w-8 h-8 rounded border transition-colors text-sm"
                style={
                  p === currentPage
                    ? { backgroundColor: "#13c2c2", color: "#fff", borderColor: "#13c2c2", fontWeight: 600 }
                    : { borderColor: "#d1d5db", color: "#6b7280", background: "#fff" }
                }
              >
                {p}
              </button>
            ))}
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="px-2.5 py-1 rounded border border-gray-300 bg-white hover:border-[#13c2c2] hover:text-[#13c2c2] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              »
            </button>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      <FeatureGroupModal
        open={modalOpen}
        mode="create"
        variant="basic"
        initialData={modalInitData}
        modules={modules}
        onClose={() => setModalOpen(false)}
        onSubmit={(data) => handleBasicModalSubmit(data)}
      />

    </div>
  );
}

// ─── Feature Group Card ───────────────────────────────────────────────────────
function FeatureGroupCard({
  fg,
  index,
  onNavigate,
  onCopy,
  onDeleteConfirm,
}: {
  fg: FeatureGroup;
  index: number;
  onNavigate: () => void;
  syncTitle: string;
  onCopy: () => void;
  onDeleteConfirm: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const deleteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!deleteOpen) return;
    function handler(e: MouseEvent) {
      if (deleteRef.current && !deleteRef.current.contains(e.target as Node))
        setDeleteOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [deleteOpen]);

  const downstream = MOCK_FG_DOWNSTREAM[fg.id] ?? [];

  return (
    <div
      className="bg-white rounded-xl border transition-all duration-200"
      style={{
        borderColor: hovered ? "#13c2c2" : "#e5e7eb",
        boxShadow: hovered
          ? "0 4px 24px 0 rgba(19,194,194,0.10), 0 1px 4px 0 rgba(0,0,0,0.04)"
          : "0 1px 4px 0 rgba(0,0,0,0.04)",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex">
        {/* Left accent bar */}
        <div
          className="w-1.5 flex-shrink-0 rounded-l-xl transition-all duration-200"
          style={{
            backgroundColor: hovered ? "#13c2c2" : "#e0f7f7",
          }}
        />
        <div className="flex-1 px-6 py-5">
          {/* Top row */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 flex-wrap min-w-0">
              {/* FG Name */}
              <button
                type="button"
                onClick={onNavigate}
                className="text-left group flex items-center gap-1.5 min-w-0"
                title="Open feature group detail"
              >
                <span
                  className="transition-colors group-hover:underline"
                  style={{
                    fontWeight: 700,
                    fontSize: 17,
                    color: hovered ? "#13c2c2" : "#1a1a2e",
                    fontFamily: "monospace",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {fg.name}
                </span>
                <ChevronRight
                  size={15}
                  className="flex-shrink-0 transition-all opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5"
                  style={{ color: "#13c2c2" }}
                />
              </button>
              {/* StatusTag removed — FG is stateless */}
              {MOCK_FT_COUNTS[fg.id] && (
                <>
                  <FtsTag type="training" count={MOCK_FT_COUNTS[fg.id].train} />
                  <FtsTag type="serving"  count={MOCK_FT_COUNTS[fg.id].serve} />
                </>
              )}
            </div>

            {/* Action buttons — uniform size */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {/* Sync button removed — page auto-fetches on mount */}
              <button
                onClick={onCopy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-600 hover:border-teal-300 hover:text-teal-600 hover:bg-teal-50 transition-all h-8"
                style={{ fontWeight: 500 }}
                title="Copy this feature group's config into a new one"
              >
                <Copy size={12} />
                Copy
              </button>

              <div className="relative" ref={deleteRef}>
                <button
                  onClick={() => setDeleteOpen((v) => !v)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-red-200 text-red-600 bg-white hover:bg-red-50 hover:border-red-300 transition-all h-8"
                  style={{ fontWeight: 500 }}
                  title="Delete this Feature Group"
                >
                  <Trash2 size={12} />
                  Delete
                </button>

                {deleteOpen && (
                  <div
                    className="absolute right-0 top-full mt-1.5 bg-white border border-gray-200 rounded-xl shadow-xl z-50 p-4"
                    style={{ width: 320 }}
                  >
                    <div className="flex gap-2.5 mb-3">
                      <AlertTriangle size={16} className="flex-shrink-0 mt-0.5 text-red-500" />
                      <div className="text-xs text-gray-700 leading-relaxed">
                        <p className="font-semibold text-red-600 mb-1">
                          Delete this Feature Group?
                        </p>
                        <p>This action is irreversible. Please confirm downstream impact before proceeding.</p>
                      </div>
                    </div>

                    {downstream.length > 0 && (
                      <div className="mb-3 p-2.5 rounded-lg bg-red-50 border border-red-100">
                        <p className="text-xs font-medium text-red-700 mb-1.5">
                          Downstream WideTable Dependencies ({downstream.length})
                        </p>
                        <ul className="space-y-1">
                          {downstream.map((wt) => (
                            <li
                              key={wt}
                              className="flex items-center gap-1.5 text-xs text-red-600"
                            >
                              <Database size={11} className="flex-shrink-0" />
                              <span className="font-mono">{wt}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {downstream.length === 0 && (
                      <p className="mb-3 text-xs text-gray-400 italic">
                        No known downstream dependencies.
                      </p>
                    )}

                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setDeleteOpen(false)}
                        className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onDeleteConfirm();
                          setDeleteOpen(false);
                        }}
                        className="px-3 py-1.5 text-xs rounded-lg text-white bg-red-500 hover:bg-red-600 transition-all font-medium"
                      >
                        Confirm Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          <p className="mt-2.5 text-sm text-gray-500 leading-relaxed line-clamp-2">
            {fg.description || <span className="italic text-gray-300">No description</span>}
          </p>

          {/* Meta — single flex-wrap row, overflows to next line naturally */}
          <div className="mt-4 pt-3.5 border-t border-gray-100">
            <div className="flex items-center flex-wrap gap-x-5 gap-y-2">
              <MetaItem icon={<MapPin size={13} />} label="Region"  value={fg.region} />
              <MetaItem icon={<Layers size={13} />} label="Module"  value={fg.module} />
              <div className="flex items-center gap-1.5">
                <span className="flex-shrink-0 text-gray-400"><User size={13} /></span>
                <span className="flex-shrink-0 text-gray-400 text-xs">Owner:</span>
                <div className="flex flex-wrap gap-1">
                  {fg.owner.split(",").map(o => (
                    <span
                      key={o}
                      className="inline-flex items-center px-2 py-0.5 rounded-md text-xs"
                      style={{
                        fontWeight: 600,
                        backgroundColor: "rgba(19,194,194,0.08)",
                        color: "#0e9494",
                        border: "1px solid rgba(19,194,194,0.18)",
                      }}
                    >
                      {o.trim()}
                    </span>
                  ))}
                </div>
              </div>
              <MetaItem icon={<Clock size={13} />} label="Updated" value={fg.updateTime} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Module Dir Popover ───────────────────────────────────────────────────────
function ModuleDirPopover({
  onClose, modules, setModules, fgList,
}: {
  onClose: () => void;
  modules: string[];
  setModules: React.Dispatch<React.SetStateAction<string[]>>;
  fgList: FeatureGroup[];
}) {
  const [deleteError, setDeleteError] = useState<{ module: string; fgs: string[] } | null>(null);
  const [addingNew, setAddingNew] = useState(false);
  const [newInput, setNewInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (addingNew && inputRef.current) inputRef.current.focus();
  }, [addingNew]);

  useEffect(() => { setDeleteError(null); }, [modules]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  function getFGsForModule(moduleName: string): string[] {
    return fgList
      .filter(fg => fg.module === moduleName && !fg.deleted)
      .map(fg => fg.name);
  }

  function handleDelete(mod: string) {
    const blocked = getFGsForModule(mod);
    if (blocked.length > 0) {
      setDeleteError({ module: mod, fgs: blocked });
      return;
    }
    setModules((prev) => prev.filter((m) => m !== mod));
  }

  function commitNew() {
    const name = newInput.trim();
    if (name && !modules.includes(name)) {
      setModules((prev) => [...prev, name]);
    }
    setNewInput("");
    setAddingNew(false);
  }

  function handleNewKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") commitNew();
    if (e.key === "Escape") { setNewInput(""); setAddingNew(false); }
  }

  return (
    <div
      ref={popoverRef}
      className="absolute right-0 top-full z-50 flex flex-col bg-white rounded-xl border border-gray-200"
      style={{
        marginTop: 8,
        width: 420,
        maxHeight: 480,
        boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)",
      }}
    >
      {/* Caret */}
      <div
        className="absolute bg-white border-l border-t border-gray-200"
        style={{ width: 10, height: 10, top: -6, right: 18, transform: "rotate(45deg)" }}
      />

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="w-1 h-3.5 rounded-full flex-shrink-0" style={{ backgroundColor: "#13c2c2" }} />
          <span style={{ fontWeight: 700, fontSize: 13, color: "#1a1a2e" }}>Module Directory</span>
          <span
            className="px-1.5 py-0.5 rounded-full text-xs"
            style={{ background: "#f3f4f6", color: "#6b7280", fontWeight: 500 }}
          >
            {modules.length}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-0.5 rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
        >
          <X size={13} />
        </button>
      </div>

      {/* Tags area */}
      <div className="overflow-y-auto px-4 py-3.5" style={{ flex: 1 }}>
        <div className="flex flex-wrap gap-1.5">
          {modules.map((mod) => {
            const isErrored = deleteError?.module === mod;
            return (
              <span
                key={mod}
                className="inline-flex items-center gap-1 pl-2.5 pr-1 py-0.5 rounded-md border text-xs transition-all"
                style={{
                  borderColor: isErrored ? "#fca5a5" : "#e5e7eb",
                  background: isErrored ? "#fff1f1" : "#fafafa",
                  color: isErrored ? "#dc2626" : "#374151",
                  fontWeight: 500,
                }}
              >
                {mod}
                <button
                  onClick={() => handleDelete(mod)}
                  className="inline-flex items-center justify-center w-3.5 h-3.5 rounded hover:bg-gray-200 transition-colors flex-shrink-0 ml-0.5"
                  style={{ color: isErrored ? "#dc2626" : "#9ca3af" }}
                >
                  <X size={9} />
                </button>
              </span>
            );
          })}

          {addingNew ? (
            <span
              className="inline-flex items-center pl-2 pr-1 py-0.5 rounded-md border border-dashed text-xs"
              style={{ borderColor: "#13c2c2", background: "#f0fdfa", minWidth: 110 }}
            >
              <input
                ref={inputRef}
                value={newInput}
                onChange={(e) => setNewInput(e.target.value)}
                onKeyDown={handleNewKeyDown}
                onBlur={commitNew}
                placeholder="Module name…"
                className="bg-transparent focus:outline-none text-xs"
                style={{ color: "#0e9494", width: 100, fontWeight: 500 }}
              />
            </span>
          ) : (
            <button
              onClick={() => setAddingNew(true)}
              className="inline-flex items-center gap-1 pl-2 pr-2.5 py-0.5 rounded-md border border-dashed text-xs transition-colors hover:border-[#13c2c2] hover:text-[#13c2c2] hover:bg-teal-50"
              style={{ borderColor: "#d1d5db", color: "#6b7280", fontWeight: 500 }}
            >
              <FilePlus size={11} />
              New Directory
            </button>
          )}
        </div>

        {deleteError && (
          <div
            className="mt-3 flex items-start gap-2 px-3 py-2.5 rounded-lg border"
            style={{ background: "#fff8f8", borderColor: "#fca5a5" }}
          >
            <AlertCircle size={12} className="flex-shrink-0 mt-px" style={{ color: "#dc2626" }} />
            <p className="text-xs leading-relaxed" style={{ color: "#b91c1c" }}>
              The following Feature Groups are still associated with this module:{" "}
              {deleteError.fgs.map((name, i) => (
                <span key={name}>
                  <span
                    className="px-1 py-0.5 rounded"
                    style={{ background: "rgba(220,38,38,0.08)", fontWeight: 700, fontFamily: "monospace" }}
                  >
                    {name}
                  </span>
                  {i < deleteError.fgs.length - 1 && (
                    <span className="mx-0.5">
                      {i === deleteError.fgs.length - 2 ? " and " : ", "}
                    </span>
                  )}
                </span>
              ))}
              . Remove or reassign them before deleting this module.
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-end px-4 py-3 border-t border-gray-100">
        <button
          onClick={onClose}
          className="px-4 py-1 text-xs rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
          style={{ fontWeight: 500 }}
        >
          Close
        </button>
      </div>
    </div>
  );
}