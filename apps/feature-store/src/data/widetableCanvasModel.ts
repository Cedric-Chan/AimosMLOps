/** Serializable DAG + panel state for WideTable canvas (mock / copy snapshot). */

import { fgColumnCount } from "@/data/featureGroupCatalog";

/**
 * Node ids are opaque strings: a WideTable fans in an unbounded number of Feature
 * Groups (a production WideTable runs 19), so the
 * canvas must not cap the graph at a fixed roster of ids.
 */
export type NodeId = string;

/** One `label: value` row rendered inside a node card (e.g. `Join` / `Columns`). */
export interface NodeParam {
  label: string;
  value: string;
}

export interface NodeDef {
  id: NodeId;
  type: "source" | "feature" | "sink" | "end";
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  subtitle: string;
  /** Facts the node carries on the canvas — production shows Join/Columns rows. */
  params?: NodeParam[];
}

export type CanvasEdge = [NodeId, NodeId];

/** Node card width, matching the production canvas (`w-[240px]`). */
export const NODE_W = 240;

/** Card height grows one row per param beyond the header's two-row budget. */
export function nodeHeight(params: NodeParam[] = []): number {
  return 112 + Math.max(0, params.length - 2) * 24;
}

export interface CanvasBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  w: number;
  h: number;
}

/** Canvas extents derived from node positions, so any node count lays out correctly. */
export function canvasBounds(nodes: NodeDef[]): CanvasBounds {
  if (nodes.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0, w: 0, h: 0 };
  const xs = nodes.flatMap((n) => [n.x, n.x + n.w]);
  const ys = nodes.flatMap((n) => [n.y, n.y + n.h]);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
}

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
  edges: CanvasEdge[];
  frameTable: FrameTableSnapshot;
  dataCleaning: DataCleaningSnapshot;
  /** Keyed by Feature Group name, which is also the node title. */
  featureGroups: Record<string, FeatureGroupNodeSnapshot>;
  /** Optional; defaults to generic mock paths in panels */
  dataIngestion?: DataIngestionConfigSnapshot;
}

const JOIN_DEFAULT = "Left Latest Join";

/** Node builders — keep geometry and the facts shown on the card in one place. */
export function sourceNode(id: NodeId, x: number, y: number, params: NodeParam[]): NodeDef {
  return {
    id, type: "source", x, y, w: NODE_W, h: nodeHeight(params),
    title: "Frame Table", subtitle: "Source Table", params,
  };
}

export function featureGroupNode(
  id: NodeId, x: number, y: number, title: string, join: string, columns: number
): NodeDef {
  const params: NodeParam[] = [
    { label: "Join", value: join },
    { label: "Columns", value: String(columns) },
  ];
  return {
    id, type: "feature", x, y, w: NODE_W, h: nodeHeight(params),
    title, subtitle: "Feature Group", params,
  };
}

/** Feature Groups are vertically centred on the source/sink rows and fan out to the right. */
export const FG_GRID_X0 = 372;
export const FG_GRID_Y0 = 72;
export const FG_GRID_DX = NODE_W + 60;
export const FG_GRID_DY = 144;
/** Horizontal breathing room between the Feature Group block and the run's bookend nodes. */
export const SINK_GAP_X = 200;

export const SOURCE_X = 72;

/** One column of Feature Groups reads best up to four; beyond that wrap into a grid. */
export function fgGridCols(count: number): number {
  return count <= 4 ? 1 : Math.ceil(Math.sqrt(count));
}

/** Where the `index`-th Feature Group sits in a `cols`-wide grid. */
export function fgGridPosition(index: number, cols: number): { x: number; y: number } {
  return {
    x: FG_GRID_X0 + (index % cols) * FG_GRID_DX,
    y: FG_GRID_Y0 + Math.floor(index / cols) * FG_GRID_DY,
  };
}

export function sinkNode(id: NodeId, x: number, y: number, params: NodeParam[]): NodeDef {
  return {
    id, type: "sink", x, y, w: NODE_W, h: nodeHeight(params),
    title: "Data Ingestion", subtitle: "Output paths", params,
  };
}

export interface FeatureGroupSpec {
  name: string;
  columns: number;
  join?: string;
}

/** The Feature Groups wired on the demo canvases; column counts come from the catalog. */
const DEMO_FGS: FeatureGroupSpec[] = [
  "user_profile_features",
  "order_history_features",
  "credit_behavior_features",
].map((name) => ({ name, columns: fgColumnCount(name) }));

