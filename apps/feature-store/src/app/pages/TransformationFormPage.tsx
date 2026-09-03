import { useState, useMemo, useEffect, type ReactNode } from "react";
import { useNavigate, useParams, useSearchParams, useLocation } from "react-router";
import { ArrowLeft, ChevronRight, Maximize2, X } from "lucide-react";
import { ParamRowEditor } from "@/app/components/shared/ParamRowEditor";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/app/components/ui/collapsible";
import { Popover, PopoverContent, PopoverTrigger } from "@/app/components/ui/popover";
import { Checkbox } from "@/app/components/ui/checkbox";
import {
  INITIAL_TRANSFORMATION_ROWS,
  TF_FILTER_REGIONS,
} from "@/app/components/transformation/transformationData";
import type {
  TransformationVersionRow,
  TfParam,
} from "@/app/components/transformation/transformationData";
import { TransformationTestModal } from "@/app/components/transformation/TransformationTestModal";

function nextVersionForName(name: string): string {
  const same = INITIAL_TRANSFORMATION_ROWS.filter((r) => r.name === name);
  const nums = same.map((r) => {
    const m = /^V(\d+)$/i.exec(r.version.trim());
    return m ? parseInt(m[1], 10) : 0;
  });
  const max = nums.length ? Math.max(...nums) : 0;
  return `V${max + 1}`;
}

function findRow(name: string, version: string): TransformationVersionRow | undefined {
  return INITIAL_TRANSFORMATION_ROWS.find(
    (r) => r.name === name && r.version === version
  );
}

