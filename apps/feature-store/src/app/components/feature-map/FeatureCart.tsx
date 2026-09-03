import React, { useState, useEffect } from "react";
import { ShoppingCart, X, Zap, BookOpen } from "lucide-react";
import { Feature } from "./types";

interface FeatureCartProps {
  selectedFeatures: Feature[];
  onRemove: (id: string) => void;
  onClear: () => void;
}

export function FeatureCart({ selectedFeatures, onRemove, onClear }: FeatureCartProps) {
  const [open, setOpen] = useState(false);
  const count = selectedFeatures.length;
  const hasItems = count > 0;

  useEffect(() => {
    if (!open || !hasItems) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [open, hasItems]);

  return (
    <div className="relative">
      {/* Cart Button */}
      <button
        onClick={() => hasItems && setOpen(!open)}
        className={`relative flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-all ${
          hasItems
            ? "border-[#13c2c2] text-[#13c2c2] hover:bg-[#13c2c2]/5 cursor-pointer shadow-sm"
            : "border-gray-200 text-gray-400 cursor-not-allowed bg-gray-50"
        }`}
        title={hasItems ? "Feature Cart" : "Select features to add to cart"}
      >
        <ShoppingCart size={15} className={hasItems ? "text-[#13c2c2]" : "text-gray-400"} />
        <span>Feature Cart</span>
        {/* Badge */}
        <span
          className={`absolute -top-2 -right-2 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-xs font-medium transition-all px-1 ${
            hasItems
              ? "bg-red-500 text-white shadow-sm"
              : "bg-gray-300 text-white"
          }`}
        >
          {count}
        </span>
      </button>

      {/* Dropdown Panel */}
      {open && hasItems && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-20"
            onClick={() => setOpen(false)}
          />

          <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl border border-gray-100 shadow-xl z-30 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center gap-2">
                <ShoppingCart size={14} className="text-[#13c2c2]" />
                <span className="text-sm font-medium text-gray-700">
                  Feature Cart
                </span>
                <span className="px-1.5 py-0.5 bg-[#13c2c2]/10 text-[#13c2c2] text-xs rounded-full font-medium">
                  {count}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={onClear}
                  className="text-xs text-gray-400 hover:text-red-500 px-2 py-1 rounded transition-colors"
                >
                  Clear all
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded transition-colors"
                >
                  <X size={13} />
                </button>
              </div>
            </div>

            {/* Feature List */}
            <div className="max-h-64 overflow-y-auto divide-y divide-gray-50 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-white [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-gray-300">
              {selectedFeatures.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 group transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-700 truncate">{f.name}</p>
                    <p className="text-xs text-gray-400 truncate">{f.module} · {f.featureGroup}</p>
                  </div>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 shrink-0">
                    {f.region}
                  </span>
                  <button
                    onClick={() => onRemove(f.id)}
                    className="text-gray-300 hover:text-red-400 transition-colors shrink-0 opacity-0 group-hover:opacity-100"
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50 grid grid-cols-2 gap-2">
              <button className="flex items-center justify-center gap-1.5 px-3 py-2 bg-[#13c2c2] hover:bg-[#0fb0b0] text-white text-xs rounded-lg transition-colors">
                <BookOpen size={12} />
                Training Workflow
              </button>
              <button className="flex items-center justify-center gap-1.5 px-3 py-2 border border-[#13c2c2] text-[#13c2c2] hover:bg-[#13c2c2]/5 text-xs rounded-lg transition-colors">
                <Zap size={12} />
                Serving Workflow
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}