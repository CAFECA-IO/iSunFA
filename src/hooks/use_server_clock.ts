"use client";

import { useEffect, useRef, useState } from "react";
import { DEMO_TIME_ZONE } from "@/constants/attendance";

/**
 * Info: (20260813 - Julian) 與伺服器對時的秒錶。
 *
 * 不可直接用 `new Date()`：`punchedAt` 一律由伺服器決定（護欄 G1），
 * 本機時鐘可能不準。以 `serverNowIso` 算出時鐘差，之後每秒在本地遞增；
 * 每次打卡都用新的 `serverNowIso` 重新校時，避免長時間漂移。
 * 固定用 `DEMO_TIME_ZONE` 格式化，因為出勤紀錄以帳本時區認定，跟裝置時區可能對不上。
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
  // Info: (20260813 - Julian) 伺服器時刻減本機時刻；放 ref 是因為改變要立即生效但不必觸發 render
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
     * Info: (20260813 - Julian) 每 250ms 更新而非每秒，避免跳秒時機依附在掛載時刻，
     * 導致畫面秒數平均慢半秒。
     */
    const timer = window.setInterval(tick, 250);
    return () => window.clearInterval(timer);
  }, [serverNowIso]);

  return { label };
}
