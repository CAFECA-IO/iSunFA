"use client";

// Info: (20260713 - Tzuhan) 章節目錄抽屜(桌面):標頭 + 共用 OutlineTree;點段落跳轉對話目標
// Info: (20260713 - Tzuhan) vibe 模式:isCompleted 由系統依生成狀態判定(唯讀顯示),僅 isVerified(人工簽核)可手動切換

import { X } from "lucide-react";
import { IReportParagraph } from "@/types/carbon_chatbot.types";
import { CarbonDataBadgeStateEnum } from "@/lib/carbon_report_table.builder";
import { OutlineTree } from "@/components/carbon_chatbot/outline_tree";
import { useTranslation } from "@/i18n/i18n_context";

interface IOutlineDrawerProps {
  paragraphs: IReportParagraph[];
  activeParagraphId: string | null;
  onJump: (paragraphId: string) => void;
  onToggleVerified: (paragraphId: string) => void;
  onClose: () => void;
  // Info: (20260714 - Tzuhan) AI 段落草稿生成(透傳給 OutlineTree)
  draftingParagraphId?: string | null;
  onGenerateDraft?: (paragraphId: string) => void;
  // Info: (20260730 - Tzuhan) 產生結構圖(透傳至 OutlineTree;僅有對應模板的段落顯示按鈕)
  onGenerateDiagram?: (paragraphId: string) => void;
  // Info: (20260720 - Tzuhan) #23 數據段落勾稽三態(透傳給 OutlineTree)
  dataBadgeState?: CarbonDataBadgeStateEnum;
}

export function OutlineDrawer({
  paragraphs,
  activeParagraphId,
  onJump,
  onToggleVerified,
  onClose,
  draftingParagraphId = null,
  onGenerateDraft = undefined,
  onGenerateDiagram = undefined,
  dataBadgeState = undefined,
}: IOutlineDrawerProps) {
  const { t } = useTranslation();

  return (
    // Info: (20260713 - Tzuhan) <xl 抽屜全寬獨占(行動版不與 PDF 並排);xl+ 固定 240px 側欄
    <div className="flex w-full shrink-0 flex-col border-r border-gray-200 bg-white xl:w-60">
      <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2.5">
        <span className="text-xs font-bold text-gray-700">
          {t("carbon_chatbot.outline_title")} ({paragraphs.length})
        </span>
        <button
          type="button"
          aria-label={t("carbon_chatbot.close_outline")}
          onClick={onClose}
          className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
        >
          <X size={14} />
        </button>
      </div>

      <OutlineTree
        paragraphs={paragraphs}
        activeParagraphId={activeParagraphId}
        onJump={onJump}
        onToggleVerified={onToggleVerified}
        draftingParagraphId={draftingParagraphId}
        onGenerateDraft={onGenerateDraft}
        onGenerateDiagram={onGenerateDiagram}
        dataBadgeState={dataBadgeState}
      />
    </div>
  );
}
