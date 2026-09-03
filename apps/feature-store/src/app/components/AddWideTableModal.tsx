import { useState, useEffect, useRef } from "react";
import { X, ChevronDown, Check } from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────
const REGIONS = ["TH", "MX", "SHOPEE_SG", "ID", "PH", "VN", "MY", "BR", "TW", "SG"];

const OWNER_OPTIONS = [
  "cedric.chencan@seamoney.com",
  "zhengyi.loh@seamoney.com",
  "marco.diaz@seamoney.com",
  "huangwei@shopee.com",
  "budi.santoso@seamoney.com",
  "rini.kusuma@seamoney.com",
  "agus.prasetya@seamoney.com",
  "carlos.reyes@seamoney.com",
  "nguyen.lan@seamoney.com",
  "tran.minh@seamoney.com",
  "aimee.tan@shopee.com",
  "ana.souza@seamoney.com",
  "pedro.lima@seamoney.com",
];

const BIZ_TEAMS = [
  "DataSci",
  "PolicyBuyer",
  "CreditRisk",
  "FraudOps",
  "GrowthData",
  "MerchantOps",
  "PaymentRisk",
];

// ─── Types ────────────────────────────────────────────────────────────────────
export interface WideTableFormValues {
  name: string;
  region: string;
  owners: string[];
  bizTeam: string;
  description: string;
}

interface Props {
  onClose: () => void;
  onConfirm: (values: WideTableFormValues) => void;
  /** Quick new task from list Copy */
  mode?: "create" | "copy";
  copySourceName?: string;
}

