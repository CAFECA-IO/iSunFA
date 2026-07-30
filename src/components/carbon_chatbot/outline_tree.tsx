"use client";

// Info: (20260713 - Tzuhan) 章節樹(11 章可折疊 + 段落狀態/簽核):桌面 OutlineDrawer 與行動版 OutlineModal 共用

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Circle,
  CircleDot,
  ShieldCheck,
  Database,
  Sparkles,
  Loader2,
} from "lucide-react";
import { IReportParagraph } from "@/types/carbon_chatbot.types";
import { CARBON_REPORT_CHAPTERS } from "@/constants/carbon_report_outline";
import { CarbonDataBadgeStateEnum } from "@/lib/carbon_report_table.builder";
import { useTranslation } from "@/i18n/i18n_context";

interface IOutlineTreeProps {
  paragraphs: IReportParagraph[];
  activeParagraphId: string | null;
  onJump: (paragraphId: string) => void;
  onToggleVerified: (paragraphId: string) => void;
  // Info: (20260714 - Tzuhan) AI 段落草稿生成:正在生成的段落 id(同時間僅一段)與觸發 callback
  draftingParagraphId?: string | null;
  onGenerateDraft?: (paragraphId: string) => void;
  // Info: (20260720 - Tzuhan) #23 數據段落勾稽三態(已勾稽 ✓/守恆違反 ⚠/數據不足),由 ledger 決定性裁決
  dataBadgeState?: CarbonDataBadgeStateEnum;
}

const statusIcon = (paragraph: IReportParagraph, isActive: boolean) => {
  if (paragraph.isCompleted)
    return <CheckCircle2 size={14} className="shrink-0 text-green-600" />;
  if (isActive)
    return <CircleDot size={14} className="shrink-0 text-[#ff5a00]" />;
  return <Circle size={14} className="shrink-0 text-gray-300" />;
};

export function OutlineTree({
  paragraphs,
  activeParagraphId,
  onJump,
  onToggleVerified,
  draftingParagraphId = null,
  onGenerateDraft = undefined,
  dataBadgeState = CarbonDataBadgeStateEnum.INSUFFICIENT,
}: IOutlineTreeProps) {
  const { t } = useTranslation();
  // Info: (20260720 - Tzuhan) #23 三態徽章樣式:teal=已勾稽、red=守恆違反、gray=數據不足
  const dataBadge =
    dataBadgeState === CarbonDataBadgeStateEnum.RECONCILED
      ? {
          className: "shrink-0 text-teal-600",
          title: t("carbon_chatbot.data_badge_reconciled"),
        }
      : dataBadgeState === CarbonDataBadgeStateEnum.VIOLATED
        ? {
            className: "shrink-0 text-red-500",
            title: t("carbon_chatbot.data_badge_violated"),
          }
        : {
            className: "shrink-0 text-gray-300",
            title: t("carbon_chatbot.data_badge_insufficient"),
          };
  const activeChapterId = paragraphs.find(
    (p) => p.id === activeParagraphId,
  )?.chapterId;
  const [expandedChapters, setExpandedChapters] = useState<
    Record<string, boolean>
  >(activeChapterId ? { [activeChapterId]: true } : {});

  const toggleChapter = (chapterId: string) =>
    setExpandedChapters((prev) => ({
      ...prev,
      [chapterId]: !prev[chapterId],
    }));

  return (
    // Info: (20260713 - Tzuhan) min-h-0 讓 flex 子元素可收縮,行動版 Modal 內才能正確捲動
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
      {CARBON_REPORT_CHAPTERS.map((chapter) => {
        const chapterParagraphs = paragraphs.filter(
          (p) => p.chapterId === chapter.id,
        );
        if (chapterParagraphs.length === 0) return null;
        const completedCount = chapterParagraphs.filter(
          (p) => p.isCompleted,
        ).length;
        const isExpanded = Boolean(expandedChapters[chapter.id]);

        return (
          <div key={chapter.id} className="mb-1">
            <button
              type="button"
              onClick={() => toggleChapter(chapter.id)}
              className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              {isExpanded ? (
                <ChevronDown size={13} className="shrink-0 text-gray-400" />
              ) : (
                <ChevronRight size={13} className="shrink-0 text-gray-400" />
              )}
              <span className="min-w-0 flex-1 truncate" title={chapter.title}>
                {chapter.title}
              </span>
              <span
                className={`shrink-0 text-[11px] ${
                  completedCount === chapterParagraphs.length
                    ? "text-green-600"
                    : "text-gray-400"
                }`}
              >
                {completedCount}/{chapterParagraphs.length}
              </span>
            </button>

            {isExpanded && (
              <div className="ml-4 flex flex-col gap-0.5 border-l border-gray-100 pl-2">
                {chapterParagraphs.map((p) => {
                  const isActive = p.id === activeParagraphId;
                  return (
                    <div
                      key={p.id}
                      className={`group flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs transition-colors ${
                        isActive
                          ? "bg-orange-50 text-[#ff5a00]"
                          : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => onJump(p.id)}
                        className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                        title={p.title}
                      >
                        {statusIcon(p, isActive)}
                        <span className="min-w-0 flex-1 truncate">
                          {p.title}
                        </span>
                      </button>

                      {/* Info: (20260714 - Tzuhan) AI 撰寫此段:生成中顯示 spinner;任一段生成中即全部停用,避免併發寫入 */}
                      {onGenerateDraft && (
                        <button
                          type="button"
                          disabled={draftingParagraphId !== null}
                          onClick={() => onGenerateDraft(p.id)}
                          title={
                            draftingParagraphId === p.id
                              ? t("carbon_chatbot.draft_generating")
                              : t("carbon_chatbot.draft_generate")
                          }
                          className={`shrink-0 rounded p-0.5 transition-colors ${
                            draftingParagraphId === p.id
                              ? "text-[#ff5a00]"
                              : draftingParagraphId
                                ? "cursor-not-allowed text-gray-200"
                                : "text-gray-300 hover:bg-orange-50 hover:text-[#ff5a00]"
                          }`}
                        >
                          {draftingParagraphId === p.id ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Sparkles size={13} />
                          )}
                        </button>
                      )}

                      {/* Info: (20260713 - Tzuhan) 數據段落標記:數字由後端決定論管線勾稽,非 LLM 產出 */}
                      {/* Info: (20260720 - Tzuhan) #23 三態化:顏色/提示反映勾稽真實狀態,不再是不實聲明 */}
                      {p.isDataDriven && (
                        <span title={dataBadge.title}>
                          <Database size={12} className={dataBadge.className} />
                        </span>
                      )}

                      <button
                        type="button"
                        disabled={!p.isCompleted}
                        onClick={() => onToggleVerified(p.id)}
                        title={
                          p.isVerified
                            ? t("carbon_chatbot.status_verified")
                            : t("carbon_chatbot.status_unverified")
                        }
                        className={`shrink-0 rounded p-0.5 transition-colors ${
                          p.isVerified
                            ? "text-blue-600 hover:bg-blue-50"
                            : p.isCompleted
                              ? "text-gray-300 hover:bg-gray-100 hover:text-blue-500"
                              : "cursor-not-allowed text-gray-200"
                        }`}
                      >
                        <ShieldCheck size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
