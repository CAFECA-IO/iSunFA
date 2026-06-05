"use client";

import { Sparkles, Check, CornerDownRight, X as XIcon } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";

interface IAiSuggestionMenuProps {
  isOpen: boolean;
  onReplace: () => void;
  onInsert: () => void;
  onDiscard: () => void;
}

export function AiSuggestionMenu({
  isOpen,
  onReplace,
  onInsert,
  onDiscard,
}: IAiSuggestionMenuProps) {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div
      id="ai-suggestion-menu"
      role="presentation"
      className="absolute top-12 right-6 z-30 flex flex-col items-center gap-2 overflow-hidden rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 shadow-2xl"
      onMouseDown={(e) => e.preventDefault()}
    >
      <div className="flex w-full items-center justify-center gap-1 border-b border-orange-100 pb-2 text-xs font-bold text-orange-600">
        <Sparkles size={14} />
        {t("admin_mission_board.pdf_editor.ai_assistant.ai_suggestion_title")}
      </div>
      <div className="mt-1 flex w-full flex-col gap-2">
        <button
          type="button"
          onClick={onReplace}
          className="flex w-full items-center justify-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-green-500"
        >
          <Check size={14} />
          {t(
            "admin_mission_board.pdf_editor.ai_assistant.ai_suggestion_replace",
          )}
        </button>
        <button
          type="button"
          onClick={onInsert}
          className="flex w-full items-center justify-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-blue-500"
        >
          <CornerDownRight size={14} />
          {t(
            "admin_mission_board.pdf_editor.ai_assistant.ai_suggestion_insert",
          )}
        </button>
        <button
          type="button"
          onClick={onDiscard}
          className="flex w-full items-center justify-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
        >
          <XIcon size={14} />
          {t(
            "admin_mission_board.pdf_editor.ai_assistant.ai_suggestion_discard",
          )}
        </button>
      </div>
    </div>
  );
}
