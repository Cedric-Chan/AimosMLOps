import {
  FG_SERVING_DEFAULT_CATALOG_BY_NODE,
  getFeatureSourceById,
  getTransformationById,
  type FgServingFieldType,
} from "./fgServingCatalog";

/** Summary for Feature Group detail Serving Config card (published canvas). */
export interface FgServingPublishedSummary {
  /** One line per Feature Source node (B, C, D) on the canvas. */
  featureSourceLines: string[];
  /** END node output row count. */
  servingFts: number;
  /** END rows whose feature name matches Training Config feature list. */
  mappedFts: number;
  /** servingFts − mappedFts (includes unnamed rows). */
  extraFts: number;
}

const FS_NODE_IDS = ["B", "C", "D"] as const;

/**
 * Lists registered Feature Source display names for nodes B/C/D from canvas config.
 */
export function listServingFeatureSourceDependencyLines(
  state: FgServingCanvasState | undefined
): string[] {
  if (!state) return [];
  const lines: string[] = [];
  for (const nid of FS_NODE_IDS) {
    const cfg = state.configs[nid];
    if (cfg?.kind !== "feature_source") continue;
    const id = cfg.asset.selectedCatalogId;
    const ent = getFeatureSourceById(id);
    lines.push(ent ? ent.label : id);
  }
  return lines;
}

/**
 * END node output counts: total rows vs names present in the training feature set.
 */
export function computeFgServingPublishedSummary(
  state: FgServingCanvasState | undefined,
  trainingFeatureNameSet: Set<string>
): FgServingPublishedSummary {
  const featureSourceLines = listServingFeatureSourceDependencyLines(state);
  if (!state) {
    return {
      featureSourceLines,
      servingFts: 0,
      mappedFts: 0,
      extraFts: 0,
    };
  }
  const j = state.configs.J;
  if (!j || j.kind !== "end") {
    return {
      featureSourceLines,
      servingFts: 0,
      mappedFts: 0,
      extraFts: 0,
    };
  }
  const servingFts = j.outputs.length;
  let mappedFts = 0;
  for (const row of j.outputs) {
    const n = row.trainingFeatureName.trim();
    if (n && trainingFeatureNameSet.has(n)) mappedFts += 1;
  }
  const extraFts = servingFts - mappedFts;
  return { featureSourceLines, servingFts, mappedFts, extraFts };
}

export type FgServingNodeId =
  | "A"
  | "B"
  | "C"
  | "D"
  | "E"
  | "F"
  | "G"
  | "H"
  | "I"
  | "J";

export type FgServingNodeKind =
  | "start"
  | "feature_source"
  | "transformation"
  | "compute"
  | "end";

export interface FgServingNodeDef {
  id: FgServingNodeId;
  kind: FgServingNodeKind;
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  subtitle: string;
}

export const FG_SERVING_CANVAS_W = 1180;
export const FG_SERVING_CANVAS_H = 620;

export const FG_SERVING_EDGES: [FgServingNodeId, FgServingNodeId][] = [
  ["A", "B"],
  ["A", "C"],
  ["A", "D"],
  ["B", "E"],
  ["C", "F"],
  ["D", "G"],
  ["F", "H"],
  ["E", "H"],
  ["E", "I"],
  ["G", "I"],
  ["H", "J"],
  ["I", "J"],
  ["G", "J"],
];

