import { ChevronDown, Plus, Trash2 } from "lucide-react";

export type ParamRowValue = { name: string; dataType: string };

export function ParamRowEditor({
  params,
  onChange,
  disabled = false,
  dataTypeOptions,
  addButtonLabel = "Add Param",
}: {
  params: ParamRowValue[];
  onChange?: (params: ParamRowValue[]) => void;
  disabled?: boolean;
  dataTypeOptions: string[];
  addButtonLabel?: string;
}) {
  const defaultType = dataTypeOptions[0] ?? "string";
  const addRow = () =>
    onChange?.([...params, { name: "", dataType: defaultType }]);
  const removeRow = (i: number) => {
    if (params.length <= 1) return;
    onChange?.(params.filter((_, idx) => idx !== i));
  };
  const updateRow = (i: number, field: keyof ParamRowValue, val: string) =>
    onChange?.(
      params.map((r, idx) => (idx === i ? { ...r, [field]: val } : r))
    );

  return (
    <div className="space-y-2">
      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-3 py-2 text-left text-xs text-slate-500 font-medium">
                Param Name
              </th>
              <th className="px-3 py-2 text-left text-xs text-slate-500 font-medium w-32">
                Data Type
              </th>
              {!disabled && <th className="px-3 py-2 w-9" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {params.length === 0 && (
              <tr>
                <td
                  colSpan={disabled ? 2 : 3}
                  className="px-3 py-3 text-xs text-slate-300 italic"
                >
                  —
                </td>
              </tr>
            )}
            {params.map((row, i) => (
              <tr key={i} className="group">
                <td className="px-3 py-2">
                  {disabled ? (
                    <span className="text-xs text-slate-700 font-mono">
                      {row.name || "—"}
                    </span>
                  ) : (
                    <input
                      type="text"
                      value={row.name}
                      onChange={(e) => updateRow(i, "name", e.target.value)}
                      placeholder="param_name"
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all font-mono placeholder:text-slate-300 bg-white"
                    />
                  )}
                </td>
                <td className="px-3 py-2 w-32">
                  {disabled ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-emerald-50 text-emerald-600 border border-emerald-200 font-mono">
                      {row.dataType}
                    </span>
                  ) : (
                    <div className="relative">
                      <select
                        value={row.dataType}
                        onChange={(e) =>
                          updateRow(i, "dataType", e.target.value)
                        }
                        className="w-full appearance-none px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all bg-white text-slate-700"
                      >
                        {dataTypeOptions.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                        {!dataTypeOptions.includes(row.dataType) && (
                          <option value={row.dataType}>{row.dataType}</option>
                        )}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                    </div>
                  )}
                </td>
                {!disabled && (
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      disabled={params.length <= 1}
                      onClick={() => removeRow(i)}
                      className="p-1 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!disabled && (
        <button
          type="button"
          onClick={addRow}
          className="flex items-center gap-1.5 text-xs text-teal-600 hover:text-teal-800 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          {addButtonLabel}
        </button>
      )}
    </div>
  );
}
