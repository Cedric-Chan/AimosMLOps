import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  total: number;
  current: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export function Pagination({
  total,
  current,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  const totalPages = Math.ceil(total / pageSize);
  const start = (current - 1) * pageSize + 1;
  const end = Math.min(current * pageSize, total);

  const getPageNumbers = () => {
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (current > 3) pages.push("...");
      for (
        let i = Math.max(2, current - 1);
        i <= Math.min(totalPages - 1, current + 1);
        i++
      )
        pages.push(i);
      if (current < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="flex items-center justify-between px-6 py-4 bg-white rounded-xl shadow-sm border border-gray-100">
      {/* Info */}
      <span className="text-xs text-gray-400">
        Showing{" "}
        <span className="text-gray-600 font-medium">
          {start}–{end}
        </span>{" "}
        of <span className="text-gray-600 font-medium">{total}</span> items
      </span>

      {/* Controls */}
      <div className="flex items-center gap-2">
        {/* Prev */}
        <button
          disabled={current === 1}
          onClick={() => onPageChange(current - 1)}
          className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:border-teal-400 hover:text-teal-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <ChevronLeft size={14} />
        </button>

        {/* Page Numbers */}
        <div className="flex items-center gap-1">
          {getPageNumbers().map((p, i) =>
            p === "..." ? (
              <span key={`ellipsis-${i}`} className="px-1 text-xs text-gray-400">
                ···
              </span>
            ) : (
              <button
                key={p}
                onClick={() => onPageChange(p as number)}
                className={`min-w-[28px] h-7 px-1.5 rounded-lg text-xs transition-all ${
                  p === current
                    ? "bg-teal-500 text-white shadow-sm shadow-teal-200"
                    : "text-gray-600 hover:bg-gray-100 border border-transparent hover:border-gray-200"
                }`}
              >
                {p}
              </button>
            )
          )}
        </div>

        {/* Next */}
        <button
          disabled={current === totalPages}
          onClick={() => onPageChange(current + 1)}
          className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:border-teal-400 hover:text-teal-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <ChevronRight size={14} />
        </button>

        {/* Divider */}
        <div className="w-px h-5 bg-gray-200 mx-1" />

        {/* Page Size */}
        <select
          value={pageSize}
          onChange={(e) => {
            onPageSizeChange(Number(e.target.value));
            onPageChange(1);
          }}
          className="h-7 px-2 pr-6 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-teal-400 appearance-none cursor-pointer"
        >
          {PAGE_SIZE_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s} / page
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
