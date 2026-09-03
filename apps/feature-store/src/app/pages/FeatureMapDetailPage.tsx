/** FeatureMap Detail Page (v2) — 独立路由 /fm/feature/:fqid
 *  See docs/design/40-feature-map/v2-spec.md §4 + feature-map-interaction-spec.md §7-§8.
 */
import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router";
import {
  ChevronRight,
  ExternalLink,
  AlertCircle,
  ArrowDown,
  Table2,
  Database,
  Zap,
  Globe,
  Cpu,
  History,
  User as UserIcon,
} from "lucide-react";
import { parseFqid, fgFeatureDeepLink, fgDetailLink, fsDetailLink } from "@/lib/links";
import { MOCK_DATA_PIPELINES } from "@/data/mockDataPipelines";

type TabKey = "logic" | "lineage" | "owner" | "history";

const TAB_LABEL: Record<TabKey, { label: string; icon: JSX.Element }> = {
  logic: { label: "Logic", icon: <Cpu className="w-3.5 h-3.5" /> },
  lineage: { label: "Lineage", icon: <ArrowDown className="w-3.5 h-3.5" /> },
  owner: { label: "Owner", icon: <UserIcon className="w-3.5 h-3.5" /> },
  history: { label: "Update History", icon: <History className="w-3.5 h-3.5" /> },
};

/** Mock feature catalog. Demo subset. */
const FEATURE_CATALOG: Record<
  string,
  {
    name: string;
    fgId: string;
    fgName: string;
    dataType: string;
    availability: { training: boolean; serving: boolean };
    source: "MAPPED" | "CUSTOM";
    consistencyStatus: "pending" | "attested" | "drift_detected" | "na";
    consistencyNote?: string;
    attestedBy?: string;
    attestedAt?: string;
    upstreamDpIds: string[];
    onlineStoreFsId?: string;
    offlineSourceFsId?: string;
    region: string;
    owner: string;
    biz: string;
  }
> = {
  "user_tx_features.credit_amount_30d": {
    name: "credit_amount_30d",
    fgId: "user_tx_features",
    fgName: "user_tx_features",
    dataType: "DECIMAL(18,2)",
    availability: { training: true, serving: true },
    source: "MAPPED",
    consistencyStatus: "attested",
    consistencyNote: "30d 滑窗 SUM(credit_amount), UTC+8 日期对齐",
    attestedBy: "cedric.chencan@seamoney.com",
    attestedAt: "2026-05-12 14:30:21",
    upstreamDpIds: ["dp-tx-spark", "dp-tx-flink"],
    onlineStoreFsId: "fs-hbase-001",
    offlineSourceFsId: "fs-hive-001",
    region: "TH · SG",
    owner: "cedric.chencan@seamoney.com",
    biz: "DataSci",
  },
  "user_profile_features.user_status": {
    name: "user_status",
    fgId: "user_profile_features",
    fgName: "user_profile_features",
    dataType: "ENUM",
    availability: { training: true, serving: true },
    source: "MAPPED",
    consistencyStatus: "pending",
    upstreamDpIds: ["dp-status-flink"],
    onlineStoreFsId: "fs-redis-001",
    region: "TH",
    owner: "marco.diaz@seamoney.com",
    biz: "PolicyBuyer",
  },
};

const PIPELINE_TYPE_LABEL: Record<string, string> = {
  FlinkStream: "Flink Stream",
  SparkBatch: "Spark Batch",
  Dbt: "dbt",
  AirflowDAG: "Airflow DAG",
};

const FS_ICON: Record<string, JSX.Element> = {
  HBASE: <Database className="w-4 h-4 text-indigo-500" />,
  REDIS: <Database className="w-4 h-4 text-rose-500" />,
  GRPC: <Zap className="w-4 h-4 text-amber-500" />,
  GRAPHDB: <Globe className="w-4 h-4 text-violet-500" />,
  HIVE: <Table2 className="w-4 h-4 text-teal-500" />,
};

