import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  GitBranch, X, Zap, Layers, Database, Sparkles,
  ExternalLink, CheckCircle2, Code2, Activity,
  AlertTriangle, TrendingUp, Clock, FileText, Brain,
  Plus, Trash2, Gauge,
} from "lucide-react";

interface HealthSignal {
  id: string; stage: string; stageType: string; path: "training"|"serving";
  signalType: "latency"|"freshness"|"ok"; severity: "critical"|"warning"|"ok";
  summary: string; detail: string; value: string; baseline: string; updatedAt: string;
}

interface ProcessingStage {
  id: string; order: number; taskName: string; stageLabel: string;
  inputAssets: string[]; outputAsset: string; language: string; description: string;
  path: "training"|"serving"; reviewStatus: "AI-KAG"; snippet: string; dataverseUrl?: string;
}

interface HealthRule {
  id: string; metric: "null_pct"|"fail_pct"|"drift"; operator: ">="|"<="|"!=";
  threshold: string; enabled: boolean;
}
interface HealthMetric {
  id: string; metric: "null_pct"|"fail_pct"|"drift"; label: string;
  current: string; threshold: string; severity: "ok"|"warning"|"critical";
  detail: string; updatedAt: string;
}

const METRIC_OPTIONS: { value: HealthRule["metric"]; label: string }[] = [
  { value: "null_pct", label: "Null %" }, { value: "fail_pct", label: "Fail %" }, { value: "drift", label: "Drifting" },
];
const OPERATOR_OPTIONS: { value: HealthRule["operator"]; label: string }[] = [
  { value: ">=", label: ">=" }, { value: "<=", label: "<=" }, { value: "!=", label: "!=" },
];
const SEV_STYLE: Record<string, { cls: string; icon: React.ReactNode }> = {
  ok: { cls: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: <CheckCircle2 className="w-3 h-3" /> },
  warning: { cls: "bg-amber-50 text-amber-700 border-amber-200", icon: <TrendingUp className="w-3 h-3" /> },
  critical: { cls: "bg-red-50 text-red-600 border-red-200", icon: <AlertTriangle className="w-3 h-3" /> },
};

