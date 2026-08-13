"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Info: (20260813 - Julian) 瀏覽器定位。
 *
 * ## 為什麼要把狀態分成五種
 *
 * 打卡頁必須在使用者按下按鈕**之前**就告訴他打不打得成（demo 計畫書 §8.1）——
 * 圍欄外一律拒絕，而每一次拒絕都是一次挫折。要做到那件事，
 * 「還在定位」「拿到座標了」「被拒絕授權」「這個瀏覽器不支援」
 * 必須是四種不同的畫面，因為它們的下一步完全不同：
 * 等一下、可以打卡、去設定裡改權限、換一台裝置。
 *
 * 把它們壓成一個 `loading` 布林值，使用者就只會看到轉圈圈然後什麼都沒發生。
 *
 * ## 這裡拿到的座標不參與任何判定
 *
 * 前端算距離只為了顯示。**真正的圍欄判定一律在伺服器**（護欄 G2）——
 * 瀏覽器回報的座標可以被竄改，那是 DevTools 的官方功能。
 */

export type GeolocationStatus =
  | "idle"
  | "locating"
  | "ready"
  | "denied"
  | "unavailable";

export interface IGeolocationReading {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
}

export interface IUseGeolocation {
  status: GeolocationStatus;
  reading: IGeolocationReading | null;
  refresh: () => void;
}

/**
 * Info: (20260813 - Julian) `enableHighAccuracy` 開啟：預設值會優先用
 * Wi-Fi／基地台的粗定位，那種精度動輒數百公尺，在 500 公尺的圍欄裡等於擲骰子。
 *
 * `timeout` 給 15 秒而不是預設的無限：室內收訊差時使用者會一直看著「定位中」，
 * 而看不到盡頭的等待比一個明確的失敗更糟 —— 至少失敗有下一步可走。
 */
const GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 15_000,
  maximumAge: 0,
};

export function useGeolocation(): IUseGeolocation {
  const [status, setStatus] = useState<GeolocationStatus>("idle");
  const [reading, setReading] = useState<IGeolocationReading | null>(null);

  const refresh = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("unavailable");
      return;
    }

    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setReading({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyMeters: Math.round(position.coords.accuracy),
        });
        setStatus("ready");
      },
      (error) => {
        /**
         * Info: (20260813 - Julian) 只有 PERMISSION_DENIED 是使用者可以自己解決的，
         * 因此與其他失敗分開 ——「請在網址列左側允許定位」與
         * 「這個環境取不到位置」要給的指引完全不同。
         *
         * 非 HTTPS 環境在多數瀏覽器會直接回 PERMISSION_DENIED 而不是別的錯誤，
         * 那是 demo 最容易踩的一個坑（執行手冊 §4.2）。
         */
        setStatus(
          error.code === error.PERMISSION_DENIED ? "denied" : "unavailable",
        );
        setReading(null);
      },
      GEOLOCATION_OPTIONS,
    );
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { status, reading, refresh };
}
