import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ChevronRight,
  Code2,
  Copy,
  Info,
  Maximize2,
  Plus,
  PlusSquare,
  Search,
  Trash2,
  X,
} from "lucide-react";
import {
  FG_SERVING_FEATURE_SOURCES,
  FG_SERVING_TRANSFORMATIONS,
  getFeatureSourceById,
  getTransformationById,
  type FgServingFieldType,
} from "@/data/fgServingCatalog";
import {
  buildMappedConfigFromCatalog,
  cloneFgServingState,
  countMappedInputs,
  listUpstreamOutputGroups,
  type CodeBlockInputRow,
  type CodeBlockOutputRow,
  type EndOutputRow,
  type FgServingCanvasState,
  type FgServingNodeConfig,
  type FgServingNodeDef,
  type FgServingNodeId,
  type InputFieldMapping,
  type MappedAssetNodeConfig,
  type SourceRef,
  type StartInputFieldRow,
} from "@/data/fgServingCanvasModel";

const FIELD_TYPES: FgServingFieldType[] = ["string", "int", "bool", "map"];

function formatSourceLabel(
  ref: SourceRef | null,
  nodeTitleById: Map<string, string>,
  emptyLabel: string
): string {
  if (!ref) return emptyLabel;
  if (ref.kind === "fixed") {
    return ref.value === ""
      ? "FIXED VALUE"
      : `FIXED VALUE: ${ref.value}`;
  }
  const title = nodeTitleById.get(ref.nodeId) ?? ref.nodeId;
  return `${title} / ${ref.field} (${ref.fieldType})`;
}

function autofillMappings(
  state: FgServingCanvasState,
  targetId: FgServingNodeId,
  mappings: InputFieldMapping[]
): InputFieldMapping[] {
  const groups = listUpstreamOutputGroups(state, targetId);
  const flat = groups.flatMap((g) =>
    g.fields.map((f) => ({
      nodeId: g.nodeId,
      name: f.name,
      type: f.type,
      title: g.title,
    }))
  );
  return mappings.map((m) => {
    if (m.source !== null) return m;
    const hits = flat.filter((o) => o.name === m.paramName);
    if (hits.length !== 1) return m;
    const h = hits[0];
    return {
      ...m,
      source: {
        kind: "upstream" as const,
        nodeId: h.nodeId,
        field: h.name,
        fieldType: h.type,
      },
    };
  });
}

/** Keys `nodeId:fieldName` for upstream fields bound elsewhere (e.g. other End rows). */
function upstreamFieldKey(nodeId: FgServingNodeId, field: string): string {
  return `${nodeId}:${field}`;
}

