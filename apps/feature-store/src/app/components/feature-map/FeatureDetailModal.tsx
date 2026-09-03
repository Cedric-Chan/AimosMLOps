import { useEffect, useMemo, useState } from "react";
import {
  X, Boxes, Database, Server, Tag as TagIcon, Link2, FileText,
} from "lucide-react";
import type { Feature, UsedByAsset } from "./types";
import { resolveFeatureSetInfo } from "@/lib/featureDetail";
import { tagsByFacet, getTag } from "@/data/tagCatalog";

/* ── small atoms ─────────────────────────────────────────────────────────── */

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h3
      className="text-xs text-gray-400 flex items-center gap-2 mb-3"
      style={{ fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}
    >
      <span className="w-4 h-0.5 rounded" style={{ backgroundColor: "#13c2c2" }} />
      {children}
    </h3>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-2 min-w-0">
      <span className="flex-shrink-0 text-gray-400 text-xs" style={{ fontWeight: 500, width: 96 }}>
        {label}
      </span>
      <div className="flex-1 min-w-0 text-xs text-gray-700">{children}</div>
    </div>
  );
}

function Mono({ children }: { children: React.ReactNode }) {
  return <span className="font-mono text-gray-700">{children}</span>;
}

function AvailabilityBadge({ t, s }: { t: boolean | null; s: boolean | null }) {
  if (t && s) return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700">T + S</span>;
  if (t) return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-green-50 text-green-700">T only</span>;
  if (s) return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700">S only</span>;
  return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-400">none</span>;
}

/* ConfigPanel — matches FeatureGroupDetail training/serving panel look */
function ConfigPanel({
  icon, title, children,
}: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div
      className="bg-white rounded-xl border border-gray-200 overflow-hidden"
      style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
    >
      <div
        className="flex items-center gap-1.5 px-3.5 py-2 border-b border-gray-100"
        style={{ background: "linear-gradient(to right, rgba(19,194,194,0.06), transparent)" }}
      >
        <span style={{ color: "#13c2c2" }}>{icon}</span>
        <span
          className="text-[11px]"
          style={{ fontWeight: 700, color: "#0e9494", letterSpacing: "0.03em", textTransform: "uppercase" }}
        >
          {title}
        </span>
      </div>
      <div className="px-3.5 py-2.5 flex flex-col gap-2">{children}</div>
    </div>
  );
}

function OwnerPill({ email }: { email: string }) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-md text-xs"
      style={{ background: "#f3f4f6", color: "#374151", border: "1px solid #e5e7eb", fontWeight: 500 }}
    >
      {email}
    </span>
  );
}

/* ── Used By table ───────────────────────────────────────────────────────── */

const ASSET_DOT: Record<UsedByAsset["assetType"], string> = {
  "WideTable": "bg-emerald-400",
  "Feature Service": "bg-sky-400",
  "Workflow Service": "bg-violet-400",
};
const ASSET_TEXT: Record<UsedByAsset["assetType"], string> = {
  "WideTable": "text-emerald-700",
  "Feature Service": "text-sky-700",
  "Workflow Service": "text-violet-700",
};

