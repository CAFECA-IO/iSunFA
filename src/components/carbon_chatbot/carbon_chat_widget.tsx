"use client";

// Info: (20260714 - Emily) 碳盤查聊天外殼(引擎仍為 use_carbon_chat);純外殼,內容由呼叫端以 children 組合
// Info: (20260730 - Tzuhan) 版面收斂:桌機從「浮動視窗」改為「右側 dock」。
// Info: (20260730 - Tzuhan) 原本它以 fixed 浮在報告上方,而聊天與報告都是主要工作區——
// Info: (20260730 - Tzuhan) 讓其中一個蓋住另一個,使用者只能反覆開關才能對照。改為佔文檔流後兩者可並用。
// Info: (20260730 - Tzuhan) 收合態改為右側細軌(同樣佔文檔流),取代原本的浮動圓鈕:少一個浮層,且位置固定不遮內容。
// Info: (20260730 - Tzuhan) 行動版維持全螢幕覆蓋 + 浮動鈕——窄螢幕沒有並排的餘裕,dock 反而擠壞報告。

import { ReactNode } from "react";
import { Bot, X, PanelRightClose } from "lucide-react";
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

  // Info: (20260730 - Tzuhan) 收合態:桌機顯示右側細軌(in-flow),行動版顯示右下浮動鈕
  if (!isOpen) {
    return (
      <>
        <button
          type="button"
          aria-label={t("carbon_chatbot.title")}
          title={t("carbon_chatbot.title")}
          onClick={onToggle}
          className="hidden w-12 shrink-0 flex-col items-center gap-2 border-l border-gray-200 bg-white py-4 text-gray-400 transition-colors hover:bg-gray-50 hover:text-[#ff5a00] sm:flex"
        >
          <Bot className="h-5 w-5" />
          {/* Info: (20260730 - Tzuhan) 直書標籤:細軌只有 48px,橫排文字放不下 */}
          <span className="text-[11px] font-bold [writing-mode:vertical-rl]">
            {t("carbon_chatbot.ai_name")}
          </span>
        </button>
        <button
          type="button"
          aria-label={t("carbon_chatbot.title")}
          onClick={onToggle}
          className="fixed right-6 bottom-6 z-[80] flex items-center justify-center rounded-full bg-[#ff5a00] p-4 text-white shadow-lg transition-transform hover:scale-105 active:scale-95 sm:hidden"
        >
          <Bot className="h-7 w-7" />
        </button>
      </>
    );
  }

  return (
    // Info: (20260730 - Tzuhan) 桌機:in-flow 固定寬度欄;行動版:fixed 全螢幕覆蓋(z-[80] 高於目錄 Modal z-[70])
    <div className="fixed inset-0 z-[80] flex h-full w-full flex-col overflow-hidden bg-white sm:static sm:z-auto sm:h-auto sm:w-[420px] sm:shrink-0 sm:border-l sm:border-gray-200">
      <div className="flex shrink-0 items-center justify-between bg-[#ff5a00] p-3 text-white">
        <div className="flex min-w-0 items-center gap-2">
          <div className="rounded-lg bg-white/20 p-1.5">
            <Bot className="h-5 w-5" />
          </div>
          <span className="text-sm font-bold">
            {t("carbon_chatbot.ai_name")}
          </span>
          <span className="truncate text-xs text-white/70">
            {t("carbon_chatbot.subtitle")}
          </span>
        </div>
        <button
          type="button"
          aria-label={t("carbon_chatbot.close_chat")}
          title={t("carbon_chatbot.close_chat")}
          onClick={onToggle}
          className="rounded-lg p-1 transition-colors hover:bg-white/20"
        >
          {/* Info: (20260730 - Tzuhan) 桌機收合(側欄收起)與行動版關閉(全螢幕退出)語意不同,故用兩種圖示 */}
          <PanelRightClose className="hidden h-5 w-5 sm:block" />
          <X className="h-5 w-5 sm:hidden" />
        </button>
      </div>
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}