function UpstreamCascadePicker({
  source,
  groups,
  nodeTitleById,
  disabled,
  onPick,
  onClear,
  fixedFieldLabel,
  fixedValueMode,
  textPlaceholder = "Enter value",
  emptyLabel = "SELECT SOURCE…",
  disabledUpstreamFieldKeys,
  endMappingTrigger = false,
}: {
  source: SourceRef | null;
  groups: ReturnType<typeof listUpstreamOutputGroups>;
  nodeTitleById: Map<string, string>;
  disabled: boolean;
  onPick: (ref: SourceRef) => void;
  onClear: () => void;
  fixedFieldLabel: string;
  fixedValueMode: "bool" | "text";
  textPlaceholder?: string;
  emptyLabel?: string;
  /** Upstream fields already selected on another row; current `source` remains selectable. */
  disabledUpstreamFieldKeys?: Set<string>;
  /** Pill-style trigger + search affordance for END node mapping cards. */
  endMappingTrigger?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"root" | "fields" | "fixed">("root");
  const [pickedNode, setPickedNode] = useState<FgServingNodeId | null>(null);
  const [triggerFocused, setTriggerFocused] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const fixedInputUid = useId().replace(/:/g, "");
  const fixedInputId = `fixed-val-${fixedFieldLabel.replace(/\W/g, "_")}-${fixedInputUid}`;

  function isUpstreamFieldTaken(
    nodeId: FgServingNodeId,
    field: string
  ): boolean {
    const keys = disabledUpstreamFieldKeys;
    if (!keys || keys.size === 0) return false;
    const key = upstreamFieldKey(nodeId, field);
    if (!keys.has(key)) return false;
    if (
      source?.kind === "upstream" &&
      source.nodeId === nodeId &&
      source.field === field
    ) {
      return false;
    }
    return true;
  }

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setStep("root");
        setPickedNode(null);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const openMenu = () => {
    if (disabled) return;
    setOpen((v) => !v);
    setStep("root");
    setPickedNode(null);
  };

  const triggerBtnClass = endMappingTrigger
    ? `flex-1 min-h-[44px] text-left pl-3 pr-2 py-2 text-xs border border-gray-200/90 rounded-full bg-white
        flex items-center gap-2 min-w-0 shadow-sm
        hover:border-cyan-200 hover:bg-cyan-50/40
        focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-1
        disabled:opacity-50 disabled:cursor-not-allowed`
    : `flex-1 min-h-[44px] text-left px-3 py-2 text-xs border border-gray-200 rounded-lg bg-white
        hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-1
        disabled:opacity-50 disabled:cursor-not-allowed`;

  const showSearchAffordance =
    endMappingTrigger && (open || triggerFocused);

  return (
    <div className="relative min-w-0 flex-1" ref={rootRef}>
      <div className="flex items-center gap-1 w-full min-w-0">
        <button
          type="button"
          disabled={disabled}
          onClick={openMenu}
          onFocus={() => setTriggerFocused(true)}
          onBlur={() => setTriggerFocused(false)}
          className={triggerBtnClass}
        >
          <span className="truncate flex-1 min-w-0 text-slate-800">
            {formatSourceLabel(source, nodeTitleById, emptyLabel)}
          </span>
          {showSearchAffordance ? (
            <Search
              size={14}
              className="shrink-0 text-gray-400"
              aria-hidden
            />
          ) : null}
        </button>
        {source !== null && !disabled && (
          <button
            type="button"
            aria-label="Clear mapping"
            onClick={onClear}
            className={`shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center border border-gray-200
              text-gray-400 hover:text-gray-700 hover:bg-cyan-50/60 focus:outline-none focus:ring-2 focus:ring-cyan-300
              ${endMappingTrigger ? "rounded-full" : "rounded-lg focus:ring-teal-400"}`}
          >
            <X size={16} />
          </button>
        )}
      </div>
      {open && (
        <div
          className="absolute left-0 right-0 top-full mt-1 z-40 flex rounded-lg border border-gray-200 bg-white shadow-xl overflow-hidden"
          style={{ minHeight: 160 }}
        >
          {step === "root" && (
            <div className="flex-1 py-1 max-h-56 overflow-y-auto">
              {groups.map((g) => (
                <button
                  key={g.nodeId}
                  type="button"
                  className="w-full flex items-center justify-between px-3 py-2.5 text-left text-xs
                    text-gray-800 hover:bg-cyan-50/90 active:bg-cyan-100/80
                    focus:outline-none focus-visible:bg-cyan-50 focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-cyan-200"
                  onClick={() => {
                    setPickedNode(g.nodeId);
                    setStep("fields");
                  }}
                >
                  <span className="font-medium">{g.title}</span>
                  <ChevronRight size={14} className="text-gray-400" />
                </button>
              ))}
              <button
                type="button"
                className="w-full px-3 py-2.5 text-left text-xs text-blue-600 font-medium hover:bg-blue-50"
                onClick={() => {
                  setStep("fixed");
                  setPickedNode(null);
                }}
              >
                FIXED VALUE
              </button>
            </div>
          )}
          {step === "fields" && pickedNode && (
            <div className="flex-1 flex flex-col border-l border-gray-100 min-w-[200px]">
              <button
                type="button"
                className="px-3 py-2 text-[11px] text-gray-500 hover:bg-cyan-50/70 border-b border-gray-100
                  focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-cyan-200"
                onClick={() => {
                  setStep("root");
                  setPickedNode(null);
                }}
              >
                ← BACK
              </button>
              <div className="py-1 max-h-48 overflow-y-auto">
                {groups
                  .find((x) => x.nodeId === pickedNode)
                  ?.fields.map((f) => {
                    const taken = isUpstreamFieldTaken(pickedNode, f.name);
                    return (
                      <button
                        key={f.name}
                        type="button"
                        disabled={taken}
                        className={`w-full text-left px-3 py-2 text-xs focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-teal-200 ${
                          taken
                            ? "text-gray-400 cursor-not-allowed bg-gray-50/80"
                            : "hover:bg-teal-50 active:bg-teal-100/80 text-gray-800"
                        }`}
                        onClick={() => {
                          if (taken) return;
                          onPick({
                            kind: "upstream",
                            nodeId: pickedNode,
                            field: f.name,
                            fieldType: f.type,
                          });
                          setOpen(false);
                          setStep("root");
                        }}
                      >
                        {f.name}{" "}
                        <span className={taken ? "text-gray-400" : "text-gray-400"}>
                          ({f.type})
                        </span>
                        {taken ? (
                          <span className="ml-1 text-[10px] text-gray-400">
                            (USED)
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
              </div>
            </div>
          )}
          {step === "fixed" && (
            <div className="flex-1 p-3 border-l border-gray-100 min-w-[220px]">
              <button
                type="button"
                className="mb-2 text-[11px] text-gray-500 hover:text-gray-800"
                onClick={() => setStep("root")}
              >
                ← BACK
              </button>
              <p className="text-[11px] text-gray-500 mb-2 uppercase">
                CONSTANT VALUE FOR {fixedFieldLabel}
              </p>
              {fixedValueMode === "bool" ? (
                <select
                  className="w-full min-h-[44px] px-2 text-xs border border-gray-200 rounded-lg"
                  defaultValue=""
                  onChange={(e) => {
                    const v = e.target.value;
                    onPick({ kind: "fixed", value: v });
                    setOpen(false);
                    setStep("root");
                  }}
                >
                  <option value="" disabled>
                    CHOOSE…
                  </option>
                  <option value="true">true</option>
                  <option value="false">false</option>
                </select>
              ) : (
                <>
                  <input
                    type="text"
                    className="w-full min-h-[44px] px-2 text-xs border border-gray-200 rounded-lg font-mono"
                    placeholder={textPlaceholder}
                    id={fixedInputId}
                  />
                  <button
                    type="button"
                    className="mt-2 w-full min-h-[44px] text-xs font-medium bg-teal-500 text-white rounded-lg hover:bg-teal-600"
                    onClick={() => {
                      const el = document.getElementById(
                        fixedInputId
                      ) as HTMLInputElement | null;
                      onPick({ kind: "fixed", value: el?.value ?? "" });
                      setOpen(false);
                      setStep("root");
                    }}
                  >
                    APPLY
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SourceCascadePicker({
  param,
  groups,
  nodeTitleById,
  disabled,
  onPick,
  onClear,
}: {
  param: InputFieldMapping;
  groups: ReturnType<typeof listUpstreamOutputGroups>;
  nodeTitleById: Map<string, string>;
  disabled: boolean;
  onPick: (ref: SourceRef) => void;
  onClear: () => void;
}) {
  const fixedValueMode = param.paramType === "bool" ? "bool" : "text";
  const textPlaceholder =
    param.paramType === "int" ? 'Integer or "null"' : "Enter value";
  return (
    <UpstreamCascadePicker
      source={param.source}
      groups={groups}
      nodeTitleById={nodeTitleById}
      disabled={disabled}
      onPick={onPick}
      onClear={onClear}
      fixedFieldLabel={param.paramName}
      fixedValueMode={fixedValueMode}
      textPlaceholder={textPlaceholder}
      emptyLabel="SELECT SOURCE…"
    />
  );
}

function StartPanel({
  cfg,
  readOnly,
  onChange,
}: {
  cfg: Extract<FgServingNodeConfig, { kind: "start" }>;
  readOnly: boolean;
  onChange: (next: Extract<FgServingNodeConfig, { kind: "start" }>) => void;
}) {
  function addRow() {
    onChange({
      ...cfg,
      inputFields: [
        ...cfg.inputFields,
        {
          id: `r-${Math.random().toString(36).slice(2, 10)}`,
          name: "",
          dataType: "string",
        },
      ],
    });
  }

  function updateRow(id: string, patch: Partial<StartInputFieldRow>) {
    onChange({
      ...cfg,
      inputFields: cfg.inputFields.map((r) =>
        r.id === id ? { ...r, ...patch } : r
      ),
    });
  }

  function removeRow(id: string) {
    onChange({
      ...cfg,
      inputFields: cfg.inputFields.filter((r) => r.id !== id),
    });
  }

  return (
    <section className="space-y-3">
      <h3 className="text-xs font-bold text-gray-800 tracking-wide uppercase">
        INPUT FIELDS
      </h3>
      <div className="space-y-2">
        {cfg.inputFields.map((row) => (
          <div key={row.id} className="flex items-center gap-2">
            <label className="sr-only" htmlFor={`in-name-${row.id}`}>
              Field name
            </label>
            <input
              id={`in-name-${row.id}`}
              disabled={readOnly}
              value={row.name}
              onChange={(e) => updateRow(row.id, { name: e.target.value })}
              className="flex-1 min-w-0 min-h-[44px] px-2 text-xs border border-gray-200 rounded-lg"
              placeholder="field_name"
            />
            <label className="sr-only" htmlFor={`in-type-${row.id}`}>
              Data type
            </label>
            <select
              id={`in-type-${row.id}`}
              disabled={readOnly}
              value={row.dataType}
              onChange={(e) =>
                updateRow(row.id, {
                  dataType: e.target.value as FgServingFieldType,
                })
              }
              className="w-[100px] min-h-[44px] px-1 text-xs border border-gray-200 rounded-lg shrink-0"
            >
              {FIELD_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            {!readOnly && (
              <button
                type="button"
                aria-label={`Delete field ${row.name || row.id}`}
                onClick={() => removeRow(row.id)}
                className="shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-red-600 rounded-lg border border-transparent hover:border-red-100"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        ))}
      </div>
      {!readOnly && (
        <button
          type="button"
          onClick={addRow}
          className="w-full min-h-[44px] text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg border border-gray-200"
        >
          + ADD
        </button>
      )}
    </section>
  );
}

function MappedAssetPanel({
  nodeId,
  assetKind,
  asset,
  canvasState,
  readOnly,
  onChangeAsset,
}: {
  nodeId: FgServingNodeId;
  assetKind: "feature_source" | "transformation";
  asset: MappedAssetNodeConfig;
  canvasState: FgServingCanvasState;
  readOnly: boolean;
  onChangeAsset: (next: MappedAssetNodeConfig) => void;
}) {
  const catalog =
    assetKind === "feature_source"
      ? FG_SERVING_FEATURE_SOURCES
      : FG_SERVING_TRANSFORMATIONS;

  const entry = useMemo(() => {
    return assetKind === "feature_source"
      ? getFeatureSourceById(asset.selectedCatalogId)
      : getTransformationById(asset.selectedCatalogId);
  }, [asset.selectedCatalogId, assetKind]);

  const nodeTitleById = useMemo(() => {
    const m = new Map<string, string>();
    canvasState.nodes.forEach((n) => m.set(n.id, n.title));
    return m;
  }, [canvasState.nodes]);

  const upstreamGroups = useMemo(
    () => listUpstreamOutputGroups(canvasState, nodeId),
    [canvasState, nodeId]
  );

  const [outSearch, setOutSearch] = useState("");

  const filteredOutputs = useMemo(() => {
    const q = outSearch.trim().toLowerCase();
    if (!q) return asset.outputFields;
    return asset.outputFields.filter((o) => o.name.toLowerCase().includes(q));
  }, [asset.outputFields, outSearch]);

  const mappedCount = countMappedInputs(asset.inputMappings);
  const totalIn = asset.inputMappings.length;

  function setCatalogId(id: string) {
    const next = buildMappedConfigFromCatalog(id, assetKind);
    onChangeAsset(next);
  }

  function updateMapping(i: number, patch: Partial<InputFieldMapping>) {
    const inputMappings = asset.inputMappings.map((m, j) =>
      j === i ? { ...m, ...patch } : m
    );
    onChangeAsset({ ...asset, inputMappings });
  }

  function autofill() {
    const nextState = cloneFgServingState(canvasState);
    const filled = autofillMappings(nextState, nodeId, asset.inputMappings);
    onChangeAsset({ ...asset, inputMappings: filled });
  }

  const allSelected =
    asset.outputFields.length > 0 &&
    asset.outputFields.every((o) => o.selected);

  function toggleSelectAll(checked: boolean) {
    onChangeAsset({
      ...asset,
      outputFields: asset.outputFields.map((o) => ({ ...o, selected: checked })),
    });
  }

  function toggleOne(name: string, checked: boolean) {
    onChangeAsset({
      ...asset,
      outputFields: asset.outputFields.map((o) =>
        o.name === name ? { ...o, selected: checked } : o
      ),
    });
  }

  function setDefault(name: string, v: string) {
    onChangeAsset({
      ...asset,
      outputFields: asset.outputFields.map((o) =>
        o.name === name ? { ...o, defaultValue: v } : o
      ),
    });
  }

  const selectedOutCount = asset.outputFields.filter((o) => o.selected).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="fg-asset-select" className="text-xs text-gray-500 shrink-0 uppercase">
          REGISTERED {assetKind === "feature_source" ? "FEATURE SOURCE" : "TRANSFORMATION"}
        </label>
        <select
          id="fg-asset-select"
          disabled={readOnly}
          value={asset.selectedCatalogId}
          onChange={(e) => setCatalogId(e.target.value)}
          className="flex-1 min-w-[160px] min-h-[44px] px-2 text-xs border border-gray-200 rounded-lg"
        >
          {catalog.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        {entry && (
          <span className="text-xs font-mono text-teal-700 bg-teal-50 px-2 py-1 rounded-md border border-teal-100">
            {entry.versionTag}
          </span>
        )}
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-3 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">
            MAP INPUT FIELDS
          </h3>
          <span className="text-xs text-gray-500 uppercase">
            CONFIGURATION PROGRESS: {mappedCount}/{totalIn || 0}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={readOnly}
            onClick={autofill}
            className="text-xs font-medium text-blue-600 hover:text-blue-800 disabled:opacity-50 min-h-[44px] px-1"
          >
            AUTOFILL
          </button>
          <span className="text-gray-300">|</span>
          <span className="inline-flex items-center gap-1 text-[11px] text-gray-400">
            <Info size={12} className="shrink-0" aria-hidden />
            MATCH UPSTREAM FIELDS BY NAME
          </span>
        </div>
        <div className="space-y-3">
          {asset.inputMappings.map((m, i) => (
            <div
              key={`${m.paramName}-${i}`}
              className="rounded-lg border border-gray-200 bg-gray-50/80 p-3 space-y-2"
            >
              <div className="flex flex-wrap justify-between gap-2 text-xs">
                <span className="text-gray-700 uppercase text-[11px]">
                  FIELD: <span className="font-mono font-medium normal-case">{m.paramName}</span>
                </span>
                <span className="text-gray-500 uppercase text-[11px]">TYPE: {m.paramType}</span>
              </div>
              <div>
                <span className="text-[11px] text-gray-500 block mb-1 uppercase">SOURCE</span>
                <SourceCascadePicker
                  param={m}
                  groups={upstreamGroups}
                  nodeTitleById={nodeTitleById}
                  disabled={readOnly}
                  onPick={(ref) => updateMapping(i, { source: ref })}
                  onClear={() => updateMapping(i, { source: null })}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-3 space-y-3">
        <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">
          MAP OUTPUT FIELDS
        </h3>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[140px] relative">
            <label htmlFor="out-search" className="sr-only">
              Search by field
            </label>
            <input
              id="out-search"
              value={outSearch}
              onChange={(e) => setOutSearch(e.target.value)}
              placeholder="SEARCH BY FIELD"
              className="w-full min-h-[44px] pl-3 pr-2 text-xs border border-gray-200 rounded-lg"
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <span className="uppercase">SELECTED: {selectedOutCount}</span>
            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                disabled={readOnly}
                checked={allSelected}
                onChange={(e) => toggleSelectAll(e.target.checked)}
                className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
              />
              SELECT ALL
            </label>
          </div>
        </div>
        <div className="space-y-2">
          {filteredOutputs.map((o) => (
            <div
              key={o.name}
              className="rounded-lg border border-gray-200 overflow-hidden"
            >
              <div className="flex items-center justify-between gap-2 px-3 py-2 bg-sky-50/90 border-b border-gray-100">
                <div className="text-xs text-gray-700 min-w-0 uppercase">
                  FIELD:{" "}
                  <span className="font-mono font-semibold text-slate-800 normal-case">{o.name}</span>
                  <span className="text-gray-500 ml-2">TYPE: {o.type}</span>
                </div>
                <input
                  type="checkbox"
                  disabled={readOnly}
                  checked={o.selected}
                  onChange={(e) => toggleOne(o.name, e.target.checked)}
                  className="rounded border-gray-300 text-teal-600 focus:ring-teal-500 shrink-0 w-5 h-5"
                  aria-label={`Select output ${o.name}`}
                />
              </div>
              <div className="px-3 py-2 bg-white flex flex-col gap-1">
                <label className="text-[11px] text-gray-500 uppercase" htmlFor={`def-${o.name}`}>
                  DEFAULT VALUE
                </label>
                <input
                  id={`def-${o.name}`}
                  disabled={readOnly || !o.selected}
                  value={o.defaultValue}
                  onChange={(e) => setDefault(o.name, e.target.value)}
                  placeholder={
                    o.type === "int" ? 'Enter an integer or "null"' : ""
                  }
                  className="w-full min-h-[44px] px-2 text-xs border border-gray-200 rounded-lg disabled:bg-gray-50"
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function CodeBlockPanel({
  nodeId,
  cfg,
  canvasState,
  readOnly,
  onChange,
  expandOpen,
  onExpandOpenChange,
}: {
  nodeId: FgServingNodeId;
  cfg: Extract<FgServingNodeConfig, { kind: "compute" }>;
  canvasState: FgServingCanvasState;
  readOnly: boolean;
  onChange: (next: Extract<FgServingNodeConfig, { kind: "compute" }>) => void;
  expandOpen: boolean;
  onExpandOpenChange: (open: boolean) => void;
}) {
  const nodeTitleById = useMemo(() => {
    const m = new Map<string, string>();
    canvasState.nodes.forEach((n) => m.set(n.id, n.title));
    return m;
  }, [canvasState.nodes]);

  const upstreamGroups = useMemo(
    () => listUpstreamOutputGroups(canvasState, nodeId),
    [canvasState, nodeId]
  );

  const [copyDone, setCopyDone] = useState(false);

  function patch(p: Partial<typeof cfg>) {
    onChange({ ...cfg, ...p });
  }

  function addInput() {
    patch({
      inputs: [
        ...cfg.inputs,
        {
          id: `r-${Math.random().toString(36).slice(2, 10)}`,
          localName: "",
          source: null,
        },
      ],
    });
  }

  function updateInput(id: string, patchRow: Partial<CodeBlockInputRow>) {
    patch({
      inputs: cfg.inputs.map((r) => (r.id === id ? { ...r, ...patchRow } : r)),
    });
  }

  function removeInput(id: string) {
    if (cfg.inputs.length <= 1) return;
    patch({ inputs: cfg.inputs.filter((r) => r.id !== id) });
  }

  function addOutput() {
    patch({
      outputs: [
        ...cfg.outputs,
        {
          id: `r-${Math.random().toString(36).slice(2, 10)}`,
          name: "",
          type: "string",
        },
      ],
    });
  }

  function updateOutput(id: string, patchRow: Partial<CodeBlockOutputRow>) {
    patch({
      outputs: cfg.outputs.map((r) =>
        r.id === id ? { ...r, ...patchRow } : r
      ),
    });
  }

  function removeOutput(id: string) {
    if (cfg.outputs.length <= 1) return;
    patch({ outputs: cfg.outputs.filter((r) => r.id !== id) });
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(cfg.code);
      setCopyDone(true);
      window.setTimeout(() => setCopyDone(false), 2000);
    } catch {
      setCopyDone(false);
    }
  }

  const codeEditor = (
    <textarea
      value={cfg.code}
      disabled={readOnly}
      onChange={(e) => patch({ code: e.target.value })}
      spellCheck={false}
      className="w-full min-h-[200px] px-3 py-2 text-xs font-mono leading-relaxed border-0 bg-transparent resize-y focus:outline-none focus:ring-0 text-slate-800"
      aria-label="Python code"
    />
  );

  return (
    <div className="space-y-3">
      <section>
        <div className="flex items-center justify-between mb-1.5">
          <h3 className="text-xs font-bold text-gray-800 tracking-wide uppercase">
            INPUT FIELDS
          </h3>
          {!readOnly && (
            <button
              type="button"
              aria-label="Add input field"
              onClick={addInput}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800"
            >
              <Plus size={18} />
            </button>
          )}
        </div>
        <div className="space-y-2">
          {cfg.inputs.map((row) => (
            <div
              key={row.id}
              className="flex flex-row items-center gap-2 w-full min-w-0 p-2 rounded-lg border border-gray-100 bg-gray-50/50"
            >
              <label className="sr-only" htmlFor={`cb-in-${row.id}`}>
                Local variable name
              </label>
              <input
                id={`cb-in-${row.id}`}
                disabled={readOnly}
                value={row.localName}
                onChange={(e) =>
                  updateInput(row.id, { localName: e.target.value })
                }
                placeholder="variable_name"
                className="flex-1 min-w-[120px] min-h-[44px] px-2 text-xs border border-gray-200 rounded-lg font-mono"
              />
              <div className="flex-[2] min-w-0 flex items-center gap-1">
                <UpstreamCascadePicker
                  source={row.source}
                  groups={upstreamGroups}
                  nodeTitleById={nodeTitleById}
                  disabled={readOnly}
                  onPick={(ref) => updateInput(row.id, { source: ref })}
                  onClear={() => updateInput(row.id, { source: null })}
                  fixedFieldLabel={row.localName || "field"}
                  fixedValueMode="text"
                  emptyLabel="SELECT SOURCE…"
                />
                {!readOnly && (
                  <button
                    type="button"
                    aria-label="Remove input row"
                    disabled={cfg.inputs.length <= 1}
                    onClick={() => removeInput(row.id)}
                    className="shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-red-600 rounded-lg disabled:opacity-30 disabled:pointer-events-none"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-slate-100 overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 bg-slate-200/80 border-b border-slate-200">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <Code2 size={14} className="text-sky-600" aria-hidden />
            PYTHON3
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={copyCode}
              disabled={readOnly}
              aria-label="Copy code"
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-slate-600 hover:bg-white/80 disabled:opacity-40"
            >
              <Copy size={16} />
            </button>
            <button
              type="button"
              onClick={() => onExpandOpenChange(true)}
              disabled={readOnly}
              aria-label="Expand editor"
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-slate-600 hover:bg-white/80 disabled:opacity-40"
            >
              <Maximize2 size={16} />
            </button>
          </div>
        </div>
        {copyDone && (
          <p className="px-3 py-1 text-[11px] text-teal-700 bg-teal-50 uppercase" role="status">
            COPIED TO CLIPBOARD
          </p>
        )}
        {codeEditor}
      </section>

      {expandOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-label="Expanded code editor"
          onClick={() => onExpandOpenChange(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <span className="text-sm font-semibold text-gray-800">PYTHON3</span>
              <button
                type="button"
                aria-label="Close expanded editor"
                onClick={() => onExpandOpenChange(false)}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>
            <textarea
              value={cfg.code}
              disabled={readOnly}
              onChange={(e) => patch({ code: e.target.value })}
              spellCheck={false}
              className="flex-1 min-h-[min(70vh,520px)] w-full p-4 text-sm font-mono leading-relaxed border-0 focus:outline-none focus:ring-0 resize-none text-slate-800"
            />
          </div>
        </div>
      )}

      <section>
        <div className="flex items-center justify-between mb-1.5">
          <h3 className="text-xs font-bold text-gray-800 tracking-wide uppercase">
            OUTPUT FIELDS <span className="text-red-500">*</span>
          </h3>
          {!readOnly && (
            <button
              type="button"
              aria-label="Add output field"
              onClick={addOutput}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100"
            >
              <Plus size={18} />
            </button>
          )}
        </div>
        <div className="space-y-2">
          {cfg.outputs.map((row) => (
            <div key={row.id} className="flex items-center gap-2">
              <label className="sr-only" htmlFor={`cb-out-name-${row.id}`}>
                Output field name
              </label>
              <input
                id={`cb-out-name-${row.id}`}
                disabled={readOnly}
                value={row.name}
                onChange={(e) => updateOutput(row.id, { name: e.target.value })}
                placeholder="field_name"
                className="flex-1 min-w-0 min-h-[44px] px-2 text-xs border border-gray-200 rounded-lg font-mono"
              />
              <select
                disabled={readOnly}
                value={row.type}
                onChange={(e) =>
                  updateOutput(row.id, {
                    type: e.target.value as FgServingFieldType,
                  })
                }
                className="w-[100px] min-h-[44px] px-1 text-xs border border-gray-200 rounded-lg shrink-0"
              >
                {FIELD_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              {!readOnly && (
                <button
                  type="button"
                  aria-label="Remove output row"
                  disabled={cfg.outputs.length <= 1}
                  onClick={() => removeOutput(row.id)}
                  className="shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-red-600 rounded-lg disabled:opacity-30 disabled:pointer-events-none"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function EndPanel({
  nodeId,
  cfg,
  canvasState,
  readOnly,
  trainingFeatureNames,
  onChange,
}: {
  nodeId: FgServingNodeId;
  cfg: Extract<FgServingNodeConfig, { kind: "end" }>;
  canvasState: FgServingCanvasState;
  readOnly: boolean;
  trainingFeatureNames: string[];
  onChange: (next: Extract<FgServingNodeConfig, { kind: "end" }>) => void;
}) {
  const nodeTitleById = useMemo(() => {
    const m = new Map<string, string>();
    canvasState.nodes.forEach((n) => m.set(n.id, n.title));
    return m;
  }, [canvasState.nodes]);

  const upstreamGroups = useMemo(
    () => listUpstreamOutputGroups(canvasState, nodeId),
    [canvasState, nodeId]
  );

  const flatUpstreamFields = useMemo(
    () =>
      upstreamGroups.flatMap((g) =>
        g.fields.map((f) => ({
          nodeId: g.nodeId,
          field: f.name,
          fieldType: f.type,
        }))
      ),
    [upstreamGroups]
  );

  function patch(p: Partial<typeof cfg>) {
    onChange({ ...cfg, ...p });
  }

  function addRow() {
    patch({
      outputs: [
        ...cfg.outputs,
        {
          id: `r-${Math.random().toString(36).slice(2, 10)}`,
          trainingFeatureName: "",
          source: null,
        },
      ],
    });
  }

  function updateRow(id: string, patchRow: Partial<EndOutputRow>) {
    patch({
      outputs: cfg.outputs.map((r) =>
        r.id === id ? { ...r, ...patchRow } : r
      ),
    });
  }

  function removeRow(id: string) {
    if (cfg.outputs.length <= 1) return;
    patch({ outputs: cfg.outputs.filter((r) => r.id !== id) });
  }

  function occupiedUpstreamKeysForRow(exceptRowId: string): Set<string> {
    const s = new Set<string>();
    for (const r of cfg.outputs) {
      if (r.id === exceptRowId) continue;
      if (r.source?.kind === "upstream") {
        s.add(upstreamFieldKey(r.source.nodeId, r.source.field));
      }
    }
    return s;
  }

  function addAllFromUpstream() {
    const next = cfg.outputs.map((row) => {
      if (row.source !== null) return row;
      const name = row.trainingFeatureName.trim();
      if (!name) return row;
      const hits = flatUpstreamFields.filter((o) => o.field === name);
      if (hits.length !== 1) return row;
      const h = hits[0];
      return {
        ...row,
        source: {
          kind: "upstream" as const,
          nodeId: h.nodeId,
          field: h.field,
          fieldType: h.fieldType,
        },
      };
    });
    onChange({ ...cfg, outputs: next });
  }

  return (
    <div className="space-y-3">
      <section className="rounded-xl border border-gray-200 bg-white p-3 sm:p-4 space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-800 tracking-tight uppercase">
            OUTPUT FEATURES MAPPING
          </h3>
          <p className="mt-0.5 text-[11px] text-gray-400">
            {cfg.outputs.length} mapping{cfg.outputs.length === 1 ? "" : "s"}
          </p>
        </div>
        <p className="text-[11px] text-gray-500 leading-snug">
          <span className="inline-flex items-start gap-1.5">
            <Info
              size={12}
              className="shrink-0 text-gray-400 mt-0.5"
              aria-hidden
            />
            Training list suggestions; names that match Training Config count as
            mapped on the FG detail card.
          </span>
        </p>

        <div className="space-y-3">
          {cfg.outputs.map((row) => (
            <div
              key={row.id}
              className="relative rounded-xl bg-slate-50/90 border border-gray-200/80 p-3 pt-9 sm:pt-3 sm:pr-11"
            >
              {!readOnly && (
                <button
                  type="button"
                  aria-label="Remove output row"
                  disabled={cfg.outputs.length <= 1}
                  onClick={() => removeRow(row.id)}
                  className="absolute top-2 right-2 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg
                    text-red-500 hover:text-red-600 hover:bg-red-50/90
                    focus:outline-none focus:ring-2 focus:ring-red-300 focus:ring-offset-1
                    disabled:opacity-30 disabled:pointer-events-none disabled:hover:bg-transparent"
                >
                  <Trash2 size={18} strokeWidth={2} aria-hidden />
                </button>
              )}
              <div className="space-y-3 min-w-0">
                <div className="min-w-0 flex flex-col gap-1.5">
                  <label
                    className="text-xs font-medium text-slate-700 uppercase tracking-wide"
                    htmlFor={`end-feat-${row.id}`}
                  >
                    FEATURE NAME
                  </label>
                  <input
                    id={`end-feat-${row.id}`}
                    type="text"
                    list={`end-feat-dl-${row.id}`}
                    disabled={readOnly}
                    value={row.trainingFeatureName}
                    onChange={(e) =>
                      updateRow(row.id, { trainingFeatureName: e.target.value })
                    }
                    placeholder={
                      trainingFeatureNames.length > 0
                        ? "e.g. qc_score"
                        : "Feature name"
                    }
                    autoComplete="off"
                    className="w-full min-h-[44px] px-3 text-xs border border-gray-200 rounded-xl bg-white font-mono text-slate-800
                      focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-0 focus:border-cyan-200"
                  />
                  <datalist id={`end-feat-dl-${row.id}`}>
                    {trainingFeatureNames.map((name) => (
                      <option key={name} value={name} />
                    ))}
                  </datalist>
                </div>
                <div className="min-w-0 flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-slate-700 uppercase tracking-wide">
                    SOURCE FIELD MAPPING
                  </span>
                  <UpstreamCascadePicker
                    source={row.source}
                    groups={upstreamGroups}
                    nodeTitleById={nodeTitleById}
                    disabled={readOnly}
                    onPick={(ref) => updateRow(row.id, { source: ref })}
                    onClear={() => updateRow(row.id, { source: null })}
                    fixedFieldLabel={row.trainingFeatureName || "output"}
                    fixedValueMode="text"
                    emptyLabel="SET VARIABLE"
                    disabledUpstreamFieldKeys={occupiedUpstreamKeysForRow(
                      row.id
                    )}
                    endMappingTrigger
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {!readOnly && (
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={addRow}
              className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-3 text-xs font-medium rounded-xl
                border border-gray-200/90 bg-slate-100/80 text-slate-700
                hover:bg-slate-200/70 hover:border-gray-300
                focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-1 uppercase tracking-wide"
            >
              <Plus size={14} strokeWidth={2.5} aria-hidden />
              ADD
            </button>
            <button
              type="button"
              onClick={addAllFromUpstream}
              className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-2 text-xs font-medium rounded-xl
                border border-gray-200/90 bg-slate-100/80 text-slate-700
                hover:bg-slate-200/70 hover:border-gray-300
                focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-1 uppercase tracking-wide"
            >
              <PlusSquare size={14} strokeWidth={2} aria-hidden />
              ADD ALL FROM SOURCE
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

export function FgServingConfigPanel({
  open,
  node,
  config,
  canvasState,
  readOnly,
  trainingFeatureNames,
  onClose,
  onUpdateConfig,
}: {
  open: boolean;
  node: FgServingNodeDef | null;
  config: FgServingNodeConfig | undefined;
  canvasState: FgServingCanvasState;
  readOnly: boolean;
  trainingFeatureNames: string[];
  onClose: () => void;
  onUpdateConfig: (nodeId: FgServingNodeId, cfg: FgServingNodeConfig) => void;
}) {
  const [codeExpandOpen, setCodeExpandOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      setCodeExpandOpen(false);
    }
  }, [open, node?.id]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (codeExpandOpen) {
        e.stopPropagation();
        setCodeExpandOpen(false);
        return;
      }
      onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, codeExpandOpen]);

  const renderBody = useCallback(() => {
    if (!node || !config) return null;
    if (config.kind === "start") {
      return (
        <StartPanel
          cfg={config}
          readOnly={readOnly}
          onChange={(next) => onUpdateConfig(node.id, next)}
        />
      );
    }
    if (config.kind === "feature_source") {
      return (
        <MappedAssetPanel
          nodeId={node.id}
          assetKind="feature_source"
          asset={config.asset}
          canvasState={canvasState}
          readOnly={readOnly}
          onChangeAsset={(asset) =>
            onUpdateConfig(node.id, { kind: "feature_source", asset })
          }
        />
      );
    }
    if (config.kind === "transformation") {
      return (
        <MappedAssetPanel
          nodeId={node.id}
          assetKind="transformation"
          asset={config.asset}
          canvasState={canvasState}
          readOnly={readOnly}
          onChangeAsset={(asset) =>
            onUpdateConfig(node.id, { kind: "transformation", asset })
          }
        />
      );
    }
    if (config.kind === "compute") {
      return (
        <CodeBlockPanel
          nodeId={node.id}
          cfg={config}
          canvasState={canvasState}
          readOnly={readOnly}
          expandOpen={codeExpandOpen}
          onExpandOpenChange={setCodeExpandOpen}
          onChange={(next) => onUpdateConfig(node.id, next)}
        />
      );
    }
    return (
      <EndPanel
        nodeId={node.id}
        cfg={config}
        canvasState={canvasState}
        readOnly={readOnly}
        trainingFeatureNames={trainingFeatureNames}
        onChange={(next) => onUpdateConfig(node.id, next)}
      />
    );
  }, [
    node,
    config,
    readOnly,
    canvasState,
    onUpdateConfig,
    trainingFeatureNames,
    codeExpandOpen,
  ]);

  if (!open || !node) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Close configuration panel"
        className="fixed inset-0 bg-black/40 z-40 transition-opacity"
        onClick={onClose}
      />
      <aside
        className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-white border-l border-gray-200 shadow-2xl z-50 flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="fg-serving-panel-title"
      >
        <header className="shrink-0 flex items-start gap-3 px-4 py-4 border-b border-gray-100">
          <div className="min-w-0 flex-1">
            <h2
              id="fg-serving-panel-title"
              className="text-lg font-semibold text-gray-900 leading-tight uppercase tracking-tight"
            >
              {node.title}
            </h2>
            <p className="text-xs text-gray-400 mt-1 uppercase tracking-wide">{node.subtitle}</p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-800 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-400"
          >
            <X size={20} />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-4 py-4">{renderBody()}</div>
      </aside>
    </>
  );
}
