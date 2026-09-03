import { useState, useEffect } from "react";
import { X, Zap } from "lucide-react";

interface Props {
  onClose: () => void;
  onTrigger: (notes: string) => void;
}

export function TriggerInstanceModal({ onClose, onTrigger }: Props) {
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 bg-teal-50 rounded-lg">
              <Zap size={15} className="text-teal-600" />
            </div>
            <div>
              <h2 className="text-gray-800">Trigger Instance</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Each trigger runs a full pipeline execution.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
            title="Close (ESC)"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-600">
              Instance Notes
              <span className="ml-1.5 text-gray-400">(optional)</span>
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Weekly scheduled run / hotfix rerun..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none transition-all resize-none placeholder:text-gray-300 focus:border-teal-400 focus:ring-2 focus:ring-teal-50"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50/60">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all"
          >
            Cancel
          </button>
          <button
            onClick={() => onTrigger(notes)}
            className="flex items-center gap-2 px-5 py-2 text-sm text-white bg-teal-500 rounded-lg hover:bg-teal-600 active:bg-teal-700 transition-all shadow-sm shadow-teal-200"
          >
            <Zap size={13} />
            Trigger
          </button>
        </div>
      </div>
    </div>
  );
}
