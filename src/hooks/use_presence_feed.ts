"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, IEnvelopeLike, request } from "@/lib/utils/request";
import { IPresenceRoster, IPresenceSummary } from "@/interfaces/attendance";

/**
 * Info: (20260813 - Julian) 現場看板的資料來源：定時輪詢 A3，並在選定工區時一併取 A4。
 *
 * ## 為什麼不是每次都清空再載入
 *
 * 這是一面**看板**，它會被開著一整天。每 15 秒把畫面換成轉圈圈，
 * 等於這面板子有八分之一的時間是不能看的。因此只有第一次載入顯示載入中，
 * 之後的每一輪都在背景更新，畫面上的數字直接換掉。
 *
 * ## 分頁看不見時停止輪詢
 *
 * 沒有人在看的時候繼續每 15 秒打一次 API 沒有任何意義。但**切回來時要立刻更新**
 * ——回到這個分頁的人要看的是「現在」，不是十四秒前。
 *
 * ## 同一時間只有一輪在飛
 *
 * 網路慢的時候，固定間隔的輪詢會讓請求疊起來，而後回來的那一個未必是後送出的
 * ——畫面就會在新舊資料之間跳。用一個旗標擋掉重疊，慢的時候自然退化成
 * 「上一輪回來才發下一輪」。
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

  // Info: (20260813 - Julian) 用 ref 而不是 state：它不該觸發重繪，只是擋住重疊的那一輪
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
       * Info: (20260813 - Julian) 失敗時**保留畫面上的舊資料**，只在旁邊掛一則提示。
       *
       * 一次網路抖動就把整面看板清空，會讓人以為工地上真的沒有人 ——
       * 而「顯示過期的資料」與「顯示零人」相比，前者至少還標示了它過期。
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
