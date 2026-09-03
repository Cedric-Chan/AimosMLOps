import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export function Pagination({
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const getPageNumbers = () => {
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push("...");
      for (
        let i = Math.max(2, page - 1);
        i <= Math.min(totalPages - 1, page + 1);
        i++
      ) {
        pages.push(i);
      }
      if (page < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="flex items-center justify-between px-1">
      <span className="text-xs text-gray-500">
        {total > 0
          ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total} items`
          : "0 items"}
      </span>

      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-[#13c2c2] hover:text-[#13c2c2] disabled:opacity-40 disabled:cursor-not-allowed transition-colors bg-white"
        >
          <ChevronLeft size={13} />
        </button>

        {getPageNumbers().map((p, idx) =>
          p === "..." ? (
            <span key={`ellipsis-${idx}`} className="w-7 h-7 flex items-center justify-center text-xs text-gray-400">
              ···
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p as number)}
              className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs transition-all border ${
                page === p
                  ? "bg-[#13c2c2] text-white border-[#13c2c2] shadow-sm shadow-[#13c2c2]/30"
                  : "border-gray-200 text-gray-600 hover:border-[#13c2c2] hover:text-[#13c2c2] bg-white"
              }`}
            >
              {p}
            </button>
          )
        )}

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-[#13c2c2] hover:text-[#13c2c2] disabled:opacity-40 disabled:cursor-not-allowed transition-colors bg-white"
        >
          <ChevronRight size={13} />
        </button>

        <div className="ml-2 flex items-center gap-1.5">
          <select
            value={pageSize}
            onChange={(e) => {
              onPageSizeChange(Number(e.target.value));
              onPageChange(1);
            }}
            className="px-2 py-1 text-xs border border-gray-200 rounded-lg bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#13c2c2]/30 focus:border-[#13c2c2] cursor-pointer"
          >
            {PAGE_SIZE_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s} / page
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
