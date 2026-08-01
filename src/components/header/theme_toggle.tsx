"use client";

/**
 * Info: (20260801 - Luphia) 三態外觀切換:淺色 / 深色 / 跟隨系統。
 *
 * 做成三個並列的選項而非一個循環切換的按鈕,是因為「跟隨系統」在循環式介面裡無法表達 ——
 * 使用者按下去只會看到顏色變了,看不出自己現在是「選了淺色」還是「系統剛好是淺色」。
 * 這兩者的差別在系統於日落自動切換深色時才會顯現,屆時前者不該變、後者該變。
 */

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun, LucideIcon } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { THEME_MODE_ORDER, ThemeModeEnum } from "@/constants/theme";

const ICON_BY_MODE: Record<ThemeModeEnum, LucideIcon> = {
  [ThemeModeEnum.LIGHT]: Sun,
  [ThemeModeEnum.DARK]: Moon,
  [ThemeModeEnum.SYSTEM]: Monitor,
};

const LABEL_KEY_BY_MODE: Record<ThemeModeEnum, string> = {
  [ThemeModeEnum.LIGHT]: "header.theme_light",
  [ThemeModeEnum.DARK]: "header.theme_dark",
  [ThemeModeEnum.SYSTEM]: "header.theme_system",
};

export default function ThemeToggle() {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();

  /**
   * Info: (20260801 - Luphia) 掛載前不標示任何選項為「目前選中」。
   * 目前主題來自 localStorage,伺服器讀不到 —— 若在 SSR 時猜一個值,
   * hydration 後與實際值不符會造成選中狀態閃動,使用者會看到高亮跳格。
   * 三個按鈕本身照常渲染,故不會有版面位移。
   */
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div>
      <h3 className="text-text-muted mb-2 px-1 text-xs font-semibold tracking-wider uppercase md:mb-3 md:px-2">
        {t("header.theme")}
      </h3>
      <div
        className="grid grid-cols-3 gap-3 md:gap-2"
        role="radiogroup"
        aria-label={t("header.theme")}
      >
        {THEME_MODE_ORDER.map((mode) => {
          const Icon = ICON_BY_MODE[mode];
          const isActive = mounted && theme === mode;
          return (
            <button
              key={mode}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => setTheme(mode)}
              className={`group flex h-full w-full flex-col items-center justify-center rounded-xl p-2 text-center text-xs font-normal ring-1 transition-colors md:rounded-lg md:font-medium ${
                isActive
                  ? "bg-brand-soft text-brand-on-soft ring-brand"
                  : "bg-surface-overlay text-text-secondary ring-border-default hover:bg-surface-hover md:bg-transparent md:ring-0"
              }`}
            >
              <Icon
                size={24}
                className={`mb-1 md:size-5 ${isActive ? "text-brand" : "text-text-muted group-hover:text-text-secondary"}`}
              />
              {t(LABEL_KEY_BY_MODE[mode])}
            </button>
          );
        })}
      </div>
    </div>
  );
}
