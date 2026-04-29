"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "@/i18n/i18n_context";
import { useParams } from "next/navigation";
import { request } from "@/lib/utils/request";
import { IApiResponse } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { Loader2, Search } from "lucide-react";
import { timestampToString } from "@/lib/utils/common";
import { AuditLogAction, AuditLogDataType } from "@/constants/audit_log";
import { IAuditLog } from "@/interfaces/audit_log";
import DateRangePicker from "@/components/common/date_range_picker";
import Pagination from "@/components/common/pagination";

const LogItem = ({ log }: { log: IAuditLog }) => {
  const { t } = useTranslation();
  const formattedDate = timestampToString(log.createdAt).dateWithDash;
  const formattedTime = timestampToString(log.createdAt).time;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getDataTypeLabel = (dataType: string) => {
    switch (dataType) {
      case AuditLogDataType.JOURNAL:
        return t("verify.type.journal");
      case AuditLogDataType.VOUCHER:
        return t("verify.type.voucher");
      case AuditLogDataType.ESG_RECORD:
        return t("verify.type.esg");
      default:
        return dataType;
    }
  };

  const getDataTypeColor = (dataType: string) => {
    switch (dataType) {
      case AuditLogDataType.JOURNAL:
        return "text-pink-700 bg-pink-100 border-pink-200";
      case AuditLogDataType.VOUCHER:
        return "text-indigo-700 bg-indigo-100 border-indigo-200";
      case AuditLogDataType.ESG_RECORD:
        return "text-purple-700 bg-purple-100 border-purple-200";
      default:
        return "text-gray-700 bg-gray-100 border-gray-200";
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case AuditLogAction.CREATE:
        return t("journal.log_view.action_create");
      case AuditLogAction.UPDATE:
        return t("journal.log_view.action_update");
      case AuditLogAction.DELETE:
        return t("journal.log_view.action_delete");
      default:
        return action;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case AuditLogAction.CREATE:
        return "text-emerald-700 bg-emerald-100 border-emerald-200";
      case AuditLogAction.UPDATE:
        return "text-blue-700 bg-blue-100 border-blue-200";
      case AuditLogAction.DELETE:
        return "text-red-700 bg-red-100 border-red-200";
      default:
        return "text-gray-700 bg-gray-100 border-gray-200";
    }
  };

  return (
    <tr className="border-b border-gray-100 odd:bg-white even:bg-slate-50">
      {/* Info: (20260409 - Julian) 異動項目(Desktop) */}
      <td className="hidden px-2.5 py-4 sm:table-cell sm:px-4">
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold whitespace-nowrap uppercase sm:text-sm ${getDataTypeColor(
            log.dataType,
          )}`}
        >
          {getDataTypeLabel(log.dataType)}
        </span>
      </td>
      {/* Info: (20260409 - Julian) 動作(Desktop) */}
      <td className="hidden px-2.5 py-4 sm:table-cell sm:px-4">
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold whitespace-nowrap sm:text-sm ${getActionColor(
            log.action,
          )}`}
        >
          {getActionLabel(log.action)}
        </span>
      </td>
      {/* Info: (20260409 - Julian) 異動項目 / 動作(Mobile) */}
      <td
        aria-label={`${t("journal.log_view.type")} / ${t("journal.log_view.action_type")}`}
        className="table-cell px-2.5 py-4 sm:hidden sm:px-4"
      >
        <div className="flex flex-col gap-x-2 gap-y-1">
          <span
            className={`inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-xs font-semibold whitespace-nowrap uppercase sm:text-sm ${getDataTypeColor(
              log.dataType,
            )}`}
          >
            {getDataTypeLabel(log.dataType)}
          </span>
          <span
            className={`inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-xs font-semibold whitespace-nowrap sm:text-sm ${getActionColor(
              log.action,
            )}`}
          >
            {getActionLabel(log.action)}
          </span>
        </div>
      </td>
      <td
        aria-label={t("journal.log_view.record_time")}
        className="px-2.5 py-4 text-xs font-medium text-gray-900 sm:px-4 sm:text-sm"
      >
        <div className="flex flex-col items-start gap-x-1 text-xs sm:flex-col">
          <span>{formattedDate}</span>
          <span>{formattedTime}</span>
        </div>
      </td>
      <td className="px-2.5 py-4 sm:px-4">
        <div className="flex flex-col items-start">
          <span className="font-medium text-gray-800">
            {log.user.name || t("journal.log_view.unnamed_user")}
          </span>
          <button
            type="button"
            onClick={() => copyToClipboard(log.user.address)}
            aria-label={t("journal.log_view.copy_address", {
              address: log.user.address,
            })}
            title={t("journal.log_view.copy_address", {
              address: log.user.address,
            })}
            className="text-[10px] break-all text-slate-500 hover:text-orange-600 sm:text-xs"
          >
            {log.user.address}
          </button>
        </div>
      </td>
      <td className="px-2.5 py-4 text-xs text-slate-500 sm:px-4">
        <button
          type="button"
          onClick={() => copyToClipboard(log.dataId)}
          aria-label={t("journal.log_view.copy_id", { id: log.dataId })}
          title={t("journal.log_view.copy_id", { id: log.dataId })}
          className="rounded bg-gray-100 px-2 py-1 text-[10px] break-all hover:bg-gray-200 sm:text-xs"
        >
          {log.dataId}
        </button>
      </td>
    </tr>
  );
};

