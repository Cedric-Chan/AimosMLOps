/** v2 deep-link helpers — cross-module navigation URLs.
 *  See docs/design/30-feature-group/v2-spec.md §5 + feature-map-v2-spec.md §5.
 */

/** FG detail with a specific feature highlighted (hash anchor + auto-scroll + 3s amber highlight). */
export function fgFeatureDeepLink(fgId: string, featureName: string): string {
  return `/fg/${encodeURIComponent(fgId)}?tab=features#feature=${encodeURIComponent(featureName)}`;
}

/** FG detail (default Tab). */
export function fgDetailLink(fgId: string): string {
  return `/fg/${encodeURIComponent(fgId)}`;
}

/** FeatureMap feature detail page. FQID = "{fgId}.{featureName}", with internal "." replaced by "__". */
export function fmFeatureLink(fgId: string, featureName: string): string {
  const safeFeature = featureName.replaceAll(".", "__");
  return `/fm/feature/${encodeURIComponent(fgId)}.${encodeURIComponent(safeFeature)}`;
}

/** Parse FQID back to {fgId, featureName}. */
export function parseFqid(fqid: string): { fgId: string; featureName: string } | null {
  const dot = fqid.indexOf(".");
  if (dot < 0) return null;
  const fgId = fqid.slice(0, dot);
  const featureName = fqid.slice(dot + 1).replaceAll("__", ".");
  return { fgId, featureName };
}

/** FS detail page. */
export function fsDetailLink(fsId: string): string {
  return `/fs/${encodeURIComponent(fsId)}`;
}

/** External DataVerse lineage view (mock URL). */
export function dataverseLineageUrl(dataverseId: string): string {
  return `https://dataverse.example.com/lineage/${encodeURIComponent(dataverseId)}`;
}
