import type { FgServingNodeDef, FgServingNodeId } from "@/data/fgServingCanvasModel";

const MM_W = 132;
const MM_H = 78;

const KIND_COLOR: Record<FgServingNodeDef["kind"], string> = {
  start: "#10b981",
  feature_source: "#0ea5e9",
  transformation: "#8b5cf6",
  compute: "#d97706",
  end: "#64748b",
};

export function FgServingMinimap({
  nodes,
  edges,
  canvasW,
  canvasH,
  pan,
  zoom,
  cw,
  ch,
}: {
  nodes: FgServingNodeDef[];
  edges: [FgServingNodeId, FgServingNodeId][];
  canvasW: number;
  canvasH: number;
  pan: { x: number; y: number };
  zoom: number;
  cw: number;
  ch: number;
}) {
  const mmSX = MM_W / canvasW;
  const mmSY = MM_H / canvasH;
  const vpX = -pan.x / zoom;
  const vpY = -pan.y / zoom;
  const vpW = cw / zoom;
  const vpH = ch / zoom;
  const rx = vpX * mmSX;
  const ry = vpY * mmSY;
  const rw = Math.max(8, vpW * mmSX);
  const rh = Math.max(8, vpH * mmSY);

  return (
    <div
      className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm"
      style={{ padding: 8 }}
    >
      <div className="text-gray-400 mb-1.5 tracking-wide" style={{ fontSize: 10 }}>
        OVERVIEW
      </div>
      <svg width={MM_W} height={MM_H} style={{ display: "block" }}>
        <rect width={MM_W} height={MM_H} fill="#f8fafc" rx="4" />
        {edges.map(([fId, tId]) => {
          const f = nodes.find((n) => n.id === fId);
          const t = nodes.find((n) => n.id === tId);
          if (!f || !t) return null;
          const x1 = (f.x + f.w) * mmSX;
          const y1 = (f.y + f.h / 2) * mmSY;
          const x2 = t.x * mmSX;
          const y2 = (t.y + t.h / 2) * mmSY;
          return (
            <path
              key={`${fId}-${tId}`}
              d={`M${x1},${y1} C${(x1 + x2) / 2},${y1} ${(x1 + x2) / 2},${y2} ${x2},${y2}`}
              fill="none"
              stroke="#cbd5e1"
              strokeWidth="0.8"
            />
          );
        })}
        {nodes.map((n) => (
          <rect
            key={n.id}
            x={n.x * mmSX}
            y={n.y * mmSY}
            width={Math.max(n.w * mmSX, 3)}
            height={Math.max(n.h * mmSY, 3)}
            rx="2"
            fill={KIND_COLOR[n.kind]}
            opacity="0.75"
          />
        ))}
        <rect
          x={rx}
          y={ry}
          width={rw}
          height={rh}
          fill="rgba(99,102,241,0.08)"
          stroke="#6366f1"
          strokeWidth="1"
          rx="2"
        />
      </svg>
    </div>
  );
}
