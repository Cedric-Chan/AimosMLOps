import {
  useState, useRef, useEffect, useLayoutEffect, useCallback,
} from "react";
import { createPortal } from "react-dom";
import {
  X, Check, ChevronDown, ChevronRight, ArrowRight,
  AlertCircle, CheckCircle2, Loader2, Lock, Zap, Link2, Plus, Trash2,
  Pencil, Copy,
} from "lucide-react";
import { DatePartitionSelect } from "./DatePartitionSelect";
import { EntitiesColumnMultiSelect } from "./EntitiesColumnMultiSelect";
import {
  getSzfinRealtimeSchemaNames,
  getSzfinRealtimeTablesForSchema,
} from "@/data/szfinRealtimeHiveTables";

// ─── Modal stack (inner modal receives Escape before outer) ───────────────────
const modalLayerStack: number[] = [];
let modalLayerSeq = 0;

function pushModalLayer(): number {
  modalLayerSeq += 1;
  modalLayerStack.push(modalLayerSeq);
  return modalLayerSeq;
}

function popModalLayer(id: number) {
  const idx = modalLayerStack.lastIndexOf(id);
  if (idx >= 0) modalLayerStack.splice(idx, 1);
}

function isTopModalLayer(id: number): boolean {
  return (
    modalLayerStack.length > 0 &&
    modalLayerStack[modalLayerStack.length - 1] === id
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────
export interface ServingBlock {
  id: string;
  featureSource: string;
  /** Transformation as Name@Version (mock resolves latest enabled version on pick). */
  transformation: string;
}

export interface ComputeFeatureRow {
  id: string;
  name: string;
  sql: string;
  dataType: string;
}

export interface FGFormData {
  name: string;
  region: string;
  module: string;
  owners: string[];
  description: string;
  dataServer: string;
  tableSchema: string;
  tableName: string;
  datePartition: string;
  partitionType: string;
  updateFrequency: string;
  /** Entity key columns from the training table (required, multi-select). */
  entitiesColumns: string[];
  filter: string;
  /** Optional serving: empty = training-only FG. */
  servingBlocks: ServingBlock[];
  featureMapping: Record<string, string>;
  computeFeatures: ComputeFeatureRow[];
}

export const EMPTY_FORM: FGFormData = {
  name: "", region: "", module: "", owners: [], description: "",
  dataServer: "", tableSchema: "", tableName: "", datePartition: "", partitionType: "",
  updateFrequency: "", entitiesColumns: [], filter: "",
  servingBlocks: [],
  featureMapping: {},
  computeFeatures: [],
};

function newBlockId(): string {
  return `sb_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function newComputeId(): string {
  return `cf_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/** Migrate list/detail payloads that used flat serving fields. */
export function normalizeFgFormData(input: Partial<FGFormData> & Record<string, unknown>): FGFormData {
  const base: FGFormData = { ...EMPTY_FORM, ...input } as FGFormData;
  const legacyFs = input.featureSource as string | undefined;
  const legacyTf = input.transformation as string | undefined;
  if (
    (!base.servingBlocks || base.servingBlocks.length === 0) &&
    typeof legacyFs === "string" && legacyFs.trim() &&
    typeof legacyTf === "string" && legacyTf.trim()
  ) {
    base.servingBlocks = [
      { id: newBlockId(), featureSource: legacyFs.trim(), transformation: legacyTf.trim() },
    ];
  }
  if (!base.servingBlocks) base.servingBlocks = [];
  if (!base.featureMapping) base.featureMapping = {};
  if (!base.computeFeatures) base.computeFeatures = [];
  return base;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const REGIONS = ["TH", "MX", "SG", "SHOPEE_SG", "MY", "VN", "PH", "ID"];
const DATA_SERVERS = ["reg_sg_hive", "reg_us_hive"];
const UPDATE_FREQUENCIES = ["Daily", "Weekly", "Monthly", "ONCE"];
const COMPUTE_DATA_TYPES = ["DOUBLE", "FLOAT", "INT", "LONG", "STRING", "BOOLEAN"];

const STEPS = [
  { key: "basic",    label: "Basic Info"        },
  { key: "training", label: "Training Config"   },
  { key: "serving",  label: "Serving Config"    },
  { key: "mapping",  label: "Feature Mapping"   },
];

const SQL_IDENTIFIER_KEYWORDS = new Set([
  "and", "or", "not", "null", "true", "false", "case", "when", "then", "else", "end",
  "select", "from", "where", "as", "on", "join", "left", "right", "inner", "outer",
  "union", "all", "distinct", "group", "by", "having", "order", "limit", "offset",
  "between", "in", "is", "like", "cast", "coalesce", "if", "abs", "sum", "avg", "max",
  "min", "count", "round", "floor", "ceil", "concat", "substring", "trim", "upper",
  "lower",
]);

// ─── Mock catalog data ────────────────────────────────────────────────────────
interface MockFeatureSource {
  id: string;
  name: string;
  region: string;
  status: "Connected" | "Disconnected" | "Deprecated";
  sourceType: "HBase" | "Redis" | "gRPC" | "GraphDB";
  inputParams: string[];
  dataLatency: "Online" | "Nearline" | "Offline";
  /** Mock enabled publish versions for this source; newest = latest. */
  enabledFsVersions: string[];
}

interface MockTransformation {
  id: string;
  name: string;
  region: string;
  status: "Active" | "Beta" | "Deprecated";
  /** Mock: Aggregator vs Scalar for Serving meta panel. */
  transformKind: "Aggregator" | "Scalar";
  versions: string[];
  outputFeaturesByVersion: Record<string, string[]>;
}

export function mockServingPairFromBlock(block: ServingBlock): {
  featureSource: string;
  sourceType: "HBase" | "Redis" | "gRPC" | "GraphDB";
  dataLatency: "Online" | "Nearline" | "Offline";
} {
  const fs = MOCK_FEATURE_SOURCES.find((s) => s.name === block.featureSource);
  return {
    featureSource: block.featureSource,
    sourceType: (fs?.sourceType ?? "HBase") as
      "HBase" | "Redis" | "gRPC" | "GraphDB",
    dataLatency: (fs?.dataLatency ?? "Online") as
      "Online" | "Nearline" | "Offline",
  };
}

const MOCK_FEATURE_SOURCES: MockFeatureSource[] = [
  { id: "fs1",  name: "riskfeat_hbase_th",   region: "TH",        status: "Connected",    sourceType: "HBase",   inputParams: ["platform_user_id"], dataLatency: "Online",   enabledFsVersions: ["2024.03", "2024.12"] },
  { id: "fs2",  name: "th_redis_realtime",    region: "TH",        status: "Connected",    sourceType: "Redis",   inputParams: ["platform_user_id"], dataLatency: "Nearline", enabledFsVersions: ["2024.06", "2025.01"] },
  { id: "fs3",  name: "th_graph_relation",    region: "TH",        status: "Connected",    sourceType: "GraphDB", inputParams: ["platform_user_id", "shop_id"], dataLatency: "Offline", enabledFsVersions: ["2024.01", "2024.09"] },
  { id: "fs4",  name: "th_grpc_external",     region: "TH",        status: "Disconnected", sourceType: "gRPC",    inputParams: ["platform_user_id", "item_id"], dataLatency: "Online", enabledFsVersions: ["2023.11"] },
  { id: "fs5",  name: "mx_hbase_main",        region: "MX",        status: "Connected",    sourceType: "HBase",   inputParams: ["platform_user_id"], dataLatency: "Online",   enabledFsVersions: ["2024.04", "2024.11"] },
  { id: "fs6",  name: "mx_redis_cache",       region: "MX",        status: "Connected",    sourceType: "Redis",   inputParams: ["platform_user_id", "id_card_no"], dataLatency: "Nearline", enabledFsVersions: ["2024.08"] },
  { id: "fs7",  name: "mx_grpc_aml",          region: "MX",        status: "Disconnected", sourceType: "gRPC",    inputParams: ["platform_user_id", "id_card_no"], dataLatency: "Online", enabledFsVersions: ["2024.02"] },
  { id: "fs8",  name: "sg_hbase_core",        region: "SG",        status: "Connected",    sourceType: "HBase",   inputParams: ["platform_user_id"], dataLatency: "Online",   enabledFsVersions: ["2024.05", "2025.02"] },
  { id: "fs9",  name: "sg_redis_session",     region: "SG",        status: "Connected",    sourceType: "Redis",   inputParams: ["spp_user_id"], dataLatency: "Nearline", enabledFsVersions: ["2024.07"] },
  { id: "fs10", name: "sg_grpc_service",      region: "SG",        status: "Connected",    sourceType: "gRPC",    inputParams: ["platform_user_id", "item_id"], dataLatency: "Online", enabledFsVersions: ["2024.10"] },
  { id: "fs11", name: "shopee_sg_hbase",      region: "SHOPEE_SG", status: "Connected",    sourceType: "HBase",   inputParams: ["platform_user_id"], dataLatency: "Online",   enabledFsVersions: ["2024.06", "2024.12"] },
  { id: "fs12", name: "shopee_sg_redis",      region: "SHOPEE_SG", status: "Connected",    sourceType: "Redis",   inputParams: ["platform_user_id", "shop_id"], dataLatency: "Nearline", enabledFsVersions: ["2024.09"] },
  { id: "fs13", name: "shopee_sg_graph",      region: "SHOPEE_SG", status: "Connected",    sourceType: "GraphDB", inputParams: ["platform_user_id", "shop_id"], dataLatency: "Offline", enabledFsVersions: ["2024.04"] },
  { id: "fs14", name: "my_hbase_main",        region: "MY",        status: "Connected",    sourceType: "HBase",   inputParams: ["platform_user_id"], dataLatency: "Online",   enabledFsVersions: ["2024.03"] },
  { id: "fs15", name: "vn_hbase_main",        region: "VN",        status: "Connected",    sourceType: "HBase",   inputParams: ["platform_user_id"], dataLatency: "Online",   enabledFsVersions: ["2024.05"] },
  { id: "fs16", name: "ph_hbase_main",        region: "PH",        status: "Connected",    sourceType: "HBase",   inputParams: ["platform_user_id"], dataLatency: "Online",   enabledFsVersions: ["2024.04"] },
  { id: "fs17", name: "id_hbase_main",        region: "ID",        status: "Connected",    sourceType: "HBase",   inputParams: ["platform_user_id"], dataLatency: "Online",   enabledFsVersions: ["2024.08", "2025.01"] },
  { id: "fs18", name: "id_redis_session",     region: "ID",        status: "Connected",    sourceType: "Redis",   inputParams: ["spp_user_id", "device_id"], dataLatency: "Nearline", enabledFsVersions: ["2024.11"] },
];

const MOCK_TRANSFORMATIONS: MockTransformation[] = [
  { id: "t1",  name: "QueryAaiCache",      region: "TH",        status: "Active",     transformKind: "Scalar",
    versions: ["V1", "V2", "V3"],
    outputFeaturesByVersion: {
      V1: ["user_risk_score", "credit_limit", "repayment_rate_30d"],
      V2: ["user_risk_score", "credit_limit", "repayment_rate_30d", "default_prob"],
      V3: ["user_risk_score", "credit_limit", "repayment_rate_30d", "default_prob", "fraud_score"],
    }},
  { id: "t2",  name: "OfflineFeatureJoin", region: "TH",        status: "Active",     transformKind: "Aggregator",
    versions: ["V1", "V2"],
    outputFeaturesByVersion: {
      V1: ["join_user_score", "join_shop_score"],
      V2: ["join_user_score", "join_shop_score", "join_cross_feat"],
    }},
  { id: "t3",  name: "RealtimeAggr",       region: "TH",        status: "Beta",       transformKind: "Aggregator",
    versions: ["V1"],
    outputFeaturesByVersion: {
      V1: ["rt_click_cnt_7d", "rt_order_cnt_7d", "rt_gmv_7d"],
    }},
  { id: "t4",  name: "UserGraphEmbed",     region: "TH",        status: "Deprecated", transformKind: "Scalar",
    versions: ["V1", "V2"],
    outputFeaturesByVersion: {
      V1: ["graph_embed_dim_0", "graph_embed_dim_1", "graph_embed_dim_2"],
      V2: ["graph_embed_dim_0", "graph_embed_dim_1", "graph_embed_dim_2", "graph_centrality"],
    }},
  { id: "t5",  name: "QueryAaiCache",      region: "MX",        status: "Active",     transformKind: "Scalar",
    versions: ["V1", "V2"],
    outputFeaturesByVersion: {
      V1: ["user_risk_score", "credit_limit"],
      V2: ["user_risk_score", "credit_limit", "default_prob"],
    }},
  { id: "t6",  name: "MxOfflineJoin",      region: "MX",        status: "Active",     transformKind: "Aggregator",
    versions: ["V1"],
    outputFeaturesByVersion: {
      V1: ["mx_join_score", "mx_credit_feat"],
    }},
  { id: "t7",  name: "MxRealtimeScore",    region: "MX",        status: "Beta",       transformKind: "Scalar",
    versions: ["V1", "V2"],
    outputFeaturesByVersion: {
      V1: ["mx_rt_score", "mx_risk_tier"],
      V2: ["mx_rt_score", "mx_risk_tier", "mx_fraud_prob"],
    }},
  { id: "t8",  name: "QueryAaiCache",      region: "SG",        status: "Active",     transformKind: "Scalar",
    versions: ["V2", "V3"],
    outputFeaturesByVersion: {
      V2: ["user_risk_score", "credit_limit", "repayment_rate_30d", "default_prob"],
      V3: ["user_risk_score", "credit_limit", "repayment_rate_30d", "default_prob", "fraud_score"],
    }},
  { id: "t9",  name: "SgRtTransform",      region: "SG",        status: "Active",     transformKind: "Scalar",
    versions: ["V1", "V2"],
    outputFeaturesByVersion: {
      V1: ["sg_rt_score", "sg_click_rate"],
      V2: ["sg_rt_score", "sg_click_rate", "sg_conversion_rate"],
    }},
  { id: "t10", name: "QueryAaiCache",      region: "SHOPEE_SG", status: "Active",     transformKind: "Scalar",
    versions: ["V1", "V2", "V3"],
    outputFeaturesByVersion: {
      V1: ["user_risk_score", "credit_limit"],
      V2: ["user_risk_score", "credit_limit", "repayment_rate_30d", "default_prob"],
      V3: ["user_risk_score", "credit_limit", "repayment_rate_30d", "default_prob", "fraud_score"],
    }},
  { id: "t11", name: "ShopeeRecommend",    region: "SHOPEE_SG", status: "Active",     transformKind: "Scalar",
    versions: ["V1"],
    outputFeaturesByVersion: {
      V1: ["rec_score", "shop_affinity", "item_click_prob"],
    }},
  { id: "t12", name: "ShopeeGraphRank",    region: "SHOPEE_SG", status: "Beta",       transformKind: "Aggregator",
    versions: ["V1", "V2"],
    outputFeaturesByVersion: {
      V1: ["graph_rank_score", "shop_rank"],
      V2: ["graph_rank_score", "shop_rank", "item_rank_score"],
    }},
  { id: "t13", name: "QueryAaiCache",      region: "MY",        status: "Active",     transformKind: "Scalar",
    versions: ["V1", "V2"],
    outputFeaturesByVersion: {
      V1: ["user_risk_score", "credit_limit"],
      V2: ["user_risk_score", "credit_limit", "default_prob"],
    }},
  { id: "t14", name: "QueryAaiCache",      region: "VN",        status: "Active",     transformKind: "Scalar",
    versions: ["V1", "V2"],
    outputFeaturesByVersion: {
      V1: ["user_risk_score", "credit_limit"],
      V2: ["user_risk_score", "credit_limit", "repayment_rate_30d"],
    }},
  { id: "t15", name: "QueryAaiCache",      region: "PH",        status: "Active",     transformKind: "Scalar",
    versions: ["V1", "V2"],
    outputFeaturesByVersion: {
      V1: ["user_risk_score", "credit_limit"],
      V2: ["user_risk_score", "credit_limit", "default_prob"],
    }},
  { id: "t16", name: "QueryAaiCache",      region: "ID",        status: "Active",     transformKind: "Scalar",
    versions: ["V1", "V2", "V3"],
    outputFeaturesByVersion: {
      V1: ["user_risk_score", "credit_limit"],
      V2: ["user_risk_score", "credit_limit", "default_prob"],
      V3: ["user_risk_score", "credit_limit", "default_prob", "fraud_score"],
    }},
  { id: "t17", name: "IdOfflineTransform", region: "ID",        status: "Active",     transformKind: "Scalar",
    versions: ["V1"],
    outputFeaturesByVersion: {
      V1: ["id_user_score", "id_device_feat"],
    }},
];

function resolveLatestEnabledTransformVersion(t: MockTransformation): string {
  const vers = t.versions;
  return vers[vers.length - 1] ?? "";
}

/** Pick Name@LatestEnabledVersion for mock (versions ordered oldest→newest). */
function transformationPickLatest(region: string, transformName: string): string {
  const t = MOCK_TRANSFORMATIONS.find(
    x => x.name === transformName && x.region === region && x.status !== "Deprecated",
  );
  if (!t) return transformName;
  const v = resolveLatestEnabledTransformVersion(t);
  return v ? `${transformName}@${v}` : transformName;
}

function resolveFsVersionTag(s: MockFeatureSource): string {
  const v = s.enabledFsVersions;
  return v.length ? v[v.length - 1] : "live";
}

function getBlockOutputFeatureNames(b: ServingBlock, region: string): string[] {
  const atIdx = b.transformation.lastIndexOf("@");
  const tName = atIdx > -1 ? b.transformation.slice(0, atIdx) : b.transformation;
  const tVer = atIdx > -1 ? b.transformation.slice(atIdx + 1) : "";
  const t = MOCK_TRANSFORMATIONS.find(x => x.name === tName && x.region === region);
  return (t?.outputFeaturesByVersion ?? {})[tVer] ?? [];
}

function findMockTransformationForBlock(b: ServingBlock, region: string): MockTransformation | undefined {
  const atIdx = b.transformation.lastIndexOf("@");
  const tName = atIdx > -1 ? b.transformation.slice(0, atIdx) : b.transformation;
  if (!tName.trim()) return undefined;
  return MOCK_TRANSFORMATIONS.find(x => x.name === tName && x.region === region);
}

function unionServingOutputFeatures(blocks: ServingBlock[], region: string): string[] {
  const out: string[] = [];
  for (const b of blocks) {
    out.push(...getBlockOutputFeatureNames(b, region));
  }
  return out;
}

function servingOutputNamesHaveDuplicates(blocks: ServingBlock[], region: string): boolean {
  const all = unionServingOutputFeatures(blocks, region);
  return new Set(all).size !== all.length;
}

/** Identifier tokens in SQL that are not SQL keywords and not in allowedFeatures. */
function computeSqlUnknownIdentifiers(sql: string, allowedFeatures: Set<string>): string[] {
  const tokens = sql.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g) ?? [];
  const bad: string[] = [];
  const seen = new Set<string>();
  for (const tok of tokens) {
    if (SQL_IDENTIFIER_KEYWORDS.has(tok.toLowerCase())) continue;
    if (allowedFeatures.has(tok)) continue;
    if (!seen.has(tok)) {
      seen.add(tok);
      bad.push(tok);
    }
  }
  return bad;
}

function isStep4MappingComputeValid(d: FGFormData) {
  const servingSet = new Set(unionServingOutputFeatures(d.servingBlocks, d.region));
  const namesSeen = new Set<string>();
  for (const c of d.computeFeatures) {
    if (!c.name.trim() || !c.sql.trim() || !c.dataType.trim()) return false;
    if (namesSeen.has(c.name.trim())) return false;
    namesSeen.add(c.name.trim());
    if (servingSet.size === 0) return false;
    const unknown = computeSqlUnknownIdentifiers(c.sql, servingSet);
    if (unknown.length > 0) return false;
  }
  return true;
}

// ─── Step validators ──────────────────────────────────────────────────────────
export function isStep0Valid(d: FGFormData) {
  return d.name.trim().length > 0 && d.region !== "" && d.module !== "" &&
    d.owners.length > 0 && d.description.trim().length > 0;
}
export function isStep1Valid(d: FGFormData) {
  return d.dataServer !== "" && d.tableSchema.trim().length > 0 &&
    d.tableName.trim().length > 0 && d.datePartition.trim().length > 0 &&
    d.partitionType !== "" && d.updateFrequency !== "" &&
    d.entitiesColumns.length > 0;
}
export function isStep2ServingValid(d: FGFormData) {
  if (!d.servingBlocks.length) return true;
  for (const b of d.servingBlocks) {
    if (!b.featureSource.trim() || !b.transformation.trim()) return false;
  }
  return !servingOutputNamesHaveDuplicates(d.servingBlocks, d.region);
}
export function isFgTrainingComplete(
  form: Partial<FGFormData> | undefined
): boolean {
  if (!form) return false;
  return isStep1Valid(normalizeFgFormData(form));
}

export function isFgServingConfigured(
  form: Partial<FGFormData> | undefined
): boolean {
  if (!form) return false;
  const d = normalizeFgFormData(form);
  return d.servingBlocks.length > 0 && isStep2ServingValid(d);
}

// ─── Mock training feature columns by table name ──────────────────────────────
export const MOCK_TRAINING_FEATURES: Record<string, string[]> = {
  "user_risk_score_ods":       ["risk_score", "credit_limit", "repayment_rate_30d", "default_prob", "fraud_score", "delinquency_rate", "gmv_90d"],
  "user_risk_score_v1_ods":    ["risk_score", "credit_limit", "repayment_rate_30d", "default_prob", "fraud_score", "delinquency_rate", "gmv_90d"],
  "mx_acard_realtime_ods":     ["user_risk_score", "credit_limit", "default_prob", "id_verification_status", "income_level", "risk_tier"],
  "th_embedding_v3_ods":       ["item_embed_0", "item_embed_1", "item_embed_2", "user_item_affinity", "click_through_rate", "conversion_rate"],
  "dp_recommend_score_ods":    ["rec_score", "shop_affinity", "item_click_prob", "graph_rank_score", "shop_rank", "item_rank_score"],
  "user_graph_relation_ods":   ["graph_embed_dim_0", "graph_embed_dim_1", "graph_embed_dim_2", "graph_centrality", "join_user_score", "join_shop_score"],
  "mx_device_fingerprint_ods": ["mx_rt_score", "mx_risk_tier", "mx_fraud_prob", "mx_join_score", "mx_credit_feat", "device_risk_score"],
};
export const DEFAULT_TRAINING_FEATURES = [
  "feature_col_1",
  "feature_col_2",
  "feature_col_3",
  "label",
  "weight",
];

const SOURCE_TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  HBase:   { bg: "#e6f4ff", text: "#0958d9", border: "#91caff" },
  Redis:   { bg: "#fff1f0", text: "#cf1322", border: "#ffa39e" },
  gRPC:    { bg: "#f9f0ff", text: "#531dab", border: "#d3adf7" },
  GraphDB: { bg: "#fff7e6", text: "#ad4e00", border: "#ffd591" },
};

const TRANSFORM_STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  Active:     { bg: "#f6ffed", text: "#389e0d" },
  Beta:       { bg: "#e6f4ff", text: "#0958d9" },
  Deprecated: { bg: "#f5f5f5", text: "#8c8c8c" },
};

const DATA_LATENCY_TAG_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  Online:   { bg: "#e6fffb", text: "#08979c", border: "#87e8de" },
  Nearline: { bg: "#fff7e6", text: "#ad4e00", border: "#ffd591" },
  Offline:  { bg: "#f3f4f6", text: "#4b5563", border: "#e5e7eb" },
};

