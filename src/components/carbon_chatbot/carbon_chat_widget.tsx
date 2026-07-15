"use client";

// Info: (20260714 - Emily) 碳盤查聊天浮動視窗殼(借 FaithAgent 的浮動視窗 UX,引擎仍為 use_carbon_chat)
// Info: (20260714 - Emily) 純外殼:內容由呼叫端以 children 組合,殼不綁定聊天邏輯

import { ReactNode } from "react";
import { Bot, X } from "lucide-react";
import { Transition } from "@headlessui/react";
import { useTranslation } from "@/i18n/i18n_context";

interface ICarbonChatWidgetProps {
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
}

export function CarbonChatWidget({
  isOpen,
  onToggle,
  children,
}: ICarbonChatWidgetProps) {
  const { t } = useTranslation();

  return (
    // Info: (20260714 - Emily) z-[80] 高於報告覆蓋層(z-[60])與目錄 Modal(z-[70])
    <div className="fixed right-6 bottom-6 z-[80] flex flex-col items-end gap-4">
      <Transition
        show={isOpen}
        enter="transition ease-out duration-200"
        enterFrom="opacity-0 translate-y-4 scale-95"
        enterTo="opacity-100 translate-y-0 scale-100"
        leave="transition ease-in duration-150"
        leaveFrom="opacity-100 translate-y-0 scale-100"
        leaveTo="opacity-0 translate-y-4 scale-95"
      >
        {/* Info: (20260714 - Emily) 行動版全螢幕;桌機固定尺寸浮動視窗 */}
        <div className="fixed inset-0 z-50 flex h-full w-full flex-col overflow-hidden bg-white shadow-2xl ring-1 ring-black/5 sm:static sm:z-auto sm:h-[640px] sm:w-[420px] sm:rounded-2xl">
          <div className="flex shrink-0 items-center justify-between bg-[#ff5a00] p-3 text-white">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-white/20 p-1.5">
                <Bot className="h-5 w-5" />
              </div>
              <span className="text-sm font-bold">
                {t("carbon_chatbot.ai_name")}
              </span>
              <span className="text-xs text-white/70">
                {t("carbon_chatbot.subtitle")}
              </span>
            </div>
            <button
              type="button"
              aria-label={t("carbon_chatbot.close_chat")}
              onClick={onToggle}
              className="rounded-lg p-1 transition-colors hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
            {children}
          </div>
        </div>
      </Transition>

      {/* Info: (20260714 - Emily) 浮動觸發鈕(開啟時旋轉為關閉樣式,同 FaithAgent) */}
      <button
        type="button"
        aria-label={t("carbon_chatbot.title")}
        onClick={onToggle}
        className={`flex items-center justify-center rounded-full p-4 shadow-lg transition-all duration-300 hover:scale-105 active:scale-95 ${
          isOpen
            ? "rotate-90 bg-gray-800 text-white"
            : "bg-gradient-to-r from-orange-500 to-[#ff5a00] text-white hover:shadow-orange-500/30"
        }`}
      >
        {isOpen ? <X className="h-6 w-6" /> : <Bot className="h-8 w-8" />}
      </button>
    </div>
  );
}
