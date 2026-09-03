/** Mock Data Pipelines — seeded for the 4 v1 FS + 1 new Hive FS.
 *  Used by FS Detail Page Upstream DP Tab and FeatureMap Detail Lineage Tab.
 */
import type { DataPipeline, FsDpAttachment } from "./dataPipelines";

export const MOCK_DATA_PIPELINES: DataPipeline[] = [
  {
    id: "dp-tx-flink",
    pipelineType: "FlinkStream",
    dataverseId: "dv-flink-001",
    name: "tx_event_to_hbase_detail",
    platformType: "Internal-Flink",
    taskUrl: "https://dataverse.example.com/flink/tx_event_to_hbase_detail",
    inputAssets: [
      { name: "kafka.tx_events", assetType: "kafka.topic", dataverseAssetId: "dv-kafka-tx" },
    ],
    outputAsset: { name: "online:user_tx", assetType: "hbase.table", dataverseAssetId: "dv-hbase-user-tx" },
    ownerTeam: "realtime-team",
    upstreamSchedule: "Stream",
    ourSyncPolicy: "0 2 * * *",
    state: "InSync",
    lastSuccessAt: "2026-05-12 14:28:30",
    lag: "2.3s",
  },
  {
    id: "dp-tx-spark",
    pipelineType: "SparkBatch",
    dataverseId: "dv-spark-007",
    name: "dwd_user_tx_30d_agg",
    platformType: "Airflow",
    taskUrl: "https://dataverse.example.com/airflow/dag/dwd_user_tx_30d_agg",
    inputAssets: [
      { name: "ods.user_tx_log", assetType: "hive.table", dataverseAssetId: "dv-hive-ods-tx" },
      { name: "dim.user_meta", assetType: "hive.table", dataverseAssetId: "dv-hive-dim-user" },
    ],
    outputAsset: { name: "dwd.user_tx_features", assetType: "hive.table", dataverseAssetId: "dv-hive-user-tx-feat" },
    outputSchemaSnapshot: {
      capturedAt: "2026-05-12 02:14:00",
      columns: [
        { name: "user_id", dataType: "STRING" },
        { name: "credit_amount_30d", dataType: "DECIMAL(18,2)" },
        { name: "tx_count_30d", dataType: "BIGINT" },
        { name: "ds", dataType: "STRING" },
      ],
    },
    ownerTeam: "dw-team",
    upstreamSchedule: "0 2 * * *",
    ourSyncPolicy: "0 2 * * *",
    state: "Healthy",
    lastSuccessAt: "2026-05-12 02:14:00",
  },
  {
    id: "dp-status-flink",
    pipelineType: "FlinkStream",
    dataverseId: "dv-flink-002",
    name: "user_status_cdc_to_redis",
    platformType: "Internal-Flink",
    taskUrl: "https://dataverse.example.com/flink/user_status_cdc_to_redis",
    inputAssets: [
      { name: "mysql.user_status.binlog", assetType: "mysql.binlog", dataverseAssetId: "dv-mysql-user-status" },
    ],
    outputAsset: { name: "user:status", assetType: "redis.key", dataverseAssetId: "dv-redis-user-status" },
    ownerTeam: "realtime-team",
    upstreamSchedule: "Stream",
    ourSyncPolicy: "0 2 * * *",
    state: "InSync",
    lastSuccessAt: "2026-05-12 14:30:00",
    lag: "0.8s",
  },
  {
    id: "dp-nebula-batch",
    pipelineType: "SparkBatch",
    dataverseId: "dv-spark-012",
    name: "user_phone_graph_to_nebula",
    platformType: "Airflow",
    taskUrl: "https://dataverse.example.com/airflow/dag/user_phone_graph_to_nebula",
    inputAssets: [
      { name: "dwd.user_phone_relations", assetType: "hive.table", dataverseAssetId: "dv-hive-phone-rel" },
      { name: "dwd.user_blacklist", assetType: "hive.table", dataverseAssetId: "dv-hive-blacklist" },
    ],
    outputAsset: { name: "user_phone_graph", assetType: "nebula.space", dataverseAssetId: "dv-nebula-phone" },
    ownerTeam: "graph-team",
    upstreamSchedule: "0 3 * * *",
    ourSyncPolicy: "0 2 * * *",
    state: "Healthy",
    lastSuccessAt: "2026-05-12 03:20:00",
  },
  {
    id: "dp-credit-batch",
    pipelineType: "SparkBatch",
    dataverseId: "dv-spark-018",
    name: "credit_report_batch_pull_parse",
    platformType: "Airflow",
    taskUrl: "https://dataverse.example.com/airflow/dag/credit_report_batch_pull_parse",
    inputAssets: [
      { name: "ods.user_identity", assetType: "hive.table", dataverseAssetId: "dv-hive-identity" },
    ],
    outputAsset: { name: "dwd.credit_report_features", assetType: "hive.table", dataverseAssetId: "dv-hive-credit-feat" },
    outputSchemaSnapshot: {
      capturedAt: "2026-05-12 02:30:00",
      columns: [
        { name: "user_id", dataType: "STRING" },
        { name: "credit_score", dataType: "INT" },
        { name: "overdue_cnt_90d", dataType: "BIGINT" },
        { name: "ds", dataType: "STRING" },
      ],
    },
    ownerTeam: "risk-team",
    upstreamSchedule: "0 2 * * *",
    ourSyncPolicy: "0 2 * * *",
    state: "Stale",
    lastSuccessAt: "2026-05-11 14:30:00",
  },
];

/**
 * Attachment map: FS id → DP ids.
 * Only storage-backed FS types have upstream DPs (HBase / Redis / GraphDB / Hive / MySQL).
 * Service-call types (gRPC / HTTP) are invoked at runtime — no write-backing, no upstream DP.
 */
export const MOCK_FS_DP_ATTACHMENTS: FsDpAttachment[] = [
  {
    fsId: "fs-hbase-001",
    dpIds: ["dp-tx-flink"],
    lastSyncAt: "2026-05-12 02:00:00",
  },
  // fs-grpc-001 intentionally omitted: gRPC is a runtime service call, not a write-backed store
  {
    fsId: "fs-redis-001",
    dpIds: ["dp-status-flink"],
    lastSyncAt: "2026-05-12 02:00:00",
  },
  {
    fsId: "fs-graphdb-001",
    dpIds: ["dp-nebula-batch"],
    lastSyncAt: "2026-05-12 02:00:00",
  },
  {
    fsId: "fs-hive-001",
    dpIds: ["dp-tx-spark", "dp-credit-batch"],
    lastSyncAt: "2026-05-12 02:00:00",
  },
];

export function findDataPipelineById(id: string): DataPipeline | undefined {
  return MOCK_DATA_PIPELINES.find((dp) => dp.id === id);
}

export function findDpsForFs(fsId: string): DataPipeline[] {
  const att = MOCK_FS_DP_ATTACHMENTS.find((a) => a.fsId === fsId);
  if (!att) return [];
  return att.dpIds
    .map((id) => findDataPipelineById(id))
    .filter((dp): dp is DataPipeline => dp !== undefined);
}
