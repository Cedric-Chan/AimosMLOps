/**
 * Feature Group Serving canvas — DAG from Training entities + mock FS/Xfm catalogs.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import {
  ArrowLeft,
  ChevronDown,
  GitBranch,
  History,
  Play,
  Upload,
} from "lucide-react";
import { useFeatureGroups } from "@/app/feature-group/FeatureGroupsProvider";
import { ZoomControls } from "@/app/components/CanvasPage";
import { FgServingCanvasEdges } from "@/app/components/feature-group/FgServingCanvasEdges";
import { FgServingConfigPanel } from "@/app/components/feature-group/FgServingConfigPanel";
import { FgServingMinimap } from "@/app/components/feature-group/FgServingMinimap";
import { FgServingNodeCard } from "@/app/components/feature-group/FgServingNodeCard";
import { FgServingTestRunDrawer } from "@/app/components/feature-group/FgServingTestRunDrawer";
import {
  trainingFeatureNamesFromForm,
  type FgServingPublishRecord,
} from "@/app/components/feature-group/fgSeed";
import {
  cloneFgServingState,
  createInitialFgServingState,
  FG_SERVING_CANVAS_H,
  FG_SERVING_CANVAS_W,
  normalizeFgServingCanvasState,
  resolveServingNodeConfig,
  type FgServingCanvasState,
  type FgServingNodeConfig,
  type FgServingNodeDef,
  type FgServingNodeId,
} from "@/data/fgServingCanvasModel";

function isLegacyWideTableNodes(
  nodes: unknown
): nodes is { id: string }[] {
  return (
    Array.isArray(nodes) &&
    nodes.length > 0 &&
    typeof nodes[0] === "object" &&
    nodes[0] !== null &&
    "id" in nodes[0] &&
    (nodes[0] as { id: string }).id === "B"
  );
}

function resolveHistoryState(
  rec: FgServingPublishRecord,
  entitiesColumns: string[]
): FgServingCanvasState {
  if (rec.state) {
    return normalizeFgServingCanvasState(cloneFgServingState(rec.state));
  }
  if (rec.nodes && isLegacyWideTableNodes(rec.nodes)) {
    return createInitialFgServingState(entitiesColumns);
  }
  return createInitialFgServingState(entitiesColumns);
}

export default function FgServingCanvasPage() {
  const { fgId } = useParams<{ fgId: string }>();
  const navigate = useNavigate();
  const { getFg, updateFg } = useFeatureGroups();
  const fg = fgId ? getFg(fgId) : undefined;

  const entitiesColumns = fg?._formData?.entitiesColumns ?? [];

  const [viewMode, setViewMode] = useState<"current" | "history">("current");
  const [historyState, setHistoryState] = useState<FgServingCanvasState | null>(
    null
  );
  const [historyLabel, setHistoryLabel] = useState<string>("");

  const [canvasState, setCanvasState] = useState<FgServingCanvasState>(() =>
    createInitialFgServingState([])
  );

  const [selectedNodeId, setSelectedNodeId] = useState<FgServingNodeId | null>(
    null
  );
  const [zoom, setZoomState] = useState(0.88);
  const [pan, setPan] = useState({ x: 80, y: 40 });
  const zoomRef = useRef(zoom);
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  const historyRef = useRef<HTMLDivElement>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const isPanning = useRef(false);
  const panStart = useRef({ mx: 0, my: 0, px: 0, py: 0 });
  const [containerSize, setContainerSize] = useState({ w: 800, h: 500 });

  const dragState = useRef<{
    nodeId: FgServingNodeId;
    startMx: number;
    startMy: number;
    startNx: number;
    startNy: number;
  } | null>(null);
  const dragMoved = useRef(false);

  const displayState =
    viewMode === "history" && historyState ? historyState : canvasState;
  const readOnly = viewMode === "history";

  const entitiesKey = (fg?._formData?.entitiesColumns ?? []).join("\0");

  const trainingFeaturesKey = useMemo(() => {
    const cf = fg?._formData?.computeFeatures ?? [];
    const fm = fg?._formData?.featureMapping ?? {};
    return JSON.stringify({
      cf: cf.map((c) => c.name),
      fmKeys: Object.keys(fm).sort(),
    });
  }, [fg?._formData?.computeFeatures, fg?._formData?.featureMapping]);

  const trainingFeatureNames = useMemo(
    () => trainingFeatureNamesFromForm(fg?._formData),
    [trainingFeaturesKey, fg?._formData]
  );

  useEffect(() => {
    if (!fg || !fgId) return;
    if (fg.servingCanvasState) {
      setCanvasState(
        normalizeFgServingCanvasState(cloneFgServingState(fg.servingCanvasState))
      );
    } else if (fg.servingCanvasNodes && isLegacyWideTableNodes(fg.servingCanvasNodes)) {
      setCanvasState(
        createInitialFgServingState(fg._formData?.entitiesColumns ?? [])
      );
    } else {
      setCanvasState(
        createInitialFgServingState(fg._formData?.entitiesColumns ?? [])
      );
    }
  }, [fg, fgId, entitiesKey]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((e) => {
      const { width, height } = e[0].contentRect;
      setContainerSize({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const iz = 0.88;
    setPan({
      x: width / 2 - (FG_SERVING_CANVAS_W / 2) * iz,
      y: height / 2 - (FG_SERVING_CANVAS_H / 2) * iz,
    });
  }, []);

  useEffect(() => {
    function h(e: MouseEvent) {
      const t = e.target as Node;
      if (historyRef.current?.contains(t)) return;
      setHistoryOpen(false);
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const rect = containerRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const pz = zoomRef.current;
    const nz = Math.min(Math.max(pz * (e.deltaY < 0 ? 1.12 : 0.9), 0.15), 3);
    zoomRef.current = nz;
    setZoomState(nz);
    setPan((p) => ({
      x: mx - (mx - p.x) * (nz / pz),
      y: my - (my - p.y) * (nz / pz),
    }));
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  function handleNodeDragStart(nodeId: FgServingNodeId, e: React.MouseEvent) {
    if (readOnly || e.button !== 0) return;
    e.stopPropagation();
    dragMoved.current = false;
    const n = canvasState.nodes.find((x) => x.id === nodeId)!;
    dragState.current = {
      nodeId,
      startMx: e.clientX,
      startMy: e.clientY,
      startNx: n.x,
      startNy: n.y,
    };
  }

  function onCanvasMouseDown(e: React.MouseEvent) {
    if (readOnly) return;
    if (e.button === 2) {
      isPanning.current = true;
      panStart.current = { mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y };
    }
  }

  function onCanvasMouseMove(e: React.MouseEvent) {
    if (readOnly) return;
    if (dragState.current) {
      const dx = (e.clientX - dragState.current.startMx) / zoomRef.current;
      const dy = (e.clientY - dragState.current.startMy) / zoomRef.current;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        dragMoved.current = true;
        const { nodeId, startNx, startNy } = dragState.current;
        setCanvasState((prev) => ({
          ...prev,
          nodes: prev.nodes.map((n) =>
            n.id === nodeId ? { ...n, x: startNx + dx, y: startNy + dy } : n
          ),
        }));
      }
    } else if (isPanning.current) {
      setPan({
        x: panStart.current.px + e.clientX - panStart.current.mx,
        y: panStart.current.py + e.clientY - panStart.current.my,
      });
    }
  }

  function onCanvasMouseUp() {
    dragState.current = null;
    isPanning.current = false;
  }

  const lastTouch = useRef<{ dist: number; mx: number; my: number } | null>(
    null
  );

  function onTouchStart(e: React.TouchEvent) {
    if (readOnly) return;
    if (e.touches.length === 2) {
      const [a, b] = [e.touches[0], e.touches[1]];
      lastTouch.current = {
        dist: Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY),
        mx: (a.clientX + b.clientX) / 2,
        my: (a.clientY + b.clientY) / 2,
      };
    }
  }

  function onTouchMove(e: React.TouchEvent) {
    if (readOnly) return;
    e.preventDefault();
    if (e.touches.length !== 2 || !lastTouch.current) return;
    const [a, b] = [e.touches[0], e.touches[1]];
    const dist = Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
    const mx = (a.clientX + b.clientX) / 2;
    const my = (a.clientY + b.clientY) / 2;
    const rect = containerRef.current!.getBoundingClientRect();
    const cx = mx - rect.left;
    const cy = my - rect.top;
    const pz = zoomRef.current;
    const nz = Math.min(
      Math.max(pz * (dist / lastTouch.current.dist), 0.15),
      3
    );
    zoomRef.current = nz;
    setZoomState(nz);
    setPan((p) => ({
      x: cx - (cx - p.x) * (nz / pz) + (mx - lastTouch.current!.mx),
      y: cy - (cy - p.y) * (nz / pz) + (my - lastTouch.current!.my),
    }));
    lastTouch.current = { dist, mx, my };
  }

  function onTouchEnd() {
    lastTouch.current = null;
  }

  function fitToScreen() {
    if (!containerRef.current) return;
    const { width, height } = containerRef.current.getBoundingClientRect();
    const pad = 80;
    const ns = displayState.nodes;
    const xs = ns.flatMap((n) => [n.x, n.x + n.w]);
    const ys = ns.flatMap((n) => [n.y, n.y + n.h]);
    const minX = Math.min(...xs) - 20;
    const maxX = Math.max(...xs) + 20;
    const minY = Math.min(...ys) - 20;
    const maxY = Math.max(...ys) + 20;
    const cw = maxX - minX;
    const ch = maxY - minY;
    const nz = Math.min((width - pad) / cw, (height - pad) / ch, 1.5);
    zoomRef.current = nz;
    setZoomState(nz);
    setPan({
      x: (width - cw * nz) / 2 - minX * nz,
      y: (height - ch * nz) / 2 - minY * nz,
    });
  }

  function handleZoomBtn(delta: number) {
    if (!containerRef.current) return;
    const { width, height } = containerRef.current.getBoundingClientRect();
    const cx = width / 2;
    const cy = height / 2;
    const pz = zoomRef.current;
    const nz = Math.min(Math.max(pz + delta, 0.15), 3);
    zoomRef.current = nz;
    setZoomState(nz);
    setPan((p) => ({
      x: cx - (cx - p.x) * (nz / pz),
      y: cy - (cy - p.y) * (nz / pz),
    }));
  }

  function openHistoryRecord(rec: FgServingPublishRecord) {
    setHistoryState(resolveHistoryState(rec, entitiesColumns));
    setHistoryLabel(rec.label);
    setViewMode("history");
    setHistoryOpen(false);
    setSelectedNodeId(null);
  }

  function backToCurrent() {
    setViewMode("current");
    setHistoryState(null);
    setHistoryLabel("");
    setSelectedNodeId(null);
  }

  function handlePublish() {
    if (!fg || !fgId) return;
    const ts = new Date().toISOString().slice(0, 19).replace("T", " ");
    const snapshot = cloneFgServingState(canvasState);
    const record: FgServingPublishRecord = {
      id: `ph-${Date.now()}`,
      label: `Publish ${ts}`,
      createdAt: ts,
      state: snapshot,
    };
    updateFg(fgId, (prev) => {
      const hist = [record, ...(prev.servingPublishHistory ?? [])];
      return {
        ...prev,
        servingPublishHistory: hist,
        servingCanvasState: snapshot,
        updateTime: ts,
      };
    });
    navigate(`/fg/${fgId}`, {
      state: { afterServingPublish: true },
    });
  }

  const onUpdateConfig = useCallback(
    (nodeId: FgServingNodeId, cfg: FgServingNodeConfig) => {
      if (readOnly) return;
      setCanvasState((prev) => ({
        ...prev,
        configs: { ...prev.configs, [nodeId]: cfg },
      }));
    },
    [readOnly]
  );

  const selectedNode = useMemo((): FgServingNodeDef | null => {
    if (!selectedNodeId) return null;
    return displayState.nodes.find((n) => n.id === selectedNodeId) ?? null;
  }, [displayState.nodes, selectedNodeId]);

  const selectedConfig = useMemo(() => {
    if (!selectedNode) return undefined;
    return resolveServingNodeConfig(
      displayState,
      selectedNode,
      entitiesColumns
    );
  }, [displayState, selectedNode, entitiesColumns]);

  if (!fgId || !fg || fg.deleted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500 text-sm">
        Feature group not found
        <button
          type="button"
          className="ml-4 px-3 py-1 rounded-lg bg-teal-500 text-white"
          onClick={() => navigate("/fg")}
        >
          Back
        </button>
      </div>
    );
  }

  const pubHistory = fg.servingPublishHistory ?? [];

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">
      <div className="shrink-0 bg-white border-b border-gray-100 shadow-xs">
        <div className="px-5 h-12 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <button
              type="button"
              onClick={() => navigate(`/fg/${fgId}`)}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 transition-colors group shrink-0"
            >
              <ArrowLeft
                size={14}
                className="group-hover:-translate-x-0.5 transition-transform"
              />
              <span>Back</span>
            </button>
            <div className="w-px h-4 bg-gray-200 shrink-0" />
            <div className="flex items-center gap-1.5 min-w-0">
              <GitBranch size={13} className="text-teal-500 shrink-0" />
              <span className="text-sm text-gray-700 truncate max-w-[220px] font-mono">
                {fg.name}
              </span>
              <span className="text-xs text-gray-400 shrink-0">
                Serving Config
              </span>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            {viewMode === "current" ? (
              <div className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg bg-white text-xs text-gray-600">
                <span className="w-2 h-2 rounded-full bg-teal-400 shrink-0" />
                Current Config
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg bg-white text-xs text-gray-600">
                <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
                <span className="px-1.5 py-0.5 text-xs bg-blue-50 text-blue-600 rounded font-medium">
                  Read-only
                </span>
                <span className="text-blue-600 font-mono text-xs truncate max-w-[140px]">
                  {historyLabel}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 flex-1 justify-end flex-wrap">
            <div ref={historyRef} className="relative">
              <button
                type="button"
                onClick={() => setHistoryOpen((v) => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-700 border-2 border-slate-300 bg-slate-50/90 rounded-lg hover:border-slate-400 hover:bg-white transition-all shadow-sm min-h-[44px]"
              >
                <History size={13} className="text-slate-600" />
                Publish History
                <ChevronDown
                  size={11}
                  className={`text-gray-400 transition-transform ${historyOpen ? "rotate-180" : ""}`}
                />
              </button>
              {historyOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-80 max-h-72 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-xl z-30 py-1">
                  <div className="px-3 py-2 text-xs text-gray-400 border-b border-gray-50">
                    {pubHistory.length} published snapshot(s)
                  </div>
                  {pubHistory.length === 0 ? (
                    <div className="px-3 py-4 text-xs text-gray-400 text-center">
                      No history yet
                    </div>
                  ) : (
                    pubHistory.map((rec) => (
                      <button
                        key={rec.id}
                        type="button"
                        onClick={() => openHistoryRecord(rec)}
                        className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-teal-50 border-b border-gray-50 last:border-0"
                      >
                        <div className="font-medium text-gray-800">
                          {rec.label}
                        </div>
                        <div className="text-gray-400 mt-0.5">{rec.createdAt}</div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setTestOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 min-h-[44px]"
            >
              <Play size={13} className="text-teal-600" />
              Test Run
            </button>
            {viewMode === "history" ? (
              <button
                type="button"
                onClick={backToCurrent}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 min-h-[44px]"
              >
                Back to Current
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePublish}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-teal-500 rounded-lg hover:bg-teal-600 shadow-sm min-h-[44px]"
              >
                <Upload size={13} />
                Publish
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div
          ref={containerRef}
          className="flex-1 relative overflow-hidden select-none"
          style={{
            background: "#eef2f7",
            backgroundImage: "radial-gradient(#c8d3de 1px, transparent 0)",
            backgroundSize: "22px 22px",
          }}
          onMouseDown={onCanvasMouseDown}
          onMouseMove={onCanvasMouseMove}
          onMouseUp={onCanvasMouseUp}
          onMouseLeave={onCanvasMouseUp}
          onContextMenu={(e) => e.preventDefault()}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: "0 0",
              width: FG_SERVING_CANVAS_W,
              height: FG_SERVING_CANVAS_H,
            }}
          >
            <FgServingCanvasEdges
              nodes={displayState.nodes}
              edges={displayState.edges}
              canvasW={FG_SERVING_CANVAS_W}
              canvasH={FG_SERVING_CANVAS_H}
            />
            {displayState.nodes.map((node) => (
              <FgServingNodeCard
                key={node.id}
                node={node}
                selected={selectedNodeId === node.id}
                readOnly={readOnly}
                onDragStart={(e) => handleNodeDragStart(node.id, e)}
                onClick={() => {
                  if (dragMoved.current) {
                    dragMoved.current = false;
                    return;
                  }
                  setSelectedNodeId((n) => (n === node.id ? null : node.id));
                }}
              />
            ))}
          </div>

          <div className="absolute bottom-4 left-4 flex flex-col gap-2 z-10">
            <ZoomControls
              zoom={zoom}
              onZoom={handleZoomBtn}
              onFit={fitToScreen}
            />
            <FgServingMinimap
              nodes={displayState.nodes}
              edges={displayState.edges}
              canvasW={FG_SERVING_CANVAS_W}
              canvasH={FG_SERVING_CANVAS_H}
              pan={pan}
              zoom={zoom}
              cw={containerSize.w}
              ch={containerSize.h}
            />
          </div>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-gray-400 whitespace-nowrap pointer-events-none">
            Right-drag to pan · Scroll to zoom · Drag node to reposition
          </div>
        </div>
      </div>

      <FgServingConfigPanel
        open={selectedNodeId !== null}
        node={selectedNode}
        config={selectedConfig}
        canvasState={readOnly ? displayState : canvasState}
        readOnly={readOnly}
        trainingFeatureNames={trainingFeatureNames}
        onClose={() => setSelectedNodeId(null)}
        onUpdateConfig={onUpdateConfig}
      />

      <FgServingTestRunDrawer
        open={testOpen}
        onClose={() => setTestOpen(false)}
        fgName={fg.name}
      />
    </div>
  );
}
