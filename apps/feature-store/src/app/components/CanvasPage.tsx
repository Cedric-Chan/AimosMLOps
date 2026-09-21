import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  ArrowLeft, Pencil, ChevronDown, History, Zap, Square,
  AlertCircle, X, Database, Layers, Minus, Plus,
  Maximize2, RotateCcw, GitBranch, Search, Eye,
  Copy, Check, Settings, Info, MousePointer2, Hand, LayoutGrid,
} from "lucide-react";
import { WideTableFormValues } from "./AddWideTableModal";
import { WideTableRow, Instance, InstanceStatus } from "./WideTableList";
import { WideTableMetaModal } from "./WideTableMetaModal";
import { TriggerInstanceModal } from "./TriggerInstanceModal";
import type { NodeDef, NodeId, NodeParam, CanvasEdge } from "@/data/widetableCanvasModel";
import {
  canvasBounds,
  createDefaultCanvasSnapshot,
  fgGridCols,
  fgGridPosition,
  SINK_GAP_X,
  SOURCE_X,
  type DataIngestionConfigSnapshot,
  type FeatureGroupNodeSnapshot,
  type FrameTableSnapshot,
  type WideTableCanvasSnapshot,
} from "@/data/widetableCanvasModel";
import {
  getHiveProjectSchemaNames,
  getHiveProjectTablesForSchema,
} from "@/data/hiveProjectTables";
import { FG_CATALOG, JOIN_TYPES } from "@/data/featureGroupCatalog";

const HIVE_ALLOWLIST_HINT =
  "Only Hive tables on the project allowlist are listed. Contact the platform team if you need access.";

export type NodeStatus = "waiting" | "cache_skipped" | "running" | "failed" | "success";

// ─── Style maps ───────────────────────────────────────────────────────────────
const TYPE_STYLES: Record<NodeDef["type"], { accent: string; iconBg: string; iconColor: string }> = {
  source:  { accent: "border-l-teal-400",  iconBg: "bg-teal-50",   iconColor: "text-teal-600"   },
  feature: { accent: "border-l-blue-400",  iconBg: "bg-blue-50",   iconColor: "text-blue-600"   },
  sink:    { accent: "border-l-amber-400", iconBg: "bg-amber-50",  iconColor: "text-amber-600"  },
  end:     { accent: "border-l-gray-400",  iconBg: "bg-orange-50", iconColor: "text-orange-500" },
};

const STATUS_STYLES: Record<NodeStatus, { accent: string; iconBg: string; iconColor: string; label: string; badge: string; badgeText: string; dot: string }> = {
  waiting:       { accent: "border-l-gray-300",    iconBg: "bg-gray-50",    iconColor: "text-gray-400",   label: "Waiting",  badge: "bg-gray-100",    badgeText: "text-gray-500",    dot: "bg-gray-400"    },
  cache_skipped: { accent: "border-l-yellow-400",  iconBg: "bg-yellow-50",  iconColor: "text-yellow-600", label: "Cached",   badge: "bg-yellow-100",  badgeText: "text-yellow-700",  dot: "bg-yellow-400"  },
  running:       { accent: "border-l-blue-500",    iconBg: "bg-blue-50",    iconColor: "text-blue-600",   label: "Running",  badge: "bg-blue-100",    badgeText: "text-blue-700",    dot: "bg-blue-500"    },
  failed:        { accent: "border-l-red-400",     iconBg: "bg-red-50",     iconColor: "text-red-500",    label: "Failed",   badge: "bg-red-100",     badgeText: "text-red-600",     dot: "bg-red-500"     },
  success:       { accent: "border-l-emerald-400", iconBg: "bg-emerald-50", iconColor: "text-emerald-600",label: "Success",  badge: "bg-emerald-100", badgeText: "text-emerald-700", dot: "bg-emerald-500" },
};

const EDGE_COLORS: Record<NodeStatus, string> = {
  success: "#22c55e", running: "#3b82f6", cache_skipped: "#f59e0b",
  failed: "#ef4444",  waiting: "#9ca3af",
};

/**
 * Per-node execution status. WideTables fan in an arbitrary number of Feature Groups, so
 * status is derived from graph shape: the frame table is the entry, Feature Groups report
 * as one fan-in stage, and the sink closes the run. A FAILED instance therefore parks the
 * failure on the stage that stopped the run.
 */
function getMockNodeStatuses(
  s: InstanceStatus,
  nodes: NodeDef[]
): Record<NodeId, NodeStatus> {
  const out: Record<NodeId, NodeStatus> = {};
  const paint = (type: NodeDef["type"], status: NodeStatus) =>
    nodes.filter((n) => n.type === type).forEach((n) => (out[n.id] = status));

  switch (s) {
    case "SUCCESS":
      paint("source", "success");
      paint("feature", "success");
      paint("sink", "success");
      break;
    case "RUNNING":
      paint("source", "success");
      // Fan-in stage mid-flight: first Feature Group cached, the rest still running.
      nodes
        .filter((n) => n.type === "feature")
        .forEach((n, i) => (out[n.id] = i === 0 ? "cache_skipped" : "running"));
      paint("sink", "waiting");
      break;
    case "KILLED":
      paint("source", "cache_skipped");
      nodes
        .filter((n) => n.type === "feature")
        .forEach((n, i) => (out[n.id] = i === 0 ? "failed" : "waiting"));
      paint("sink", "waiting");
      break;
    case "QUEUING":
      paint("source", "waiting");
      paint("feature", "waiting");
      paint("sink", "waiting");
      break;
    case "FAILED":
      // The failing stage is the sink: its upstream Feature Groups all had to succeed first.
      paint("source", "success");
      paint("feature", "success");
      paint("sink", "failed");
      break;
  }
  return out;
}

/** Rolled-up progress for the instance strip. */
function getRunProgress(nodeStatuses: Record<NodeId, NodeStatus>) {
  const all = Object.values(nodeStatuses);
  const done = all.filter((s) => s === "success" || s === "cache_skipped").length;
  return {
    done,
    total: all.length,
    failed: all.filter((s) => s === "failed").length,
  };
}

// ─── InstanceStatusBadge ──────────────────────────────────────────────────────
function InstanceStatusBadge({ status, small }: { status: InstanceStatus; small?: boolean }) {
  const cfg: Record<InstanceStatus, { bg: string; text: string; dot: string }> = {
    SUCCESS: { bg: "bg-emerald-50",  text: "text-emerald-700", dot: "bg-emerald-500" },
    FAILED:  { bg: "bg-red-50",      text: "text-red-600",     dot: "bg-red-500"     },
    RUNNING: { bg: "bg-blue-50",     text: "text-blue-600",    dot: "bg-blue-500"    },
    QUEUING: { bg: "bg-amber-50",    text: "text-amber-600",   dot: "bg-amber-500"   },
    KILLED:  { bg: "bg-gray-100",    text: "text-gray-500",    dot: "bg-gray-400"    },
  };
  const c = cfg[status];
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full ${small ? "gap-1" : "gap-1.5 px-2"} ${c.bg} ${c.text}`}
      style={{ fontSize: small ? 10 : undefined }}>
      <span className={`rounded-full shrink-0 ${small ? "w-1 h-1" : "w-1.5 h-1.5"} ${c.dot}`} />{status}
    </span>
  );
}

// ─── Connection ports ─────────────────────────────────────────────────────────
/**
 * Invisible-at-rest connection ports, revealed on node hover — the production canvas
 * style. Purely an affordance here: connections are derived from the DAG, not hand-drawn.
 */
function NodePort({ side, terminal }: { side: "in" | "out"; terminal?: boolean }) {
  return (
    <span
      aria-hidden
      className={`absolute top-1/2 -translate-y-1/2 w-2 h-4 rounded-full bg-blue-500/70 opacity-0
        group-hover/node:opacity-100 transition-opacity
        ${side === "in" ? "-left-1.5" : "-right-1.5"}
        ${terminal ? "hidden" : ""}`}
    />
  );
}

// ─── Draggable pipeline node card ─────────────────────────────────────────────
export function PipelineNodeCard({
  node, selected, instanceView, nodeStatus, ports = true,
  onDragStart, onClick,
}: {
  node: NodeDef; selected: boolean; instanceView: boolean;
  nodeStatus?: NodeStatus;
  /** Instance View hides ports: the DAG is frozen and read-only. */
  ports?: boolean;
  onDragStart: (e: React.MouseEvent) => void;
  onClick: () => void;
}) {
  const ts = TYPE_STYLES[node.type];
  const ss = nodeStatus ? STATUS_STYLES[nodeStatus] : null;
  const accent  = instanceView && ss ? ss.accent  : ts.accent;
  const iconBg  = instanceView && ss ? ss.iconBg  : ts.iconBg;
  const iconCol = instanceView && ss ? ss.iconColor : ts.iconColor;
  const Icon =
    node.type === "source" ? Database
    : node.type === "feature" ? Layers
    : Database;

  return (
    <div
      className={`group/node absolute bg-white rounded-xl border border-gray-200 border-l-4
        ${accent}
        ${selected ? "ring-2 ring-teal-400 ring-offset-2 shadow-xl z-10" : "shadow-sm hover:shadow-md z-0"}
        ${instanceView ? "" : "cursor-grab active:cursor-grabbing"}`}
      style={{ left: node.x, top: node.y, width: node.w, height: node.h, userSelect: "none" }}
      onMouseDown={onDragStart}
      onClick={onClick}
    >
      {ports && <NodePort side="in" terminal={node.type === "source"} />}
      {ports && <NodePort side="out" terminal={node.type === "sink"} />}

      <div className="flex items-start px-3 pt-2.5 gap-2.5">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>
          <Icon size={14} className={iconCol} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs text-gray-800 truncate leading-snug uppercase" title={node.title}>
            {node.title}
          </div>
          <div className="text-xs text-gray-400 mt-0.5 truncate">{node.subtitle}</div>
        </div>
        {instanceView && ss && (
          <span className={`inline-flex items-center gap-1 shrink-0 mt-0.5 text-xs px-1.5 py-px rounded ${ss.badge} ${ss.badgeText}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${ss.dot}`} />{ss.label}
          </span>
        )}
      </div>

      {node.params && node.params.length > 0 && (
        <div className="px-3 pb-2 pt-1.5 space-y-0.5">
          {node.params.map((p) => (
            <div
              key={p.label}
              className="flex items-center gap-1 rounded-md bg-slate-50 px-1.5 py-0.5 text-xs"
              title={`${p.label}: ${p.value}`}
            >
              <span className="text-gray-400 shrink-0">{p.label}:</span>
              <span className="text-gray-600 truncate">{p.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── SVG Edges ────────────────────────────────────────────────────────────────
export function CanvasEdges({
  nodes, edges, instanceView, nodeStatuses,
}: {
  nodes: NodeDef[]; edges: CanvasEdge[]; instanceView: boolean; nodeStatuses?: Record<NodeId, NodeStatus>;
}) {
  const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]));
  const edgeColor = (fromId: NodeId) => {
    if (instanceView && nodeStatuses) return EDGE_COLORS[nodeStatuses[fromId]] ?? "#9ca3af";
    return "#9ca3af";
  };
  const markerKey = (col: string) =>
    col === "#22c55e" ? "green" : col === "#3b82f6" ? "blue" : col === "#f59e0b" ? "amber" : col === "#ef4444" ? "red" : "gray";

  const bounds = canvasBounds(nodes);
  // Anchor edges on the 8px grid so they never drift when node heights change.
  const x1 = bounds.minX;
  const y1 = bounds.minY;

  return (
    <svg
      style={{ position: "absolute", left: x1, top: y1, pointerEvents: "none", overflow: "visible" }}
      width={bounds.w} height={bounds.h}
    >
      <defs>
        {(["gray","green","blue","amber","red"] as const).map(k => {
          const c = { gray:"#9ca3af", green:"#22c55e", blue:"#3b82f6", amber:"#f59e0b", red:"#ef4444" }[k];
          return (
            <marker key={k} id={`arr-${k}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto">
              <path d="M0,1.5 L8,5 L0,8.5 L2.5,5 Z" fill={c} />
            </marker>
          );
        })}
      </defs>
      {edges.map(([fId, tId]) => {
        const f = nodeMap[fId]; const t = nodeMap[tId];
        if (!f || !t) return null;
        const ax = f.x + f.w - x1, ay = f.y + f.h / 2 - y1;
        const bx = t.x - x1,        by = t.y + t.h / 2 - y1;
        const mx = (ax + bx) / 2;
        const col = edgeColor(fId);
        return (
          <path key={`${fId}-${tId}`}
            d={`M${ax},${ay} C${mx},${ay} ${mx},${by} ${bx},${by}`}
            fill="none" stroke={col} strokeWidth="1.5"
            markerEnd={`url(#arr-${markerKey(col)})`}
          />
        );
      })}
    </svg>
  );
}

