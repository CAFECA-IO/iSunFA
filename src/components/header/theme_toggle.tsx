"use client";

/**
 * Info: (20260802 - Luphia) 外觀切換：淺色 / 深色 二態開關。
 *
 * 沒有「跟隨系統」這個按鈕位置，但那一態仍然存在 —— 它就是「還沒按過」。
 * 新使用者沒有 cookie，畫面由 `prefers-color-scheme` 決定；
 * 一旦按下開關就寫入明確選擇，此後不再跟隨系統。
 *
 * 已知取捨：按過之後**沒有回到「跟隨系統」的路徑**（要清 cookie）。
 * 二態開關無法表達三種狀態，這是選擇二態必然的代價。
 */

import { Moon, Sun } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { ThemeModeEnum } from "@/constants/theme";
import { useTheme } from "@/hooks/use_theme";

export default function ThemeToggle() {
  const { t } = useTranslation();
  const { resolved, isFollowingSystem, toggle } = useTheme();

  const isDark = resolved === ThemeModeEnum.DARK;

  /**
   * Info: (20260802 - Luphia) 掛載完成前把手置中且不上色。
   *
   * 伺服器渲染時不知道系統偏好（那只有瀏覽器知道），若先猜一側，
   * hydration 後可能要跳到另一側，使用者會看到把手瞬移。
   * 停在中間是唯一不會猜錯的位置，且寬度不變、不造成版面位移。
   */
  const thumbPosition =
    resolved === undefined
      ? "translate-x-3"
      : isDark
        ? "translate-x-6"
        : "translate-x-0";

  const label = t(
    isDark ? "header.theme_switch_to_light" : "header.theme_switch_to_dark",
  );

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={label}
      title={
        isFollowingSystem ? `${label}（${t("header.theme_system")}）` : label
      }
      onClick={toggle}
      disabled={resolved === undefined}
      className="bg-surface-hover ring-border-default focus-visible:ring-brand relative inline-flex h-7 w-13 shrink-0 cursor-pointer items-center rounded-full px-0.5 ring-1 transition-colors focus:outline-none focus-visible:ring-2 disabled:cursor-default"
    >
      {/* Info: (20260802 - Luphia) 軌道兩端的圖示。把手滑過去時蓋住其中一個，
          正好形成「目前在這一側」的視覺，不需要另外標示選中狀態 */}
      <Sun
        size={12}
        aria-hidden="true"
        className="text-text-muted pointer-events-none absolute left-1.5"
      />
      <Moon
        size={12}
        aria-hidden="true"
        className="text-text-muted pointer-events-none absolute right-1.5"
      />

      <span
        aria-hidden="true"
        className={`bg-surface-raised relative flex size-6 items-center justify-center rounded-full shadow-sm transition-transform duration-200 ${thumbPosition}`}
      >
        {resolved !== undefined &&
          (isDark ? (
            <Moon size={12} className="text-brand" />
          ) : (
            <Sun size={12} className="text-brand" />
          ))}
      </span>
    </button>
  );
}
