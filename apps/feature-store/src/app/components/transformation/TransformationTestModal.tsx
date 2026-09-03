import { useState, useEffect } from "react";
import {
  Search,
  RotateCcw,
  ChevronDown,
  X,
  FlaskConical,
  Play,
  Code2,
  CheckCircle2,
  XCircle,
  Copy,
} from "lucide-react";
import type { TransformationVersionRow } from "./transformationData";
import { MOCK_TF_TEST_HISTORY, type TfTestHistoryRecord } from "./transformationData";

interface TransformationTestModalProps {
  open: boolean;
  row: TransformationVersionRow | null;
  onClose: () => void;
  /** Fired when mock run completes successfully (enables AI Review on detail form only when wired). */
  onTestSuccess?: () => void;
}

export function TransformationTestModal({
  open,
  row,
  onClose,
  onTestSuccess,
}: TransformationTestModalProps) {
  const [tab, setTab] = useState<"new" | "history">("new");
  const [testRegion, setTestRegion] = useState("");
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [outputValues, setOutputValues] = useState<Record<string, string>>({});
  const [duration, setDuration] = useState<number | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [showJsonEditor, setShowJsonEditor] = useState(false);
  const [jsonPaste, setJsonPaste] = useState("");
  const [hRegion, setHRegion] = useState("");
  const [hOperator, setHOperator] = useState("");
  const [hStatus, setHStatus] = useState<"" | "Success" | "Failed">("");
  const [applied, setApplied] = useState({
    region: "",
    operator: "",
    status: "" as "" | "Success" | "Failed",
  });
  const [detailRecord, setDetailRecord] = useState<TfTestHistoryRecord | null>(null);
  const [copiedInput, setCopiedInput] = useState(false);
  const [copiedOutput, setCopiedOutput] = useState(false);

  useEffect(() => {
    if (open) {
      setTab("new");
      setTestRegion("");
      setInputValues({});
      setOutputValues({});
      setDuration(null);
      setIsTesting(false);
      setShowJsonEditor(false);
      setJsonPaste("");
      setHRegion("");
      setHOperator("");
      setHStatus("");
      setApplied({ region: "", operator: "", status: "" });
      setDetailRecord(null);
    }
  }, [open, row?.id]);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !detailRecord && !showJsonEditor) onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose, detailRecord, showJsonEditor]);

  if (!open || !row) return null;

  const inputParams = row.inputParams ?? [];
  const outputParams = row.outputParams ?? [];

  const handleRegionChange = (r: string) => {
    setTestRegion(r);
    setInputValues({});
    setOutputValues({});
    setDuration(null);
  };

  const handleApplyJson = () => {
    try {
      const parsed = JSON.parse(jsonPaste);
      if (typeof parsed === "object" && parsed !== null) {
        const vals: Record<string, string> = {};
        Object.entries(parsed).forEach(([k, v]) => {
          vals[k] = String(v);
        });
        setInputValues((prev) => ({ ...prev, ...vals }));
      }
      setShowJsonEditor(false);
      setJsonPaste("");
    } catch {
      /* ignore */
    }
  };

  const handleTest = () => {
    if (!testRegion) return;
    setIsTesting(true);
    setOutputValues({});
    setDuration(null);
    const ms = 120 + Math.floor(Math.random() * 380);
    setTimeout(() => {
      const out: Record<string, string> = {};
      outputParams.forEach((p) => {
        out[p.name] =
          p.dataType.toLowerCase() === "int" || p.dataType.toLowerCase() === "long"
            ? String(Math.floor(Math.random() * 100))
            : `mock_${p.name}`;
      });
      setOutputValues(out);
      setDuration(ms);
      setIsTesting(false);
      onTestSuccess?.();
    }, ms);
  };

  const rawHistory = MOCK_TF_TEST_HISTORY[row.id] ?? [];
  const displayHistory = rawHistory.filter((r) => {
    if (applied.region && r.region !== applied.region) return false;
    if (applied.operator && !r.operator.includes(applied.operator)) return false;
    if (applied.status && r.status !== applied.status) return false;
    return true;
  });

  const handleQuery = () =>
    setApplied({ region: hRegion, operator: hOperator, status: hStatus });
  const handleHistReset = () => {
    setHRegion("");
    setHOperator("");
    setHStatus("");
    setApplied({ region: "", operator: "", status: "" });
  };

  const handleLoadRecord = (rec: TfTestHistoryRecord) => {
    setTestRegion(rec.region);
    setInputValues(rec.input);
    setOutputValues({});
    setDuration(null);
    setTab("new");
  };

  const inBase =
    "w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all bg-white text-slate-700 placeholder:text-slate-300";
  const selBase =
    "w-full appearance-none px-3 py-1.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all bg-white text-slate-700";

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-4xl mx-4 max-h-[88vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0 bg-gradient-to-r from-white to-teal-50/30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center shadow-sm shadow-teal-200">
              <FlaskConical className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-slate-800 text-sm font-semibold">
              {row.name} {row.version} Transformation Test
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex border-b border-slate-100 px-6 flex-shrink-0">
          {(["new", "history"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`relative px-1 py-3 mr-7 text-sm transition-colors ${
                tab === t ? "text-teal-600" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {t === "new" ? "New Test" : "History"}
              {tab === t && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-500 rounded-full" />
              )}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          {tab === "new" && (
            <div className="flex-1 overflow-hidden flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <label className="text-sm text-slate-600 whitespace-nowrap flex-shrink-0">
                    <span className="text-red-400 mr-0.5">*</span>Region:
                  </label>
                  <div className="relative w-64">
                    <select
                      value={testRegion}
                      onChange={(e) => handleRegionChange(e.target.value)}
                      className={selBase}
                    >
                      <option value="">Please select</option>
                      {row.regions.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowJsonEditor(true)}
                    className="ml-auto flex items-center gap-1.5 px-4 py-1.5 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all"
                  >
                    <Code2 className="w-3.5 h-3.5" />
                    Set Input Params By JSON
                  </button>
                </div>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="px-5 pt-3 pb-2">
                    <p className="text-xs text-slate-500 mb-2">Input Params:</p>
                    {inputParams.length > 0 ? (
                      <table className="w-full">
                        <thead>
                          <tr>
                            {["Name", "Type", "Value"].map((h) => (
                              <th
                                key={h}
                                className="text-left text-xs text-slate-600 pb-2 pr-4 font-medium"
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {inputParams.map((p) => (
                            <tr key={p.name}>
                              <td className="py-2.5 pr-4 text-xs text-slate-700 whitespace-nowrap w-44">
                                {p.name}
                              </td>
                              <td className="py-2.5 pr-4 text-xs text-emerald-600 w-24">{p.dataType}</td>
                              <td className="py-2.5">
                                <input
                                  type="text"
                                  value={inputValues[p.name] ?? ""}
                                  onChange={(e) =>
                                    setInputValues((prev) => ({
                                      ...prev,
                                      [p.name]: e.target.value,
                                    }))
                                  }
                                  className={inBase}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="text-xs text-slate-400 py-3">
                        Select a Region to load params (no inputs defined for this version).
                      </p>
                    )}
                  </div>
                  <div className="border-t border-slate-100" />
                  <div className="px-5 pt-3 pb-4">
                    <p className="text-xs text-slate-500 mb-2">Output Params:</p>
                    {outputParams.length > 0 ? (
                      <table className="w-full">
                        <thead>
                          <tr>
                            {["Name", "Type", "Value"].map((h) => (
                              <th
                                key={h}
                                className="text-left text-xs text-slate-600 pb-2 pr-4 font-medium"
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {outputParams.map((p) => (
                            <tr key={p.name}>
                              <td className="py-2.5 pr-4 text-xs text-slate-700 whitespace-nowrap w-44">
                                {p.name}
                              </td>
                              <td className="py-2.5 pr-4 text-xs text-emerald-600 w-24">{p.dataType}</td>
                              <td className="py-2.5 text-xs text-slate-600 font-mono">
                                {isTesting ? (
                                  <span className="animate-pulse">…</span>
                                ) : outputValues[p.name] ? (
                                  outputValues[p.name]
                                ) : (
                                  "—"
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="text-xs text-slate-400 py-3">No output params</p>
                    )}
                  </div>
                </div>
                <p className="text-xs text-red-500">
                  Duration: {duration !== null ? `${duration} ms` : "— ms"}
                </p>
              </div>
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/40 flex-shrink-0 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleTest}
                  disabled={!testRegion || isTesting}
                  className="flex items-center gap-2 px-6 py-2 text-sm text-white bg-teal-500 rounded-lg hover:bg-teal-600 shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Play className="w-3.5 h-3.5" />
                  {isTesting ? "Testing…" : "Test"}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={duration === null}
                  className="px-5 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  OK
                </button>
              </div>
            </div>
          )}
          {tab === "history" && (
            <div className="flex-1 overflow-hidden flex flex-col min-h-0">
              <div className="px-6 py-4 border-b border-slate-100 flex-shrink-0">
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-500 whitespace-nowrap">Region:</label>
                    <div className="relative flex-1">
                      <select
                        value={hRegion}
                        onChange={(e) => setHRegion(e.target.value)}
                        className={selBase}
                      >
                        <option value="">All</option>
                        {row.regions.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-500 whitespace-nowrap">Operator:</label>
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      <input
                        value={hOperator}
                        onChange={(e) => setHOperator(e.target.value)}
                        placeholder="Search"
                        className={`${inBase} pl-8`}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-500 whitespace-nowrap">Status:</label>
                    <div className="relative flex-1">
                      <select
                        value={hStatus}
                        onChange={(e) =>
                          setHStatus(e.target.value as "" | "Success" | "Failed")
                        }
                        className={selBase}
                      >
                        <option value="">All</option>
                        <option value="Success">Success</option>
                        <option value="Failed">Failed</option>
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-3">
                  <button
                    type="button"
                    onClick={handleHistReset}
                    className="flex items-center gap-1.5 px-4 py-1.5 text-xs text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={handleQuery}
                    className="flex items-center gap-1.5 px-4 py-1.5 text-xs text-white bg-teal-500 rounded-lg hover:bg-teal-600 transition-all"
                  >
                    <Search className="w-3 h-3" />
                    Query
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-slate-50 z-10">
                    <tr>
                      {["Region", "CreateTime", "Operator", "Status", "Action"].map((h) => (
                        <th
                          key={h}
                          className="px-5 py-3 text-left text-xs text-slate-500 whitespace-nowrap border-b border-slate-200"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {displayHistory.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-8 text-center text-xs text-slate-400">
                          No records found
                        </td>
                      </tr>
                    ) : (
                      displayHistory.map((rec, i) => (
                        <tr
                          key={rec.id}
                          className={`${i % 2 === 0 ? "bg-white" : "bg-slate-50/50"} hover:bg-teal-50/30 transition-colors`}
                        >
                          <td className="px-5 py-3 text-xs whitespace-nowrap">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600 border border-slate-200 font-mono">
                              {rec.region}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-xs text-slate-500 whitespace-nowrap">
                            {rec.createTime}
                          </td>
                          <td className="px-5 py-3 text-xs text-slate-600 max-w-[180px] truncate">
                            {rec.operator}
                          </td>
                          <td className="px-5 py-3">
                            {rec.status === "Success" ? (
                              <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Success
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs text-red-500">
                                <XCircle className="w-3.5 h-3.5" />
                                Failed
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => setDetailRecord(rec)}
                                className="text-xs text-teal-600 hover:text-teal-800 hover:underline transition-colors"
                              >
                                Detail
                              </button>
                              <button
                                type="button"
                                onClick={() => handleLoadRecord(rec)}
                                className="text-xs text-slate-500 hover:text-slate-700 hover:underline transition-colors"
                              >
                                Load
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {showJsonEditor && (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center bg-black/25 rounded-2xl"
            onClick={() => setShowJsonEditor(false)}
          >
            <div
              className="bg-white rounded-xl shadow-xl border border-slate-200 w-96 p-5 space-y-3"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-sm text-slate-800">Set Input Params By JSON</h3>
              <textarea
                rows={8}
                value={jsonPaste}
                onChange={(e) => setJsonPaste(e.target.value)}
                placeholder={'{\n  "scenario_id": "s1"\n}'}
                className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 resize-none"
                spellCheck={false}
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowJsonEditor(false);
                    setJsonPaste("");
                  }}
                  className="px-3 py-1.5 text-xs text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyJson}
                  className="px-4 py-1.5 text-xs text-white bg-teal-500 rounded-lg hover:bg-teal-600 transition-all"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        )}

        {detailRecord && (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center bg-black/25 rounded-2xl"
            onClick={() => setDetailRecord(null)}
          >
            <div
              className="bg-white rounded-xl shadow-xl border border-slate-100 w-[500px] max-h-[76vh] flex flex-col overflow-hidden mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <h3 className="text-slate-800">Test Details</h3>
                <button
                  type="button"
                  onClick={() => setDetailRecord(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-teal-600">Input:</span>
                    <button
                      type="button"
                      onClick={() => {
                        void navigator.clipboard.writeText(
                          JSON.stringify(detailRecord.input, null, 2)
                        );
                        setCopiedInput(true);
                        setTimeout(() => setCopiedInput(false), 2000);
                      }}
                      className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      {copiedInput ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <pre className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs font-mono text-slate-700 whitespace-pre overflow-x-auto max-h-56">
                    {JSON.stringify(detailRecord.input, null, 2)}
                  </pre>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-emerald-600">Output:</span>
                    <button
                      type="button"
                      onClick={() => {
                        void navigator.clipboard.writeText(
                          JSON.stringify(detailRecord.output, null, 2)
                        );
                        setCopiedOutput(true);
                        setTimeout(() => setCopiedOutput(false), 2000);
                      }}
                      className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      {copiedOutput ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <pre className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs font-mono text-slate-700 whitespace-pre overflow-x-auto max-h-56">
                    {Object.keys(detailRecord.output).length > 0
                      ? JSON.stringify(detailRecord.output, null, 2)
                      : "{}"}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
