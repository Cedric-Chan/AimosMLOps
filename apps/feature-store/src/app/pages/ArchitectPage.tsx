import { useState } from "react";
import { Box, GitBranch } from "lucide-react";

export function ArchitectPage() {
  const [tab, setTab] = useState<"arch" | "dataflow">("arch");

  return (
    <div className="h-full flex flex-col">
      <header className="bg-white border-b border-gray-100 px-6 py-3 flex items-center gap-3 shadow-sm flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-teal-500 flex items-center justify-center shadow-sm">
            <Box size={14} className="text-white" />
          </div>
          <div>
            <h1 className="text-gray-800 leading-tight" style={{ fontSize: "15px", fontWeight: 600 }}>
              FeatureStore Architect
            </h1>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
          <button
            onClick={() => setTab("arch")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              tab === "arch" ? "bg-white text-teal-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Architecture
          </button>
          <button
            onClick={() => setTab("dataflow")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1 ${
              tab === "dataflow" ? "bg-white text-teal-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <GitBranch className="w-3 h-3" />
            Data Flow
          </button>
        </div>
      </header>

      <div className="flex-1 min-h-0 bg-[#f0f2f5]">
        {tab === "arch" ? (
          <iframe
            src="/architecture/featurestore-arch.html"
            className="w-full h-full border-0"
            title="FeatureStore Architecture Diagram"
            sandbox="allow-scripts allow-same-origin"
          />
        ) : (
          <iframe
            src="/architecture/featurestore-dataflow.html"
            className="w-full h-full border-0"
            title="FeatureStore Data Flow Diagram"
            sandbox="allow-scripts allow-same-origin"
          />
        )}
      </div>
    </div>
  );
}