export function buildFreshness(fn: string): HealthSignal[] {
  const t = "2026-05-15 08:30";
  return [
    { id:"h-1",stage:"binlog.user_credit_events → ods.user_credit_events",stageType:"ods",path:"training",signalType:"ok",severity:"ok",summary:"ODS ingestion on track",detail:"ods.user_credit_events daily partition dt=2026-05-14 completed at 03:22 UTC.",value:"2026-05-14 03:22",baseline:"daily before 04:00",updatedAt:t },
    { id:"h-2",stage:"ods.user_credit_events → dwd.user_credit_30d_features",stageType:"dwd",path:"training",signalType:"latency",severity:"warning",summary:"DWD aggregation delayed 1.5h",detail:"dwd.user_credit_30d_features dt=2026-05-14 completed at 05:48 (expected 04:15).",value:"05:48 (+1.5h)",baseline:"~04:15",updatedAt:t },
    { id:"h-4",stage:"kafka.credit_events → stream.credit_events_enriched",stageType:"kafka",path:"serving",signalType:"ok",severity:"ok",summary:"Kafka stream healthy",detail:"Topic credit_events: consumer lag 120ms, throughput 8.4K msg/s.",value:"lag 120ms",baseline:"< 500ms",updatedAt:t },
    { id:"h-5",stage:"stream → hbase.user_risk:cf:risk_score_raw",stageType:"hbase",path:"serving",signalType:"freshness",severity:"ok",summary:"HBase write freshness OK",detail:"hbase.user_risk: latest write at 08:29:45 UTC, 99.7% within 2s.",value:"2s behind",baseline:"< 5s",updatedAt:t },
    { id:"h-6",stage:`FG Serving Canvas → feature: ${fn}`,stageType:"fg",path:"serving",signalType:"ok",severity:"ok",summary:"Feature serving latency normal",detail:`FG serving p99 = 182ms. Call volume 12.3K/min.`,value:"p99 182ms",baseline:"< 500ms",updatedAt:t },
  ];
}
function buildRules(): HealthRule[] { return [{id:"r-1",metric:"null_pct",operator:">=",threshold:"5",enabled:true},{id:"r-2",metric:"fail_pct",operator:">=",threshold:"1",enabled:true},{id:"r-3",metric:"drift",operator:"!=",threshold:"0.1",enabled:true}]; }
export function buildMetrics(fn: string): HealthMetric[] {
  const t = "2026-05-20 08:30";
  return [
    { id:"m-1",metric:"null_pct",label:"Null %",current:"2.1%",threshold:">= 5%",severity:"ok",detail:"2.1% null rate across 1.2M serving calls yesterday. Well within threshold.",updatedAt:t },
    { id:"m-2",metric:"fail_pct",label:"Fail %",current:"1.8%",threshold:">= 1%",severity:"warning",detail:"Fail rate spiked to 1.8%. 168K failed calls due to HBase timeout during peak hrs.",updatedAt:t },
    { id:"m-3",metric:"drift",label:"Drifting",current:"0.23",threshold:"!= 0.1",severity:"critical",detail:"KL-divergence = 0.23 vs baseline 0.08. Top-5 feature values shifted +18% mean.",updatedAt:t },
  ];
}
function buildStages(fn: string): ProcessingStage[] {
  return [
    { id:"p-t-1",order:1,taskName:"ods_user_credit_events",path:"training",stageLabel:"Raw Ingestion",inputAssets:["binlog.user_credit_events"],outputAsset:"ods.user_credit_events",language:"SQL (Hive)",description:"从上游 binlog 层全量导入用户信用事件原始数据。",reviewStatus:"AI-KAG",snippet:"SELECT user_id, event_type, amount, event_ts\nFROM binlog.user_credit_events\nWHERE dt = '\\${dt}';",dataverseUrl:"#" },
    { id:"p-t-2",order:2,taskName:"dwd_user_credit_30d_agg",path:"training",stageLabel:"30-Day Aggregation",inputAssets:["ods.user_credit_events"],outputAsset:"dwd.user_credit_30d_features",language:"SQL (Spark)",description:"对近 30 天信用事件按用户维度聚合计算逾期金额和还款次数。",reviewStatus:"AI-KAG",snippet:"SELECT user_id,\n  SUM(CASE WHEN event_type='OVERDUE' THEN amount END) AS overdue_amt_30d,\n  COUNT(CASE WHEN event_type='REPAY' THEN 1 END) AS repay_cnt_30d\nFROM ods.user_credit_events\nWHERE dt BETWEEN DATE_SUB('\\${dt}',30) AND '\\${dt}'\nGROUP BY user_id;",dataverseUrl:"#" },
    { id:"p-t-3",order:3,taskName:"ads_user_risk_score_ods",path:"training",stageLabel:"Final Scoring",inputAssets:["dwd.user_credit_30d_features"],outputAsset:"risk_db.user_risk_score_ods → "+fn,language:"SQL (Spark)",description:"将中间特征加权计算产出 "+fn+"，LEAST/GREATEST 裁剪值域 300–999。",reviewStatus:"AI-KAG",snippet:"SELECT user_id,\n  LEAST(999, GREATEST(300,\n    ROUND(600 + 1.5*COALESCE(repay_cnt_30d,0) - 0.8*COALESCE(overdue_amt_30d,0)/100)\n  )) AS risk_score\nFROM dwd.user_credit_30d_features\nWHERE dt = '\\${dt}';",dataverseUrl:"#" },
    { id:"p-s-1",order:1,taskName:"credit_events_kafka_source",path:"serving",stageLabel:"Kafka Ingest",inputAssets:["kafka.credit_events"],outputAsset:"stream.credit_events_enriched",language:"Flink SQL",description:"从 Kafka topic 消费实时信用事件流，定义 Watermark 和 Schema。",reviewStatus:"AI-KAG",snippet:"CREATE TABLE credit_events_src (\n  user_id STRING, event_type STRING,\n  amount DECIMAL(18,2), event_ts TIMESTAMP(3),\n  WATERMARK FOR event_ts AS event_ts - INTERVAL '5' SECOND\n) WITH ('connector'='kafka', ...);",dataverseUrl:"#" },
    { id:"p-s-2",order:2,taskName:"credit_risk_score_realtime",path:"serving",stageLabel:"Flink Real-time",inputAssets:["stream.credit_events_enriched"],outputAsset:"hbase.user_risk:cf:risk_score_raw",language:"Flink SQL",description:"Flink TUMBLE 窗口聚合后写入 HBase。",reviewStatus:"AI-KAG",snippet:"INSERT INTO user_risk_hbase_sink\nSELECT user_id, LEAST(999, GREATEST(300,\n  ROUND(600 + 1.5*repay_cnt_30d_rt - 0.8*overdue_amt_30d_rt/100)\n)) AS risk_score_raw\nFROM TABLE(TUMBLE(TABLE credit_events_src, DESCRIPTOR(event_ts), INTERVAL '1' MINUTE));",dataverseUrl:"#" },
    { id:"p-s-3",order:3,taskName:"FG Serving Canvas · ID · V1",path:"serving",stageLabel:"FG Serving Canvas",inputAssets:["hbase.user_risk:cf:risk_score_raw"],outputAsset:"feature: "+fn,language:"Groovy",description:"HBase FeatureSource scan → Groovy Transformer → 黑名单过滤和分数裁剪。",reviewStatus:"AI-KAG",snippet:"def raw = HBaseCall.query(tableName:\"user_risk\",rowKey:input.user_id,qualifier:\"cf:risk_score_raw\")\nif(raw==null||raw.risk_score_raw==null){output.risk_score=-1;return}\ndef score=raw.risk_score_raw as int\nif(input.is_blacklisted){output.risk_score=999;return}\noutput.risk_score=Math.max(300,Math.min(900,score))",dataverseUrl:"#" },
  ];
}
interface UpNode { id: string; label: string; type: "source"|"hive"|"kafka"|"flink"|"hbase"|"fs"|"fg"|"feature"; }
const NODES: UpNode[] = [
  { id:"binlog", label:"binlog.user_credit_events", type:"source" },
  { id:"ods",    label:"ods.user_credit_events",    type:"hive" },
  { id:"dwd",    label:"dwd.user_credit_30d_features", type:"hive" },
  { id:"ads",    label:"risk_db.user_risk_score_ods", type:"hive" },
  { id:"kafka",  label:"kafka.credit_events",       type:"kafka" },
  { id:"stream", label:"stream.credit_events_enriched", type:"flink" },
  { id:"hbase",  label:"hbase.user_risk:cf",         type:"hbase" },
  { id:"fs",     label:"FeatureSource",              type:"fs" },
  { id:"fg",     label:"FG Serving Canvas · Groovy V1", type:"fg" },
  { id:"feature",label:"risk_score",                 type:"feature" },
];
const TRAIN = NODES.filter(n=>["source","hive"].includes(n.type)&&n.id!=="feature");
const SERVE = NODES.filter(n=>["kafka","flink","hbase","fs","fg"].includes(n.type));
const TERM  = NODES.find(n=>n.type==="feature");

