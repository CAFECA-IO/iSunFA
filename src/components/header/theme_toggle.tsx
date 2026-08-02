"use client";

/**
 * Info: (20260802 - Luphia) 三態外觀切換：淺色 / 跟隨系統 / 深色。
 *
 * 做成三段而非一個開關，是因為「跟隨系統」在二態介面裡無法表達 ——
 * 使用者按下去只會看到顏色變了，看不出自己現在是「選了淺色」還是「系統剛好是淺色」。
 * 這兩者的差別在系統於日落自動切換深色時才會顯現，屆時前者不該變、後者該變。
 *
 * 外觀是滑塊式開關：一個會滑動的圓形指示器蓋在三個圖示上。
 * 這樣既保住三態，整體寬度也只有 76px，塞得進 header 而不排擠導覽列。
 */

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun, LucideIcon } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { THEME_MODE_ORDER, ThemeModeEnum } from "@/constants/theme";

const ICON_BY_MODE: Record<ThemeModeEnum, LucideIcon> = {
  [ThemeModeEnum.LIGHT]: Sun,
  [ThemeModeEnum.SYSTEM]: Monitor,
  [ThemeModeEnum.DARK]: Moon,
};

const LABEL_KEY_BY_MODE: Record<ThemeModeEnum, string> = {
  [ThemeModeEnum.LIGHT]: "header.theme_light",
  [ThemeModeEnum.SYSTEM]: "header.theme_system",
  [ThemeModeEnum.DARK]: "header.theme_dark",
};

/**
 * Info: (20260802 - Luphia) 滑塊落點。寫成完整的 class 字串而非以索引算出，
 * 是因為 Tailwind 靠掃描原始碼決定要產生哪些 utility ——
 * `translate-x-${i * 7}` 這種寫法掃不到，產生的 CSS 裡不會有那條規則，
 * 滑塊會永遠停在最左邊而且沒有任何錯誤訊息。
 *
 * 位移量與段寬綁定：`size-6`（24px）對應 `translate-x-6`、`translate-x-12`，
 * 兩者要改就得一起改，否則滑塊會與圖示錯位。
 */
const THUMB_OFFSET_BY_MODE: Record<ThemeModeEnum, string> = {
  [ThemeModeEnum.LIGHT]: "translate-x-0",
  [ThemeModeEnum.SYSTEM]: "translate-x-6",
  [ThemeModeEnum.DARK]: "translate-x-12",
};

export default function ThemeToggle() {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();

  /**
   * Info: (20260801 - Luphia) 掛載前不標示任何選項為「目前選中」。
   * 目前主題來自 localStorage，伺服器讀不到 —— 若在 SSR 時猜一個值，
   * hydration 後與實際值不符會造成選中狀態閃動，使用者會看到滑塊跳格。
   * 三個圖示本身照常渲染，故不會有版面位移。
   */
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const activeMode = THEME_MODE_ORDER.find((mode) => mode === theme);

  return (
    <div
      role="radiogroup"
      aria-label={t("header.theme")}
      className="bg-surface-hover ring-border-default relative inline-flex shrink-0 items-center rounded-full p-0.5 ring-1"
    >
      {/**
       * Info: (20260802 - Luphia) 滑塊。`aria-hidden` 是必要的 ——
       * 選中狀態已由每個 radio 的 aria-checked 表達，讓讀屏軟體再讀到一個
       * 沒有語意的裝飾元素只會製造噪音。
       *
       * 切換主題當下不會有滑動動畫：ThemeProvider 設了 disableTransitionOnChange，
       * 它會在該幀對全站停用 transition。那個設定是為了避免整頁各元件
       * 以不同時長各自變色而呈現一片雜亂漸層，比一個滑塊的動畫重要。
       */}
      {mounted && activeMode !== undefined && (
        <span
          aria-hidden="true"
          className={`bg-surface-raised absolute top-0.5 left-0.5 size-6 rounded-full shadow-sm transition-transform duration-200 ${THUMB_OFFSET_BY_MODE[activeMode]}`}
        />
      )}

      {THEME_MODE_ORDER.map((mode) => {
        const Icon = ICON_BY_MODE[mode];
        const isActive = mounted && theme === mode;
        const label = t(LABEL_KEY_BY_MODE[mode]);
        return (
          <button
            key={mode}
            type="button"
            role="radio"
            aria-checked={isActive}
            title={label}
            onClick={() => setTheme(mode)}
            className="group focus-visible:ring-brand relative flex size-6 items-center justify-center rounded-full focus:outline-none focus-visible:ring-2"
          >
            <Icon
              size={14}
              className={
                isActive
                  ? "text-brand"
                  : "text-text-muted group-hover:text-text-secondary"
              }
              aria-hidden="true"
            />
            {/* Info: (20260802 - Luphia) 圖示不足以說明「跟隨系統」，文字保留給輔助技術 */}
            <span className="sr-only">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
