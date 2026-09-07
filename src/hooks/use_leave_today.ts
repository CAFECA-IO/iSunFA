"use client";

import {
  ATTENDANCE_API,
  DEMO_ATTENDANCE_POLL_INTERVAL_MS,
} from "@/constants/attendance";
import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, IEnvelopeLike, request } from "@/lib/utils/request";
import { ILeaveTodayView } from "@/interfaces/leave";

/**
 * Info: (20260814 - Julian) 今日請假名單（A11）：與現場看板同一個 15 秒節奏輪詢。
 *
 * 必須跟著輪詢，因為銷假被同意的那一刻該員會從這份名單消失、轉到未到工 ——
 * 兩張清單不同步的話，畫面上會同時「在請假」與「排了班沒到」。
 */

export interface ILeaveTodayFeed {
  view: ILeaveTodayView | null;
  error: string | null;
  refresh: () => void;
}

export function useLeaveToday(params: {
  fallbackError: string;
}): ILeaveTodayFeed {
  const { fallbackError } = params;

  const [view, setView] = useState<ILeaveTodayView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef<boolean>(false);

  const load = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;

    try {
      const response = await request<IEnvelopeLike<ILeaveTodayView>>(
        ATTENDANCE_API.LEAVE,
      );
      setView(response.payload);
      setError(null);
    } catch (caught) {
      // Info: (20260814 - Julian) 失敗時保留舊名單，只加提示；清空會讓人以為今天沒有人請假
      setError(
        caught instanceof ApiError && caught.message
          ? caught.message
          : fallbackError,
      );
    } finally {
      inFlight.current = false;
    }
  }, [fallbackError]);

  useEffect(() => {
    load();

    const timer = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      load();
    }, DEMO_ATTENDANCE_POLL_INTERVAL_MS);

    const onVisible = () => {
      if (!document.hidden) load();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  return { view, error, refresh: load };
}