export function DataLatencyTag({ latency }: { latency: string }) {
  const st = DATA_LATENCY_TAG_STYLE[latency] ?? DATA_LATENCY_TAG_STYLE.Offline;
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs border"
      style={{ background: st.bg, color: st.text, borderColor: st.border, fontWeight: 600 }}
    >
      {latency}
    </span>
  );
}

// ─── Notification helpers ─────────────────────────────────────────────────────
interface ModalNotification {
  id: string;
  message: string;
  type: "error" | "warning" | "info";
}

// Mock: fetch columns for a given table (simulates data-catalog schema API)
export const TABLE_COLUMNS_MOCK: Record<string, string[]> = {
  user_profile_v3:          ["user_id", "age", "gender", "country", "registration_days", "is_verified", "last_login_days", "account_level"],
  order_history_v2:         ["user_id", "order_id", "total_orders", "total_amount", "order_time", "ds"],
  user_risk_score_ods:      ["dt", "platform_user_id", "shop_id", "risk_score", "risk_level", "overdue_days_30", "create_date", "update_date", "loan_amount", "repayment_cnt"],
  user_risk_score_v1_ods:   ["dt", "platform_user_id", "shop_id", "risk_score", "risk_level", "overdue_days_30", "create_date", "update_date", "loan_amount", "repayment_cnt"],
  mx_acard_realtime_ods:    ["event_date", "platform_user_id", "id_card_no", "acard_score", "tx_velocity_7d", "tx_amt_30d", "device_cnt", "is_new_user", "login_region"],
  th_embedding_v3_ods:      ["pt", "platform_user_id", "item_id", "user_emb_128", "item_emb_64", "cross_score", "embedding_version", "model_tag"],
  dp_recommend_score_ods:   ["dt", "platform_user_id", "shop_id", "rec_score", "exposure_cnt_7d", "click_cnt_7d", "ctr_7d", "model_version", "segment"],
  user_graph_relation_ods:  ["stat_date", "platform_user_id", "shop_id", "relation_type", "edge_weight", "is_active", "community_id", "hop_cnt"],
  mx_device_fingerprint_ods:["data_date", "spp_user_id", "device_id", "device_model", "os_version", "ip_hash", "risk_tag", "fp_version"],
  credit_behavior_v1:       ["user_id", "credit_score", "overdue_cnt", "loan_amount", "repay_ratio", "event_time", "risk_label", "delinquency_days"],
};
const DEFAULT_COLUMNS = ["dt", "id", "create_time", "update_time", "status", "amount", "region_code"];

