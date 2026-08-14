"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Info: (20260813 - Julian) 瀏覽器定位。
 *
 * 狀態刻意分成五種（idle/locating/ready/denied/unavailable），
 * 各自對應不同的下一步：等待、可打卡、去設定改權限、換裝置。
 * 這裡算出的座標僅供顯示，真正的圍欄判定一律在伺服器（護欄 G2）。
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
 * Info: (20260813 - Julian) `enableHighAccuracy` 避免退化成 Wi-Fi/基地台的粗定位；
 * `timeout` 15 秒讓室內收訊差時仍有明確的失敗，而不是無限等待。
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
         * Info: (20260813 - Julian) 只有 PERMISSION_DENIED 是使用者可自行排解的情況，
         * 其餘一律視為 unavailable。
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
