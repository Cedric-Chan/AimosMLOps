import { useState, useEffect, useRef } from "react";
import { ChevronDown, Check, CheckCircle2, Loader2 } from "lucide-react";

export function DatePartitionSelect({
  value, onChange, columns, loading, disabled, hasError, className,
}: {
  value: string;
  onChange: (v: string) => void;
  columns: string[];
  loading: boolean;
  disabled: boolean;
  hasError?: boolean;
  /** Optional class on the outer wrapper (e.g. max width). */
  className?: string;
}) {
  const [inputVal, setInputVal] = useState(value);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setInputVal(value); }, [value]);

  const filtered = inputVal
    ? columns.filter(c => c.toLowerCase().includes(inputVal.toLowerCase()))
    : columns;

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function select(col: string) {
    onChange(col);
    setInputVal(col);
    setOpen(false);
  }

  return (
    <div className={className ? `relative ${className}` : "relative"} ref={ref}>
      <div className="relative">
        <input
          type="text"
          value={inputVal}
          disabled={disabled}
          placeholder={
            disabled ? "Configure Table Name first…" :
            loading  ? "Loading columns…" :
            columns.length === 0 ? "No columns available" :
            "Search or select column…"
          }
          onChange={e => {
            setInputVal(e.target.value);
            onChange("");
            setOpen(true);
          }}
          onFocus={() => { if (!disabled && !loading) setOpen(true); }}
          style={{ fontFamily: "monospace" }}
          className={`w-full px-3 py-2 text-sm rounded-lg border transition-colors focus:outline-none pr-8 ${
            disabled ? "border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed" :
            hasError ? "border-red-300 bg-red-50" :
            "border-gray-200 bg-white focus:border-[#13c2c2]"
          }`}
        />
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
          {loading
            ? <Loader2 size={13} className="animate-spin text-gray-400" />
            : (value && value === inputVal)
              ? <CheckCircle2 size={13} style={{ color: "#52c41a" }} />
              : <ChevronDown size={13} className="text-gray-400" />
          }
        </span>
      </div>

      {open && !disabled && !loading && (
        <div
          className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1"
          style={{ maxHeight: 200, overflowY: "auto" }}
        >
          {filtered.length > 0 ? filtered.map(col => (
            <button
              key={col}
              type="button"
              onClick={() => select(col)}
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left transition-colors ${
                col === value ? "bg-teal-50 text-teal-600" : "hover:bg-gray-50 text-gray-700"
              }`}
              style={{ fontFamily: "monospace" }}
            >
              {col === value
                ? <Check size={10} style={{ color: "#13c2c2", flexShrink: 0 }} />
                : <span className="w-2.5 flex-shrink-0" />
              }
              {col}
            </button>
          )) : (
            <p className="px-3 py-2 text-xs text-gray-400">No matching columns</p>
          )}
        </div>
      )}
    </div>
  );
}
