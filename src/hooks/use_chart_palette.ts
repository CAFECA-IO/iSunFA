"use client";

/**
 * Info: (20260802 - Luphia) 把圖表用色從 CSS 變數讀成實際色值。
 *
 * 為什麼不直接在 SVG 屬性寫 `var(--t-chart-series-1)`：
 * 匯出 SVG 時 `use_chart_export` 會把 <svg> **clone 出文件**再序列化，
 * 那份檔案脫離了 :root，`var()` 沒有東西可解析 ——
 * 畫面上看起來正常，下載到的卻是一張沒有顏色的圖，而且不會有任何錯誤。
 * 因此改為在繪製當下解析成實值，寫進屬性的就是 `#8ba5d4` 或 `oklch(...)`。
 *
 * 唯一的真相仍在 globals.css；此處只負責讀出來。
 */

import { useEffect, useState } from "react";
import {
  CHART_COLOR_VARIABLES,
  CHART_PALETTE_FALLBACK,
  ChartColorRole,
  IChartPalette,
} from "@/constants/chart_palette";
import { useTheme } from "@/hooks/use_theme";

/**
 * Info: (20260802 - Luphia) 從指定元素往上解析 CSS 變數。
 * 讀 `<html>` 而非 document.body，是為了讓「主題不變區」（紙張預覽）
 * 也能正確取值 —— 呼叫端傳入自己的節點時會沿著它的祖先解析。
 */
function readPalette(element: Element | null): IChartPalette {
  if (typeof window === "undefined") return CHART_PALETTE_FALLBACK;
  const target = element ?? document.documentElement;
  const computed = window.getComputedStyle(target);
  const entries = Object.entries(CHART_COLOR_VARIABLES).map(
    ([role, variable]) => {
      const value = computed.getPropertyValue(variable).trim();
      return [
        role,
        value || CHART_PALETTE_FALLBACK[role as ChartColorRole],
      ] as const;
    },
  );
  return Object.fromEntries(entries) as IChartPalette;
}

export function useChartPalette(element?: Element | null): IChartPalette {
  const { resolved } = useTheme();

  /**
   * Info: (20260802 - Luphia) 初始值一律是淺色 fallback，掛載後才讀真值。
   *
   * 伺服器不知道系統偏好（見 use_theme），先猜深色會讓「跟隨系統且系統為淺色」
   * 的使用者看到一次跳色；與伺服器一致的淺色則最多讓深色使用者的圖表
   * 在掛載完成前有一幀是淺色，而圖表通常在資料載入後才出現，實務上看不到。
   *
   * 用 effect 而非 useMemo：`resolved` 不會出現在計算式裡（顏色是從 CSS 讀的，
   * 不是從它算的），它的角色是「重讀的時機」。寫成 useMemo 的相依會被
   * exhaustive-deps 判定為多餘，而那個判斷在這裡是錯的 —— 主題一變，
   * 同一支 CSS 變數就換了一組值，非重讀不可。
   */
  const [palette, setPalette] = useState<IChartPalette>(CHART_PALETTE_FALLBACK);

  useEffect(() => {
    const next = readPalette(element ?? null);
    /**
     * Info: (20260802 - Luphia) 值沒變就不要換掉物件。
     * 掛載時淺色使用者讀到的與 fallback 完全相同，若照樣 setState，
     * 以 palette 為相依的消費端會白跑一次 —— Mermaid 那邊是重新解析並
     * 重繪整張 SVG，不是可以忽略的成本。
     */
    setPalette((current) =>
      (Object.keys(next) as ChartColorRole[]).every(
        (role) => current[role] === next[role],
      )
        ? current
        : next,
    );
  }, [resolved, element]);

  return palette;
}
