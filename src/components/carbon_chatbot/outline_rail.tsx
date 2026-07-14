"use client";

// Info: (20260713 - Tzuhan) 常駐章節導軌:33 個狀態點依章分組,hover 顯示標題,點擊跳段
// Info: (20260713 - Tzuhan) 狀態色:藍=已查核、綠=已完成、橘框=進行中(對話目標)、灰框=未開始

import { IReportParagraph } from "@/types/carbon_chatbot.types";
import { CARBON_REPORT_CHAPTERS } from "@/constants/carbon_report_outline";
import { useTranslation } from "@/i18n/i18n_context";

interface IOutlineRailProps {
  paragraphs: IReportParagraph[];
  activeParagraphId: string | null;
  onJump: (paragraphId: string) => void;
  className?: string;
}

const dotClassName = (
  paragraph: IReportParagraph,
  isActive: boolean,
): string => {
  const base =
    "h-2.5 w-2.5 rounded-full transition-all duration-200 hover:scale-125";
  const ring = isActive ? " ring-2 ring-[#ff5a00] ring-offset-1" : "";
  if (paragraph.isVerified) return `${base} bg-blue-500${ring}`;
  if (paragraph.isCompleted) return `${base} bg-green-500${ring}`;
  if (isActive) return `${base} border-2 border-[#ff5a00] bg-white`;
  return `${base} border border-gray-300 bg-white`;
};

export function OutlineRail({
  paragraphs,
  activeParagraphId,
  onJump,
  className = "",
}: IOutlineRailProps) {
  const { t } = useTranslation();

  return (
    <div
      className={`flex w-11 shrink-0 flex-col items-center gap-3 overflow-y-auto border-r border-gray-200 bg-gray-50 py-3 ${className}`}
    >
      {CARBON_REPORT_CHAPTERS.map((chapter) => {
        const chapterParagraphs = paragraphs.filter(
          (p) => p.chapterId === chapter.id,
        );
        if (chapterParagraphs.length === 0) return null;
        return (
          <div
            key={chapter.id}
            className="flex flex-col items-center gap-1.5"
            title={chapter.title}
          >
            {chapterParagraphs.map((p) => (
              <button
                key={p.id}
                type="button"
                aria-label={`${p.title} ${t("carbon_chatbot.jump_aria_label")}`}
                title={p.title}
                onClick={() => onJump(p.id)}
                className={dotClassName(p, p.id === activeParagraphId)}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}
