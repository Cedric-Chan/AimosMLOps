/** Mock registered Feature Sources / Transformations for Serving Config canvas */

export type FgServingFieldType = "string" | "int" | "bool" | "map";

export interface FgServingParamDef {
  name: string;
  type: FgServingFieldType;
}

export interface FgServingCatalogEntry {
  id: string;
  label: string;
  versionTag: string;
  inputs: FgServingParamDef[];
  outputs: FgServingParamDef[];
}

export const FG_SERVING_FEATURE_SOURCES: FgServingCatalogEntry[] = [
  {
    id: "fs_user_profile_redis",
    label: "User Profile Redis",
    versionTag: "V4",
    inputs: [
      { name: "file_format", type: "string" },
      { name: "file_url", type: "string" },
      { name: "file_pwd", type: "string" },
      { name: "request_source", type: "string" },
      { name: "use_proxy", type: "bool" },
      { name: "meta", type: "map" },
    ],
    outputs: [
      { name: "input_file", type: "string" },
      { name: "code", type: "int" },
      { name: "msg", type: "string" },
    ],
  },
  {
    id: "fs_3rd_data_grpc",
    label: "3rd Data gRPC",
    versionTag: "V4",
    inputs: [
      { name: "file_format", type: "string" },
      { name: "file_url", type: "string" },
      { name: "endpoint", type: "string" },
      { name: "timeout_ms", type: "int" },
    ],
    outputs: [
      { name: "payload", type: "string" },
      { name: "status_code", type: "int" },
      { name: "trace_id", type: "string" },
    ],
  },
  {
    id: "fs_credit_hbase",
    label: "Credit Result HBase",
    versionTag: "V4",
    inputs: [
      { name: "row_key", type: "string" },
      { name: "family", type: "string" },
      { name: "qualifier", type: "string" },
    ],
    outputs: [
      { name: "credit_raw", type: "string" },
      { name: "ttl_sec", type: "int" },
    ],
  },
];

export const FG_SERVING_TRANSFORMATIONS: FgServingCatalogEntry[] = [
  {
    id: "xfm_user_profile_fts",
    label: "User Profile Fts",
    versionTag: "V4",
    inputs: [
      { name: "input_file", type: "string" },
      { name: "code", type: "int" },
      { name: "locale", type: "string" },
    ],
    outputs: [
      { name: "user_vec", type: "map" },
      { name: "user_score", type: "int" },
    ],
  },
  {
    id: "xfm_aai_fts",
    label: "AAI Fts",
    versionTag: "V4",
    inputs: [
      { name: "payload", type: "string" },
      { name: "status_code", type: "int" },
    ],
    outputs: [
      { name: "aai_features", type: "map" },
      { name: "model_id", type: "string" },
    ],
  },
  {
    id: "xfm_credit_score",
    label: "Credit Score",
    versionTag: "V4",
    inputs: [
      { name: "credit_raw", type: "string" },
      { name: "ttl_sec", type: "int" },
    ],
    outputs: [
      { name: "credit_score", type: "int" },
      { name: "risk_band", type: "string" },
    ],
  },
];

export const FG_SERVING_DEFAULT_CATALOG_BY_NODE: Record<
  string,
  { kind: "feature_source" | "transformation"; catalogId: string }
> = {
  B: { kind: "feature_source", catalogId: "fs_user_profile_redis" },
  C: { kind: "feature_source", catalogId: "fs_3rd_data_grpc" },
  D: { kind: "feature_source", catalogId: "fs_credit_hbase" },
  E: { kind: "transformation", catalogId: "xfm_user_profile_fts" },
  F: { kind: "transformation", catalogId: "xfm_aai_fts" },
  G: { kind: "transformation", catalogId: "xfm_credit_score" },
};

export function getFeatureSourceById(id: string): FgServingCatalogEntry | undefined {
  return FG_SERVING_FEATURE_SOURCES.find((e) => e.id === id);
}

export function getTransformationById(id: string): FgServingCatalogEntry | undefined {
  return FG_SERVING_TRANSFORMATIONS.find((e) => e.id === id);
}
