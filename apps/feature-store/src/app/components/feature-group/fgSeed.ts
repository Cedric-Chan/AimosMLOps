import type { FgServingCanvasState } from "@/data/fgServingCanvasModel";
import type { NodeDef } from "@/data/widetableCanvasModel";
import type { FGFormData } from "./FeatureGroupModal";

/** Mock publish snapshot for Serving canvas history */
export interface FgServingPublishRecord {
  id: string;
  label: string;
  createdAt: string;
  state?: FgServingCanvasState;
  /** @deprecated WideTable-shaped legacy snapshots */
  nodes?: NodeDef[];
}

export interface FeatureGroup {
  id: string;
  name: string;
  region: string;
  module: string;
  owner: string;
  createTime: string;
  updateTime: string;
  description: string;
  /** Soft delete: hidden from list */
  deleted?: boolean;
  /** Current Serving DAG + node configs (mock) */
  servingCanvasState?: FgServingCanvasState;
  /** @deprecated use servingCanvasState */
  servingCanvasNodes?: NodeDef[];
  /** Newest-first publish snapshots */
  servingPublishHistory?: FgServingPublishRecord[];
  /** Internal: form data preserved for draft editing */
  _formData?: Partial<FGFormData>;
  /** Internal: last saved step index */
  _savedStep?: number;
}

