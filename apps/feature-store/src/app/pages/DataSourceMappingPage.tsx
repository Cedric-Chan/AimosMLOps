import { useState, useEffect } from "react";
import {
  Search, ChevronRight, Plus, Database, Zap, Globe,
  ArrowRight, RotateCcw, ExternalLink, Pencil, Unlink, X,
  Loader2, CheckCircle2, XCircle, Mail, FlaskConical, Trash2,
  Clock, Users, UserPlus,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/app/components/ui/alert-dialog";

// ─── Types ────────────────────────────────────────────────────────────────────

type ConfigType = "offline" | "nearline" | "online";

interface OfflineConfig  { hiveServer: string; hiveSchema: string; hiveTable: string; customFilter?: string; status: "Healthy"|"Warning"|"Offline"; lastUpdated: string; }
interface NearlineConfig { kafkaServer: string; kafkaTopic: string; customFilter?: string; status: "Healthy"|"Warning"|"Offline"; lag: string; }
interface OnlineConfig   { featureSourceName: string; status: "Healthy"|"Warning"|"Offline"; protocol: "HTTP"|"gRPC"; }

interface DataSourceEntry {
  id: string; region: string; logicalName: string; description: string; updateTime: string;
  owners: string[];
  offline?: OfflineConfig; nearline?: NearlineConfig; online?: OnlineConfig;
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const INIT_DATA: DataSourceEntry[] = [
  { id:"ds-1", region:"ID",        logicalName:"user_risk_hbase_id",    description:"User risk score HBase data source for Indonesia",  updateTime:"2026-05-10 09:00",
    owners:["alice.wang@company.com", "bob.chen@company.com"],
    offline: { hiveServer:"Shopee SG", hiveSchema:"ods", hiveTable:"credit_user_id_binlog",      status:"Healthy", lastUpdated:"2h ago"  },
    nearline:{ kafkaServer:"risk_kafka", kafkaTopic:"kafka.credit_events_id",         status:"Healthy", lag:"320 ms"          } },
  { id:"ds-2", region:"TH",        logicalName:"user_risk_hbase_th",    description:"User risk score HBase data source for Thailand",    updateTime:"2026-05-09 14:30",
    owners:["alice.wang@company.com"],
    offline: { hiveServer:"Shopee SG", hiveSchema:"ods", hiveTable:"credit_user_th_binlog",       status:"Warning", lastUpdated:"6h ago"  },
    nearline:{ kafkaServer:"risk_kafka", kafkaTopic:"kafka.credit_events_th",          status:"Warning", lag:"4.2 min"         } },
  { id:"ds-3", region:"MX",        logicalName:"acard_feature_mx",      description:"ACard scoring feature data source for Mexico",      updateTime:"2026-05-11 18:00",
    owners:["carlos.li@company.com"],
    offline: { hiveServer:"Shopee US", hiveSchema:"ods", hiveTable:"acard_user_mx_binlog",        status:"Healthy", lastUpdated:"4h ago"  },
    nearline:{ kafkaServer:"di_kafka", kafkaTopic:"kafka.acard_events_mx",           status:"Healthy", lag:"85 ms"           },
    online:  { featureSourceName:"acard_grpc_mx_source",    status:"Healthy", protocol:"gRPC"       } },
  { id:"ds-4", region:"ID",        logicalName:"acard_feature_id",      description:"ACard scoring feature data source for Indonesia",   updateTime:"2026-05-08 11:00",
    owners:["carlos.li@company.com", "diana.xu@company.com"],
    offline: { hiveServer:"Shopee SG", hiveSchema:"ods", hiveTable:"acard_user_id_binlog",        status:"Healthy", lastUpdated:"3h ago"  },
    nearline:{ kafkaServer:"di_kafka", kafkaTopic:"kafka.acard_events_id",           status:"Offline", lag:"—"               } },
  { id:"ds-5", region:"SHOPEE_SG", logicalName:"recommend_behavior_sg", description:"Recommendation behavior data source for Shopee SG", updateTime:"2026-05-12 02:00",
    owners:["diana.xu@company.com"],
    offline: { hiveServer:"Shopee SG", hiveSchema:"ods", hiveTable:"user_behavior_sg_binlog",     status:"Healthy", lastUpdated:"2h ago"  },
    nearline:{ kafkaServer:"spp_di_kafka", kafkaTopic:"kafka.user_behavior_sg",          status:"Healthy", lag:"120 ms"          },
    online:  { featureSourceName:"recommend_http_sg_source", status:"Healthy", protocol:"HTTP"      } },
  { id:"ds-6", region:"TH",        logicalName:"graph_relation_th",     description:"Graph relation feature data source for Thailand",   updateTime:"2026-05-07 22:00",
    owners:["evan.park@company.com", "bob.chen@company.com"],
    offline: { hiveServer:"Shopee US", hiveSchema:"ods", hiveTable:"relation_events_th_binlog",   status:"Warning", lastUpdated:"8h ago"  },
    nearline:{ kafkaServer:"risk_kafka", kafkaTopic:"kafka.relation_events_th",         status:"Warning", lag:"4.2 min"         } },
];

const AVAILABLE_ONLINE_SOURCES: { name: string; protocol: "HTTP"|"gRPC" }[] = [
  { name: "credit_risk_hbase_source",    protocol: "gRPC" },
  { name: "acard_grpc_mx_source",        protocol: "gRPC" },
  { name: "acard_grpc_id_source",        protocol: "gRPC" },
  { name: "recommend_http_sg_source",    protocol: "HTTP" },
  { name: "recommend_http_th_source",    protocol: "HTTP" },
  { name: "graph_flink_stream_th",       protocol: "gRPC" },
];

const ALL_REGIONS = ["ID", "TH", "MX", "SG", "PH", "VN", "SHOPEE_SG", "SHOPEE_US", "BR"];

const HIVE_SERVERS = ["Shopee SG", "Shopee US"] as const;

const KNOWN_HIVE_TABLES = new Set([
  "ods.credit_user_id_binlog", "ods.credit_user_th_binlog", "ods.credit_user_mx_binlog",
  "ods.acard_user_mx_binlog",  "ods.acard_user_id_binlog",  "ods.acard_user_th_binlog",
  "ods.user_behavior_sg_binlog", "ods.relation_events_th_binlog",
  "dwd.user_profile_sg", "dwd.transaction_id_features", "dwd.acard_mx_features",
]);

interface HiveSchemaRow { col: string; type: string; sample: string; }

const HiveSchema: Record<string, HiveSchemaRow[]> = {
  "ods.credit_user_id_binlog": [
    { col: "user_id",       type: "STRING",     sample: '"100234567890"' },
    { col: "event_type",    type: "STRING",     sample: '"OVERDUE"' },
    { col: "amount",        type: "DECIMAL(18,2)", sample: "15000.00" },
    { col: "event_ts",      type: "TIMESTAMP",  sample: "2026-05-20 14:30:00" },
    { col: "channel",       type: "STRING",     sample: '"APP"' },
    { col: "dt",            type: "STRING",     sample: '"2026-05-20"' },
  ],
  "ods.credit_user_th_binlog": [
    { col: "user_id",       type: "STRING",     sample: '"TH00234890112"' },
    { col: "event_type",    type: "STRING",     sample: '"REPAY"' },
    { col: "amount",        type: "DECIMAL(18,2)", sample: "8500.50" },
    { col: "event_ts",      type: "TIMESTAMP",  sample: "2026-05-20 09:15:00" },
    { col: "dt",            type: "STRING",     sample: '"2026-05-20"' },
  ],
  "ods.acard_user_mx_binlog": [
    { col: "user_id",       type: "STRING",     sample: '"MX009992341"' },
    { col: "acard_txn_id",  type: "STRING",     sample: '"TXN_20260520_001"' },
    { col: "score_raw",     type: "FLOAT",      sample: "0.7845" },
    { col: "event_ts",      type: "TIMESTAMP",  sample: "2026-05-20 11:00:00" },
    { col: "dt",            type: "STRING",     sample: '"2026-05-20"' },
  ],
  "ods.acard_user_id_binlog": [
    { col: "user_id",       type: "STRING",     sample: '"ID005672341"' },
    { col: "acard_txn_id",  type: "STRING",     sample: '"TXN_20260520_099"' },
    { col: "score_raw",     type: "FLOAT",      sample: "0.6512" },
    { col: "event_ts",      type: "TIMESTAMP",  sample: "2026-05-20 08:45:00" },
    { col: "dt",            type: "STRING",     sample: '"2026-05-20"' },
  ],
};

function getHiveSchema(table: string): HiveSchemaRow[] | null {
  return HiveSchema[table] ?? null;
}


interface KafkaSchemaCol {
  field: string;
  type: string;
  sample: string;
  children?: KafkaSchemaCol[];
}

const KafkaTopicSchema: Record<string, KafkaSchemaCol[]> = {
  "kafka.credit_events_id": [
    { field: "event_id",      type: "STRING",  sample: '"evt_20260520_001"' },
    { field: "user_id",       type: "STRING",  sample: '"ID00123456789"' },
    { field: "event_type",    type: "STRING",  sample: '"OVERDUE"' },
    { field: "payload",       type: "STRUCT",  sample: "{...}",
      children: [
        { field: "amount",        type: "DECIMAL(18,2)", sample: "15000.00" },
        { field: "currency",      type: "STRING",        sample: '"IDR"' },
        { field: "channel",       type: "STRING",        sample: '"APP"' },
        { field: "device",        type: "STRUCT",        sample: "{...}",
          children: [
            { field: "device_id",     type: "STRING",  sample: '"DEV_XP9K2"' },
            { field: "os_type",       type: "STRING",  sample: '"iOS"' },
            { field: "app_version",   type: "STRING",  sample: '"4.12.0"' },
          ],
        },
      ],
    },
    { field: "event_ts",      type: "TIMESTAMP(3)", sample: "2026-05-20 14:30:00.123" },
    { field: "metadata",      type: "MAP<STRING,STRING>", sample: '{"region":"ID","ver":"2"}' },
  ],
  "kafka.credit_events_th": [
    { field: "event_id",      type: "STRING",  sample: '"evt_TH_20260520_042"' },
    { field: "user_id",       type: "STRING",  sample: '"TH00234890112"' },
    { field: "event_type",    type: "STRING",  sample: '"REPAY"' },
    { field: "payload",       type: "STRUCT",  sample: "{...}",
      children: [
        { field: "amount",        type: "DECIMAL(18,2)", sample: "8500.50" },
        { field: "currency",      type: "STRING",        sample: '"THB"' },
        { field: "channel",       type: "STRING",        sample: '"WEB"' },
      ],
    },
    { field: "event_ts",      type: "TIMESTAMP(3)", sample: "2026-05-20 09:15:00.456" },
  ],
  "kafka.acard_events_mx": [
    { field: "event_id",      type: "STRING",  sample: '"acard_mx_evt_099"' },
    { field: "user_id",       type: "STRING",  sample: '"MX009992341"' },
    { field: "acard_txn",     type: "STRUCT",  sample: "{...}",
      children: [
        { field: "txn_id",        type: "STRING",        sample: '"TXN_20260520_001"' },
        { field: "score_raw",     type: "FLOAT",         sample: "0.7845" },
        { field: "decision",      type: "STRING",        sample: '"APPROVE"' },
        { field: "limit_amount",  type: "DECIMAL(18,2)", sample: "50000.00" },
      ],
    },
    { field: "event_ts",      type: "TIMESTAMP(3)", sample: "2026-05-20 11:00:00.000" },
  ],
  "kafka.acard_events_id": [
    { field: "event_id",      type: "STRING",  sample: '"acard_id_evt_012"' },
    { field: "user_id",       type: "STRING",  sample: '"ID005672341"' },
    { field: "acard_txn",     type: "STRUCT",  sample: "{...}",
      children: [
        { field: "txn_id",        type: "STRING",        sample: '"TXN_20260520_099"' },
        { field: "score_raw",     type: "FLOAT",         sample: "0.6512" },
        { field: "decision",      type: "STRING",        sample: '"REVIEW"' },
      ],
    },
    { field: "event_ts",      type: "TIMESTAMP(3)", sample: "2026-05-20 08:45:00.789" },
  ],
};

function getKafkaSchema(topic: string): KafkaSchemaCol[] | null {
  return KafkaTopicSchema[topic] ?? null;
}

function flattenKafkaSchema(cols: KafkaSchemaCol[], depth: number = 0): (KafkaSchemaCol & { depth: number; hasChildren: boolean; isLastChild: boolean })[] {
  const result: (KafkaSchemaCol & { depth: number; hasChildren: boolean; isLastChild: boolean })[] = [];
  cols.forEach((col, i) => {
    const isLast = i === cols.length - 1 && (!col.children || col.children.length === 0);
    result.push({ ...col, depth, hasChildren: !!col.children && col.children.length > 0, isLastChild: isLast });
    if (col.children && col.children.length > 0) {
      result.push(...flattenKafkaSchema(col.children, depth + 1));
    }
  });
  return result;
}



const KAFKA_SERVERS = ["di_kafka", "spp_di_kafka", "risk_kafka"] as const;

const KNOWN_KAFKA_TOPICS = new Set([
  "kafka.credit_events_id", "kafka.credit_events_th", "kafka.credit_events_mx",
  "kafka.acard_events_mx",  "kafka.acard_events_id",  "kafka.acard_events_th",
  "kafka.user_behavior_sg", "kafka.user_behavior_id",
  "kafka.relation_events_th",
]);

// ─── Style helpers ────────────────────────────────────────────────────────────

const S = {
  Healthy: { dot:"bg-emerald-500", text:"text-emerald-600", pill:"bg-emerald-50 border-emerald-200 text-emerald-700" },
  Warning: { dot:"bg-amber-400",   text:"text-amber-600",   pill:"bg-amber-50   border-amber-200   text-amber-700"   },
  Offline: { dot:"bg-slate-300",   text:"text-slate-400",   pill:"bg-slate-100  border-slate-200   text-slate-400"   },
};

const inputCls = "w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400 transition-all";
const labelCls = "block text-[12px] text-slate-500 mb-1";

function nowString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}

// ─── Modal shell (shared style) ───────────────────────────────────────────────

function ModalShell({ title, icon, onClose, children, footer }: {
  title: string; icon: React.ReactNode; onClose: () => void;
  children: React.ReactNode; footer: React.ReactNode;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-teal-500 flex items-center justify-center flex-shrink-0">{icon}</div>
            <h2 className="text-slate-800 text-base">{title}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-4 space-y-3">{children}</div>
        <div className="px-6 py-3 border-t border-slate-100 flex justify-end gap-2">{footer}</div>
      </div>
    </div>
  );
}

// ─── New Mapping Modal ────────────────────────────────────────────────────────

const CURRENT_USER = "current.user@seamoney.com";

function NewMappingModal({ onClose, onSave }: { onClose: () => void; onSave: (e: Omit<DataSourceEntry,"offline"|"nearline"|"online">) => void }) {
  const [region,      setRegion]      = useState("");
  const [logicalName, setLogicalName] = useState("");
  const [description, setDescription] = useState("");
  const [owners,      setOwners]      = useState<string[]>([CURRENT_USER]);
  const [ownerInput,  setOwnerInput]  = useState("");

  const valid = region && logicalName.trim() && description.trim();
  const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
  const canAddOwner  = isValidEmail(ownerInput) && !owners.includes(ownerInput.trim());

  const addOwner    = () => { if (!canAddOwner) return; setOwners(o => [...o, ownerInput.trim()]); setOwnerInput(""); };
  const removeOwner = (email: string) => setOwners(o => o.filter(e => e !== email));

  return (
    <ModalShell
      title="New DataSource Mapping"
      icon={<Plus className="w-4 h-4 text-white" />}
      onClose={onClose}
      footer={<>
        <button onClick={onClose} className="px-4 py-1.5 text-xs text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all">Cancel</button>
        <button disabled={!valid} onClick={() => valid && onSave({ id:`ds-${Date.now()}`, region, logicalName: logicalName.trim(), description: description.trim(), owners, updateTime: nowString() })}
          className={`px-4 py-1.5 text-xs text-white rounded-lg transition-all ${valid ? "bg-teal-500 hover:bg-teal-600" : "bg-slate-200 text-slate-400 cursor-not-allowed"}`}>
          Create
        </button>
      </>}
    >
      <div>
        <label className={labelCls}><span className="text-red-500 mr-0.5">*</span>Region</label>
        <select value={region} onChange={e => setRegion(e.target.value)} className={inputCls}>
          <option value="">Select region…</option>
          {ALL_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>
      <div>
        <label className={labelCls}><span className="text-red-500 mr-0.5">*</span>Logical Name</label>
        <input value={logicalName} onChange={e => setLogicalName(e.target.value)} placeholder="e.g. user_risk_hbase_id" className={inputCls} />
      </div>
      <div>
        <label className={labelCls}><span className="text-red-500 mr-0.5">*</span>Description</label>
        <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Short description…" className={inputCls} />
      </div>

      {/* Owners */}
      <div>
        <label className={labelCls}><span className="text-red-500 mr-0.5">*</span>Owners</label>
        <div className="space-y-1.5 mb-2">
          {owners.map(email => (
            <div key={email} className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-1.5 min-w-0">
                <Mail className="w-3 h-3 text-slate-400 flex-shrink-0" />
                <span className="text-xs text-slate-700 truncate font-mono">{email}</span>
                {email === CURRENT_USER && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200 whitespace-nowrap flex-shrink-0">You</span>
                )}
              </div>
              <button onClick={() => removeOwner(email)} className="flex-shrink-0 text-slate-400 hover:text-red-500 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={ownerInput} onChange={e => setOwnerInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addOwner()}
            placeholder="Add another owner…"
            className={`${inputCls} flex-1 font-mono`}
          />
          <button onClick={addOwner} disabled={!canAddOwner}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs transition-all flex-shrink-0 ${canAddOwner ? "bg-teal-500 text-white hover:bg-teal-600" : "bg-slate-100 text-slate-400 cursor-not-allowed"}`}>
            <UserPlus className="w-3.5 h-3.5" />Add
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

// ─── Config Bind / Edit Modal ─────────────────────────────────────────────────

function ConfigModal({ type, current, onClose, onSave }: {
  type: ConfigType;
  current?: OfflineConfig | NearlineConfig | OnlineConfig;
  onClose: () => void;
  onSave: (cfg: OfflineConfig | NearlineConfig | OnlineConfig) => void;
}) {
  const isEdit = !!current;

  // Offline
  const [hiveServer,     setHiveServer]     = useState((current as OfflineConfig  | undefined)?.hiveServer        ?? "");
  const [hiveSchema,     setHiveSchema]     = useState((current as OfflineConfig  | undefined)?.hiveSchema        ?? "");
  const [hiveTable,      setHiveTable]      = useState((current as OfflineConfig  | undefined)?.hiveTable         ?? "");
  const [customFilter,   setCustomFilter]   = useState((current as OfflineConfig | NearlineConfig | undefined)?.customFilter ?? "");
  const [hiveVal,        setHiveVal]        = useState<"idle"|"checking"|"found"|"not-found">("idle");
  // Nearline
  const [kafkaServer,    setKafkaServer]    = useState((current as NearlineConfig | undefined)?.kafkaServer       ?? "");
  const [kafkaTopic,     setKafkaTopic]     = useState((current as NearlineConfig | undefined)?.kafkaTopic        ?? "");
  const [kafkaVal,       setKafkaVal]       = useState<"idle"|"checking"|"found"|"not-found">("idle");
  // Online
  const [selectedSrc,    setSelectedSrc]    = useState((current as OnlineConfig   | undefined)?.featureSourceName ?? "");
  const derivedProtocol = AVAILABLE_ONLINE_SOURCES.find(s => s.name === selectedSrc)?.protocol;

  useEffect(() => {
    if (type !== "offline") return;
    if (!hiveServer || !hiveSchema.trim() || !hiveTable.trim()) { setHiveVal("idle"); return; }
    setHiveVal("checking");
    const fullTable = `${hiveSchema.trim()}.${hiveTable.trim()}`;
    const t = setTimeout(() => setHiveVal(KNOWN_HIVE_TABLES.has(fullTable) ? "found" : "not-found"), 600);
    return () => clearTimeout(t);
  }, [hiveServer, hiveSchema, hiveTable, type]);

  useEffect(() => {
    if (type !== "nearline") return;
    if (!kafkaServer || !kafkaTopic.trim()) { setKafkaVal("idle"); return; }
    setKafkaVal("checking");
    const t = setTimeout(() => setKafkaVal(KNOWN_KAFKA_TOPICS.has(kafkaTopic.trim()) ? "found" : "not-found"), 600);
    return () => clearTimeout(t);
  }, [kafkaServer, kafkaTopic, type]);

  const META: Record<ConfigType, { title: string; icon: React.ReactNode }> = {
    offline:  { title: `${isEdit ? "Edit" : "Bind"} Offline Config`,  icon: <Database className="w-4 h-4 text-white" /> },
    nearline: { title: `${isEdit ? "Edit" : "Bind"} Nearline Config`, icon: <Zap     className="w-4 h-4 text-white" /> },
    online:   { title: `${isEdit ? "Edit" : "Bind"} Online Config`,   icon: <Globe   className="w-4 h-4 text-white" /> },
  };

  const valid =
    type === "offline"  ? hiveVal  === "found" :
    type === "nearline" ? kafkaVal === "found" :
    !!selectedSrc;

  const handleSave = () => {
    if (!valid) return;
    if (type === "offline")  onSave({ hiveServer: hiveServer, hiveSchema: hiveSchema.trim(), hiveTable: hiveTable.trim(), customFilter: customFilter.trim() || undefined, status:"Healthy", lastUpdated:"just now" });
    if (type === "nearline") onSave({ kafkaServer: kafkaServer, kafkaTopic: kafkaTopic.trim(), customFilter: customFilter.trim() || undefined, status:"Healthy", lag:"—" });
    if (type === "online")   onSave({ featureSourceName: selectedSrc, protocol: derivedProtocol!, status:"Healthy" });
  };

  return (
    <ModalShell
      title={META[type].title}
      icon={META[type].icon}
      onClose={onClose}
      footer={<>
        <button onClick={onClose} className="px-4 py-1.5 text-xs text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all">Cancel</button>
        <button disabled={!valid} onClick={handleSave}
          className={`px-4 py-1.5 text-xs text-white rounded-lg transition-all ${valid ? "bg-teal-500 hover:bg-teal-600" : "bg-slate-200 text-slate-400 cursor-not-allowed"}`}>
          {isEdit ? "Save" : "Bind"}
        </button>
      </>}
    >
      {type === "offline" && (
        <div>
          {/* Hive Server */}
          <label className={labelCls}><span className="text-red-500 mr-0.5">*</span>Hive Server</label>
          <select value={hiveServer} onChange={e => setHiveServer(e.target.value)} className={inputCls}>
            <option value="">Select Hive cluster…</option>
            {HIVE_SERVERS.map(s => (<option key={s} value={s}>{s}</option>))}
          </select>
          <p className="mt-1.5 text-[11px] text-slate-400">Hive cluster instance where the offline table resides.</p>

          {/* Hive Schema */}
          <div className="mt-3">
            <label className={labelCls}><span className="text-red-500 mr-0.5">*</span>Hive Schema</label>
            <input value={hiveSchema} onChange={e => setHiveSchema(e.target.value)} placeholder="e.g. ods" className={`${inputCls} font-mono`} />
            <p className="mt-1.5 text-[11px] text-slate-400">Database / schema name in the Hive metastore.</p>
          </div>

          {/* Hive Table */}
          <div className="mt-3">
            <label className={labelCls}><span className="text-red-500 mr-0.5">*</span>Hive Table (Binlog)</label>
            <div className="relative">
              <input value={hiveTable} onChange={e => setHiveTable(e.target.value)} placeholder="e.g. credit_user_id_binlog" className={`${inputCls} font-mono pr-8`} />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                {hiveVal === "checking"  && <Loader2      className="w-3.5 h-3.5 text-slate-400 animate-spin" />}
                {hiveVal === "found"     && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                {hiveVal === "not-found" && <XCircle      className="w-3.5 h-3.5 text-red-500" />}
              </span>
            </div>
            {hiveVal === "not-found" && (
              <p className="mt-1 text-[11px] text-red-500">Table {hiveSchema.trim()}.{hiveTable.trim()} not found in the Hive metastore.</p>
            )}
            <p className="mt-1.5 text-[11px] text-slate-400">Binlog Hive table used for offline feature computation.</p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100">
            <label className={labelCls}>Custom Filter</label>
            <textarea
              value={customFilter}
              onChange={e => setCustomFilter(e.target.value)}
              placeholder="please input filter sql after 'WHERE'"
              rows={3}
              className={`${inputCls} font-mono resize-none`}
            />
            <p className="mt-1.5 text-[11px] text-slate-400">Optional. Append conditions to WHERE clause for data filtering.</p>
          </div>

          {/* Schema Preview */}
          {hiveVal === "found" && (() => {
            const schema = getHiveSchema(`${hiveSchema.trim()}.${hiveTable.trim()}`);
            if (!schema) return null;
            return (
              <div className="mt-3 pt-3 border-t border-slate-100">
                <div className="flex items-center gap-2 mb-2">
                  <label className="text-[12px] text-slate-500">Schema Preview</label>
                  <span className="text-[10px] font-mono text-slate-400">{hiveSchema.trim()}.{hiveTable.trim()}</span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-teal-50 text-teal-700 border border-teal-200">
                    <Database className="w-2.5 h-2.5" />
                    {schema.length} columns
                  </span>
                </div>
                <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="max-h-48 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
                    <table className="w-full text-xs border-separate border-spacing-0">
                      <thead className="sticky top-0 z-10">
                        <tr className="bg-slate-100/80 text-[10px] uppercase tracking-wide text-slate-500 font-semibold backdrop-blur-sm">
                          <th className="text-left px-3 py-2 border-b border-slate-200 w-8 text-center">#</th>
                          <th className="text-left px-3 py-2 border-b border-slate-200">Column Name</th>
                          <th className="text-left px-3 py-2 border-b border-slate-200">Data Type</th>
                          <th className="text-left px-3 py-2 border-b border-slate-200">Sample</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {schema.map((row, i) => (
                          <tr key={row.col} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                            <td className="px-3 py-2 text-center text-[10px] text-slate-400 font-mono">{i + 1}</td>
                            <td className="px-3 py-2 font-mono text-slate-800">{row.col}</td>
                            <td className="px-3 py-2">
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-indigo-50 text-indigo-700 border border-indigo-200">
                                {row.type}
                              </span>
                            </td>
                            <td className="px-3 py-2 font-mono text-[11px] text-slate-500 truncate max-w-[160px]" title={row.sample}>
                              {row.sample}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <p className="mt-1.5 text-[11px] text-slate-400">Auto-detected from Hive metastore · last sync 2026-05-20 02:00 UTC</p>
              </div>
            );
          })()}

        </div>
      )}
      {type === "nearline" && (
        <div>
          {/* Kafka Server */}
          <label className={labelCls}><span className="text-red-500 mr-0.5">*</span>Kafka Server</label>
          <select value={kafkaServer} onChange={e => setKafkaServer(e.target.value)} className={inputCls}>
            <option value="">Select Kafka cluster…</option>
            {KAFKA_SERVERS.map(s => (<option key={s} value={s}>{s}</option>))}
          </select>
          <p className="mt-1.5 text-[11px] text-slate-400">Kafka cluster instance where the topic resides.</p>

          {/* Kafka Topic */}
          <div className="mt-3">
            <label className={labelCls}><span className="text-red-500 mr-0.5">*</span>Kafka Topic</label>
            <div className="relative">
              <input value={kafkaTopic} onChange={e => setKafkaTopic(e.target.value)} placeholder="e.g. kafka.credit_events_id" className={`${inputCls} font-mono pr-8`} />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
              {kafkaVal === "checking"  && <Loader2      className="w-3.5 h-3.5 text-slate-400 animate-spin" />}
              {kafkaVal === "found"     && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
              {kafkaVal === "not-found" && <XCircle      className="w-3.5 h-3.5 text-red-500" />}
            </span>
          </div>
          {kafkaVal === "not-found" && <p className="mt-1 text-[11px] text-red-500">Not found in the Kafka registry.</p>}
          <p className="mt-1.5 text-[11px] text-slate-400">Kafka topic consumed by the Flink Streaming job for nearline sync.</p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100">
            <label className={labelCls}>Custom Filter</label>
            <textarea
              value={customFilter}
              onChange={e => setCustomFilter(e.target.value)}
              placeholder="please input filter sql after 'WHERE'"
              rows={3}
              className={`${inputCls} font-mono resize-none`}
            />
            <p className="mt-1.5 text-[11px] text-slate-400">Optional. Append conditions to WHERE clause for data filtering.</p>
          </div>

          {/* Kafka Schema Preview */}
          {kafkaVal === "found" && (() => {
            const schema = getKafkaSchema(kafkaTopic.trim());
            if (!schema) return null;
            const flat = flattenKafkaSchema(schema);
            const totalFields = flat.length;
            return (
              <div className="mt-3 pt-3 border-t border-slate-100">
                <div className="flex items-center gap-2 mb-2">
                  <label className="text-[12px] text-slate-500">Schema Preview</label>
                  <span className="text-[10px] font-mono text-slate-400">{hiveSchema.trim()}.{hiveTable.trim()}</span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-violet-50 text-violet-700 border border-violet-200">
                    <Zap className="w-2.5 h-2.5" />
                    {totalFields} fields · Avro
                  </span>
                </div>
                <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="max-h-48 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
                    <table className="w-full text-xs border-separate border-spacing-0">
                      <thead className="sticky top-0 z-10">
                        <tr className="bg-slate-100/80 text-[10px] uppercase tracking-wide text-slate-500 font-semibold backdrop-blur-sm">
                          <th className="text-left px-3 py-2 border-b border-slate-200" style={{ paddingLeft: 12 }}>Field</th>
                          <th className="text-left px-3 py-2 border-b border-slate-200 w-36">Data Type</th>
                          <th className="text-left px-3 py-2 border-b border-slate-200">Sample</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {flat.map((row, i) => {
                          const indent = row.depth * 20;
                          const isNested = row.depth > 0;
                          const isStruct = row.type === "STRUCT" || row.type.startsWith("MAP<") || row.type.startsWith("ARRAY<");
                          return (
                            <tr key={`${row.field}-${i}`} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                              <td className="px-3 py-2 font-mono text-slate-800" style={{ paddingLeft: 12 + indent }}>
                                <span className="flex items-center gap-1">
                                  {isNested && (
                                    <span className="text-slate-300 flex-shrink-0 text-[10px]" style={{ marginLeft: -6 }}>
                                      └
                                    </span>
                                  )}
                                  {row.field}
                                </span>
                              </td>
                              <td className="px-3 py-2">
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono border ${
                                  isStruct
                                    ? "bg-violet-50 text-violet-700 border-violet-200"
                                    : row.depth > 0
                                      ? "bg-slate-100 text-slate-600 border-slate-200"
                                      : "bg-indigo-50 text-indigo-700 border-indigo-200"
                                }`}>
                                  {row.type}
                                </span>
                              </td>
                              <td className="px-3 py-2 font-mono text-[11px] text-slate-500 truncate max-w-[180px]" title={row.sample}>
                                {row.sample}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
                <p className="mt-1.5 text-[11px] text-slate-400">Auto-detected from Schema Registry · Avro · last sync 2026-05-20 02:00 UTC</p>
              </div>
            );
          })()}

        </div>
      )}
      {type === "online" && (
        <div className="space-y-3">
          <div>
            <label className={labelCls}><span className="text-red-500 mr-0.5">*</span>FeatureSource</label>
            <select value={selectedSrc} onChange={e => setSelectedSrc(e.target.value)} className={inputCls}>
              <option value="">Select registered source…</option>
              {AVAILABLE_ONLINE_SOURCES.map(s => (
                <option key={s.name} value={s.name}>{s.name} ({s.protocol})</option>
              ))}
            </select>
            <p className="mt-1.5 text-[11px] text-slate-400">Only HTTP / gRPC FeatureSource entries are eligible for Online binding.</p>
          </div>
          {selectedSrc && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">
              <Globe className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <span className="text-xs text-slate-600 font-mono">{selectedSrc}</span>
              <span className="ml-auto text-[11px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">{derivedProtocol}</span>
            </div>
          )}
        </div>
      )}
    </ModalShell>
  );
}

