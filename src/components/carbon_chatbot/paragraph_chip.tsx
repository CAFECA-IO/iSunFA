// Info: (20260714 - Emily) 段落 chip:訊息 ↔ 報告段落的連動入口,點擊跳至報告對應段落並高亮

import { FileText } from "lucide-react";
import { CARBON_REPORT_OUTLINE } from "@/constants/carbon_report_outline";
import { useTranslation } from "@/i18n/i18n_context";

export interface IParagraphChipProps {
  paragraphId: string;
  onJump: (paragraphId: string) => void;
}

export function ParagraphChip({ paragraphId, onJump }: IParagraphChipProps) {
  const { t } = useTranslation();
  const section = CARBON_REPORT_OUTLINE.find((s) => s.id === paragraphId);
  if (!section) return null;

  return (
    <button
      type="button"
      aria-label={t("carbon_chatbot.jump_aria_label")}
      onClick={() => onJump(paragraphId)}
      className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700 transition-colors hover:border-[#ff5a00] hover:bg-orange-100"
    >
      <FileText size={12} className="shrink-0" />
      <span className="truncate">
        {section.code} {section.title}
      </span>
    </button>
  );
}
