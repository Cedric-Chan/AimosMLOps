import {
  FG_SERVING_CANVAS_H,
  FG_SERVING_CANVAS_W,
  type FgServingCanvasState,
  type FgServingNodeDef,
} from "@/data/fgServingCanvasModel";

const KIND_COLOR: Record<FgServingNodeDef["kind"], string> = {
  start: "#10b981",
  feature_source: "#0ea5e9",
  transformation: "#8b5cf6",
  compute: "#d97706",
  end: "#f97316",
};

const DEFAULT_W = 200;

/**
 * Static scaled preview of the Serving DAG for the FG detail card.
 */
export function FgServingCanvasThumbnail({
  state,
  width = DEFAULT_W,
  className = "",
}: {
  state: FgServingCanvasState;
  width?: number;
  className?: string;
}) {
  const h = Math.round((FG_SERVING_CANVAS_H / FG_SERVING_CANVAS_W) * width);
  const sx = width / FG_SERVING_CANVAS_W;
  const sy = h / FG_SERVING_CANVAS_H;
  const { nodes, edges } = state;

  return (
    <div
      className={`rounded-lg border border-gray-200 bg-slate-50 overflow-hidden ${className}`}
    >
      <svg
        width={width}
        height={h}
        role="img"
        aria-label="Serving config canvas thumbnail"
        className="block"
      >
        <rect width={width} height={h} fill="#f8fafc" />
        {edges.map(([fId, tId]) => {
          const f = nodes.find((n) => n.id === fId);
          const t = nodes.find((n) => n.id === tId);
          if (!f || !t) return null;
          const x1 = (f.x + f.w) * sx;
          const y1 = (f.y + f.h / 2) * sy;
          const x2 = t.x * sx;
          const y2 = (t.y + t.h / 2) * sy;
          return (
            <path
              key={`${fId}-${tId}`}
              d={`M${x1},${y1} C${(x1 + x2) / 2},${y1} ${(x1 + x2) / 2},${y2} ${x2},${y2}`}
              fill="none"
              stroke="#cbd5e1"
              strokeWidth="1"
            />
          );
        })}
        {nodes.map((n) => (
          <rect
            key={n.id}
            x={n.x * sx}
            y={n.y * sy}
            width={Math.max(n.w * sx, 4)}
            height={Math.max(n.h * sy, 4)}
            rx="3"
            fill={KIND_COLOR[n.kind]}
            opacity={0.82}
          />
        ))}
      </svg>
    </div>
  );
}