export const FG_SERVING_INITIAL_NODES: FgServingNodeDef[] = [
  {
    id: "A",
    kind: "start",
    x: 36,
    y: 272,
    w: 132,
    h: 72,
    title: "Start",
    subtitle: "Start node",
  },
  {
    id: "B",
    kind: "feature_source",
    x: 208,
    y: 88,
    w: 208,
    h: 76,
    title: "Feature Source 1",
    subtitle: "User Profile Redis",
  },
  {
    id: "C",
    kind: "feature_source",
    x: 208,
    y: 272,
    w: 208,
    h: 76,
    title: "Feature Source 2",
    subtitle: "3rd Data gRPC",
  },
  {
    id: "D",
    kind: "feature_source",
    x: 208,
    y: 456,
    w: 208,
    h: 76,
    title: "Feature Source 3",
    subtitle: "Credit Result HBase",
  },
  {
    id: "E",
    kind: "transformation",
    x: 448,
    y: 88,
    w: 208,
    h: 76,
    title: "Transformation 1",
    subtitle: "User Profile Fts",
  },
  {
    id: "F",
    kind: "transformation",
    x: 448,
    y: 272,
    w: 208,
    h: 76,
    title: "Transformation 2",
    subtitle: "AAI Fts",
  },
  {
    id: "G",
    kind: "transformation",
    x: 448,
    y: 456,
    w: 208,
    h: 76,
    title: "Transformation 3",
    subtitle: "Credit Score",
  },
  {
    id: "H",
    kind: "compute",
    x: 700,
    y: 168,
    w: 196,
    h: 76,
    title: "Compute Code Block 1",
    subtitle: "Compute Fts 1",
  },
  {
    id: "I",
    kind: "compute",
    x: 700,
    y: 368,
    w: 196,
    h: 76,
    title: "Compute Code Block 2",
    subtitle: "Compute Fts 2",
  },
  {
    id: "J",
    kind: "end",
    x: 940,
    y: 272,
    w: 132,
    h: 72,
    title: "End",
    subtitle: "End node",
  },
];

export interface StartInputFieldRow {
  id: string;
  name: string;
  dataType: FgServingFieldType;
}

export type SourceRef =
  | {
      kind: "upstream";
      nodeId: FgServingNodeId;
      field: string;
      fieldType: FgServingFieldType;
    }
  | { kind: "fixed"; value: string };

export interface InputFieldMapping {
  paramName: string;
  paramType: FgServingFieldType;
  source: SourceRef | null;
}

export interface OutputFieldSelection {
  name: string;
  type: FgServingFieldType;
  selected: boolean;
  defaultValue: string;
}

export interface MappedAssetNodeConfig {
  selectedCatalogId: string;
  inputMappings: InputFieldMapping[];
  outputFields: OutputFieldSelection[];
}

export interface CodeBlockInputRow {
  id: string;
  localName: string;
  source: SourceRef | null;
}

export interface CodeBlockOutputRow {
  id: string;
  name: string;
  type: FgServingFieldType;
}

export interface EndOutputRow {
  id: string;
  trainingFeatureName: string;
  source: SourceRef | null;
}

export const FG_DEFAULT_PYTHON_CODE = `def merge(data):
    return {
        "output": {
            "epf_date": data.get("epf_date") if data.get("epf_date") != "" else None,
            "qc_flag": data.get("qc_flag") if data.get("epf_date") != "" else 1,
            "qc_score": data.get("qc_score"),
        }
    }`;

export type FgServingNodeConfig =
  | { kind: "start"; inputFields: StartInputFieldRow[] }
  | { kind: "feature_source"; asset: MappedAssetNodeConfig }
  | { kind: "transformation"; asset: MappedAssetNodeConfig }
  | {
      kind: "compute";
      description: string;
      language: "python3";
      inputs: CodeBlockInputRow[];
      code: string;
      outputs: CodeBlockOutputRow[];
    }
  | {
      kind: "end";
      description: string;
      outputs: EndOutputRow[];
    };

export interface FgServingCanvasState {
  nodes: FgServingNodeDef[];
  edges: [FgServingNodeId, FgServingNodeId][];
  configs: Partial<Record<FgServingNodeId, FgServingNodeConfig>>;
}

export type { FgServingFieldType };

function newRowId(): string {
  return `r-${Math.random().toString(36).slice(2, 10)}`;
}

export function defaultComputeNodeConfig(): Extract<
  FgServingNodeConfig,
  { kind: "compute" }
