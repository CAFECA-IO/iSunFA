"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, IEnvelopeLike, request } from "@/lib/utils/request";
import { IPresenceRoster, IPresenceSummary } from "@/interfaces/attendance";

/**
 * Info: (20260813 - Julian) 現場看板：定時輪詢 A3，並在選定工區時一併取 A4。
 *
 * 只有第一次載入顯示 loading，之後每輪都在背景更新，避免看板整天閃轉圈圈。
 * 分頁隱藏時停止輪詢，切回來立刻補一次；用旗標擋掉重疊請求，避免慢速網路下新舊資料互相搶著出現。
 */

const POLL_INTERVAL_MS = 15_000;

export interface IPresenceFeed {
  summary: IPresenceSummary | null;
  roster: IPresenceRoster | null;
  isInitialLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export function usePresenceFeed(params: {
  apiBase: string;
  selectedLocationId: string | null;
  fallbackError: string;
}): IPresenceFeed {
  const { apiBase, selectedLocationId, fallbackError } = params;

  const [summary, setSummary] = useState<IPresenceSummary | null>(null);
  const [roster, setRoster] = useState<IPresenceRoster | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Info: (20260813 - Julian) 用 ref 而非 state：只是擋重疊，不該觸發重繪
  const inFlight = useRef<boolean>(false);

  const load = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;

    try {
      const [summaryResponse, rosterResponse] = await Promise.all([
        request<IEnvelopeLike<IPresenceSummary>>(`${apiBase}/presence`),
        selectedLocationId
          ? request<IEnvelopeLike<IPresenceRoster>>(
              `${apiBase}/presence/location/${selectedLocationId}`,
            )
          : Promise.resolve(null),
      ]);

      setSummary(summaryResponse.payload);
      setRoster(rosterResponse?.payload ?? null);
      setError(null);
    } catch (caught) {
      /**
       * Info: (20260813 - Julian) 失敗時保留畫面上的舊資料，只加掛提示 ——
       * 清空整面看板會讓人誤以為工地上真的沒有人。
       */
      setError(
        caught instanceof ApiError && caught.message
          ? caught.message
          : fallbackError,
      );
    } finally {
      inFlight.current = false;
      setIsInitialLoading(false);
    }
  }, [apiBase, selectedLocationId, fallbackError]);

  useEffect(() => {
    load();

    const timer = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      load();
    }, POLL_INTERVAL_MS);

    const onVisible = () => {
      if (!document.hidden) load();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  return { summary, roster, isInitialLoading, error, refresh: load };
}