// ─── Minimap ──────────────────────────────────────────────────────────────────
const MM_W = 118; const MM_H = 72;

export function Minimap({
  nodes, edges, pan, zoom, cw, ch,
}: {
  nodes: NodeDef[]; edges: CanvasEdge[];
  pan: { x: number; y: number }; zoom: number; cw: number; ch: number;
}) {
  const b = canvasBounds(nodes);
  const pad = 40;
  const worldW = Math.max(1, b.w + pad * 2);
  const worldH = Math.max(1, b.h + pad * 2);
  // Keep the overview square-scaled, the way React Flow's minimap does.
  const s = Math.min(MM_W / worldW, MM_H / worldH);
  const offX = (MM_W - worldW * s) / 2 - (b.minX - pad) * s;
  const offY = (MM_H - worldH * s) / 2 - (b.minY - pad) * s;

  const vpX = (-pan.x) / zoom; const vpY = (-pan.y) / zoom;
  const vpW = cw / zoom;       const vpH = ch / zoom;
  const tc: Record<NodeDef["type"], string> = { source: "#2dd4bf", feature: "#60a5fa", sink: "#fbbf24", end: "#9ca3af" };

  const nodeMap = Object.fromEntries(nodes.map((n) => [n.id, n]));

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm" style={{ padding: 8 }}>
      <div className="text-xs text-gray-400 mb-1.5 tracking-wide" style={{ fontSize: 10 }}>OVERVIEW</div>
      <svg width={MM_W} height={MM_H} style={{ display: "block" }}>
        <rect width={MM_W} height={MM_H} fill="#f8fafc" rx="4" />
        {edges.map(([fId, tId]) => {
          const f = nodeMap[fId]; const t = nodeMap[tId];
          if (!f || !t) return null;
          const ax = (f.x + f.w) * s + offX, ay = (f.y + f.h / 2) * s + offY;
          const bx = t.x * s + offX,          by = (t.y + t.h / 2) * s + offY;
          return (
            <path key={`${fId}-${tId}`}
              d={`M${ax},${ay} C${(ax+bx)/2},${ay} ${(ax+bx)/2},${by} ${bx},${by}`}
              fill="none" stroke="#d1d5db" strokeWidth="0.8" />
          );
        })}
        {nodes.map(n => (
          <rect key={n.id} x={n.x * s + offX} y={n.y * s + offY}
            width={Math.max(2, n.w * s)} height={Math.max(2, n.h * s)} rx="2"
            fill={tc[n.type]} opacity="0.7" />
        ))}
        <rect x={vpX * s + offX} y={vpY * s + offY}
          width={Math.max(8, vpW * s)} height={Math.max(8, vpH * s)}
          fill="rgba(99,102,241,0.08)" stroke="#6366f1" strokeWidth="1" rx="2" />
      </svg>
    </div>
  );
}

// ─── Zoom Controls ────────────────────────────────────────────────────────────
export function ZoomControls({ zoom, onZoom, onFit }: { zoom: number; onZoom: (d: number) => void; onFit: () => void }) {
  return (
    <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg shadow-sm px-1.5 py-1">
      <button onClick={() => onZoom(-0.1)} title="Zoom out" className="p-1 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded transition-all"><Minus size={12} /></button>
      <span className="text-xs text-gray-600 w-9 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
      <button onClick={() => onZoom(+0.1)} title="Zoom in" className="p-1 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded transition-all"><Plus size={12} /></button>
      <div className="w-px h-3.5 bg-gray-200 mx-0.5" />
      <button onClick={onFit} title="Fit to screen" className="p-1 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded transition-all"><Maximize2 size={12} /></button>
    </div>
  );
}

// ─── Canvas tool modes ────────────────────────────────────────────────────────
export type CanvasTool = "select" | "pan";

/**
 * Pointer-mode toggle plus Auto Layout. Drag-to-move nodes is only honest in Select mode,
 * which is why the mode is an explicit control rather than a hidden modifier.
 */
export function CanvasToolbar({
  tool, onTool, onAutoLayout, editable,
}: {
  tool: CanvasTool;
  onTool: (t: CanvasTool) => void;
  onAutoLayout: () => void;
  /** Instance View is read-only: repositioning the graph is not offered. */
  editable: boolean;
}) {
  const btn =
    "p-1.5 rounded-md transition-all flex items-center justify-center";
  const idle = "text-gray-500 hover:text-gray-800 hover:bg-gray-100";
  const active = "bg-teal-50 text-teal-600";

  return (
    <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg shadow-sm px-1.5 py-1">
      <button
        onClick={() => onTool("select")}
        title="Select — drag nodes to reposition"
        aria-pressed={tool === "select"}
        className={`${btn} ${tool === "select" ? active : idle}`}
      >
        <MousePointer2 size={13} />
      </button>
      <button
        onClick={() => onTool("pan")}
        title="Pan — drag the canvas"
        aria-pressed={tool === "pan"}
        className={`${btn} ${tool === "pan" ? active : idle}`}
      >
        <Hand size={13} />
      </button>
      {editable && (
        <>
          <div className="w-px h-3.5 bg-gray-200 mx-0.5" />
          <button onClick={onAutoLayout} title="Auto layout — tidy the graph" className={`${btn} ${idle}`}>
            <LayoutGrid size={13} />
          </button>
        </>
      )}
    </div>
  );
}

// ─── Drawer tabs (Config | Last Instance) ─────────────────────────────────────
/**
 * Node drawers split config from the most recent run, per the WideTable canvas spec.
 * Last Instance is empty on a never-run table (Current Config), which is the honest answer
 * rather than inventing a run.
 */
function DrawerTabs({
  tab, onTab, showLastInstance,
}: {
  tab: "config" | "last-instance";
  onTab: (t: "config" | "last-instance") => void;
  showLastInstance: boolean;
}) {
  if (!showLastInstance) return null;
  const item = (t: typeof tab, label: string) => (
    <button
      type="button"
      onClick={() => onTab(t)}
      className={`flex-1 py-1.5 text-xs rounded-lg transition-all ${
        tab === t ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"
      }`}
    >
      {label}
    </button>
  );
  return (
    <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-0.5">
      {item("config", "Config")}
      {item("last-instance", "Last Instance")}
    </div>
  );
}

/** Read-only `label / value` block used by the Last Instance tab. */
function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-500 shrink-0">{label}</span>
      <span className="text-xs text-gray-700 font-mono text-right break-all">{value}</span>
    </div>
  );
}

// ─── Right Config Panel ─────────────────────────────────────────────────────────
function PanelSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-gray-400 tracking-widest mb-2">{title}</div>
      <div className="flex flex-col gap-0">{children}</div>
    </div>
  );
}
function PanelRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-xs text-gray-700 font-mono">{value}</span>
    </div>
  );
}

// ─── Clipboard + read-only field ──────────────────────────────────────────────
function copyToClipboard(text: string, onDone: () => void) {
  void navigator.clipboard.writeText(text).then(() => onDone());
}

function ReadonlyCopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => { if (!copied) return; const t = setTimeout(() => setCopied(false), 1600); return () => clearTimeout(t); }, [copied]);
  return (
    <div>
      <div className="text-xs text-gray-500 mb-1.5">{label}</div>
      <div className="flex items-start gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
        <span className="flex-1 text-xs font-mono text-gray-600 break-all leading-relaxed">{value}</span>
        <button
          type="button"
          title="Copy"
          onClick={() => copyToClipboard(value, () => setCopied(true))}
          className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-teal-600 hover:bg-teal-50 border border-transparent hover:border-teal-100 transition-all"
        >
          {copied ? <Check size={14} className="text-teal-500" /> : <Copy size={14} />}
        </button>
      </div>
    </div>
  );
}

// ─── Data Ingestion (read-only paths; cleaning is configured on the list page) ─
function DataIngestionMergedPanel({
  onClose,
  ingestionConfig,
  dataCleaningEnabled,
  instance,
  nodeStatus,
}: {
  onClose: () => void;
  ingestionConfig?: DataIngestionConfigSnapshot;
  dataCleaningEnabled: boolean;
  /** Present only in Instance View; drives the Last Instance tab. */
  instance?: Instance | null;
  nodeStatus?: NodeStatus;
}) {
  const rawTable = ingestionConfig?.rawTable ?? "feature_store.dwd_wide_raw_feat_v1";
  const rawS3 =
    ingestionConfig?.rawS3 ?? "s3://data-lake-prod/widetable/reports/ts_demo/20240315/raw_stats.json";
  const cleanedTable =
    ingestionConfig?.cleanedTable ?? "feature_store.dwd_wide_clean_feat_v1";
  const cleanedReportPath =
    ingestionConfig?.cleanedReportPath ??
    "s3://data-lake-prod/widetable/reports/ts_demo/20240315/clean_stats.json";

  const [tab, setTab] = useState<"config" | "last-instance">("config");
  // Spec: Last Instance is empty under Current Config — there is no run to report.
  const showLastInstance = Boolean(instance);

  return (
    <div className="w-80 shrink-0 bg-white border-l border-gray-100 flex flex-col h-full overflow-hidden">
      <div className="px-4 pt-3 pb-3 border-b border-gray-100 bg-amber-50/50">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-amber-100">
              <Database size={15} className="text-amber-700" />
            </div>
            <div className="min-w-0">
              <div className="text-sm text-gray-800">Data Ingestion</div>
              <div className="text-xs text-gray-400">Wide table ingestion</div>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-gray-300 hover:text-gray-500 shrink-0 mt-0.5">
            <X size={13} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
        <DrawerTabs tab={tab} onTab={setTab} showLastInstance={showLastInstance} />

        {tab === "config" ? (
          <>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              Configure data cleaning from the WideTable list (<span className="text-gray-500">Data Cleaning</span>).
            </p>
            <div className="rounded-xl border border-gray-200 bg-slate-100/70 p-3 space-y-3">
              <p className="text-xs font-medium text-gray-500 tracking-wide">Output paths</p>
              <ReadonlyCopyRow label="Raw Data Result" value={rawTable} />
              {dataCleaningEnabled && <ReadonlyCopyRow label="Cleaned Data Result" value={cleanedTable} />}
              <ReadonlyCopyRow label="Data Report path" value={rawS3} />
              {dataCleaningEnabled && <ReadonlyCopyRow label="Cleaned Data Report path" value={cleanedReportPath} />}
            </div>
          </>
        ) : (
          instance && (
            <>
              <div className="flex items-center gap-2">
                <InstanceStatusBadge status={instance.status} />
                {nodeStatus && (
                  <span className={`text-xs px-1.5 py-px rounded ${STATUS_STYLES[nodeStatus].badge} ${STATUS_STYLES[nodeStatus].badgeText}`}>
                    node · {STATUS_STYLES[nodeStatus].label}
                  </span>
                )}
              </div>
              <div className="rounded-xl border border-gray-200 bg-slate-100/70 p-3">
                <p className="text-xs font-medium text-gray-500 tracking-wide mb-2">Last Instance</p>
                <StatRow label="Instance ID" value={instance.id} />
                <StatRow label="Start" value={instance.startTime || "—"} />
                <StatRow label="Finish" value={instance.finishTime || "—"} />
                <StatRow label="Duration" value={instance.duration || "—"} />
                <StatRow label="Raw Data Table" value={rawTable} />
                <StatRow label="Rows cnt" value={instance.rowsCnt || "—"} />
                <StatRow label="Columns cnt" value={instance.columnsCnt || "—"} />
              </div>
            </>
          )
        )}
      </div>
      <div className="px-4 py-2 border-t border-gray-50">
        <span className="text-xs text-gray-400">Node · Data Ingestion config</span>
      </div>
    </div>
  );
}