const PAGE_SIZE = 20;

export default function JournalLogView() {
  const { t } = useTranslation();
  const params = useParams();
  // Info: (20260309 - Julian) 從 URL 取得帳簿 ID
  const accountBookId = params?.account_book_id as string;

  const [logs, setLogs] = useState<IAuditLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const [keyword, setKeyword] = useState<string>("");
  const [actionType, setActionType] = useState<string>("");
  const [dataType, setDataType] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);

  useEffect(() => {
    const fetchLogs = async () => {
      setIsLoading(true);
      try {
        const queryParams = new URLSearchParams();
        queryParams.append("page", currentPage.toString());
        queryParams.append("limit", PAGE_SIZE.toString());
        if (startDate) {
          queryParams.append("startDate", new Date(startDate).toISOString());
        }
        if (endDate) {
          const endDay = new Date(endDate);
          endDay.setHours(23, 59, 59, 999);
          queryParams.append("endDate", endDay.toISOString());
        }
        if (keyword) {
          queryParams.append("keyword", keyword);
        }
        if (actionType) {
          queryParams.append("actionType", actionType);
        }
        if (dataType) {
          queryParams.append("dataType", dataType);
        }
        const qs = queryParams.toString();
        const url = `/api/v1/user/account_book/${accountBookId}/audit_log${qs ? `?${qs}` : ""}`;

        const data =
          await request<
            IApiResponse<{
              logs: IAuditLog[];
              totalItems: number;
              totalPages: number;
            }>
          >(url);
        if (data.code === ApiCode.SUCCESS && data.payload) {
          setLogs(data.payload.logs);
          setTotalPages(data.payload.totalPages || 1);
        }
      } catch (error) {
        console.error("Failed to fetch logs", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLogs();
  }, [
    startDate,
    endDate,
    keyword,
    actionType,
    dataType,
    accountBookId,
    currentPage,
  ]);

  return (
    <div className="flex w-full max-w-full min-w-0 flex-col gap-4">
      {/* Info: (20260407 - Julian) Title */}
      <h2 className="font-sans text-xl font-semibold text-gray-800">
        {t("journal.log_view.title")}
      </h2>
      {/* Info: (20260407 - Julian) Filter */}
      <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start sm:gap-4 lg:flex-row">
        {/* Info: (20260429 - Julian) Search bar */}
        <div className="flex w-full items-center gap-2 rounded-lg border border-slate-300 bg-white px-2 py-2 text-slate-400 sm:w-auto sm:flex-1 sm:px-4">
          <Search size={24} />
          <input
            type="text"
            placeholder={t("journal.log_view.search_placeholder")}
            aria-label={t("journal.log_view.search_placeholder")}
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400 sm:text-sm"
          />
        </div>

        {/* Info: (20260407 - Julian) Type Filter */}
        <div className="flex items-center gap-2">
          <select
            value={dataType}
            onChange={(e) => {
              setDataType(e.target.value);
              setCurrentPage(1);
            }}
            className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs font-bold text-slate-600 focus:ring-2 focus:ring-orange-500 focus:outline-none sm:px-4 sm:text-sm"
          >
            <option value="">{t("journal.log_view.filter_all_data")}</option>
            <option value={AuditLogDataType.JOURNAL}>
              {t("verify.type.journal")}
            </option>
            <option value={AuditLogDataType.VOUCHER}>
              {t("verify.type.voucher")}
            </option>
            <option value={AuditLogDataType.ESG_RECORD}>
              {t("verify.type.esg")}
            </option>
          </select>
          <select
            value={actionType}
            onChange={(e) => {
              setActionType(e.target.value);
              setCurrentPage(1);
            }}
            className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs font-bold text-slate-600 focus:ring-2 focus:ring-orange-500 focus:outline-none sm:px-4 sm:text-sm"
          >
            <option value="">{t("journal.log_view.filter_all_actions")}</option>
            <option value={AuditLogAction.CREATE}>{t("journal.log_view.action_create")}</option>
            <option value={AuditLogAction.UPDATE}>{t("journal.log_view.action_update")}</option>
            <option value={AuditLogAction.DELETE}>{t("journal.log_view.action_delete")}</option>
          </select>
        </div>

        {/* Info: (20260429 - Julian) Date Picker */}
        <DateRangePicker
          startDate={startDate}
          endDate={endDate}
          setStartDate={(val) => {
            setStartDate(val);
            setCurrentPage(1);
          }}
          setEndDate={(val) => {
            setEndDate(val);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* Info: (20260407 - Julian) Log Table */}
      <div className="relative mt-2 overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="w-full text-left font-sans text-sm text-gray-600">
          <thead className="bg-slate-100 text-xs font-semibold text-gray-600 uppercase sm:text-base">
            <tr>
              {/* Info: (20260409 - Julian) 異動項目(Desktop) */}
              <th
                scope="col"
                className="hidden px-2.5 py-4 whitespace-nowrap sm:table-cell sm:px-4"
              >
                {t("journal.log_view.type")}
              </th>
              {/* Info: (20260409 - Julian) 動作(Desktop) */}
              <th
                scope="col"
                className="hidden px-2.5 py-4 whitespace-nowrap sm:table-cell sm:px-4"
              >
                {t("journal.log_view.action_type")}
              </th>
              {/* Info: (20260409 - Julian) 異動項目 / 動作(Mobile) */}
              <th
                scope="col"
                className="table-cell px-2.5 py-4 sm:hidden sm:px-4"
              >
                {t("journal.log_view.type")} /{" "}
                {t("journal.log_view.action_type")}
              </th>
              <th scope="col" className="px-2.5 py-4 whitespace-nowrap sm:px-4">
                {t("journal.log_view.record_time")}
              </th>
              <th scope="col" className="px-2.5 py-4 whitespace-nowrap sm:px-4">
                {t("journal.log_view.operator")}
              </th>
              <th scope="col" className="px-2.5 py-4 whitespace-nowrap sm:px-4">
                {t("journal.log_view.journal_id")}
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr aria-label={t("common.loading")}>
                <td colSpan={5} className="h-40 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 text-orange-500">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <span className="text-sm font-medium">
                      {t("common.loading")}
                    </span>
                  </div>
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="h-40 text-center text-gray-500">
                  {t("journal.log_view.empty")}
                </td>
              </tr>
            ) : (
              logs.map((log) => <LogItem key={log.id} log={log} />)
            )}
          </tbody>
        </table>
      </div>

      {/* Info: (20260429 - Julian) Pagination */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(page) => setCurrentPage(page)}
        />
      )}
    </div>
  );
}
