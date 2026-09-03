export interface UsedByAsset {
  assetType: "WideTable" | "Feature Service" | "Workflow Service";
  assetName: string;
  /** WideTable has no version concept → "-" */
  version: string;
  owner: string;
}

export interface Feature {
  id: string;
  name: string;
  region: string;
  featureGroup: string;
  module: string;
  entity: string;
  dataType: string;
  training: boolean | null;
  serving: boolean | null;
  ydServingReq: number;
  updateTime: string;
  // ── feature-level detail (shown in Feature Detail Modal) ──
  returnType?: string;
  errorHandle?: string;
  tags?: string[];
  description?: string;
  usedBy?: UsedByAsset[];
}

export interface FeatureGroup {
  id: string;
  name: string;
  features: Feature[];
}

export interface Module {
  id: string;
  name: string;
  groups: FeatureGroup[];
}

export interface FilterState {
  keyword: string;
  region: string;
  entity: string;
  servingAvail: string;
}