// ─── Frame Table Panel helpers ────────────────────────────────────────────────
const FT_COLUMNS = [
  { name: "user_id",    type: "BIGINT"    },
  { name: "event_time", type: "TIMESTAMP" },
  { name: "order_id",   type: "BIGINT"    },
  { name: "product_id", type: "STRING"    },
  { name: "amount",     type: "DOUBLE"    },
  { name: "category",   type: "STRING"    },
  { name: "country",    type: "STRING"    },
  { name: "ds",         type: "STRING"    },
];
const COL_TYPE_BADGE: Record<string, string> = {
  BIGINT:    "bg-gray-100 text-gray-500",
  INT:       "bg-gray-100 text-gray-500",
  TIMESTAMP: "bg-gray-100 text-gray-500",
  STRING:    "bg-gray-100 text-gray-500",
  DOUBLE:    "bg-gray-100 text-gray-500",
  BOOLEAN:   "bg-gray-100 text-gray-500",
};
type ParseState = "idle" | "parsing" | "ready" | "error";
interface ParsedCol { name: string; type: string; }

function mockHiveColumns(schema: string, table: string): ParsedCol[] {
  const key = `${schema}.${table}`.toLowerCase();
  if (key.includes("order") || key.includes("frame") || key.includes("event")) {
    return [
      { name: "user_id",    type: "BIGINT"    },
      { name: "event_time", type: "TIMESTAMP" },
      { name: "order_id",   type: "BIGINT"    },
      { name: "product_id", type: "STRING"    },
      { name: "amount",     type: "DOUBLE"    },
      { name: "category",   type: "STRING"    },
      { name: "country",    type: "STRING"    },
      { name: "ds",         type: "STRING"    },
    ];
  }
  return [
    { name: "id",         type: "BIGINT"    },
    { name: "created_at", type: "TIMESTAMP" },
    { name: "value",      type: "DOUBLE"    },
    { name: "label",      type: "STRING"    },
    { name: "ds",         type: "STRING"    },
  ];
}

function parseSQLColumns(sql: string): { cols: ParsedCol[]; error: string | null } {
  const s = sql.trim();
  if (!s) return { cols: [], error: null };
  if (/SELECT\s+\*/i.test(s))
    return { cols: [], error: "SELECT * is not allowed. Please specify column names explicitly." };
  if (!/^\s*SELECT\s/i.test(s))
    return { cols: [], error: "SQL must start with SELECT." };
  if (!/\bFROM\b/i.test(s))
    return { cols: [], error: "Missing FROM clause." };
  const m = s.match(/SELECT\s+([\s\S]+?)\s+FROM[\s\n(]/i);
  if (!m) return { cols: [], error: "Cannot parse SELECT clause." };
  const FT_LOOKUP: Record<string, string> = {
    user_id: "BIGINT", event_time: "TIMESTAMP", order_id: "BIGINT",
    product_id: "STRING", amount: "DOUBLE", category: "STRING", country: "STRING", ds: "STRING",
    id: "BIGINT", created_at: "TIMESTAMP", value: "DOUBLE", label: "STRING",
  };
  const cols: ParsedCol[] = m[1].split(",").flatMap(raw => {
    const p = raw.trim();
    const asM = p.match(/\bAS\s+`?(\w+)`?\s*$/i);
    let name: string;
    if (asM) { name = asM[1].toLowerCase(); }
    else { const dotM = p.match(/\.(\w+)\s*$/); name = dotM ? dotM[1].toLowerCase() : p.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase(); }
    return name ? [{ name, type: FT_LOOKUP[name] ?? "STRING" }] : [];
  });
  if (cols.length === 0) return { cols: [], error: "No valid columns found in SELECT clause." };
  return { cols, error: null };
}

function highlightSQL(raw: string): string {
  const esc = raw.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  const kw = "SELECT|FROM|WHERE|JOIN|LEFT|RIGHT|INNER|OUTER|FULL|CROSS|ON|AND|OR|NOT|IN|AS|GROUP\\s+BY|ORDER\\s+BY|LIMIT|HAVING|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|UNION|ALL|DISTINCT|WITH|BY|SET|INTO|VALUES|TABLE|NULL|TRUE|FALSE|CASE|WHEN|THEN|ELSE|END|IS|BETWEEN|LIKE|EXISTS|COUNT|SUM|AVG|MAX|MIN|CAST|COALESCE";
  return esc
    .replace(/'([^']*)'/g, `<span style="color:#b45309">'$1'</span>`)
    .replace(new RegExp(`\\b(${kw})\\b`,"gi"), `<span style="color:#3b82f6;font-weight:600">$1</span>`)
    .replace(/\b(\d+\.?\d*)\b/g, `<span style="color:#059669">$1</span>`)
    .replace(/--.*/g, `<span style="color:#9ca3af;font-style:italic">$&</span>`);
}
function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <div className="text-xs text-gray-600 mb-1.5 flex items-center gap-1">
      {children}{required && <span className="text-red-400">*</span>}
    </div>
  );
}

