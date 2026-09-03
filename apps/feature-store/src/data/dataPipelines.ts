/** Data Pipeline (v2) — lineage-only view of upstream pipelines federated from DataVerse.
 *  See docs/design/00-overview/feature-lifecycle-overview.md §2 + feature-source-interaction-spec.md §13-§18.
 */

export type PipelineType = "FlinkStream" | "SparkBatch" | "Dbt" | "AirflowDAG";

export type PipelineHealthState =
  | "Healthy"
  | "Stale"
  | "SyncFailed"
  | "Frozen"
  | "Ignored"
  | "InSync";

export interface InputAsset {
  name: string;
  /** e.g. "kafka.topic" | "hive.table" | "mysql.table" */
  assetType: string;
  dataverseAssetId: string;
}

export interface DataPipeline {
  id: string;
  pipelineType: PipelineType;
  /** Unique identity in external metadata catalog (DataVerse). Required. */
  dataverseId: string;
  /** Display name */
  name: string;
  /** Scheduling platform tag (e.g. "Airflow", "Internal-Spark", "Internal-Flink"). */
  platformType: string;
  /** External URL to the platform's job detail page. */
  taskUrl: string;
  /** 1-hop upstream input assets. */
  inputAssets: InputAsset[];
  /** Single output asset consumed by an FS. */
  outputAsset: InputAsset;
  /** Output schema snapshot (column names + types), timestamped. */
  outputSchemaSnapshot?: { capturedAt: string; columns: { name: string; dataType: string }[] };
  /** Owner team synced from DataVerse. */
  ownerTeam: string;
  /** Upstream schedule (read-only from DataVerse). e.g. "0 2 * * *" or "Stream" */
  upstreamSchedule: string;
  /** Our FS poll cadence to DataVerse (cron). Default: Daily 02:00 UTC+8. */
  ourSyncPolicy: string;
  /** State of the upstream pipeline. */
  state: PipelineHealthState;
  /** Last successful run timestamp (ISO format: YYYY-MM-DD HH:mm:ss). */
  lastSuccessAt?: string;
  /** Streaming lag if applicable (e.g. "2.3s"). */
  lag?: string;
  /** Optional column-level lineage (only for HIVE→HIVE). */
  columnLineage?: { outputColumn: string; inputColumns: string[] }[];
}

/** Map FS id to attached Data Pipeline id list (federated lineage cache). */
export interface FsDpAttachment {
  fsId: string;
  dpIds: string[];
  /** Last time we polled DataVerse for this FS. */
  lastSyncAt: string;
  /** If true, DP auto-rebind on next sync is skipped. */
  ignoredDpIds?: string[];
}
