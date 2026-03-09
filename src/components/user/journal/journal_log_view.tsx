"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "@/i18n/i18n_context";
import { useParams } from "next/navigation";
import { request } from "@/lib/utils/request";
import { IApiResponse } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { Loader2 } from "lucide-react";

interface IAuditLog {
  id: string;
  createdAt: string;
  action: "CREATE" | "UPDATE" | "DELETE";
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
  const formattedDate = new Date(log.createdAt).toLocaleString();
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

  const getActionLabel = (action: string) => {
    switch (action) {
      case "CREATE":
        return t("journal.log_view.action_create");
      case "UPDATE":
        return t("journal.log_view.action_update");
      case "DELETE":
        return t("journal.log_view.action_delete");
      default:
        return action;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "CREATE":
        return "text-emerald-700 bg-emerald-100 border-emerald-200";
      case "UPDATE":
        return "text-blue-700 bg-blue-100 border-blue-200";
      case "DELETE":
        return "text-red-700 bg-red-100 border-red-200";
      default:
        return "text-gray-700 bg-gray-100 border-gray-200";
    }
  };

  return (
    <tr className="border-b border-gray-100 odd:bg-white even:bg-slate-50">
      <td className="px-3 py-4 text-xs font-medium text-gray-900 sm:px-6 sm:text-sm">
        {dateStrForDesktop}
        {dateStrForMobile}
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

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const data = await request<IApiResponse<{ logs: IAuditLog[] }>>(
        `/api/v1/account_book/${accountBookId}/audit_log?dataType=JOURNAL`,
      );
      if (data.code === ApiCode.SUCCESS && data.payload?.logs) {
        setLogs(data.payload.logs);
      }
    } catch (error) {
      console.error("Failed to fetch logs", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-sans text-xl font-semibold text-gray-800">
          {t("journal.log_view.title")}
        </h2>
        <button
          type="button"
          onClick={fetchLogs}
          disabled={isLoading}
          className="rounded-lg border border-orange-300 bg-orange-50 px-4 py-2 text-sm font-medium text-orange-600 transition-colors hover:bg-orange-100 hover:text-orange-700 disabled:opacity-50"
        >
          {t("journal.log_view.refresh")}
        </button>
      </div>

      <div className="relative mt-2 overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="w-full text-left font-sans text-sm text-gray-600">
          <thead className="bg-slate-100 text-xs font-semibold text-gray-600 uppercase sm:text-base">
            <tr>
              <th scope="col" className="px-3 py-4 sm:px-6">
                {t("journal.log_view.record_time")}
              </th>
              <th scope="col" className="px-3 py-4 sm:px-6">
                {t("journal.log_view.action_type")}
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
              // eslint-disable-next-line jsx-a11y/control-has-associated-label
              <tr>
                <td colSpan={4} className="h-40 text-center">
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
                <td colSpan={4} className="h-40 text-center text-gray-500">
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
