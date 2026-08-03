"use client";

// Info: (20260802 - Luphia) 遮罩期間鎖定頁面捲動。
//
// Info: (20260802 - Luphia) 為什麼需要:`fixed inset-0` 只覆蓋**視口**而非整份文件。
// Info: (20260802 - Luphia) 遮罩開啟時頁面仍可捲動,捲下去就會看到遮罩之外的內容;
// Info: (20260802 - Luphia) 整頁截圖也只會擷到一個視口的遮罩,下方全部外露 ——
// Info: (20260802 - Luphia) 這兩種現象都被回報為「遮罩太短」,而根因是同一個。
//
// Info: (20260802 - Luphia) 鎖定捲動同時解決兩者:文件高度被夾到視口,
// Info: (20260802 - Luphia) 既沒有可捲出的內容,整頁截圖也就等於一個視口。

import { useEffect } from "react";

/**
 * Info: (20260802 - Luphia) 於 locked 為 true 期間鎖定捲動,解除時完整還原原值。
 *
 * 於 documentElement 與 body 同時設定:哪一個是實際的捲動容器取決於瀏覽器與樣式,
 * 只設一個在部分情況下無效。
 *
 * 同時補償捲軸消失造成的版面位移 —— 直接設 overflow:hidden 會讓內容向右跳一個
 * 捲軸寬度,那個跳動比遮罩本身還顯眼。以等寬 padding 補回。
 *
 * 還原時寫回**進入前的字面值**而非清空:該元素可能本來就有 inline style,
 * 清空會把別人的設定一併抹掉。
 */
export function useScrollLock(locked: boolean): void {
  useEffect(() => {
    if (!locked) return undefined;

    const { documentElement, body } = document;
    const scrollbarWidth = window.innerWidth - documentElement.clientWidth;
    const previous = {
      htmlOverflow: documentElement.style.overflow,
      bodyOverflow: body.style.overflow,
      bodyPaddingRight: body.style.paddingRight,
    };

    documentElement.style.overflow = "hidden";
    body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      documentElement.style.overflow = previous.htmlOverflow;
      body.style.overflow = previous.bodyOverflow;
      body.style.paddingRight = previous.bodyPaddingRight;
    };
  }, [locked]);
}
