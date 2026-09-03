import type { FgServingNodeDef, FgServingNodeId } from "@/data/fgServingCanvasModel";

const EDGE_GRAY = "#94a3b8";

export function FgServingCanvasEdges({
  nodes,
  edges,
  canvasW,
  canvasH,
}: {
  nodes: FgServingNodeDef[];
  edges: [FgServingNodeId, FgServingNodeId][];
  canvasW: number;
  canvasH: number;
}) {
  const nodeMap = Object.fromEntries(nodes.map((n) => [n.id, n])) as Record<
    string,
    FgServingNodeDef
  >;

  return (
    <svg
      width={canvasW}
      height={canvasH}
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        overflow: "visible",
      }}
    >
      <defs>
        <marker
          id="fg-serving-arr"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="5"
          markerHeight="5"
          orient="auto"
        >
          <path d="M0,1.5 L8,5 L0,8.5 L2.5,5 Z" fill={EDGE_GRAY} />
        </marker>
      </defs>
      {edges.map(([fId, tId]) => {
        const f = nodeMap[fId];
        const t = nodeMap[tId];
        if (!f || !t) return null;
        const x1 = f.x + f.w;
        const y1 = f.y + f.h / 2;
        const x2 = t.x;
        const y2 = t.y + t.h / 2;
        const mx = (x1 + x2) / 2;
        return (
          <path
            key={`${fId}-${tId}`}
            d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`}
            fill="none"
            stroke={EDGE_GRAY}
            strokeWidth="1.5"
            markerEnd="url(#fg-serving-arr)"
          />
        );
      })}
    </svg>
  );
}
