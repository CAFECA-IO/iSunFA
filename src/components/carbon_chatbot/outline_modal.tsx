"use client";

// Info: (20260713 - Tzuhan) 行動版(<xl)章節目錄 Modal:右欄預覽於窄螢幕隱藏,此為 33 段大綱與查核進度的唯一入口
// Info: (20260713 - Tzuhan) 點段落 = 跳轉對話目標並關閉 Modal(行動版以對話為主視圖)

import { X } from "lucide-react";
import {
  IReportParagraph,
  IReportProgressStats,
} from "@/types/carbon_chatbot.types";
import { OutlineTree } from "@/components/carbon_chatbot/outline_tree";
import { useTranslation } from "@/i18n/i18n_context";

interface IOutlineModalProps {
  paragraphs: IReportParagraph[];
  stats: IReportProgressStats;
  activeParagraphId: string | null;
  onJump: (paragraphId: string) => void;
  onToggleVerified: (paragraphId: string) => void;
  onClose: () => void;
}

export function OutlineModal({
  paragraphs,
  stats,
  activeParagraphId,
  onJump,
  onToggleVerified,
  onClose,
}: IOutlineModalProps) {
  const { t } = useTranslation();

  const handleJump = (paragraphId: string) => {
    onJump(paragraphId);
    onClose();
  };

  return (
    // Info: (20260713 - Tzuhan) z-[70] 高於全站 UserHeader(z-50)與行動版報告覆蓋層(z-[60])
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 xl:hidden"
      role="dialog"
      aria-modal="true"
      aria-label={t("carbon_chatbot.outline_title")}
    >
      {/* Info: (20260713 - Tzuhan) 背景遮罩用原生 button,滿足鍵盤操作與 a11y 規範 */}
      <button
        type="button"
        aria-label={t("carbon_chatbot.close_outline")}
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/40"
      />
      <div className="relative flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <span className="text-sm font-bold text-gray-700">
            {t("carbon_chatbot.outline_title")} ({paragraphs.length})
          </span>
          <button
            type="button"
            aria-label={t("carbon_chatbot.close_outline")}
            onClick={onClose}
            className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={16} />
          </button>
        </div>

        {/* Info: (20260713 - Tzuhan) 雙軌進度:與桌面工具列膠囊同一資料來源(reportStats) */}
        <div className="flex items-center gap-3 border-b border-gray-100 bg-gray-50 px-4 py-2.5 text-xs">
          <span className="font-medium text-green-700">
            {t("carbon_chatbot.completed_short")} {stats.completedCount}/
            {stats.totalCount}
          </span>
          <span className="text-gray-300">|</span>
          <span className="font-medium text-blue-700">
            {t("carbon_chatbot.verified_short")} {stats.verifiedCount}/
            {stats.totalCount}
          </span>
          <span className="relative ml-auto inline-block h-1.5 w-24 overflow-hidden rounded-full bg-gray-200">
            <span
              className="absolute inset-y-0 left-0 rounded-full bg-green-400 transition-all duration-500"
              style={{ width: `${stats.completedPercent}%` }}
            />
            <span
              className="absolute inset-y-0 left-0 rounded-full bg-blue-500 transition-all duration-500"
              style={{ width: `${stats.verifiedPercent}%` }}
            />
          </span>
        </div>

        <OutlineTree
          paragraphs={paragraphs}
          activeParagraphId={activeParagraphId}
          onJump={handleJump}
          onToggleVerified={onToggleVerified}
        />
      </div>
    </div>
  );
}
