import { useState, useRef, useEffect, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router";
import { toast } from "sonner";
import {
  ArrowLeft,
  MapPin,
  Layers,
  User,
  Clock,
  FileText,
  AlertCircle,
  RefreshCw,
  Calendar,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Info,
  GitBranch,
  Activity,
  Database,
  Zap,
  Timer,
  Copy,
  Check,
  Plus,
  Pencil,
} from "lucide-react";
import { useFeatureGroups } from "@/app/feature-group/FeatureGroupsProvider";
import type { FeatureGroup } from "./FeatureGroupList";
import FeatureGroupModal, {
  type FGFormData,
  normalizeFgFormData,
  isFgTrainingComplete,
  isFgServingConfigured,
  MOCK_TRAINING_FEATURES,
  DEFAULT_TRAINING_FEATURES,
} from "./FeatureGroupModal";
import { FgServingCanvasThumbnail } from "./FgServingCanvasThumbnail";
import { trainingFeatureNamesFromForm } from "./fgSeed";
import { fmFeatureLink } from "@/lib/links";
import { FeatureTraceModal } from "./FeatureLogicModal";
import {
  cloneFgServingState,
  computeFgServingPublishedSummary,
  createInitialFgServingState,
  normalizeFgServingCanvasState,
} from "@/data/fgServingCanvasModel";

function featureSourceLinesFromServingForm(fd: FGFormData): string[] {
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const block of fd.servingBlocks ?? []) {
    const name = block.featureSource?.trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    lines.push(name);
  }
  return lines;
}

function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
      <div className="flex items-center gap-2 mb-1.5">
        <span style={{ color: "#13c2c2" }}>{icon}</span>
        <span className="text-xs text-gray-400" style={{ fontWeight: 500 }}>
          {label}
        </span>
      </div>
      <p className="text-gray-800 text-sm break-all" style={{ fontWeight: 600 }}>
        {value}
      </p>
    </div>
  );
}

// ─── Feature List mock data ───────────────────────────────────────────────────
interface FeatureRow {
  name: string;        // Training feature name (column in offline table)
  servingName?: string; // Serving alias (transformation output name) — omit if same as name
  dataType: string;
  partition: boolean;
  training: boolean;
  serving: boolean;
  dataLatency?: "Online" | "Nearline" | "Offline"; // only when serving=true
}

function guessFeatureColumnType(col: string): string {
  const l = col.toLowerCase();
  if (l.includes("_id") || l.endsWith("id")) return "STRING";
  if (l.includes("cnt") || l.includes("count")) return "INT";
  if (l.includes("score") || l.includes("prob") || l.includes("rate")) {
    return "FLOAT";
  }
  if (l.includes("time") || l.includes("_ts") || l.includes("date")) {
    return "LONG";
  }
  return "DOUBLE";
}

function buildFeatureRowsFromFg(fg: FeatureGroup): FeatureRow[] {
  const fd = normalizeFgFormData(fg._formData ?? {});
  if (!isFgTrainingComplete(fg._formData)) return [];
  const names =
    MOCK_TRAINING_FEATURES[fd.tableName] ?? DEFAULT_TRAINING_FEATURES;
  const hasServing = isFgServingConfigured(fg._formData);
  return names.map((name) => ({
    name,
    dataType: guessFeatureColumnType(name),
    partition: false,
    training: true,
    serving: hasServing,
    dataLatency: hasServing ? ("Online" as const) : undefined,
  }));
}

// ─── Version History mock data ────────────────────────────────────────────────
interface VersionConfig {
  dataServer: string;
  tableSchema: string;
  tableName: string;
  datePartition: string;
  partitionType: string;
  updateFrequency: string;
  entitiesColumns: string[];
  filter: string;
  dataLatency: string;
  featureSource: string;
  sourceType: string;
  transformation: string;
}

interface VersionRow {
  version: string;
  createdAt: string;
  createdBy: string;
  status: string;
  publishedAt: string;
  isCurrent: boolean;
  config: VersionConfig;
}

const DEFAULT_VERSIONS: VersionRow[] = [
  {
    version: "v3",
    createdAt: "2026-02-16 08:30",
    createdBy: "cedric.chencan@seamoney.com",
    status: "Online",
    publishedAt: "2026-02-16 09:00",
    isCurrent: true,
    config: {
      dataServer: "reg_sg_hive", tableSchema: "risk_db", tableName: "user_risk_score_ods",
      datePartition: "dt", partitionType: "Incremental Data", updateFrequency: "Daily",
      entitiesColumns: ["platform_user_id"], filter: "dt='2026-02-16'",
      dataLatency: "Online", featureSource: "riskfeat_hbase_th", sourceType: "HBase", transformation: "QueryAaiCache@V2",
    },
  },
  {
    version: "v2",
    createdAt: "2026-01-20 14:00",
    createdBy: "sankar.shyamal@seamoney.com",
    status: "Offline",
    publishedAt: "2026-01-20 15:30",
    isCurrent: false,
    config: {
      dataServer: "reg_sg_hive", tableSchema: "risk_db", tableName: "user_risk_score_ods",
      datePartition: "dt", partitionType: "Incremental Data", updateFrequency: "Daily",
      entitiesColumns: ["platform_user_id"], filter: "",
      dataLatency: "Nearline", featureSource: "riskfeat_hbase_th", sourceType: "HBase", transformation: "QueryAaiCache@V1",
    },
  },
  {
    version: "v1",
    createdAt: "2026-01-05 10:00",
    createdBy: "cedric.chencan@seamoney.com",
    status: "Offline",
    publishedAt: "2026-01-05 11:00",
    isCurrent: false,
    config: {
      dataServer: "reg_sg_hive", tableSchema: "risk_db", tableName: "user_risk_score_v1_ods",
      datePartition: "dt", partitionType: "Incremental Data", updateFrequency: "Daily",
      entitiesColumns: ["platform_user_id"], filter: "",
      dataLatency: "Offline", featureSource: "riskfeat_hbase_th", sourceType: "HBase", transformation: "OfflineFeatureJoin@V1",
    },
  },
];

