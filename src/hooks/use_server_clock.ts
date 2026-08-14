"use client";

import { useEffect, useRef, useState } from "react";
import { DEMO_TIME_ZONE } from "@/constants/attendance";

/**
 * Info: (20260813 - Julian) 與伺服器對時的秒錶。
 *
 * ## 為什麼不能直接用 `new Date()`
 *
 * 打卡頁上的時間要回答的是「我現在按下去，會被記成幾點幾分幾秒」——
 * 而那個時刻由**伺服器**決定（護欄 G1：`punchedAt` 一律由伺服器產生，
 * 請求裡沒有時間欄位）。瀏覽器時鐘可能差好幾分鐘，也可能被使用者調過。
 *
 * 印一個本機時間，等於在畫面上寫一個系統並不採信的數字 ——
 * 而使用者會拿它去對出勤紀錄，然後發現對不上。
 *
 * ## 做法
 *
 * 以伺服器回傳的 `serverNowIso` 算出時鐘差，之後在本地每秒遞增。
 * 誤差只剩下網路來回的一半（區網或隧道上是數十毫秒），在秒的精度下可以忽略。
 * A1（打卡）與 A2（今日狀態）都回傳這個欄位，因此**每打一次卡就重新校時一次**，
 * 長時間停留造成的漂移不會累積。
 *
 * ## 為什麼固定用 `DEMO_TIME_ZONE` 格式化
 *
 * 出勤紀錄的「幾點」是以帳本時區認定的（`minutesFromWorkDateStart`）。
 * 若照裝置時區顯示，一支設定在別的時區的手機會看到一個與紀錄差好幾小時的時間 ——
 * 而它看起來完全正常，因為兩邊都「沒有錯」。
 */

const formatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: DEMO_TIME_ZONE,
  hourCycle: "h23",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

export interface IServerClock {
  /** Info: (20260813 - Julian) `HH:MM:SS`；還沒對到時之前為 null，呼叫端據此不顯示 */
  label: string | null;
}

export function useServerClock(serverNowIso: string | null): IServerClock {
  // Info: (20260813 - Julian) 伺服器時刻減本機時刻。放 ref：它一改變就要立刻生效，但不必觸發 render
  const offsetRef = useRef<number | null>(null);
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!serverNowIso) return;
    const serverNow = new Date(serverNowIso).getTime();
    if (Number.isNaN(serverNow)) return;
    offsetRef.current = serverNow - Date.now();
  }, [serverNowIso]);

  useEffect(() => {
    const tick = () => {
      if (offsetRef.current === null) return;
      setLabel(formatter.format(new Date(Date.now() + offsetRef.current)));
    };

    tick();
    /**
     * Info: (20260813 - Julian) 每 250ms 更新而不是每秒。
     *
     * 每秒觸發的話，跳秒的時機取決於元件掛載的那一刻，畫面上的秒數
     * 平均會慢半秒 —— 而這個數字存在的意義正是「與紀錄一致」。
     */
    const timer = window.setInterval(tick, 250);
    return () => window.clearInterval(timer);
  }, [serverNowIso]);

  return { label };
}
