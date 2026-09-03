import { useState, useEffect, useRef } from "react";
import { X, ChevronDown, Check } from "lucide-react";
import { WideTableFormValues } from "./AddWideTableModal";

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

interface Props {
  values: WideTableFormValues;
  onClose: () => void;
  /** When true (e.g. Instance View canvas), all fields are read-only and Save is hidden. */
  readOnly?: boolean;
  onSave?: (updated: WideTableFormValues) => void;
}

function ReadOnlyField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs text-gray-500 flex items-center gap-1.5">
        {label}
        <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded font-mono">
          read-only
        </span>
      </label>
      <div className="px-3 py-2 text-sm text-gray-500 bg-gray-50 border border-gray-100 rounded-lg">
        {value}
      </div>
    </div>
  );
}

function EditField({
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
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}

export function WideTableMetaModal({ values, onClose, readOnly = false, onSave }: Props) {
  const [owners, setOwners] = useState<string[]>(values.owners);
  const [bizTeam, setBizTeam] = useState(values.bizTeam);
  const [description, setDescription] = useState(values.description);
  const [errors, setErrors] = useState<{ owners?: string; bizTeam?: string; description?: string }>({});
  const [ownerOpen, setOwnerOpen] = useState(false);
  const ownerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ownerRef.current && !ownerRef.current.contains(e.target as Node)) {
        setOwnerOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const validate = () => {
    const errs: typeof errors = {};
    if (owners.length === 0) errs.owners = "At least one owner is required";
    if (!bizTeam) errs.bizTeam = "Biz Team is required";
    if (!description.trim()) errs.description = "Description is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = () => {
    if (readOnly || !onSave) return;
    if (validate()) onSave({ ...values, owners, bizTeam, description });
  };

  const toggleOwner = (o: string) => {
    setOwners((prev) =>
      prev.includes(o) ? prev.filter((x) => x !== o) : [...prev, o]
    );
    setErrors((e) => ({ ...e, owners: undefined }));
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
              <h2 className="text-gray-800">WideTable Meta</h2>
            </div>
            <p className="text-xs text-gray-400 mt-1 ml-3">
              {readOnly
                ? "View only — metadata cannot be changed in Instance View."
                : "WideTable Name and Region are not editable."}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
            title="Close (ESC)"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <div className="px-6 py-5 flex flex-col gap-4 overflow-y-auto max-h-[60vh]">
          <ReadOnlyField label="WideTable Name" value={values.name} />
          <ReadOnlyField label="Region" value={values.region} />

          {readOnly ? (
            <>
              <ReadOnlyField
                label="Owner"
                value={values.owners.length ? values.owners.join(", ") : "—"}
              />
              <ReadOnlyField label="Biz Team" value={values.bizTeam || "—"} />
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-gray-500 flex items-center gap-1.5">
                  Description
                  <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded font-mono">
                    read-only
                  </span>
                </label>
                <div className="px-3 py-2 text-sm text-gray-500 bg-gray-50 border border-gray-100 rounded-lg whitespace-pre-wrap min-h-[4.5rem]">
                  {values.description.trim() || "—"}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Owner multi-select */}
              <EditField label="Owner" error={errors.owners}>
                <div ref={ownerRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setOwnerOpen((v) => !v)}
                    className={`w-full px-3 py-2 text-sm border rounded-lg outline-none transition-all text-left flex items-center justify-between ${
                      errors.owners ? "border-red-300" : "border-gray-200"
                    } ${ownerOpen ? "border-teal-400 ring-2 ring-teal-50" : "hover:border-gray-300"}`}
                  >
                    <span className={owners.length === 0 ? "text-gray-300" : "text-gray-700"}>
                      {owners.length === 0
                        ? "Select owners..."
                        : `${owners.length} owner${owners.length > 1 ? "s" : ""} selected`}
                    </span>
                    <ChevronDown
                      size={14}
                      className={`text-gray-400 transition-transform ${ownerOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  {owners.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {owners.map((o) => (
                        <span
                          key={o}
                          className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-teal-50 text-teal-700 border border-teal-100 rounded-full"
                        >
                          {o}
                          <button type="button" onClick={() => toggleOwner(o)}>
                            <X size={10} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  {ownerOpen && (
                    <div className="absolute z-20 top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl max-h-48 overflow-y-auto py-1">
                      {OWNER_OPTIONS.map((o) => {
                        const selected = owners.includes(o);
                        return (
                          <button
                            key={o}
                            type="button"
                            onClick={() => toggleOwner(o)}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left transition-colors ${
                              selected ? "bg-teal-50 text-teal-700" : "text-gray-600 hover:bg-gray-50"
                            }`}
                          >
                            <span
                              className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                                selected ? "bg-teal-500 border-teal-500" : "border-gray-300"
                              }`}
                            >
                              {selected && <Check size={10} className="text-white" />}
                            </span>
                            {o}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </EditField>

              {/* Biz Team */}
              <EditField label="Biz Team" error={errors.bizTeam}>
                <div className="relative">
                  <select
                    value={bizTeam}
                    onChange={(e) => {
                      setBizTeam(e.target.value);
                      setErrors((er) => ({ ...er, bizTeam: undefined }));
                    }}
                    className={`w-full px-3 py-2 text-sm border rounded-lg outline-none transition-all appearance-none bg-white pr-8 ${
                      errors.bizTeam
                        ? "border-red-300"
                        : "border-gray-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-50"
                    } ${!bizTeam ? "text-gray-300" : "text-gray-700"}`}
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
              </EditField>

              {/* Description */}
              <EditField label="Description" error={errors.description}>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    setErrors((er) => ({ ...er, description: undefined }));
                  }}
                  className={`w-full px-3 py-2 text-sm border rounded-lg outline-none transition-all resize-none ${
                    errors.description
                      ? "border-red-300"
                      : "border-gray-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-50"
                  }`}
                />
              </EditField>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50/60">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all"
          >
            {readOnly ? "Close" : "Cancel"}
          </button>
          {!readOnly && (
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 text-sm text-white bg-teal-500 rounded-lg hover:bg-teal-600 transition-all shadow-sm shadow-teal-200"
            >
              Save
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
