import React, { useState } from "react";
import { ChevronRight, ChevronDown, Search, Layers, FolderOpen, Folder, ChevronsDownUp, ChevronsUpDown } from "lucide-react";
import { Module } from "./types";

interface ModuleTreeProps {
  modules: Module[];
  selectedNode: { type: "module" | "group"; id: string } | null;
  onSelectNode: (node: { type: "module" | "group"; id: string } | null) => void;
  className?: string;
}

export function ModuleTree({ modules, selectedNode, onSelectNode, className }: ModuleTreeProps) {
  const [expandedModules, setExpandedModules] = useState<Set<string>>(
    new Set(modules.map((m) => m.id))
  );
  const [treeSearch, setTreeSearch] = useState("");

  const toggleModule = (moduleId: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  };

  const allExpanded =
    modules.length > 0 && modules.every((m) => expandedModules.has(m.id));

  const toggleAll = () => {
    setExpandedModules(allExpanded ? new Set() : new Set(modules.map((m) => m.id)));
  };

  const getModuleFeatureCount = (m: Module) =>
    m.groups.reduce((sum, g) => sum + g.features.length, 0);

  const filteredModules = modules
    .map((m) => {
      if (!treeSearch) return m;
      const nameMatch = m.name.toLowerCase().includes(treeSearch.toLowerCase());
      const filteredGroups = m.groups.filter((g) =>
        g.name.toLowerCase().includes(treeSearch.toLowerCase())
      );
      if (nameMatch || filteredGroups.length > 0) {
        return { ...m, groups: nameMatch ? m.groups : filteredGroups };
      }
      return null;
    })
    .filter(Boolean) as Module[];

  return (
    <div className={`bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col overflow-hidden ${className ?? ""}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center gap-2 mb-2.5">
          <Layers size={14} className="text-[#13c2c2]" />
          <span className="text-sm font-medium text-gray-700">Module Navigator</span>
          <button
            type="button"
            onClick={toggleAll}
            title={allExpanded ? "Collapse all" : "Expand all"}
            aria-label={allExpanded ? "Collapse all modules" : "Expand all modules"}
            className="ml-auto shrink-0 p-1 rounded-md text-gray-400 hover:text-[#13c2c2] hover:bg-[#13c2c2]/10 transition-colors"
          >
            {allExpanded ? <ChevronsDownUp size={14} /> : <ChevronsUpDown size={14} />}
          </button>
        </div>
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search FeatureGroup..."
            value={treeSearch}
            onChange={(e) => setTreeSearch(e.target.value)}
            className="w-full pl-7 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#13c2c2]/30 focus:border-[#13c2c2] transition-all placeholder:text-gray-400"
          />
        </div>
      </div>

      {/* All option */}
      <div className="px-3 pt-2">
        <button
          onClick={() => onSelectNode(null)}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all ${
            selectedNode === null
              ? "bg-[#13c2c2]/10 text-[#13c2c2] font-medium"
              : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          <span>All Modules</span>
          <span className={`ml-auto text-xs px-1.5 py-0.5 rounded-full ${
            selectedNode === null ? "bg-[#13c2c2]/15 text-[#13c2c2]" : "bg-gray-100 text-gray-500"
          }`}>
            {modules.reduce((s, m) => s + getModuleFeatureCount(m), 0)}
          </span>
        </button>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 pt-1 space-y-0.5">
        {filteredModules.map((module) => {
          const isExpanded = expandedModules.has(module.id);
          const isModuleSelected =
            selectedNode?.type === "module" && selectedNode.id === module.id;
          const totalCount = getModuleFeatureCount(module);

          return (
            <div key={module.id}>
              {/* Module row */}
              <div
                className={`flex items-center gap-1.5 px-2 py-2 rounded-lg cursor-pointer group transition-all ${
                  isModuleSelected
                    ? "bg-[#13c2c2]/10 text-[#13c2c2]"
                    : "hover:bg-gray-50 text-gray-700"
                }`}
              >
                <button
                  onClick={() => toggleModule(module.id)}
                  className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown size={13} />
                  ) : (
                    <ChevronRight size={13} />
                  )}
                </button>
                <button
                  className="flex items-center gap-1.5 flex-1 min-w-0"
                  onClick={() => onSelectNode({ type: "module", id: module.id })}
                >
                  {isExpanded ? (
                    <FolderOpen size={13} className={isModuleSelected ? "text-[#13c2c2]" : "text-amber-400"} />
                  ) : (
                    <Folder size={13} className={isModuleSelected ? "text-[#13c2c2]" : "text-amber-400"} />
                  )}
                  <span className="text-xs truncate">{module.name}</span>
                  <span className={`ml-auto shrink-0 text-xs px-1.5 py-0.5 rounded-full ${
                    isModuleSelected ? "bg-[#13c2c2]/15 text-[#13c2c2]" : "bg-gray-100 text-gray-500"
                  }`}>
                    {totalCount}
                  </span>
                </button>
              </div>

              {/* Groups */}
              {isExpanded && (
                <div className="ml-4 mt-0.5 space-y-0.5 border-l-2 border-gray-100 pl-2">
                  {module.groups.map((group) => {
                    const isGroupSelected =
                      selectedNode?.type === "group" && selectedNode.id === group.id;
                    return (
                      <button
                        key={group.id}
                        onClick={() =>
                          onSelectNode({ type: "group", id: group.id })
                        }
                        className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-all text-left ${
                          isGroupSelected
                            ? "bg-[#13c2c2]/10 text-[#13c2c2]"
                            : "hover:bg-gray-50 text-gray-500"
                        }`}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isGroupSelected ? "bg-[#13c2c2]" : "bg-gray-300"}`} />
                        <span className="text-xs truncate">{group.name}</span>
                        <span className={`ml-auto shrink-0 text-xs px-1.5 py-0.5 rounded-full ${
                          isGroupSelected ? "bg-[#13c2c2]/15 text-[#13c2c2]" : "bg-gray-100 text-gray-500"
                        }`}>
                          {group.features.length}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