function parseOwnersFromSource(owner: string | undefined): string[] {
  if (!owner?.trim()) return ["cedric.chencan@seamoney.com"];
  const parts = owner
    .split(/[,;]\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length ? parts : ["cedric.chencan@seamoney.com"];
}

function ownersToRowField(owners: string[]): string {
  return owners
    .map((o) => o.trim())
    .filter(Boolean)
    .join(", ");
}

const FEATURE_SOURCE_STYLE_DATA_TYPES = [
  "string",
  "int",
  "long",
  "double",
  "float",
  "boolean",
  "list",
  "map",
  "json",
];

/** Feature Source modal options plus types used in Transformation mocks */
const TF_PARAM_DATA_TYPES = Array.from(
  new Set([...FEATURE_SOURCE_STYLE_DATA_TYPES, "String", "List", "Map"])
);

const labelCol =
  "shrink-0 w-[104px] pt-2 text-sm text-slate-800 text-right pr-3 leading-5";

function HorizontalField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-row items-start gap-0 min-w-0">
      <div className={labelCol}>
        {required ? (
          <>
            <span className="text-red-500 mr-0.5">*</span>
            {label}
          </>
        ) : (
          label
        )}
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

export function TransformationFormPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { tfName: tfNameEnc, tfVersion: tfVersionEnc } = useParams<{
    tfName?: string;
    tfVersion?: string;
  }>();

  const readOnly = Boolean(
    (location.state as { readOnly?: boolean } | null)?.readOnly
  );
  const isEdit = Boolean(tfNameEnc && tfVersionEnc);
  const decodedName = tfNameEnc ? decodeURIComponent(tfNameEnc) : "";
  const decodedVersion = tfVersionEnc ? decodeURIComponent(tfVersionEnc) : "";

  const copyFrom = searchParams.get("copyFrom");
  const copyVersion = searchParams.get("copyVersion");

  const sourceRow = useMemo(() => {
    if (isEdit) return findRow(decodedName, decodedVersion);
    if (copyFrom && copyVersion) return findRow(copyFrom, copyVersion);
    return undefined;
  }, [isEdit, decodedName, decodedVersion, copyFrom, copyVersion]);

  const initialVersion = useMemo(() => {
    if (isEdit) return decodedVersion;
    if (copyFrom) return nextVersionForName(copyFrom);
    return "V1";
  }, [isEdit, decodedVersion, copyFrom]);

  const [name, setName] = useState(
    () => sourceRow?.name ?? (copyFrom ?? "")
  );
  const [type, setType] = useState(() => sourceRow?.type ?? "");
  const [owners, setOwners] = useState<string[]>(() =>
    parseOwnersFromSource(sourceRow?.owner)
  );
  const [ownerDraft, setOwnerDraft] = useState("");
  const [description, setDescription] = useState(
    () => sourceRow?.description ?? ""
  );
  const [regions, setRegions] = useState<string[]>(() => [
    ...(sourceRow?.regions ?? []),
  ]);
  const [regionPopoverOpen, setRegionPopoverOpen] = useState(false);
  const [language, setLanguage] = useState(() => sourceRow?.language ?? "Groovy");
  const [script, setScript] = useState(() => sourceRow?.script ?? "");
  const [inputParams, setInputParams] = useState<TfParam[]>(() =>
    sourceRow?.inputParams?.length ? [...sourceRow.inputParams] : []
  );
  const [outputParams, setOutputParams] = useState<TfParam[]>(() =>
    sourceRow?.outputParams?.length ? [...sourceRow.outputParams] : []
  );
  const [scriptExpanded, setScriptExpanded] = useState(false);
  const [detailTestOpen, setDetailTestOpen] = useState(false);
  const [hasPassedTest, setHasPassedTest] = useState(false);

  useEffect(() => {
    if (!scriptExpanded) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") setScriptExpanded(false);
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [scriptExpanded]);

  const ownerField = useMemo(() => ownersToRowField(owners), [owners]);

  const syntheticTestRow: TransformationVersionRow = useMemo(
    () => ({
      id: `form-${name || "new"}-${initialVersion}`,
      name: name || "new_transform",
      version: initialVersion,
      type: type || "Aggregator",
      language,
      status: "DRAFT",
      regions: regions.length ? regions : ["SG"],
      owner: ownerField || "cedric.chencan@seamoney.com",
      createTime: new Date().toISOString().slice(0, 19).replace("T", " "),
      description,
      script,
      inputParams: inputParams.length
        ? inputParams
        : [{ name: "scenario_id", dataType: "String" }],
      outputParams: outputParams.length
        ? outputParams
        : [
            { name: "indexs", dataType: "List" },
            { name: "values", dataType: "List" },
          ],
    }),
    [
      name,
      initialVersion,
      type,
      language,
      regions,
      ownerField,
      description,
      script,
      inputParams,
      outputParams,
    ]
  );

  const hasOwners = owners.some((o) => o.trim().length > 0);

  const canSubmit =
    name.trim() &&
    type &&
    description.trim() &&
    regions.length > 0 &&
    language &&
    script.trim() &&
    hasOwners;

  const canHeaderTest = canSubmit;

  const toggleRegion = (r: string) => {
    setRegions((prev) =>
      prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]
    );
  };

  const addOwner = () => {
    const next = ownerDraft.trim();
    if (!next || readOnly) return;
    if (!owners.includes(next)) setOwners((o) => [...o, next]);
    setOwnerDraft("");
  };

  const removeOwner = (index: number) => {
    setOwners((o) => o.filter((_, i) => i !== index));
  };

  const outlineHeaderBtn =
    "px-3 py-1.5 text-xs border border-gray-300 rounded-md bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed";

  const sectionCard = "border border-slate-200 rounded-lg bg-white overflow-hidden";
  const sectionTriggerClass =
    "group flex w-full items-center gap-2 px-4 py-3 rounded-t-lg bg-slate-100 border-b border-slate-200 text-left text-sm font-medium text-slate-800 hover:bg-slate-100/90 transition-colors data-[state=closed]:rounded-b-lg";

  const inputBase =
    "w-full px-3 py-2 text-sm border border-slate-200 rounded-md bg-white text-slate-800 placeholder:text-slate-400 disabled:bg-slate-50 disabled:text-slate-500";

  const regionRegionsList = TF_FILTER_REGIONS.filter(Boolean);

  return (
    <div className="min-h-full bg-[#f5f7fa] flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 shrink-0">
        <button
          type="button"
          onClick={() => navigate("/tf")}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-[15px] font-semibold text-gray-800">
          {isEdit ? "Edit Transformation" : "Add Transformation"}
        </h1>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button type="button" disabled={readOnly} className={outlineHeaderBtn}>
            Copy Settings
          </button>
          <button type="button" disabled={readOnly} className={outlineHeaderBtn}>
            Edit in Script
          </button>
          <button type="button" disabled={readOnly} className={outlineHeaderBtn}>
            Save Draft
          </button>
          <button
            type="button"
            disabled={readOnly || !canHeaderTest}
            onClick={() => setDetailTestOpen(true)}
            className="px-3 py-1.5 text-xs rounded-md bg-teal-500 text-white hover:bg-teal-600 disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed"
          >
            Test
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-5 w-full max-w-[1200px] mx-auto space-y-4 pb-24">
        <Collapsible defaultOpen className={sectionCard}>
          <CollapsibleTrigger className={sectionTriggerClass}>
            <ChevronRight className="w-4 h-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-90" />
            Basic Info
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="p-5 border-t border-slate-100 space-y-5">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-5">
                <HorizontalField label="Name">
                  <div className="flex w-full min-w-0">
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={readOnly || isEdit}
                      placeholder="Please input name"
                      className={`${inputBase} rounded-l-md rounded-r-none border-r-0 flex-1 min-w-0`}
                    />
                    <input
                      value={initialVersion}
                      disabled
                      placeholder="Input version"
                      readOnly
                      aria-readonly
                      className="w-[88px] shrink-0 px-3 py-2 text-sm border border-slate-200 rounded-r-md rounded-l-none bg-slate-50 text-slate-600 text-center font-mono"
                    />
                  </div>
                </HorizontalField>
                <HorizontalField label="Type" required>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    disabled={readOnly}
                    className={inputBase}
                  >
                    <option value="">Please select type</option>
                    <option value="Scalar">Scalar</option>
                    <option value="Aggregator">Aggregator</option>
                  </select>
                </HorizontalField>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-5">
                <HorizontalField label="Owner">
                  <div
                    className={`flex flex-wrap gap-1.5 items-center min-h-[40px] px-2 py-1.5 border border-slate-200 rounded-md bg-white ${readOnly ? "bg-slate-50" : ""}`}
                  >
                    {owners.map((o, i) => (
                      <span
                        key={`${o}-${i}`}
                        className="inline-flex items-center gap-0.5 pl-2 pr-1 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-xs text-slate-800 max-w-full"
                        title={o}
                      >
                        <span className="truncate">{o}</span>
                        {!readOnly && (
                          <button
                            type="button"
                            className="p-0.5 rounded hover:bg-slate-200 text-slate-500 shrink-0"
                            aria-label={`Remove ${o}`}
                            onClick={() => removeOwner(i)}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </span>
                    ))}
                    {!readOnly && (
                      <input
                        value={ownerDraft}
                        onChange={(e) => setOwnerDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addOwner();
                          }
                        }}
                        onBlur={addOwner}
                        placeholder="Please select owners"
                        className="flex-1 min-w-[140px] border-0 bg-transparent text-sm py-1 px-1 outline-none placeholder:text-slate-400"
                      />
                    )}
                  </div>
                </HorizontalField>
                <HorizontalField label="Description" required>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={readOnly}
                    rows={3}
                    placeholder="Please input desc"
                    className={`${inputBase} resize-y min-h-[72px]`}
                  />
                </HorizontalField>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-5">
                <HorizontalField label="Region" required>
                  <Popover
                    open={regionPopoverOpen}
                    onOpenChange={setRegionPopoverOpen}
                  >
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        disabled={readOnly}
                        className={`${inputBase} flex items-center justify-between text-left font-normal`}
                      >
                        <span
                          className={
                            regions.length ? "text-slate-800" : "text-slate-400"
                          }
                        >
                          {regions.length
                            ? regions.join(", ")
                            : "Please select regions"}
                        </span>
                        <ChevronRight className="w-4 h-4 -rotate-90 text-slate-400 shrink-0" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-3" align="start">
                      <p className="text-xs text-slate-500 mb-2">Regions</p>
                      <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                        {regionRegionsList.map((r) => (
                          <label
                            key={r}
                            className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer"
                          >
                            <Checkbox
                              checked={regions.includes(r)}
                              onCheckedChange={() => toggleRegion(r)}
                            />
                            {r}
                          </label>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </HorizontalField>
                <HorizontalField label="Language" required>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    disabled={readOnly}
                    className={inputBase}
                  >
                    <option value="Groovy">Groovy</option>
                    <option value="Python">Python</option>
                  </select>
                </HorizontalField>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Collapsible defaultOpen className={sectionCard}>
          <CollapsibleTrigger className={sectionTriggerClass}>
            <ChevronRight className="w-4 h-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-90" />
            Transformation Script
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="p-5 border-t border-slate-100">
              <div className="flex flex-col lg:flex-row gap-4 lg:gap-0 items-stretch lg:items-start min-w-0">
                <div className={`${labelCol} lg:pt-2 text-left lg:text-right`}>
                  <span className="text-red-500 mr-0.5">*</span>
                  Script:
                </div>
                <div className="flex-1 min-w-0 lg:pl-0">
                  <div className="relative border border-slate-200 rounded-md overflow-hidden bg-white min-h-[300px]">
                    <button
                      type="button"
                      className="absolute top-2 right-2 z-10 p-1.5 rounded bg-white/90 border border-slate-200 text-slate-500 hover:text-teal-600"
                      title="Expand"
                      onClick={() => setScriptExpanded(true)}
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                    <div className="flex min-h-[300px]">
                      <div className="w-12 bg-slate-50 border-r border-slate-200 py-2 text-right pr-2 text-xs text-slate-400 font-mono select-none leading-[22px]">
                        {script.split("\n").map((_, i) => (
                          <div key={i} style={{ lineHeight: "22px" }}>
                            {i + 1}
                          </div>
                        ))}
                        {script.length === 0 && (
                          <div style={{ lineHeight: "22px" }}>1</div>
                        )}
                      </div>
                      <textarea
                        value={script}
                        onChange={(e) => setScript(e.target.value)}
                        disabled={readOnly}
                        spellCheck={false}
                        className="flex-1 min-h-[300px] px-3 py-2 text-sm font-mono border-0 focus:ring-0 resize-none leading-[22px]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Collapsible defaultOpen className={sectionCard}>
          <CollapsibleTrigger className={sectionTriggerClass}>
            <ChevronRight className="w-4 h-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-90" />
            Params Config
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="p-5 space-y-6 border-t border-slate-100">
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-0 items-stretch sm:items-start">
                <div className={`${labelCol} sm:pt-2 text-left sm:text-right`}>
                  Input Params
                </div>
                <div className="flex-1 min-w-0 sm:pl-0">
                  <ParamRowEditor
                    params={inputParams}
                    onChange={setInputParams}
                    disabled={readOnly}
                    dataTypeOptions={TF_PARAM_DATA_TYPES}
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 sm:gap-0 items-stretch sm:items-start">
                <div className={`${labelCol} sm:pt-2 text-left sm:text-right`}>
                  Output Params
                </div>
                <div className="flex-1 min-w-0 sm:pl-0">
                  <ParamRowEditor
                    params={outputParams}
                    onChange={setOutputParams}
                    disabled={readOnly}
                    dataTypeOptions={TF_PARAM_DATA_TYPES}
                  />
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Collapsible defaultOpen className={sectionCard}>
          <CollapsibleTrigger className={sectionTriggerClass}>
            <ChevronRight className="w-4 h-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-90" />
            Transformation Agent Review
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="p-5 border-t border-slate-100 flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={readOnly || !hasPassedTest}
                onClick={() => window.alert("AI Review (mock)")}
                className="px-4 py-2 text-sm border border-slate-300 rounded-md bg-white text-slate-700 hover:bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
              >
                AI Review
              </button>
              {!hasPassedTest ? (
                <span className="text-xs text-slate-500">
                  Please pass the Test first to enable AI Review
                </span>
              ) : (
                <span className="text-xs text-emerald-600">
                  Test passed — AI Review is available.
                </span>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      <footer className="sticky bottom-0 bg-white border-t border-slate-200 px-5 py-3 flex justify-end gap-2 shrink-0">
        <button
          type="button"
          onClick={() => navigate("/tf")}
          className="px-4 py-2 text-sm border border-slate-300 rounded-md bg-white text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={readOnly || !canSubmit}
          onClick={() => {
            window.alert("Submit (mock)");
            navigate("/tf");
          }}
          className="px-5 py-2 text-sm rounded-md bg-teal-500 text-white hover:bg-teal-600 disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed"
        >
          Submit
        </button>
      </footer>

      {scriptExpanded && (
        <div
          className="fixed inset-0 z-[90] bg-black/50 flex items-center justify-center p-4"
          onClick={() => setScriptExpanded(false)}
        >
          <div
            className="bg-white rounded-xl w-full max-w-4xl h-[80vh] flex flex-col shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center px-4 py-2 border-b">
              <span className="text-sm font-medium">Script</span>
              <button
                type="button"
                className="text-xs text-slate-500 hover:text-slate-800"
                onClick={() => setScriptExpanded(false)}
              >
                Close
              </button>
            </div>
            <textarea
              value={script}
              onChange={(e) => setScript(e.target.value)}
              disabled={readOnly}
              className="flex-1 p-4 font-mono text-sm resize-none border-0 focus:ring-0"
            />
          </div>
        </div>
      )}

      <TransformationTestModal
        open={detailTestOpen}
        row={syntheticTestRow}
        onClose={() => setDetailTestOpen(false)}
        onTestSuccess={() => setHasPassedTest(true)}
      />
    </div>
  );
}
