import { useState } from "react";
import { Search, ChevronUp, RotateCcw } from "lucide-react";

interface FilterValues {
  name: string;
  region: string;
  owner: string;
  bizTeam: string;
}

interface FilterBarProps {
  onQuery: (values: FilterValues) => void;
  onReset: () => void;
}

const REGIONS = [
  "All Regions",
  "TH",
  "MX",
  "SHOPEE_SG",
  "ID",
  "PH",
  "VN",
  "MY",
  "BR",
  "TW",
];

export function FilterBar({ onQuery, onReset }: FilterBarProps) {
  const [collapsed, setCollapsed] = useState(true);
  const [values, setValues] = useState<FilterValues>({
    name: "",
    region: "",
    owner: "",
    bizTeam: "",
  });

  const handleReset = () => {
    setValues({ name: "", region: "", owner: "", bizTeam: "" });
    onReset();
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 bg-teal-500 rounded-full" />
          <span className="text-sm text-gray-500 tracking-wide uppercase">
            Filters
          </span>
        </div>
        <button
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

      {/* Filter Fields */}
      <div
        className={`transition-all duration-300 ${collapsed ? "max-h-0 overflow-hidden" : "max-h-96"}`}
      >
        <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-500 tracking-wide">NAME</label>
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Please enter"
                value={values.name}
                onChange={(e) => setValues({ ...values, name: e.target.value })}
                className="w-full pl-8 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-teal-400 focus:bg-white transition-all placeholder:text-gray-400"
              />
            </div>
          </div>

          {/* Region */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-500 tracking-wide">
              REGION
            </label>
            <select
              value={values.region}
              onChange={(e) =>
                setValues({ ...values, region: e.target.value })
              }
              className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-teal-400 focus:bg-white transition-all text-gray-600 appearance-none cursor-pointer"
            >
              <option value="">Please select</option>
              {REGIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Owner */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-500 tracking-wide">
              OWNER
            </label>
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Please enter"
                value={values.owner}
                onChange={(e) =>
                  setValues({ ...values, owner: e.target.value })
                }
                className="w-full pl-8 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-teal-400 focus:bg-white transition-all placeholder:text-gray-400"
              />
            </div>
          </div>

          {/* Biz Team */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-500 tracking-wide">
              BIZ TEAM
            </label>
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Please enter"
                value={values.bizTeam}
                onChange={(e) =>
                  setValues({ ...values, bizTeam: e.target.value })
                }
                className="w-full pl-8 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-teal-400 focus:bg-white transition-all placeholder:text-gray-400"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 pb-5 flex justify-end gap-3">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-4 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all"
          >
            <RotateCcw size={13} />
            Reset
          </button>
          <button
            onClick={() => onQuery(values)}
            className="flex items-center gap-1.5 px-5 py-2 text-sm text-white bg-teal-500 rounded-lg hover:bg-teal-600 transition-all shadow-sm shadow-teal-200"
          >
            <Search size={13} />
            Query
          </button>
        </div>
      </div>
    </div>
  );
}