interface SnapshotSpec {
  frameTable: FrameTableSnapshot;
  dataCleaning: DataCleaningSnapshot;
  dataIngestion?: DataIngestionConfigSnapshot;
  fgs?: FeatureGroupSpec[];
}

/**
 * Assemble a canvas from its config: node positions, node params and the edge list are all
 * derived, so adding a Feature Group never means hand-maintaining coordinates or DAG edges.
 */
export function buildSnapshot(spec: SnapshotSpec): WideTableCanvasSnapshot {
  const fgs = spec.fgs ?? [];
  const cols = fgGridCols(fgs.length);

  const fgNodes = fgs.map((fg, i) =>
    featureGroupNode(
      `fg:${fg.name}`,
      fgGridPosition(i, cols).x,
      fgGridPosition(i, cols).y,
      fg.name,
      fg.join ?? JOIN_DEFAULT,
      fg.columns
    )
  );

  const ft = spec.frameTable;
  const sourceParams: NodeParam[] =
    ft.sourceType === "hive"
      ? [
          { label: "sourceType", value: "Hive" },
          { label: "tableSchema", value: ft.tableSchema || "—" },
          { label: "tableName", value: ft.tableName || "—" },
        ]
      : [
          { label: "sourceType", value: "SQL" },
          { label: "dataServer", value: ft.dataServer || "—" },
        ];

  const ing = spec.dataIngestion;
  const sinkParams: NodeParam[] = [
    { label: "rawTable", value: ing?.rawTable ?? "—" },
    { label: "report", value: ing?.rawS3 ?? "—" },
  ];

  const fgBlock = canvasBounds(fgNodes);
  const centreY = (h: number) => fgBlock.minY + fgBlock.h / 2 - h / 2;
  const source = sourceNode("src", SOURCE_X, centreY(nodeHeight(sourceParams)), sourceParams);
  const sink = sinkNode(
    "sink",
    fgBlock.maxX + SINK_GAP_X,
    centreY(nodeHeight(sinkParams)),
    sinkParams
  );

  const fgIds = fgNodes.map((n) => n.id);
  return {
    nodes: [source, ...fgNodes, sink],
    edges: [
      ...fgIds.map((id): CanvasEdge => [source.id, id]),
      ...fgIds.map((id): CanvasEdge => [id, sink.id]),
    ],
    frameTable: ft,
    dataCleaning: spec.dataCleaning,
    dataIngestion: ing,
    featureGroups: Object.fromEntries(
      fgs.map((fg) => [
        fg.name,
        {
          selectedFg: fg.name,
          joinType: fg.join ?? JOIN_DEFAULT,
          entityJoinCol: "",
          eventTimeJoinCol: "",
        },
      ])
    ),
  };
}

export function createDefaultCanvasSnapshot(): WideTableCanvasSnapshot {
  return buildSnapshot({
    fgs: DEMO_FGS,
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
    dataCleaning: { enabled: false, fillnaRows: [], vmRows: [] },
  });
}

/** Risk / TH — hive frame ref plus one pre-filled join pair. */
export function snapshotRiskWideTable(): WideTableCanvasSnapshot {
  const base = createDefaultCanvasSnapshot();
  return {
    ...buildSnapshot({
      fgs: DEMO_FGS,
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
        vmRows: [
          {
            id: "vm-mock-1",
            feature: "risk_band",
            sql: "CASE WHEN credit_score >= 700 THEN 'low' ELSE 'high' END",
          },
        ],
      },
      dataIngestion: {
        rawTable: "feature_store.dwd_wide_raw_risk_th",
        datePart: "ds",
        rawS3: "s3://data-lake-prod/widetable/reports/risk_th/20260217/raw_stats.json",
        cleanedTable: "feature_store.dwd_wide_clean_feat_v1",
        cleanedReportPath:
          "s3://data-lake-prod/widetable/reports/ts_demo/20240315/clean_stats.json",
      },
    }),
    featureGroups: {
      ...base.featureGroups,
      user_profile_features: {
        ...base.featureGroups.user_profile_features,
        entityJoinCol: "user_id",
        eventTimeJoinCol: "profile_ts",
      },
    },
  };
}

/** MX ACard — different frame table; Feature Groups keep their catalog identities. */
export function snapshotAcardMx(): WideTableCanvasSnapshot {
  return buildSnapshot({
    fgs: DEMO_FGS,
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
  });
}

/** Recommend SG — SQL frame source. */
export function snapshotRecommendSg(): WideTableCanvasSnapshot {
  return buildSnapshot({
    fgs: DEMO_FGS,
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
    dataCleaning: { enabled: false, fillnaRows: [], vmRows: [] },
  });
}
