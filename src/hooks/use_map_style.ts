"use client";

import { useEffect, useState } from "react";

/**
 * Info: (20260813 - Julian) MapTiler 底圖樣式，以及「這把金鑰到底能不能用」。
 *
 * ## 為什麼要先去問一次
 *
 * 只檢查「有沒有設定金鑰」不夠 —— **一把錯的、或被網域限制擋住的金鑰會通過那個檢查**，
 * 然後 maplibre 取不到 style，畫面上留下一塊淡色空白：圍欄圈與標記都畫得出來
 * （那些是我們自己的 GeoJSON 圖層），但底下沒有任何街道與路名。
 *
 * 那個畫面最糟的地方不是難看，是**它看起來像一張正常運作的地圖** ——
 * 使用者會以為系統認為這個地區長這樣，而不是「底圖沒載到」。
 * `onError` 不一定救得了：style 請求失敗的時機與形式因瀏覽器而異。
 *
 * 因此先用一次 `fetch` 問清楚。style.json 很小且會被快取，代價可以忽略。
 *
 * ## ⚠️ maplibre-gl 必須停在 v5，不可升到 v6
 *
 * `react-map-gl@8` 對 maplibre v6 需要**額外設定 worker**（v6 起 worker 不再自動綁進
 * bundle，官方文件：「MapLibre GL JS v6 applications that use a bundler must configure
 * the worker before rendering a map」）。沒設定的症狀非常難認：
 *
 * - 底圖只剩樣式的背景色（一片米白），沒有任何道路與路名
 * - **我們自己的 GeoJSON 圖層（圍欄圈、精度圈）也一起消失** —— 因為它們同樣由 worker 解析
 * - 但 `<Marker>` 照常顯示，因為那是 React 的 DOM 元素，只靠 `map.project()` 定位
 *
 * 於是畫面看起來像「一張載入中的地圖」，而其實是 worker 從來沒起來。
 * 2026-08-13 踩過一次，症狀就是上面三行。
 *
 * `package.json` 因此鎖 `maplibre-gl@^5.24.0`。要升 v6 的話，
 * 三個使用者（本模組的兩張地圖 + `src/components/map_viewer.tsx`）都要一起處理 worker。
 */

export const MAPTILER_STYLE = {
  /**
   * Info: (20260813 - Julian) 街道圖：有路名與 POI。
   * 打卡頁用這個 —— 使用者要在圖上認出自己站在哪條路上，
   * 而那正是「我到底在不在工區裡」這個問題的日常版本。
   */
  STREETS: "streets-v2",
  /**
   * Info: (20260813 - Julian) 資料視覺化底圖：淡色、極少標註。
   * 現場頁用這個 —— 它是四個工區圓圈的背景，標註太多會蓋掉主角。
   */
  DATAVIZ: "dataviz-light",
} as const;

export type MapTilerStyle =
  (typeof MAPTILER_STYLE)[keyof typeof MAPTILER_STYLE];

export interface IMapStyle {
  /** Info: (20260813 - Julian) 可用時才有值；為 null 代表呼叫端該顯示降級說明 */
  styleUrl: string | null;
  /** Info: (20260813 - Julian) 還在確認金鑰時為 true，避免先閃一下錯誤訊息再出現地圖 */
  checking: boolean;
  /** Info: (20260813 - Julian) 地圖執行期出錯時由呼叫端回報，之後一律降級 */
  reportError: () => void;
}

export function useMapStyle(style: MapTilerStyle): IMapStyle {
  const key = process.env.NEXT_PUBLIC_MAPTILER_KEY;
  const styleUrl = key
    ? `https://api.maptiler.com/maps/${style}/style.json?key=${key}`
    : null;

  const [usable, setUsable] = useState<boolean>(false);
  const [checking, setChecking] = useState<boolean>(Boolean(styleUrl));

  useEffect(() => {
    if (!styleUrl) {
      setChecking(false);
      return undefined;
    }

    let active = true;

    fetch(styleUrl)
      .then((response) => {
        if (!active) return;
        if (!response.ok) {
          // Info: (20260813 - Julian) 401/403 幾乎都是金鑰錯了或被網域限制擋住
          console.warn(
            `MapTiler style unavailable (${response.status}); falling back to the text-only view`,
          );
        }
        setUsable(response.ok);
        setChecking(false);
      })
      .catch((error: unknown) => {
        if (!active) return;
        // Info: (20260813 - Julian) 會場連不到 MapTiler 也走這裡
        console.warn("MapTiler style request failed:", error);
        setUsable(false);
        setChecking(false);
      });

    return () => {
      active = false;
    };
  }, [styleUrl]);

  return {
    styleUrl: usable ? styleUrl : null,
    checking,
    reportError: () => setUsable(false),
  };
}
