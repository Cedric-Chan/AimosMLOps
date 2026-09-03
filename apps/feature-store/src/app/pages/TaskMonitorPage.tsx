import { Link, useParams } from "react-router";
import { ArrowLeft, ExternalLink } from "lucide-react";

function Sk({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-gradient-to-r from-gray-100 to-gray-200/80 ${className}`} />;
}

export function TaskMonitorPage() {
  const { instanceId } = useParams<{ instanceId: string }>();
  const id = instanceId ? decodeURIComponent(instanceId) : "—";

  return (
    <div className="min-h-full bg-gray-50/80">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <Link
          to="/wt"
          className="inline-flex items-center gap-1.5 text-xs text-teal-600 hover:text-teal-700 mb-6 cursor-pointer"
        >
          <ArrowLeft size={14} /> Back to WideTable list
        </Link>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-800 font-medium">
                Task execution
                <span className="text-gray-300">|</span>
                <span className="font-mono text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{id}</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">External scheduler view (mock)</p>
            </div>
            <a
              href="#"
              className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-teal-600 cursor-pointer"
              onClick={(e) => e.preventDefault()}
            >
              Open in scheduler <ExternalLink size={12} />
            </a>
          </div>

          <div className="p-6 space-y-6">
            <section>
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-3">Status</div>
              <Sk className="h-8 w-48" />
            </section>
            <section>
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-3">Stages</div>
              <div className="space-y-3">
                <Sk className="h-12 w-full" />
                <Sk className="h-12 w-full" />
                <Sk className="h-12 w-[85%]" />
              </div>
            </section>
            <section>
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-3">Logs</div>
              <div className="rounded-lg border border-gray-100 bg-gray-900/90 p-4 space-y-2">
                <Sk className="h-3 w-full opacity-40" />
                <Sk className="h-3 w-[92%] opacity-30" />
                <Sk className="h-3 w-[80%] opacity-25" />
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
