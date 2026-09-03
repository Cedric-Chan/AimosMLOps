/** Routes aligned with legacy FEATURE_STORE.legacy.html; full UI migration is incremental. */
export function MigratedPlaceholderPage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
      <p className="mt-2 text-sm text-gray-600 leading-relaxed">{description}</p>
      <p className="mt-6 text-xs text-gray-400">
        Reference: <code className="text-gray-600">docs/prototype/FEATURE_STORE.legacy.html</code>{" "}
        (archived single-file prototype). Implement here in React to match product spec.
      </p>
    </div>
  );
}
