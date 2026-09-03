import React from "react";
import { Feature } from "./types";

interface FeatureTableProps {
  features: Feature[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleAll: () => void;
  onDetail: (feature: Feature) => void;
  onTrace: (feature: Feature) => void;
  healthMap: Record<string, { status: "healthy" | "warning"; count: number }>;
}

function RegionTag({ region }: { region: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border bg-gray-50 text-gray-500 border-gray-200 whitespace-nowrap">
      {region}
    </span>
  );
}

function BoolTag({ value }: { value: boolean | null }) {
  if (value === null) {
    return <span className="text-gray-400 text-xs">—</span>;
  }
  return value ? (
    <span className="inline-flex items-center gap-1 text-emerald-600 text-xs whitespace-nowrap">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block flex-shrink-0" />
      TRUE
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-gray-400 text-xs whitespace-nowrap">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-300 inline-block flex-shrink-0" />
      FALSE
    </span>
  );
}

function HealthTag({ status, count }: { status: "healthy" | "warning"; count: number }) {
  if (status === "warning") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
        Warning
        <span className="inline-flex items-center justify-center min-w-[14px] h-[14px] rounded-full text-[8px] font-semibold text-white bg-amber-500 leading-none">{count}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs whitespace-nowrap">
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50/80 text-emerald-700 border border-emerald-200/60">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block flex-shrink-0" />
        Healthy
      </span>
    </span>
  );
}

