import { Code2, Database, Flag, GitBranch, Home } from "lucide-react";
import type { FgServingNodeDef, FgServingNodeKind } from "@/data/fgServingCanvasModel";

const KIND_STYLES: Record<
  FgServingNodeKind,
  { accent: string; iconBg: string; iconColor: string }
> = {
  start: {
    accent: "border-l-emerald-500",
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
  },
  feature_source: {
    accent: "border-l-sky-500",
    iconBg: "bg-sky-50",
    iconColor: "text-sky-600",
  },
  transformation: {
    accent: "border-l-violet-500",
    iconBg: "bg-violet-50",
    iconColor: "text-violet-600",
  },
  compute: {
    accent: "border-l-amber-500",
    iconBg: "bg-amber-50",
    iconColor: "text-amber-700",
  },
  end: {
    accent: "border-l-slate-500",
    iconBg: "bg-slate-100",
    iconColor: "text-slate-600",
  },
};

function KindIcon({ kind }: { kind: FgServingNodeKind }) {
  const cls = "shrink-0";
  switch (kind) {
    case "start":
      return <Home size={14} className={cls} />;
    case "feature_source":
      return <Database size={14} className={cls} />;
    case "transformation":
      return <GitBranch size={14} className={cls} />;
    case "compute":
      return <Code2 size={14} className={cls} />;
    case "end":
      return <Flag size={14} className={cls} />;
  }
}

export function FgServingNodeCard({
  node,
  selected,
  readOnly,
  onDragStart,
  onClick,
}: {
  node: FgServingNodeDef;
  selected: boolean;
  readOnly: boolean;
  onDragStart: (e: React.MouseEvent) => void;
  onClick: () => void;
}) {
  const ts = KIND_STYLES[node.kind];
  return (
    <div
      className={`absolute bg-white rounded-xl border border-gray-200 border-l-4
        ${ts.accent}
        ${selected ? "ring-2 ring-teal-400 ring-offset-2 shadow-xl z-10" : "shadow-sm hover:shadow-md z-0"}
        ${readOnly ? "" : "cursor-grab active:cursor-grabbing"}`}
      style={{
        left: node.x,
        top: node.y,
        width: node.w,
        height: node.h,
        userSelect: "none",
      }}
      onMouseDown={onDragStart}
      onClick={onClick}
    >
      <div className="flex items-center h-full px-3 gap-2.5">
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${ts.iconBg} ${ts.iconColor}`}
        >
          <KindIcon kind={node.kind} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs text-gray-800 truncate leading-snug font-medium">
            {node.title}
          </div>
          <div className="text-[11px] text-gray-400 mt-0.5 truncate">
            {node.subtitle}
          </div>
        </div>
      </div>
    </div>
  );
}