type TT = "lineage"|"freshness"|"health";

export function FeatureTraceModal({ open, featureName, hasTraining, hasServing, onClose }: {
  open: boolean; featureName: string; hasTraining: boolean; hasServing: boolean; onClose: () => void;
}) {
  const [tab, setTab] = useState<TT>("lineage");
  const freshness = useMemo(()=>buildFreshness(featureName),[featureName]);
  const stages = useMemo(()=>buildStages(featureName),[featureName]);
  const rules = useMemo(()=>buildRules(),[]);
  const metrics = useMemo(()=>buildMetrics(featureName),[featureName]);
  useEffect(()=>{if(open){setTab("lineage");}},[open,featureName]);
  const fw = freshness.filter(s=>s.severity==="warning"||s.severity==="critical").length;
  const mw = metrics.filter(m=>m.severity==="warning"||m.severity==="critical").length;
  if(!open) return null;

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-5xl mx-4 max-h-[90vh] flex flex-col overflow-hidden" onClick={e=>e.stopPropagation()}>
        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-teal-200 mt-0.5"><Brain className="w-5 h-5 text-white"/></div>
            <div><h2 className="text-slate-800 text-base font-semibold">Feature Trace</h2><p className="text-xs text-slate-400 mt-0.5 font-mono"><span className="text-teal-700 font-semibold">{featureName}</span><span className="mx-1.5 text-slate-300">·</span><span className="text-slate-500">Knowledge distilled from upstream pipelines · AI agent refined · T+1 sync</span></p></div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all flex-shrink-0"><X className="w-4 h-4"/></button>
        </div>
        <div className="flex border-b border-slate-100 px-6 flex-shrink-0 bg-slate-50/30">
          <TB a={tab==="lineage"}   onClick={()=>setTab("lineage")}   icon={<GitBranch className="w-3.5 h-3.5"/>} label="Lineage"   sub="Topology + KAG logic"/>
          <TB a={tab==="freshness"} onClick={()=>setTab("freshness")} icon={<Activity className="w-3.5 h-3.5"/>}  label="Freshness" sub={fw>0?`${fw} warning`:"all on track"} badge={fw>0?{count:fw,color:"bg-amber-500"}:undefined}/>
          <TB a={tab==="health"}    onClick={()=>setTab("health")}    icon={<Gauge className="w-3.5 h-3.5"/>}      label="Health"    sub="Thresholds + metrics" badge={mw>0?{count:mw,color:"bg-amber-500"}:undefined}/>
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-4}} transition={{duration:0.2}} className="flex-1 overflow-y-auto">
          {tab==="lineage"&&<LineageTab featureName={featureName} stages={stages}/>}
          {tab==="freshness"&&<FreshnessTab signals={freshness} featureName={featureName} hasTraining={hasTraining} hasServing={hasServing}/>}
          {tab==="health"&&<HealthTab rules={rules} metrics={metrics} featureName={featureName}/>}
          </motion.div>
        </AnimatePresence>
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 text-[11px] text-slate-500 flex items-center justify-between flex-shrink-0">
          <span className="flex items-center gap-1.5"><Brain className="w-3 h-3 text-teal-500"/>Knowledge auto-synced from Unity Catalog · last update 2026-05-15 02:00 UTC</span>
          <span className="flex items-center gap-3 text-slate-400">{hasTraining&&<span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"/>Training</span>}{hasServing&&<span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-violet-400"/>Serving</span>}</span>
        </div>
      </div>
    </div>
  );
}

function TB({a,onClick,icon,label,sub,badge}:{a:boolean;onClick:()=>void;icon:React.ReactNode;label:string;sub?:string;badge?:{count:number;color:string}}) {
  return <button onClick={onClick} className={`relative flex items-center gap-2 px-4 py-3 mr-1 transition-all ${a?"text-teal-700":"text-slate-500 hover:text-slate-700"}`}>
    <span className="flex flex-col items-start gap-0"><span className="flex items-center gap-1.5 text-[13px] font-semibold">{icon}{label}{badge&&<span className={`ml-0.5 inline-flex items-center justify-center min-w-[16px] h-4 rounded-full text-[9px] font-bold text-white ${badge.color} px-1`}>{badge.count}</span>}</span>{sub&&<span className="text-[10px] opacity-60 font-normal">{sub}</span>}</span>
    {a&&<span className="absolute bottom-0 left-2 right-2 h-0.5 bg-teal-500 rounded-full"/>}
  </button>;
}

