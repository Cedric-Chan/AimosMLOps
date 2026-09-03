import { useEffect, useMemo, useState } from "react";
import {
  GitBranch,
  X,
  Zap,
  Layers,
  Database,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  ShieldCheck,
  Code2,
  ChevronDown,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type TaskType = "SparkBatch" | "FlinkStream" | "HiveETL" | "FGServingCanvas";
type LogicLanguage = "SQL" | "Flink SQL" | "Python" | "Groovy";

export interface FeatureLineageNode {
  id: string;
  taskName: string;
  taskType: TaskType;
  inputAssets: string[];
  outputAsset: string;
  ownerTeam: string;
  dataverseUrl?: string;
  featureLogicSnippet: string;
  logicLanguage: LogicLanguage;
  reviewStatus: "AI-Draft" | "Human-Reviewed" | "Auto-Merged";
}

export interface FeatureLineageChain {
  nodes: FeatureLineageNode[];
  fgNode?: FeatureLineageNode;
}

export interface FeatureLineagePayload {
  featureName: string;
  training?: FeatureLineageChain;
  serving?: FeatureLineageChain;
}

// ─── Visual config ────────────────────────────────────────────────────────────
const TASK_TYPE_STYLE: Record<TaskType, { label: string; cls: string; icon: React.ReactNode }> = {
  SparkBatch:      { label: "Spark Batch",      cls: "bg-blue-50 text-blue-700 border-blue-200",       icon: <Layers className="w-3 h-3" /> },
  FlinkStream:     { label: "Flink Stream",     cls: "bg-violet-50 text-violet-700 border-violet-200", icon: <Zap className="w-3 h-3" /> },
  HiveETL:         { label: "Hive ETL",         cls: "bg-amber-50 text-amber-700 border-amber-200",    icon: <Database className="w-3 h-3" /> },
  FGServingCanvas: { label: "FG Serving Canvas",cls: "bg-teal-50 text-teal-700 border-teal-300",       icon: <Code2 className="w-3 h-3" /> },
};

const REVIEW_STYLE: Record<FeatureLineageNode["reviewStatus"], { cls: string; icon: React.ReactNode }> = {
  "AI-Draft":       { cls: "bg-sky-50 text-sky-700 border-sky-200",             icon: <Sparkles className="w-3 h-3" /> },
  "Human-Reviewed": { cls: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: <ShieldCheck className="w-3 h-3" /> },
  "Auto-Merged":    { cls: "bg-teal-50 text-teal-700 border-teal-200",          icon: <CheckCircle2 className="w-3 h-3" /> },
};

const FG_TERMINAL_ID = "__fg__";

// ─── Mock lineage payloads ────────────────────────────────────────────────────
const MOCK_FEATURE_LINEAGE: Record<string, FeatureLineagePayload> = {
  risk_score: {
    featureName: "risk_score",
    training: {
      nodes: [
        {
          id: "n-t-1",
          taskName: "ods_user_credit_events",
          taskType: "HiveETL",
          inputAssets: ["binlog.user_credit_events"],
          outputAsset: "ods.user_credit_events",
          ownerTeam: "dw-team",
          dataverseUrl: "#",
          logicLanguage: "SQL",
          reviewStatus: "Auto-Merged",
          featureLogicSnippet:
`-- Pass-through ingest: raw events that feed risk_score
SELECT user_id,
       event_type,
       amount,
       event_ts
FROM binlog.user_credit_events
WHERE dt = '\${dt}';`,
        },
        {
          id: "n-t-2",
          taskName: "dwd_user_credit_30d_agg",
          taskType: "SparkBatch",
          inputAssets: ["ods.user_credit_events"],
          outputAsset: "dwd.user_credit_30d_features",
          ownerTeam: "dw-team",
          dataverseUrl: "#",
          logicLanguage: "SQL",
          reviewStatus: "Human-Reviewed",
          featureLogicSnippet:
`-- AI-extracted: only fragments contributing to risk_score
SELECT user_id,
       SUM(CASE WHEN event_type='OVERDUE' THEN amount END) AS overdue_amt_30d,
       COUNT(CASE WHEN event_type='REPAY'  THEN 1 END)    AS repay_cnt_30d
FROM ods.user_credit_events
WHERE dt BETWEEN DATE_SUB('\${dt}',30) AND '\${dt}'
GROUP BY user_id;`,
        },
        {
          id: "n-t-3",
          taskName: "ads_user_risk_score_ods",
          taskType: "SparkBatch",
          inputAssets: ["dwd.user_credit_30d_features", "dim.user_meta"],
          outputAsset: "risk_db.user_risk_score_ods",
          ownerTeam: "risk-team",
          dataverseUrl: "#",
          logicLanguage: "SQL",
          reviewStatus: "AI-Draft",
          featureLogicSnippet:
`-- Final scoring step: column \`risk_score\`
SELECT user_id,
       LEAST(999,
             GREATEST(300,
                ROUND(600
                  + 1.5 * COALESCE(repay_cnt_30d,0)
                  - 0.8 * COALESCE(overdue_amt_30d,0)/100)
             )) AS risk_score
FROM dwd.user_credit_30d_features
WHERE dt = '\${dt}';`,
        },
      ],
    },
    serving: {
      nodes: [
        {
          id: "n-s-1",
          taskName: "credit_events_kafka_source",
          taskType: "FlinkStream",
          inputAssets: ["kafka.credit_events"],
          outputAsset: "stream.credit_events_enriched",
          ownerTeam: "realtime-team",
          dataverseUrl: "#",
          logicLanguage: "Flink SQL",
          reviewStatus: "Auto-Merged",
          featureLogicSnippet:
`CREATE TABLE credit_events_src (
  user_id STRING,
  event_type STRING,
  amount DECIMAL(18,2),
  event_ts TIMESTAMP(3),
  WATERMARK FOR event_ts AS event_ts - INTERVAL '5' SECOND
) WITH ('connector'='kafka', 'topic'='credit_events', ...);`,
        },
        {
          id: "n-s-2",
          taskName: "credit_risk_score_realtime",
          taskType: "FlinkStream",
          inputAssets: ["stream.credit_events_enriched"],
          outputAsset: "hbase.user_risk:cf:risk_score_raw",
          ownerTeam: "realtime-team",
          dataverseUrl: "#",
          logicLanguage: "Flink SQL",
          reviewStatus: "Human-Reviewed",
          featureLogicSnippet:
`-- AI-extracted: writes raw risk_score_raw to HBase (FeatureSource)
INSERT INTO user_risk_hbase_sink
SELECT user_id,
       LEAST(999,
             GREATEST(300,
                ROUND(600
                  + 1.5 * repay_cnt_30d_rt
                  - 0.8 * overdue_amt_30d_rt/100)
             )) AS risk_score_raw
FROM TABLE(TUMBLE(TABLE credit_events_src, DESCRIPTOR(event_ts), INTERVAL '1' MINUTE));`,
        },
      ],
      fgNode: {
        id: FG_TERMINAL_ID,
        taskName: "credit_hbase_user_risk · ID · V1",
        taskType: "FGServingCanvas",
        inputAssets: ["hbase.user_risk:cf:risk_score_raw  (via FeatureSource credit_hbase_user_risk)"],
        outputAsset: "feature: risk_score",
        ownerTeam: "risk-team",
        logicLanguage: "Groovy",
        reviewStatus: "Human-Reviewed",
        featureLogicSnippet:
`// FG Serving Canvas — Groovy region script (ID · V1)
// Input:  hbase.user_risk:cf:risk_score_raw
// Output: feature risk_score (fine feature after filter + cap)

def raw = HBaseCall.query(
    tableName: "user_risk",
    rowKey: input.user_id,
    qualifier: "cf:risk_score_raw"
)

if (raw == null || raw.risk_score_raw == null) {
    output.risk_score = -1
    return
}

def score = raw.risk_score_raw as int

// Filter: treat blacklisted users as highest risk
if (input.is_blacklisted) {
    output.risk_score = 999
    return
}

// Cap: clamp to valid range [300, 900]
output.risk_score = Math.max(300, Math.min(900, score))`,
      },
    },
  },
};

function getMockLineage(featureName: string): FeatureLineagePayload {
  const exact = MOCK_FEATURE_LINEAGE[featureName];
  if (exact) return exact;
  return {
    featureName,
    training: {
      nodes: [
        {
          id: "g-t-1", taskName: `ods_${featureName}_raw`, taskType: "HiveETL",
          inputAssets: [`binlog.${featureName}_src`], outputAsset: `ods.${featureName}_raw`,
          ownerTeam: "dw-team", dataverseUrl: "#", logicLanguage: "SQL", reviewStatus: "Auto-Merged",
          featureLogicSnippet:
`-- Raw ingest for ${featureName}
SELECT entity_id, raw_value, ds
FROM binlog.${featureName}_src
WHERE dt = '\${dt}';`,
        },
        {
          id: "g-t-2", taskName: `dwd_${featureName}_agg`, taskType: "SparkBatch",
          inputAssets: [`ods.${featureName}_raw`], outputAsset: `dwd.${featureName}_features`,
          ownerTeam: "dw-team", dataverseUrl: "#", logicLanguage: "SQL", reviewStatus: "Human-Reviewed",
          featureLogicSnippet:
`-- AI-extracted: derivation of ${featureName}
SELECT entity_id,
       AVG(raw_value) AS ${featureName}
FROM ods.${featureName}_raw
WHERE dt BETWEEN DATE_SUB('\${dt}',7) AND '\${dt}'
GROUP BY entity_id;`,
        },
      ],
    },
    serving: {
      nodes: [
        {
          id: "g-s-1", taskName: `${featureName}_stream`, taskType: "FlinkStream",
          inputAssets: [`kafka.${featureName}_events`], outputAsset: `hbase.feat:${featureName}_raw`,
          ownerTeam: "realtime-team", dataverseUrl: "#", logicLanguage: "Flink SQL", reviewStatus: "AI-Draft",
          featureLogicSnippet:
`INSERT INTO feat_sink
SELECT entity_id, LAST_VALUE(raw_value) AS ${featureName}_raw
FROM TABLE(TUMBLE(TABLE ${featureName}_events_src, DESCRIPTOR(event_ts), INTERVAL '1' MINUTE));`,
        },
      ],
      fgNode: {
        id: FG_TERMINAL_ID,
        taskName: `FG Serving Canvas · ${featureName}`,
        taskType: "FGServingCanvas",
        inputAssets: [`hbase.feat:${featureName}_raw  (via FeatureSource)`],
        outputAsset: `feature: ${featureName}`,
        ownerTeam: "feature-team",
        logicLanguage: "Groovy",
        reviewStatus: "AI-Draft",
        featureLogicSnippet:
`// FG Serving Canvas — Groovy region script
def raw = HBaseCall.query(tableName: "feat", rowKey: input.entity_id, qualifier: "${featureName}_raw")
output.${featureName} = raw?.${featureName}_raw ?: -1`,
      },
    },
  };
}

// ─── Helpers: build storage-node list from chain ──────────────────────────────
interface PathLayer {
  label: string;
  color: "emerald" | "violet";
  chain: FeatureLineageChain;
}

function buildStorageGraph(chain: FeatureLineageChain, fallbackName: string): {
  storageNames: string[];
  connectors: (FeatureLineageNode | null)[];
  terminalLabel: string;
} {
  const storageNames: string[] = [];
  const connectors: (FeatureLineageNode | null)[] = [];

  if (chain.nodes.length === 0) {
    return { storageNames, connectors, terminalLabel: fallbackName };
  }

  // First storage = first input asset of first node
  storageNames.push(chain.nodes[0].inputAssets[0] || "?");
  for (let i = 0; i < chain.nodes.length; i++) {
    connectors.push(chain.nodes[i]);
    storageNames.push(chain.nodes[i].outputAsset);
  }
  // If there's a fgNode, it's a connector
  if (chain.fgNode) {
    connectors.push(chain.fgNode);
    storageNames.push(chain.fgNode.outputAsset.replace(/^feature:\s*/, ""));
  } else {
    connectors.push(null);
    storageNames.push(fallbackName);
  }

  return { storageNames, connectors, terminalLabel: storageNames[storageNames.length - 1] };
}

// ─── Component ────────────────────────────────────────────────────────────────
export function FeatureLineageModal({
  open,
  featureName,
  hasTraining,
  hasServing,
  onClose,
}: {
  open: boolean;
  featureName: string;
  hasTraining: boolean;
  hasServing: boolean;
  onClose: () => void;
}) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSelectedNodeId(null);
  }, [open, featureName]);

  const payload = useMemo(() => getMockLineage(featureName), [featureName]);

  type GraphRow = { label: string; color: "emerald" | "violet"; storageNames: string[]; connectors: (FeatureLineageNode | null)[] };
  const rows = useMemo<GraphRow[]>(() => {
    const r: GraphRow[] = [];
    if (hasTraining && payload.training) {
      const g = buildStorageGraph(payload.training, featureName);
      r.push({ label: "Training Path", color: "emerald", storageNames: g.storageNames, connectors: g.connectors });
    }
    if (hasServing && payload.serving) {
      const g = buildStorageGraph(payload.serving, featureName);
      r.push({ label: "Serving Path", color: "violet", storageNames: g.storageNames, connectors: g.connectors });
    }
    return r;
  }, [hasTraining, hasServing, payload, featureName]);

  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    // search both chains
    for (const chain of [payload.training, payload.serving]) {
      if (!chain) continue;
      for (const n of chain.nodes) if (n.id === selectedNodeId) return n;
      if (chain.fgNode?.id === selectedNodeId) return chain.fgNode;
    }
    return null;
  }, [selectedNodeId, payload]);

  // Build union set of all storage names across both rows to align column widths
  const maxCols = useMemo(() => Math.max(...rows.map(r => r.storageNames.length), 0), [rows]);

  if (!open) return null;

  const hasAny = rows.length > 0;
  const isFgNodeSelected = selectedNode?.id === FG_TERMINAL_ID;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-5xl mx-4 max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-500 flex items-center justify-center flex-shrink-0 shadow-sm shadow-teal-200 mt-0.5">
              <GitBranch className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-slate-800 text-base font-semibold">Feature Trace</h2>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">
                <span className="text-teal-700">{featureName}</span>
                <span className="mx-1.5 text-slate-300">·</span>
                <span className="text-slate-500">Full pipeline topology · AI-extracted logic</span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {hasAny ? (
            <>
              {/* ── Full Pipeline Topology ─────────────────────────────── */}
              <div className="px-4 sm:px-6 py-5">
                <div className="flex items-center gap-2 mb-5 text-[11px] text-slate-400 uppercase tracking-wider">
                  <GitBranch className="w-3 h-3 text-teal-500" />
                  <span>Full pipeline topology</span>
                  <span className="text-slate-300">—</span>
                  <span className="text-slate-500 normal-case tracking-normal">from raw data to fine feature</span>
                </div>

                <div className="rounded-2xl bg-gradient-to-b from-slate-50/80 to-white border border-slate-200/80 p-4 sm:p-6 shadow-sm">
                  {rows.map((row, ri) => {
                    const colCls = row.color === "emerald"
                      ? "bg-emerald-50/60 text-emerald-800 border-emerald-200 hover:bg-emerald-100/80"
                      : "bg-violet-50/60 text-violet-800 border-violet-200 hover:bg-violet-100/80";
                    const dotCls = row.color === "emerald" ? "bg-emerald-400" : "bg-violet-400";
                    const labelCls = row.color === "emerald"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                      : "bg-violet-50 border-violet-200 text-violet-700";

                    return (
                      <div key={row.label}>
                        {ri > 0 && <div className="my-4 border-t border-slate-100" />}
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full ${labelCls} border text-[10px] font-semibold`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${dotCls}`} />
                            {row.label}
                          </span>
                        </div>

                        {/* Storage nodes + connectors row */}
                        <div className="grid gap-2 mb-4" style={{ gridTemplateColumns: `repeat(${maxCols}, minmax(0, 1fr))` }}>
                          {row.storageNames.map((name, si) => {
                            const conn = si < row.connectors.length ? row.connectors[si] : null;
                            const isLast = si === row.storageNames.length - 1;
                            const isBeforeConn = si < row.storageNames.length - 1;
                            return (
                              <div key={`${row.label}-${si}`} className="flex items-center gap-1 min-w-0">
                                {/* Storage node */}
                                <button
                                  className={`relative rounded-xl border px-3 py-2.5 text-xs transition-all text-center w-full hover:shadow-sm hover:scale-[1.02] ${
                                    isLast
                                      ? "bg-teal-600 text-white border-teal-600 hover:bg-teal-700"
                                      : colCls
                                  }`}
                                  style={{ whiteSpace: "pre-line", wordBreak: "break-word" }}
                                  title={name}
                                >
                                  {!isLast && <span className={`absolute top-1.5 left-1.5 w-1.5 h-1.5 rounded-full ${dotCls}`} />}
                                  <span className={isLast ? "" : "ml-1"}>{name}</span>
                                </button>

                                {/* Connector arrow to next storage — if a pipeline task exists */}
                                {conn && si < row.connectors.length ? (
                                  <>
                                    <div className="flex items-center justify-center flex-shrink-0 px-0.5">
                                      <svg width="20" height="12" viewBox="0 0 20 12" className="text-slate-300">
                                        <path d="M0 4h14v3H0z" fill="currentColor" className="opacity-40" />
                                        <path d="M14 0l5 5.5L14 11" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                      </svg>
                                    </div>
                                  </>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>

                        {/* Pipeline task connectors as clickable badges below the arrows */}
                        <div className="flex items-center h-6">
                          {Array.from({ length: maxCols - 1 }).map((_, ci) => {
                            const conn = ci < row.connectors.length - 1 ? row.connectors[ci] : null;
                            if (!conn) return <div key={ci} className="flex-1 flex items-center justify-center" />;
                            const ts = TASK_TYPE_STYLE[conn.taskType];
                            const isSel = selectedNodeId === conn.id;
                            return (
                              <div key={ci} className="flex-1 flex items-center justify-center">
                                <button
                                  onClick={() => setSelectedNodeId(isSel ? null : conn.id)}
                                  className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-medium transition-all ${
                                    isSel
                                      ? "bg-teal-500 border-teal-500 text-white shadow-sm"
                                      : "bg-white border-slate-200 text-slate-500 hover:border-teal-400 hover:text-teal-600"
                                  }`}
                                >
                                  <span className="truncate max-w-[110px]" title={conn.taskName}>{conn.taskName}</span>
                                  <ChevronDown className={`w-3 h-3 flex-shrink-0 transition-transform ${isSel ? "rotate-180" : ""}`} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {/* Fine Feature terminal — shared by both paths */}
                  <div className="flex justify-center pt-2">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl border px-3 py-2.5 text-xs text-center bg-teal-600 text-white border-teal-600 shadow-sm">
                        {featureName}
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-200 text-[10px] font-medium text-teal-700">
                        <CheckCircle2 className="w-3 h-3" />
                        Fine Feature
                      </span>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="mt-5 flex flex-wrap gap-x-4 gap-y-1.5 text-[10px] px-1">
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <span className="w-2 h-2 rounded-sm border border-slate-300 bg-slate-50" />
                      External source
                    </span>
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <span className="w-2 h-2 rounded-sm bg-emerald-100 border border-emerald-200" />
                      Training (Hive)
                    </span>
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <span className="w-2 h-2 rounded-sm bg-violet-100 border border-violet-200" />
                      Serving (Kafka/Flink/HBase)
                    </span>
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <span className="w-2 h-2 rounded-sm bg-teal-600 border border-teal-600" />
                      Fine Feature
                    </span>
                  </div>
                </div>
              </div>

              {/* ── Selected Pipeline Task Detail (AI-KAG) ────────────── */}
              {selectedNode && (
                <div className="px-4 sm:px-6 pb-6 space-y-5">
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 uppercase tracking-wider">
                    <Sparkles className="w-3 h-3 text-teal-500" />
                    <span>AI-distilled processing logic</span>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                    {/* Detail card */}
                    <div className="rounded-xl border border-slate-200 overflow-hidden">
                      <div className="px-4 py-3 bg-slate-50/60 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border ${TASK_TYPE_STYLE[selectedNode.taskType].cls}`}>
                            {TASK_TYPE_STYLE[selectedNode.taskType].icon}
                            {TASK_TYPE_STYLE[selectedNode.taskType].label}
                          </span>
                          <span className="text-xs font-mono text-slate-800">{selectedNode.taskName}</span>
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${REVIEW_STYLE[selectedNode.reviewStatus].cls}`}>
                            {REVIEW_STYLE[selectedNode.reviewStatus].icon}
                            {selectedNode.reviewStatus}
                          </span>
                        </div>
                        {selectedNode.dataverseUrl ? (
                          <a href={selectedNode.dataverseUrl} target="_blank" rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-teal-600 hover:text-teal-800">
                            View in DataVerse <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">FeatureStore internal</span>
                        )}
                      </div>

                      <div className="px-4 py-3 grid grid-cols-2 gap-3 text-[11px] border-b border-slate-100">
                        <div>
                          <div className="text-slate-400 uppercase tracking-wide text-[10px] mb-1">Input</div>
                          <div className="flex flex-wrap gap-1">
                            {selectedNode.inputAssets.map((a) => (
                              <span key={a} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono border border-slate-200">{a}</span>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-400 uppercase tracking-wide text-[10px] mb-1">Output</div>
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono border border-slate-200">{selectedNode.outputAsset}</span>
                        </div>
                        <div>
                          <div className="text-slate-400 uppercase tracking-wide text-[10px] mb-1">Owner</div>
                          <span className="text-slate-700">{selectedNode.ownerTeam}</span>
                        </div>
                        <div>
                          <div className="text-slate-400 uppercase tracking-wide text-[10px] mb-1">Language</div>
                          <span className="text-slate-700">{selectedNode.logicLanguage}</span>
                        </div>
                      </div>

                      <div className="bg-slate-900 text-slate-100 px-4 py-3 font-mono text-[11.5px] leading-relaxed overflow-x-auto">
                        <div className="flex items-center gap-2 mb-2 text-[10px] uppercase tracking-wide text-slate-400">
                          <Sparkles className="w-3 h-3 text-amber-300" />
                          {isFgNodeSelected
                            ? <span>FG Serving Canvas · Groovy script for <span className="text-teal-300">{featureName}</span></span>
                            : <span>AI-extracted · fragments related to <span className="text-teal-300">{featureName}</span></span>
                          }
                        </div>
                        <pre className="whitespace-pre">{selectedNode.featureLogicSnippet}</pre>
                      </div>
                    </div>

                    {/* Summary card */}
                    <div className="space-y-3">
                      <div className={`rounded-xl border px-4 py-3 ${isFgNodeSelected
                        ? "bg-teal-50/60 border-teal-200"
                        : "bg-slate-50/60 border-slate-200"
                      }`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold ${TASK_TYPE_STYLE[selectedNode.taskType].cls}`}>
                            {TASK_TYPE_STYLE[selectedNode.taskType].icon}
                            {TASK_TYPE_STYLE[selectedNode.taskType].label}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-relaxed">
                          {isFgNodeSelected
                            ? `FG Serving Canvas · Groovy region script (${selectedNode.ownerTeam}) · Consumed by Serving API as the final Fine Feature.`
                            : `${selectedNode.inputAssets[0] || "?"} → ${selectedNode.outputAsset} · ${selectedNode.logicLanguage} · ${selectedNode.ownerTeam}`
                          }
                        </p>
                      </div>
                      <div className={`rounded-xl border px-4 py-3 ${
                        selectedNode.reviewStatus === "AI-Draft"
                          ? "bg-sky-50/60 border-sky-200"
                          : "bg-emerald-50/60 border-emerald-200"
                      }`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold ${REVIEW_STYLE[selectedNode.reviewStatus].cls}`}>
                            {REVIEW_STYLE[selectedNode.reviewStatus].icon}
                            {selectedNode.reviewStatus}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-relaxed">
                          {selectedNode.reviewStatus === "AI-Draft"
                            ? "Logic auto-extracted by AI Agent from upstream code repositories (Git). Pending human review for approval."
                            : selectedNode.reviewStatus === "Human-Reviewed"
                            ? "AI-extracted logic has been reviewed and approved by human. Production-ready."
                            : "Logic auto-merged from upstream pipeline metadata. Verified by DataVerse consistency check."
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="px-6 py-12 text-center text-sm text-slate-400">
              No lineage available for this feature.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/40 text-[11px] text-slate-500 flex items-center justify-between flex-shrink-0">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-amber-500" />
            Logic extracted by AI agent · pending human review where marked <span className="px-1 rounded bg-sky-50 text-sky-700 border border-sky-200">AI-Draft</span>
          </span>
          <button onClick={onClose} className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-teal-400 hover:text-teal-600 transition-colors text-xs">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
