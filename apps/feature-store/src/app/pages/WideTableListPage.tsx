import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router";
import { RefreshCw, Table2 } from "lucide-react";
import { FilterBar } from "@/app/components/FilterBar";
import { WideTableList, WideTableRow } from "@/app/components/WideTableList";
import {
  DataCleaningAndReportsModal,
  type CleaningTaskState,
} from "@/app/components/DataCleaningAndReportsModal";
import { Pagination } from "@/app/components/Pagination";
import { AddWideTableModal, WideTableFormValues } from "@/app/components/AddWideTableModal";
import { getCanvasSnapshotByRow, MOCK_WIDE_TABLES } from "@/data/mockWideTables";
import type { DataCleaningSnapshot } from "@/data/widetableCanvasModel";

const CURRENT_USER = "cedric.chencan@seamoney.com";

const DEFAULT_CLEANING_TASK: CleaningTaskState = { taskId: "—", status: "NONE" };

export function WideTableListPage() {
  const navigate = useNavigate();
  const [filterValues, setFilterValues] = useState({
    name: "",
    region: "",
    owner: "",
    bizTeam: "",
  });
  const [ownedByMe, setOwnedByMe] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [showAddModal, setShowAddModal] = useState(false);
  /** When set, Add modal is in Copy-from mode and canvas is seeded from this row's snapshot */
  const [copySourceRow, setCopySourceRow] = useState<WideTableRow | null>(null);
  const [cleaningRow, setCleaningRow] = useState<WideTableRow | null>(null);
  const [cleaningByTableId, setCleaningByTableId] = useState<Record<string, DataCleaningSnapshot>>({});
  const [cleaningTaskByTableId, setCleaningTaskByTableId] = useState<Record<string, CleaningTaskState>>({
    "1": { taskId: "task-risk-clean-001", status: "SUCCESS", finishedAt: "2026-02-17 15:32" },
    "3": { taskId: "task-rec-clean-007", status: "SUCCESS", finishedAt: "2026-02-20 09:11" },
    "4": { taskId: "task-credit-clean-012", status: "SUCCESS", finishedAt: "2026-02-18 11:04" },
    "6": { taskId: "task-userprof-clean-003", status: "SUCCESS", finishedAt: "2026-02-19 22:47" },
    "8": { taskId: "task-payment-clean-019", status: "SUCCESS", finishedAt: "2026-02-21 08:15" },
  });

  const cleaningSnapshotForRow = useCallback(
    (row: WideTableRow): DataCleaningSnapshot => {
      const override = cleaningByTableId[row.id];
      if (override)
        return {
          ...override,
          fillnaRows: override.fillnaRows.map((r) => ({ ...r })),
          vmRows: override.vmRows.map((r) => ({ ...r })),
        };
      return getCanvasSnapshotByRow(row).dataCleaning;
    },
    [cleaningByTableId]
  );

  const cleaningTaskForRow = useCallback(
    (rowId: string): CleaningTaskState => cleaningTaskByTableId[rowId] ?? DEFAULT_CLEANING_TASK,
    [cleaningTaskByTableId]
  );

  const handleCleaningRunTask = useCallback((row: WideTableRow, payload: Pick<DataCleaningSnapshot, "fillnaRows" | "vmRows">) => {
    const taskId = `clean_task_${Date.now()}`;
    setCleaningTaskByTableId((prev) => ({
      ...prev,
      [row.id]: { taskId, status: "PENDING" },
    }));

    window.setTimeout(() => {
      setCleaningTaskByTableId((prev) => ({
        ...prev,
        [row.id]: { taskId, status: "RUNNING" },
      }));
    }, 400);

    window.setTimeout(() => {
      const finishedAt = new Date().toISOString().slice(0, 19).replace("T", " ");
      setCleaningTaskByTableId((prev) => ({
        ...prev,
        [row.id]: { taskId, status: "SUCCESS", finishedAt },
      }));
      setCleaningByTableId((prev) => ({
        ...prev,
        [row.id]: {
          enabled: true,
          fillnaRows: payload.fillnaRows.map((r) => ({ ...r })),
          vmRows: payload.vmRows.map((r) => ({ ...r })),
        },
      }));
    }, 1800);
  }, []);

  const filtered = useMemo(() => {
    return MOCK_WIDE_TABLES.filter((row) => {
      const matchName =
        !filterValues.name ||
        row.name.toLowerCase().includes(filterValues.name.toLowerCase());
      const matchRegion =
        !filterValues.region ||
        filterValues.region === "All Regions" ||
        row.region.includes(filterValues.region);
      const matchOwner =
        !filterValues.owner ||
        row.owners.some((o) =>
          o.toLowerCase().includes(filterValues.owner.toLowerCase())
        );
      const matchBizTeam =
        !filterValues.bizTeam ||
        row.bizTeam.toLowerCase().includes(filterValues.bizTeam.toLowerCase());
      const matchOwnedByMe =
        !ownedByMe || row.owners.includes(CURRENT_USER);
      return matchName && matchRegion && matchOwner && matchBizTeam && matchOwnedByMe;
    });
  }, [filterValues, ownedByMe]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const goCanvasNew = (values: WideTableFormValues) => {
    setShowAddModal(false);
    const fromCopy = copySourceRow;
    setCopySourceRow(null);
    if (fromCopy) {
      navigate("/wt/canvas/new", {
        state: {
          formValues: values,
          canvasSnapshot: getCanvasSnapshotByRow(fromCopy),
        },
      });
    } else {
      navigate("/wt/canvas/new", { state: { formValues: values } });
    }
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setCopySourceRow(null);
  };

  const goCanvasEdit = (row: WideTableRow) => {
    navigate(`/wt/canvas/edit/${row.id}`);
  };

  const goCanvasInstance = (row: WideTableRow, instanceId: string) => {
    navigate(`/wt/canvas/instance/${row.id}/${encodeURIComponent(instanceId)}`);
  };

  return (
    <div className="min-h-full bg-[#f5f7fa]">
      <header className="bg-white border-b border-gray-100 px-6 py-3 flex items-center gap-3 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#13c2c2] flex items-center justify-center shadow-sm">
            <Table2 size={14} className="text-white" />
          </div>
          <div>
            <h1
              className="text-gray-800 leading-tight"
              style={{ fontSize: "15px", fontWeight: 600 }}
            >
              Feature WideTable
            </h1>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2 text-xs text-gray-400">
          <RefreshCw size={11} />
          <span>Last updated: 2026-02-23 10:00</span>
        </div>
      </header>

      <main className="p-5 flex flex-col gap-4 max-w-screen-2xl mx-auto">
        <FilterBar
          onQuery={(vals) => {
            setFilterValues(vals);
            setCurrentPage(1);
          }}
          onReset={() => {
            setFilterValues({ name: "", region: "", owner: "", bizTeam: "" });
            setCurrentPage(1);
          }}
        />

        <WideTableList
          data={paginated}
          onAdd={() => {
            setCopySourceRow(null);
            setShowAddModal(true);
          }}
          onEdit={goCanvasEdit}
          onCopy={(row) => {
            setCopySourceRow(row);
            setShowAddModal(true);
          }}
          onClean={(row) => setCleaningRow(row)}
          onView={goCanvasInstance}
          onTask={(_, inst) =>
            navigate(`/wt/task/${encodeURIComponent(inst.id)}`)
          }
          ownedByMe={ownedByMe}
          onOwnedByMeChange={(v) => {
            setOwnedByMe(v);
            setCurrentPage(1);
          }}
          cleanTaskStatusById={Object.fromEntries(
            Object.entries(cleaningTaskByTableId).map(([id, task]) => [id, task.status])
          )}
        />

        <Pagination
          total={filtered.length}
          current={currentPage}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(s) => {
            setPageSize(s);
            setCurrentPage(1);
          }}
        />
      </main>

      {showAddModal && (
        <AddWideTableModal
          key={copySourceRow ? `copy-${copySourceRow.id}` : "create"}
          mode={copySourceRow ? "copy" : "create"}
          copySourceName={copySourceRow?.name}
          onClose={closeAddModal}
          onConfirm={goCanvasNew}
        />
      )}

      {cleaningRow && (
        <DataCleaningAndReportsModal
          key={cleaningRow.id}
          row={cleaningRow}
          initialCleaning={cleaningSnapshotForRow(cleaningRow)}
          cleaningTask={cleaningTaskForRow(cleaningRow.id)}
          ingestionConfig={getCanvasSnapshotByRow(cleaningRow).dataIngestion}
          onClose={() => setCleaningRow(null)}
          onRunTask={(payload) => handleCleaningRunTask(cleaningRow, payload)}
        />
      )}
    </div>
  );
}
