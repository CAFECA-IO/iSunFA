"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "@/i18n/i18n_context";
import { useParams } from "next/navigation";
import { request } from "@/lib/utils/request";
import { IApiResponse } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { Loader2 } from "lucide-react";
import { timestampToString } from "@/lib/utils/common";
import { AuditLogAction, AuditLogDataType } from "@/constants/audit_log";

interface IAuditLog {
  id: string;
  createdAt: string;
  action: AuditLogAction;
  dataType: string;
  dataId: string;
  user: {
    id: string;
    name: string | null;
    address: string;
  };
}

const LogItem = ({ log }: { log: IAuditLog }) => {
  const { t } = useTranslation();
  const createdAtTimestamp = new Date(log.createdAt).getTime() / 1000;
  const formattedDate = timestampToString(createdAtTimestamp).dateAndTime;
  const formattedDateSplit = formattedDate.split(" ");

  const dateStrForDesktop = (
    <p className="hidden text-sm sm:block">{formattedDate}</p>
  );
  const dateStrForMobile = (
    <div className="flex flex-col items-center text-xs sm:hidden">
      <span>{formattedDateSplit[0]}</span>
      <span>{formattedDateSplit[1]}</span>
    </div>
  );

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
      <td className="px-3 py-4 sm:px-6">
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold whitespace-nowrap uppercase sm:text-sm ${getDataTypeColor(
            log.dataType,
          )}`}
        >
          {getDataTypeLabel(log.dataType)}
        </span>
      </td>
      <td className="px-3 py-4 sm:px-6">
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold whitespace-nowrap sm:text-sm ${getActionColor(
            log.action,
          )}`}
        >
          {getActionLabel(log.action)}
        </span>
      </td>
      <td className="px-3 py-4 text-xs font-medium text-gray-900 sm:px-6 sm:text-sm">
        {dateStrForDesktop}
        {dateStrForMobile}
      </td>
      <td className="px-3 py-4 sm:px-6">
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
            className="font-mono text-[10px] break-all text-slate-500 hover:text-orange-600 sm:text-sm"
          >
            {log.user.address}
          </button>
        </div>
      </td>
      <td className="px-3 py-4 font-mono text-xs text-slate-500 sm:px-6">
        <button
          type="button"
          onClick={() => copyToClipboard(log.dataId)}
          aria-label={t("journal.log_view.copy_id", { id: log.dataId })}
          title={t("journal.log_view.copy_id", { id: log.dataId })}
          className="rounded bg-gray-100 px-2 py-1 font-mono text-[10px] break-all hover:bg-gray-200 sm:text-sm"
        >
          {log.dataId}
        </button>
      </td>
    </tr>
  );
};

export default function JournalLogView() {
  const { t } = useTranslation();
  const params = useParams();
  // Info: (20260309 - Julian) 從 URL 取得帳簿 ID
  const accountBookId = params?.account_book_id as string;

  const [logs, setLogs] = useState<IAuditLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [dataType, setDataType] = useState<string>("");

  useEffect(() => {
    const fetchLogs = async () => {
      setIsLoading(true);
      try {
        const queryParams = new URLSearchParams();
        if (startDate) {
          queryParams.append("startDate", new Date(startDate).toISOString());
        }
        if (endDate) {
          const endDay = new Date(endDate);
          endDay.setHours(23, 59, 59, 999);
          queryParams.append("endDate", endDay.toISOString());
        }
        if (dataType) {
          queryParams.append("dataType", dataType);
        }
        const qs = queryParams.toString();
        const url = `/api/v1/user/account_book/${accountBookId}/audit_log${qs ? `?${qs}` : ""}`;

        const data = await request<IApiResponse<{ logs: IAuditLog[] }>>(url);
        if (data.code === ApiCode.SUCCESS && data.payload?.logs) {
          setLogs(data.payload.logs);
        }
      } catch (error) {
        console.error("Failed to fetch logs", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLogs();
  }, [startDate, endDate, dataType, accountBookId]);

  return (
    <div className="flex w-full max-w-full min-w-0 flex-col gap-4">
      <div className="flex flex-col items-center justify-between gap-2 lg:flex-row">
        {/* Info: (20260407 - Julian) Title */}
        <h2 className="font-sans text-xl font-semibold text-gray-800">
          {t("journal.log_view.title")}
        </h2>

        {/* Info: (20260407 - Julian) Filter */}
        <div className="flex items-center gap-8 p-4">
          {/* Info: (20260407 - Julian) Type Filter */}
          <select
            value={dataType}
            onChange={(e) => setDataType(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-bold text-slate-600 focus:ring-2 focus:ring-orange-500 focus:outline-none"
          >
            <option value="">{t("全部項目")}</option>
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

          {/* Info: (20260407 - Julian) Date Picker */}
          <div className="flex w-full items-center gap-2 lg:w-auto">
            <div className="flex w-full flex-col items-stretch gap-2 text-sm sm:flex-row sm:items-center">
              <input
                type="date"
                aria-label="Start Date"
                value={startDate}
                max={endDate || undefined}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
              <span className="hidden text-gray-400 sm:block">-</span>
              <input
                type="date"
                aria-label="End Date"
                value={endDate}
                min={startDate || undefined}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Info: (20260407 - Julian) Log Table */}
      <div className="relative mt-2 overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="w-full text-left font-sans text-sm text-gray-600">
          <thead className="bg-slate-100 text-xs font-semibold text-gray-600 uppercase sm:text-base">
            <tr>
              <th scope="col" className="px-3 py-4 sm:px-6">
                {t("異動項目")}
              </th>
              <th scope="col" className="px-3 py-4 sm:px-6">
                {t("journal.log_view.action_type")}
              </th>
              <th scope="col" className="px-3 py-4 sm:px-6">
                {t("journal.log_view.record_time")}
              </th>
              <th scope="col" className="px-3 py-4 sm:px-6">
                {t("journal.log_view.operator")}
              </th>
              <th scope="col" className="px-3 py-4 sm:px-6">
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
    </div>
  );
}
