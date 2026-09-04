import { useState } from "react";
import { NavLink, Outlet } from "react-router";
import {
  ChevronsLeft,
  ChevronsRight,
  Database,
  GitBranch,
  Globe,
  Layers,
  Table2,
  Zap,

} from "lucide-react";
import { Toaster } from "sonner";

type NavItem = {
  to: string;
  label: string;
  end?: boolean;
  Icon: React.ComponentType<{ className?: string }>;
  accent: string;
};

const NAV_ITEMS: NavItem[] = [
  { to: "/ds", label: "Data Source", end: true, Icon: Database, accent: "text-sky-700" },
  { to: "/fs", label: "Feature Source", end: true, Icon: Globe, accent: "text-indigo-700" },
  { to: "/tf", label: "Transformation", end: true, Icon: Zap, accent: "text-amber-700" },
  { to: "/fg", label: "Feature Group", end: false, Icon: Layers, accent: "text-violet-700" },
  { to: "/fm", label: "Feature Map", end: true, Icon: GitBranch, accent: "text-rose-700" },
  { to: "/wt", label: "WideTable", end: false, Icon: Table2, accent: "text-teal-700" },
];

export function AppShell() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-[#f0f2f5] text-[13px] text-gray-800">
      <aside
        className={`shrink-0 flex flex-col border-r border-gray-200/80 bg-[#f0f2f5] transition-[width,min-width] duration-200 ease-out ${
          sidebarCollapsed ? "w-14 min-w-[3.5rem]" : "w-64 min-w-[256px]"
        }`}
      >
        <div
          className={`h-12 flex items-center border-b border-black/[0.06] shrink-0 ${
            sidebarCollapsed ? "justify-center px-2" : "gap-2 px-4"
          }`}
        >
          <div className="w-6 h-6 rounded-md bg-teal-500 text-white text-xs font-bold flex items-center justify-center shrink-0">
            F
          </div>
          {!sidebarCollapsed && (
            <span className="text-sm font-semibold text-gray-800 truncate min-w-0">
              FeatureStore
            </span>
          )}
        </div>
        <nav className="flex-1 py-2 overflow-y-auto overflow-x-hidden">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              title={sidebarCollapsed ? item.label : undefined}
              className={({ isActive }) =>
                [
                  "group flex items-center cursor-pointer border-l-[3px] transition-colors",
                  sidebarCollapsed ? "justify-center gap-0 px-2 py-2.5" : "gap-2.5 px-4 py-2.5",
                  isActive
                    ? "bg-gradient-to-r from-teal-500 to-teal-600 text-white border-teal-500 shadow-sm"
                    : "border-transparent text-gray-600 hover:bg-white/60 hover:text-gray-900",
                ].join(" ")
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={[
                      "shrink-0 grid place-items-center rounded-xl ring-1 transition-colors",
                      sidebarCollapsed ? "w-9 h-9" : "w-8 h-8",
                      isActive
                        ? "bg-white/15 ring-white/25"
                        : "bg-white/60 ring-black/[0.05] group-hover:bg-white/80",
                    ].join(" ")}
                  >
                    <item.Icon
                      className={["w-[18px] h-[18px]", isActive ? "text-white" : item.accent].join(" ")}
                    />
                  </span>
                  {!sidebarCollapsed && (
                    <span className="whitespace-nowrap overflow-hidden text-ellipsis min-w-0">
                      {item.label}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="shrink-0 border-t border-black/[0.06] p-1.5">
          <button
            type="button"
            onClick={() => setSidebarCollapsed((c) => !c)}
            className="w-full flex items-center justify-center gap-1 rounded-lg py-2 text-gray-500 hover:bg-black/[0.06] hover:text-gray-800 transition-colors"
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!sidebarCollapsed}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? (
              <ChevronsRight size={18} strokeWidth={2} />
            ) : (
              <ChevronsLeft size={18} strokeWidth={2} />
            )}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <div className="flex-1 overflow-y-auto min-h-0">
          <Outlet />
        </div>
        <Toaster position="top-right" richColors closeButton />
      </div>
    </div>
  );
}
