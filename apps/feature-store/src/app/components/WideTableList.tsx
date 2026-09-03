import { useState } from "react";
import { createPortal } from "react-dom";
import {
  ChevronRight,
  ChevronDown,
  Plus,
  RefreshCw,
  Settings2,
  X,
  Bug,
  Copy as CopyIcon,
} from "lucide-react";
import type { WideTableCanvasSnapshot } from "@/data/widetableCanvasModel";

// ─── Tooltip Cell ─────────────────────────────────────────────────────────────
function TooltipCell({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const [visible, setVisible] = useState(false);
  if (!text) return <span className="text-gray-300">—</span>;
  return (
    <div
      className={`relative inline-block max-w-full ${className}`}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      <span className="block truncate cursor-default">{text}</span>
      {visible && (
        <div className="absolute z-50 left-0 top-full mt-1.5 w-72 bg-gray-900 text-white text-xs leading-relaxed rounded-lg px-3 py-2.5 shadow-xl pointer-events-none">
          <div className="absolute -top-1.5 left-4 w-3 h-3 bg-gray-900 rotate-45 rounded-sm" />
          <span className="relative">{text}</span>
        </div>
      )}
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────
export type InstanceStatus =
  | "SUCCESS"
  | "FAILED"
  | "RUNNING"
  | "QUEUING"
  | "KILLED";

export interface Instance {
  id: string;
  status: InstanceStatus;
  notes: string;
  createTime: string;
  startTime: string;
  finishTime: string;
  duration: string;
  rowsCnt: string;
  columnsCnt: string;
}

export interface WideTableRow {
  id: string;
  name: string;
  region: string[];
  owners: string[];
  bizTeam: string;
  description: string;
  updateTime: string;
  instances: Instance[];
  /** Optional embedded canvas snapshot (else resolved by id in mock helpers) */
  canvasSnapshot?: WideTableCanvasSnapshot;
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<
  InstanceStatus,
  { label: string; bg: string; text: string; dot: string }
> = {
  SUCCESS: {
    label: "SUCCESS",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    dot: "bg-emerald-500",
  },
  FAILED: {
    label: "FAILED",
    bg: "bg-red-50",
    text: "text-red-600",
    dot: "bg-red-500",
  },
  RUNNING: {
    label: "RUNNING",
    bg: "bg-blue-50",
    text: "text-blue-600",
    dot: "bg-blue-500",
  },
  QUEUING: {
    label: "QUEUING",
    bg: "bg-amber-50",
    text: "text-amber-600",
    dot: "bg-amber-500",
  },
  KILLED: {
    label: "KILLED",
    bg: "bg-gray-100",
    text: "text-gray-500",
    dot: "bg-gray-400",
  },
};

function StatusBadge({ status }: { status: InstanceStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs ${cfg.bg} ${cfg.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ─── Region Tag ───────────────────────────────────────────────────────────────
function RegionTag({ region }: { region: string }) {
  return (
    <span className="inline-block px-2 py-0.5 text-xs bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-md">
      {region}
    </span>
  );
}

// ─── Action Button ────────────────────────────────────────────────────────────
function ActionBtn({
  label,
  variant = "default",
  disabled = false,
  onClick,
}: {
  label: string;
  variant?: "default" | "danger";
  disabled?: boolean;
  onClick?: () => void;
}) {
  const colors = {
    default: "text-teal-600 hover:text-teal-700",
    danger: "text-red-500 hover:text-red-600",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`text-xs px-1.5 py-0.5 transition-colors ${
        disabled
          ? "text-gray-300 cursor-not-allowed"
          : `${colors[variant]} cursor-pointer`
      }`}
    >
      {label}
    </button>
  );
}

// ─── Mock failure reason (auto-recorded server-side; client only fetches) ────
function mockFailureReason(inst: Instance): string {
  // Deterministic content seeded from instance id so re-clicks show same trace.
  const seed = inst.id;
  const baseHint = (inst.notes && inst.notes.trim()) || "Task failed";
  // Two flavors based on hash of id
  const flavor = seed.charCodeAt(seed.length - 1) % 2 === 0 ? "OOM" : "SQL";
  if (flavor === "OOM") {
    return [
      `[${inst.finishTime || inst.startTime || "—"}] FATAL  org.apache.spark.SparkException`,
      `  ${baseHint}`,
      "",
      "Caused by: java.lang.OutOfMemoryError: Java heap space",
      "  at org.apache.spark.sql.execution.aggregate.HashAggregateExec",
      "      .doExecute(HashAggregateExec.scala:189)",
      "  at org.apache.spark.sql.execution.SparkPlan.execute(SparkPlan.scala:182)",
      "  at org.apache.spark.scheduler.ResultTask.runTask(ResultTask.scala:90)",
      "",
      "Executor metrics:",
      "  executor.memoryUsed   = 14.8 GB / 15 GB",
      "  shuffle.bytesSpilled  = 8.2 GB",
      "  failed.stage          = stage 7 (aggregate by user_id)",
      "",
      "Suggested fix:",
      "  • Increase spark.executor.memory or reduce shuffle partitions",
      "  • Check skewed keys on user_id (top-50 skew detected)",
    ].join("\n");
  }
  return [
    `[${inst.finishTime || inst.startTime || "—"}] ERROR  com.featurestore.ingest.WideTableJob`,
    `  ${baseHint}`,
    "",
    "Caused by: org.apache.hive.service.cli.HiveSQLException:",
    "  Error while compiling statement: FAILED: SemanticException",
    "  [Error 10004]: Line 12:34 Invalid table alias or column reference 'eventt_time'",
    "",
    "SQL context:",
    "  SELECT user_id, eventt_time, score",
    "  FROM feature_store.frame_table",
    "  WHERE ds = '${ds}'",
    "                ^^^^^^^^^^^",
    "",
    "Suggested fix:",
    "  • Did you mean 'event_time'? (typo detected)",
    "  • Re-validate Frame Table schema before next run",
  ].join("\n");
}

// ─── Debug Panel (floating, top-right slide-in drawer) ───────────────────────
function DebugPanel({
  inst,
  onClose,
}: {
  inst: Instance;
  onClose: () => void;
}) {
  const reason = mockFailureReason(inst);
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard?.writeText(reason).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return createPortal(
    <div
      className="fixed top-20 right-6 z-[9999] w-[440px] max-h-[calc(100vh-6rem)] bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col animate-[slideIn_.18s_ease-out]"
      role="dialog"
      aria-label="Instance failure debug"
    >
      {/* Header */}
      <div className="flex items-start justify-between px-4 py-3 border-b border-gray-100 bg-red-50/60 rounded-t-xl">
        <div className="flex items-center gap-2 min-w-0">
          <Bug size={16} className="text-red-500 shrink-0" />
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wider text-red-600 font-semibold">
              Debug · Failure Reason
            </div>
            <div
              className="text-xs text-gray-700 font-mono truncate"
              title={inst.id}
            >
              {inst.id}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-md text-gray-500 hover:text-teal-600 hover:bg-white transition-colors"
            title="Copy to clipboard"
          >
            <CopyIcon size={14} />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-gray-500 hover:text-gray-800 hover:bg-white transition-colors"
            title="Close"
          >
            <X size={14} />
          </button>
        </div>
      </div>
      {/* Meta */}
      <div className="px-4 py-2 border-b border-gray-100 flex items-center gap-3 text-[11px] text-gray-500">
        <span>
          Finished:{" "}
          <span className="text-gray-700 font-mono">
            {inst.finishTime || "—"}
          </span>
        </span>
        <span className="text-gray-300">·</span>
        <span>
          Duration:{" "}
          <span className="text-gray-700 font-mono">
            {inst.duration || "—"}
          </span>
        </span>
        {copied && (
          <span className="ml-auto text-teal-600">Copied</span>
        )}
      </div>
      {/* Body */}
      <div className="flex-1 overflow-auto px-4 py-3">
        <pre className="text-[11px] leading-relaxed text-gray-800 font-mono whitespace-pre-wrap break-words">
          {reason}
        </pre>
      </div>
      {/* Footer hint */}
      <div className="px-4 py-2 border-t border-gray-100 text-[10px] text-gray-400">
        Auto-captured at task failure. Close manually to dismiss.
      </div>
    </div>,
    document.body
  );
}

// ─── Instance Sub-Row ─────────────────────────────────────────────────────────
function InstanceRow({
  inst,
  onView,
  onTask,
  onDebug,
}: {
  inst: Instance;
  onView?: () => void;
  onTask?: () => void;
  onDebug?: () => void;
}) {
  const canKill = inst.status === "RUNNING";
  const canDebug = inst.status === "FAILED";

  return (
    <tr className="group hover:bg-blue-50/30 transition-colors">
      <td className="pl-14 pr-3 py-3 text-xs text-blue-600 font-medium whitespace-nowrap">
        {inst.id}
      </td>
      <td className="px-3 py-3 whitespace-nowrap">
        <StatusBadge status={inst.status} />
      </td>
      <td className="px-3 py-3 text-xs text-gray-500 max-w-[160px]">
        <TooltipCell text={inst.notes} className="w-full" />
      </td>
      <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap">
        {inst.createTime}
      </td>
      <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap">
        {inst.startTime || <span className="text-gray-300">—</span>}
      </td>
      <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap">
        {inst.finishTime || <span className="text-gray-300">—</span>}
      </td>
      <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap">
        {inst.duration || <span className="text-gray-300">—</span>}
      </td>
      <td className="px-3 py-3 text-xs text-gray-700 text-right whitespace-nowrap">
        {inst.rowsCnt || <span className="text-gray-300">—</span>}
      </td>
      <td className="px-3 py-3 text-xs text-gray-700 text-right whitespace-nowrap">
        {inst.columnsCnt || <span className="text-gray-300">—</span>}
      </td>
      <td className="px-3 py-3 whitespace-nowrap">
        <div className="flex items-center gap-0.5">
          <ActionBtn label="View" onClick={onView} />
          <ActionBtn label="Kill" variant="danger" disabled={!canKill} />
          <ActionBtn label="Debug" onClick={onDebug} disabled={!canDebug} />
          <ActionBtn label="Task" onClick={onTask} />
        </div>
      </td>
    </tr>
  );
}

// ─── Main WideTable Row ───────────────────────────────────────────────────────
function WideTableRowComponent({
  row,
  isExpanded,
  onToggle,
  onEdit,
  onCopy,
  onClean,
  onView,
  onTask,
  onDebug,
  cleanConfig,
}: {
  row: WideTableRow;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit?: () => void;
  onCopy?: () => void;
  onClean?: () => void;
  onView?: (instanceId: string) => void;
  onTask?: (inst: Instance) => void;
  onDebug?: (inst: Instance) => void;
  cleanConfig: boolean;
}) {
  return (
    <>
      {/* Primary Row */}
      <tr
        className={`group cursor-pointer transition-colors ${isExpanded ? "bg-teal-50/60" : "hover:bg-gray-50"}`}
        onClick={onToggle}
      >
        <td className="pl-4 pr-3 py-4 w-10">
          <button
            className={`flex items-center justify-center w-6 h-6 rounded-md border transition-all ${
              isExpanded
                ? "bg-teal-500 border-teal-500 text-white"
                : "border-gray-300 text-gray-400 hover:border-teal-400 hover:text-teal-500"
            }`}
          >
            {isExpanded ? (
              <ChevronDown size={12} />
            ) : (
              <ChevronRight size={12} />
            )}
          </button>
        </td>

        <td className="px-3 py-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-800 font-medium">{row.name}</span>
          </div>
        </td>

        <td className="px-3 py-4">
          <div className="flex flex-wrap gap-1">
            {row.region.map((r) => (
              <RegionTag key={r} region={r} />
            ))}
          </div>
        </td>

        <td className="px-3 py-4">
          <div className="flex flex-col gap-0.5">
            {row.owners.map((o) => (
              <span
                key={o}
                className="text-xs text-gray-600 hover:text-teal-600 cursor-pointer transition-colors"
              >
                {o}
              </span>
            ))}
          </div>
        </td>

        <td className="px-3 py-4">
          <span className="inline-block px-2 py-0.5 text-xs bg-purple-50 text-purple-600 rounded-md border border-purple-100">
            {row.bizTeam}
          </span>
        </td>

        <td className="px-3 py-4 max-w-[180px]">
          <div className="text-xs text-gray-500">
            <TooltipCell text={row.description} className="w-full" />
          </div>
        </td>

        <td className="px-3 py-4 whitespace-nowrap">
          <span className="text-xs text-gray-500">{row.updateTime}</span>
        </td>

        <td className="px-3 py-4 whitespace-nowrap">
          <span className={`text-xs font-mono ${cleanConfig ? "text-teal-600" : "text-gray-400"}`}>
            {cleanConfig ? "TRUE" : "FALSE"}
          </span>
        </td>

        <td
          className="px-3 py-4 whitespace-nowrap"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-0.5 flex-wrap">
            <ActionBtn label="Edit" onClick={onEdit} />
            <ActionBtn label="Copy" onClick={onCopy} />
            <ActionBtn label="Clean" onClick={onClean} />
            <ActionBtn label="Delete" variant="danger" />
          </div>
        </td>
      </tr>

      {/* Expanded Sub-Table */}
      {isExpanded && (
        <tr>
          <td colSpan={9} className="p-0 bg-slate-50/80">
            <div className="ml-10 mr-4 my-2 rounded-lg border border-slate-200 overflow-hidden shadow-inner">
              {/* Sub-table header */}
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-100/80">
                    <th className="pl-14 pr-3 py-2.5 text-left text-xs text-slate-500 tracking-wide whitespace-nowrap">
                      INSTANCE ID
                    </th>
                    <th className="px-3 py-2.5 text-left text-xs text-slate-500 tracking-wide whitespace-nowrap">
                      STATUS
                    </th>
                    <th className="px-3 py-2.5 text-left text-xs text-slate-500 tracking-wide">
                      NOTES
                    </th>
                    <th className="px-3 py-2.5 text-left text-xs text-slate-500 tracking-wide whitespace-nowrap">
                      CREATE TIME
                    </th>
                    <th className="px-3 py-2.5 text-left text-xs text-slate-500 tracking-wide whitespace-nowrap">
                      START TIME
                    </th>
                    <th className="px-3 py-2.5 text-left text-xs text-slate-500 tracking-wide whitespace-nowrap">
                      FINISH TIME
                    </th>
                    <th className="px-3 py-2.5 text-left text-xs text-slate-500 tracking-wide whitespace-nowrap">
                      DURATION
                    </th>
                    <th className="px-3 py-2.5 text-right text-xs text-slate-500 tracking-wide whitespace-nowrap">
                      ROWS CNT
                    </th>
                    <th className="px-3 py-2.5 text-right text-xs text-slate-500 tracking-wide whitespace-nowrap">
                      COLS CNT
                    </th>
                    <th className="px-3 py-2.5 text-left text-xs text-slate-500 tracking-wide whitespace-nowrap">
                      ACTION
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {row.instances.length > 0 ? (
                    row.instances.map((inst) => (
                      <InstanceRow
                        key={inst.id}
                        inst={inst}
                        onView={onView ? () => onView(inst.id) : undefined}
                        onTask={onTask ? () => onTask(inst) : undefined}
                        onDebug={onDebug ? () => onDebug(inst) : undefined}
                      />
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={10}
                        className="py-6 text-center text-xs text-gray-400"
                      >
                        No instances found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
interface WideTableListProps {
  data: WideTableRow[];
  onAdd: () => void;
  onEdit?: (row: WideTableRow) => void;
  onCopy?: (row: WideTableRow) => void;
  onClean?: (row: WideTableRow) => void;
  onView?: (row: WideTableRow, instanceId: string) => void;
  onTask?: (row: WideTableRow, inst: Instance) => void;
  ownedByMe?: boolean;
  onOwnedByMeChange?: (v: boolean) => void;
  cleanTaskStatusById?: Record<string, string>;
}

export function WideTableList({
  data,
  onAdd,
  onEdit,
  onCopy,
  onClean,
  onView,
  onTask,
  ownedByMe = false,
  onOwnedByMeChange,
  cleanTaskStatusById = {},
}: WideTableListProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [debugInstance, setDebugInstance] = useState<Instance | null>(null);

  const toggle = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 bg-teal-500 rounded-full" />
          <span className="text-sm text-gray-700">
            WideTable List
            <span className="ml-2 text-xs text-gray-400">
              ({data.length} items)
            </span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Owned by me toggle */}
          <button
            onClick={() => onOwnedByMeChange?.(!ownedByMe)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-all select-none ${
              ownedByMe
                ? "bg-teal-50 border-teal-300 text-teal-700"
                : "bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            <span
              className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-all ${
                ownedByMe ? "bg-teal-500 border-teal-500" : "border-gray-300 bg-white"
              }`}
            >
              {ownedByMe && (
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                  <path d="M1.5 4L3.2 5.8L6.5 2.2" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
            Owned by me
          </button>
          <button
            title="Refresh"
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
          >
            <RefreshCw size={15} />
          </button>
          <button
            title="Column Settings"
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
          >
            <Settings2 size={15} />
          </button>
          <button
            onClick={onAdd}
            className="flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-teal-500 rounded-lg hover:bg-teal-600 transition-all shadow-sm shadow-teal-200"
          >
            <Plus size={14} />
            Add WideTable
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="w-10 pl-4 pr-3 py-3" />
              <th className="px-3 py-3 text-left text-xs text-gray-500 tracking-wide whitespace-nowrap">
                WIDETABLE NAME
              </th>
              <th className="px-3 py-3 text-left text-xs text-gray-500 tracking-wide">
                REGION
              </th>
              <th className="px-3 py-3 text-left text-xs text-gray-500 tracking-wide">
                OWNER
              </th>
              <th className="px-3 py-3 text-left text-xs text-gray-500 tracking-wide whitespace-nowrap">
                BIZ TEAM
              </th>
              <th className="px-3 py-3 text-left text-xs text-gray-500 tracking-wide">
                DESCRIPTION
              </th>
              <th className="px-3 py-3 text-left text-xs text-gray-500 tracking-wide whitespace-nowrap">
                UPDATE TIME
              </th>
              <th className="px-3 py-3 text-left text-xs text-gray-500 tracking-wide whitespace-nowrap">
                CLEAN CONFIG
              </th>
              <th className="px-3 py-3 text-left text-xs text-gray-500 tracking-wide">
                ACTION
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data.map((row) => (
              <WideTableRowComponent
                key={row.id}
                row={row}
                isExpanded={expandedIds.has(row.id)}
                onToggle={() => toggle(row.id)}
                onEdit={onEdit ? () => onEdit(row) : undefined}
                onCopy={onCopy ? () => onCopy(row) : undefined}
                onClean={onClean ? () => onClean(row) : undefined}
                onView={onView ? (instId) => onView(row, instId) : undefined}
                onTask={onTask ? (inst) => onTask(row, inst) : undefined}
                onDebug={(inst) => setDebugInstance(inst)}
                cleanConfig={cleanTaskStatusById[row.id] === "SUCCESS"}
              />
            ))}
          </tbody>
        </table>
      </div>
      {debugInstance && (
        <DebugPanel
          inst={debugInstance}
          onClose={() => setDebugInstance(null)}
        />
      )}
    </div>
  );
}