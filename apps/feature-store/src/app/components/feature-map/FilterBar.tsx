import { useState } from "react";
import { Search, ChevronUp, RotateCcw } from "lucide-react";
import type { FilterState } from "./types";

interface FilterBarProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  onSearch: () => void;
  onReset: () => void;
}

const regionOptions = ["All", "TH", "ID", "MX", "SG", "PH", "VN", "BR", "SHOPEE_SG"];
const entityOptions = ["All", "user_id", "item_id", "shop_id"];
const servingAvailOptions = ["All", "TRUE", "FALSE"];

export function FilterBar({
  filters,
  onFiltersChange,
  onSearch,
  onReset,
}: FilterBarProps) {
  const [collapsed, setCollapsed] = useState(true);

  const update = (key: keyof FilterState, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const handleReset = () => {
    onReset();
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 bg-teal-500 rounded-full" />
          <span className="text-sm text-gray-500 tracking-wide uppercase">
            Filters
          </span>
        </div>
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-1.5 text-teal-600 hover:text-teal-700 transition-colors text-sm"
        >
          <span>{collapsed ? "Expand" : "Collapse"}</span>
          <ChevronUp
            size={14}
            className={`transition-transform duration-200 ${collapsed ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      <div
        className={`transition-all duration-300 ${collapsed ? "max-h-0 overflow-hidden" : "max-h-[28rem]"}`}
      >
        <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-500 tracking-wide">FEATURE</label>
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search feature name..."
                value={filters.keyword}
                onChange={(e) => update("keyword", e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-teal-400 focus:bg-white transition-all placeholder:text-gray-400"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-500 tracking-wide">REGION</label>
            <select
              value={filters.region}
              onChange={(e) => update("region", e.target.value)}
              className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-teal-400 focus:bg-white transition-all text-gray-600 appearance-none cursor-pointer"
            >
              {regionOptions.map((r) => (
                <option key={r} value={r === "All" ? "" : r}>
                  {r === "All" ? "Please select" : r}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-500 tracking-wide">ENTITY</label>
            <select
              value={filters.entity}
              onChange={(e) => update("entity", e.target.value)}
              className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-teal-400 focus:bg-white transition-all text-gray-600 appearance-none cursor-pointer"
            >
              {entityOptions.map((e) => (
                <option key={e} value={e === "All" ? "" : e}>
                  {e === "All" ? "Please select" : e}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-500 tracking-wide">
              SERVING AVAIL.
            </label>
            <select
              value={filters.servingAvail}
              onChange={(e) => update("servingAvail", e.target.value)}
              className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-teal-400 focus:bg-white transition-all text-gray-600 appearance-none cursor-pointer"
            >
              {servingAvailOptions.map((o) => (
                <option key={o} value={o === "All" ? "" : o}>
                  {o === "All" ? "Please select" : o}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="px-6 pb-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-4 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all"
          >
            <RotateCcw size={13} />
            Reset
          </button>
          <button
            type="button"
            onClick={onSearch}
            className="flex items-center gap-1.5 px-5 py-2 text-sm text-white bg-teal-500 rounded-lg hover:bg-teal-600 transition-all shadow-sm shadow-teal-200"
          >
            <Search size={13} />
            Search
          </button>
        </div>
      </div>
    </div>
  );
}
