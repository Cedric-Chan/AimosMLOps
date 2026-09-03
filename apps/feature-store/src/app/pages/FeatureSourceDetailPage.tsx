/** FS Detail Page (v2) — 独立路由 /fs/:id
 *  See docs/design/10-feature-source/interaction-spec.md §13-§18.
 */
import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router";
import {
  ChevronRight,
  RefreshCw,
  ExternalLink,
  AlertCircle,
  Database,
  Zap,
  Globe,
  Table2,
} from "lucide-react";
import { findDpsForFs } from "@/data/mockDataPipelines";
import type { DataPipeline, PipelineHealthState } from "@/data/dataPipelines";

type TabKey = "config" | "upstream" | "usedby" | "versions";

const TAB_LABEL: Record<TabKey, string> = {
  config: "Config",
  upstream: "Upstream Data Pipelines",
  usedby: "Used By",
  versions: "Versions & Audit",
};

const SOURCE_TYPE_ICON: Record<string, JSX.Element> = {
  HBASE: <Database className="w-4 h-4 text-indigo-500" />,
  REDIS: <Database className="w-4 h-4 text-rose-500" />,
  GRPC: <Zap className="w-4 h-4 text-amber-500" />,
  GRAPHDB: <Globe className="w-4 h-4 text-violet-500" />,
  HIVE: <Table2 className="w-4 h-4 text-teal-500" />,
};

