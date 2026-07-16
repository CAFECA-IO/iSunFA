"use client";

// Info: (20260713 - Tzuhan) 報告工具列:文件名 + 完成/查核雙軌進度膠囊 + 章節目錄開關

import { FileText, ListTree, Check, Loader2, AlertTriangle } from "lucide-react";
import { IReportProgressStats } from "@/types/carbon_chatbot.types";
import { ReportSaveStatus } from "@/hooks/use_carbon_chat";
import { useTranslation } from "@/i18n/i18n_context";

interface IReportToolbarProps {
  documentName: string;
  stats: IReportProgressStats;
  isDrawerOpen: boolean;
  onToggleDrawer: () => void;
  // Info: (20260713 - Tzuhan) 報告狀態徽章(取代舊 Markdown 內嵌 HTML 的狀態列)
  status?: string;
  statusColor?: string;
  // Info: (20260714 - Emily) 報告草稿本機保存狀態(null = 尚無變更)
  saveStatus?: ReportSaveStatus;
}

export function ReportToolbar({
  documentName,
  stats,
  isDrawerOpen,
  onToggleDrawer,
  status = undefined,
  statusColor = undefined,
  saveStatus = null,
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

      {/* Info: (20260714 - Emily) 草稿保存指示(E2EE 入庫);error = 保存失敗或他端已更新(版本衝突) */}
      {saveStatus && (
        <span
          title={
            saveStatus === "error"
              ? t("carbon_chatbot.save_failed_hint")
              : t("carbon_chatbot.save_local_hint")
          }
          className="flex shrink-0 items-center gap-1 text-[11px] font-medium text-gray-400"
        >
          {saveStatus === "saving" && (
            <>
              <Loader2 size={11} className="animate-spin" />
              {t("carbon_chatbot.save_saving")}
            </>
          )}
          {saveStatus === "local" && (
            <>
              {/* Info: (20260716 - Emily) #50 未解鎖前僅本機暫存:琥珀色提示,解鎖後自動轉雲端保存 */}
              <AlertTriangle size={11} className="text-amber-500" />
              <span className="text-amber-600">
                {t("carbon_chatbot.save_local")}
              </span>
            </>
          )}
          {saveStatus === "saved" && (
            <>
              <Check size={11} className="text-green-600" />
              {t("carbon_chatbot.save_saved")}
            </>
          )}
          {saveStatus === "error" && (
            <>
              <AlertTriangle size={11} className="text-red-500" />
              <span className="text-red-500">
                {t("carbon_chatbot.save_failed")}
              </span>
            </>
          )}
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
