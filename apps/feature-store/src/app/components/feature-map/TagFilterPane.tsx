import { useMemo, useState } from "react";
import { Tags, Search, X, ChevronDown } from "lucide-react";
import type { Feature } from "./types";
import { TAG_CATALOG, getTag, facetColorOf, tagsByFacet } from "@/data/tagCatalog";

interface TagFilterPaneProps {
  /** Current result set — counts are computed over this (AND-preview semantics). */
  scopedFeatures: Feature[];
  selectedTags: string[];
  onChange: (next: string[]) => void;
  className?: string;
}

const ALL = "__all__";

export function TagFilterPane({ scopedFeatures, selectedTags, onChange, className }: TagFilterPaneProps) {
  const [tagSearch, setTagSearch] = useState("");
  const [category, setCategory] = useState<string>(ALL);

  // Tag id -> how many in-scope features carry it.
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const f of scopedFeatures) {
      for (const t of f.tags ?? []) m.set(t, (m.get(t) ?? 0) + 1);
    }
    return m;
  }, [scopedFeatures]);

  // Category dropdown options: facets discovered from data, ordered by tag count desc.
  const facetOptions = useMemo(
    () => tagsByFacet().slice().sort((a, b) => b.tags.length - a.tags.length),
    []
  );

  // Flat cloud: filter by category + search, order by scoped count desc (0-count sinks).
  const q = tagSearch.trim().toLowerCase();
  const cloud = useMemo(() => {
    return TAG_CATALOG.filter(
      (t) =>
        (category === ALL || t.facet === category) &&
        (!q || t.label.toLowerCase().includes(q))
    ).sort((a, b) => {
      const d = (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0);
      return d !== 0 ? d : a.label.localeCompare(b.label);
    });
  }, [category, q, counts]);

  const toggle = (id: string) =>
    onChange(
      selectedTags.includes(id) ? selectedTags.filter((t) => t !== id) : [...selectedTags, id]
    );

  const hasSelection = selectedTags.length > 0;

  return (
    <div className={`bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col overflow-hidden ${className ?? ""}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center gap-2 mb-2.5">
          <Tags size={14} className="text-[#13c2c2]" />
          <span className="text-sm font-medium text-gray-700">Tags</span>
          {hasSelection && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="ml-auto shrink-0 text-[11px] text-gray-400 hover:text-[#13c2c2] transition-colors"
            >
              Clear
            </button>
          )}
        </div>
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Filter tags..."
            value={tagSearch}
            onChange={(e) => setTagSearch(e.target.value)}
            className="w-full pl-7 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#13c2c2]/30 focus:border-[#13c2c2] transition-all placeholder:text-gray-400"
          />
        </div>
      </div>

      {/* Category dropdown (facets discovered dynamically) */}
      <div className="px-3 pt-2.5">
        <div className="relative">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full appearance-none text-xs border border-gray-200 rounded-lg bg-white pl-2.5 pr-7 py-1.5 text-gray-600 outline-none focus:border-[#13c2c2] focus:ring-2 focus:ring-[#13c2c2]/30 cursor-pointer transition-all"
          >
            <option value={ALL}>All categories</option>
            {facetOptions.map((g) => (
              <option key={g.facet} value={g.facet}>
                {g.facet} ({g.tags.length})
              </option>
            ))}
          </select>
          <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Active selection chips */}
      {hasSelection && (
        <div className="px-3 pt-2.5 flex flex-wrap gap-1.5">
          {selectedTags.map((id) => (
            <span
              key={id}
              className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 text-xs bg-[#13c2c2]/10 text-[#13c2c2] border border-[#13c2c2]/30 rounded-full"
            >
              {getTag(id)?.label ?? id}
              <button
                type="button"
                onClick={() => toggle(id)}
                className="rounded-full hover:bg-[#13c2c2]/15 p-0.5 transition-colors"
                aria-label={`Remove ${id}`}
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Flat tag cloud */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 pt-2.5">
        <div className="flex flex-wrap gap-1.5">
          {cloud.map((t) => {
            const count = counts.get(t.id) ?? 0;
            const selected = selectedTags.includes(t.id);
            const dimmed = !selected && count === 0;
            return (
              <button
                key={t.id}
                type="button"
                disabled={dimmed}
                title={`${t.facet} · ${t.description}`}
                onClick={() => toggle(t.id)}
                className={[
                  "inline-flex items-center gap-1 pl-1.5 pr-2 py-0.5 rounded-full text-xs border transition-colors",
                  selected
                    ? "bg-[#13c2c2]/10 text-[#13c2c2] border-[#13c2c2]/30"
                    : dimmed
                    ? "bg-gray-50 text-gray-300 border-gray-100 opacity-60 cursor-not-allowed"
                    : "bg-gray-50 text-gray-600 border-gray-200 hover:border-[#13c2c2]/40 hover:text-[#13c2c2]",
                ].join(" ")}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: facetColorOf(t.facet), opacity: dimmed ? 0.4 : 1 }}
                />
                <span>{t.label}</span>
                <span className={`text-[10px] ${selected ? "text-[#13c2c2]/70" : "text-gray-400"}`}>{count}</span>
              </button>
            );
          })}
        </div>

        {cloud.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center text-gray-400">
            <Tags size={22} className="opacity-30 mb-2" />
            <p className="text-xs">No tags match “{tagSearch}”</p>
          </div>
        )}
      </div>
    </div>
  );
}