const HEALTH_BADGE: Record<PipelineHealthState, { label: string; cls: string }> = {
  Healthy: { label: "✓ Healthy", cls: "bg-teal-50 text-teal-700 border-teal-200" },
  InSync: { label: "✓ In Sync", cls: "bg-teal-50 text-teal-700 border-teal-200" },
  Stale: { label: "Stale", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  SyncFailed: { label: "Sync failed", cls: "bg-red-50 text-red-700 border-red-200" },
  Frozen: { label: "Frozen", cls: "bg-gray-100 text-gray-600 border-gray-300" },
  Ignored: { label: "Ignored", cls: "bg-slate-100 text-slate-600 border-slate-300" },
};

/** Mock FS metadata lookup. Real impl will read from FS list mock. */
function getFsMetaById(id: string) {
  const map: Record<string, { name: string; sourceType: string; owner: string; desc: string; mockDpFsKey: string }> = {
    // Stable IDs (used by direct nav from FS list once we map row.id → fs-{type}-001)
    "fs-hbase-001":   { name: "online:user_tx",        sourceType: "HBASE",   owner: "cedric.chencan", desc: "User transaction online HBase store",          mockDpFsKey: "fs-hbase-001" },
    "fs-grpc-001":    { name: "credit-bureau-api",     sourceType: "GRPC",    owner: "huangwei",       desc: "3rd-party credit bureau gRPC endpoint",         mockDpFsKey: "fs-grpc-001" },
    "fs-redis-001":   { name: "user:status",            sourceType: "REDIS",   owner: "marco.diaz",     desc: "User status Redis cache",                       mockDpFsKey: "fs-redis-001" },
    "fs-graphdb-001": { name: "user_phone_graph",       sourceType: "GRAPHDB", owner: "rini.kusuma",    desc: "Phone relation graph (Nebula)",                 mockDpFsKey: "fs-graphdb-001" },
    "fs-hive-001":    { name: "dwd.user_tx_features",   sourceType: "HIVE",    owner: "dw-team",        desc: "User TX features Hive table (training source)", mockDpFsKey: "fs-hive-001" },
    // v1 FS list row IDs (1-4) — also navigable for Demo
    "1": { name: "credit_hbase_user_risk", sourceType: "HBASE",   owner: "cedric.chencan", desc: "Credit HBase user risk score (v1 mock row)",       mockDpFsKey: "fs-hbase-001" },
    "2": { name: "acard_grpc_realtime",    sourceType: "GRPC",    owner: "huangwei",       desc: "ACard gRPC realtime endpoint (v1 mock row)",       mockDpFsKey: "fs-grpc-001" },
    "3": { name: "dp_redis_recommend",     sourceType: "REDIS",   owner: "marco.diaz",     desc: "Recommend DP Redis cache (v1 mock row)",           mockDpFsKey: "fs-redis-001" },
    "4": { name: "user_graph_nebula",      sourceType: "GRAPHDB", owner: "rini.kusuma",    desc: "User relation GraphDB Nebula (v1 mock row)",       mockDpFsKey: "fs-graphdb-001" },
  };
  return map[id];
}

export function FeatureSourceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabKey>("config");
  const fs = id ? getFsMetaById(id) : undefined;

  if (!fs) {
    return (
      <div className="px-8 py-10">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-800">
          <AlertCircle className="w-5 h-5 inline-block mr-2" />
          Feature Source not found. <Link to="/fs" className="underline">Back to list</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="px-8 py-6 max-w-[1200px] mx-auto">
      {/* Breadcrumb */}
      <nav className="text-xs text-gray-500 flex items-center gap-1.5 mb-4">
        <Link to="/fs" className="hover:text-teal-600">Feature Source</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-gray-700">{fs.name}</span>
      </nav>

      {/* Header */}
      <header className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center shrink-0">
              {SOURCE_TYPE_ICON[fs.sourceType] ?? <Database className="w-4 h-4 text-gray-400" />}
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold text-gray-900 truncate">{fs.name}</h1>
              <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-3">
                <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-600 font-medium">{fs.sourceType}</span>
                <span>Owner: {fs.owner}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-600 hover:border-teal-300 hover:text-teal-600 transition flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh lineage
            </button>
            <button className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-600 hover:border-teal-300 hover:text-teal-600 transition">
              Edit
            </button>
            <button onClick={() => navigate(-1)} className="px-3 py-1.5 text-xs rounded-lg text-gray-500 hover:text-gray-800 transition">
              Back
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">{fs.desc}</p>
      </header>

      {/* Tabs */}
      <nav className="flex gap-1 mb-4 border-b border-gray-200">
        {(Object.keys(TAB_LABEL) as TabKey[]).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
              tab === k
                ? "text-teal-600 border-teal-500"
                : "text-gray-500 border-transparent hover:text-gray-700"
            }`}
          >
            {TAB_LABEL[k]}
          </button>
        ))}
      </nav>

      {/* Tab content */}
      <main className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 min-h-[400px]">
        {tab === "config" && <ConfigTab fsId={id!} sourceType={fs.sourceType} />}
        {tab === "upstream" && <UpstreamDpTab fsId={fs.mockDpFsKey} />}
        {tab === "usedby" && <UsedByTab fsId={fs.mockDpFsKey} />}
        {tab === "versions" && <VersionsTab fsId={fs.mockDpFsKey} />}
      </main>
    </div>
  );
}

function ConfigTab({ fsId, sourceType }: { fsId: string; sourceType: string }) {
  const isHive = sourceType === "HIVE";
  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-gray-700">Configuration</h2>
      <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-xs">
        <Field label="FS ID" value={fsId} />
        <Field label="Source Type" value={sourceType} />
        {isHive ? (
          <>
            <Field label="Metastore Catalog" value="hive_default" />
            <Field label="Database" value="dwd" />
            <Field label="Table" value="user_tx_features" />
            <Field label="Partition Keys" value="ds" />
            <Field label="Last Schema Sync" value="2026-05-12 02:14" />
            <Field label="Column Inventory" value="4 columns (synced)" />
          </>
        ) : (
          <>
            <Field label="Data Server" value="reg_sg" />
            <Field label="Connection" value="{endpoint}/{namespace}" />
            <Field label="Call Function" value="HBaseScan / RedisCall / etc." />
          </>
        )}
      </div>
      {isHive && (
        <div className="mt-4 px-4 py-2 rounded-lg bg-teal-50 border border-teal-100 text-xs text-teal-800">
          <Table2 className="w-3.5 h-3.5 inline-block mr-1.5" />
          HIVE Source — schema column inventory auto-synced from Hive metastore. Used by FG Training Config.
        </div>
      )}
    </div>
  );
}

function UpstreamDpTab({ fsId }: { fsId: string }) {
  const dps = findDpsForFs(fsId);
  if (dps.length === 0) {
    return (
      <div className="text-center text-sm text-gray-400 py-12">
        No upstream Data Pipelines found in DataVerse.
        <div className="mt-2 text-xs">[+ Add fallback (unverified)]</div>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">Upstream Data Pipelines ({dps.length})</h2>
        <div className="flex items-center gap-2">
          <button className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-teal-300 hover:text-teal-600 transition flex items-center gap-1.5">
            <RefreshCw className="w-3 h-3" /> Refresh lineage
          </button>
        </div>
      </div>
      <div className="space-y-3">
        {dps.map((dp) => (
          <DpCard key={dp.id} dp={dp} />
        ))}
      </div>
    </div>
  );
}

function DpCard({ dp }: { dp: DataPipeline }) {
  const badge = HEALTH_BADGE[dp.state];
  const isStream = dp.pipelineType === "FlinkStream";
  return (
    <div className="rounded-lg border border-gray-200 p-4 hover:border-teal-300 transition">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${isStream ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"}`}>
              {dp.pipelineType}
            </span>
            <span className="text-sm font-medium text-gray-800">{dp.name}</span>
          </div>
          <div className="text-[11px] text-gray-500 mt-1">
            Inputs: {dp.inputAssets.map((a) => a.name).join(" · ")}
          </div>
          <div className="text-[11px] text-gray-500 mt-1">
            Output: <code className="bg-gray-100 px-1.5 py-0.5 rounded">{dp.outputAsset.name}</code>
          </div>
          <div className="text-[11px] text-gray-500 mt-1">
            Owner: {dp.ownerTeam} · Schedule: <code>{dp.upstreamSchedule}</code>
            {dp.lastSuccessAt && <> · Last success: {dp.lastSuccessAt}</>}
            {dp.lag && <> · lag {dp.lag}</>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-[10px] px-2 py-0.5 rounded border ${badge.cls}`}>{badge.label}</span>
          <a
            href={dp.taskUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-teal-600 hover:text-teal-700 flex items-center gap-1"
          >
            View in DataVerse <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}

function UsedByTab({ fsId: _fsId }: { fsId: string }) {
  // Placeholder: would query FG list for FSes referenced in Training/Serving Config.
  const mockRefs = [
    { fgId: "user_tx_features", owner: "cedric.chencan", region: "TH", refType: "Training Config" },
    { fgId: "tx_serving_pack", owner: "huangwei", region: "SG", refType: "Serving Config" },
  ];
  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-gray-700">Used By Feature Groups ({mockRefs.length})</h2>
      <table className="w-full text-xs">
        <thead className="bg-gray-50 text-gray-500">
          <tr>
            <th className="text-left px-3 py-2 font-medium">Feature Group</th>
            <th className="text-left px-3 py-2 font-medium">Reference Type</th>
            <th className="text-left px-3 py-2 font-medium">Owner</th>
            <th className="text-left px-3 py-2 font-medium">Region</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {mockRefs.map((r) => (
            <tr key={r.fgId} className="hover:bg-gray-50">
              <td className="px-3 py-2.5">
                <Link to={`/fg/${r.fgId}`} className="text-teal-600 hover:underline">
                  {r.fgId}
                </Link>
              </td>
              <td className="px-3 py-2.5 text-gray-600">{r.refType}</td>
              <td className="px-3 py-2.5 text-gray-600">{r.owner}</td>
              <td className="px-3 py-2.5">
                <span className="px-1.5 py-0.5 text-[10px] rounded bg-indigo-50 text-indigo-600">{r.region}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-[11px] text-gray-400 mt-2">
        Mock data — real impl will reverse-lookup from FG.trainingConfig.fsHiveId / serving canvas FS refs.
      </p>
    </div>
  );
}

function VersionsTab({ fsId: _fsId }: { fsId: string }) {
  const mockVersions = [
    { v: "v3", changed: "outputParams[2]", actor: "cedric.chencan", ts: "2026-05-12 11:20" },
    { v: "v2", changed: "Region.MY", actor: "huangwei", ts: "2026-04-28 09:10" },
    { v: "v1", changed: "(initial)", actor: "system", ts: "2026-04-01 00:00" },
  ];
  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-gray-700">Versions ({mockVersions.length})</h2>
      <table className="w-full text-xs">
        <thead className="bg-gray-50 text-gray-500">
          <tr>
            <th className="text-left px-3 py-2 font-medium">Version</th>
            <th className="text-left px-3 py-2 font-medium">Changed Fields</th>
            <th className="text-left px-3 py-2 font-medium">Author</th>
            <th className="text-left px-3 py-2 font-medium">Timestamp</th>
            <th className="text-left px-3 py-2 font-medium">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {mockVersions.map((v) => (
            <tr key={v.v} className="hover:bg-gray-50">
              <td className="px-3 py-2.5 font-mono text-gray-700">{v.v}</td>
              <td className="px-3 py-2.5 text-gray-600">{v.changed}</td>
              <td className="px-3 py-2.5 text-gray-600">{v.actor}</td>
              <td className="px-3 py-2.5 text-gray-500">{v.ts}</td>
              <td className="px-3 py-2.5">
                <button className="text-teal-600 hover:underline">View diff</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">{label}</div>
      <div className="text-gray-800 font-mono text-[11px] break-all">{value}</div>
    </div>
  );
}
