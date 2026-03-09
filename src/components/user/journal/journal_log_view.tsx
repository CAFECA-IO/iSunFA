"use client";

import { useEffect, useState } from "react";
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
        return "新增";
      case "UPDATE":
        return "更新";
      case "DELETE":
        return "刪除";
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
    <tr className="border-b border-gray-100 bg-white">
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
            {log.user.name || "未命名使用者"}
          </span>
          <button
            type="button"
            onClick={() => copyToClipboard(log.user.address)}
            aria-label={`點擊複製地址: ${log.user.address}`}
            title="點擊複製地址"
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
          aria-label={`點擊複製憑證 ID: ${log.dataId}`}
          title="點擊複製憑證 ID"
          className="rounded bg-gray-100 px-2 py-1 font-mono text-[10px] break-all hover:bg-gray-200 sm:text-sm"
        >
          {log.dataId}
        </button>
      </td>
    </tr>
  );
};

export default function JournalLogView() {
  const params = useParams();
  // Info: (20260309 - Julian) 從 URL 取得帳簿 ID
  const accountBookId = params?.account_book_id as string;

  const [logs, setLogs] = useState<IAuditLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchLogs();
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
          憑證異動紀錄
        </h2>
        <button
          type="button"
          onClick={fetchLogs}
          disabled={isLoading}
          className="rounded-lg border border-orange-300 bg-orange-50 px-4 py-2 text-sm font-medium text-orange-600 transition-colors hover:bg-orange-100 hover:text-orange-700 disabled:opacity-50"
        >
          重新整理
        </button>
      </div>

      <div className="relative mt-2 overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="w-full text-left font-sans text-sm text-gray-600">
          <thead className="bg-gray-50 text-xs font-semibold text-gray-600 uppercase sm:text-base">
            <tr>
              <th scope="col" className="px-3 py-4 sm:px-6">
                紀錄時間
              </th>
              <th scope="col" className="px-3 py-4 sm:px-6">
                操作類型
              </th>
              <th scope="col" className="px-3 py-4 sm:px-6">
                操作人員
              </th>
              <th scope="col" className="px-3 py-4 sm:px-6">
                憑證 ID
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
                    <span className="text-sm font-medium">載入中...</span>
                  </div>
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={4} className="h-40 text-center text-gray-500">
                  暫無異動紀錄
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
