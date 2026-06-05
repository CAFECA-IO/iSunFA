import React from "react";
import { Sparkles, Send, Loader2, Wand2, Brush, Type } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { AiRefineType } from "@/constants/ai_refine_type";

interface IAiContextMenuProps {
  isOpen: boolean;
  x: number;
  y: number;
  customAiPrompt: string;
  setCustomAiPrompt: (val: string) => void;
  isAiProcessing: boolean;
  handleAiAction: (actionType: string) => void;
}

export function AiContextMenu({
  isOpen,
  x,
  y,
  customAiPrompt,
  setCustomAiPrompt,
  isAiProcessing,
  handleAiAction,
}: IAiContextMenuProps) {
  const { t } = useTranslation();

  if (!isOpen) return null;

  const aiOptions = Object.entries(AiRefineType).map(([key, value]) => {
    const iconMap: Record<
      AiRefineType,
      React.ComponentType<{ size?: number; className?: string }>
    > = {
      [AiRefineType.REWRITE]: Wand2,
      [AiRefineType.EXPAND]: Brush,
      [AiRefineType.POLISH]: Type,
    };

    return {
      key,
      value,
      icon: iconMap[value],
    };
  });

  return (
    <div
      id="ai-context-menu"
      role="presentation"
      className="fixed z-50 flex w-72 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl"
      style={{
        top: `${y + 10}px`,
        left: `${x + 10}px`,
      }}
      onMouseDown={(e) => {
        // Info: (20260604 - Julian) 允許 input 取得焦點
        if ((e.target as HTMLElement).tagName === "INPUT") {
          return;
        }
        e.preventDefault();
      }}
    >
      <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50 px-3 py-2 text-xs font-bold text-gray-500">
        <Sparkles size={16} />
        {t("admin_mission_board.pdf_editor.ai_assistant.ai_assistant_title")}
      </div>

      {/* Info: (20260604 - Julian) 自訂 AI 操作 */}
      <div className="flex items-center gap-1 border-b border-gray-100 p-2">
        <input
          id="ai-custom-prompt"
          type="text"
          aria-label={t("admin_mission_board.pdf_editor.ai_assistant.custom")}
          placeholder={t(
            "admin_mission_board.pdf_editor.ai_assistant.custom_placeholder",
          )}
          value={customAiPrompt}
          onChange={(e) => setCustomAiPrompt(e.target.value)}
          onKeyDown={(e) => {
            // Info: (20260604 - Julian) 避免與中文輸入法衝突
            if (e.nativeEvent.isComposing) return;

            if (e.key === "Enter" && customAiPrompt.trim() && !isAiProcessing) {
              e.preventDefault();
              handleAiAction(customAiPrompt.trim());
            }
          }}
          className="flex-1 rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-700 transition-colors placeholder:text-gray-400 focus:border-orange-500 focus:bg-white focus:ring-1 focus:ring-orange-500 focus:outline-none"
        />
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            if (customAiPrompt.trim() && !isAiProcessing) {
              handleAiAction(customAiPrompt.trim());
            }
          }}
          disabled={isAiProcessing || !customAiPrompt.trim()}
          className="flex shrink-0 items-center justify-center rounded-md bg-emerald-600 p-1.5 text-white transition-colors hover:bg-emerald-500 disabled:opacity-50 disabled:hover:bg-emerald-600"
        >
          <Send size={14} />
        </button>
      </div>

      {/* Info: (20260604 - Julian) 預設 AI 操作 */}
      <div className="flex items-center justify-around p-1">
        {aiOptions.map((option) => (
          <button
            key={option.key}
            onMouseDown={(e) => {
              // Info: (20260603 - Julian) 按下滑鼠時，不要觸發 onBlur
              e.preventDefault();
              e.stopPropagation();
              if (!isAiProcessing) handleAiAction(option.value);
            }}
            disabled={isAiProcessing}
            className="flex flex-1 flex-col items-center gap-1 rounded-lg px-2 py-2 text-xs text-gray-600 transition-colors enabled:hover:bg-orange-50 enabled:hover:text-orange-700 disabled:opacity-50"
          >
            {isAiProcessing ? (
              <Loader2 size={16} className="animate-spin text-gray-400" />
            ) : (
              <option.icon size={16} />
            )}
            <span className="font-medium">
              {t(
                `admin_mission_board.pdf_editor.ai_assistant.${option.key.toLocaleLowerCase()}`,
              )}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