> {
  return {
    kind: "compute",
    description: "",
    language: "python3",
    inputs: [{ id: newRowId(), localName: "epf_date", source: null }],
    code: FG_DEFAULT_PYTHON_CODE,
    outputs: [{ id: newRowId(), name: "output", type: "map" }],
  };
}

export function defaultEndNodeConfig(): Extract<FgServingNodeConfig, { kind: "end" }> {
  return {
    kind: "end",
    description: "",
    outputs: [{ id: newRowId(), trainingFeatureName: "", source: null }],
  };
}

function isLegacyComputeSkeleton(c: unknown): boolean {
  return (
    typeof c === "object" &&
    c !== null &&
    (c as { kind?: string }).kind === "compute" &&
    (c as { skeleton?: boolean }).skeleton === true
  );
}

function isLegacyEndSkeleton(c: unknown): boolean {
  return (
    typeof c === "object" &&
    c !== null &&
    (c as { kind?: string }).kind === "end" &&
    (c as { skeleton?: boolean }).skeleton === true
  );
}

/** Normalize configs loaded from older snapshots (skeleton compute/end). */
export function normalizeFgServingCanvasState(
  state: FgServingCanvasState
): FgServingCanvasState {
  const configs = { ...state.configs };
  for (const n of state.nodes) {
    const c = configs[n.id];
    if (n.kind === "compute" && isLegacyComputeSkeleton(c)) {
      configs[n.id] = defaultComputeNodeConfig();
    }
    if (n.kind === "end" && isLegacyEndSkeleton(c)) {
      configs[n.id] = defaultEndNodeConfig();
    }
  }
  return { ...state, configs };
}

export function buildMappedConfigFromCatalog(
  catalogId: string,
  assetKind: "feature_source" | "transformation"
): MappedAssetNodeConfig {
  const entry =
    assetKind === "feature_source"
      ? getFeatureSourceById(catalogId)
      : getTransformationById(catalogId);
  if (!entry) {
    return { selectedCatalogId: catalogId, inputMappings: [], outputFields: [] };
  }
  return {
    selectedCatalogId: catalogId,
    inputMappings: entry.inputs.map((p) => ({
      paramName: p.name,
      paramType: p.type,
      source: null,
    })),
    outputFields: entry.outputs.map((p) => ({
      name: p.name,
      type: p.type,
      selected: true,
      defaultValue: "",
    })),
  };
}

function defaultStartFields(entitiesColumns: string[]): StartInputFieldRow[] {
  if (entitiesColumns.length === 0) {
    return [{ id: newRowId(), name: "entity_id", dataType: "string" }];
  }
  return entitiesColumns.map((name) => ({
    id: newRowId(),
    name,
    dataType: "string" as FgServingFieldType,
  }));
}

function buildDefaultConfigs(
  entitiesColumns: string[]
): Partial<Record<FgServingNodeId, FgServingNodeConfig>> {
  const configs: Partial<Record<FgServingNodeId, FgServingNodeConfig>> = {
    A: { kind: "start", inputFields: defaultStartFields(entitiesColumns) },
    H: defaultComputeNodeConfig(),
    I: defaultComputeNodeConfig(),
    J: defaultEndNodeConfig(),
  };
  (["B", "C", "D", "E", "F", "G"] as const).forEach((nid) => {
    const def = FG_SERVING_DEFAULT_CATALOG_BY_NODE[nid];
    if (!def) return;
    const asset = buildMappedConfigFromCatalog(def.catalogId, def.kind);
    if (def.kind === "feature_source") {
      configs[nid] = { kind: "feature_source", asset };
    } else {
      configs[nid] = { kind: "transformation", asset };
    }
  });
  return configs;
}

export function createInitialFgServingState(
  entitiesColumns: string[]
): FgServingCanvasState {
  return {
    nodes: FG_SERVING_INITIAL_NODES.map((n) => ({ ...n })),
    edges: [...FG_SERVING_EDGES],
    configs: buildDefaultConfigs(entitiesColumns),
  };
}

