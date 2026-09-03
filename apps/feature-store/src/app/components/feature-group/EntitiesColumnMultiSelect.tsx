import {
  useState,
  useEffect,
  useRef,
  useLayoutEffect,
  useCallback,
} from "react";
import { createPortal } from "react-dom";
import { ChevronDown, X, Loader2 } from "lucide-react";

const VIEWPORT_BOTTOM_MARGIN_PX = 16;
const PANEL_GAP_BELOW_TRIGGER_PX = 4;
/** Used when there is no space below the trigger (raw max ≤ 0). */
const FALLBACK_PANEL_MAX_HEIGHT_PX = 120;

function computePanelGeometry(triggerEl: HTMLElement) {
  const rect = triggerEl.getBoundingClientRect();
  const rawMax =
    window.innerHeight -
    rect.bottom -
    VIEWPORT_BOTTOM_MARGIN_PX -
    PANEL_GAP_BELOW_TRIGGER_PX;
  const maxHeight =
    rawMax > 0 ? rawMax : FALLBACK_PANEL_MAX_HEIGHT_PX;
  return {
    top: rect.bottom + PANEL_GAP_BELOW_TRIGGER_PX,
    left: rect.left,
    width: rect.width,
    maxHeight,
  };
}

export function EntitiesColumnMultiSelect({
  value,
  onChange,
  columns,
  loading,
  disabled,
  hasError,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  columns: string[];
  loading: boolean;
  disabled: boolean;
  hasError?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [filterQuery, setFilterQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const filterInputRef = useRef<HTMLInputElement>(null);
  const [panelStyle, setPanelStyle] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);

  const updatePanelPosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    setPanelStyle(computePanelGeometry(el));
  }, []);

  useEffect(() => {
    if (!open) setPanelStyle(null);
  }, [open]);

  useLayoutEffect(() => {
    if (!open || disabled || loading) return;
    updatePanelPosition();
  }, [open, disabled, loading, updatePanelPosition, columns.length]);

  useEffect(() => {
    if (!open || disabled || loading) return;

    function onScrollOrResize() {
      updatePanelPosition();
    }

    const scrollRoot = triggerRef.current?.closest(
      "[data-fg-modal-scroll]"
    );
    window.addEventListener("resize", onScrollOrResize);
    scrollRoot?.addEventListener("scroll", onScrollOrResize, { passive: true });

    return () => {
      window.removeEventListener("resize", onScrollOrResize);
      scrollRoot?.removeEventListener("scroll", onScrollOrResize);
    };
  }, [open, disabled, loading, updatePanelPosition]);

  useEffect(() => {
    if (!open) return;
    function onDocMouse(e: MouseEvent) {
      const t = e.target as Node;
      if (rootRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDocMouse);
    return () => document.removeEventListener("mousedown", onDocMouse);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!open || loading || disabled) return;
    const id = requestAnimationFrame(() => {
      filterInputRef.current?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [open, loading, disabled]);

  useEffect(() => {
    if (open) setFilterQuery("");
  }, [open]);

  function toggleCol(name: string) {
    if (value.includes(name)) {
      onChange(value.filter(x => x !== name));
    } else {
      onChange([...value, name]);
    }
  }

  function removeCol(name: string) {
    onChange(value.filter(x => x !== name));
  }

  const q = filterQuery.trim().toLowerCase();
  const filteredColumns = q
    ? columns.filter(c => c.toLowerCase().includes(q))
    : columns;

  const showPanel = open && !disabled && !loading && panelStyle;

  return (
    <div className="relative" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled && !loading) setOpen(o => !o);
        }}
        className={`w-full min-h-[44px] flex items-center gap-1.5 flex-wrap border rounded-lg px-3 py-2 text-left transition-colors ${
          disabled
            ? "border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed"
            : hasError
              ? "border-red-300 bg-red-50"
              : "border-gray-200 bg-white hover:border-[#13c2c2]"
        }`}
      >
        {loading ? (
          <span className="inline-flex items-center gap-2 text-xs text-gray-400">
            <Loader2 size={14} className="animate-spin" />
            Loading columns…
          </span>
        ) : value.length > 0 ? (
          value.map(c => (
            <span
              key={c}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-mono"
              style={{
                background: "#e6fffb",
                color: "#08979c",
                border: "1px solid #87e8de",
              }}
            >
              {c}
              <button
                type="button"
                className="rounded p-0.5 hover:bg-teal-100 text-teal-700"
                onClick={e => {
                  e.stopPropagation();
                  removeCol(c);
                }}
                aria-label={`Remove ${c}`}
              >
                <X size={12} aria-hidden />
              </button>
            </span>
          ))
        ) : (
          <span className="text-xs text-gray-400 px-0.5">
            Select one or more entity columns…
          </span>
        )}
        <ChevronDown
          size={14}
          className="ml-auto text-gray-400 shrink-0 pointer-events-none"
        />
      </button>

      {showPanel &&
        createPortal(
          <div
            ref={panelRef}
            role="listbox"
            aria-multiselectable="true"
            className="fixed z-[200] bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden flex flex-col"
            style={{
              top: panelStyle.top,
              left: panelStyle.left,
              width: panelStyle.width,
              maxHeight: panelStyle.maxHeight,
            }}
          >
            <div className="p-2 border-b border-gray-100 shrink-0">
              <input
                ref={filterInputRef}
                type="text"
                aria-label="Filter columns"
                placeholder="Filter columns…"
                value={filterQuery}
                onChange={e => setFilterQuery(e.target.value)}
                onMouseDown={e => e.stopPropagation()}
                className="w-full rounded-md border border-gray-200 px-2.5 py-2 text-xs font-mono text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#13c2c2]/30 focus:border-[#13c2c2]"
              />
            </div>
            <div className="p-1 overflow-y-auto min-h-0 flex-1">
              {columns.length === 0 ? (
                <div className="py-3 px-2 text-center text-xs text-gray-400">
                  No columns loaded yet
                </div>
              ) : filteredColumns.length === 0 ? (
                <div className="py-3 px-2 text-center text-xs text-gray-400">
                  No columns match
                </div>
              ) : (
                filteredColumns.map(col => {
                  const on = value.includes(col);
                  return (
                    <button
                      key={col}
                      type="button"
                      role="option"
                      aria-selected={on}
                      onClick={() => toggleCol(col)}
                      className={`w-full flex items-center gap-2 px-2.5 py-2.5 min-h-[44px] rounded-md text-left text-xs font-mono transition-colors ${
                        on
                          ? "bg-teal-50 text-teal-800"
                          : "hover:bg-gray-50 text-gray-700"
                      }`}
                    >
                      <span
                        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                          on
                            ? "bg-[#13c2c2] border-[#13c2c2]"
                            : "border-gray-300 bg-white"
                        }`}
                        aria-hidden
                      >
                        {on && (
                          <span className="text-white text-[10px] font-bold">
                            ✓
                          </span>
                        )}
                      </span>
                      <span className="flex-1 min-w-0 truncate">{col}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
