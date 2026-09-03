import type { NodeId } from "@/data/widetableCanvasModel";

export interface CatalogColumn {
  name: string;
  type: string;
}

export interface FGDef {
  name: string;
  dataServer: string;
  schema: string;
  table: string;
  filter: string;
  entityCols: string[];
  eventTimeCols: string[];
  cols: CatalogColumn[];
}

export const FG_CATALOG: FGDef[] = [
  {
    name: "user_profile_features",
    dataServer: "reg_sg_hive",
    schema: "feature_store",
    table: "user_profile_v3",
    filter: "—",
    entityCols: ["user_id"],
    eventTimeCols: ["last_login_days"],
    cols: [
      { name: "age", type: "INT" },
      { name: "gender", type: "STRING" },
      { name: "country", type: "STRING" },
      { name: "registration_days", type: "INT" },
      { name: "is_verified", type: "BOOLEAN" },
      { name: "last_login_days", type: "INT" },
      { name: "account_level", type: "INT" },
    ],
  },
  {
    name: "order_history_features",
    dataServer: "reg_sg_hive",
    schema: "feature_store",
    table: "order_history_v2",
    filter: "ds >= '2024-01-01'",
    entityCols: ["user_id", "order_id"],
    eventTimeCols: ["order_time", "ds"],
    cols: [
      { name: "total_orders", type: "INT" },
      { name: "total_amount", type: "DOUBLE" },
      { name: "avg_order_value", type: "DOUBLE" },
      { name: "last_order_time", type: "TIMESTAMP" },
      { name: "order_time", type: "TIMESTAMP" },
      { name: "category_pref", type: "STRING" },
      { name: "return_rate", type: "DOUBLE" },
      { name: "ds", type: "STRING" },
    ],
  },
  {
    name: "credit_behavior_features",
    dataServer: "reg_us_hive",
    schema: "risk_store",
    table: "credit_behavior_v1",
    filter: "—",
    entityCols: ["user_id"],
    eventTimeCols: ["event_time"],
    cols: [
      { name: "credit_score", type: "INT" },
      { name: "overdue_cnt", type: "INT" },
      { name: "loan_amount", type: "DOUBLE" },
      { name: "repay_ratio", type: "DOUBLE" },
      { name: "event_time", type: "TIMESTAMP" },
      { name: "risk_label", type: "STRING" },
      { name: "delinquency_days", type: "INT" },
    ],
  },
];

export function getCleaningFeatureNameOptions(): string[] {
  const names = new Set<string>();
  for (const fg of FG_CATALOG) {
    for (const c of fg.cols) names.add(c.name);
    fg.entityCols.forEach((x) => names.add(x));
    fg.eventTimeCols.forEach((x) => names.add(x));
  }
  for (const x of ["user_id", "event_time", "order_id", "item_id", "ds"]) {
    names.add(x);
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}

export const DEFAULT_FG_BY_NODE: Partial<Record<NodeId, string>> = {
  C: "user_profile_features",
  D: "order_history_features",
  E: "credit_behavior_features",
};

export const JOIN_TYPES = ["Left Latest Join", "Inner Latest Join"];
