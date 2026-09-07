"use client";

import { useEffect, useState } from "react";

/**
 * Info: (20260813 - Julian) MapTiler 底圖樣式，並先確認金鑰是否可用。
 *
 * 金鑰錯誤或被網域限制擋住時 style 請求仍可能通過檢查，只是底圖留白，
 * 而我們自己的 GeoJSON 圖層照常畫出來，看起來像地圖正常運作。
 * 因此先用一次 `fetch` 問清楚（style.json 很小，代價可忽略），而非只驗有沒有設金鑰。
 *
 * ⚠️ maplibre-gl 必須停在 v5，不可升到 v6：`react-map-gl@8` 對 v6 需要額外設定 worker，
 * 沒設定時底圖只剩背景色，連我們自己的 GeoJSON 圖層也一起消失，
 * 但 `<Marker>` 因為是 DOM 元素照常顯示 —— 症狀極難認。`package.json` 因此鎖 `maplibre-gl@^5.24.0`。
 */

export const MAPTILER_STYLE = {
  /** Info: (20260813 - Julian) 街道圖：有路名與 POI，打卡頁用這個以便認路。 */
  STREETS: "streets-v2",
  /** Info: (20260813 - Julian) 資料視覺化底圖：淡色、極少標註，現場頁用這個當背景。 */
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