// ─── Frame Table Panel ────────────────────────────────────────────────────────
function FrameTablePanel({
  onClose,
  initialFrame,
}: {
  onClose: () => void;
  initialFrame?: FrameTableSnapshot;
}) {
  const [sourceType, setSourceType] = useState<"hive" | "sql">(
    () => initialFrame?.sourceType ?? "hive"
  );
  const [dataServer, setDataServer] = useState(() => initialFrame?.dataServer ?? "reg_sg");
  const [tableSchema, setTableSchema] = useState(() => initialFrame?.tableSchema ?? "");
  const [tableName, setTableName] = useState(() => initialFrame?.tableName ?? "");
  const [sql, setSql] = useState(() => initialFrame?.sql ?? "");
  const [colSearch, setColSearch] = useState("");
  const [parsedCols, setParsedCols] = useState<ParsedCol[]>([]);
  const [parseState, setParseState] = useState<ParseState>("idle");
  const [parseError, setParseError] = useState<string | null>(null);
  const [selectedCols, setSelectedCols] = useState<Set<string>>(new Set());
  const [entityCols, setEntityCols] = useState<string[]>(() => initialFrame?.entityCols ?? []);
  const [eventTimeCol, setEventTimeCol] = useState(() => initialFrame?.eventTimeCol ?? "");
  const [customFilter, setCustomFilter] = useState(() => initialFrame?.customFilter ?? "");
  const [fullscreen, setFullscreen] = useState(false);
  const [entityOpen, setEntityOpen] = useState(false);
  const [tableOpen, setTableOpen] = useState(false);
  const [tableQ, setTableQ] = useState("");

  const isHive = sourceType === "hive";
  const hiveTableOptions = useMemo(
    () => getHiveProjectTablesForSchema(tableSchema.trim()),
    [tableSchema]
  );
  const filteredHiveTables = useMemo(
    () => hiveTableOptions.filter((t) => t.toLowerCase().includes(tableQ.trim().toLowerCase())),
    [hiveTableOptions, tableQ]
  );

  useEffect(() => {
    const names = getHiveProjectTablesForSchema(tableSchema.trim());
    if (tableName && names.length > 0 && !names.includes(tableName)) {
      setTableName("");
    }
  }, [tableSchema]); // eslint-disable-line react-hooks/exhaustive-deps -- reset stale table when schema changes
  const serverOpts = ["reg_sg", "reg_us"];
  const filteredCols = parsedCols.filter(c => c.name.toLowerCase().includes(colSearch.toLowerCase()));
  const allSel  = parsedCols.length > 0 && parsedCols.every(c => selectedCols.has(c.name));
  const someSel = parsedCols.some(c => selectedCols.has(c.name));
  const sqlLines = Math.max((sql||"").split("\n").length, 1);

  useEffect(() => {
    if (!fullscreen) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [fullscreen]);

  // Hive: trigger parse when dataServer + tableSchema + tableName all filled
  useEffect(() => {
    if (!isHive) return;
    if (!dataServer || !tableSchema.trim() || !tableName.trim()) {
      setParseState("idle"); setParsedCols([]); setSelectedCols(new Set());
      setEntityCols([]); setEventTimeCol(""); return;
    }
    setParseState("parsing");
    const t = setTimeout(() => {
      const cols = mockHiveColumns(tableSchema.trim(), tableName.trim());
      setParsedCols(cols);
      setSelectedCols(new Set(cols.map(c => c.name)));
      setEntityCols([]); setEventTimeCol("");
      setParseState("ready");
    }, 700);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHive, dataServer, tableSchema, tableName]);

  // SQL: trigger parse when dataServer set + sql non-empty
  useEffect(() => {
    if (isHive) return;
    if (!dataServer || !sql.trim()) {
      setParseState("idle"); setParsedCols([]); setSelectedCols(new Set());
      setParseError(null); setEntityCols([]); setEventTimeCol(""); return;
    }
    setParseState("parsing"); setParseError(null);
    const t = setTimeout(() => {
      const { cols, error } = parseSQLColumns(sql);
      if (error) {
        setParseState("error"); setParseError(error);
        setParsedCols([]); setSelectedCols(new Set());
      } else {
        setParsedCols(cols);
        setSelectedCols(new Set(cols.map(c => c.name)));
        setEntityCols([]); setEventTimeCol("");
        setParseState("ready");
      }
    }, 500);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHive, dataServer, sql]);

  const toggleAll = () => setSelectedCols(allSel ? new Set() : new Set(parsedCols.map(c => c.name)));
  const toggleCol = (name: string) => { const n = new Set(selectedCols); n.has(name) ? n.delete(name) : n.add(name); setSelectedCols(n); };
  const onSrcChange = (t: "hive"|"sql") => {
    setSourceType(t);
    setParseState("idle"); setParsedCols([]); setSelectedCols(new Set());
    setParseError(null); setEntityCols([]); setEventTimeCol("");
  };
  const Chk = ({ on }: { on: boolean }) => (
    <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${on ? "bg-teal-500 border-teal-500" : "border-gray-300 bg-white"}`}>
      {on && <span className="text-white" style={{fontSize:9,fontWeight:900,lineHeight:1}}>✓</span>}
    </span>
  );

  return (
    <>
      <div className="w-80 shrink-0 bg-white border-l border-gray-100 flex flex-col h-full overflow-hidden">
        <div className="px-4 pt-3 pb-3 border-b border-gray-100 bg-teal-50/40">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-teal-100">
                <Database size={15} className="text-teal-600" />
              </div>
              <div className="min-w-0">
                <div className="text-sm text-gray-800">Frame Table</div>
                <div className="text-xs text-gray-400">Source Table Config</div>
              </div>
            </div>
            <button onClick={onClose} className="p-1 text-gray-300 hover:text-gray-500 shrink-0 mt-0.5"><X size={13}/></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
            <>
              {/* 1. Source Type */}
              <div>
                <FieldLabel required>Source Type</FieldLabel>
                <div className="flex gap-2">
                  {(["hive","sql"] as const).map(t => (
                    <button key={t} onClick={() => onSrcChange(t)}
                      className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-xl border text-xs transition-all ${
                        sourceType===t ? "border-teal-400 bg-teal-50 text-teal-700" : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                      }`}>
                      <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ${sourceType===t?"border-teal-500":"border-gray-300"}`}>
                        {sourceType===t && <span className="w-1.5 h-1.5 rounded-full bg-teal-500"/>}
                      </span>
                      {t==="hive"?"Hive":"SQL"}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Data Server */}
              <div>
                <FieldLabel required>Data Server</FieldLabel>
                <div className="relative">
                  <select value={dataServer} onChange={e=>setDataServer(e.target.value)}
                    className="w-full appearance-none border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 bg-gray-50 focus:outline-none focus:border-teal-400 pr-8">
                    {serverOpts.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                  <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
                </div>
              </div>

              {/* Hive allowlist (project) */}
              {isHive && (
                <div
                  className="flex items-start gap-2 rounded-xl border border-teal-100 bg-teal-50/50 px-3 py-2"
                  title={HIVE_ALLOWLIST_HINT}
                >
                  <Info size={14} className="text-teal-600 shrink-0 mt-0.5" aria-hidden />
                  <p className="text-[11px] text-gray-600 leading-relaxed">{HIVE_ALLOWLIST_HINT}</p>
                </div>
              )}

              {/* 3. Table Schema (Hive only) */}
              {isHive && (
                <div>
                  <FieldLabel required>Table Schema</FieldLabel>
                  <div className="relative">
                    <select
                      value={tableSchema}
                      onChange={(e) => setTableSchema(e.target.value)}
                      className="w-full appearance-none border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 bg-gray-50 focus:outline-none focus:border-teal-400 pr-8 font-mono"
                    >
                      <option value="">Select schema…</option>
                      {getHiveProjectSchemaNames().map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              )}

              {/* 4. Table Name (Hive only) — fuzzy combobox */}
              {isHive && (
                <div>
                  <FieldLabel required>Table Name</FieldLabel>
                  <div className="relative">
                    <input
                      type="text"
                      value={tableOpen ? tableQ : tableName}
                      onChange={(e) => {
                        setTableQ(e.target.value);
                        setTableOpen(true);
                      }}
                      onFocus={() => {
                        setTableOpen(true);
                        setTableQ("");
                      }}
                      onBlur={() => setTimeout(() => setTableOpen(false), 160)}
                      disabled={!tableSchema.trim()}
                      placeholder={
                        tableSchema.trim() ? "Search table name…" : "Select a schema first"
                      }
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 bg-gray-50 focus:outline-none focus:border-teal-400 placeholder:text-gray-300 font-mono pr-8 disabled:opacity-50"
                    />
                    <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    {tableOpen && tableSchema.trim() && (
                      <div className="absolute left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden max-h-44 overflow-y-auto">
                        {filteredHiveTables.length === 0 ? (
                          <div className="py-4 text-center text-xs text-gray-400">No tables matched</div>
                        ) : (
                          filteredHiveTables.map((t) => (
                            <button
                              key={t}
                              type="button"
                              onMouseDown={() => {
                                setTableName(t);
                                setTableQ(t);
                                setTableOpen(false);
                              }}
                              className={`w-full text-left px-3 py-2.5 text-xs font-mono border-b border-gray-50 last:border-0 hover:bg-teal-50 transition-colors ${
                                tableName === t ? "bg-teal-50 text-teal-700" : "text-gray-700"
                              }`}
                            >
                              {t}
                              {tableName === t && <span className="ml-2 text-teal-400">✓</span>}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 5. SQL editor (SQL only) */}
              {!isHive && (
                <div>
                  <FieldLabel required>SQL</FieldLabel>
                  <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50 relative">
                    <div className="flex">
                      <div className="flex flex-col items-end px-2 py-2.5 bg-gray-100/80 text-gray-400 select-none font-mono border-r border-gray-200 min-w-[28px]" style={{fontSize:10,lineHeight:"20px"}}>
                        {Array.from({length:sqlLines},(_,i)=><span key={i} style={{height:20,display:"block"}}>{i+1}</span>)}
                      </div>
                      <textarea value={sql} onChange={e=>setSql(e.target.value)} rows={6}
                        placeholder={"SELECT user_id, event_time, amount\nFROM schema.table\nWHERE ds = '2024-01-01'"}
                        className="flex-1 py-2.5 px-2.5 text-xs font-mono bg-transparent resize-none focus:outline-none text-gray-700 placeholder:text-gray-300"
                        style={{lineHeight:"20px"}} spellCheck={false}/>
                    </div>
                    <button onClick={()=>setFullscreen(true)}
                      className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-white hover:bg-teal-50 text-gray-400 hover:text-teal-600 border border-gray-200 transition-all"
                      title="Fullscreen Editor"><Maximize2 size={11}/></button>
                  </div>
                </div>
              )}

              {/* 6. Columns */}
              <div>
                <FieldLabel required>Columns</FieldLabel>
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  {/* Toolbar: only shown when columns are ready */}
                  {parseState === "ready" && (
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50/60">
                      <button onClick={toggleAll} className="flex items-center gap-1.5 shrink-0">
                        <span className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                          allSel?"bg-teal-500 border-teal-500":someSel?"bg-teal-100 border-teal-300":"border-gray-300 bg-white"
                        }`}>
                          {allSel && <span className="text-white" style={{fontSize:9,fontWeight:900,lineHeight:1}}>✓</span>}
                          {!allSel && someSel && <span className="w-2 h-0.5 bg-teal-500 block"/>}
                        </span>
                        <span className="text-xs text-gray-600">Select All</span>
                        <span className="text-xs text-gray-400">({selectedCols.size}/{parsedCols.length})</span>
                      </button>
                      <div className="flex-1 relative">
                        <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none"/>
                        <input type="text" value={colSearch} onChange={e=>setColSearch(e.target.value)}
                          placeholder="Search columns..."
                          className="w-full text-xs border border-gray-200 rounded-lg pl-6 pr-2 py-1 bg-white focus:outline-none focus:border-teal-400 placeholder:text-gray-300"/>
                      </div>
                    </div>
                  )}

                  {/* Idle state */}
                  {parseState === "idle" && (
                    <div className="py-6 px-4 flex flex-col items-center gap-2 text-center">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                        <Database size={14} className="text-gray-300"/>
                      </div>
                      <p className="text-xs text-gray-400 leading-relaxed">
                        {isHive
                          ? "Fill in Data Server, Table Schema and Table Name to load columns"
                          : "Select a Data Server and write SQL to parse columns"}
                      </p>
                    </div>
                  )}

                  {/* Parsing spinner */}
                  {parseState === "parsing" && (
                    <div className="py-6 flex items-center justify-center gap-2">
                      <svg className="animate-spin w-4 h-4 text-teal-400" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                      </svg>
                      <span className="text-xs text-gray-400">Parsing schema…</span>
                    </div>
                  )}

                  {/* Parse error */}
                  {parseState === "error" && parseError && (
                    <div className="py-4 px-3 flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-red-100 text-red-500 flex items-center justify-center shrink-0 mt-0.5" style={{fontSize:10,fontWeight:700}}>!</span>
                      <span className="text-xs text-red-500 leading-relaxed">{parseError}</span>
                    </div>
                  )}

                  {/* Column rows */}
                  {parseState === "ready" && (
                    <div className="overflow-y-auto" style={{maxHeight:178}}>
                      {filteredCols.map(col => (
                        <div key={col.name} onClick={()=>toggleCol(col.name)}
                          className={`flex items-center gap-2.5 px-3 py-2 border-b border-gray-50 last:border-0 cursor-pointer hover:bg-gray-50 transition-colors ${!selectedCols.has(col.name)?"opacity-40":""}`}>
                          <Chk on={selectedCols.has(col.name)}/>
                          <span className="flex-1 text-xs text-gray-700 font-mono">{col.name}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded-md font-mono ${COL_TYPE_BADGE[col.type]??"bg-gray-100 text-gray-500"}`} style={{fontSize:10}}>{col.type}</span>
                        </div>
                      ))}
                      {filteredCols.length===0 && parsedCols.length>0 && (
                        <div className="py-4 text-center text-xs text-gray-400">No columns matched</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* 7. Entity Column (multi-select) */}
              <div className="relative">
                <FieldLabel required>Entity Column</FieldLabel>
                <button onClick={()=>setEntityOpen(!entityOpen)}
                  className="w-full flex items-center gap-1.5 flex-wrap border border-gray-200 rounded-xl px-2.5 py-1.5 bg-gray-50 hover:border-teal-400 transition-colors text-left min-h-[38px]">
                  {entityCols.length>0
                    ? entityCols.map(c => (
                        <span key={c} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-teal-100 text-teal-700 text-xs font-mono">
                          {c}
                          <button className="hover:text-red-500 ml-0.5 leading-none" onClick={e=>{e.stopPropagation();setEntityCols(p=>p.filter(x=>x!==c));}}>
                            <X size={10}/>
                          </button>
                        </span>
                      ))
                    : <span className="text-xs text-gray-400 px-1">Select entity columns…</span>
                  }
                  <ChevronDown size={13} className="ml-auto text-gray-400 shrink-0"/>
                </button>
                {entityOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
                    <div className="p-1.5 max-h-44 overflow-y-auto">
                      {parsedCols.length === 0
                        ? <div className="py-3 text-center text-xs text-gray-400">No columns loaded yet</div>
                        : parsedCols.map(col => (
                          <button key={col.name}
                            onClick={()=>setEntityCols(p=>p.includes(col.name)?p.filter(x=>x!==col.name):[...p,col.name])}
                            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-teal-50 text-left transition-colors">
                            <Chk on={entityCols.includes(col.name)}/>
                            <span className="flex-1 text-xs text-gray-700 font-mono">{col.name}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded-md font-mono ${COL_TYPE_BADGE[col.type]??"bg-gray-100 text-gray-500"}`} style={{fontSize:10}}>{col.type}</span>
                          </button>
                        ))
                      }
                    </div>
                  </div>
                )}
              </div>

              {/* 8. EventTime Column (single-select) */}
              <div>
                <FieldLabel required>EventTime Column</FieldLabel>
                <div className="relative">
                  <select value={eventTimeCol} onChange={e=>setEventTimeCol(e.target.value)}
                    className="w-full appearance-none border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 bg-gray-50 focus:outline-none focus:border-teal-400 pr-8 font-mono">
                    <option value="">Select event time column…</option>
                    {parsedCols.map(c=><option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                  <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
                </div>
              </div>

              {/* 9. Custom Filter (Hive only) */}
              {isHive && (
                <div>
                  <FieldLabel>Custom Filter <span className="text-gray-400 font-normal ml-0.5">(Optional)</span></FieldLabel>
                  <textarea value={customFilter} onChange={e=>setCustomFilter(e.target.value)} rows={3}
                    placeholder="Please Input SQL After 'WHERE'"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-mono bg-gray-50 resize-y focus:outline-none focus:border-teal-400 placeholder:text-gray-300 text-gray-700"/>
                </div>
              )}
            </>
        </div>

        <div className="px-4 py-2 border-t border-gray-50">
          <span className="text-xs text-gray-400">Node · Frame Table config</span>
        </div>
      </div>

      {/* SQL Fullscreen Modal */}
      {fullscreen && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-8" onClick={()=>setFullscreen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden shadow-2xl" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-teal-100">
                  <Database size={13} className="text-teal-600"/>
                </div>
                <span className="text-sm text-gray-800">SQL Editor</span>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Frame Table</span>
              </div>
              <button onClick={()=>setFullscreen(false)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"><X size={15}/></button>
            </div>
            <div className="flex-1 flex overflow-hidden" style={{fontFamily:"ui-monospace,SFMono-Regular,Menlo,monospace",fontSize:13,lineHeight:"22px"}}>
              <div className="shrink-0 bg-gray-50 border-r border-gray-100 px-3 py-4 text-gray-400 select-none text-right overflow-y-auto" style={{minWidth:48}}>
                {(sql||" ").split("\n").map((_,i)=><div key={i} style={{height:22}}>{i+1}</div>)}
              </div>
              <div className="flex-1 relative overflow-auto">
                <pre className="absolute inset-0 p-4 m-0 pointer-events-none whitespace-pre-wrap break-words text-gray-700"
                  style={{fontFamily:"inherit",fontSize:"inherit",lineHeight:"inherit"}}
                  dangerouslySetInnerHTML={{__html:highlightSQL(sql||"")+"\u200B"}}/>
                <textarea value={sql} onChange={e=>setSql(e.target.value)}
                  className="absolute inset-0 w-full h-full p-4 bg-transparent resize-none focus:outline-none text-transparent z-10"
                  style={{fontFamily:"inherit",fontSize:"inherit",lineHeight:"inherit",caretColor:"#1e293b"}}
                  spellCheck={false} placeholder=" "/>
              </div>
            </div>
            <div className="flex items-center justify-between px-5 py-2.5 border-t border-gray-100 shrink-0 bg-gray-50/50">
              <span className="text-xs text-gray-400 font-mono">
                {(sql||"").split("\n").length} line{(sql||"").split("\n").length!==1?"s":""} · {(sql||"").length} chars
              </span>
              <button onClick={()=>setFullscreen(false)} className="px-4 py-1.5 text-xs text-white bg-teal-500 hover:bg-teal-600 rounded-lg transition-colors">Done</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Feature Group Panel ───────────────────────────────────────────────────────
function FeatureGroupPanel({
  defaultFg,
  onClose,
  initialFg,
}: {
  /** The Feature Group this node stands for — the node title is the FG name. */
  defaultFg: string;
  onClose: () => void;
  initialFg?: FeatureGroupNodeSnapshot;
}) {
  const defaultFgName = initialFg?.selectedFg ?? defaultFg;
  const [fgSearch, setFgSearch] = useState(defaultFgName);
  const [fgOpen, setFgOpen] = useState(false);
  const [selectedFg, setSelectedFg] = useState(defaultFgName);
  const [showInfo, setShowInfo] = useState(false);
  const [colSearch, setColSearch] = useState("");
  const [colParseState, setColParseState] = useState<ParseState>(defaultFgName ? "ready" : "idle");
  const [selectedCols, setSelectedCols] = useState<Set<string>>(
    () =>
      new Set(
        (FG_CATALOG.find((f) => f.name === defaultFgName) ?? { cols: [] }).cols.map((c) => c.name)
      )
  );
  const [joinType, setJoinType] = useState(() => initialFg?.joinType ?? JOIN_TYPES[0]);
  const [entityJoinCol, setEntityJoinCol] = useState(() => initialFg?.entityJoinCol ?? "");
  const [eventTimeJoinCol, setEventTimeJoinCol] = useState(() => initialFg?.eventTimeJoinCol ?? "");
  const [timeOp, setTimeOp] = useState<">" | ">=">(">");
  const prevFgRef = useRef<string | null>(null);

  const fg = FG_CATALOG.find((f) => f.name === selectedFg) ?? null;
  const filteredFgList = FG_CATALOG.filter((f) =>
    f.name.toLowerCase().includes((fgOpen ? fgSearch : "").toLowerCase())
  );
  const filteredCols = (fg?.cols ?? []).filter((c) => c.name.toLowerCase().includes(colSearch.toLowerCase()));
  const allSel = fg ? fg.cols.length > 0 && fg.cols.every((c) => selectedCols.has(c.name)) : false;
  const someSel = fg ? fg.cols.some((c) => selectedCols.has(c.name)) : false;

  // Auto-parse columns when FG selection changes (clear join mapping only when FG actually changes)
  useEffect(() => {
    if (!selectedFg) {
      setColParseState("idle");
      setSelectedCols(new Set());
      return;
    }
    const userChangedFg =
      prevFgRef.current !== null && prevFgRef.current !== selectedFg;
    prevFgRef.current = selectedFg;
    setColParseState("parsing");
    const t = setTimeout(() => {
      const f = FG_CATALOG.find((x) => x.name === selectedFg);
      if (f) {
        setSelectedCols(new Set(f.cols.map((c) => c.name)));
      }
      if (userChangedFg) {
        setEntityJoinCol("");
        setEventTimeJoinCol("");
      }
      setColParseState("ready");
    }, 550);
    return () => clearTimeout(t);
  }, [selectedFg]);

  const toggleAll = () => setSelectedCols(allSel ? new Set() : new Set(fg?.cols.map(c => c.name) ?? []));
  const toggleCol = (name: string) => {
    const n = new Set(selectedCols); n.has(name) ? n.delete(name) : n.add(name); setSelectedCols(n);
  };
  const Chk = ({ on }: { on: boolean }) => (
    <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${on ? "bg-teal-500 border-teal-500" : "border-gray-300 bg-white"}`}>
      {on && <span className="text-white" style={{fontSize:9,fontWeight:900,lineHeight:1}}>✓</span>}
    </span>
  );

  return (
    <div className="w-80 shrink-0 bg-white border-l border-gray-100 flex flex-col h-full overflow-hidden">
      <div className="px-4 pt-3 pb-3 border-b border-gray-100 bg-blue-50/40">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-blue-100">
              <Layers size={15} className="text-blue-600" />
            </div>
            <div className="min-w-0">
              <div className="text-sm text-gray-800 truncate max-w-[170px]">{selectedFg || "Feature Group"}</div>
              <div className="text-xs text-gray-400">Feature Group Config</div>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-gray-300 hover:text-gray-500 shrink-0 mt-0.5"><X size={13}/></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
          <>
            {/* 1. FG Name selector */}
            <div>
              <FieldLabel required>Feature Group</FieldLabel>
              <div className="relative">
                <div className="flex items-center gap-1.5">
                  {/* Combobox input */}
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={fgOpen ? fgSearch : selectedFg}
                      onChange={e => { setFgSearch(e.target.value); setFgOpen(true); }}
                      onFocus={() => { setFgOpen(true); setFgSearch(""); }}
                      onBlur={() => setTimeout(() => setFgOpen(false), 160)}
                      placeholder="Search feature group…"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 bg-gray-50 focus:outline-none focus:border-teal-400 placeholder:text-gray-300 font-mono pr-7"
                    />
                    <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
                  </div>
                  {/* Eye info button */}
                  {fg && (
                    <div className="relative shrink-0">
                      <button
                        onMouseEnter={() => setShowInfo(true)}
                        onMouseLeave={() => setShowInfo(false)}
                        className="w-8 h-8 flex items-center justify-center rounded-xl border border-gray-200 bg-gray-50 hover:border-teal-400 hover:bg-teal-50 transition-colors text-gray-400 hover:text-teal-600"
                      >
                        <Eye size={14}/>
                      </button>
                      {showInfo && (
                        <div className="absolute right-0 top-full mt-1.5 z-50 bg-white border border-gray-200 rounded-xl shadow-2xl p-3 w-60">
                          <div className="flex flex-col gap-2">
                            {[
                              { label: "Data Server", value: fg.dataServer },
                              { label: "Schema",      value: fg.schema     },
                              { label: "Table",       value: fg.table      },
                              { label: "Entities Column(s)", value: fg.entityCols.join(", ") },
                              { label: "Custom Filter", value: fg.filter },
                            ].map(({label,value}) => (
                              <div key={label} className="flex items-start gap-2">
                                <span className="text-xs text-gray-400 w-20 shrink-0">{label}</span>
                                <span className="text-xs text-gray-800 font-mono break-all">{value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* FG dropdown list */}
                {fgOpen && (
                  <div className="absolute left-0 z-50 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden"
                    style={{width:"calc(100% - 40px)"}}>
                    <div className="max-h-44 overflow-y-auto">
                      {filteredFgList.length === 0 ? (
                        <div className="py-4 text-center text-xs text-gray-400">No feature groups matched</div>
                      ) : filteredFgList.map(f => (
                        <button key={f.name}
                          onMouseDown={() => { setSelectedFg(f.name); setFgSearch(f.name); setFgOpen(false); }}
                          className={`w-full text-left px-3 py-2.5 text-xs font-mono border-b border-gray-50 last:border-0 hover:bg-teal-50 transition-colors ${selectedFg === f.name ? "bg-teal-50 text-teal-700" : "text-gray-700"}`}>
                          {f.name}
                          {selectedFg === f.name && <span className="ml-2 text-teal-400">✓</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 2. Columns */}
            <div>
              <FieldLabel required>Columns</FieldLabel>
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                {/* Toolbar: ready */}
                {colParseState === "ready" && fg && (
                  <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50/60">
                    <button onClick={toggleAll} className="flex items-center gap-1.5 shrink-0">
                      <span className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${allSel ? "bg-teal-500 border-teal-500" : someSel ? "bg-teal-100 border-teal-300" : "border-gray-300 bg-white"}`}>
                        {allSel  && <span className="text-white" style={{fontSize:9,fontWeight:900,lineHeight:1}}>✓</span>}
                        {!allSel && someSel && <span className="w-2 h-0.5 bg-teal-500 block"/>}
                      </span>
                      <span className="text-xs text-gray-600">Select All</span>
                      <span className="text-xs text-gray-400">({selectedCols.size}/{fg.cols.length})</span>
                    </button>
                    <div className="flex-1 relative">
                      <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none"/>
                      <input type="text" value={colSearch} onChange={e => setColSearch(e.target.value)}
                        placeholder="Search columns…"
                        className="w-full text-xs border border-gray-200 rounded-lg pl-6 pr-2 py-1 bg-white focus:outline-none focus:border-teal-400 placeholder:text-gray-300"/>
                    </div>
                  </div>
                )}

                {/* idle */}
                {colParseState === "idle" && (
                  <div className="py-6 px-4 flex flex-col items-center gap-2 text-center">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                      <Layers size={14} className="text-gray-300"/>
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed">Select a Feature Group to load columns</p>
                  </div>
                )}

                {/* parsing spinner */}
                {colParseState === "parsing" && (
                  <div className="py-6 flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4 text-teal-400" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                    </svg>
                    <span className="text-xs text-gray-400">Parsing schema…</span>
                  </div>
                )}

                {/* column rows */}
                {colParseState === "ready" && fg && (
                  <div className="overflow-y-auto" style={{maxHeight:178}}>
                    {filteredCols.map(col => (
                      <div key={col.name} onClick={() => toggleCol(col.name)}
                        className={`flex items-center gap-2.5 px-3 py-2 border-b border-gray-50 last:border-0 cursor-pointer hover:bg-gray-50 transition-colors ${!selectedCols.has(col.name) ? "opacity-40" : ""}`}>
                        <Chk on={selectedCols.has(col.name)}/>
                        <span className="flex-1 text-xs text-gray-700 font-mono">{col.name}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-md font-mono ${COL_TYPE_BADGE[col.type] ?? "bg-gray-100 text-gray-500"}`} style={{fontSize:10}}>{col.type}</span>
                      </div>
                    ))}
                    {filteredCols.length === 0 && fg.cols.length > 0 && (
                      <div className="py-4 text-center text-xs text-gray-400">No columns matched</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ── Smart Join Config ─────────────────────────────────────── */}
            <div className="border-t border-gray-200 pt-4">
              <div className="text-sm text-gray-800 mb-3">Smart Join Config</div>

              {/* Join Type */}
              <div className="mb-4">
                <FieldLabel>Join Type</FieldLabel>
                <div className="relative">
                  <select value={joinType} onChange={e => setJoinType(e.target.value)}
                    className="w-full appearance-none border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 bg-gray-50 focus:outline-none focus:border-teal-400 pr-8">
                    {JOIN_TYPES.map(j => <option key={j} value={j}>{j}</option>)}
                  </select>
                  <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
                </div>
              </div>

              {/* Column headers */}
              <div className="grid grid-cols-[1fr_36px_1fr] gap-2 mb-1.5 px-0.5">
                <span className="text-xs text-gray-400">Frame Table</span>
                <span className="text-xs text-gray-400 text-center">Op</span>
                <span className="text-xs text-gray-400">Feature Group</span>
              </div>

              {/* Entity join row */}
              <div className="grid grid-cols-[1fr_36px_1fr] gap-2 items-center mb-2">
                <div className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-xl min-w-0">
                  <span className="text-xs text-gray-700 font-mono truncate">user_id</span>
                  <span className="text-xs px-1.5 py-0.5 rounded-md bg-teal-100 text-teal-700 shrink-0 leading-none" style={{fontSize:10}}>PK</span>
                </div>
                <div className="flex items-center justify-center">
                  <select disabled
                    className="appearance-none border border-gray-200 rounded-lg px-1.5 py-1 text-xs text-gray-400 bg-gray-50 font-mono text-center cursor-not-allowed">
                    <option value="=">{"="}</option>
                  </select>
                </div>
                <div className="relative">
                  <select value={entityJoinCol} onChange={e => setEntityJoinCol(e.target.value)}
                    className="w-full appearance-none border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs text-gray-700 bg-gray-50 focus:outline-none focus:border-teal-400 pr-6 font-mono">
                    <option value="">Select</option>
                    {(fg?.entityCols ?? []).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
                </div>
              </div>

              {/* EventTime join row */}
              <div className="grid grid-cols-[1fr_36px_1fr] gap-2 items-center">
                <div className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-xl min-w-0">
                  <span className="text-xs text-gray-700 font-mono truncate">event_time</span>
                  <span className="text-xs px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700 shrink-0 leading-none" style={{fontSize:10}}>ET</span>
                </div>
                <div className="flex items-center justify-center">
                  <select value={timeOp} onChange={e => setTimeOp(e.target.value as ">" | ">=")}
                    className="appearance-none border border-gray-200 rounded-lg px-1.5 py-1 text-xs text-gray-600 bg-gray-50 focus:outline-none focus:border-teal-400 font-mono text-center">
                    <option value=">">{">"}</option>
                    <option value=">=">{">="}</option>
                  </select>
                </div>
                <div className="relative">
                  <select value={eventTimeJoinCol} onChange={e => setEventTimeJoinCol(e.target.value)}
                    className="w-full appearance-none border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs text-gray-700 bg-gray-50 focus:outline-none focus:border-teal-400 pr-6 font-mono">
                    <option value="">Select</option>
                    {(fg?.eventTimeCols ?? []).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
                </div>
              </div>
            </div>
          </>
      </div>

      <div className="px-4 py-2 border-t border-gray-50">
        <span className="text-xs text-gray-400">Node · Feature Group config</span>
      </div>
    </div>
  );
}

function NodeConfigPanel({
  node,
  onClose,
  frameTableInitial,
  ingestionConfig,
  dataCleaningEnabled,
  featureGroupInitial,
  instance,
  nodeStatus,
}: {
  node: NodeDef;
  onClose: () => void;
  frameTableInitial?: FrameTableSnapshot;
  ingestionConfig?: DataIngestionConfigSnapshot;
  dataCleaningEnabled: boolean;
  featureGroupInitial?: FeatureGroupNodeSnapshot;
  instance?: Instance | null;
  nodeStatus?: NodeStatus;
}) {
  if (node.type === "source") {
    return <FrameTablePanel onClose={onClose} initialFrame={frameTableInitial} />;
  }
  if (node.type === "sink" || node.type === "end") {
    return (
      <DataIngestionMergedPanel
        onClose={onClose}
        ingestionConfig={ingestionConfig}
        dataCleaningEnabled={dataCleaningEnabled}
        instance={instance}
        nodeStatus={nodeStatus}
      />
    );
  }
  if (node.type === "feature") {
    return (
      <FeatureGroupPanel
        defaultFg={node.title}
        onClose={onClose}
        initialFg={featureGroupInitial}
      />
    );
  }
  return null;
}

function parseCronEnglish(expr: string): { valid: boolean; english: string } {
  const t = expr.trim();
  if (!t) return { valid: false, english: "Enter a cron expression" };
  const parts = t.split(/\s+/);
  const core = parts.length === 6 ? parts.slice(1) : parts;
  if (core.length !== 5) return { valid: false, english: "Use 5 fields (or 6 with seconds)" };
  const [min, hour, dom, month, dow] = core;
  const fieldOk = (s: string) => /^[\d\*\-\/,\?]+$/.test(s);
  if (![min, hour, dom, month, dow].every(fieldOk)) return { valid: false, english: "Invalid characters in field" };
  if ((dom === "*" || dom === "?") && month === "*" && (dow === "*" || dow === "?") && /^\d+$/.test(min) && /^\d+$/.test(hour)) {
    const h = parseInt(hour, 10); const m = parseInt(min, 10);
    const hh = h % 12 || 12;
    const ampm = h >= 12 ? "pm" : "am";
    return { valid: true, english: `Run at ${hh}:${String(m).padStart(2, "0")} ${ampm} every day` };
  }
  return { valid: true, english: "Schedule active (English preview is simplified in prototype)" };
}

function ExecuteConfigModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [resource, setResource] = useState<"normal"|"high">("normal");
  const [queue, setQueue] = useState<"low"|"medium"|"high">("low");
  const [sched, setSched] = useState<"once"|"cron">("once");
  const [cronExpr, setCronExpr] = useState("0 6 * * *");
  const cron = parseCronEnglish(cronExpr);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-black/45" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-teal-50/60 to-white">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-teal-100 flex items-center justify-center"><Settings size={16} className="text-teal-600" /></div>
            <div>
              <div className="text-sm font-medium text-gray-800">Execute Config</div>
              <div className="text-xs text-gray-400">Resource · Queue Priority · Scheduler</div>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-gray-400 hover:bg-gray-100 rounded-lg"><X size={16} /></button>
        </div>
        <div className="px-5 py-4 flex flex-col gap-4">
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Resource</label>
            <select value={resource} onChange={e => setResource(e.target.value as "normal"|"high")}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:border-teal-400">
              <option value="normal">Normal</option>
              <option value="high">High</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Queue Priority</label>
            <select value={queue} onChange={e => setQueue(e.target.value as "low"|"medium"|"high")}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:border-teal-400">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Scheduler</label>
            <select value={sched} onChange={e => setSched(e.target.value as "once"|"cron")}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:border-teal-400">
              <option value="once">ONCE</option>
              <option value="cron">Cron</option>
            </select>
          </div>
          {sched === "cron" && (
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">Cron expression</label>
              <input value={cronExpr} onChange={e => setCronExpr(e.target.value)}
                className={`w-full font-mono text-sm border rounded-xl px-3 py-2 bg-gray-50 focus:outline-none ${cron.valid ? "border-gray-200 focus:border-teal-400" : "border-red-300 focus:border-red-400"}`}
                placeholder="0 6 * * *"
              />
              <p className={`text-xs mt-2 leading-relaxed ${cron.valid ? "text-teal-600" : "text-red-500"}`}>
                {cron.english}
              </p>
            </div>
          )}
        </div>
        <div className="px-5 py-3 border-t border-gray-100 flex justify-end gap-2 bg-gray-50/50">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50">Cancel</button>
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-xl bg-teal-500 text-white hover:bg-teal-600 shadow-sm">Save</button>
        </div>
      </div>
    </div>
  );
}

// ─── Empty canvas hint ────────────────────────────────────────────────────────
function CanvasEmptyHint() {
  return (
    <div className="absolute bottom-16 right-16 text-center pointer-events-none select-none">
      <div className="w-12 h-12 rounded-full border-2 border-dashed border-gray-200 flex items-center justify-center mx-auto mb-2">
        <GitBranch size={18} className="text-gray-300" />
      </div>
      <p className="text-sm text-gray-400">Click a node to view</p>
      <p className="text-sm text-gray-400">and configure its properties</p>
    </div>
  );
}

// ─── Main Canvas Page ─────────────────────────────────────────────────────────
export interface CanvasPageProps {
  mode: "new" | "edit" | "instance";
  formValues?: WideTableFormValues;
  row?: WideTableRow;
  initialInstanceId?: string;
  /** Seeded when list Copy → New Canvas */
  canvasSnapshot?: WideTableCanvasSnapshot;
  onBack: () => void;
}

export function CanvasPage({
  mode,
  formValues,
  row,
  initialInstanceId,
  canvasSnapshot,
  onBack,
}: CanvasPageProps) {
  // ── Meta ───────────────────────────────────────────────────────────────────
  const [meta, setMeta] = useState<WideTableFormValues>(() => {
    if (formValues) return formValues;
    return { name: row!.name, region: row!.region[0] ?? "", owners: row!.owners, bizTeam: row!.bizTeam, description: row!.description };
  });
  const [instances, setInstances] = useState<Instance[]>(row?.instances ?? []);

  // ── View mode ──────────────────────────────────────────────────────────────
  // "current-config" or "instance-view" — no longer a toggle, driven by user action
  const [viewMode, setViewMode] = useState<"current-config" | "instance-view">(
    mode === "instance" ? "instance-view" : "current-config"
  );
  const [selectedInstId, setSelectedInstId] = useState<string | null>(initialInstanceId ?? null);
  const selectedInst = instances.find(i => i.id === selectedInstId) ?? null;

  // Deep-linking from one instance to another reuses this component, so the props must
  // drive the selection rather than only seeding it on first mount.
  useEffect(() => {
    if (initialInstanceId) {
      setSelectedInstId(initialInstanceId);
      setViewMode("instance-view");
      setSelectedNodeId(null);
    }
  }, [initialInstanceId]);

  // ── Graph (nodes + edges) ──────────────────────────────────────────────────
  // Fall back to the default snapshot so the mock canvas is never empty in either mode.
  const initialGraph = useMemo(() => canvasSnapshot ?? createDefaultCanvasSnapshot(), [canvasSnapshot]);
  const [nodes, setNodes] = useState<NodeDef[]>(() => initialGraph.nodes.map((n) => ({ ...n })));
  const [edges] = useState<CanvasEdge[]>(() => initialGraph.edges.map((e) => [...e] as CanvasEdge));

  const instanceView = viewMode === "instance-view";
  const nodeStatuses = useMemo(
    () => (selectedInst ? getMockNodeStatuses(selectedInst.status, nodes) : undefined),
    [selectedInst, nodes]
  );
  const progress = nodeStatuses ? getRunProgress(nodeStatuses) : null;

  // ── Canvas display options (Graph Config) ──────────────────────────────────
  const [showLegend, setShowLegend] = useState(true);
  const [showParams, setShowParams] = useState(true);

  // ── Canvas tool mode ───────────────────────────────────────────────────────
  // Read-only instance view pans by default; editing defaults to selecting nodes.
  const [tool, setTool] = useState<CanvasTool>(mode === "instance" ? "pan" : "select");
  const effectiveTool: CanvasTool = instanceView ? "pan" : tool;

  // ── Selected node ──────────────────────────────────────────────────────────
  const [selectedNodeId, setSelectedNodeId] = useState<NodeId | null>(null);

  // ── Canvas transform ──────────────────────────────────────────────────────
  const [zoom, setZoomState] = useState(0.88);
  const [pan, setPan] = useState({ x: 80, y: 40 });
  const zoomRef = useRef(zoom);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);

  // ── Modals / dropdowns ─────────────────────────────────────────────────────
  const [showMetaModal, setShowMetaModal] = useState(false);
  const [showTriggerModal, setShowTriggerModal] = useState(false);
  const [showExecConfig, setShowExecConfig] = useState(false);
  const [showGraphConfig, setShowGraphConfig] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<"history" | "action" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // ── Refs ───────────────────────────────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement>(null);
  const isPanning = useRef(false);
  const panStart = useRef({ mx: 0, my: 0, px: 0, py: 0 });
  const historyRef = useRef<HTMLDivElement>(null);
  const execConfigRef = useRef<HTMLDivElement>(null);
  const graphConfigRef = useRef<HTMLDivElement>(null);
  const actionRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ w: 800, h: 500 });

  // Drag state (ref to avoid re-renders mid-drag)
  const dragState = useRef<{ nodeId: NodeId; startMx: number; startMy: number; startNx: number; startNy: number } | null>(null);
  const dragMoved = useRef(false);

  // ── Resize observer ────────────────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current; if (!el) return;
    const ro = new ResizeObserver(e => {
      const { width, height } = e[0].contentRect;
      setContainerSize({ w: width, h: height });
    });
    ro.observe(el); return () => ro.disconnect();
  }, []);

  // ── Center on mount ────────────────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current; if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const b = canvasBounds(nodes);
    const iz = 0.88;
    setPan({ x: width / 2 - (b.minX + b.w / 2) * iz, y: height / 2 - (b.minY + b.h / 2) * iz });
    // Runs once: later node edits keep the user's own pan.
  }, []);

  // ── Wheel zoom ──────────────────────────────────────────────────────────��──
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const rect = containerRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left; const my = e.clientY - rect.top;
    const pz = zoomRef.current;
    const nz = Math.min(Math.max(pz * (e.deltaY < 0 ? 1.12 : 0.9), 0.15), 3);
    zoomRef.current = nz; setZoomState(nz);
    setPan(p => ({ x: mx - (mx - p.x) * (nz / pz), y: my - (my - p.y) * (nz / pz) }));
  }, []);
  useEffect(() => {
    const el = containerRef.current; if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  // ── Node drag start ────────────────────────────────────────────────────────
  const handleNodeDragStart = (nodeId: NodeId, e: React.MouseEvent) => {
    if (e.button !== 0) return;
    // Read-only Instance View: nodes are fixed, the drag falls through to panning.
    if (instanceView) return;
    if (e.altKey) return; // Alt-drag is reserved for the pan gesture below.
    e.stopPropagation();
    dragMoved.current = false;
    const n = nodes.find(x => x.id === nodeId)!;
    dragState.current = { nodeId, startMx: e.clientX, startMy: e.clientY, startNx: n.x, startNy: n.y };
  };

  // ── Mouse handlers on canvas ───────────────────────────────────────────────
  const beginPan = (e: React.MouseEvent) => {
    isPanning.current = true;
    panStart.current = { mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y };
  };

  const onCanvasMouseDown = (e: React.MouseEvent) => {
    // Middle-click and right-drag always pan; left-drag pans in Pan mode.
    if (e.button === 1 || e.button === 2 || e.button === 0) beginPan(e);
    setSelectedNodeId(null);
  };

  /** Panning also starts from a node when the tool is Pan, or while Alt is held. */
  const onNodePanMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 || (!instanceView && !e.altKey)) return;
    e.stopPropagation();
    setSelectedNodeId(null);
    beginPan(e);
  };

  const onCanvasMouseMove = (e: React.MouseEvent) => {
    if (dragState.current) {
      const dx = (e.clientX - dragState.current.startMx) / zoomRef.current;
      const dy = (e.clientY - dragState.current.startMy) / zoomRef.current;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        dragMoved.current = true;
        const { nodeId, startNx, startNy } = dragState.current;
        setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, x: startNx + dx, y: startNy + dy } : n));
      }
    } else if (isPanning.current) {
      setPan({ x: panStart.current.px + e.clientX - panStart.current.mx, y: panStart.current.py + e.clientY - panStart.current.my });
    }
  };
  const onCanvasMouseUp = () => { dragState.current = null; isPanning.current = false; };

  // ── Touch (pinch + two-finger pan) ────────────────────────────────────────
  const lastTouch = useRef<{ dist: number; mx: number; my: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const [a, b] = [e.touches[0], e.touches[1]];
      lastTouch.current = { dist: Math.hypot(b.clientX-a.clientX, b.clientY-a.clientY), mx: (a.clientX+b.clientX)/2, my: (a.clientY+b.clientY)/2 };
    }
  };
  const onTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    if (e.touches.length !== 2 || !lastTouch.current) return;
    const [a, b] = [e.touches[0], e.touches[1]];
    const dist = Math.hypot(b.clientX-a.clientX, b.clientY-a.clientY);
    const mx = (a.clientX+b.clientX)/2; const my = (a.clientY+b.clientY)/2;
    const rect = containerRef.current!.getBoundingClientRect();
    const cx = mx-rect.left; const cy = my-rect.top;
    const pz = zoomRef.current; const nz = Math.min(Math.max(pz*(dist/lastTouch.current.dist), 0.15), 3);
    zoomRef.current = nz; setZoomState(nz);
    setPan(p => ({
      x: cx-(cx-p.x)*(nz/pz)+(mx-lastTouch.current!.mx),
      y: cy-(cy-p.y)*(nz/pz)+(my-lastTouch.current!.my),
    }));
    lastTouch.current = { dist, mx, my };
  };
  const onTouchEnd = () => { lastTouch.current = null; };

  // ── Fit to screen ──────────────────────────────────────────────────────────
  const fitToScreen = () => {
    if (!containerRef.current) return;
    const { width, height } = containerRef.current.getBoundingClientRect();
    const pad = 80;
    const b = canvasBounds(nodes);
    const minX = b.minX - 20; const maxX = b.maxX + 20;
    const minY = b.minY - 20; const maxY = b.maxY + 20;
    const cw = maxX-minX; const ch = maxY-minY;
    const nz = Math.min((width-pad)/cw, (height-pad)/ch, 1.5);
    zoomRef.current = nz; setZoomState(nz);
    setPan({ x: (width-cw*nz)/2-minX*nz, y: (height-ch*nz)/2-minY*nz });
  };

  /**
   * Auto layout: re-derive node positions from the DAG shape (source → Feature Group grid
   * → sink) and reset the viewport. Feature Groups keep their current reading order.
   */
  const autoLayout = () => {
    const source = nodes.find((n) => n.type === "source");
    const features = nodes.filter((n) => n.type === "feature");
    const sink = nodes.find((n) => n.type === "sink" || n.type === "end");
    if (!source || !sink || features.length === 0) return;

    const cols = fgGridCols(features.length);
    const fgBlock = canvasBounds(features);
    const midY = (h: number) => fgBlock.minY + fgBlock.h / 2 - h / 2;
    const rightX = fgBlock.maxX + SINK_GAP_X;

    setNodes(
      nodes.map((n) => {
        if (n.type === "source") return { ...n, x: SOURCE_X, y: midY(n.h) };
        if (n.type === "sink" || n.type === "end") return { ...n, x: rightX, y: midY(n.h) };
        const i = features.findIndex((f) => f.id === n.id);
        const pos = fgGridPosition(i, cols);
        return { ...n, x: pos.x, y: pos.y };
      })
    );
    requestAnimationFrame(() => fitToScreen());
  };

  const handleZoomBtn = (delta: number) => {
    if (!containerRef.current) return;
    const { width, height } = containerRef.current.getBoundingClientRect();
    const cx = width/2; const cy = height/2;
    const pz = zoomRef.current; const nz = Math.min(Math.max(pz+delta, 0.15), 3);
    zoomRef.current = nz; setZoomState(nz);
    setPan(p => ({ x: cx-(cx-p.x)*(nz/pz), y: cy-(cy-p.y)*(nz/pz) }));
  };

  // ── Close dropdowns outside ────────────────────────────────────────────────
  useEffect(() => {
    const h = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        historyRef.current?.contains(t) ||
        execConfigRef.current?.contains(t) ||
        graphConfigRef.current?.contains(t) ||
        actionRef.current?.contains(t)
      ) return;
      setActiveDropdown(null);
      setShowGraphConfig(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // ── Trigger Instance ───────────────────────────────────────────────────────
  const handleTriggerClick = () => {
    setActiveDropdown(null); setActionError(null);
    if (instances.some(i => i.status === "RUNNING" || i.status === "QUEUING")) {
      setActionError("Cannot trigger: a RUNNING or QUEUING instance exists. Kill it first.");
      return;
    }
    setShowTriggerModal(true);
  };
  const handleTrigger = (notes: string) => {
    setShowTriggerModal(false);
    const ts = new Date().toLocaleString("sv-SE").slice(0,16).replace("T"," ");
    const inst: Instance = {
      id: `inst-trigger-${Date.now()}`, status: "RUNNING",
      notes: notes.trim(),
      createTime: ts, startTime: ts, finishTime: "", duration: "", rowsCnt: "", columnsCnt: "",
    };
    setInstances(prev => [inst, ...prev]);
    setSelectedInstId(inst.id);
    setViewMode("instance-view");
  };

  // ── Kill ──────────────────────────────────────────────────────────────────
  const canKill = viewMode === "instance-view" && selectedInst !== null &&
    (selectedInst.status === "RUNNING" || selectedInst.status === "QUEUING");
  const handleKill = () => {
    setActiveDropdown(null);
    if (!canKill || !selectedInst) return;
    setInstances(prev => prev.map(i => i.id === selectedInst.id ? { ...i, status: "KILLED" as InstanceStatus } : i));
  };

  const selectInstance = (id: string) => {
    setSelectedInstId(id); setViewMode("instance-view"); setActiveDropdown(null); setSelectedNodeId(null);
  };
  const backToConfig = () => {
    setViewMode("current-config"); setSelectedInstId(null); setSelectedNodeId(null);
  };

  // ── Esc closes the drawer / open menus ─────────────────────────────────────
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setSelectedNodeId(null);
      setShowGraphConfig(false);
      setActiveDropdown(null);
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, []);

  // version helper
  const versionOf = (idx: number) => instances.length - idx;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">

      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="shrink-0 bg-white border-b border-gray-100 shadow-xs">
        <div className="px-5 h-12 flex items-center gap-3">

          {/* Left: Back + Name + Region + Edit */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <button onClick={onBack}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 transition-colors group shrink-0">
              <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
              <span>Back</span>
            </button>
            <div className="w-px h-4 bg-gray-200 shrink-0" />
            <div className="flex items-center gap-1.5 min-w-0">
              <GitBranch size={13} className="text-teal-500 shrink-0" />
              <span className="text-sm text-gray-700 truncate max-w-[200px]">{meta.name}</span>
              {meta.region && (
                <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded shrink-0">{meta.region}</span>
              )}
              <button
                onClick={() => setShowMetaModal(true)}
                title={
                  viewMode === "instance-view"
                    ? "View table metadata (read-only)"
                    : "Edit table metadata"
                }
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border shadow-sm transition-all shrink-0 text-teal-700 border-teal-200 bg-gradient-to-b from-teal-50 to-white hover:border-teal-400 hover:shadow cursor-pointer"
              >
                <Pencil size={11} className="shrink-0" /> Edit Meta
              </button>
            </div>
          </div>

          {/* Center: static mode indicator */}
          <div className="shrink-0">
            {viewMode === "current-config" ? (
              <div className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg bg-white text-xs text-gray-600">
                <span className="w-2 h-2 rounded-full bg-teal-400 shrink-0" />
                Current Config
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg bg-white text-xs text-gray-600">
                <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
                <span className="px-1.5 py-0.5 text-xs bg-blue-50 text-blue-600 rounded font-medium">Instance View</span>
                {selectedInst && (
                  <>
                    <div className="w-px h-3 bg-gray-200" />
                    <span className="text-blue-600 font-mono text-xs">{selectedInst.id}</span>
                    <InstanceStatusBadge status={selectedInst.status} />
                  </>
                )}
              </div>
            )}
          </div>

          {/* Right: contextual buttons */}
          <div className="flex items-center gap-2 flex-1 justify-end">
            {/* Run History (only in current-config) */}
            {viewMode === "current-config" && (
              <div ref={historyRef} className="relative">
                <button
                  onClick={() => setActiveDropdown(p => p === "history" ? null : "history")}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-700 border-2 border-slate-300 bg-slate-50/90 rounded-lg hover:border-slate-400 hover:bg-white transition-all shadow-sm">
                  <History size={13} className="text-slate-600" /> Instance History
                  <ChevronDown size={11} className={`text-gray-400 transition-transform ${activeDropdown === "history" ? "rotate-180" : ""}`} />
                </button>

                {activeDropdown === "history" && (
                  <div className="absolute right-0 top-full mt-1.5 w-[580px] bg-white border border-gray-200 rounded-xl shadow-xl z-30 overflow-hidden">
                    {/* Dropdown header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                      <div className="flex items-center gap-2">
                        <History size={14} className="text-gray-500" />
                        <span className="text-sm text-gray-700">Instance History</span>
                      </div>
                      <span className="text-xs text-gray-400">{instances.length} instances total</span>
                    </div>
                    {/* Column headers */}
                    {instances.length > 0 && (
                      <div className="grid px-4 py-1.5 border-b border-gray-50 text-xs text-gray-400 gap-2"
                        style={{ gridTemplateColumns: "1fr 72px 130px 130px" }}>
                        <span>INSTANCE ID</span><span>STATUS</span><span>START</span><span>END</span>
                      </div>
                    )}
                    {/* Rows */}
                    <div className="max-h-52 overflow-y-auto">
                      {instances.length === 0 ? (
                        <div className="px-4 py-6 text-center text-xs text-gray-400">No runs yet.</div>
                      ) : instances.map((inst, idx) => (
                        <button key={inst.id} onClick={() => selectInstance(inst.id)}
                          className={`w-full grid px-4 py-2.5 items-center gap-2 hover:bg-gray-50 border-b border-gray-50 last:border-0 transition-colors
                            ${selectedInstId === inst.id ? "bg-teal-50/60" : ""}`}
                          style={{ gridTemplateColumns: "1fr 72px 130px 130px" }}>
                          <div className="flex flex-col gap-0.5 min-w-0 text-left">
                            <span className="text-xs text-blue-600 font-mono truncate">{inst.id.slice(0, 20)}{inst.id.length > 20 ? "…" : ""}</span>
                            <div className="flex items-center gap-1.5">
                              {idx === 0 && <span className="text-xs text-teal-600 bg-teal-50 px-1.5 py-px rounded">Latest</span>}
                            </div>
                          </div>
                          <InstanceStatusBadge status={inst.status} small />
                          <span className="text-xs text-gray-500 text-left">{inst.startTime || "—"}</span>
                          <span className="text-xs text-gray-500 text-left">{inst.finishTime || "—"}</span>
                        </button>
                      ))}
                    </div>
                    {/* Footer hint */}
                    <div className="px-4 py-2 border-t border-gray-100 text-center text-xs text-gray-400">Click an instance&nbsp;&nbsp;to view its pipeline execution — read only</div>
                  </div>
                )}
              </div>
            )}

            {viewMode === "current-config" && (
              <div ref={execConfigRef} className="relative">
                <button
                  type="button"
                  onClick={() => { setShowExecConfig(true); setActiveDropdown(null); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-teal-800 border-2 border-teal-400/80 bg-teal-50/70 rounded-lg hover:border-teal-500 hover:bg-teal-50 transition-all shadow-sm"
                >
                  <Settings size={13} className="text-teal-600" /> Execute Config
                </button>
              </div>
            )}

            {/* Action menu */}
            <div ref={actionRef} className="relative">
              <button
                onClick={() => setActiveDropdown(p => p === "action" ? null : "action")}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white bg-teal-500 rounded-lg hover:bg-teal-600 transition-all shadow-sm shadow-teal-200">
                <Zap size={12} /> Action
                <ChevronDown size={11} className={`transition-transform ${activeDropdown === "action" ? "rotate-180" : ""}`} />
              </button>
              {activeDropdown === "action" && (
                <div className="absolute right-0 top-full mt-1.5 w-44 bg-white border border-gray-200 rounded-xl shadow-xl z-30 py-1 overflow-hidden">
                  <button onClick={handleTriggerClick} disabled={viewMode === "instance-view"}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors ${viewMode === "instance-view" ? "text-gray-300 cursor-not-allowed" : "text-gray-700 hover:bg-gray-50"}`}>
                    <Zap size={13} className={viewMode === "instance-view" ? "text-gray-300" : "text-teal-500"} /> Trigger Instance
                  </button>
                  <div className="h-px bg-gray-100 my-0.5" />
                  <button onClick={handleKill} disabled={!canKill}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors ${canKill ? "text-red-500 hover:bg-red-50" : "text-gray-300 cursor-not-allowed"}`}>
                    <Square size={13} className={canKill ? "text-red-400" : "text-gray-300"} />
                    Kill
                    {!canKill && <span className="ml-auto text-gray-300" style={{ fontSize: 10 }}>{viewMode !== "instance-view" ? "run view only" : "not active"}</span>}
                  </button>
                </div>
              )}
            </div>

            {/* Back to Config (only in instance-view) */}
            {viewMode === "instance-view" && (
              <button onClick={backToConfig}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all">
                <RotateCcw size={13} /> Back to Config
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Error banner ─────────────────────────────────────────────────── */}
      {actionError && (
        <div className="shrink-0 bg-red-50 border-b border-red-100 px-5 py-2 flex items-start gap-2">
          <AlertCircle size={13} className="text-red-500 mt-0.5 shrink-0" />
          <span className="text-xs text-red-600 flex-1">{actionError}</span>
          <button onClick={() => setActionError(null)} className="text-red-400 hover:text-red-600"><X size={13} /></button>
        </div>
      )}

      {/* ── Instance info strip ───────────────────────────────────────────── */}
      {viewMode === "instance-view" && selectedInst && (
        <div className="shrink-0 border-b border-gray-100 px-5 py-2 flex items-center justify-between gap-4 bg-[#eff6ff] flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 min-w-0 flex-wrap">
            <History size={13} className="text-blue-500 shrink-0" />
            <span className="shrink-0">Instance</span>
            <span className="text-blue-600 font-mono shrink-0">{selectedInst.id}</span>
            {selectedInst.createTime && (
              <>
                <span className="text-gray-300 shrink-0">·</span>
                <span className="shrink-0">Trigger: {selectedInst.createTime}</span>
              </>
            )}
            <span className="text-gray-300 shrink-0">·</span>
            <span className="shrink-0">Start: {selectedInst.startTime || "—"}</span>
            <span className="text-gray-300 shrink-0">·</span>
            <span className="shrink-0">Finish: {selectedInst.finishTime || "—"}</span>
            {selectedInst.duration && (
              <>
                <span className="text-gray-300 shrink-0">·</span>
                <span className="shrink-0">Duration: {selectedInst.duration}</span>
              </>
            )}
            {progress && (
              <>
                <span className="text-gray-300 shrink-0">·</span>
                <span className="shrink-0 tabular-nums">
                  Stages: {progress.done}/{progress.total} done
                  {progress.failed > 0 && <span className="text-red-500"> · {progress.failed} failed</span>}
                </span>
              </>
            )}
          </div>
          {/* Legend */}
          <div className="flex items-center gap-3 shrink-0">
            {showLegend &&
              ([
                { dot: "bg-emerald-400", label: "Success" },
                { dot: "bg-blue-400",    label: "Running" },
                { dot: "bg-red-400",     label: "Failed" },
                { dot: "bg-yellow-400",  label: "Cache Skipped" },
                { dot: "bg-gray-300",    label: "Waiting" },
              ] as const).map(({ dot, label }) => (
                <div key={label} className="flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${dot}`} />
                  <span className="text-xs text-gray-500">{label}</span>
                </div>
              ))}
            <div className="w-px h-3 bg-gray-300" />
            <span className="text-xs bg-gray-200 px-2 py-0.5 rounded font-mono text-[#004ed6]">READ-ONLY</span>
          </div>
        </div>
      )}

      {/* ── Main area ────────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Canvas */}
        <div
          ref={containerRef}
          className="flex-1 relative overflow-hidden select-none"
          style={{
            background: "#eef2f7",
            backgroundImage: "radial-gradient(#c8d3de 1px, transparent 0)",
            backgroundSize: "22px 22px",
          }}
          onMouseDown={onCanvasMouseDown}
          onMouseMove={onCanvasMouseMove}
          onMouseUp={onCanvasMouseUp}
          onMouseLeave={onCanvasMouseUp}
          onContextMenu={e => e.preventDefault()}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {/* Top-right canvas overlay: Graph Config */}
          <div className="absolute top-0 right-0 z-20 h-14 flex items-center gap-4 px-7 pointer-events-none">
            <div ref={graphConfigRef} className="relative pointer-events-auto">
              <button
                type="button"
                onClick={() => setShowGraphConfig((v) => !v)}
                className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 transition-colors"
              >
                Graph Config
                <ChevronDown size={11} className={`transition-transform ${showGraphConfig ? "rotate-180" : ""}`} />
              </button>
              {showGraphConfig && (
                <div className="absolute right-0 top-full mt-1.5 w-56 bg-white border border-gray-200 rounded-xl shadow-xl z-30 py-1 overflow-hidden text-left">
                  <div className="px-3 py-1.5 text-xs text-gray-400 border-b border-gray-50">Display</div>
                  {([
                    { label: "Status legend", checked: showLegend, onToggle: () => setShowLegend(v => !v) },
                    { label: "Node parameters", checked: showParams, onToggle: () => setShowParams(v => !v) },
                  ] as const).map(({ label, checked, onToggle }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={onToggle}
                      className="w-full flex items-center justify-between gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
                    >
                      <span>{label}</span>
                      <span className={`w-8 h-4 rounded-full transition-colors relative shrink-0 ${checked ? "bg-teal-500" : "bg-gray-300"}`}>
                        <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${checked ? "left-4.5" : "left-0.5"}`} />
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Transform wrapper — sized to the graph bounds so no node is clipped. */}
          <div style={{
            position: "absolute",
            left: 0, top: 0,
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "0 0",
            width: canvasBounds(nodes).w,
            height: canvasBounds(nodes).h,
          }}>
            <CanvasEdges
              nodes={nodes}
              edges={edges}
              instanceView={instanceView}
              nodeStatuses={nodeStatuses}
            />
            {nodes.map(node => (
              <PipelineNodeCard
                key={node.id}
                node={showParams ? node : { ...node, params: [] }}
                selected={selectedNodeId === node.id}
                instanceView={instanceView}
                nodeStatus={nodeStatuses?.[node.id]}
                ports={!instanceView}
                onDragStart={(e) => {
                  // Pan mode (and read-only Instance View) pan from a node too, so the
                  // whole canvas is draggable no matter what is under the cursor.
                  if (effectiveTool === "pan" || e.altKey) { onNodePanMouseDown(e); return; }
                  handleNodeDragStart(node.id, e);
                }}
                onClick={() => {
                  if (dragMoved.current) { dragMoved.current = false; return; }
                  setSelectedNodeId(n => n === node.id ? null : node.id);
                }}
              />
            ))}
          </div>

          {/* No-selection hint */}
          {!selectedNodeId && <CanvasEmptyHint />}

          {/* Bottom-left controls */}
          <div className="absolute bottom-4 left-4 flex flex-col gap-2 z-10">
            <div className="flex items-center gap-2">
              <ZoomControls zoom={zoom} onZoom={handleZoomBtn} onFit={fitToScreen} />
              <CanvasToolbar
                tool={effectiveTool}
                onTool={setTool}
                onAutoLayout={autoLayout}
                editable={!instanceView}
              />
            </div>
            <Minimap nodes={nodes} edges={edges} pan={pan} zoom={zoom} cw={containerSize.w} ch={containerSize.h} />
          </div>

          {/* Bottom hint — describes the gesture that actually works in this mode. */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-gray-400 whitespace-nowrap pointer-events-none">
            {instanceView
              ? "Drag to pan · Scroll to zoom · Click a node for its run detail"
              : effectiveTool === "select"
                ? "Drag a node to reposition · Scroll to zoom · Alt-drag to pan"
                : "Drag to pan · Scroll to zoom · Switch to Select to move nodes"}
          </div>
        </div>

        {/* Right panel */}
        {selectedNodeId && (() => {
          const node = nodes.find(n => n.id === selectedNodeId)!;
          const fgSnapshot = node.type === "feature"
            ? canvasSnapshot?.featureGroups?.[node.title]
            : undefined;
          return (
            <NodeConfigPanel
              node={node}
              onClose={() => setSelectedNodeId(null)}
              frameTableInitial={canvasSnapshot?.frameTable}
              ingestionConfig={canvasSnapshot?.dataIngestion}
              dataCleaningEnabled={Boolean(canvasSnapshot?.dataCleaning?.enabled)}
              featureGroupInitial={fgSnapshot}
              instance={selectedInst}
              nodeStatus={nodeStatuses?.[node.id]}
            />
          );
        })()}
      </div>

      {/* Modals */}
      {showMetaModal && (
        <WideTableMetaModal
          values={meta}
          readOnly={viewMode === "instance-view"}
          onClose={() => setShowMetaModal(false)}
          onSave={
            viewMode === "instance-view"
              ? undefined
              : (u) => {
                  setMeta(u);
                  setShowMetaModal(false);
                }
          }
        />
      )}
      {showTriggerModal && (
        <TriggerInstanceModal onClose={() => setShowTriggerModal(false)} onTrigger={handleTrigger} />
      )}
      <ExecuteConfigModal open={showExecConfig} onClose={() => setShowExecConfig(false)} />
    </div>
  );
}