import { ReactNode } from "react";
import { Loader2, ArrowUp, ArrowDown } from "lucide-react";
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
}: IDataTableProps<T>) {
  const { t } = useTranslation();

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="w-full overflow-x-auto">
        <table className="w-full text-left whitespace-nowrap">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/80">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-gray-400 ${col.align === "right"
                      ? "text-right"
                      : col.align === "center"
                        ? "text-center"
                        : "text-left"
                    } ${col.sortable ? "cursor-pointer hover:bg-gray-100 hover:text-gray-600 transition-colors select-none" : ""} ${col.className || ""}`}
                  onClick={() => {
                    if (col.sortable && onSort) {
                      onSort(col.key);
                    }
                  }}
                >
                  <div className={`flex items-center gap-1 ${col.align === "right" ? "justify-end" : col.align === "center" ? "justify-center" : "justify-start"}`}>
                    {col.label}
                    {col.sortable && sortBy === col.key && (
                      <span className="text-orange-500">
                        {sortOrder === "asc" ? (
                          <ArrowUp className="h-3.5 w-3.5" />
                        ) : (
                          <ArrowDown className="h-3.5 w-3.5" />
                        )}
                      </span>
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
                  {t("common.loading", { defaultValue: "Loading..." })}
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="py-16 text-center text-gray-400"
                >
                  {emptyStateText || t("common.no_data", { defaultValue: "No data available" })}
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr
                  key={rowKey(row)}
                  className="hover:bg-orange-50/30 transition-colors"
                >
                  {columns.map((col) => (
                    <td
                      key={`${rowKey(row)}-${col.key}`}
                      className={`px-6 py-3.5 text-sm ${col.align === "right"
                          ? "text-right"
                          : col.align === "center"
                            ? "text-center"
                            : "text-left"
                        }`}
                    >
                      {col.render
                        ? col.render(row)
                        : (row as Record<string, unknown>)[col.key] !== undefined && (row as Record<string, unknown>)[col.key] !== null
                          ? String((row as Record<string, unknown>)[col.key])
                          : ""}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!loading && pagination && pagination.totalPages > 1 && onPageChange && (
        <div className="bg-gray-50 px-4 py-4 w-full border-t border-gray-100">
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