/* ── Lineage: snake DAG ─────────────────────────────────────────── */
function NodeBtn({n,sel,onSel}:{n:UpNode;sel:string|null;onSel:(id:string|null)=>void}) {
  const is=sel===n.id; const t=n.type==="feature"; const tr=["source","hive"].includes(n.type); const sv=["kafka","flink","hbase","fs","fg"].includes(n.type);
  let bc, bg, tc, hb, dot="";
  if(t){bc="border-teal-600";bg="bg-teal-600";tc="text-white";hb="hover:bg-teal-700";}
  else if(tr){bc="border-emerald-200";bg="bg-emerald-50/60";tc="text-emerald-800";hb="hover:bg-emerald-100/80";dot="bg-emerald-400";}
  else if(sv){bc="border-violet-200";bg="bg-violet-50/60";tc="text-violet-800";hb="hover:bg-violet-100/80";dot="bg-violet-400";}
  else{bc="border-slate-200";bg="bg-white";tc="text-slate-700";hb="hover:bg-slate-50";}
  return <button onClick={()=>onSel(is?null:n.id)}
    className={`relative rounded-xl border px-4 py-2.5 text-xs transition-all text-center ${bg} ${tc} ${bc} ${hb} ${is?"ring-2 ring-teal-400 ring-offset-1 scale-[1.04] shadow-md":"hover:shadow-sm hover:scale-[1.02]"} flex-shrink-0`}
    style={{whiteSpace:"nowrap"}}>
    {dot&&<span className={`inline-block w-1.5 h-1.5 rounded-full ${dot} mr-1.5 align-middle`}/>}<span className="align-middle">{n.label}</span>
  </button>;
}

function ArrowSvg() {
  return <svg width="28" height="14" viewBox="0 0 28 14" className="text-slate-300 flex-shrink-0">
    <path d="M0 5h20v3H0z" fill="currentColor" opacity=".4"/><path d="M20 0l7 6.5L20 13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>;
}

function SnakeArrow() {
  return <div className="flex justify-center py-0.5">
    <svg width="18" height="14" viewBox="0 0 18 14" className="text-slate-300"><path d="M7 0v8h4V0M0 8h4v3h6V8h4M7 11l2 3 2-3" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
  </div>;
}