async function mockFetchTableColumns(tableName: string): Promise<string[]> {
  await new Promise(r => setTimeout(r, 600));
  return TABLE_COLUMNS_MOCK[tableName] ?? DEFAULT_COLUMNS;
}

// ─── Props ────────────────────────────────────────────────────────────────────
export type FeatureGroupModalVariant = "basic" | "training";

interface FeatureGroupModalProps {
  open: boolean;
  mode: "create" | "edit";
  /** Narrow modal: basic info only, training step only, or full wizard. */
  variant?: FeatureGroupModalVariant;
  initialData?: Partial<FGFormData>;
  editId?: string;
  modules: string[];
  onClose: () => void;
  onSubmit: (data: FGFormData, editId?: string) => void;
}

// ─── Main Modal ───────────────────────────────────────────────────────────────
export default function FeatureGroupModal({
  open,
  mode,
  variant = "basic",
  initialData,
  editId,
  modules,
  onClose,
  onSubmit,
}: FeatureGroupModalProps) {
  const [layerId, setLayerId] = useState(0);
  const [form, setFormState] = useState<FGFormData>({ ...EMPTY_FORM, ...initialData });
  const [touched, setTouched] = useState(false);
  const [ownerInput, setOwnerInput] = useState("");
  const [notifications, setNotifications] = useState<ModalNotification[]>([]);

  function addNotification(message: string, type: ModalNotification["type"] = "error") {
    const id = `notif_${Date.now()}_${Math.random()}`;
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5500);
  }

  function removeNotification(id: string) {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }

  // Reset form whenever the modal opens
  useEffect(() => {
    if (open) {
      setFormState(() => {
        const merged = normalizeFgFormData({
          ...EMPTY_FORM,
          ...(initialData ?? {}),
        } as Partial<FGFormData> & Record<string, unknown>);
        const legacy = initialData as { marker?: string } | undefined;
        if (legacy?.marker && merged.entitiesColumns.length === 0) {
          merged.entitiesColumns = [legacy.marker];
        }
        return merged;
      });
      setTouched(false);
      setOwnerInput("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, variant]);

  useLayoutEffect(() => {
    if (!open) {
      setLayerId(0);
      return;
    }
    const id = pushModalLayer();
    setLayerId(id);
    return () => popModalLayer(id);
  }, [open]);

  // ESC: only the top-stacked modal closes (capture phase)
  useEffect(() => {
    if (!open || layerId === 0) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (!isTopModalLayer(layerId)) return;
      e.preventDefault();
      e.stopPropagation();
      onClose();
    };
    document.addEventListener("keydown", handler, true);
    return () => document.removeEventListener("keydown", handler, true);
  }, [open, layerId, onClose]);

  if (!open) return null;

  function setField(key: keyof FGFormData, value: any) {
    setFormState(f => ({ ...f, [key]: value }));
  }

  function finalForm(): FGFormData {
    const extra = ownerInput.trim()
      ? [...form.owners, ownerInput.trim()].filter((o, i, a) => a.indexOf(o) === i)
      : form.owners;
    return { ...form, owners: extra };
  }

  function handleCompactBasicContinue() {
    const data = finalForm();
    if (!isStep0Valid(data)) { setTouched(true); return; }
    setTouched(false);
    onSubmit(data, editId);
    onClose();
  }

  function handleCompactTrainingSave() {
    const data = finalForm();
    if (!isStep1Valid(data)) { setTouched(true); return; }
    setTouched(false);
    onSubmit(data, editId);
    onClose();
  }

  function addOwner() {
    const val = ownerInput.trim().replace(/,+$/, "");
    if (val && !form.owners.includes(val)) {
      setField("owners", [...form.owners, val]);
    }
    setOwnerInput("");
  }

  function handleOwnerKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addOwner(); }
    if (e.key === "Backspace" && !ownerInput && form.owners.length > 0) {
      setField("owners", form.owners.slice(0, -1));
    }
  }

  const headerTitle =
    variant === "training"
      ? "Training Config"
      : mode === "create"
        ? "Create Feature Group"
        : "Basic Info";

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{
        zIndex: 100 + layerId,
        backgroundColor: "rgba(0,0,0,0.48)",
        backdropFilter: "blur(5px)",
      }}
    >
      <div
        className="bg-white rounded-2xl flex flex-col w-full overflow-hidden relative"
        style={{
          maxWidth: 860,
          maxHeight: "93vh",
          boxShadow: "0 32px 80px rgba(0,0,0,0.20), 0 8px 24px rgba(0,0,0,0.10)",
        }}
      >
        {/* ── Floating Notifications (top-right of modal) ─────────────────── */}
        {notifications.length > 0 && (
          <div
            className="absolute z-[120] flex flex-col gap-2 pointer-events-none"
            style={{ top: 12, right: 12, maxWidth: 300 }}
          >
            {notifications.map(n => (
              <div
                key={n.id}
                className="flex items-start gap-2 px-3 py-2.5 rounded-lg border shadow-lg pointer-events-auto"
                style={{
                  background: n.type === "error" ? "#fff1f0" : n.type === "warning" ? "#fffbe6" : "#f0f9ff",
                  borderColor: n.type === "error" ? "#ffa39e" : n.type === "warning" ? "#ffe58f" : "#91d5ff",
                  color: n.type === "error" ? "#cf1322" : n.type === "warning" ? "#7c4a03" : "#0050b3",
                  fontSize: 12,
                  fontWeight: 500,
                  lineHeight: 1.5,
                }}
              >
                <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
                <span className="flex-1">{n.message}</span>
                <button
                  onClick={() => removeNotification(n.id)}
                  className="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity"
                >
                  <X size={11} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-7 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-1 h-5 rounded-full" style={{ backgroundColor: "#13c2c2" }} />
            <h2 style={{ fontWeight: 700, fontSize: 17, color: "#1a1a2e" }}>
              {headerTitle}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 min-h-[44px] min-w-[44px] rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors flex items-center justify-center"
            aria-label="Close dialog"
          >
            <X size={16} />
          </button>
        </div>


        {/* ── Body (scrollable) ──────────────────────────────────────────── */}
        <div
          className="flex-1 overflow-y-auto px-7 py-6"
          data-fg-modal-scroll
        >
          {variant === "basic" ? (
            <Step0BasicInfo
              form={form} setField={setField} modules={modules} err={touched}
              mode={mode}
              ownerInput={ownerInput} setOwnerInput={setOwnerInput}
              addOwner={addOwner} handleOwnerKeyDown={handleOwnerKeyDown}
            />
          ) : (
            <Step1TrainingConfig form={form} setField={setField} err={touched} />
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div
          className="flex items-center justify-end gap-2 px-8 py-4 border-t border-gray-100 flex-shrink-0 rounded-b-2xl"
          style={{ backgroundColor: "#fafafa" }}
        >
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition-all min-h-[44px]"
            style={{ fontWeight: 500 }}
          >
            Cancel
          </button>
          {variant === "basic" ? (
            <button
              type="button"
              onClick={handleCompactBasicContinue}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-sm rounded-lg text-white transition-all min-h-[44px]"
              style={{
                backgroundColor: "#13c2c2",
                fontWeight: 500,
                opacity: isStep0Valid(finalForm()) ? 1 : 0.5,
                cursor: isStep0Valid(finalForm()) ? "pointer" : "not-allowed",
              }}
            >
              Confirm <ArrowRight size={13} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCompactTrainingSave}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-sm rounded-lg text-white transition-all min-h-[44px]"
              style={{
                backgroundColor: "#13c2c2",
                fontWeight: 500,
                opacity: isStep1Valid(finalForm()) ? 1 : 0.5,
                cursor: isStep1Valid(finalForm()) ? "pointer" : "not-allowed",
              }}
            >
              <Check size={13} /> Save
            </button>
          )}
        </div>

      </div>
    </div>
  );
}

// ─── FormGroup ────────────────────────────────────────────────────────────────
function FormGroup({
  label, required, hint, error, children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-sm text-gray-700" style={{ fontWeight: 600 }}>
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        {hint && <span className="text-xs text-gray-400">{hint}</span>}
      </div>
      {children}
      {error && (
        <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

// ─── StyledInput ──────────────────────────────────────────────────────────────
function StyledInput({
  value, onChange, placeholder, mono, hasError, suffix, onBlur,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  mono?: boolean;
  hasError?: boolean;
  suffix?: React.ReactNode;
  onBlur?: () => void;
}) {
  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        className={`w-full px-3 py-2 text-sm rounded-lg border transition-colors focus:outline-none placeholder-gray-300 text-gray-800 ${
          hasError
            ? "border-red-300 bg-red-50 focus:border-red-400"
            : "border-gray-200 bg-white focus:border-[#13c2c2]"
        } ${suffix ? "pr-8" : ""}`}
        style={{ fontFamily: mono ? "monospace" : undefined }}
      />
      {suffix && (
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center">
          {suffix}
        </span>
      )}
    </div>
  );
}

// ─── StyledSelect ─────────────────────────────────────────────────────────────
function StyledSelect({
  value, onChange, options, placeholder, hasError, disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { label: string; value: string }[];
  placeholder?: string;
  hasError?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        className={`w-full px-3 py-2 text-sm rounded-lg border transition-colors focus:outline-none appearance-none pr-8 ${
          disabled ? "border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed" :
          hasError ? "border-red-300 bg-red-50" : "border-gray-200 bg-white focus:border-[#13c2c2]"
        } ${value === "" ? "text-gray-400" : "text-gray-800"}`}
      >
        <option value="" disabled>{placeholder ?? "Select…"}</option>
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
    </div>
  );
}

// ─── OwnerTagInput ────────────────────────────────────────────────────────────
function OwnerTagInput({
  owners, input, onInputChange, onAdd, onKeyDown, onRemove, hasError,
}: {
  owners: string[];
  input: string;
  onInputChange: (v: string) => void;
  onAdd: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onRemove: (o: string) => void;
  hasError?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div
      className={`min-h-[44px] flex flex-wrap gap-1.5 p-2 border rounded-lg cursor-text transition-colors ${
        hasError
          ? "border-red-300 bg-red-50"
          : "border-gray-200 bg-white focus-within:border-[#13c2c2]"
      }`}
      onClick={() => inputRef.current?.focus()}
    >
      {owners.map(o => (
        <span
          key={o}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs"
          style={{ background: "#f3f4f6", color: "#374151", border: "1px solid #e5e7eb", fontWeight: 500 }}
        >
          {o}
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onRemove(o); }}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={10} />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={e => onInputChange(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={onAdd}
        placeholder={owners.length === 0
          ? "Enter email, press Enter or comma to add…"
          : "Add another owner…"}
        className="flex-1 min-w-[160px] outline-none text-sm bg-transparent text-gray-800 placeholder-gray-300 py-0.5"
      />
    </div>
  );
}

// ─── ReadOnlyInput ────────────────────────────────────────────────────────────
function ReadOnlyInput({ value, mono = false, hint }: { value: string; mono?: boolean; hint?: string }) {
  return (
    <div className="relative">
      <div
        className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-gray-200 bg-gray-50"
        style={{ color: "#9ca3af", fontFamily: mono ? "monospace" : undefined, minHeight: 38 }}
      >
        <Lock size={11} className="flex-shrink-0 text-gray-300" />
        <span className="truncate">{value || <span className="text-gray-300">—</span>}</span>
      </div>
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

// ─── Step 0: Basic Info ───────────────────────────────────────────────────────
function Step0BasicInfo({
  form, setField, modules, err, mode,
  ownerInput, setOwnerInput, addOwner, handleOwnerKeyDown,
}: {
  form: FGFormData;
  setField: (k: keyof FGFormData, v: any) => void;
  modules: string[];
  err: boolean;
  mode?: "create" | "edit";
  ownerInput: string;
  setOwnerInput: (v: string) => void;
  addOwner: () => void;
  handleOwnerKeyDown: (e: React.KeyboardEvent) => void;
}) {
  const isEditing = mode === "edit";

  return (
    <div className="space-y-5">
      <FormGroup
        label="Feature Group Name"
        required
        hint={isEditing ? "Name is locked after creation" : "Lowercase letters, numbers and underscores"}
        error={!isEditing && err && !form.name.trim() ? "Feature Group Name is required" : undefined}
      >
        {isEditing ? (
          <ReadOnlyInput value={form.name} mono />
        ) : (
          <StyledInput
            value={form.name}
            onChange={v => setField("name", v)}
            placeholder="e.g. user_risk_score_fg"
            mono
            hasError={err && !form.name.trim()}
          />
        )}
      </FormGroup>

      <div className="grid grid-cols-2 gap-4">
        <FormGroup
          label="Region"
          required
          error={err && !form.region ? "Region is required" : undefined}
        >
          <StyledSelect
            value={form.region}
            onChange={v => setField("region", v)}
            options={REGIONS.map(r => ({ label: r, value: r }))}
            placeholder="Select region"
            hasError={err && !form.region}
          />
        </FormGroup>
        <FormGroup label="Module" required error={err && !form.module ? "Module is required" : undefined}>
          <StyledSelect
            value={form.module}
            onChange={v => setField("module", v)}
            options={modules.map(m => ({ label: m, value: m }))}
            placeholder="Select module"
            hasError={err && !form.module}
          />
        </FormGroup>
      </div>

      <FormGroup
        label="Owner(s)"
        required
        hint="Enter to add"
        error={err && form.owners.length === 0 ? "At least one owner is required" : undefined}
      >
        <OwnerTagInput
          owners={form.owners}
          input={ownerInput}
          onInputChange={setOwnerInput}
          onAdd={addOwner}
          onKeyDown={handleOwnerKeyDown}
          onRemove={o => setField("owners", form.owners.filter(x => x !== o))}
          hasError={err && form.owners.length === 0}
        />
      </FormGroup>

      <FormGroup label="Description" hint="Optional" required error={err && !form.description.trim() ? "Description is required" : undefined}>
        <textarea
          value={form.description}
          onChange={e => setField("description", e.target.value)}
          placeholder="Describe the purpose of this feature group…"
          rows={3}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#13c2c2] resize-none transition-colors text-gray-800 placeholder-gray-300 bg-white"
        />
      </FormGroup>
    </div>
  );
}

// ─── Step 1: Training Config ──────────────────────────────────────────────────

function Step1TrainingConfig({
  form, setField, err,
}: {
  form: FGFormData;
  setField: (k: keyof FGFormData, v: any) => void;
  err: boolean;
}) {
  const [columns, setColumns]               = useState<string[]>([]);
  const [columnsLoading, setColumnsLoading] = useState(false);
  const columnsKeyRef = useRef<string>("");

  const schemaOptions = getSzfinRealtimeSchemaNames().map(s => ({ label: s, value: s }));
  const tableOptions = getSzfinRealtimeTablesForSchema(form.tableSchema).map(t => ({
    label: t,
    value: t,
  }));

  async function fetchColumns(tn: string) {
    const key = tn;
    if (key === columnsKeyRef.current) return;
    columnsKeyRef.current = key;
    setColumnsLoading(true);
    const cols = await mockFetchTableColumns(tn);
    if (columnsKeyRef.current !== key) return;
    setColumns(cols);
    setColumnsLoading(false);
  }

  function onSchemaChange(schema: string) {
    setField("tableSchema", schema);
    setField("tableName", "");
    setField("datePartition", "");
    setField("partitionType", "");
    setField("entitiesColumns", []);
    setColumns([]);
    columnsKeyRef.current = "";
  }

  function onTableChange(table: string) {
    setField("tableName", table);
    setField("datePartition", "");
    setField("partitionType", "");
    setField("entitiesColumns", []);
    setColumns([]);
    columnsKeyRef.current = "";
    if (table.trim()) fetchColumns(table.trim());
  }

  useEffect(() => {
    if (form.tableName.trim() && columns.length === 0 && !columnsLoading) {
      fetchColumns(form.tableName.trim());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-5">
      <FormGroup
        label="Data Server"
        required
        error={err && !form.dataServer ? "Data Server is required" : undefined}
      >
        <StyledSelect
          value={form.dataServer}
          onChange={v => setField("dataServer", v)}
          options={DATA_SERVERS.map(s => ({ label: s, value: s }))}
          placeholder="Select data server"
          hasError={err && !form.dataServer}
        />
      </FormGroup>

      <div className="grid grid-cols-2 gap-4">
        <FormGroup
          label="Table Schema"
          required
          hint="From Project Table Access List"
          error={err && !form.tableSchema.trim() ? "Table Schema is required" : undefined}
        >
          <StyledSelect
            value={form.tableSchema}
            onChange={v => onSchemaChange(v)}
            options={schemaOptions}
            placeholder="Select schema"
            hasError={err && !form.tableSchema.trim()}
          />
        </FormGroup>
        <FormGroup
          label="Table Name"
          required
          hint="From Project Table Access List"
          error={err && !form.tableName.trim() ? "Table Name is required" : undefined}
        >
          <StyledSelect
            value={form.tableName}
            onChange={v => onTableChange(v)}
            options={tableOptions}
            placeholder={form.tableSchema.trim() ? "Select table" : "Select schema first"}
            hasError={err && !form.tableName.trim()}
            disabled={!form.tableSchema.trim()}
          />
        </FormGroup>
      </div>

      <div className="grid grid-cols-2 gap-4 items-start">
        <div className="min-w-0">
          <FormGroup
            label="Date Partition"
            required
            hint="Partition column"
            error={err && !form.datePartition.trim() ? "Date Partition is required" : undefined}
          >
            <DatePartitionSelect
              className="w-full max-w-full"
              value={form.datePartition}
              onChange={v => setField("datePartition", v)}
              columns={columns}
              loading={columnsLoading}
              disabled={!form.tableName.trim()}
              hasError={err && !form.datePartition.trim()}
            />
          </FormGroup>
        </div>
        <div className="min-w-0">
          <FormGroup
            label="Partition Type"
            required
            error={err && !form.partitionType ? "Partition Type is required" : undefined}
          >
            <StyledSelect
              value={form.partitionType}
              onChange={v => setField("partitionType", v)}
              options={[
                { label: "Full Data",        value: "Full Data"        },
                { label: "Incremental Data", value: "Incremental Data" },
              ]}
              placeholder="Select partition type"
              hasError={err && !form.partitionType}
              disabled={!form.datePartition.trim()}
            />
          </FormGroup>
        </div>
      </div>

      <FormGroup
        label="Update Frequency"
        required
        error={err && !form.updateFrequency ? "Update Frequency is required" : undefined}
      >
        <StyledSelect
          value={form.updateFrequency}
          onChange={v => setField("updateFrequency", v)}
          options={UPDATE_FREQUENCIES.map(u => ({ label: u, value: u }))}
          placeholder="Select update frequency"
          hasError={err && !form.updateFrequency}
        />
      </FormGroup>
      {(form.updateFrequency === "Weekly" || form.updateFrequency === "Monthly") && (
        <p className="text-xs text-gray-500 -mt-2" role="status" aria-live="polite">
          By default, data refreshes on the first day of each{" "}
          {form.updateFrequency === "Weekly" ? "week" : "month"}.
        </p>
      )}

      <FormGroup
        label="Entities Column"
        required
        hint="One or more entity key columns"
        error={
          err && form.entitiesColumns.length === 0
            ? "Select at least one entity column"
            : undefined
        }
      >
        <EntitiesColumnMultiSelect
          value={form.entitiesColumns}
          onChange={v => setField("entitiesColumns", v)}
          columns={columns}
          loading={columnsLoading}
          disabled={!form.tableName.trim()}
          hasError={err && form.entitiesColumns.length === 0}
        />
      </FormGroup>

      <FormGroup label="Custom Filter" hint="Optional">
        <StyledInput
          value={form.filter}
          onChange={v => setField("filter", v)}
          placeholder="Please Input SQL After 'WHERE'"
          mono
        />
      </FormGroup>
    </div>
  );
}

// ─── SourceTypeBadge ──────────────────────────────────────────────────────────
function SourceTypeBadge({ sourceType }: { sourceType: string }) {
  const c = SOURCE_TYPE_COLORS[sourceType] ?? { bg: "#f3f4f6", text: "#374151", border: "#e5e7eb" };
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-md text-xs border"
      style={{ background: c.bg, color: c.text, borderColor: c.border, fontWeight: 600 }}
    >
      {sourceType}
    </span>
  );
}

// ─── FeatureSourceSelect ──────────────────────────────────────────────────────
function FeatureSourceSelect({
  value, onChange, sources, hasError,
}: {
  value: string;
  onChange: (name: string, sourceType: string, inputParams: string[]) => void;
  sources: MockFeatureSource[];
  hasError?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = sources.find(s => s.name === value) ??
    MOCK_FEATURE_SOURCES.find(s => s.name === value); // fallback for pre-filled drafts

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg border transition-colors text-left ${
          hasError ? "border-red-300 bg-red-50" : "border-gray-200 bg-white hover:border-[#13c2c2]"
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {selected ? (
            <>
              <span className="truncate text-gray-800" style={{ fontFamily: "monospace", fontSize: 13 }}>
                {selected.name}
              </span>
            </>
          ) : (
            <span className="text-gray-400">Select feature source…</span>
          )}
        </div>
        <ChevronDown size={13} className={`text-gray-400 flex-shrink-0 ml-2 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute top-full mt-1 left-0 z-[130] bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden"
          style={{ minWidth: "100%", maxHeight: 220 }}
        >
          <div className="overflow-y-auto" style={{ maxHeight: 220 }}>
            {sources.length === 0 ? (
              <div className="px-3 py-5 text-xs text-gray-400 text-center">
                No connected feature sources for this region
              </div>
            ) : (
              sources.map(s => {
                const isSelected = value === s.name;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => { onChange(s.name, s.sourceType, s.inputParams); setOpen(false); }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 text-xs text-left transition-colors ${
                      isSelected ? "bg-teal-50" : "hover:bg-gray-50"
                    }`}
                  >
                    <span
                      style={{
                        fontFamily: "monospace",
                        fontWeight: isSelected ? 600 : 400,
                        color: isSelected ? "#0e9494" : "#374151",
                      }}
                    >
                      {s.name}
                    </span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <SourceTypeBadge sourceType={s.sourceType} />
                      {isSelected && <Check size={11} style={{ color: "#13c2c2" }} />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── CascadingTransformSelect ─────────────────────────────────────────────────
function CascadingTransformSelect({
  value, onChange, transformations, hasError,
}: {
  value: string;
  onChange: (combined: string) => void;
  transformations: MockTransformation[];
  hasError?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [activeName, setActiveName] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Parse current value
  const atIdx = value.indexOf("@");
  const currentName    = atIdx > -1 ? value.slice(0, atIdx) : value;
  const currentVersion = atIdx > -1 ? value.slice(atIdx + 1) : "";

  const activeTransf = transformations.find(t => t.name === activeName);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  function handleOpen() {
    setActiveName(currentName || (transformations[0]?.name ?? null));
    setOpen(v => !v);
  }

  return (
    <div className="relative" ref={ref}>
      {/* Trigger */}
      <button
        type="button"
        onClick={handleOpen}
        className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg border transition-colors text-left ${
          hasError ? "border-red-300 bg-red-50" : "border-gray-200 bg-white hover:border-[#13c2c2]"
        }`}
      >
        <span style={{ fontFamily: "monospace", color: value ? "#1a1a2e" : "#9ca3af", fontSize: 13 }}>
          {value || "Select transformation…"}
        </span>
        <ChevronDown size={13} className={`text-gray-400 flex-shrink-0 ml-2 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {/* Cascading dropdown */}
      {open && (
        <div
          className="absolute top-full mt-1 left-0 z-[130] bg-white border border-gray-200 rounded-lg shadow-xl flex overflow-hidden"
          style={{ minWidth: 380 }}
        >
          {/* Left panel: transformation names */}
          <div className="border-r border-gray-100 overflow-y-auto flex-shrink-0" style={{ width: 210, maxHeight: 240 }}>
            <div className="px-3 py-2 border-b border-gray-100">
              <span className="text-xs text-gray-400" style={{ fontWeight: 600 }}>Transformation</span>
            </div>
            {transformations.length === 0 ? (
              <div className="px-3 py-5 text-xs text-gray-400 text-center">
                No transformations for this region
              </div>
            ) : (
              transformations.map(t => {
                const statusStyle = TRANSFORM_STATUS_STYLE[t.status] ?? TRANSFORM_STATUS_STYLE.Active;
                const isActive = activeName === t.name;
                const isSelected = currentName === t.name;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveName(isActive ? null : t.name)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 text-xs text-left transition-colors ${
                      isActive ? "bg-teal-50" : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span style={{ fontWeight: isSelected ? 700 : 500, color: isActive ? "#0e9494" : "#374151" }}>
                        {t.name}
                      </span>
                      {isSelected && (
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: "#13c2c2" }} />
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span
                        className="text-xs px-1.5 py-0.5 rounded"
                        style={{ background: statusStyle.bg, color: statusStyle.text, fontWeight: 500 }}
                      >
                        {t.status}
                      </span>
                      <ChevronRight size={11} className={isActive ? "text-teal-500" : "text-gray-300"} />
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Right panel: versions */}
          <div className="flex-1 overflow-y-auto" style={{ minWidth: 150, maxHeight: 240 }}>
            {activeName && activeTransf ? (
              <>
                <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
                  <span className="text-xs text-gray-500" style={{ fontWeight: 600 }}>
                    {activeName}
                  </span>
                  <span className="text-xs text-gray-400">version</span>
                </div>
                {activeTransf.versions.map(v => {
                  const combined = `${activeName}@${v}`;
                  const isSelected = value === combined;
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() => { onChange(combined); setOpen(false); }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 text-xs text-left transition-colors ${
                        isSelected ? "bg-teal-50" : "hover:bg-gray-50"
                      }`}
                    >
                      <span style={{
                        fontFamily: "monospace",
                        fontWeight: isSelected ? 700 : 500,
                        color: isSelected ? "#0e9494" : "#374151",
                        fontSize: 13,
                      }}>
                        {v}
                      </span>
                      {isSelected && <Check size={11} style={{ color: "#13c2c2" }} />}
                    </button>
                  );
                })}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-8 text-xs text-gray-400 gap-1">
                <ChevronRight size={16} className="text-gray-300" />
                <span>Select a transformation</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MappingSelect ────────────────────────────────────────────────────────────
function MappingSelect({ value, options, onChange }: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative flex-1 min-w-0">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full appearance-none text-xs px-2.5 py-1.5 pr-7 rounded-md border outline-none transition-colors cursor-pointer"
        style={{
          borderColor: value ? "#13c2c2" : "#e5e7eb",
          color: value ? "#0a8f8f" : "#9ca3af",
          background: value ? "rgba(19,194,194,0.04)" : "white",
          fontFamily: "monospace",
          fontWeight: value ? 600 : 400,
        }}
      >
        <option value="">Select training feature…</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
    </div>
  );
}

// ─── LatestTransformationSelect (Name only → Name@LatestEnabledVersion) ─────
function LatestTransformationSelect({
  value,
  onChange,
  transformations,
  region,
  hasError,
}: {
  value: string;
  onChange: (combined: string) => void;
  transformations: MockTransformation[];
  region: string;
  hasError?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const atIdx = value.lastIndexOf("@");
  const verTag = atIdx > -1 ? value.slice(atIdx + 1) : "";

  return (
    <div className="flex items-center gap-2 min-w-0 w-full" ref={ref}>
      <div className="relative flex-1 min-w-0">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg border transition-colors text-left ${
            hasError ? "border-red-300 bg-red-50" : "border-gray-200 bg-white hover:border-[#13c2c2]"
          }`}
        >
          <span style={{ fontFamily: "monospace", color: value ? "#1a1a2e" : "#9ca3af", fontSize: 13 }}>
            {value ? value.split("@")[0] : "Select transformation…"}
          </span>
          <ChevronDown size={13} className={`text-gray-400 flex-shrink-0 ml-2 ${open ? "rotate-180" : ""}`} />
        </button>
        {open && (
        <div
          className="absolute top-full mt-1 left-0 z-[130] bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden"
          style={{ minWidth: "100%", maxHeight: 240 }}
        >
          <div className="overflow-y-auto" style={{ maxHeight: 240 }}>
            {transformations.length === 0 ? (
              <div className="px-3 py-5 text-xs text-gray-400 text-center">No transformations for this region</div>
            ) : (
              transformations.map(t => {
                const combined = transformationPickLatest(region, t.name);
                const isSelected = value === combined || value.split("@")[0] === t.name;
                const st = TRANSFORM_STATUS_STYLE[t.status] ?? TRANSFORM_STATUS_STYLE.Active;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      onChange(combined);
                      setOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 text-xs text-left transition-colors ${
                      isSelected ? "bg-teal-50" : "hover:bg-gray-50"
                    }`}
                  >
                    <span style={{ fontWeight: isSelected ? 700 : 500, color: isSelected ? "#0e9494" : "#374151" }}>
                      {t.name}
                    </span>
                    <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: st.bg, color: st.text }}>
                      {t.status}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
        )}
      </div>
      {verTag ? (
        <span className="text-xs font-mono text-gray-500 flex-shrink-0 tabular-nums">
          {verTag}
        </span>
      ) : null}
    </div>
  );
}