function fsMeta(fsId: string) {
  const map: Record<string, { name: string; sourceType: string }> = {
    "fs-hbase-001": { name: "online:user_tx", sourceType: "HBASE" },
    "fs-grpc-001": { name: "credit-bureau-api", sourceType: "GRPC" },
    "fs-redis-001": { name: "user:status", sourceType: "REDIS" },
    "fs-graphdb-001": { name: "user_phone_graph", sourceType: "GRAPHDB" },
    "fs-hive-001": { name: "dwd.user_tx_features", sourceType: "HIVE" },
  };
  return map[fsId];
}

export function FeatureMapDetailPage() {
  const { fqid } = useParams<{ fqid: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabKey>("logic");

  const parsed = fqid ? parseFqid(fqid) : null;
  const feat = parsed ? FEATURE_CATALOG[`${parsed.fgId}.${parsed.featureName}`] : undefined;

  if (!feat || !parsed) {
    return (
      <div className="px-8 py-10">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-800">
          <AlertCircle className="w-5 h-5 inline-block mr-2" />
          Feature not found. <Link to="/fm" className="underline">Back to Feature Map</Link>
          {fqid && <div className="text-xs mt-1 text-amber-600">FQID: <code>{fqid}</code></div>}
        </div>
      </div>
    );
  }

  return (
    <div className="px-8 py-6 max-w-[1200px] mx-auto">
      <nav className="text-xs text-gray-500 flex items-center gap-1.5 mb-4">
        <Link to="/fm" className="hover:text-teal-600">Feature Store</Link>
        <ChevronRight className="w-3 h-3" />
        <Link to="/fm" className="hover:text-teal-600">Feature Map</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-gray-700 font-mono">{feat.name}</span>
      </nav>

      <header className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-gray-900 font-mono">{feat.name}</h1>
              <AvailabilityBadges feat={feat} />
              <ConsistencyBadge status={feat.consistencyStatus} />
            </div>
            <div className="text-xs text-gray-500 mt-1.5 flex items-center gap-3 flex-wrap">
              <span>belongs to FG:</span>
              <Link to={fgDetailLink(feat.fgId)} className="text-teal-600 hover:underline font-medium">
                {feat.fgName} ↗
              </Link>
              <span className="text-gray-300">·</span>
              <span>{feat.owner}</span>
              <span className="text-gray-300">·</span>
              <span>Region: {feat.region}</span>
              {feat.attestedAt && (
                <>
                  <span className="text-gray-300">·</span>
                  <span>Last update: {feat.attestedAt}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => navigate(fgFeatureDeepLink(feat.fgId, feat.name))}
              className="px-3 py-1.5 text-xs rounded-lg bg-teal-500 text-white hover:bg-teal-600 transition flex items-center gap-1.5"
            >
              Edit in FG <ExternalLink className="w-3 h-3" />
            </button>
            <button onClick={() => navigate(-1)} className="px-3 py-1.5 text-xs rounded-lg text-gray-500 hover:text-gray-800 transition">
              Back
            </button>
          </div>
        </div>
      </header>

      <nav className="flex gap-1 mb-4 border-b border-gray-200">
        {(Object.keys(TAB_LABEL) as TabKey[]).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition flex items-center gap-1.5 ${
              tab === k
                ? "text-teal-600 border-teal-500"
                : "text-gray-500 border-transparent hover:text-gray-700"
            }`}
          >
            {TAB_LABEL[k].icon}
            {TAB_LABEL[k].label}
          </button>
        ))}
      </nav>

      <main className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 min-h-[400px]">
        {tab === "logic" && <LogicTab feat={feat} />}
        {tab === "lineage" && <LineageTab feat={feat} />}
        {tab === "owner" && <OwnerTab feat={feat} />}
        {tab === "history" && <HistoryTab />}
      </main>
    </div>
  );
}

function AvailabilityBadges({ feat }: { feat: { availability: { training: boolean; serving: boolean } } }) {
  const { training, serving } = feat.availability;
  if (training && serving) return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700">T + S</span>;
  if (training) return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-green-50 text-green-700">T only</span>;
  if (serving) return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700">S only</span>;
  return null;
}

function ConsistencyBadge({ status }: { status: string }) {
  const cfg: Record<string, { label: string; cls: string }> = {
    pending: { label: "Pending", cls: "bg-gray-100 text-gray-600 border-gray-200" },
    attested: { label: "Attested ✓", cls: "bg-teal-50 text-teal-700 border-teal-200" },
    drift_detected: { label: "Drift ✗", cls: "bg-red-50 text-red-700 border-red-200" },
    na: { label: "—", cls: "bg-transparent text-gray-300 border-transparent" },
  };
  const c = cfg[status] ?? cfg.na;
  if (status === "na") return null;
  return (
    <span className={`px-2 py-0.5 rounded border text-[10px] font-medium ${c.cls}`}>
      {c.label}
    </span>
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function LogicTab({ feat }: { feat: any }) {
  const offlineDp = feat.upstreamDpIds.map((id: string) => MOCK_DATA_PIPELINES.find((d) => d.id === id)).find((d: any) => d?.pipelineType === "SparkBatch" || d?.pipelineType === "Dbt" || d?.pipelineType === "AirflowDAG");
  const onlineDps = feat.upstreamDpIds.map((id: string) => MOCK_DATA_PIPELINES.find((d) => d.id === id)).filter((d: any) => d?.pipelineType === "FlinkStream" || d?.pipelineType === "SparkBatch");
  const offlineFs = feat.offlineSourceFsId ? fsMeta(feat.offlineSourceFsId) : null;
  const onlineFs = feat.onlineStoreFsId ? fsMeta(feat.onlineStoreFsId) : null;

  return (
    <div className="space-y-4">
      {feat.availability.training && (
        <div className="rounded-lg border border-gray-200 p-4">
          <div className="text-[11px] uppercase tracking-wider text-blue-700 font-semibold mb-2">Offline ref</div>
          {offlineFs && (
            <div className="text-xs text-gray-700 mb-1.5">
              <span className="text-gray-500">Hive column: </span>
              <code className="bg-gray-100 px-1.5 py-0.5 rounded">{offlineFs.name}.{feat.name}</code>
              <Link to={fsDetailLink(feat.offlineSourceFsId)} className="ml-2 text-teal-600 hover:underline text-[11px]">View FS detail ↗</Link>
            </div>
          )}
          {offlineDp && (
            <div className="text-xs text-gray-700">
              <span className="text-gray-500">Upstream Source Pipeline: </span>
              <span className="font-medium">{PIPELINE_TYPE_LABEL[offlineDp.pipelineType]} · {offlineDp.name}</span>
              <span className="text-[10px] text-gray-400 ml-2">Last success: {offlineDp.lastSuccessAt}</span>
              <a href={offlineDp.taskUrl} target="_blank" rel="noreferrer" className="ml-2 text-teal-600 hover:underline text-[11px]">View in DataVerse ↗</a>
            </div>
          )}
        </div>
      )}

      {feat.availability.serving && (
        <div className="rounded-lg border border-gray-200 p-4">
          <div className="text-[11px] uppercase tracking-wider text-amber-700 font-semibold mb-2">Online ref</div>
          {onlineDps.length > 0 && (
            <div className="text-xs text-gray-700 mb-2">
              <span className="text-gray-500">Pre-compute Source(s):</span>
              <ul className="mt-1 ml-3 space-y-1">
                {onlineDps.map((dp: any) => (
                  <li key={dp.id} className="flex items-center gap-2">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-medium">
                      {PIPELINE_TYPE_LABEL[dp.pipelineType]}
                    </span>
                    <span className="font-mono text-[11px]">{dp.name}</span>
                    {dp.lag && <span className="text-[10px] text-gray-400">lag {dp.lag}</span>}
                    <a href={dp.taskUrl} target="_blank" rel="noreferrer" className="text-teal-600 hover:underline text-[11px]">↗</a>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {onlineFs && (
            <div className="text-xs text-gray-700 mb-1.5">
              <span className="text-gray-500">Online Store: </span>
              <span className="inline-flex items-center gap-1">
                {FS_ICON[onlineFs.sourceType] ?? null}
                <code className="bg-gray-100 px-1.5 py-0.5 rounded">{onlineFs.name}</code>
              </span>
              <Link to={fsDetailLink(feat.onlineStoreFsId)} className="ml-2 text-teal-600 hover:underline text-[11px]">View FS detail ↗</Link>
            </div>
          )}
          <div className="text-xs text-gray-700">
            <span className="text-gray-500">Read-time Compute: </span>
            <span>Serving Canvas — node-graph aggregate</span>
            <Link to={`/fg/${feat.fgId}/serving`} className="ml-2 text-teal-600 hover:underline text-[11px]">Open Serving Canvas ↗</Link>
          </div>
        </div>
      )}

      {feat.availability.training && feat.availability.serving && (
        <div className="rounded-lg border border-gray-200 p-4">
          <div className="text-[11px] uppercase tracking-wider text-purple-700 font-semibold mb-2">Consistency Attestation</div>
          {feat.consistencyStatus === "attested" ? (
            <>
              <div className="text-xs text-gray-700 mb-1">Status: <span className="inline-block px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 text-[10px] font-medium">Attested ✓</span></div>
              <div className="text-xs text-gray-700 mb-1">Note: <span className="text-gray-600">"{feat.consistencyNote}"</span></div>
              <div className="text-[11px] text-gray-500">By: <span className="font-mono">{feat.attestedBy}</span></div>
              <div className="text-[11px] text-gray-500">At: <span className="font-mono">{feat.attestedAt}</span></div>
            </>
          ) : (
            <div className="text-xs text-gray-500">Status: <span className="inline-block px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 text-[10px] font-medium">Pending</span></div>
          )}
          <div className="text-[10px] text-gray-400 mt-2">※ Read-only here. To re-attest, click "Edit in FG ↗" in header.</div>
        </div>
      )}
    </div>
  );
}

function LineageTab({ feat }: { feat: any }) {
  const upstreamDps = feat.upstreamDpIds.map((id: string) => MOCK_DATA_PIPELINES.find((d) => d.id === id)).filter(Boolean);
  const offlineFs = feat.offlineSourceFsId ? fsMeta(feat.offlineSourceFsId) : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-semibold text-gray-700">Lineage (1-hop)</h2>
        <a
          href={`https://dataverse.example.com/lineage/${feat.upstreamDpIds[0] ?? ""}`}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-teal-600 hover:underline flex items-center gap-1"
        >
          View full lineage in DataVerse <ExternalLink className="w-3 h-3" />
        </a>
      </div>
      <p className="text-[10px] text-gray-400">
        Deeper lineage lives in DataVerse. Click any node below to inspect it.
      </p>

      <div className="rounded-lg border border-amber-200 bg-amber-50/30 p-4">
        <div className="text-[10px] uppercase tracking-wider text-amber-700 font-semibold mb-2">
          Upstream Data Pipeline{upstreamDps.length > 1 ? `s (${upstreamDps.length})` : ""}
        </div>
        <div className="space-y-2">
          {upstreamDps.map((dp: any) => (
            <div key={dp.id} className="bg-white rounded border border-amber-100 p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-medium">
                  {PIPELINE_TYPE_LABEL[dp.pipelineType]}
                </span>
                <span className="text-sm font-medium text-gray-800">{dp.name}</span>
                <span className="text-[10px] text-gray-400 font-mono">{dp.dataverseId}</span>
              </div>
              <div className="text-[11px] text-gray-500">Inputs: {dp.inputAssets.map((a: any) => a.name).join(" · ")}</div>
              <div className="text-[11px] text-gray-500">Owner: {dp.ownerTeam} · Last success: {dp.lastSuccessAt ?? "—"}</div>
              <div className="mt-1">
                <a href={dp.taskUrl} target="_blank" rel="noreferrer" className="text-[11px] text-teal-600 hover:underline">
                  View in DataVerse ↗
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-center text-gray-300">
        <ArrowDown size={20} />
      </div>

      <div className="rounded-lg border border-indigo-200 bg-indigo-50/30 p-4">
        <div className="text-[10px] uppercase tracking-wider text-indigo-700 font-semibold mb-2">
          Feature Source
        </div>
        <div className="bg-white rounded border border-indigo-100 p-3">
          {offlineFs ? (
            <>
              <div className="flex items-center gap-2 mb-1">
                {FS_ICON[offlineFs.sourceType] ?? null}
                <span className="text-sm font-medium text-gray-800">{offlineFs.name}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700">{offlineFs.sourceType}</span>
              </div>
              <div className="text-[11px] text-gray-500">
                Output column: <code className="bg-gray-100 px-1.5 py-0.5 rounded">{feat.name}</code> ({feat.dataType})
              </div>
              <div className="mt-1">
                <Link to={fsDetailLink(feat.offlineSourceFsId)} className="text-[11px] text-teal-600 hover:underline">
                  View FS detail ↗
                </Link>
              </div>
            </>
          ) : (
            <div className="text-xs text-gray-400 italic">No upstream FS (direct external source).</div>
          )}
        </div>
      </div>

      <div className="flex justify-center text-gray-300">
        <ArrowDown size={20} />
      </div>

      <div className="rounded-lg border border-purple-200 bg-purple-50/30 p-4">
        <div className="text-[10px] uppercase tracking-wider text-purple-700 font-semibold mb-2">
          Feature
        </div>
        <div className="bg-white rounded border border-purple-100 p-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-gray-800 font-mono">{feat.name}</span>
            <AvailabilityBadges feat={feat} />
            <ConsistencyBadge status={feat.consistencyStatus} />
          </div>
          <div className="text-[11px] text-gray-500">
            in FG: <Link to={fgDetailLink(feat.fgId)} className="text-teal-600 hover:underline">{feat.fgName}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function OwnerTab({ feat }: { feat: any }) {
  return (
    <div className="space-y-3 text-xs">
      <h2 className="text-sm font-semibold text-gray-700 mb-3">Owner & Stewardship</h2>
      <Row label="FG Owner(s)" value={feat.owner} />
      <Row label="FG Biz Team" value={feat.biz} />
      <Row label="Region" value={feat.region} />
      {feat.attestedBy && <Row label="Last Attestation" value={`By ${feat.attestedBy} at ${feat.attestedAt}`} />}
      <div className="mt-4 pt-3 border-t border-gray-100">
        <div className="text-[11px] text-gray-500 mb-1.5">Upstream Data Pipeline Owners:</div>
        {feat.upstreamDpIds.map((id: string) => {
          const dp = MOCK_DATA_PIPELINES.find((d) => d.id === id);
          if (!dp) return null;
          return (
            <div key={id} className="text-[11px] text-gray-600 ml-3">
              · {PIPELINE_TYPE_LABEL[dp.pipelineType]} <span className="font-mono">{dp.name}</span> — {dp.ownerTeam}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HistoryTab() {
  const events = [
    { ts: "2026-05-12 14:30:21", event: "Consistency attested", actor: "cedric.chencan@seamoney.com", note: "30d 滑窗 SUM..." },
    { ts: "2026-05-10 09:15:03", event: "Description updated", actor: "huangwei@shopee.com", note: undefined as string | undefined },
    { ts: "2026-04-22 16:00:08", event: "Created (via FG sync)", actor: "system", note: "Pulled from FS-HIVE schema" },
  ];
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-gray-700">Update History (last 90 days)</h2>
      <ul className="space-y-3">
        {events.map((e, i) => (
          <li key={i} className="border-l-2 border-teal-200 pl-3 ml-1">
            <div className="text-[11px] text-gray-400 font-mono">{e.ts}</div>
            <div className="text-xs text-gray-800 font-medium">{e.event}</div>
            <div className="text-[11px] text-gray-500">by <span className="font-mono">{e.actor}</span></div>
            {e.note && <div className="text-[11px] text-gray-500 italic mt-0.5">Note: "{e.note}"</div>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex">
      <div className="w-32 text-[11px] text-gray-500">{label}:</div>
      <div className="text-gray-800 font-mono text-[11px]">{value}</div>
    </div>
  );
}
