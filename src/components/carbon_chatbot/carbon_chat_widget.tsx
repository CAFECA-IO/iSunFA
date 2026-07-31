"use client";

// Info: (20260714 - Emily) 碳盤查聊天外殼(引擎仍為 use_carbon_chat);純外殼,內容由呼叫端以 children 組合
// Info: (20260730 - Tzuhan) 三段尺寸:圖示 → 浮層(預設)→ 右側 dock。
// Info: (20260730 - Tzuhan) 浮層適合邊看報告邊問一句;dock 適合長對話與逐段對照 —— 兩種情境都真實存在,
// Info: (20260730 - Tzuhan) 所以放大/縮小交給使用者切換,而不是我們替他二選一。
// Info: (20260730 - Tzuhan) 行動版不分浮層與 dock:窄螢幕沒有並排餘裕,兩者一律全螢幕覆蓋。

import { ReactNode } from "react";
import { Bot, X, Maximize2, Minimize2 } from "lucide-react";
import { Transition } from "@headlessui/react";
import { useTranslation } from "@/i18n/i18n_context";
import { CarbonChatPanelSizeEnum } from "@/constants/carbon_chatbot";

interface ICarbonChatWidgetProps {
  size: CarbonChatPanelSizeEnum;
  /** Info: (20260730 - Tzuhan) 收起為圖示(關閉鈕) */
  onCollapse: () => void;
  /** Info: (20260730 - Tzuhan) 由圖示展開為浮層 */
  onExpand: () => void;
  /** Info: (20260730 - Tzuhan) 浮層 ↔ dock 切換 */
  onToggleDock: () => void;
  children: ReactNode;
}

export function CarbonChatWidget({
  size,
  onCollapse,
  onExpand,
  onToggleDock,
  children,
}: ICarbonChatWidgetProps) {
  const { t } = useTranslation();
  const isDocked = size === CarbonChatPanelSizeEnum.DOCKED;

  if (size === CarbonChatPanelSizeEnum.COLLAPSED) {
    return (
      <button
        type="button"
        aria-label={t("carbon_chatbot.title")}
        title={t("carbon_chatbot.title")}
        onClick={onExpand}
        className="fixed right-6 bottom-6 z-[80] flex items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-[#ff5a00] p-4 text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
      >
        <Bot className="h-8 w-8" />
      </button>
    );
  }

  const panel = (
    <div
      className={
        isDocked
          ? // Info: (20260730 - Tzuhan) dock:桌機佔文檔流(報告自動讓出寬度);行動版仍全螢幕
            "fixed inset-0 z-[80] flex h-full w-full flex-col overflow-hidden bg-white sm:static sm:z-auto sm:h-auto sm:w-[420px] sm:shrink-0 sm:border-l sm:border-gray-200"
          : // Info: (20260730 - Tzuhan) 浮層:桌機固定尺寸浮在右下;行動版全螢幕
            "fixed inset-0 z-50 flex h-full w-full flex-col overflow-hidden bg-white shadow-2xl ring-1 ring-black/5 sm:static sm:z-auto sm:h-[640px] sm:w-[420px] sm:rounded-2xl"
      }
    >
      <div className="flex shrink-0 items-center justify-between bg-[#ff5a00] p-3 text-white">
        <div className="flex min-w-0 items-center gap-2">
          <div className="rounded-lg bg-white/20 p-1.5">
            <Bot className="h-5 w-5" />
          </div>
          <span className="shrink-0 text-sm font-bold">
            {t("carbon_chatbot.ai_name")}
          </span>
          <span className="truncate text-xs text-white/70">
            {t("carbon_chatbot.subtitle")}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {/* Info: (20260730 - Tzuhan) 放大/縮小僅桌機有意義(行動版兩態皆全螢幕),故 sm 以下隱藏 */}
          <button
            type="button"
            aria-label={
              isDocked
                ? t("carbon_chatbot.panel_restore")
                : t("carbon_chatbot.panel_maximize")
            }
            title={
              isDocked
                ? t("carbon_chatbot.panel_restore")
                : t("carbon_chatbot.panel_maximize")
            }
            onClick={onToggleDock}
            className="hidden rounded-lg p-1 transition-colors hover:bg-white/20 sm:block"
          >
            {isDocked ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </button>
          <button
            type="button"
            aria-label={t("carbon_chatbot.close_chat")}
            title={t("carbon_chatbot.close_chat")}
            onClick={onCollapse}
            className="rounded-lg p-1 transition-colors hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );

  // Info: (20260730 - Tzuhan) dock 佔文檔流,不可包在 fixed 容器裡(否則報告不會讓出寬度)
  if (isDocked) return panel;

  return (
    <div className="fixed right-6 bottom-6 z-[80] flex flex-col items-end gap-4">
      <Transition
        show
        appear
        enter="transition ease-out duration-200"
        enterFrom="opacity-0 translate-y-4 scale-95"
        enterTo="opacity-100 translate-y-0 scale-100"
      >
        {panel}
      </Transition>
    </div>
  );
}