function CustomCheckbox({
  checked,
  indeterminate,
  onChange,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
}) {
  const isActive = checked || !!indeterminate;
  return (
    <div
      onClick={onChange}
      className={`w-4 h-4 rounded border-2 flex items-center justify-center cursor-pointer transition-all select-none flex-shrink-0 ${
        isActive
          ? "bg-[#13c2c2] border-[#13c2c2]"
          : "border-gray-300 hover:border-[#13c2c2]/60 bg-white"
      }`}
    >
      {indeterminate && !checked && (
        <svg width="8" height="2" viewBox="0 0 8 2" fill="none">
          <rect x="0" y="0.5" width="8" height="1" rx="0.5" fill="white" />
        </svg>
      )}
      {checked && (
        <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
          <path
            d="M1 3.5L3.5 6L8 1"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </div>
  );
}

export function FeatureTable({
  features,
  selectedIds,
  onToggleSelect,
  onToggleAll,
  onDetail,
  onTrace,
  healthMap,
}: FeatureTableProps) {
  const allSelected = features.length > 0 && selectedIds.size === features.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < features.length;

  const stickyCheckboxW = 56;
  const stickyNameW    = 200;

  return (
    <div className="h-full overflow-auto">
      <table className="w-full text-sm border-separate border-spacing-0">
        <thead className="sticky top-0 z-20">
          <tr className="bg-gray-50">
            <th
              className="px-4 py-3 text-left text-xs font-medium text-gray-500 border-b border-gray-100 whitespace-nowrap sticky left-0 z-20 bg-gray-50"
              style={{ width: stickyCheckboxW, minWidth: stickyCheckboxW }}
            >
              <CustomCheckbox
                checked={allSelected}
                indeterminate={someSelected}
                onChange={onToggleAll}
              />
            </th>
            <th
              className="px-4 py-3 text-left text-xs font-medium text-gray-500 border-b border-gray-100 whitespace-nowrap sticky z-20 bg-gray-50 after:absolute after:inset-y-0 after:right-0 after:w-px after:bg-gray-200"
              style={{ left: stickyCheckboxW, minWidth: stickyNameW }}
            >
              Feature Name
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 border-b border-gray-100 whitespace-nowrap w-28">Region</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 border-b border-gray-100 whitespace-nowrap min-w-[160px]">Feature Group</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 border-b border-gray-100 whitespace-nowrap w-28">Module</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 border-b border-gray-100 whitespace-nowrap w-24">Entity</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 border-b border-gray-100 whitespace-nowrap w-24">Data Type</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 border-b border-gray-100 whitespace-nowrap w-20">Training</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 border-b border-gray-100 whitespace-nowrap w-20">Serving</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 border-b border-gray-100 whitespace-nowrap w-36">Yd Serving Req#</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 border-b border-gray-100 whitespace-nowrap w-24">Health</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 border-b border-gray-100 whitespace-nowrap w-28">Action</th>
          </tr>
        </thead>
        <tbody>
          {features.map((feature, idx) => {
            const isSelected = selectedIds.has(feature.id);
            const rowBg = isSelected
              ? "bg-[#e6fffb]"
              : idx % 2 === 0
              ? "bg-white"
              : "bg-gray-50/40";
            const rowHover = isSelected ? "hover:bg-[#d5f5f0]" : "hover:bg-gray-50/80";
            const health = healthMap[feature.name] ?? { status: "healthy" as const, count: 0 };

            return (
              <tr key={feature.id} className={`group transition-colors ${rowBg} ${rowHover}`}>
                <td
                  className={`px-4 py-3 border-b border-gray-50 sticky left-0 z-10 transition-colors ${rowBg} ${rowHover}`}
                  style={{ width: stickyCheckboxW, minWidth: stickyCheckboxW }}
                >
                  <CustomCheckbox
                    checked={isSelected}
                    onChange={() => onToggleSelect(feature.id)}
                  />
                </td>
                <td
                  className={`px-4 py-3 border-b border-gray-50 sticky z-10 transition-colors after:absolute after:inset-y-0 after:right-0 after:w-px after:bg-gray-200 ${rowBg} ${rowHover}`}
                  style={{ left: stickyCheckboxW, minWidth: stickyNameW }}
                >
                  <span className={`font-medium transition-colors whitespace-nowrap ${isSelected ? "text-[#13c2c2]" : "text-gray-800"}`}>
                    {feature.name}
                  </span>
                </td>
                <td className="px-4 py-3 border-b border-gray-50 w-28">
                  <RegionTag region={feature.region} />
                </td>
                <td className="px-4 py-3 border-b border-gray-50 min-w-[160px]">
                  <span className="text-gray-600 text-xs font-mono bg-gray-50 px-2 py-0.5 rounded whitespace-nowrap">
                    {feature.featureGroup}
                  </span>
                </td>
                <td className="px-4 py-3 border-b border-gray-50 w-28">
                  <span className="text-gray-600 text-xs whitespace-nowrap">{feature.module}</span>
                </td>
                <td className="px-4 py-3 border-b border-gray-50 w-24">
                  <span className="text-gray-600 text-xs">{feature.entity}</span>
                </td>
                <td className="px-4 py-3 border-b border-gray-50 w-24">
                  <span className="text-gray-600 text-xs">{feature.dataType}</span>
                </td>
                <td className="px-4 py-3 border-b border-gray-50 w-20">
                  <BoolTag value={feature.training} />
                </td>
                <td className="px-4 py-3 border-b border-gray-50 w-20">
                  <BoolTag value={feature.serving} />
                </td>
                <td className="px-4 py-3 border-b border-gray-50 w-36 text-right">
                  <span className="text-gray-600 text-xs font-mono tabular-nums">{feature.ydServingReq.toLocaleString("en-US")}</span>
                </td>
                <td className="px-4 py-3 border-b border-gray-50 w-24">
                  <HealthTag status={health.status} count={health.count} />
                </td>
                <td className="px-4 py-3 border-b border-gray-50 w-28">
                  <div className="flex items-center gap-2 whitespace-nowrap">
                    <button
                      onClick={(e) => { e.stopPropagation(); onDetail(feature); }}
                      className="text-[11px] text-teal-600 hover:text-teal-800 hover:underline transition-colors"
                    >
                      Detail
                    </button>
                    <span className="w-px h-3 bg-gray-200" />
                    <button
                      onClick={(e) => { e.stopPropagation(); onTrace(feature); }}
                      className="text-[11px] text-teal-600 hover:text-teal-800 hover:underline transition-colors"
                    >
                      Trace
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {features.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="mb-3 opacity-40">
            <rect x="8" y="12" width="32" height="28" rx="3" stroke="currentColor" strokeWidth="2" />
            <path d="M8 20H40" stroke="currentColor" strokeWidth="2" />
            <path d="M16 28H32" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M16 33H26" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <p className="text-sm">No features found</p>
          <p className="text-xs mt-1">Try adjusting your search filters</p>
        </div>
      )}
    </div>
  );
}
