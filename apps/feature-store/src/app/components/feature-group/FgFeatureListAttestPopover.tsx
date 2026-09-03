/** Inline Consistency Attest Popover (v2).
 *  See docs/design/30-feature-group/v2-spec.md §3.3 + feature-group-interaction-spec.md §6.4.
 */
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export type ConsistencyStatus = "pending" | "attested" | "drift_detected" | "na";

export interface AttestSubmission {
  status: "attested" | "drift_detected";
  equivalenceNote: string;
  attestedBy: string;
  attestedAt: string; // YYYY-MM-DD HH:mm:ss UTC+8
}

interface Props {
  featureName: string;
  /** Anchor element bounding rect to position popover next to. */
  anchorRect: DOMRect;
  currentUserEmail: string;
  onSubmit: (s: AttestSubmission) => void;
  onClose: () => void;
}

export function FgFeatureListAttestPopover({
  featureName,
  anchorRect,
  currentUserEmail,
  onSubmit,
  onClose,
}: Props) {
  const [status, setStatus] = useState<"attested" | "drift_detected" | "">("");
  const [note, setNote] = useState("");
  const [showStatusErr, setShowStatusErr] = useState(false);
  const [showNoteErr, setShowNoteErr] = useState(false);
  const noteRef = useRef<HTMLTextAreaElement>(null);

  // Close on Esc
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleSubmit = () => {
    let ok = true;
    if (!status) {
      setShowStatusErr(true);
      ok = false;
    }
    if (note.trim().length < 10) {
      setShowNoteErr(true);
      ok = false;
    }
    if (!ok) return;
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const ts = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    onSubmit({
      status: status as "attested" | "drift_detected",
      equivalenceNote: note.trim(),
      attestedBy: currentUserEmail,
      attestedAt: ts,
    });
  };

  const top = Math.min(anchorRect.bottom + 8, window.innerHeight - 380);
  const left = Math.min(anchorRect.left, window.innerWidth - 340);

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[9998]"
        onClick={onClose}
        style={{ background: "transparent" }}
      />
      <div
        className="fixed z-[9999] w-[320px] bg-white rounded-xl shadow-2xl border border-gray-200"
        style={{ top, left }}
        role="dialog"
        aria-label={`Consistency attestation for ${featureName}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-4 py-3 border-b border-gray-100">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-teal-600 font-semibold">
              Consistency Attestation
            </div>
            <div className="text-xs text-gray-700 font-mono truncate" title={featureName}>
              {featureName}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100"
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="px-4 py-3 space-y-3">
          {/* Status */}
          <div>
            <div className="text-[11px] font-medium text-gray-600 mb-1.5">
              Status <span className="text-red-500">*</span>
            </div>
            <div className="space-y-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-700">
                <input
                  type="radio"
                  name="status"
                  checked={status === "attested"}
                  onChange={() => { setStatus("attested"); setShowStatusErr(false); }}
                  className="accent-teal-500"
                />
                <span>Attested ✓</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-700">
                <input
                  type="radio"
                  name="status"
                  checked={status === "drift_detected"}
                  onChange={() => { setStatus("drift_detected"); setShowStatusErr(false); }}
                  className="accent-red-500"
                />
                <span>Drift Detected ✗</span>
              </label>
            </div>
            {showStatusErr && <div className="text-[10px] text-red-500 mt-1">Choose a status.</div>}
          </div>

          {/* Note */}
          <div>
            <div className="text-[11px] font-medium text-gray-600 mb-1.5">
              Equivalence Note <span className="text-red-500">*</span>
              <span className="text-[10px] text-gray-400 ml-1">(min 10 chars)</span>
            </div>
            <textarea
              ref={noteRef}
              value={note}
              onChange={(e) => { setNote(e.target.value); setShowNoteErr(false); }}
              rows={3}
              placeholder='e.g. "30d 滑窗 SUM(credit_amount), UTC+8 日期对齐"'
              className={`w-full text-xs px-2 py-1.5 border rounded focus:outline-none focus:border-teal-400 ${
                showNoteErr ? "border-red-300" : "border-gray-200"
              }`}
            />
            {showNoteErr && (
              <div className="text-[10px] text-red-500 mt-1">
                Note must be at least 10 characters.
              </div>
            )}
          </div>

          {/* Auto fields */}
          <div className="text-[10px] text-gray-400 leading-relaxed">
            Attested by: <span className="text-gray-600 font-mono">{currentUserEmail}</span> (auto)
            <br />
            Will be timestamped on submit.
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-2.5 border-t border-gray-100 bg-gray-50/50 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-3 py-1 text-xs text-gray-600 hover:text-gray-800 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-3 py-1 text-xs text-white bg-teal-500 rounded hover:bg-teal-600 transition"
          >
            Submit
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}

export const CONSISTENCY_BADGE: Record<
  ConsistencyStatus,
  { label: string; cls: string }
> = {
  pending: { label: "Pending", cls: "bg-gray-100 text-gray-600 border-gray-200" },
  attested: { label: "Attested ✓", cls: "bg-teal-50 text-teal-700 border-teal-200" },
  drift_detected: { label: "Drift ✗", cls: "bg-red-50 text-red-700 border-red-200" },
  na: { label: "—", cls: "bg-transparent text-gray-300 border-transparent" },
};