// ─── Edit Owners Modal ────────────────────────────────────────────────────────

function EditOwnersModal({ current, onClose, onSave }: {
  current: string[];
  onClose: () => void;
  onSave: (owners: string[]) => void;
}) {
  const [owners, setOwners] = useState<string[]>(current);
  const [input,  setInput]  = useState("");
  const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
  const canAdd = isValidEmail(input) && !owners.includes(input.trim());

  const add    = () => { if (!canAdd) return; setOwners(o => [...o, input.trim()]); setInput(""); };
  const remove = (email: string) => setOwners(o => o.filter(e => e !== email));

  return (
    <ModalShell
      title="Edit Owners"
      icon={<Users className="w-4 h-4 text-white" />}
      onClose={onClose}
      footer={<>
        <button onClick={onClose} className="px-4 py-1.5 text-xs text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all">Cancel</button>
        <button onClick={() => onSave(owners)} className="px-4 py-1.5 text-xs text-white bg-teal-500 rounded-lg hover:bg-teal-600 transition-all">Save</button>
      </>}
    >
      {/* Current owners */}
      <div className="space-y-1.5">
        {owners.length === 0 && (
          <p className="text-[12px] text-slate-400 py-2 text-center">No owners assigned.</p>
        )}
        {owners.map(email => (
          <div key={email} className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-1.5 min-w-0">
              <Mail className="w-3 h-3 text-slate-400 flex-shrink-0" />
              <span className="text-xs text-slate-700 truncate font-mono">{email}</span>
            </div>
            <button onClick={() => remove(email)} className="flex-shrink-0 text-slate-400 hover:text-red-500 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Add owner */}
      <div className="border-t border-slate-100 pt-3">
        <label className={labelCls}>Add owner</label>
        <div className="flex gap-2">
          <input
            value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && add()}
            placeholder="name@company.com"
            className={`${inputCls} flex-1 font-mono`}
          />
          <button onClick={add} disabled={!canAdd}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs transition-all flex-shrink-0 ${canAdd ? "bg-teal-500 text-white hover:bg-teal-600" : "bg-slate-100 text-slate-400 cursor-not-allowed"}`}>
            <UserPlus className="w-3.5 h-3.5" />Add
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function BindingTag({ label, status }: { label: string; status?: "Bound" }) {
  if (!status) return null;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] border bg-teal-50 text-teal-700 border-teal-200 whitespace-nowrap">
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-teal-400" />{label}
    </span>
  );
}

function ConfigBlock({ label, icon, typeLabel, value, meta, onEdit, onUnbind }: {
  label: string; icon: React.ReactNode; typeLabel: string; value: string; meta: string;
  onEdit: () => void; onUnbind: () => void;
}) {
  return (
    <div className="flex-1 min-w-0 border border-slate-200 rounded-lg p-3 bg-white flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">{label}</span>
        <a href="#" target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-slate-400 hover:text-indigo-500 transition-colors">
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-slate-400">{icon}</span>
        <span className="text-[11px] text-slate-500">{typeLabel}</span>
      </div>
      <p className="font-mono text-xs text-slate-700 truncate">{value}</p>
      <p className="text-[11px] text-slate-400 flex-1">{meta}</p>
      <div className="flex items-center gap-2.5 pt-1 border-t border-slate-100">
        <button onClick={e => { e.stopPropagation(); onEdit(); }} className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-teal-700 transition-colors">
          <Pencil className="w-2.5 h-2.5" />Edit
        </button>
        <button onClick={e => { e.stopPropagation(); onUnbind(); }} className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-red-600 transition-colors">
          <Unlink className="w-2.5 h-2.5" />Unbind
        </button>
      </div>
    </div>
  );
}

function UnboundSlot({ label, icon, onBind }: { label: string; icon: React.ReactNode; onBind: () => void }) {
  return (
    <div className="flex-1 min-w-0 border border-dashed border-slate-300 rounded-lg p-3 bg-white/50 flex flex-col items-center justify-center gap-2 min-h-[100px]">
      <span className="text-[10px] uppercase tracking-widest text-slate-300 font-semibold">{label}</span>
      <span className="text-slate-300">{icon}</span>
      <button onClick={e => { e.stopPropagation(); onBind(); }}
        className="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] border border-slate-300 text-slate-500 hover:border-teal-400 hover:text-teal-700 transition-colors bg-white">
        <Plus className="w-2.5 h-2.5" />Bind
      </button>
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function DataSourceCard({ entry, onBind, onUnbind, onTest, onDelete, onEditOwners }: {
  entry: DataSourceEntry;
  onBind:       (type: ConfigType) => void;
  onUnbind:     (type: ConfigType) => void;
  onTest:       () => void;
  onDelete:     () => void;
  onEditOwners: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      {/* Header */}
      <div onClick={() => setOpen(v => !v)}
        className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-slate-50/70 transition-colors select-none">
        <span className="inline-flex px-2 py-0.5 rounded text-[11px] border bg-sky-50 text-sky-700 border-sky-200 whitespace-nowrap flex-shrink-0">
          {entry.region}
        </span>
        <span className="font-mono text-sm text-slate-800 whitespace-nowrap flex-shrink-0">{entry.logicalName}</span>
        <span className="text-xs text-slate-400 truncate min-w-0 flex-1">{entry.description}</span>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <BindingTag label="Offline"  status={entry.offline  ? "Bound" : undefined} />
          <BindingTag label="Nearline" status={entry.nearline ? "Bound" : undefined} />
          <BindingTag label="Online"   status={entry.online   ? "Bound" : undefined} />
        </div>
        <span className="flex items-center gap-1 text-[12px] text-slate-400 whitespace-nowrap flex-shrink-0 ml-2">
          <Clock className="w-3 h-3" />
          <span className="text-slate-300">Last edited</span>
          {entry.updateTime}
        </span>
        <ChevronRight className={`w-3.5 h-3.5 text-slate-400 flex-shrink-0 transition-transform duration-150 ${open ? "rotate-90" : ""}`} />
      </div>

      {/* Body */}
      {open && (
        <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/40">
          <div className="flex items-stretch gap-1.5">
            {entry.offline
              ? <ConfigBlock label="Offline" icon={<Database className="w-3 h-3" />} typeLabel="Hive Table (Binlog)"
                  value={`${entry.offline.hiveSchema}.${entry.offline.hiveTable}`} meta={`${entry.offline.hiveServer} · Updated ${entry.offline.lastUpdated}`}
                  onEdit={() => onBind("offline")} onUnbind={() => onUnbind("offline")} />
              : <UnboundSlot label="Offline" icon={<Database className="w-5 h-5" />} onBind={() => onBind("offline")} />}

            {entry.nearline
              ? <ConfigBlock label="Nearline" icon={<Zap className="w-3 h-3" />} typeLabel="Kafka Topic"
                  value={entry.nearline.kafkaTopic} meta={`${entry.nearline.kafkaServer}`}
                  onEdit={() => onBind("nearline")} onUnbind={() => onUnbind("nearline")} />
              : <UnboundSlot label="Nearline" icon={<Zap className="w-5 h-5" />} onBind={() => onBind("nearline")} />}

            {entry.online
              ? <ConfigBlock label="Online" icon={<Globe className="w-3 h-3" />} typeLabel={`FeatureSource · ${entry.online.protocol}`}
                  value={entry.online.featureSourceName} meta="Manually bound"
                  onEdit={() => onBind("online")} onUnbind={() => onUnbind("online")} />
              : <UnboundSlot label="Online" icon={<Globe className="w-5 h-5" />} onBind={() => onBind("online")} />}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-slate-100 bg-slate-50/30 gap-3">
        {/* Owners */}
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          {entry.owners.length > 0 ? entry.owners.map(email => (
            <span key={email} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-white text-slate-600 border border-slate-200 whitespace-nowrap">
              <Mail className="w-2.5 h-2.5 text-slate-400" />{email}
            </span>
          )) : (
            <span className="text-[12px] text-slate-400 italic">No owners</span>
          )}
          <button onClick={e => { e.stopPropagation(); onEditOwners(); }}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-white text-slate-500 border border-dashed border-slate-300 hover:border-teal-400 hover:text-teal-700 transition-colors whitespace-nowrap">
            <Pencil className="w-2.5 h-2.5" />Edit
          </button>
        </div>
        {/* Actions */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button onClick={e => { e.stopPropagation(); onTest(); }}
            className="flex items-center gap-1 px-2.5 py-1 text-[12px] text-teal-700 hover:text-teal-900 hover:bg-teal-50 rounded-lg transition-colors">
            <FlaskConical className="w-3 h-3" />Test
          </button>
          <span className="text-slate-200 text-xs select-none">|</span>
          <button onClick={e => { e.stopPropagation(); onDelete(); }}
            className="flex items-center gap-1 px-2.5 py-1 text-[12px] text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors">
            <Trash2 className="w-3 h-3" />Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function DataSourceMappingPage() {
  const [data, setData]               = useState<DataSourceEntry[]>(INIT_DATA);
  const [search, setSearch]           = useState("");
  const [regionFilter, setRegionFilter] = useState("");
  const [showNewModal, setShowNewModal]   = useState(false);
  const [configModal, setConfigModal]     = useState<{ entryId: string; type: ConfigType } | null>(null);
  const [ownersModal, setOwnersModal]     = useState<string | null>(null); // entryId
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const regions  = [...new Set(data.map(d => d.region))];
  const filtered = data.filter(d => {
    if (regionFilter && d.region !== regionFilter) return false;
    if (search && !d.logicalName.includes(search) && !d.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleBind   = (entryId: string, type: ConfigType) => setConfigModal({ entryId, type });
  const handleUnbind = (entryId: string, type: ConfigType) =>
    setData(prev => prev.map(e => e.id !== entryId ? e : { ...e, [type]: undefined, updateTime: nowString() }));
  const handleDelete      = (entryId: string) => setData(prev => prev.filter(e => e.id !== entryId));
  const handleTest        = (_entryId: string) => { /* test connection — no-op in mock */ };
  const handleOwnersSave  = (entryId: string, owners: string[]) => {
    setData(prev => prev.map(e => e.id !== entryId ? e : { ...e, owners, updateTime: nowString() }));
    setOwnersModal(null);
  };

  const handleConfigSave = (cfg: OfflineConfig | NearlineConfig | OnlineConfig) => {
    if (!configModal) return;
    setData(prev => prev.map(e => e.id !== configModal.entryId ? e : { ...e, [configModal.type]: cfg, updateTime: nowString() }));
    setConfigModal(null);
  };

  const handleNewMapping = (entry: Omit<DataSourceEntry,"offline"|"nearline"|"online">) => {
    setData(prev => [...prev, entry]);
    setShowNewModal(false);
  };

  const activeEntry = configModal ? data.find(e => e.id === configModal.entryId) : undefined;
  const deleteEntry = deleteConfirmId ? data.find(e => e.id === deleteConfirmId) : undefined;

  return (
    <div className="min-h-full bg-[#f5f7fa]">
      <header className="bg-white border-b border-gray-100 px-6 py-3 flex items-center gap-3 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#13c2c2] flex items-center justify-center shadow-sm">
            <Database className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-gray-800 leading-tight" style={{ fontSize: "15px", fontWeight: 600 }}>
              Data Source
            </h1>
            <p className="text-[12px] text-gray-400 leading-tight">
              Online / Nearline / Offline bindings per region
            </p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <div className="text-[12px] text-gray-400">{filtered.length} entries</div>
          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-500 text-white text-[12px] hover:bg-teal-600 transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            New Mapping
          </button>
        </div>
      </header>

      <main className="p-5 flex flex-col gap-4 max-w-screen-2xl mx-auto">
        <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 shadow-sm flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search logical name or description…"
              className="w-full pl-10 pr-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400 transition-all"
            />
          </div>

          <select
            value={regionFilter}
            onChange={e => setRegionFilter(e.target.value)}
            className="px-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400 transition-all"
          >
            <option value="">All Regions</option>
            {regions.map(r => <option key={r} value={r}>{r}</option>)}
          </select>

          {(search || regionFilter) && (
            <button
              onClick={() => { setSearch(""); setRegionFilter(""); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-50 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
          )}
        </div>

        <div className="space-y-3">
          {filtered.map(entry => (
            <DataSourceCard key={entry.id} entry={entry}
              onBind={type    => handleBind(entry.id, type)}
              onUnbind={type  => handleUnbind(entry.id, type)}
              onTest={()      => handleTest(entry.id)}
              onDelete={()    => setDeleteConfirmId(entry.id)}
              onEditOwners={() => setOwnersModal(entry.id)} />
          ))}
          {filtered.length === 0 && (
            <div className="py-16 text-center text-sm text-slate-400">No data sources match the current filter.</div>
          )}
        </div>
      </main>

      {/* Modals */}
      {showNewModal && <NewMappingModal onClose={() => setShowNewModal(false)} onSave={handleNewMapping} />}
      {ownersModal && (() => { const e = data.find(d => d.id === ownersModal); return e ? (
        <EditOwnersModal current={e.owners} onClose={() => setOwnersModal(null)} onSave={owners => handleOwnersSave(ownersModal, owners)} />
      ) : null; })()}
      {configModal && activeEntry && (
        <ConfigModal
          type={configModal.type}
          current={activeEntry[configModal.type]}
          onClose={() => setConfigModal(null)}
          onSave={handleConfigSave}
        />
      )}

      <AlertDialog open={!!deleteConfirmId} onOpenChange={open => { if (!open) setDeleteConfirmId(null); }}>
        <AlertDialogContent className="rounded-2xl border-slate-200">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this mapping?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600">
              {deleteEntry
                ? `This will permanently remove “${deleteEntry.logicalName}” (${deleteEntry.region}).`
                : "This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (!deleteConfirmId) return;
                handleDelete(deleteConfirmId);
                setDeleteConfirmId(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
