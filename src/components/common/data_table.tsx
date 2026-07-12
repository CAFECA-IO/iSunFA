import { useState, ReactNode, Fragment } from "react";
import { Loader2, ChevronUp, ChevronDown, ChevronRight } from "lucide-react";
import Pagination from "@/components/common/pagination";
import { useTranslation } from "@/i18n/i18n_context";

export interface IDataTableColumn<T> {
  key: string;
  label: string | ReactNode;
  sortable?: boolean;
  align?: "left" | "center" | "right";
  render?: (row: T) => ReactNode;
  className?: string;
}

export interface IDataTableProps<T> {
  columns: IDataTableColumn<T>[];
  data: T[];
  loading?: boolean;
  pagination?: {
    page: number;
    limit: number;
    totalPages: number;
    totalElements: number;
  };
  onPageChange?: (page: number) => void;
  onSort?: (key: string) => void;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  emptyStateText?: string | ReactNode;
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  expandedRowRender?: (row: T) => ReactNode;
  rowExpandable?: (row: T) => boolean;
}

export default function DataTable<T>({
  columns,
  data,
  loading = false,
  pagination = undefined,
  onPageChange = undefined,
  onSort = undefined,
  sortBy = undefined,
  sortOrder = "desc",
  emptyStateText = undefined,
  rowKey,
  onRowClick = undefined,
  expandedRowRender = undefined,
  rowExpandable = undefined,
}: IDataTableProps<T>) {
  const { t } = useTranslation();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="w-full overflow-x-auto">
        <table className="w-full text-left whitespace-nowrap">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/80">
              {expandedRowRender && (
                <th className="w-10 px-4 py-3.5">
                  <span className="sr-only">{t("common.actions")}</span>
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-6 py-3.5 text-xs font-bold tracking-wider text-gray-400 uppercase ${
                    col.align === "right"
                      ? "text-right"
                      : col.align === "center"
                        ? "text-center"
                        : "text-left"
                  } ${col.sortable ? "group cursor-pointer transition-colors select-none hover:bg-gray-100" : ""} ${col.className || ""}`}
                  onClick={() => {
                    if (col.sortable && onSort) {
                      onSort(col.key);
                    }
                  }}
                >
                  <div
                    className={`flex items-center gap-1 ${col.align === "right" ? "justify-end" : col.align === "center" ? "justify-center" : "justify-start"}`}
                  >
                    <span
                      className={`transition-colors ease-in-out ${
                        col.sortable
                          ? sortBy === col.key
                            ? "text-orange-500"
                            : "text-gray-400 group-hover:text-orange-500"
                          : ""
                      }`}
                    >
                      {col.label}
                    </span>
                    {col.sortable && (
                      <div className="-gap-[2px] flex shrink-0 flex-col pl-2">
                        <ChevronUp
                          size={14}
                          className={`translate-y-[2px] transition-colors ${
                            sortBy === col.key && sortOrder === "asc"
                              ? "text-orange-500"
                              : "text-gray-300"
                          }`}
                        />
                        <ChevronDown
                          size={14}
                          className={`translate-y-[-2px] transition-colors ${
                            sortBy === col.key && sortOrder === "desc"
                              ? "text-orange-500"
                              : "text-gray-300"
                          }`}
                        />
                      </div>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="py-16 text-center text-gray-500"
                >
                  <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-orange-500" />
                  {t("common.loading")}
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="py-16 text-center text-gray-400"
                >
                  {emptyStateText || t("common.no_data")}
                </td>
              </tr>
            ) : (
              data.map((row) => {
                const isExpanded = expandedRows.has(rowKey(row));
                return (
                  <Fragment key={rowKey(row)}>
                    <tr
                      className={`transition-colors ${onRowClick ? "cursor-pointer hover:bg-orange-50" : "hover:bg-orange-50/30"}`}
                      onClick={() => onRowClick && onRowClick(row)}
                    >
                      {expandedRowRender && (
                        <td className="px-4 py-3.5 text-center">
                          {(!rowExpandable || rowExpandable(row)) && (
                            <button
                              type="button"
                              className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                              aria-label={
                                isExpanded
                                  ? t("common.close")
                                  : t("common.load")
                              }
                              onClick={(e) => toggleRow(rowKey(row), e)}
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </button>
                          )}
                        </td>
                      )}
                      {columns.map((col) => (
                        <td
                          key={`${rowKey(row)}-${col.key}`}
                          className={`px-6 py-3.5 text-sm ${
                            col.align === "right"
                              ? "text-right"
                              : col.align === "center"
                                ? "text-center"
                                : "text-left"
                          }`}
                        >
                          {col.render
                            ? col.render(row)
                            : (row as Record<string, unknown>)[col.key] !==
                                  undefined &&
                                (row as Record<string, unknown>)[col.key] !==
                                  null
                              ? String(
                                  (row as Record<string, unknown>)[col.key],
                                )
                              : ""}
                        </td>
                      ))}
                    </tr>
                    {isExpanded &&
                      expandedRowRender &&
                      (!rowExpandable || rowExpandable(row)) && (
                        <tr
                          aria-label={t("common.note")}
                          className="border-b border-gray-100 bg-gray-50/50"
                        >
                          <td colSpan={columns.length + 1} className="p-0">
                            <span className="sr-only">{t("common.note")}</span>
                            <div className="w-full px-14 py-4">
                              {expandedRowRender(row)}
                            </div>
                          </td>
                        </tr>
                      )}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {!loading && pagination && pagination.totalPages > 1 && onPageChange && (
        <div className="w-full border-t border-gray-100 bg-gray-50 px-4 py-4">
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={onPageChange}
          />
        </div>
      )}
    </div>
  );
}