const SYNC_ARIA =
  "Manually refresh latest Training Config metadata";

// ─── Main page component ──────────────────────────────────────────────────────
export default function FeatureGroupDetail() {
  const { fgId } = useParams<{ fgId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { getFg, updateFg, syncFgMetadata, modules } = useFeatureGroups();

  const fg = fgId ? getFg(fgId) : undefined;
  const fd = normalizeFgFormData(fg?._formData ?? {});

  const [basicModalOpen, setBasicModalOpen] = useState(false);
  const [trainingModalOpen, setTrainingModalOpen] = useState(false);

  const trainingDone = fg ? isFgTrainingComplete(fg._formData) : false;
  const hasServingCanvas = Boolean(fg?.servingCanvasState);
  const servingConfigured =
    Boolean(fg && (hasServingCanvas || isFgServingConfigured(fg._formData)));

  const trainingFeatureSet = useMemo(() => {
    const names = trainingFeatureNamesFromForm(fg?._formData);
    const set = new Set(names);
    const tableName = fd.tableName?.trim();
    if (tableName) {
      const mockCols =
        MOCK_TRAINING_FEATURES[tableName] ?? DEFAULT_TRAINING_FEATURES;
      for (const col of mockCols) {
        const n = col.trim();
        if (n) set.add(n);
      }
    }
    return set;
  }, [fg?._formData, fd.tableName]);

  const servingSummary = useMemo(() => {
    if (!fg?.servingCanvasState) {
      return computeFgServingPublishedSummary(undefined, trainingFeatureSet);
    }
    const normalized = normalizeFgServingCanvasState(
      cloneFgServingState(fg.servingCanvasState)
    );
    return computeFgServingPublishedSummary(normalized, trainingFeatureSet);
  }, [fg?.servingCanvasState, trainingFeatureSet]);

  const servingCanvasPreviewState = useMemo(() => {
    if (!fg) {
      return normalizeFgServingCanvasState(createInitialFgServingState([]));
    }
    if (fg.servingCanvasState) {
      return normalizeFgServingCanvasState(
        cloneFgServingState(fg.servingCanvasState)
      );
    }
    return normalizeFgServingCanvasState(
      createInitialFgServingState(fd.entitiesColumns ?? [])
    );
  }, [fg, fg?.servingCanvasState, fd.entitiesColumns]);

  const featureSourceDisplayLines = useMemo(() => {
    if (hasServingCanvas) return servingSummary.featureSourceLines;
    return featureSourceLinesFromServingForm(fd);
  }, [hasServingCanvas, servingSummary.featureSourceLines, fd]);

  const featureRows = fg ? buildFeatureRowsFromFg(fg) : [];
  const trainingFeatureCount = featureRows.filter((r) => r.training).length;
  const servingFeatureCount = featureRows.filter((r) => r.serving).length;
  const mappedFeatureCount = featureRows.filter(
    (r) => r.training && r.serving
  ).length;

  const servingFtsDisplay = hasServingCanvas
    ? servingSummary.servingFts
    : servingFeatureCount;
  const mappedFtsDisplay = hasServingCanvas
    ? servingSummary.mappedFts
    : mappedFeatureCount;
  const extraFtsDisplay = hasServingCanvas
    ? servingSummary.extraFts
    : Math.max(0, servingFtsDisplay - mappedFtsDisplay);

  useEffect(() => {
    const st = location.state as { afterServingPublish?: boolean } | null;
    if (!st?.afterServingPublish || !fgId) return;
    toast.info("Serving configuration published successfully.", {
      duration: 5_000,
    });
    navigate(`/fg/${fgId}`, { replace: true, state: {} });
  }, [location.state, fgId, navigate]);

  function handleBasicSave(data: FGFormData) {
    if (!fg) return;
    const now = new Date().toISOString().slice(0, 19).replace("T", " ");
    const merged = normalizeFgFormData({
      ...(fg._formData ?? {}),
      name: data.name,
      region: data.region,
      module: data.module,
      owners: data.owners,
      description: data.description,
    } as Partial<FGFormData> & Record<string, unknown>);
    updateFg(fg.id, (prev) => ({
      ...prev,
      name: merged.name || prev.name,
      region: merged.region || prev.region,
      module: merged.module || prev.module,
      owner: merged.owners.join(",") || prev.owner,
      description: merged.description,
      updateTime: now,
      _formData: merged,
    }));
  }

  function handleTrainingSave(data: FGFormData) {
    if (!fg) return;
    const now = new Date().toISOString().slice(0, 19).replace("T", " ");
    const merged = normalizeFgFormData({
      ...(fg._formData ?? {}),
      ...data,
    } as Partial<FGFormData> & Record<string, unknown>);
    updateFg(fg.id, (prev) => ({
      ...prev,
      name: merged.name || prev.name,
      region: merged.region || prev.region,
      module: merged.module || prev.module,
      owner: merged.owners.join(",") || prev.owner,
      description: merged.description,
      updateTime: now,
      _formData: merged,
    }));
  }

  if (!fg || fg.deleted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500">Feature group not found</p>
          <button
            onClick={() => navigate("/fg")}
            className="mt-4 px-4 py-2 rounded-lg text-white text-sm"
            style={{ backgroundColor: "#13c2c2" }}
          >
            Back to List
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
            <button
              onClick={() => navigate("/fg")}
              className="hover:text-teal-600 transition-colors flex items-center gap-1"
            >
              Feature Groups
            </button>
            <span>/</span>
            <span className="text-gray-700" style={{ fontFamily: "monospace" }}>
              {fg.name}
            </span>
          </div>

          {/* Title Row */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate("/fg")}
                className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:border-teal-300 hover:text-teal-600 transition-all flex-shrink-0"
              >
                <ArrowLeft size={16} />
              </button>
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1
                    style={{
                      fontWeight: 700,
                      fontSize: 22,
                      fontFamily: "monospace",
                      color: "#1a1a2e",
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {fg.name}
                  </h1>
                  {/* StatusTag removed — FG is now stateless */}
                </div>
                <p className="mt-1 text-sm text-gray-500">{fg.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-400 flex-shrink-0 self-start mt-1">
              <RefreshCw size={12} />
              <span>Updated {fg.updateTime}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 sm:px-8 py-5 space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch min-w-0">
          <ConfigPanel
            title="Basic Info"
            icon={<Info size={11} />}
            headerRight={
              <button
                type="button"
                onClick={() => setBasicModalOpen(true)}
                className="p-2 rounded-lg border transition-all min-h-[44px] min-w-[44px] flex items-center justify-center border-gray-200 text-gray-500 hover:border-teal-300 hover:text-teal-600"
                title="Edit basic info"
                aria-label="Edit basic info"
              >
                <Pencil size={14} />
              </button>
            }
          >
            <FieldRow label="Region">
              <GrayBadge>{fg.region}</GrayBadge>
            </FieldRow>
            <FieldRow label="Module">
              <PlainVal>{fd.module}</PlainVal>
            </FieldRow>
            <FieldRow label="Owner">
              <div className="flex flex-col gap-1 items-start w-full min-w-0">
                {fg.owner.split(",").map((o) => (
                  <GrayBadge key={o}>{o.trim()}</GrayBadge>
                ))}
              </div>
            </FieldRow>
            <FieldRow label="Create Time">
              <PlainVal>{fg.createTime}</PlainVal>
            </FieldRow>
            {/* Update Time moved to header */}
          </ConfigPanel>

          <ConfigPanel
            title="Training Config"
            icon={<Database size={11} />}
            headerRight={
              trainingDone ? (
                <button
                  type="button"
                  onClick={() => setTrainingModalOpen(true)}
                  className="p-2 rounded-lg border transition-all min-h-[44px] min-w-[44px] flex items-center justify-center border-gray-200 text-gray-500 hover:border-teal-300 hover:text-teal-600"
                  title="Edit training config"
                  aria-label="Edit training config"
                >
                  <Pencil size={14} />
                </button>
              ) : null
            }
          >
            {trainingDone ? (
              <>
                <FieldRow label="Data Server">
                  <GrayBadge>{fd.dataServer}</GrayBadge>
                </FieldRow>
                <FieldRow label="Table Name">
                  <PlainVal mono>{fd.tableSchema}.{fd.tableName}</PlainVal>
                </FieldRow>
                <FieldRow label="Date Partition">
                  <PlainVal mono>{fd.datePartition}</PlainVal>
                </FieldRow>
                <FieldRow label="Partition Type">
                  <GrayBadge>{fd.partitionType}</GrayBadge>
                </FieldRow>
                <FieldRow label="Update Freq.">
                  <GrayBadge>{fd.updateFrequency}</GrayBadge>
                </FieldRow>
                <FieldRow label="Entities">
                  {fd.entitiesColumns.length > 0 ? (
                    <PlainVal mono>{fd.entitiesColumns.join(", ")}</PlainVal>
                  ) : (
                    <span className="text-gray-300 text-xs">—</span>
                  )}
                </FieldRow>
                <FieldRow label="Custom Filter">
                  {fd.filter ? (
                    <PlainVal mono>{fd.filter}</PlainVal>
                  ) : (
                    <span className="text-gray-300 text-xs">—</span>
                  )}
                </FieldRow>
                <FieldRow label="Training Fts">
                  <PlainVal>{String(trainingFeatureCount)}</PlainVal>
                </FieldRow>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center min-h-[160px] py-6 px-2">
                <button
                  type="button"
                  onClick={() => setTrainingModalOpen(true)}
                  className="inline-flex items-center justify-center w-14 h-14 rounded-full border-2 border-dashed border-teal-300 text-teal-600 hover:bg-teal-50 transition-colors min-h-[44px] min-w-[44px]"
                  title="Add training configuration"
                  aria-label="Add training configuration"
                >
                  <Plus size={24} />
                </button>
                <p className="text-sm text-gray-400 mt-3 text-center max-w-xs">
                  No training configuration yet. Use the button above to add training.
                </p>
              </div>
            )}
          </ConfigPanel>

          <ConfigPanel
            title="Serving Config"
            icon={<Zap size={11} />}
            headerRight={
              servingConfigured ? (
                <button
                  type="button"
                  onClick={() => navigate(`/fg/${fg.id}/serving`)}
                  className="p-2 rounded-lg border transition-all min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0 border-gray-200 text-gray-500 hover:border-teal-300 hover:text-teal-600"
                  title="Edit serving config"
                  aria-label="Edit serving config"
                >
                  <Pencil size={14} />
                </button>
              ) : null
            }
          >
            {servingConfigured ? (
              <>
                <FieldRow label="Feature Sources">
                  {featureSourceDisplayLines.length > 0 ? (
                    <div className="text-xs text-gray-800 leading-relaxed break-words min-w-0">
                      {featureSourceDisplayLines.map((line) => (
                        <div key={line}>{line}</div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-400 text-xs">—</span>
                  )}
                </FieldRow>
                <FieldRow label="Serving Fts">
                  <PlainVal>{String(servingFtsDisplay)}</PlainVal>
                </FieldRow>
                <FieldRow label="Mapped Fts">
                  <PlainVal>{String(mappedFtsDisplay)}</PlainVal>
                </FieldRow>
                <FieldRow label="Custom Fts">
                  <PlainVal>{String(extraFtsDisplay)}</PlainVal>
                </FieldRow>
                <FieldRow label="Canvas">
                  <div className="min-w-0">
                    <FgServingCanvasThumbnail
                      state={servingCanvasPreviewState}
                      width={160}
                      className="max-w-full"
                    />
                  </div>
                </FieldRow>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center min-h-[160px] py-6 px-2">
                <button
                  type="button"
                  onClick={() => navigate(`/fg/${fg.id}/serving`)}
                  className="inline-flex items-center justify-center w-14 h-14 rounded-full border-2 border-dashed border-teal-300 text-teal-600 hover:bg-teal-50 transition-colors min-h-[44px] min-w-[44px]"
                  title="Configure serving"
                  aria-label="Configure serving"
                >
                  <Plus size={24} />
                </button>
                <p className="text-sm text-gray-400 mt-3 text-center max-w-xs">
                  Add a serving pipeline on the canvas.
                </p>
              </div>
            )}
          </ConfigPanel>
        </div>

        <DetailTabSection fg={fg} />
      </div>

      <FeatureGroupModal
        open={basicModalOpen}
        mode="edit"
        variant="basic"
        editId={fg.id}
        initialData={fd}
        modules={modules}
        onClose={() => setBasicModalOpen(false)}
        onSubmit={(data) => handleBasicSave(data)}
      />
      <FeatureGroupModal
        open={trainingModalOpen}
        mode="edit"
        variant="training"
        editId={fg.id}
        initialData={fd}
        modules={modules}
        onClose={() => setTrainingModalOpen(false)}
        onSubmit={(data) => handleTrainingSave(data)}
      />
    </div>
  );
}

// ─── ConfigPanel ──────────────────────────────────────────────────────────────
function ConfigPanel({
  title,
  icon,
  headerRight,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className="bg-white rounded-xl border border-gray-200 overflow-hidden"
      style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
    >
      {/* Panel header */}
      <div
        className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-gray-100"
        style={{ background: "linear-gradient(to right, rgba(19,194,194,0.04), transparent)" }}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <span style={{ color: "#13c2c2" }}>{icon}</span>
          <span className="text-xs" style={{ fontWeight: 700, color: "#0e9494", letterSpacing: "0.03em", textTransform: "uppercase" }}>
            {title}
          </span>
        </div>
        {headerRight}
      </div>
      {/* Fields */}
      <div className="px-4 py-2 divide-y divide-gray-50">
        {children}
      </div>
    </div>
  );
}

// ─── FieldRow ────────────────────────────────────────────────────────────────
function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 py-1.5 min-w-0">
      <span
        className="flex-shrink-0 text-gray-400 text-xs"
        style={{ fontWeight: 500, width: 90 }}
      >
        {label}
      </span>
      <div className="flex-1 min-w-0 flex items-center">{children}</div>
    </div>
  );
}

// ─── TealBadge ────────────────────────────────────────────────────────────────
function TealBadge({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-md text-xs truncate max-w-full"
      style={{
        background: "rgba(19,194,194,0.08)",
        color: "#0e9494",
        border: "1px solid rgba(19,194,194,0.18)",
        fontWeight: 600,
      }}
    >
      {children}
    </span>
  );
}

// ─── GrayBadge ────────────────────────────────────────────────────────────────
function GrayBadge({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-md text-xs"
      style={{
        background: "#f3f4f6",
        color: "#374151",
        border: "1px solid #e5e7eb",
        fontWeight: 500,
      }}
    >
      {children}
    </span>
  );
}

// ─── PlainVal ─────────────────────────────────────────────────────────────────
function PlainVal({ children, mono = false }: { children: React.ReactNode; mono?: boolean }) {
  return (
    <span
      className="text-xs text-gray-700 truncate max-w-full"
      style={{ fontWeight: 500, fontFamily: mono ? "monospace" : undefined }}
    >
      {children}
    </span>
  );
}

// ─── Small helpers ────────────────────────────────────────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="text-sm text-gray-400 mb-3 flex items-center gap-2"
      style={{ fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}
    >
      <span className="w-4 h-0.5 rounded" style={{ backgroundColor: "#13c2c2" }} />
      {children}
    </h2>
  );
}

// ─── AvailDot ─────────────────────────────────────────────────────────────────
function AvailDot({ value }: { value: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`w-2 h-2 rounded-full flex-shrink-0 ${value ? "bg-emerald-500" : "bg-gray-300"}`}
      />
      <span className={`text-xs ${value ? "text-gray-700" : "text-gray-400"}`}>
        {value ? "TRUE" : "FALSE"}
      </span>
    </span>
  );
}

// ─── SortBtn ──────────────────────────────────────────────────────────────────
function SortBtn({
  col,
  activeCol,
  dir,
  onSort,
}: {
  col: string;
  activeCol: string | null;
  dir: "asc" | "desc";
  onSort: (c: string) => void;
}) {
  const active = activeCol === col;
  return (
    <button
      onClick={() => onSort(col)}
      className={`inline-flex items-center ml-0.5 transition-colors ${
        active ? "text-teal-500" : "text-gray-300 hover:text-gray-400"
      }`}
    >
      {active ? (
        dir === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />
      ) : (
        <ArrowUpDown size={11} />
      )}
    </button>
  );
}

// ─── FilterPopover ────────────────────────────────────────────────────────────
function FilterPopover({
  isOpen, value, onChange, onClose, placeholder, isBool, options,
}: {
  isOpen: boolean;
  value: string;
  onChange: (v: string) => void;
  onClose: () => void;
  placeholder?: string;
  isBool?: boolean;
  options?: string[];
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isEnum = isBool || !!options;
  const enumOpts = isBool
    ? [{ label: "All", val: "" }, { label: "TRUE", val: "true" }, { label: "FALSE", val: "false" }]
    : [{ label: "All", val: "" }, ...(options ?? []).map(o => ({ label: o, val: o }))];

  return (
    <div
      ref={ref}
      className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50"
      style={{ minWidth: isEnum ? 120 : 160 }}
    >
      {isEnum ? (
        <div className="py-1">
          {enumOpts.map((opt) => (
            <button
              key={opt.val}
              onClick={() => { onChange(opt.val); onClose(); }}
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left transition-colors ${
                value === opt.val ? "bg-teal-50 text-teal-600" : "hover:bg-gray-50 text-gray-600"
              }`}
            >
              {isBool && opt.val === "true"  && <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />}
              {isBool && opt.val === "false" && <span className="w-2 h-2 rounded-full bg-gray-300 flex-shrink-0" />}
              {isBool && opt.val === ""      && <span className="w-2 h-2 flex-shrink-0" />}
              {!isBool && opt.val === ""     && <span className="w-2 h-2 flex-shrink-0" />}
              {!isBool && opt.val === "Online"   && <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />}
              {!isBool && opt.val === "Nearline" && <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />}
              {!isBool && opt.val === "Offline"  && <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />}
              {opt.label}
            </button>
          ))}
        </div>
      ) : (
        <div className="p-2">
          <input
            autoFocus
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder ?? "Filter…"}
            className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:outline-none focus:border-teal-400"
          />
        </div>
      )}
    </div>
  );
}

// ─── Feature List Tab ─────────────────────────────────────────────────────────
function FeatureListTab({ fg }: { fg: FeatureGroup }) {
  const navigate = useNavigate();
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [openFilter, setOpenFilter] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const [lineageTarget, setLineageTarget] = useState<{ featureName: string; hasTraining: boolean; hasServing: boolean } | null>(null);

  const features = buildFeatureRowsFromFg(fg);

  function handleSort(col: string) {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
    setPage(1);
  }

  function setFilter(col: string, val: string) {
    setFilters((f) => ({ ...f, [col]: val }));
    setPage(1);
  }

  function toggleFilter(col: string) {
    setOpenFilter((v) => (v === col ? null : col));
  }

  const filtered = features.filter((f) => {
    if (filters.name) {
      const q = filters.name.toLowerCase();
      const matchTrain   = f.name.toLowerCase().includes(q);
      const matchServing = f.servingName?.toLowerCase().includes(q) ?? false;
      if (!matchTrain && !matchServing) return false;
    }
    if (filters.dataType && !f.dataType.toLowerCase().includes(filters.dataType.toLowerCase())) return false;
    if (filters.training  === "true"  && !f.training)  return false;
    if (filters.training  === "false" &&  f.training)  return false;
    if (filters.serving   === "true"  && !f.serving)   return false;
    if (filters.serving   === "false" &&  f.serving)   return false;
    if (filters.dataLatency && f.dataLatency !== filters.dataLatency) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (!sortCol) return 0;
    const av = String(a[sortCol as keyof FeatureRow]);
    const bv = String(b[sortCol as keyof FeatureRow]);
    return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
  });

  const total      = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const paged      = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const hasFilter = (col: string) => !!filters[col];

  const BOOL_COLS: { key: keyof FeatureRow; label: string }[] = [
    { key: "training",  label: "Training"  },
    { key: "serving",   label: "Serving"   },
  ];

  // Count features with serving aliases
  const aliasCount = features.filter(f => f.servingName && f.servingName !== f.name).length;

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      {/* Legend bar */}
      {aliasCount > 0 && (
        <div
          className="flex items-center gap-3 px-5 py-2 border-b"
          style={{ background: "rgba(19,194,194,0.03)", borderColor: "rgba(19,194,194,0.12)" }}
        >
          <Info size={12} style={{ color: "#13c2c2", flexShrink: 0 }} />
          <span className="text-xs" style={{ color: "#4b5563", fontWeight: 500 }}>
            Feature Name column shows the{" "}
            <span style={{ fontFamily: "monospace", color: "#13c2c2", fontWeight: 700 }}>training name</span>
            {" "}as primary. Features with a different serving alias show{" "}
            <span style={{ fontFamily: "monospace", color: "#6b7280", fontSize: 11 }}>↳ serving_name</span>
            {" "}below ({aliasCount} aliased in this group).
          </span>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ borderCollapse: "separate", borderSpacing: 0 }}>
          <thead>
            <tr style={{ backgroundColor: "#fafafa" }} className="border-b border-gray-100 text-xs text-gray-500">
              {/* Feature */}
              <th className="px-5 py-3 text-left" style={{ fontWeight: 600, position: "relative", width: "34%" }}>
                <div className="flex items-center gap-1">
                  <span>Feature Name</span>
                  <SortBtn col="name" activeCol={sortCol} dir={sortDir} onSort={handleSort} />
                  <button
                    onClick={() => toggleFilter("name")}
                    className={`transition-colors ${hasFilter("name") ? "text-teal-500" : "text-gray-300 hover:text-gray-400"}`}
                  >
                    <Filter size={10} />
                  </button>
                  {/* Legend indicator */}
                  <span
                    className="ml-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded"
                    style={{ background: "#f3f4f6", border: "1px solid #e5e7eb" }}
                  >
                    <span style={{ fontSize: 9, fontWeight: 700, color: "#13c2c2", fontFamily: "monospace" }}>T</span>
                    <span style={{ fontSize: 9, color: "#d1d5db" }}>·</span>
                    <span style={{ fontSize: 9, fontWeight: 700, color: "#9ca3af", fontFamily: "monospace" }}>S</span>
                  </span>
                </div>
                <FilterPopover
                  isOpen={openFilter === "name"}
                  value={filters.name ?? ""}
                  onChange={(v) => setFilter("name", v)}
                  onClose={() => setOpenFilter(null)}
                  placeholder="Search training or serving name…"
                />
              </th>

              {/* Data Type */}
              <th className="px-5 py-3 text-left" style={{ fontWeight: 600, position: "relative", width: "22%" }}>
                <div className="flex items-center gap-0.5">
                  Data Type
                  <SortBtn col="dataType" activeCol={sortCol} dir={sortDir} onSort={handleSort} />
                  <button
                    onClick={() => toggleFilter("dataType")}
                    className={`ml-0.5 transition-colors ${hasFilter("dataType") ? "text-teal-500" : "text-gray-300 hover:text-gray-400"}`}
                  >
                    <Filter size={10} />
                  </button>
                </div>
                <FilterPopover
                  isOpen={openFilter === "dataType"}
                  value={filters.dataType ?? ""}
                  onChange={(v) => setFilter("dataType", v)}
                  onClose={() => setOpenFilter(null)}
                  placeholder="e.g. FLOAT"
                />
              </th>

              {/* Bool columns */}
              {BOOL_COLS.map(({ key, label }) => (
                <th
                  key={key}
                  className="px-5 py-3 text-left"
                  style={{ fontWeight: 600, position: "relative", width: "12%" }}
                >
                  <div className="flex items-center gap-0.5">
                    {label}
                    <button
                      onClick={() => toggleFilter(key)}
                      className={`ml-0.5 transition-colors ${hasFilter(key) ? "text-teal-500" : "text-gray-300 hover:text-gray-400"}`}
                    >
                      <Filter size={10} />
                    </button>
                  </div>
                  <FilterPopover
                    isOpen={openFilter === key}
                    value={filters[key] ?? ""}
                    onChange={(v) => setFilter(key, v)}
                    onClose={() => setOpenFilter(null)}
                    isBool
                  />
                </th>
              ))}
              {/* Data Latency column header */}
              <th className="px-5 py-3 text-left" style={{ fontWeight: 600, position: "relative", width: "14%" }}>
                <div className="flex items-center gap-0.5">
                  Data Latency
                  <button
                    onClick={() => toggleFilter("dataLatency")}
                    className={`ml-0.5 transition-colors ${hasFilter("dataLatency") ? "text-teal-500" : "text-gray-300 hover:text-gray-400"}`}
                  >
                    <Filter size={10} />
                  </button>
                </div>
                <FilterPopover
                  isOpen={openFilter === "dataLatency"}
                  value={filters.dataLatency ?? ""}
                  onChange={(v) => setFilter("dataLatency", v)}
                  onClose={() => setOpenFilter(null)}
                  options={["Online", "Nearline", "Offline"]}
                />
              </th>
              {/* v2 — Action column */}
              <th className="px-5 py-3 text-left" style={{ fontWeight: 600, width: "13%" }}>
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-gray-400 text-sm">
                  No features match the current filters
                </td>
              </tr>
            ) : (
              paged.map((f, i) => (
                <tr
                  key={i}
                  className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors"
                >
                  <td className="px-5 py-3">
                    <div className="flex flex-col gap-0.5">
                      {/* Training name — primary identifier */}
                      <span style={{ fontFamily: "monospace", color: "#13c2c2", fontWeight: 600, fontSize: 13 }}>
                        {f.name}
                      </span>
                      {/* Serving alias — only when different */}
                      {f.servingName && f.servingName !== f.name && (
                        <span
                          className="inline-flex items-center gap-1"
                          style={{ fontFamily: "monospace", color: "#9ca3af", fontSize: 11 }}
                        >
                          <span style={{ color: "#d1d5db", fontSize: 10 }}>↳</span>
                          <span style={{ color: "#6b7280" }}>{f.servingName}</span>
                          <span
                            className="inline-flex items-center px-1 rounded"
                            style={{
                              fontSize: 9, fontWeight: 700, letterSpacing: "0.04em",
                              background: "rgba(19,194,194,0.08)",
                              color: "#0e9494",
                              border: "1px solid rgba(19,194,194,0.18)",
                              fontFamily: "sans-serif",
                            }}
                          >
                            serving
                          </span>
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-xs font-mono text-gray-600">{f.dataType}</td>
                  <td className="px-5 py-3"><AvailDot value={f.training}  /></td>
                  <td className="px-5 py-3"><AvailDot value={f.serving}   /></td>
                  <td className="px-5 py-3 text-xs" style={{ color: "#374151" }}>
                    {f.serving && f.dataLatency
                      ? f.dataLatency
                      : <span className="text-gray-300">—</span>
                    }
                  </td>
                  {/* Action */}
                  <td className="px-5 py-3 text-xs">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setLineageTarget({ featureName: f.name, hasTraining: f.training, hasServing: f.serving });
                        }}
                        className="text-[11px] text-teal-600 hover:text-teal-800 hover:underline transition-colors"
                      >
                        Trace
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
        <span className="text-xs text-gray-400">
          {total === 0
            ? "0 items"
            : `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} of ${total} items`}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-2.5 py-1 text-xs border border-gray-200 rounded hover:border-teal-400 hover:text-teal-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            «
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`w-7 h-7 text-xs rounded border transition-colors ${
                p === page
                  ? "border-teal-500 bg-teal-500 text-white"
                  : "border-gray-200 hover:border-teal-400 hover:text-teal-600"
              }`}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-2.5 py-1 text-xs border border-gray-200 rounded hover:border-teal-400 hover:text-teal-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            »
          </button>
          <span className="ml-2 text-xs text-gray-400">20 / page</span>
        </div>
      </div>

      {/* Feature Trace Modal — feature-level lineage + processing + health */}
      <FeatureTraceModal
        open={!!lineageTarget}
        featureName={lineageTarget?.featureName ?? ""}
        hasTraining={lineageTarget?.hasTraining ?? false}
        hasServing={lineageTarget?.hasServing ?? false}
        onClose={() => setLineageTarget(null)}
      />
    </div>
  );
}

// ─── Used By Tab — downstream assets referencing this FG ─────────────────────

interface DownstreamAsset {
  assetType: "Feature WideTable" | "Workflow Service";
  assetName: string;
  owner: string;
}

const MOCK_DOWNSTREAM: DownstreamAsset[] = [
  { assetType: "Feature WideTable", assetName: "risk_score_sg_v3_wt", owner: "zhangsan" },
  { assetType: "Feature WideTable", assetName: "credit_features_th_wt", owner: "lisi" },
  { assetType: "Workflow Service", assetName: "fraud-detection-sg-svc", owner: "wangwu" },
  { assetType: "Workflow Service", assetName: "credit-scoring-online-svc", owner: "zhaoliu" },
];

function LineageTab() {
  return (
    <div className="bg-white rounded-xl border border-gray-200" style={{ minHeight: 300 }}>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="px-5 py-3 text-left text-[11px] uppercase tracking-wider text-gray-400 font-medium">Asset Type</th>
              <th className="px-5 py-3 text-left text-[11px] uppercase tracking-wider text-gray-400 font-medium">Asset Name</th>
              <th className="px-5 py-3 text-left text-[11px] uppercase tracking-wider text-gray-400 font-medium">Owner</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_DOWNSTREAM.map((item, idx) => (
              <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50/40 transition-colors">
                <td className="px-5 py-3 text-gray-600">
                  <span className={`inline-flex items-center gap-1.5 ${
                    item.assetType === "Feature WideTable" ? "text-emerald-700" : "text-violet-700"
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      item.assetType === "Feature WideTable" ? "bg-emerald-400" : "bg-violet-400"
                    }`} />
                    {item.assetType}
                  </span>
                </td>
                <td className="px-5 py-3 font-mono text-gray-700">{item.assetName}</td>
                <td className="px-5 py-3 text-gray-500">@{item.owner}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Offline DQC Tab (placeholder) ───────────────────────────────────────────
function OfflineDQCTab() {
  return (
    <div
      className="bg-white rounded-xl border border-gray-200 flex flex-col items-center justify-center text-center"
      style={{ minHeight: 300 }}
    >
      <Activity size={40} className="mb-3" style={{ color: "#d1d5db" }} />
      <p className="text-sm text-gray-400" style={{ fontWeight: 500 }}>
        Consistency check results coming soon
      </p>
      <p className="text-xs text-gray-300 mt-1">
        Offline DQC alignment data will appear here
      </p>
    </div>
  );
}

// ─── Version History Tab ──────────────────────────────────────────────────────
function VersionHistoryTab() {
  const [hovered, setHovered] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const TRAINING_KEYS: (keyof VersionConfig)[] = [
    "dataServer", "tableSchema", "tableName", "datePartition", "partitionType",
    "updateFrequency", "entitiesColumns", "filter",
  ];
  const SERVING_KEYS:  (keyof VersionConfig)[] = ["dataLatency", "featureSource", "sourceType", "transformation"];

  function showTooltip(version: string) {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setHovered(version);
  }

  function scheduleHide() {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setHovered(null), 320);
  }

  function buildJsonText(config: VersionConfig): string {
    const tLines = TRAINING_KEYS.map(k => `  "${k}": ${JSON.stringify(config[k] || "")}`);
    const sLines = SERVING_KEYS.map(k  => `  "${k}": ${JSON.stringify(config[k] || "")}`);
    return (
      "{\n" +
      "  // Training Config\n" +
      tLines.join(",\n") + ",\n\n" +
      "  // Serving Config\n" +
      sLines.join(",\n") + "\n" +
      "}"
    );
  }

  function handleCopy(v: VersionRow, e: React.MouseEvent) {
    e.stopPropagation();
    if (hideTimer.current) clearTimeout(hideTimer.current);

    const text = buildJsonText(v.config);

    function onSuccess() {
      setCopied(v.version);
      setTimeout(() => setCopied(null), 1800);
    }

    function execCommandFallback() {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.cssText = "position:fixed;top:0;left:0;opacity:0;pointer-events:none;";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        onSuccess();
      } catch {
        // silent fail — nothing to do
      }
    }

    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      navigator.clipboard.writeText(text).then(onSuccess).catch(execCommandFallback);
    } else {
      execCommandFallback();
    }
  }

  // Light-theme syntax renderer (GitHub style)
  function renderLine(line: string, idx: number) {
    if (line.trimStart().startsWith("//")) {
      return <div key={idx} style={{ color: "#6e7781", fontStyle: "italic" }}>{line}</div>;
    }
    if (line.trim() === "{" || line.trim() === "}") {
      return <div key={idx} style={{ color: "#24292f" }}>{line}</div>;
    }
    if (line.trim() === "") return <div key={idx} style={{ height: "0.55em" }} />;
    const m = line.match(/^(\s*)("[\w]+")\s*:\s*(".*?"|null|true|false|\d+)(,?)$/);
    if (m) {
      return (
        <div key={idx}>
          <span>{m[1]}</span>
          <span style={{ color: "#0550ae" }}>{m[2]}</span>
          <span style={{ color: "#24292f" }}>: </span>
          <span style={{ color: m[3] === '""' ? "#8c959f" : "#1a7f37" }}>{m[3]}</span>
          <span style={{ color: "#6e7781" }}>{m[4]}</span>
        </div>
      );
    }
    return <div key={idx} style={{ color: "#24292f" }}>{line}</div>;
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-visible">
      <table className="w-full text-sm" style={{ borderCollapse: "separate", borderSpacing: 0 }}>
        <thead>
          <tr style={{ backgroundColor: "#fafafa" }} className="border-b border-gray-100 text-xs text-gray-500">
            <th className="px-5 py-3 text-left" style={{ fontWeight: 600 }}>Version</th>
            <th
              className="px-5 py-3 text-left"
              style={{ fontWeight: 600 }}
              title="Timestamp when this version snapshot was created (UTC, mock)."
            >
              Created At
            </th>
            <th className="px-5 py-3 text-left" style={{ fontWeight: 600 }}>Created By</th>
            <th
              className="px-5 py-3 text-left"
              style={{ fontWeight: 600 }}
              title="Timestamp when this version was published to Online (mock)."
            >
              Published At
            </th>
            <th className="px-5 py-3 text-left" style={{ fontWeight: 600 }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {DEFAULT_VERSIONS.map((v) => (
            <tr key={v.version} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
              <td className="px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#1a1a2e" }}>{v.version}</span>
                  {v.isCurrent && (
                    <span className="px-1.5 py-0.5 rounded text-[10px]"
                      style={{ background: "rgba(19,194,194,0.10)", color: "#13c2c2", border: "1px solid rgba(19,194,194,0.25)", fontWeight: 600 }}>
                      Current
                    </span>
                  )}
                </div>
              </td>
              <td className="px-5 py-3.5 text-xs text-gray-500">{v.createdAt}</td>
              <td className="px-5 py-3.5 text-xs text-gray-600">{v.createdBy}</td>
              <td className="px-5 py-3.5 text-xs text-gray-500">{v.publishedAt}</td>
              <td className="px-5 py-3.5">
                <div className="flex items-center gap-2">
                  {/* Details — trigger + tooltip both cancel the hide timer on hover */}
                  <div
                    className="relative"
                    onMouseEnter={() => showTooltip(v.version)}
                    onMouseLeave={scheduleHide}
                  >
                    <button
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded border border-gray-200 text-gray-600 hover:border-teal-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"
                      style={{ fontWeight: 500 }}
                    >
                      <Info size={11} />
                      Details
                    </button>

                    {hovered === v.version && (
                      <div
                        className="absolute z-50 rounded-xl overflow-hidden"
                        style={{
                          bottom: "calc(100% + 8px)",
                          left: 0,
                          minWidth: 380,
                          background: "#ffffff",
                          border: "1px solid #d0d7de",
                          boxShadow: "0 8px 24px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.06)",
                        }}
                        onMouseEnter={() => showTooltip(v.version)}
                        onMouseLeave={scheduleHide}
                      >
                        {/* Toolbar */}
                        <div
                          className="flex items-center justify-between px-4 py-2"
                          style={{ background: "#f6f8fa", borderBottom: "1px solid #d0d7de" }}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xs" style={{ color: "#57606a", fontFamily: "monospace" }}>
                              config.json
                            </span>
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded"
                              style={{ background: "rgba(19,194,194,0.10)", color: "#0e9494", border: "1px solid rgba(19,194,194,0.22)", fontWeight: 700 }}
                            >
                              {v.version}
                            </span>
                          </div>
                          <button
                            onClick={(e) => handleCopy(v, e)}
                            className="flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-all"
                            style={{
                              color: copied === v.version ? "#1a7f37" : "#57606a",
                              background: copied === v.version ? "rgba(26,127,55,0.08)" : "transparent",
                              border: `1px solid ${copied === v.version ? "rgba(26,127,55,0.3)" : "#d0d7de"}`,
                              fontWeight: 500,
                            }}
                          >
                            {copied === v.version
                              ? <><Check size={10} /> Copied!</>
                              : <><Copy size={10} /> Copy</>
                            }
                          </button>
                        </div>

                        {/* Code area */}
                        <pre
                          style={{
                            fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
                            fontSize: 11.5,
                            lineHeight: 1.75,
                            margin: 0,
                            padding: "12px 16px",
                            maxHeight: 340,
                            overflowY: "auto",
                            background: "#ffffff",
                            color: "#24292f",
                          }}
                        >
                          {buildJsonText(v.config).split("\n").map((line, i) => renderLine(line, i))}
                        </pre>

                        {/* Downward arrow */}
                        <div
                          className="absolute"
                          style={{
                            width: 10, height: 10,
                            bottom: -6, left: 22,
                            transform: "rotate(45deg)",
                            background: "#ffffff",
                            borderRight: "1px solid #d0d7de",
                            borderBottom: "1px solid #d0d7de",
                          }}
                        />
                      </div>
                    )}
                  </div>

                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Detail Tab Section ───────────────────────────────────────────────────────
type DetailTab = "features" | "lineage" | "dqc" | "versions";

const DETAIL_TABS: { key: DetailTab; label: string }[] = [
  { key: "features", label: "Feature List" },
  { key: "lineage",  label: "Used By"                     },
  { key: "dqc",      label: "Offline DQC"                 },
  { key: "versions", label: "Versions"                  },
];

function DetailTabSection({ fg }: { fg: FeatureGroup }) {
  const [active, setActive] = useState<DetailTab>("features");

  return (
    <div>
      {/* Tab bar */}
      <div className="flex items-center border-b border-gray-200 -mx-0 mb-4">
        {DETAIL_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActive(tab.key)}
            className={`px-4 py-2.5 text-sm border-b-2 -mb-px transition-colors ${
              active === tab.key
                ? "border-teal-500 text-teal-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
            style={{ fontWeight: active === tab.key ? 600 : 400 }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {active === "features" && <FeatureListTab fg={fg} />}
      {active === "lineage"  && <LineageTab />}
      {active === "dqc"      && <OfflineDQCTab />}
      {active === "versions" && <VersionHistoryTab />}
    </div>
  );
}
