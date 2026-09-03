/** Serializable DAG + panel state for WideTable canvas (mock / copy snapshot). */

export type NodeId = "B" | "C" | "D" | "E" | "F";

export interface NodeDef {
  id: NodeId;
  type: "source" | "feature" | "sink" | "end";
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  subtitle: string;
}

export const CANVAS_W = 1060;
export const CANVAS_H = 520;

/** Default DAG — Feature Groups → Data Ingestion */
export const INITIAL_NODES: NodeDef[] = [
  { id: "B", type: "source", x: 96, y: 224, w: 144, h: 72, title: "Frame Table", subtitle: "Source Table" },
  { id: "C", type: "feature", x: 300, y: 108, w: 185, h: 72, title: "user_profile_features", subtitle: "Feature Group" },
  { id: "D", type: "feature", x: 300, y: 224, w: 185, h: 72, title: "order_history_features", subtitle: "Feature Group" },
  { id: "E", type: "feature", x: 300, y: 340, w: 185, h: 72, title: "credit_behavior_features", subtitle: "Feature Group" },
  { id: "F", type: "sink", x: 640, y: 224, w: 220, h: 72, title: "Data Ingestion", subtitle: "Wide table ingestion" },
];

export const EDGES: [NodeId, NodeId][] = [
  ["B", "C"],
  ["B", "D"],
  ["B", "E"],
  ["C", "F"],
  ["D", "F"],
  ["E", "F"],
];

export interface FrameTableSnapshot {
  sourceType: "hive" | "sql";
  dataServer: string;
  tableSchema: string;
  tableName: string;
  sql: string;
  customFilter: string;
  entityCols: string[];
  eventTimeCol: string;
}

export interface DataCleaningSnapshot {
  enabled: boolean;
  fillnaRows: { id: string; method: string; features: string; fixedValue?: string }[];
  vmRows: { id: string; feature: string; sql: string }[];
}

export interface FeatureGroupNodeSnapshot {
  selectedFg: string;
  joinType: string;
  entityJoinCol: string;
  eventTimeJoinCol: string;
}

/** Data Ingestion node (read-only mock paths; clean outputs when list-level cleaning is enabled) */
export interface DataIngestionConfigSnapshot {
  rawTable: string;
  datePart: string;
  /** Data report path (e.g. raw stats JSON) */
  rawS3: string;
  /** Hive table after cleaning; shown when Data Cleaning is enabled */
  cleanedTable?: string;
  /** Clean data report path; shown when Data Cleaning is enabled */
  cleanedReportPath?: string;
}

export interface WideTableCanvasSnapshot {
  nodes: NodeDef[];
  frameTable: FrameTableSnapshot;
  dataCleaning: DataCleaningSnapshot;
  featureGroups: Partial<Record<"C" | "D" | "E", FeatureGroupNodeSnapshot>>;
  /** Optional; defaults to generic mock paths in panels */
  dataIngestion?: DataIngestionConfigSnapshot;
}

const JOIN_DEFAULT = "Left Latest Join";

export function createDefaultCanvasSnapshot(): WideTableCanvasSnapshot {
  return {
    nodes: INITIAL_NODES.map((n) => ({ ...n })),
    dataIngestion: {
      rawTable: "feature_store.dwd_wide_raw_feat_v1",
      datePart: "ds",
      rawS3: "s3://data-lake-prod/widetable/reports/ts_demo/20240315/raw_stats.json",
      cleanedTable: "feature_store.dwd_wide_clean_feat_v1",
      cleanedReportPath:
        "s3://data-lake-prod/widetable/reports/ts_demo/20240315/clean_stats.json",
    },
    frameTable: {
      sourceType: "hive",
      dataServer: "reg_sg",
      tableSchema: "",
      tableName: "",
      sql: "",
      customFilter: "",
      entityCols: [],
      eventTimeCol: "",
    },
    dataCleaning: {
      enabled: false,
      fillnaRows: [],
      vmRows: [],
    },
    featureGroups: {
      C: {
        selectedFg: "user_profile_features",
        joinType: JOIN_DEFAULT,
        entityJoinCol: "",
        eventTimeJoinCol: "",
      },
      D: {
        selectedFg: "order_history_features",
        joinType: JOIN_DEFAULT,
        entityJoinCol: "",
        eventTimeJoinCol: "",
      },
      E: {
        selectedFg: "credit_behavior_features",
        joinType: JOIN_DEFAULT,
        entityJoinCol: "",
        eventTimeJoinCol: "",
      },
    },
  };
}

