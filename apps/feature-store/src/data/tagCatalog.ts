/**
 * Governed Feature Tag catalog — single source of truth for the Feature Map
 * tag filter pane and the Feature Detail tag editor.
 *
 * Faceted, 2-level taxonomy: Facet → Tag (flat within each facet, many-to-many).
 * Tags are governed: a feature may only carry tag ids that exist here.
 *
 * IMPORTANT: facets are NOT hardcoded UI separators. They are plain strings,
 * discovered dynamically from this payload (which stands in for the external
 * portal). Adding/renaming a facet or tag here requires ZERO frontend change —
 * the pane derives the facet list, ordering and colors from the data.
 */

export type TagFacet = string;

export interface CatalogTag {
  /** stable id stored on feature.tags */
  id: string;
  /** display label */
  label: string;
  /** first-level category — any string; discovered at runtime */
  facet: TagFacet;
  description: string;
}

export const TAG_CATALOG: CatalogTag[] = [
  // ── Topic — 业务域 / what the feature is about ─────────────────────────────
  { id: "credit", label: "credit", facet: "Topic", description: "Credit & lending signals" },
  { id: "risk", label: "risk", facet: "Topic", description: "Risk scoring & control" },
  { id: "acard", label: "acard", facet: "Topic", description: "A-card application scoring" },
  { id: "recommend", label: "recommend", facet: "Topic", description: "Recommendation relevance" },
  { id: "graph", label: "graph", facet: "Topic", description: "Graph / network structure" },
  { id: "network", label: "network", facet: "Topic", description: "Social / device network" },
  { id: "ctr", label: "ctr", facet: "Topic", description: "Click-through behaviour" },
  { id: "limit", label: "limit", facet: "Topic", description: "Credit / quota limits" },
  { id: "score", label: "score", facet: "Topic", description: "Model output scores" },
  { id: "overdue", label: "overdue", facet: "Topic", description: "Delinquency / overdue behaviour" },

  // ── Sensitivity — 敏感度 / 合规 ─────────────────────────────────────────────
  { id: "pii", label: "pii", facet: "Sensitivity", description: "Built on personal identifiable info" },
  { id: "masked", label: "masked", facet: "Sensitivity", description: "Value is masked / anonymised" },
  { id: "decision-use", label: "decision-use", facet: "Sensitivity", description: "Approved for credit-decision use" },

  // ── Transform — 加工方式 / encoding ────────────────────────────────────────
  { id: "scaled", label: "scaled", facet: "Transform", description: "Standardised / normalised" },
  { id: "binned", label: "binned", facet: "Transform", description: "Bucketed / binned" },
  { id: "woe", label: "woe", facet: "Transform", description: "Weight-of-Evidence encoded" },
  { id: "onehot", label: "onehot", facet: "Transform", description: "One-hot encoded" },
  { id: "embedding", label: "embedding", facet: "Transform", description: "Learned vector representation" },
  { id: "hashed", label: "hashed", facet: "Transform", description: "Hashed value" },
  { id: "md5", label: "md5", facet: "Transform", description: "MD5-hashed value" },
  { id: "raw", label: "raw", facet: "Transform", description: "Raw, untransformed value" },

  // ── Quality — 质量 / 重要性 (评分卡常用指标) ─────────────────────────────────
  { id: "core", label: "core", facet: "Quality", description: "Core / business-critical feature" },
  { id: "high-iv", label: "high-iv", facet: "Quality", description: "High Information Value" },
  { id: "psi-stable", label: "psi-stable", facet: "Quality", description: "Stable population (low PSI)" },
  { id: "drift-prone", label: "drift-prone", facet: "Quality", description: "Prone to distribution drift" },
];

/* ── helpers ─────────────────────────────────────────────────────────────── */

const CATALOG_BY_ID = new Map(TAG_CATALOG.map((t) => [t.id, t]));

export function getTag(id: string): CatalogTag | undefined {
  return CATALOG_BY_ID.get(id);
}

/** Distinct facets, in first-appearance order (the portal's order). */
export function listFacets(): string[] {
  const seen: string[] = [];
  for (const t of TAG_CATALOG) if (!seen.includes(t.facet)) seen.push(t.facet);
  return seen;
}

/** Catalog grouped by facet, in first-appearance order. */
export function tagsByFacet(): { facet: string; tags: CatalogTag[] }[] {
  return listFacets().map((facet) => ({
    facet,
    tags: TAG_CATALOG.filter((t) => t.facet === facet),
  }));
}

/**
 * Auto color for a facet — hash the name into a muted palette so any facet
 * (including ones added later in the portal) gets a stable color with no
 * hardcoded mapping. Used only on the small facet dot.
 */
const MUTED_PALETTE = [
  "#14b8a6", // teal
  "#f59e0b", // amber
  "#8b5cf6", // violet
  "#f43f5e", // rose
  "#0ea5e9", // sky
  "#10b981", // emerald
  "#6366f1", // indigo
  "#f97316", // orange
];

export function facetColorOf(facet: string): string {
  let h = 0;
  for (const ch of facet) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return MUTED_PALETTE[h % MUTED_PALETTE.length];
}
