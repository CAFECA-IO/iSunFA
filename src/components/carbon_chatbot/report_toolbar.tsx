"use client";

// Info: (20260713 - Tzuhan) 報告工具列:文件名 + 完成/查核雙軌進度膠囊 + 章節目錄開關

import { FileText, ListTree } from "lucide-react";
import { IReportProgressStats } from "@/types/carbon_chatbot.types";
import { useTranslation } from "@/i18n/i18n_context";

interface IReportToolbarProps {
  documentName: string;
  stats: IReportProgressStats;
  isDrawerOpen: boolean;
  onToggleDrawer: () => void;
  // Info: (20260713 - Tzuhan) 報告狀態徽章(取代舊 Markdown 內嵌 HTML 的狀態列)
  status?: string;
  statusColor?: string;
}

export function ReportToolbar({
  documentName,
  stats,
  isDrawerOpen,
  onToggleDrawer,
  status = undefined,
  statusColor = undefined,
}: IReportToolbarProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-2.5">
      <FileText size={16} className="shrink-0 text-gray-400" />
      <span
        className="min-w-0 truncate text-xs font-bold text-gray-700"
        title={documentName}
      >
        {documentName}
      </span>
      {status && (
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${statusColor ?? "bg-gray-100 text-gray-500"}`}
        >
          {status}
        </span>
      )}

      {/* Info: (20260713 - Tzuhan) 進度膠囊:點擊也可展開章節目錄 */}
      <button
        type="button"
        onClick={onToggleDrawer}
        className="ml-auto flex shrink-0 items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs transition-colors hover:bg-gray-100"
        title={t("carbon_chatbot.outline_title")}
      >
        <span className="font-medium text-green-700">
          {t("carbon_chatbot.completed_short")} {stats.completedCount}/
          {stats.totalCount}
        </span>
        <span className="text-gray-300">|</span>
        <span className="font-medium text-blue-700">
          {t("carbon_chatbot.verified_short")} {stats.verifiedCount}/
          {stats.totalCount}
        </span>
        <span className="relative inline-block h-1.5 w-16 overflow-hidden rounded-full bg-gray-200">
          <span
            className="absolute inset-y-0 left-0 rounded-full bg-green-400 transition-all duration-500"
            style={{ width: `${stats.completedPercent}%` }}
          />
          <span
            className="absolute inset-y-0 left-0 rounded-full bg-blue-500 transition-all duration-500"
            style={{ width: `${stats.verifiedPercent}%` }}
          />
        </span>
      </button>

      <button
        type="button"
        onClick={onToggleDrawer}
        className={`flex shrink-0 items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
          isDrawerOpen
            ? "border-[#ff5a00] bg-orange-50 text-[#ff5a00]"
            : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
        }`}
      >
        <ListTree size={14} />
        {t("carbon_chatbot.outline_button")}
      </button>
    </div>
  );
}
