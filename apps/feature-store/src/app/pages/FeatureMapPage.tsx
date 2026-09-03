import { useMemo, useState } from "react";
import { Database, RefreshCw } from "lucide-react";
import { FilterBar } from "@/app/components/feature-map/FilterBar";
import { ModuleTree } from "@/app/components/feature-map/ModuleTree";
import { FeatureTable } from "@/app/components/feature-map/FeatureTable";
import { Pagination } from "@/app/components/feature-map/Pagination";
import { FeatureCart } from "@/app/components/feature-map/FeatureCart";
import { mockFeatures, mockModules } from "@/app/components/feature-map/mockData";
import type { FilterState, Feature } from "@/app/components/feature-map/types";
import { FeatureTraceModal } from "@/app/components/feature-group/FeatureLogicModal";
import { FeatureDetailModal } from "@/app/components/feature-map/FeatureDetailModal";
import { TagFilterPane } from "@/app/components/feature-map/TagFilterPane";

const DEFAULT_FILTERS: FilterState = {
  keyword: "",
  region: "",
  entity: "",
  servingAvail: "",
};

export function FeatureMapPage() {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [selectedNode, setSelectedNode] = useState<{
    type: "module" | "group";
    id: string;
  } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(["f1", "f2", "f3"])
  );
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [features, setFeatures] = useState<Feature[]>(mockFeatures);
  const [detailTarget, setDetailTarget] = useState<Feature | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [lineageTarget, setLineageTarget] = useState<{
    featureName: string;
    hasTraining: boolean;
    hasServing: boolean;
  } | null>(null);

  const filteredFeatures = useMemo(() => {
    let result = [...features];

    if (selectedNode) {
      if (selectedNode.type === "module") {
        const mod = mockModules.find((m) => m.id === selectedNode.id);
        if (mod) {
          const groupNames = new Set(mod.groups.map((g) => g.name));
          result = result.filter((f) => groupNames.has(f.featureGroup));
        }
      } else {
        const allGroups = mockModules.flatMap((m) => m.groups);
        const group = allGroups.find((g) => g.id === selectedNode.id);
        if (group) {
          result = result.filter((f) => f.featureGroup === group.name);
        }
      }
    }

    if (appliedFilters.keyword) {
      const kw = appliedFilters.keyword.toLowerCase();
      result = result.filter(
        (f) =>
          f.name.toLowerCase().includes(kw) ||
          f.featureGroup.toLowerCase().includes(kw)
      );
    }
    if (appliedFilters.region) {
      result = result.filter((f) => f.region === appliedFilters.region);
    }
    if (appliedFilters.entity) {
      result = result.filter((f) => f.entity === appliedFilters.entity);
    }
    if (appliedFilters.servingAvail === "TRUE") {
      result = result.filter((f) => f.serving === true);
    } else if (appliedFilters.servingAvail === "FALSE") {
      result = result.filter((f) => f.serving !== true);
    }

    // Tag filter — AND: feature must carry every selected tag.
    if (selectedTags.length > 0) {
      result = result.filter((f) => selectedTags.every((t) => f.tags?.includes(t)));
    }

    return result;
  }, [appliedFilters, selectedNode, features, selectedTags]);

  const paginatedFeatures = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredFeatures.slice(start, start + pageSize);
  }, [filteredFeatures, page, pageSize]);

  const healthMap = useMemo(() => {
    const map: Record<string, { status: "healthy" | "warning"; count: number }> = {};
    // Vary health per feature: some healthy, some warning for demo
    const warningNames = new Set(["risk_score", "overdue_days_30", "acard_score", "rec_score", "credit_limit", "graph_degree"]);
    for (const f of paginatedFeatures) {
      if (warningNames.has(f.name)) {
        map[f.name] = { status: "warning", count: f.name === "risk_score" ? 3 : f.name === "overdue_days_30" ? 1 : 2 };
      } else {
        map[f.name] = { status: "healthy", count: 0 };
      }
    }
    return map;
  }, [paginatedFeatures]);

  const selectedFeatures = useMemo(
    () => features.filter((f) => selectedIds.has(f.id)),
    [selectedIds, features]
  );

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleAll = () => {
    const pageIds = new Set(paginatedFeatures.map((f) => f.id));
    const allSelected = paginatedFeatures.every((f) => selectedIds.has(f.id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        pageIds.forEach((pid) => next.delete(pid));
      } else {
        pageIds.forEach((pid) => next.add(pid));
      }
      return next;
    });
  };

  const handleSearch = () => {
    setAppliedFilters({ ...filters });
    setPage(1);
  };

  const handleReset = () => {
    setFilters(DEFAULT_FILTERS);
    setAppliedFilters(DEFAULT_FILTERS);
    setSelectedTags([]);
    setPage(1);
  };

  const handleRemoveFromCart = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleClearCart = () => setSelectedIds(new Set());

  const handleTrace = (feature: Feature) => {
    setLineageTarget({
      featureName: feature.name,
      hasTraining: feature.training ?? false,
      hasServing: feature.serving ?? false,
    });
  };

  const handleDetail = (feature: Feature) => setDetailTarget(feature);

  const handleSaveDetail = (
    id: string,
    patch: { tags: string[]; description: string }
  ) => {
    setFeatures((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...patch } : f))
    );
  };

  return (
    <div className="h-full flex flex-col bg-[#f5f7fa] min-h-0">
      <header className="bg-white border-b border-gray-100 px-6 py-3 flex items-center gap-3 shadow-sm shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#13c2c2] flex items-center justify-center shadow-sm">
            <Database size={14} className="text-white" />
          </div>
          <div>
            <h1 className="text-gray-800 leading-tight" style={{ fontSize: "15px", fontWeight: 600 }}>Feature Map</h1>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2 text-xs text-gray-400">
          <RefreshCw size={11} />
          <span>Last updated: 2026-02-23 10:00</span>
        </div>
      </header>

      <main className="p-5 flex flex-col gap-4 max-w-[1600px] mx-auto w-full flex-1 min-h-0">
        <FilterBar filters={filters} onFiltersChange={setFilters} onSearch={handleSearch} onReset={handleReset} />
        <div className="flex gap-4 items-stretch flex-1 min-h-0">
          <div className="w-56 shrink-0 flex flex-col gap-4 min-h-0">
            <ModuleTree className="shrink-0 max-h-[42%]" modules={mockModules} selectedNode={selectedNode} onSelectNode={setSelectedNode} />
            <TagFilterPane className="flex-1 min-h-0" scopedFeatures={filteredFeatures} selectedTags={selectedTags} onChange={setSelectedTags} />
          </div>
          <div className="flex-1 min-w-0 flex flex-col gap-3 min-h-0">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-2.5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                {selectedIds.size > 0 ? (
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 text-sm text-[#13c2c2]"><span className="w-2 h-2 rounded-full bg-[#13c2c2] inline-block" /><span className="font-medium">{selectedIds.size}</span> feature(s) selected</span>
                    <button type="button" onClick={handleClearCart} className="text-xs text-gray-400 hover:text-gray-600 px-2 py-0.5 rounded border border-gray-200 transition-colors">Clear</button>
                  </div>
                ) : (
                  <span className="text-sm text-gray-400">{filteredFeatures.length} feature(s) found</span>
                )}
              </div>
              <FeatureCart selectedFeatures={selectedFeatures} onRemove={handleRemoveFromCart} onClear={handleClearCart} />
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex-1 min-h-0">
              <FeatureTable features={paginatedFeatures} selectedIds={selectedIds} onToggleSelect={handleToggleSelect} onToggleAll={handleToggleAll} onDetail={handleDetail} onTrace={handleTrace} healthMap={healthMap} />
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 shrink-0">
              <Pagination total={filteredFeatures.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(1); }} />
            </div>
          </div>
        </div>
      </main>

      <FeatureTraceModal open={!!lineageTarget} featureName={lineageTarget?.featureName ?? ""} hasTraining={lineageTarget?.hasTraining ?? false} hasServing={lineageTarget?.hasServing ?? false} onClose={() => setLineageTarget(null)} />

      <FeatureDetailModal open={!!detailTarget} feature={detailTarget} onClose={() => setDetailTarget(null)} onSave={handleSaveDetail} />
    </div>
  );
}
