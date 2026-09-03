import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

const SAMPLE_JSON =
  '{"format":"parquet","compression":"snappy","schema_version":1}';

export function FgServingTestRunDrawer({
  open,
  onClose,
  fgName,
}: {
  open: boolean;
  onClose: () => void;
  fgName: string;
}) {
  const [fileFormat, setFileFormat] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [filePwd, setFilePwd] = useState("");
  const [requestSource, setRequestSource] = useState("");
  const [meta, setMeta] = useState("");
  const [running, setRunning] = useState(false);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setRunning(false);
    const t = requestAnimationFrame(() => closeBtnRef.current?.focus());
    return () => cancelAnimationFrame(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  function fillByJson() {
    setFileFormat(SAMPLE_JSON);
  }

  function startRun() {
    setRunning(true);
    window.setTimeout(() => {
      setRunning(false);
      onClose();
    }, 900);
  }

  if (!open) return null;

  const fieldClass =
    "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-teal-400 bg-white text-gray-800";

  return (
    <div className="fixed inset-0 z-[160] flex justify-end" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-black/30 border-0 cursor-default"
        aria-label="Close test run drawer"
        onClick={onClose}
      />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Test run for ${fgName}`}
        className="relative w-full max-w-md h-full bg-white shadow-2xl border-l border-gray-200 flex flex-col"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
          <h2 className="text-sm font-semibold text-gray-800">Test Run</h2>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close test run drawer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <div>
            <div className="flex items-center justify-between gap-2 mb-1">
              <label htmlFor="fg-tr-file-format" className="text-xs font-medium text-gray-600">
                file_format
              </label>
              <button
                type="button"
                onClick={fillByJson}
                className="text-xs text-teal-600 hover:text-teal-700 font-medium"
              >
                Fill by JSON
              </button>
            </div>
            <textarea
              id="fg-tr-file-format"
              value={fileFormat}
              onChange={(e) => setFileFormat(e.target.value)}
              rows={3}
              className={`${fieldClass} font-mono text-xs resize-y min-h-[72px]`}
              placeholder='{"format":"parquet"}'
            />
          </div>

          <div>
            <label htmlFor="fg-tr-file-url" className="block text-xs font-medium text-gray-600 mb-1">
              file_url
            </label>
            <input
              id="fg-tr-file-url"
              type="text"
              value={fileUrl}
              onChange={(e) => setFileUrl(e.target.value)}
              className={fieldClass}
              placeholder="s3://bucket/path/..."
            />
          </div>

          <div>
            <label htmlFor="fg-tr-file-pwd" className="block text-xs font-medium text-gray-600 mb-1">
              file_pwd
            </label>
            <input
              id="fg-tr-file-pwd"
              type="password"
              value={filePwd}
              onChange={(e) => setFilePwd(e.target.value)}
              className={fieldClass}
              placeholder="Optional"
              autoComplete="new-password"
            />
          </div>

          <div>
            <label htmlFor="fg-tr-req-src" className="block text-xs font-medium text-gray-600 mb-1">
              request_source
            </label>
            <input
              id="fg-tr-req-src"
              type="text"
              value={requestSource}
              onChange={(e) => setRequestSource(e.target.value)}
              className={fieldClass}
              placeholder="e.g. batch_job"
            />
          </div>

          <div>
            <label htmlFor="fg-tr-meta" className="block text-xs font-medium text-gray-600 mb-1">
              meta
            </label>
            <textarea
              id="fg-tr-meta"
              value={meta}
              onChange={(e) => setMeta(e.target.value)}
              rows={4}
              className={`${fieldClass} font-mono text-xs resize-y`}
              placeholder="Additional metadata (multi-line)"
            />
          </div>

          <p className="text-xs text-gray-400" role="status" aria-live="polite">
            Mock test run: submit to simulate a serving validation request.
          </p>
        </div>

        <div className="px-4 py-3 border-t border-gray-100 shrink-0">
          <button
            type="button"
            disabled={running}
            onClick={startRun}
            className="w-full py-3 rounded-xl bg-teal-500 text-white text-sm font-semibold hover:bg-teal-600 disabled:opacity-60 min-h-[44px]"
          >
            {running ? "Starting…" : "Start Run"}
          </button>
        </div>
      </aside>
    </div>
  );
}