function LineageTab({featureName,stages}:{featureName:string;stages:ProcessingStage[]}) {
  const [sid,setSid]=useState<string|null>(null);
  const map = useMemo(()=>{
    const m:Record<string,ProcessingStage>={};
    const byPath=(path:string,ids:string[])=>{const ps=stages.filter(s=>s.path===path).sort((a,b)=>a.order-b.order);ids.forEach((id,i)=>{if(ps[i])m[id]=ps[i];});};
    byPath("training",["ods","dwd","ads"]);byPath("serving",["kafka","stream","hbase","fs"]);
    const fg=stages.filter(s=>s.path==="serving"&&s.stageLabel==="FG Serving Canvas")[0];if(fg)m["fg"]=fg;
    return m;
  },[stages]);
  const s = sid? (map[sid]??null) : null;

  return <div className="px-4 sm:px-6 py-5">
    <div className="flex items-center gap-2 mb-5 text-[11px] text-slate-400 uppercase tracking-wider"><GitBranch className="w-3 h-3 text-teal-500"/><span>Full pipeline topology</span><span className="text-slate-300">—</span><span className="text-slate-500 normal-case tracking-normal">from raw data to fine feature</span></div>
    <div className="rounded-2xl bg-gradient-to-b from-slate-50/80 to-white border border-slate-200/80 p-5 shadow-sm space-y-0">
      {/* Training row */}
      <div className="flex items-center gap-2 mb-2"><div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-semibold text-emerald-700"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"/> Training Path</div></div>
      <div className="flex items-center justify-between gap-0 overflow-x-auto pb-2" style={{scrollbarWidth:"thin"}}>
        {TRAIN.map((n,i)=>(<motion.div key={n.id} initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:i*.07}} className="flex items-center gap-0 flex-shrink-0">
          <NodeBtn n={n} sel={sid} onSel={setSid}/>{i<TRAIN.length-1?<div className="px-2 flex-shrink-0"><ArrowSvg/></div>:<div className="flex-1 min-w-[20px]"/>}
        </motion.div>))}
      </div>
      <SnakeArrow/>
      {/* Serving row */}
      <div className="flex items-center gap-2 mb-2"><div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-violet-50 border border-violet-200 text-[10px] font-semibold text-violet-700"><span className="w-1.5 h-1.5 rounded-full bg-violet-400"/> Serving Path</div></div>
      <div className="flex items-center justify-between gap-0 overflow-x-auto pb-2" style={{scrollbarWidth:"thin"}}>
        {SERVE.map((n,i)=>(<motion.div key={n.id} initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:i*.07+.25}} className="flex items-center gap-0 flex-shrink-0">
          <NodeBtn n={n} sel={sid} onSel={setSid}/>{i<SERVE.length-1?<div className="px-2 flex-shrink-0"><ArrowSvg/></div>:<div className="flex-1 min-w-[20px]"/>}
        </motion.div>))}
      </div>
      <SnakeArrow/>
      {/* Terminal */}
      {TERM&&<motion.div initial={{opacity:0,scale:.9}} animate={{opacity:1,scale:1}} transition={{delay:.55}} className="flex justify-center pt-2">
        <div className="flex items-center gap-3"><NodeBtn n={TERM} sel={sid} onSel={setSid}/><div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-200 text-[10px] font-medium text-teal-700"><CheckCircle2 className="w-3 h-3"/>Fine Feature</div></div>
      </motion.div>}
    </div>
    {/* KAG detail */}
    {s&&<motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="mt-5 space-y-4">
      <div className="flex items-center gap-2 text-[11px] text-slate-400 uppercase tracking-wider"><FileText className="w-3 h-3 text-teal-500"/><span>AI-distilled processing logic for</span><span className="font-mono text-teal-600 normal-case tracking-normal">{featureName}</span></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 bg-slate-50/60 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border bg-slate-100 text-slate-700 border-slate-200">{s.path==="training"?<Layers className="w-3 h-3"/>:<Zap className="w-3 h-3"/>}{s.path==="training"?"Spark Batch":"Flink Stream"}</span>
              <span className="text-xs font-mono text-slate-800">{s.taskName}</span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border bg-teal-50 text-teal-700 border-teal-200"><Sparkles className="w-3 h-3"/>AI-KAG</span>
            </div>
            {s.dataverseUrl&&<a href={s.dataverseUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] text-teal-600 hover:text-teal-800">View in DataVerse <ExternalLink className="w-3 h-3"/></a>}
          </div>
          <div className="px-4 py-3 grid grid-cols-2 gap-3 text-[11px] border-b border-slate-100">
            <div><div className="text-slate-400 uppercase tracking-wide text-[10px] mb-1">Input</div><div className="flex flex-wrap gap-1">{s.inputAssets.map(a=><span key={a} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono border border-slate-200">{a}</span>)}</div></div>
            <div><div className="text-slate-400 uppercase tracking-wide text-[10px] mb-1">Output</div><span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono border border-slate-200">{s.outputAsset}</span></div>
          </div>
          <div className="bg-slate-900 text-slate-100 px-4 py-3 font-mono text-[11.5px] leading-relaxed overflow-x-auto">
            <div className="flex items-center gap-2 mb-2 text-[10px] uppercase tracking-wide text-slate-400"><Sparkles className="w-3 h-3 text-amber-300"/><span>AI-extracted · fragments related to <span className="text-teal-300">{featureName}</span></span></div>
            <pre className="whitespace-pre">{s.snippet}</pre>
          </div>
        </div>
        <div className="space-y-3">
          <div className={`rounded-xl border px-4 py-3 ${s.path==="training"?"bg-emerald-50/60 border-emerald-200":"bg-violet-50/60 border-violet-200"}`}><div className="flex items-center gap-2 mb-1"><span className="text-sm font-semibold text-slate-800">{s.stageLabel}</span></div><p className="text-[11px] text-slate-500 leading-relaxed">{s.description}</p></div>
          <div className="rounded-xl border px-4 py-3 bg-teal-50/60 border-teal-200"><div className="flex items-center gap-2 mb-1"><span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold bg-teal-50 text-teal-700 border-teal-200"><Sparkles className="w-3 h-3"/>AI-KAG</span></div><p className="text-[10px] text-slate-500 leading-relaxed">Logic auto-extracted by AI Agent from upstream code repositories (Git). Refined by T+1 batch processing from Unity Catalog metadata and OpenLineage traces.</p></div>
        </div>
      </div>
    </motion.div>}
    <div className="mt-5 flex flex-wrap gap-x-4 gap-y-1.5 text-[10px] px-1">
      <span className="flex items-center gap-1.5 text-slate-400"><span className="w-2 h-2 rounded-sm border border-slate-300 bg-slate-50"/>External source</span>
      <span className="flex items-center gap-1.5 text-slate-400"><span className="w-2 h-2 rounded-sm bg-emerald-100 border border-emerald-200"/>Training (Hive)</span>
      <span className="flex items-center gap-1.5 text-slate-400"><span className="w-2 h-2 rounded-sm bg-violet-100 border border-violet-200"/>Serving (Kafka/Flink/HBase)</span>
      <span className="flex items-center gap-1.5 text-slate-400"><span className="w-2 h-2 rounded-sm bg-teal-600 border border-teal-600"/>Fine Feature</span>
    </div>
  </div>;
}

/* ── Freshness ───────────────────────────────────────────────── */
const HP:Record<string,{label:string;ab:string;aB:string;at:string;ei:React.ReactNode;et:string}>={
  training:{label:"Training",ab:"bg-emerald-50/60",aB:"border-emerald-200",at:"text-emerald-700",ei:<Layers className="w-8 h-8 text-emerald-300"/>,et:"No Training freshness signals"},
  serving:{label:"Serving",ab:"bg-violet-50/60",aB:"border-violet-200",at:"text-violet-700",ei:<Zap className="w-8 h-8 text-violet-300"/>,et:"No Serving freshness signals"},
};
function FreshnessTab({signals,featureName,hasTraining,hasServing}:{signals:HealthSignal[];featureName:string;hasTraining:boolean;hasServing:boolean}) {
  const [f,setF]=useState<"all"|"warning">("all");
  const ts=signals.filter(s=>s.path==="training"), ss=signals.filter(s=>s.path==="serving");
  const fn=(s:HealthSignal)=>f==="all"?true:s.severity==="warning"||s.severity==="critical";
  const ft=ts.filter(fn),fs=ss.filter(fn);
  const o=ts.filter(s=>s.severity==="ok").length+ss.filter(s=>s.severity==="ok").length;
  const w=ts.filter(s=>s.severity==="warning"||s.severity==="critical").length+ss.filter(s=>s.severity==="warning"||s.severity==="critical").length;
  return <div className="px-4 sm:px-6 py-5 space-y-5">
    <div className="flex items-center gap-2 text-[11px] text-slate-400 uppercase tracking-wider"><Activity className="w-3 h-3 text-teal-500"/><span>Upstream pipeline freshness for</span><span className="font-mono text-teal-600 normal-case tracking-normal">{featureName}</span></div>
    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 flex-wrap">
      <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center"><Activity className="w-4 h-4 text-teal-600"/></div><div className="text-[10px] text-slate-400 flex items-center gap-2"><span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"/> {o} OK</span>{w>0&&<span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-400"/> {w} warning</span>}</div></div>
      <div className="flex items-center gap-1 ml-auto">{(["all","warning"]as const).map(v=><button key={v} onClick={()=>setF(v)} className={`px-2.5 py-1 rounded text-[10px] font-medium transition-colors ${f===v?"bg-white text-slate-700 border border-slate-300 shadow-sm":"text-slate-400 hover:text-slate-600"}`}>{v==="all"?"All":"Warnings"}</button>)}</div>
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
      <FPC path="training" signals={ft} hp={hasTraining}/><FPC path="serving" signals={fs} hp={hasServing}/>
    </div>
  </div>;
}
function FPC({path,signals,hp}:{path:"training"|"serving";signals:HealthSignal[];hp:boolean}) {
  const c=HP[path];if(!hp&&signals.length===0)return null;
  return <div className="space-y-3">
    <div className={`rounded-xl border ${c.aB} ${c.ab} px-4 py-3`}><div className="flex items-center gap-2"><span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${c.ab} ${c.aB} border ${c.at} text-[11px] font-semibold`}><span className={`w-1.5 h-1.5 rounded-full ${path==="training"?"bg-emerald-400":"bg-violet-400"}`}/>{c.label} Freshness</span></div><p className="text-[10px] text-slate-500 leading-relaxed mt-1">{path==="training"?"Hive ODS/DWD/ADS · latency, partition freshness":"Kafka/Flink/HBase/FG · lag, write freshness, serving latency"}</p></div>
    {signals.length>0?<div className="space-y-2.5">{signals.map(s=>{const sv=SEV_STYLE[s.severity];return <motion.div key={s.id} initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} transition={{duration:.2}} className={`rounded-xl border p-3.5 transition-shadow hover:shadow-sm ${s.severity==="critical"?"border-red-200 bg-red-50/30":s.severity==="warning"?"border-amber-200 bg-amber-50/20":"border-slate-200 bg-white"}`}><div className="flex items-start justify-between gap-2"><div className="flex items-start gap-2.5 min-w-0"><span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${sv.cls} flex-shrink-0`}>{sv.icon}{s.signalType==="latency"?"Latency":s.signalType==="freshness"?"Freshness":"OK"}</span><div className="min-w-0"><div className="text-[12px] font-semibold text-slate-800">{s.summary}</div><div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate" title={s.stage}>{s.stage}</div><p className="text-[11px] text-slate-500 mt-1 leading-relaxed max-w-2xl">{s.detail}</p></div></div><div className="flex flex-col items-end gap-0.5 flex-shrink-0"><span className={`text-[12px] font-mono font-bold ${s.severity==="critical"?"text-red-600":s.severity==="warning"?"text-amber-600":"text-emerald-600"}`}>{s.value}</span><span className="text-[9px] text-slate-400">baseline: {s.baseline}</span><span className="text-[9px] text-slate-400 flex items-center gap-1"><Clock className="w-2.5 h-2.5"/>{s.updatedAt}</span></div></div></motion.div>;})}</div>:<div className={`rounded-xl border border-dashed ${c.aB} ${c.ab} flex flex-col items-center justify-center py-10 px-4 text-center`}>{c.ei}<p className="text-xs text-slate-400 mt-2">{c.et}</p></div>}
  </div>;
}

/* ── Health ──────────────────────────────────────────────────── */
function HealthTab({rules:ir,metrics,featureName}:{rules:HealthRule[];metrics:HealthMetric[];featureName:string}) {
  const [rs,setRs]=useState<HealthRule[]>(ir);const [eid,setEid]=useState<string|null>(null);const [d,setD]=useState<Partial<HealthRule>>({});
  const add=eid==="__new__";
  function sa(){setEid("__new__");setD({metric:"null_pct",operator:">=",threshold:"",enabled:true});}
  function se(r:HealthRule){setEid(r.id);setD({...r});}
  function cc(){setEid(null);setD({});}
  function sv(){
    if(!d.metric||!d.operator||!d.threshold?.trim())return;
    const s:HealthRule={id:add?`r_${Date.now()}`:eid!,metric:d.metric as HealthRule["metric"],operator:d.operator as HealthRule["operator"],threshold:d.threshold,enabled:d.enabled??true};
    if(add){setRs(p=>[...p,s]);}else{setRs(p=>p.map(r=>r.id===s.id?s:r));}cc();
  }
  function dl(id:string){setRs(p=>p.filter(r=>r.id!==id));if(eid===id)cc();}
  function tg(id:string){setRs(p=>p.map(r=>r.id===id?{...r,enabled:!r.enabled}:r));}
  const wc=metrics.filter(m=>m.severity==="warning"||m.severity==="critical").length;
  const cc2=metrics.filter(m=>m.severity==="critical").length;

  return <div className="px-4 sm:px-6 py-5 space-y-6">
    <div className="flex items-center gap-2 text-[11px] text-slate-400 uppercase tracking-wider"><Gauge className="w-3 h-3 text-teal-500"/><span>Health thresholds & metrics for</span><span className="font-mono text-teal-600 normal-case tracking-normal">{featureName}</span></div>
    {/* Thresholds */}
    <div>
      <div className="flex items-center gap-2 mb-3"><span className="text-xs font-semibold text-slate-700">Health Thresholds</span><span className="text-[10px] text-slate-400">Define healthy ranges</span></div>
      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-2.5 bg-slate-50/60 border-b border-slate-200 flex items-center gap-4 text-[10px] uppercase tracking-wide text-slate-400 font-medium"><span className="flex-1">Metric</span><span className="w-20 text-center">Operator</span><span className="w-24 text-center">Threshold</span><span className="w-16 text-center">Active</span><span className="w-14"/></div>
        <div className="divide-y divide-slate-50">
          {rs.map(r=>{const ia=eid===r.id;const ml=METRIC_OPTIONS.find(m=>m.value===r.metric)?.label??r.metric;const mc=r.metric==="null_pct"?"bg-sky-50 text-sky-700 border-sky-200":r.metric==="fail_pct"?"bg-red-50 text-red-600 border-red-200":"bg-amber-50 text-amber-700 border-amber-200";
            if(ia)return <div key={r.id} className="px-4 py-2.5 bg-teal-50/30 flex items-center gap-4">
              <select value={d.metric??"null_pct"} onChange={e=>setD(p=>({...p,metric:e.target.value as HealthRule["metric"]}))} className="flex-1 px-2 py-1.5 rounded-lg border border-slate-200 text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-teal-400">{METRIC_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select>
              <select value={d.operator??">="} onChange={e=>setD(p=>({...p,operator:e.target.value as HealthRule["operator"]}))} className="w-20 px-2 py-1.5 rounded-lg border border-slate-200 text-xs text-center font-mono bg-white focus:outline-none focus:ring-2 focus:ring-teal-400">{OPERATOR_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select>
              <input value={d.threshold??""} onChange={e=>setD(p=>({...p,threshold:e.target.value}))} placeholder="e.g. 5" className="w-24 px-2 py-1.5 rounded-lg border border-slate-200 text-xs text-center font-mono bg-white focus:outline-none focus:ring-2 focus:ring-teal-400"/>
              <div className="w-16 flex justify-center"><button onClick={()=>setD(p=>({...p,enabled:!(p.enabled??true)}))} className={`relative w-8 h-4 rounded-full transition-colors ${(d.enabled??true)?"bg-teal-500":"bg-slate-200"}`}><span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${(d.enabled??true)?"left-4":"left-0.5"}`}/></button></div>
              <div className="w-14 flex items-center gap-1.5 justify-end"><button onClick={sv} className="p-1 rounded text-teal-600 hover:bg-teal-100 transition-colors" title="Save"><CheckCircle2 className="w-3.5 h-3.5"/></button><button onClick={cc} className="p-1 rounded text-slate-400 hover:bg-slate-100 transition-colors" title="Cancel"><X className="w-3.5 h-3.5"/></button></div>
            </div>;
            return <div key={r.id} className="px-4 py-2.5 flex items-center gap-4 hover:bg-slate-50/50 transition-colors">
              <span className="flex-1"><span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border ${mc}`}>{r.metric==="null_pct"?<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></svg>:r.metric==="fail_pct"?<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>:<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>}{ml}</span></span>
              <span className="w-20 text-center text-xs font-mono text-slate-600">{r.operator}</span><span className="w-24 text-center text-xs font-mono text-slate-700 font-semibold">{r.threshold}</span>
              <div className="w-16 flex justify-center"><button onClick={()=>tg(r.id)} className="relative w-8 h-4 rounded-full transition-colors" style={{backgroundColor:r.enabled?"#13c2c2":"#cbd5e1"}}><span className="absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all" style={{left:r.enabled?"1rem":"0.125rem"}}/></button></div>
              <div className="w-14 flex items-center gap-1.5 justify-end"><button onClick={()=>se(r)} className="p-1 rounded text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition-colors" title="Edit"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button><button onClick={()=>dl(r.id)} className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Delete"><Trash2 className="w-3 h-3"/></button></div>
            </div>;
          })}
          {rs.length===0&&!add&&<div className="px-4 py-10 text-center"><Gauge className="w-8 h-8 text-slate-200 mx-auto mb-2"/><p className="text-xs text-slate-400">No thresholds configured yet</p></div>}
          {add&&<div className="px-4 py-2.5 bg-teal-50/30 flex items-center gap-4">
            <select value={d.metric??"null_pct"} onChange={e=>setD(p=>({...p,metric:e.target.value as HealthRule["metric"]}))} className="flex-1 px-2 py-1.5 rounded-lg border border-slate-200 text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-teal-400">{METRIC_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select>
            <select value={d.operator??">="} onChange={e=>setD(p=>({...p,operator:e.target.value as HealthRule["operator"]}))} className="w-20 px-2 py-1.5 rounded-lg border border-slate-200 text-xs text-center font-mono bg-white focus:outline-none focus:ring-2 focus:ring-teal-400">{OPERATOR_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select>
            <input value={d.threshold??""} onChange={e=>setD(p=>({...p,threshold:e.target.value}))} placeholder="e.g. 5" className="w-24 px-2 py-1.5 rounded-lg border border-slate-200 text-xs text-center font-mono bg-white focus:outline-none focus:ring-2 focus:ring-teal-400"/>
            <div className="w-16 flex justify-center"><button onClick={()=>setD(p=>({...p,enabled:!(p.enabled??true)}))} className={`relative w-8 h-4 rounded-full transition-colors ${(d.enabled??true)?"bg-teal-500":"bg-slate-200"}`}><span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${(d.enabled??true)?"left-4":"left-0.5"}`}/></button></div>
            <div className="w-14 flex items-center gap-1.5 justify-end"><button onClick={sv} className="p-1 rounded text-teal-600 hover:bg-teal-100 transition-colors" title="Save"><CheckCircle2 className="w-3.5 h-3.5"/></button><button onClick={cc} className="p-1 rounded text-slate-400 hover:bg-slate-100 transition-colors" title="Cancel"><X className="w-3.5 h-3.5"/></button></div>
          </div>}
        </div>
      </div>
      {!add&&<button onClick={sa} className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border-2 border-dashed border-slate-300 text-[12px] text-slate-500 hover:border-teal-400 hover:text-teal-600 transition-colors bg-white"><Plus className="w-3.5 h-3.5"/>Add Threshold</button>}
    </div>
    {/* Metrics */}
    <div>
      <div className="flex items-center gap-2 mb-3"><span className="text-xs font-semibold text-slate-700">Health Metrics</span><span className="text-[10px] text-slate-400">T+1 runtime · yesterday</span>{wc>0&&<span className="inline-flex items-center justify-center min-w-[18px] h-4 rounded-full text-[9px] font-bold text-white bg-amber-500 px-1.5">{wc}</span>}{cc2>0&&<span className="inline-flex items-center justify-center min-w-[18px] h-4 rounded-full text-[9px] font-bold text-white bg-red-500 px-1.5">{cc2} critical</span>}</div>
      <div className="space-y-2.5">
        {metrics.map(m=>{const sc=m.severity==="critical"?"border-red-200 bg-red-50/30":m.severity==="warning"?"border-amber-200 bg-amber-50/20":"border-slate-200 bg-white";const sb=m.severity==="critical"?"bg-red-50 text-red-600 border-red-200":m.severity==="warning"?"bg-amber-50 text-amber-700 border-amber-200":"bg-emerald-50 text-emerald-700 border-emerald-200";const mc=m.metric==="null_pct"?"bg-sky-50 text-sky-700 border-sky-200":m.metric==="fail_pct"?"bg-red-50 text-red-600 border-red-200":"bg-amber-50 text-amber-700 border-amber-200";const cc=m.severity==="critical"?"text-red-600":m.severity==="warning"?"text-amber-600":"text-emerald-600";return <motion.div key={m.id} initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} transition={{duration:.2}} className={`rounded-xl border p-3.5 transition-shadow hover:shadow-sm ${sc}`}><div className="flex items-start justify-between gap-2"><div className="flex items-start gap-2.5 min-w-0"><span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${mc} flex-shrink-0`}>{m.label}</span><div className="min-w-0"><div className="flex items-center gap-2"><div className="text-[12px] font-semibold text-slate-800">{m.severity==="ok"?`${m.label} healthy`:m.severity==="warning"?`${m.label} above threshold`:`${m.label} critical`}</div><span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${sb}`}>{m.severity==="critical"?<AlertTriangle className="w-2.5 h-2.5"/>:m.severity==="warning"?<TrendingUp className="w-2.5 h-2.5"/>:<CheckCircle2 className="w-2.5 h-2.5"/>}{m.severity==="ok"?"OK":m.severity==="warning"?"Warning":"Critical"}</span></div><p className="text-[11px] text-slate-500 mt-1 leading-relaxed max-w-2xl">{m.detail}</p></div></div><div className="flex flex-col items-end gap-0.5 flex-shrink-0"><span className={`text-[14px] font-mono font-bold ${cc}`}>{m.current}</span><span className="text-[9px] text-slate-400">threshold: {m.threshold}</span><span className="text-[9px] text-slate-400 flex items-center gap-1"><Clock className="w-2.5 h-2.5"/>{m.updatedAt}</span></div></div></motion.div>;})}
      </div>
    </div>
  </div>;
}
