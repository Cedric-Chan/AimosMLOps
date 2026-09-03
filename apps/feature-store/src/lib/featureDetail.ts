import { INITIAL_FG_LIST_SEED } from "@/app/components/feature-group/fgSeed";
import type { Feature } from "@/app/components/feature-map/types";

/**
 * Feature-Set (FeatureGroup) info inherited by a feature, resolved live from the
 * FeatureGroup seed so it never duplicates FG config. Used by FeatureDetailModal.
 */
export interface FeatureSetInfo {
  featureGroup: string;
  /** Numeric string id from fgSeed, used to build /fg/:fgId links */
  fgId: string | null;
  region: string;
  module: string;
  owners: string[];
  /** present when Training availability = TRUE */
  training: { hiveTable: string; entityColumns: string[] } | null;
  /** present when Serving availability = TRUE */
  serving: { featureSource: string; inputParams: string[] } | null;
}

export function resolveFeatureSetInfo(feature: Feature): FeatureSetInfo {
  const fg = INITIAL_FG_LIST_SEED.find((g) => g.name === feature.featureGroup);
  const form = fg?._formData;

  const owners =
    form?.owners && form.owners.length > 0
      ? form.owners
      : fg?.owner
      ? fg.owner.split(",").map((o) => o.trim()).filter(Boolean)
      : [];

  const entityColumns =
    form?.entitiesColumns && form.entitiesColumns.length > 0
      ? form.entitiesColumns
      : [feature.entity];

  const hiveTable =
    form?.tableSchema && form?.tableName
      ? `${form.tableSchema}.${form.tableName}`
      : "—";

  // Serving FeatureSource is queried by the entity key(s) → those are the input params.
  const featureSource = form?.servingBlocks?.[0]?.featureSource ?? "—";

  return {
    featureGroup: feature.featureGroup,
    fgId: fg?.id ?? null,
    region: fg?.region ?? feature.region,
    module: fg?.module ?? feature.module,
    owners,
    training: feature.training ? { hiveTable, entityColumns } : null,
    serving: feature.serving ? { featureSource, inputParams: entityColumns } : null,
  };
}