// ─── Field Wrapper ────────────────────────────────────────────────────────────
function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs text-gray-600 flex items-center gap-1">
        {label}
        <span className="text-red-400">*</span>
      </label>
      {children}
      {error && <span className="text-xs text-red-400 mt-0.5">{error}</span>}
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
export function AddWideTableModal({
  onClose,
  onConfirm,
  mode = "create",
  copySourceName,
}: Props) {
  const [form, setForm] = useState<WideTableFormValues>({
    name: "",
    region: "",
    owners: [],
    bizTeam: "",
    description:
      mode === "copy" && copySourceName
        ? `Copy from ${copySourceName}`
        : "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof WideTableFormValues, string>>>({});
  const [ownerOpen, setOwnerOpen] = useState(false);
  const ownerRef = useRef<HTMLDivElement>(null);

  // ESC closes modal
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Click outside owner dropdown
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ownerRef.current && !ownerRef.current.contains(e.target as Node)) {
        setOwnerOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const clearError = (field: keyof WideTableFormValues) =>
    setErrors((prev) => ({ ...prev, [field]: undefined }));

  const validate = () => {
    const errs: Partial<Record<keyof WideTableFormValues, string>> = {};
    if (!form.name.trim()) errs.name = "WideTable Name is required";
    if (!form.region) errs.region = "Region is required";
    if (form.owners.length === 0) errs.owners = "At least one owner is required";
    if (!form.bizTeam) errs.bizTeam = "Biz Team is required";
    if (!form.description.trim()) errs.description = "Description is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleConfirm = () => {
    if (validate()) onConfirm(form);
  };

  const toggleOwner = (o: string) => {
    setForm((f) => ({
      ...f,
      owners: f.owners.includes(o)
        ? f.owners.filter((x) => x !== o)
        : [...f.owners, o],
    }));
    clearError("owners");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 bg-teal-500 rounded-full" />
              <h2 className="text-gray-800">New WideTable</h2>
            </div>
            <p className="text-xs text-gray-400 mt-1 ml-3">
              Fill in metadata — all fields are required.
            </p>
            {mode === "copy" && copySourceName && (
              <p className="text-xs text-teal-700 mt-2 ml-3 font-medium">
                Copy from {copySourceName}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
            title="Close (ESC)"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <div className="px-6 py-5 flex flex-col gap-4 overflow-y-auto max-h-[60vh]">
          {/* WideTable Name */}
          <Field label="WideTable Name" error={errors.name}>
            <input
              type="text"
              placeholder="e.g. risk_wide_table_th"
              value={form.name}
              onChange={(e) => {
                setForm((f) => ({ ...f, name: e.target.value }));
                clearError("name");
              }}
              className={`w-full px-3 py-2 text-sm border rounded-lg outline-none transition-all placeholder:text-gray-300 ${
                errors.name
                  ? "border-red-300 focus:ring-2 focus:ring-red-100"
                  : "border-gray-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-50"
              }`}
            />
          </Field>

          {/* Region */}
          <Field label="Region" error={errors.region}>
            <div className="relative">
              <select
                value={form.region}
                onChange={(e) => {
                  setForm((f) => ({ ...f, region: e.target.value }));
                  clearError("region");
                }}
                className={`w-full px-3 py-2 text-sm border rounded-lg outline-none transition-all appearance-none bg-white pr-8 ${
                  errors.region
                    ? "border-red-300 focus:ring-2 focus:ring-red-100"
                    : "border-gray-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-50"
                } ${!form.region ? "text-gray-300" : "text-gray-700"}`}
              >
                <option value="" disabled>
                  Select region...
                </option>
                {REGIONS.map((r) => (
                  <option key={r} value={r} className="text-gray-700">
                    {r}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
            </div>
          </Field>

          {/* Owner multi-select */}
          <Field label="Owner" error={errors.owners}>
            <div ref={ownerRef} className="relative">
              <button
                type="button"
                onClick={() => setOwnerOpen((v) => !v)}
                className={`w-full px-3 py-2 text-sm border rounded-lg outline-none transition-all text-left flex items-center justify-between ${
                  errors.owners ? "border-red-300" : "border-gray-200"
                } ${
                  ownerOpen
                    ? "border-teal-400 ring-2 ring-teal-50"
                    : "hover:border-gray-300"
                }`}
              >
                <span
                  className={
                    form.owners.length === 0 ? "text-gray-300" : "text-gray-700"
                  }
                >
                  {form.owners.length === 0
                    ? "Select owners..."
                    : `${form.owners.length} owner${form.owners.length > 1 ? "s" : ""} selected`}
                </span>
                <ChevronDown
                  size={14}
                  className={`text-gray-400 transition-transform ${ownerOpen ? "rotate-180" : ""}`}
                />
              </button>

              {/* Selected tags */}
              {form.owners.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {form.owners.map((o) => (
                    <span
                      key={o}
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-teal-50 text-teal-700 border border-teal-100 rounded-full"
                    >
                      {o}
                      <button
                        type="button"
                        onClick={() => toggleOwner(o)}
                        className="hover:text-teal-900 transition-colors"
                      >
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Dropdown list */}
              {ownerOpen && (
                <div className="absolute z-20 top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl max-h-48 overflow-y-auto py-1">
                  {OWNER_OPTIONS.map((o) => {
                    const selected = form.owners.includes(o);
                    return (
                      <button
                        key={o}
                        type="button"
                        onClick={() => toggleOwner(o)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left transition-colors ${
                          selected
                            ? "bg-teal-50 text-teal-700"
                            : "text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        <span
                          className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                            selected
                              ? "bg-teal-500 border-teal-500"
                              : "border-gray-300"
                          }`}
                        >
                          {selected && (
                            <Check size={10} className="text-white" />
                          )}
                        </span>
                        {o}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </Field>

          {/* Biz Team */}
          <Field label="Biz Team" error={errors.bizTeam}>
            <div className="relative">
              <select
                value={form.bizTeam}
                onChange={(e) => {
                  setForm((f) => ({ ...f, bizTeam: e.target.value }));
                  clearError("bizTeam");
                }}
                className={`w-full px-3 py-2 text-sm border rounded-lg outline-none transition-all appearance-none bg-white pr-8 ${
                  errors.bizTeam
                    ? "border-red-300 focus:ring-2 focus:ring-red-100"
                    : "border-gray-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-50"
                } ${!form.bizTeam ? "text-gray-300" : "text-gray-700"}`}
              >
                <option value="" disabled>
                  Select biz team...
                </option>
                {BIZ_TEAMS.map((b) => (
                  <option key={b} value={b} className="text-gray-700">
                    {b}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
            </div>
          </Field>

          {/* Description */}
          <Field label="Description" error={errors.description}>
            <textarea
              rows={3}
              placeholder="Describe the purpose and scope of this WideTable..."
              value={form.description}
              onChange={(e) => {
                setForm((f) => ({ ...f, description: e.target.value }));
                clearError("description");
              }}
              className={`w-full px-3 py-2 text-sm border rounded-lg outline-none transition-all resize-none placeholder:text-gray-300 ${
                errors.description
                  ? "border-red-300 focus:ring-2 focus:ring-red-100"
                  : "border-gray-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-50"
              }`}
            />
          </Field>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50/60">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex items-center gap-2 px-5 py-2 text-sm text-white bg-teal-500 rounded-lg hover:bg-teal-600 active:bg-teal-700 transition-all shadow-sm shadow-teal-200"
          >
            To Canvas
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              className="opacity-90"
            >
              <path
                d="M2 7h10M8 3l4 4-4 4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
