"use client";

import {
  ATTENDANCE_API,
  DEMO_ATTENDANCE_POLL_INTERVAL_MS,
} from "@/constants/attendance";
import { useCallback, useEffect, useRef, useState } from "react";
import { IEnvelopeLike, request } from "@/lib/utils/request";
import { ILeaveRecallView } from "@/interfaces/leave";

/**
 * Info: (20260814 - Julian) 我待回應的銷假徵詢（A13）。
 *
 * 需要輪詢：主管是在**另一台裝置**上發起的，員工這一頁不會知道。
 * 另外掛 `visibilitychange` —— 切回瀏覽器時立刻補一次，
 * 因為那正是「主管講完換我看手機」的那一刻。
 */

export interface IPendingRecallFeed {
  recalls: ILeaveRecallView[];
  refresh: () => void;
}

export function usePendingRecalls(): IPendingRecallFeed {
  const [recalls, setRecalls] = useState<ILeaveRecallView[]>([]);
  const inFlight = useRef<boolean>(false);

  const load = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;

    try {
      const response = await request<IEnvelopeLike<ILeaveRecallView[]>>(
        ATTENDANCE_API.LEAVE_RECALL_PENDING,
      );
      setRecalls(response.payload ?? []);
    } catch {
      /**
       * Info: (20260814 - Julian) 靜默失敗，不在打卡頁上顯示錯誤。
       * 這是附加資訊，取不到時最糟的結果是「沒看到徵詢」——
       * 而在打卡頁最上方掛一條紅字，會蓋掉這一頁真正要做的事。
       */
      setRecalls([]);
    } finally {
      inFlight.current = false;
    }
  }, []);

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

  return { recalls, refresh: load };
}