export function cloneFgServingState(s: FgServingCanvasState): FgServingCanvasState {
  return JSON.parse(JSON.stringify(s)) as FgServingCanvasState;
}

export function getUpstreamIds(
  edges: [FgServingNodeId, FgServingNodeId][],
  nodeId: FgServingNodeId
): FgServingNodeId[] {
  return edges.filter(([, to]) => to === nodeId).map(([from]) => from);
}

function getStartOutputs(
  cfg: FgServingNodeConfig | undefined
): { name: string; type: FgServingFieldType }[] {
  if (!cfg || cfg.kind !== "start") return [];
  return cfg.inputFields.map((r) => ({ name: r.name, type: r.dataType }));
}

function getMappedAssetOutputs(
  cfg: FgServingNodeConfig | undefined
): { name: string; type: FgServingFieldType }[] {
  if (!cfg || (cfg.kind !== "feature_source" && cfg.kind !== "transformation")) {
    return [];
  }
  return cfg.asset.outputFields
    .filter((o) => o.selected)
    .map((o) => ({ name: o.name, type: o.type }));
}

const COMPUTE_OUTPUTS_FALLBACK: Record<
  "H" | "I",
  { name: string; type: FgServingFieldType }[]
> = {
  H: [
    { name: "compute_fts_1", type: "map" },
    { name: "compute_meta_1", type: "string" },
  ],
  I: [
    { name: "compute_fts_2", type: "map" },
    { name: "compute_meta_2", type: "string" },
  ],
};

function getComputeOutputs(
  cfg: FgServingNodeConfig | undefined,
  nodeId: FgServingNodeId
): { name: string; type: FgServingFieldType }[] {
  if (cfg?.kind === "compute" && Array.isArray(cfg.outputs) && cfg.outputs.length > 0) {
    return cfg.outputs.map((o) => ({ name: o.name, type: o.type }));
  }
  if (nodeId === "H" || nodeId === "I") {
    return COMPUTE_OUTPUTS_FALLBACK[nodeId];
  }
  return [];
}

export function getOutputsForNode(
  state: FgServingCanvasState,
  nodeId: FgServingNodeId
): { name: string; type: FgServingFieldType }[] {
  const node = state.nodes.find((n) => n.id === nodeId);
  const cfg = state.configs[nodeId];
  if (!node) return [];
  if (node.kind === "start") return getStartOutputs(cfg);
  if (node.kind === "feature_source" || node.kind === "transformation") {
    return getMappedAssetOutputs(cfg);
  }
  if (node.kind === "compute") {
    return getComputeOutputs(cfg, nodeId);
  }
  return [];
}

export interface UpstreamOutputGroup {
  nodeId: FgServingNodeId;
  title: string;
  fields: { name: string; type: FgServingFieldType }[];
}

export function listUpstreamOutputGroups(
  state: FgServingCanvasState,
  targetId: FgServingNodeId
): UpstreamOutputGroup[] {
  const ups = getUpstreamIds(state.edges, targetId);
  return ups.map((uid) => {
    const n = state.nodes.find((x) => x.id === uid);
    return {
      nodeId: uid,
      title: n?.title ?? uid,
      fields: getOutputsForNode(state, uid),
    };
  });
}

export function countMappedInputs(mappings: InputFieldMapping[]): number {
  return mappings.filter((m) => m.source !== null).length;
}

export function resolveServingNodeConfig(
  state: FgServingCanvasState,
  node: FgServingNodeDef,
  entitiesColumns: string[]
): FgServingNodeConfig {
  const hit = state.configs[node.id];
  if (hit) {
    if (node.kind === "compute" && isLegacyComputeSkeleton(hit)) {
      return defaultComputeNodeConfig();
    }
    if (node.kind === "end" && isLegacyEndSkeleton(hit)) {
      return defaultEndNodeConfig();
    }
    return hit;
  }
  const seed = createInitialFgServingState(entitiesColumns);
  return seed.configs[node.id]!;
}
