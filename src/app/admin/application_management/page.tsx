"use client";

import { useState, useEffect, useCallback } from "react";
import { request } from "@/lib/utils/request";
import AdminPageHeader from "@/components/admin/common/admin_page_header";
import { ClipboardList, Search, RefreshCcw } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import DataTable, { IDataTableColumn } from "@/components/common/data_table";
import { formatDate } from "@/lib/utils/date";
import ApplicationDetailModal from "@/components/admin/application/application_detail_modal";
import { APPLICATION_STATUS } from "@/constants/status";

interface IApplicationData {
  id: string;
  solutionId: string;
  taxId: string;
  companyName: string;
  address: string;
  contactPerson: string;
  phone: string;
  email: string;
  message: string | null;
  status: string;
  createdAt: string;
}

export default function ApplicationManagementPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState<number>(1);
  const limit = 15;

  const [loading, setLoading] = useState<boolean>(true);
  const [applications, setApplications] = useState<IApplicationData[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 15,
    totalElements: 0,
    totalPages: 0,
  });

  const [searchInput, setSearchInput] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [solutionId, setSolutionId] = useState<string>("ALL");
  const [status, setStatus] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [detailModal, setDetailModal] = useState<{
    isOpen: boolean;
    application: IApplicationData | null;
  }>({ isOpen: false, application: null });

  useEffect(() => {
    const handler = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [searchInput]);

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(key);
      setSortOrder("desc");
    }
    setPage(1);
  };

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        search,
        solutionId,
        status,
        sortBy,
        sortOrder,
      });

      const res = await request<{
        payload: {
          data: IApplicationData[];
          pagination: {
            page: number;
            limit: number;
            totalElements: number;
            totalPages: number;
          };
        };
      }>(`/api/v1/admin/applications?${query.toString()}`);

      if (res.payload) {
        setApplications(res.payload.data);
        setPagination(res.payload.pagination);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, solutionId, status, sortBy, sortOrder]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const columns: IDataTableColumn<IApplicationData>[] = [
    {
      key: "createdAt",
      label: t("application_management.table.date"),
      sortable: true,
      render: (record) => (
        <span className="text-sm text-gray-500">
          {formatDate(record.createdAt, "yyyy-MM-dd HH:mm")}
        </span>
      ),
    },
    {
      key: "companyName",
      label: t("application_management.table.company_name"),
      sortable: true,
      render: (record) => (
        <div>
          <div className="text-sm font-semibold text-gray-800">
            {record.companyName}
          </div>
          <div className="mt-0.5 text-xs text-gray-400">
            {t("application_management.table.tax_id")}: {record.taxId}
          </div>
        </div>
      ),
    },
    {
      key: "solutionId",
      label: t("application_management.table.solution"),
      render: (record) => {
        const solutionTitle =
          record.solutionId === "general"
            ? t("solutions.general_consult")
            : t(`solutions.title_${record.solutionId}`);
        return (
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 ring-1 ring-blue-700/10 ring-inset">
            {solutionTitle || record.solutionId}
          </span>
        );
      },
    },
    {
      key: "contact",
      label: t("application_management.table.contact"),
      render: (record) => (
        <div>
          <div className="text-sm font-medium text-gray-700">
            {record.contactPerson}
          </div>
          <div className="text-xs text-gray-400">{record.phone}</div>
        </div>
      ),
    },
    {
      key: "status",
      label: t("application_management.table.status"),
      render: (record) => {
        const statusColors: Record<string, string> = {
          CONTACTING: "bg-amber-50 text-amber-700 ring-amber-700/10",
          EVALUATING: "bg-blue-50 text-blue-700 ring-blue-700/10",
          CONTRACTING: "bg-purple-50 text-purple-700 ring-purple-700/10",
          EXECUTING: "bg-emerald-50 text-emerald-700 ring-emerald-700/10",
          CLOSED: "bg-gray-50 text-gray-700 ring-gray-700/10",
        };
        const colorClass =
          statusColors[record.status] ||
          "bg-gray-50 text-gray-700 ring-gray-700/10";
        return (
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${colorClass}`}
          >
            {t(
              `application_management.status.${record.status || "CONTACTING"}`,
            )}
          </span>
        );
      },
    },
    {
      key: "email",
      label: t("application_management.table.email"),
      render: (record) => (
        <span className="text-sm text-gray-600">{record.email}</span>
      ),
    },
    {
      key: "actions",
      label: t("common.actions"),
      align: "center",
      render: (record) => (
        <button
          onClick={() => setDetailModal({ isOpen: true, application: record })}
          className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-600 transition-all hover:bg-gray-200 hover:text-gray-900"
        >
          {t("common.detail")}
        </button>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 md:py-12 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <AdminPageHeader
          icon={ClipboardList}
          title={t("application_management.title")}
          subtitle={t("application_management.subtitle")}
        />

        <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="relative max-w-md flex-1">
              <Search
                className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-500"
                size={18}
              />
              <input
                type="text"
                placeholder={t("common.search")}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full rounded-xl border-gray-200 py-2 pr-4 pl-10 text-sm text-gray-900 placeholder:text-gray-500 focus:border-orange-500 focus:ring-orange-500"
              />
            </div>

            <div className="flex items-center gap-4">
              <select
                value={solutionId}
                onChange={(e) => setSolutionId(e.target.value)}
                className="rounded-xl border-gray-200 py-2 pr-10 pl-4 text-sm text-gray-700 focus:border-orange-500 focus:ring-orange-500"
              >
                <option value="ALL">{t("common.all_solutions")}</option>
                <option value="2025_1">{t("solutions.title_2025_1")}</option>
                <option value="2026_1">{t("solutions.title_2026_1")}</option>
                <option value="general">
                  {t("solutions.general_consult")}
                </option>
              </select>

              <button
                onClick={() => {
                  setSearchInput("");
                  setSolutionId("ALL");
                  setStatus("ALL");
                  setPage(1);
                }}
                className="flex items-center gap-2 rounded-xl bg-gray-100 px-4 py-2 text-sm font-bold text-gray-600 transition-all hover:bg-gray-200"
              >
                <RefreshCcw size={16} />
                {t("common.reset")}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4">
            <span className="mr-2 text-xs font-bold tracking-wider text-gray-400 uppercase">
              {t("application_management.table.status")}:
            </span>
            <button
              onClick={() => setStatus("ALL")}
              className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
                status === "ALL"
                  ? "bg-orange-50 text-orange-700 ring-1 ring-orange-700/20 ring-inset"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {t("common.all_status")}
            </button>
            {Object.values(APPLICATION_STATUS).map((key) => (
              <button
                key={key}
                onClick={() => setStatus(key)}
                className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
                  status === key
                    ? "bg-orange-50 text-orange-700 ring-1 ring-orange-700/20 ring-inset"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {t(`application_management.status.${key}`)}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <DataTable<IApplicationData>
            columns={columns}
            data={applications}
            loading={loading}
            pagination={pagination}
            onPageChange={setPage}
            onSort={handleSort}
            sortBy={sortBy}
            sortOrder={sortOrder}
            emptyStateText={t("common.no_data")}
            rowKey={(record) => record.id}
          />
        </div>
      </div>

      <ApplicationDetailModal
        isOpen={detailModal.isOpen}
        onClose={() => setDetailModal({ isOpen: false, application: null })}
        application={detailModal.application}
        onStatusUpdate={fetchApplications}
      />
    </div>
  );
}