/** Training Config feature names for End node dropdown (compute + offline mapping keys). */
export function trainingFeatureNamesFromForm(
  form?: Partial<FGFormData>
): string[] {
  const names = new Set<string>();
  for (const row of form?.computeFeatures ?? []) {
    const n = row.name?.trim();
    if (n) names.add(n);
  }
  for (const key of Object.keys(form?.featureMapping ?? {})) {
    const k = key.trim();
    if (k) names.add(k);
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}

export const INITIAL_FG_LIST_SEED: FeatureGroup[] = [
  {
    id: "1",
    name: "user_risk_score_fg",
    region: "TH",
    module: "Credit Buyer Behavior",
    owner: "cedric.chencan@seamoney.com,sankar.shyamal@seamoney.com",
    createTime: "2026-02-14 10:00:00",
    updateTime: "2026-02-16 08:30:00",
    description:
      "User risk scoring feature group for Thailand market, aggregates behavioral signals and transaction patterns.",
    _formData: {
      name: "user_risk_score_fg",
      region: "TH",
      module: "Credit Buyer Behavior",
      owners: ["cedric.chencan@seamoney.com", "sankar.shyamal@seamoney.com"],
      description:
        "User risk scoring feature group for Thailand market, aggregates behavioral signals and transaction patterns.",
      dataServer: "reg_sg_hive",
      tableSchema: "risk_db",
      tableName: "user_risk_score_ods",
      datePartition: "dt",
      partitionType: "Incremental Data",
      updateFrequency: "Daily",
      entitiesColumns: ["platform_user_id"],
      filter: "dt='2026-02-16'",
      servingBlocks: [
        {
          id: "sb_list_1",
          featureSource: "riskfeat_hbase_th",
          transformation: "QueryAaiCache@V2",
        },
      ],
      featureMapping: {},
      computeFeatures: [],
    },
  },
  {
    id: "2",
    name: "mx_acard_realtime_fg",
    region: "MX",
    module: "External Data",
    owner: "zhengyi.loh@seamoney.com",
    createTime: "2026-02-10 14:20:00",
    updateTime: "2026-02-15 11:00:00",
    description:
      "Real-time feature group for Mexico A-card model, capturing live transaction velocity and account age features.",
    _formData: {
      name: "mx_acard_realtime_fg",
      region: "MX",
      module: "External Data",
      owners: ["zhengyi.loh@seamoney.com"],
      description:
        "Real-time feature group for Mexico A-card model, capturing live transaction velocity and account age features.",
      dataServer: "reg_us_hive",
      tableSchema: "acard_db",
      tableName: "mx_acard_realtime_ods",
      datePartition: "event_date",
      partitionType: "Full Data",
      updateFrequency: "Weekly",
      entitiesColumns: ["platform_user_id"],
      filter: "",
      servingBlocks: [
        {
          id: "sb_list_2",
          featureSource: "mx_redis_cache",
          transformation: "QueryAaiCache@V2",
        },
      ],
      featureMapping: {},
      computeFeatures: [],
    },
  },
  {
    id: "3",
    name: "th_embedding_fg_v3",
    region: "TH",
    module: "External Data",
    owner: "sankar.shyamal@seamoney.com",
    createTime: "2026-02-08 09:30:00",
    updateTime: "2026-02-11 16:20:00",
    description:
      "Version 3 of Thailand embedding feature group, includes improved user graph embeddings and NLP-derived features.",
    _formData: {
      name: "th_embedding_fg_v3",
      region: "TH",
      module: "External Data",
      owners: ["sankar.shyamal@seamoney.com", "huangwei@shopee.com"],
      description:
        "Version 3 of Thailand embedding feature group, includes improved user graph embeddings and NLP-derived features.",
      dataServer: "reg_sg_hive",
      tableSchema: "embedding_db",
      tableName: "th_embedding_v3_ods",
      datePartition: "pt",
      partitionType: "Full Data",
      updateFrequency: "Daily",
      entitiesColumns: ["platform_user_id", "item_id"],
      filter: "",
      servingBlocks: [
        {
          id: "sb_list_3",
          featureSource: "riskfeat_hbase_th",
          transformation: "OfflineFeatureJoin@V2",
        },
      ],
      featureMapping: {},
      computeFeatures: [],
    },
  },
  {
    id: "4",
    name: "dp_recommend_score_fg",
    region: "SHOPEE_SG",
    module: "Credit Buyer Behavior",
    owner: "huangwei@shopee.com",
    createTime: "2026-02-16 13:45:00",
    updateTime: "2026-02-16 13:45:00",
    description:
      "Draft feature group for Shopee Singapore recommendation scoring, currently under review and validation.",
    _formData: {
      name: "dp_recommend_score_fg",
      region: "SHOPEE_SG",
      module: "Credit Buyer Behavior",
      owners: ["huangwei@shopee.com"],
      description:
        "Draft feature group for Shopee Singapore recommendation scoring, currently under review and validation.",
      dataServer: "reg_sg_hive",
      tableSchema: "recommend_db",
      tableName: "dp_recommend_score_ods",
      datePartition: "dt",
      partitionType: "Incremental Data",
      updateFrequency: "Monthly",
      entitiesColumns: ["platform_user_id"],
      filter: "",
      servingBlocks: [],
      featureMapping: {},
      computeFeatures: [],
    },
    _savedStep: 1,
  },
  {
    id: "5",
    name: "user_graph_relation_fg",
    region: "TH",
    module: "Credit Buyer Behavior",
    owner: "cedric.chencan@seamoney.com",
    createTime: "2026-02-06 11:00:00",
    updateTime: "2026-02-13 09:00:00",
    description:
      "User social graph and relation feature group, derives network-based features for fraud detection models.",
    _formData: {
      name: "user_graph_relation_fg",
      region: "TH",
      module: "Credit Buyer Behavior",
      owners: ["cedric.chencan@seamoney.com", "zhengyi.loh@seamoney.com"],
      description:
        "User social graph and relation feature group, derives network-based features for fraud detection models.",
      dataServer: "reg_sg_hive",
      tableSchema: "graph_db",
      tableName: "user_graph_relation_ods",
      datePartition: "stat_date",
      partitionType: "Incremental Data",
      updateFrequency: "Daily",
      entitiesColumns: ["platform_user_id", "shop_id"],
      filter: "is_active=true",
      servingBlocks: [
        {
          id: "sb_list_5",
          featureSource: "th_graph_relation",
          transformation: "QueryAaiCache@V3",
        },
      ],
      featureMapping: {},
      computeFeatures: [],
    },
  },
  {
    id: "6",
    name: "mx_device_fingerprint_fg",
    region: "MX",
    module: "External Data",
    owner: "xiaochen.kuang@monee.com",
    createTime: "2026-01-28 15:30:00",
    updateTime: "2026-02-15 20:00:00",
    description:
      "Device fingerprint feature group for Mexico, tracks device identity signals and cross-device behavior patterns.",
    _formData: {
      name: "mx_device_fingerprint_fg",
      region: "MX",
      module: "External Data",
      owners: ["xiaochen.kuang@monee.com"],
      description:
        "Device fingerprint feature group for Mexico, tracks device identity signals and cross-device behavior patterns.",
      dataServer: "reg_us_hive",
      tableSchema: "device_db",
      tableName: "mx_device_fingerprint_ods",
      datePartition: "data_date",
      partitionType: "Full Data",
      updateFrequency: "Daily",
      entitiesColumns: ["spp_user_id", "device_id"],
      filter: "",
      servingBlocks: [
        {
          id: "sb_list_6",
          featureSource: "mx_redis_cache",
          transformation: "MxRealtimeScore@V1",
        },
      ],
      featureMapping: {},
      computeFeatures: [],
    },
  },
];

export const INITIAL_MODULES = [
  "System",
  "Credit Buyer Behavior",
  "Credit Seller Behavior",
  "E-Commerce Buyer Behavior",
  "E-Commerce Seller Behavior",
  "Offline Seller Service",
  "Shopee Pay",
  "Shopee Food",
  "Data Point",
  "Linked Features",
  "Phone",
  "Application",
  "External Data",
];