function cloneNodes(nodes: NodeDef[]): NodeDef[] {
  return nodes.map((n) => ({ ...n }));
}

/** Risk / TH — slightly offset FG node + hive frame ref */
export function snapshotRiskWideTable(): WideTableCanvasSnapshot {
  const base = createDefaultCanvasSnapshot();
  return {
    ...base,
    nodes: cloneNodes([
      { id: "B", type: "source", x: 88, y: 220, w: 144, h: 72, title: "Frame Table", subtitle: "Source Table" },
      { id: "C", type: "feature", x: 292, y: 100, w: 185, h: 72, title: "user_profile_features", subtitle: "Feature Group" },
      { id: "D", type: "feature", x: 292, y: 220, w: 185, h: 72, title: "order_history_features", subtitle: "Feature Group" },
      { id: "E", type: "feature", x: 292, y: 336, w: 185, h: 72, title: "credit_behavior_features", subtitle: "Feature Group" },
      { id: "F", type: "sink", x: 632, y: 220, w: 220, h: 72, title: "Data Ingestion", subtitle: "Wide table ingestion" },
    ]),
    frameTable: {
      sourceType: "hive",
      dataServer: "reg_sg",
      tableSchema: "feature_store",
      tableName: "frame_risk_events_th",
      sql: "",
      customFilter: "ds >= '2026-01-01'",
      entityCols: ["user_id"],
      eventTimeCol: "event_time",
    },
    dataCleaning: {
      enabled: true,
      fillnaRows: [{ id: "fn-mock-1", method: "median", features: "credit_score, overdue_cnt" }],
      vmRows: [{ id: "vm-mock-1", feature: "risk_band", sql: "CASE WHEN credit_score >= 700 THEN 'low' ELSE 'high' END" }],
    },
    dataIngestion: {
      rawTable: "feature_store.dwd_wide_raw_risk_th",
      datePart: "ds",
      rawS3: "s3://data-lake-prod/widetable/reports/risk_th/20260217/raw_stats.json",
      cleanedTable: "feature_store.dwd_wide_clean_feat_v1",
      cleanedReportPath:
        "s3://data-lake-prod/widetable/reports/ts_demo/20240315/clean_stats.json",
    },
    featureGroups: {
      ...base.featureGroups,
      C: { ...base.featureGroups.C!, entityJoinCol: "user_id", eventTimeJoinCol: "profile_ts" },
    },
  };
}

/** MX ACard — different FG titles on nodes */
export function snapshotAcardMx(): WideTableCanvasSnapshot {
  const base = createDefaultCanvasSnapshot();
  const nodes = cloneNodes(base.nodes);
  const c = nodes.find((n) => n.id === "C")!;
  const d = nodes.find((n) => n.id === "D")!;
  c.title = "mx_user_demographics";
  d.title = "mx_repayment_behavior";
  return {
    ...base,
    nodes,
    frameTable: {
      sourceType: "hive",
      dataServer: "reg_us",
      tableSchema: "acard_mx",
      tableName: "frame_acard_events",
      sql: "",
      customFilter: "",
      entityCols: ["user_id"],
      eventTimeCol: "event_time",
    },
    dataCleaning: { enabled: false, fillnaRows: [], vmRows: [] },
  };
}

/** Recommend SG */
export function snapshotRecommendSg(): WideTableCanvasSnapshot {
  const base = createDefaultCanvasSnapshot();
  const nodes = cloneNodes(base.nodes);
  nodes.find((n) => n.id === "C")!.title = "rec_user_embedding";
  nodes.find((n) => n.id === "D")!.title = "item_affinity_features";
  nodes.find((n) => n.id === "E")!.title = "context_session_features";
  return {
    ...base,
    nodes,
    frameTable: {
      sourceType: "sql",
      dataServer: "reg_sg",
      tableSchema: "",
      tableName: "",
      sql: "SELECT user_id, item_id, event_time, score\nFROM rec.raw_user_item_events\nWHERE ds = '${ds}'",
      customFilter: "",
      entityCols: [],
      eventTimeCol: "",
    },
  };
}