function UsedByTable({ items }: { items: UsedByAsset[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/40 py-7 flex flex-col items-center justify-center text-center">
        <Link2 className="w-5 h-5 text-gray-300 mb-1.5" />
        <p className="text-xs text-gray-400">No downstream consumers yet</p>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-gray-50/70 border-b border-gray-100 text-[11px] uppercase tracking-wider text-gray-400">
            <th className="px-4 py-2.5 text-left font-medium">Asset Type</th>
            <th className="px-4 py-2.5 text-left font-medium">Asset Name</th>
            <th className="px-4 py-2.5 text-left font-medium">Version</th>
            <th className="px-4 py-2.5 text-left font-medium">Owner</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => (
            <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
              <td className="px-4 py-2.5">
                <span className={`inline-flex items-center gap-1.5 ${ASSET_TEXT[it.assetType]}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${ASSET_DOT[it.assetType]}`} />
                  {it.assetType}
                </span>
              </td>
              <td className="px-4 py-2.5 font-mono text-gray-700">{it.assetName}</td>
              <td className="px-4 py-2.5">
                {it.version === "-" ? (
                  <span className="text-gray-300">—</span>
                ) : (
                  <span className="font-mono text-gray-600">{it.version}</span>
                )}
              </td>
              <td className="px-4 py-2.5 text-gray-500">@{it.owner}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── modal ───────────────────────────────────────────────────────────────── */

export function FeatureDetailModal({
  open, feature, onClose, onSave,
}: {
  open: boolean;
  feature: Feature | null;
  onClose: () => void;
  onSave?: (id: string, patch: { tags: string[]; description: string }) => void;
}) {
  const [tags, setTags] = useState<string[]>([]);
  const [description, setDescription] = useState("");

  // Seed editable state whenever a new feature opens
  useEffect(() => {
    if (open && feature) {
      setTags(feature.tags ?? []);
      setDescription(feature.description ?? "");
    }
  }, [open, feature]);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [open, onClose]);

  const info = useMemo(() => (feature ? resolveFeatureSetInfo(feature) : null), [feature]);

  if (!open || !feature || !info) return null;

  const addTag = (id: string) => {
    if (id && !tags.includes(id)) setTags([...tags, id]);
  };
  const removeTag = (t: string) => setTags(tags.filter((x) => x !== t));

  const handleOk = () => {
    onSave?.(feature.id, { tags, description });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[75] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-teal-200 mt-0.5">
              <Boxes className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2
                  className="text-slate-800 truncate"
                  style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 17 }}
                >
                  {feature.name}
                </h2>
                <AvailabilityBadge t={feature.training} s={feature.serving} />
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border bg-gray-50 text-gray-500 border-gray-200">
                  {feature.region}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Fine feature · returns <span className="font-mono text-slate-500">{feature.returnType ?? feature.dataType}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 flex flex-col gap-6 overflow-y-auto">
          {/* ── Feature Group Info ── */}
          <section>
            <SectionHeader>Feature Group Info</SectionHeader>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2.5 mb-3">
              <InfoRow label="FeatureGroup">
                {info.fgId ? (
                  <a
                    href={`#/fg/${info.fgId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono bg-gray-50 border border-gray-100 px-1.5 py-0.5 rounded text-[11px] text-teal-600 hover:text-teal-800 hover:border-teal-200 hover:bg-teal-50 transition-colors"
                  >
                    {info.featureGroup} ↗
                  </a>
                ) : (
                  <span className="font-mono bg-gray-50 border border-gray-100 px-1.5 py-0.5 rounded text-[11px]">
                    {info.featureGroup}
                  </span>
                )}
              </InfoRow>
              <InfoRow label="Module">{info.module}</InfoRow>
              <InfoRow label="Region">{info.region}</InfoRow>
              <InfoRow label="Entity">
                <Mono>{feature.entity}</Mono>
              </InfoRow>
              <div className="col-span-2">
                <InfoRow label="Owner">
                  <span className="flex flex-wrap gap-1.5">
                    {info.owners.length > 0
                      ? info.owners.map((o) => <OwnerPill key={o} email={o} />)
                      : <span className="text-gray-400">—</span>}
                  </span>
                </InfoRow>
              </div>
            </div>

            {(info.training || info.serving) && (
              <div className={`grid gap-3 ${info.training && info.serving ? "grid-cols-2" : "grid-cols-1"}`}>
                {info.training && (
                  <ConfigPanel icon={<Database className="w-3.5 h-3.5" />} title="Training">
                    <InfoRow label="Hive Table"><Mono>{info.training.hiveTable}</Mono></InfoRow>
                    <InfoRow label="Entity Col">
                      <span className="flex flex-wrap gap-1">
                        {info.training.entityColumns.map((c) => (
                          <span key={c} className="font-mono bg-gray-50 border border-gray-100 px-1.5 py-0.5 rounded text-[11px]">{c}</span>
                        ))}
                      </span>
                    </InfoRow>
                  </ConfigPanel>
                )}
                {info.serving && (
                  <ConfigPanel icon={<Server className="w-3.5 h-3.5" />} title="Serving">
                    <InfoRow label="FeatureSource"><Mono>{info.serving.featureSource}</Mono></InfoRow>
                    <InfoRow label="Input Param">
                      <span className="flex flex-wrap gap-1">
                        {info.serving.inputParams.map((c) => (
                          <span key={c} className="font-mono bg-gray-50 border border-gray-100 px-1.5 py-0.5 rounded text-[11px]">{c}</span>
                        ))}
                      </span>
                    </InfoRow>
                  </ConfigPanel>
                )}
              </div>
            )}
          </section>

          {/* ── Feature Info ── */}
          <section>
            <SectionHeader>Feature Info</SectionHeader>
            {/* Editable tags */}
            <div className="mb-3">
              <div className="flex items-center gap-1 mb-1.5 text-xs text-gray-600" style={{ fontWeight: 500 }}>
                <TagIcon className="w-3 h-3 text-gray-400" /> Feature Tag
              </div>
              <div className="min-h-[42px] flex flex-wrap items-center gap-1.5 p-2 border border-gray-200 rounded-lg bg-white focus-within:border-[#13c2c2] transition-colors">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-teal-50 text-teal-700 border border-teal-100 rounded-full"
                  >
                    {getTag(t)?.label ?? t}
                    <button onClick={() => removeTag(t)} className="hover:text-teal-900">
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}
                <select
                  value=""
                  onChange={(e) => { if (e.target.value) addTag(e.target.value); }}
                  className="flex-1 min-w-[130px] outline-none text-xs bg-transparent text-gray-500 py-0.5 cursor-pointer"
                >
                  <option value="">+ Add tag…</option>
                  {tagsByFacet().map((g) => {
                    const opts = g.tags.filter((t) => !tags.includes(t.id));
                    return opts.length ? (
                      <optgroup key={g.facet} label={g.facet}>
                        {opts.map((t) => (
                          <option key={t.id} value={t.id}>{t.label}</option>
                        ))}
                      </optgroup>
                    ) : null;
                  })}
                </select>
              </div>
            </div>

            {/* Editable description */}
            <div>
              <div className="flex items-center gap-1 mb-1.5 text-xs text-gray-600" style={{ fontWeight: 500 }}>
                <FileText className="w-3 h-3 text-gray-400" /> Description
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Describe this feature…"
                className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 bg-white text-gray-700 placeholder-gray-300 outline-none focus:border-[#13c2c2] transition-colors resize-none leading-relaxed"
              />
            </div>
          </section>

          {/* ── Used By ── */}
          <section>
            <SectionHeader>Used By</SectionHeader>
            <UsedByTable items={feature.usedBy ?? []} />
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-gray-50/60 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleOk}
            className="px-5 py-2 text-sm text-white bg-teal-500 rounded-lg hover:bg-teal-600 transition-all"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
