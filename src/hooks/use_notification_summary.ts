"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { request } from "@/lib/utils/request";
import { NOTIFICATION_POLL_INTERVAL_MS } from "@/constants/notification";
import {
  ChimeGate,
  arrivalKeyOf,
  hasNewArrival,
  playChime,
  registerAudioUnlock,
  resumeAudio,
} from "@/lib/notification_sound";

/**
 * Info: (20260825 - Julian) 小鈴鐺的摘要輪詢（計畫書 D6 / D7 / D8）。
 *
 * 從元件裡抽出來的三個理由，依重要性排序：
 *
 * 1. **原本沒有 `document.hidden` 停止**：分頁丟在背景一整天照樣每分鐘打一次。
 * 2. **原本沒有 `inFlight` 擋重疊**：慢請求會疊，而那正好發生在 DB 打滿的時候。
 * 3. **原本沒有跨分頁協調**：三個分頁各響一次，聽起來像故障。
 *
 * 形狀比照 `src/hooks/use_presence_feed.ts`（**不是** `use_pending_recalls.ts` ——
 * 那支失敗時 `setRecalls([])`，會讓網路抖一下就把畫面清空）。
 */

export interface INotificationSummary {
  todoCount: number;
  completedCount: number;
}

export interface INotificationSummaryFeed {
  summary: INotificationSummary | null;
  /**
   * Info: (20260825 - Julian) 每偵測到一次「新通知抵達」就 +1。
   *
   * 刻意不是 boolean：boolean 要呼叫端自己「用完清掉」，而漏清的症狀是
   * 動畫只播一次就再也不播。單調遞增的計數讓呼叫端
   * `useEffect(..., [arrivalTick])` 就會在每一次抵達重新觸發。
   */
  arrivalTick: number;
  refresh: () => Promise<void>;
  /** Info: (20260825 - Julian) 標記已讀後把比較基準降回只剩待辦，避免下一則漏搖 */
  resetBaseline: (nextTotal: number) => void;
  setSummary: (
    updater: (
      previous: INotificationSummary | null,
    ) => INotificationSummary | null,
  ) => void;
}

const SUMMARY_ENDPOINT = "/api/v1/user/notifications/summary";
const CHIME_CHANNEL = "isunfa_notification_chime";

export function useNotificationSummary(
  enabled: boolean,
): INotificationSummaryFeed {
  const [summary, setSummary] = useState<INotificationSummary | null>(null);
  const [arrivalTick, setArrivalTick] = useState(0);

  /**
   * Info: (20260825 - Julian) 用 ref 不用 state：它們只給輪詢比較用，
   * 變動不需要重繪。`lastTotalRef` 為 null 代表還沒有基準（首抓不觸發）。
   */
  const lastTotalRef = useRef<number | null>(null);
  const inFlightRef = useRef<boolean>(false);
  const gateRef = useRef<ChimeGate | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);

  if (gateRef.current === null) gateRef.current = new ChimeGate();

  const fetchSummary =
    useCallback(async (): Promise<INotificationSummary | null> => {
      try {
        const response = await request<{
          payload: INotificationSummary | null;
        }>(SUMMARY_ENDPOINT);
        return response.payload ?? null;
      } catch {
        // Info: (20260821 - Luphia) 輪詢失敗就等下一輪：鈴鐺不值得任何錯誤畫面
        return null;
      }
    }, []);

  /**
   * Info: (20260825 - Julian) 抓一次並決定要不要出聲／搖動。
   *
   * `inFlight` 是 ref 而不是 state：它只擋重疊，觸發重繪反而會讓
   * 每一輪輪詢都多渲染兩次。
   */
  const poll = useCallback(async (): Promise<void> => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      const next = await fetchSummary();
      if (!next) return;
      setSummary(next);

      const total = next.todoCount + next.completedCount;
      const last = lastTotalRef.current;
      lastTotalRef.current = total;
      if (!hasNewArrival(last, total)) return;

      // Info: (20260825 - Julian) 動畫一律觸發；出聲要先過節流與跨分頁的閘
      setArrivalTick((tick) => tick + 1);

      const key = arrivalKeyOf(next.todoCount, next.completedCount);
      if (gateRef.current?.claim(key)) {
        // Info: (20260825 - Julian) 先廣播再播：讓其他分頁盡快知道這一聲有人負責了
        channelRef.current?.postMessage(key);
        playChime();
      }
    } finally {
      inFlightRef.current = false;
    }
  }, [fetchSummary]);

  // Info: (20260825 - Julian) 跨分頁通道：只傳 arrivalKey，沒有任何使用者資料
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return undefined;
    if (typeof BroadcastChannel === "undefined") {
      /**
       * Info: (20260825 - Julian) 不支援就降級成「照樣播」。
       * 多響幾聲比不響好 —— 這個功能的失敗方向要往「吵一點」倒，
       * 不是往「靜音」倒。
       */
      return undefined;
    }
    const channel = new BroadcastChannel(CHIME_CHANNEL);
    channel.onmessage = (event: MessageEvent<string>) => {
      gateRef.current?.observePeer(event.data);
    };
    channelRef.current = channel;
    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, [enabled]);

  // Info: (20260825 - Julian) 首次手勢解鎖 AudioContext（見 registerAudioUnlock）
  useEffect(() => {
    if (!enabled) return undefined;
    return registerAudioUnlock();
  }, [enabled]);

  // Info: (20260825 - Julian) 首抓：建立基準，但不搖不響
  useEffect(() => {
    if (!enabled) return undefined;
    let active = true;
    fetchSummary().then((first) => {
      if (!active || !first) return;
      setSummary(first);
      lastTotalRef.current = first.todoCount + first.completedCount;
    });
    return () => {
      active = false;
    };
  }, [enabled, fetchSummary]);

  /**
   * Info: (20260825 - Julian) 輪詢：背景分頁停、切回前景補一次。
   *
   * 背景不停的話，一個丟著不管的分頁每天會打 1440 次；
   * 而 `visibilitychange` 補那一次是為了讓使用者切回來時看到的是新的，
   * 不是最多一分鐘前的。回前景時順便叫醒 AudioContext（進背景會被 suspend）。
   */
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return undefined;

    const timer = window.setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      poll();
    }, NOTIFICATION_POLL_INTERVAL_MS);

    const onVisible = () => {
      if (document.hidden) return;
      resumeAudio();
      poll();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled, poll]);

  const resetBaseline = useCallback((nextTotal: number) => {
    lastTotalRef.current = nextTotal;
  }, []);

  return {
    summary,
    arrivalTick,
    refresh: poll,
    resetBaseline,
    setSummary,
  };
}
