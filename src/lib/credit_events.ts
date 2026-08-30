"use client";

import {
  CREDIT_EVENT,
  CREDIT_EVENT_CHANNEL_NAME,
  type CreditEventType,
} from "@/constants/credit_events";

/**
 * Info: (20260827 - Luphia) 點數變動事件的發佈與訂閱（issue #6714）。
 *
 * 抽成模組而不是在兩個付款流程裡各寫一次 `new BroadcastChannel`：
 * 頻道名稱、型別驗證、以及「瀏覽器沒有 BroadcastChannel 時要安靜降級」
 * 這三件事寫兩份就會分岔，而分岔的症狀是「其中一條付款路徑不會觸發接續」
 * ——那是一個沒有錯誤訊息、只有使用者抱怨的缺陷。
 */

export interface ICreditEvent {
  type: CreditEventType;
  /**
   * Info: (20260828 - Luphia) 事件牽涉的資源（碳盤查是聊天室 channel）。
   *
   * `JOB_CANCELLED` 一定要帶：沒有它的話，A 聊天室的取消會把 B 聊天室的
   * 暫停清單一起清掉——那是另一種「使用者沒有要求的事被做了」。
   * `PAYMENT_SUCCEEDED` 不帶（付款不屬於任何一個聊天室）。
   */
  resourceKey?: string;
}

const CREDIT_EVENT_TYPES: readonly string[] = Object.values(CREDIT_EVENT);

/**
 * Info: (20260827 - Luphia) 收到的內容一律當外部輸入驗證。
 *
 * 頻道是同源共享的，任何同源的頁面都寫得進來。認不出的內容直接忽略，
 * 而不是讓 `undefined` 流進判斷式——那一端接著要做的事是**花錢**。
 */
function toCreditEvent(value: unknown): ICreditEvent | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.type !== "string") return null;
  if (!CREDIT_EVENT_TYPES.includes(candidate.type)) return null;
  /**
   * Info: (20260828 - Luphia) `resourceKey` 缺席是合法的（付款事件不帶），
   * 但**出現時必須是字串**——認不出的形狀一律丟掉，理由同上：那一端接著要花錢。
   */
  if (candidate.resourceKey !== undefined) {
    if (typeof candidate.resourceKey !== "string") return null;
    return {
      type: candidate.type as CreditEventType,
      resourceKey: candidate.resourceKey,
    };
  }
  return { type: candidate.type as CreditEventType };
}

/**
 * Info: (20260827 - Luphia) 發佈。沒有 BroadcastChannel（SSR、舊瀏覽器、
 * 或被隱私設定關掉）時安靜地什麼都不做：這是一條**便利路徑**，
 * 掃描行程（≤5 分鐘）與手動按鈕都還在，不該因為它不可用而讓付款流程報錯。
 */
export function publishCreditEvent(event: ICreditEvent): void {
  if (typeof BroadcastChannel === "undefined") return;
  try {
    const channel = new BroadcastChannel(CREDIT_EVENT_CHANNEL_NAME);
    channel.postMessage(event);
    channel.close();
  } catch (error) {
    console.warn("[credit-events] publish failed:", error);
  }
}

/**
 * Info: (20260827 - Luphia) 訂閱，回傳解除訂閱的函式。
 *
 * 每個訂閱者各自開一個 channel 物件是刻意的：BroadcastChannel **不會**把訊息
 * 送回發佈的那個物件，但會送到同一頁其他的物件。共用一個物件的話，
 * 同一個分頁內付款（例如個人點數的簽章付款）就收不到自己的事件。
 */
export function subscribeCreditEvents(
  handler: (event: ICreditEvent) => void,
): () => void {
  if (typeof BroadcastChannel === "undefined") return () => {};
  let channel: BroadcastChannel;
  try {
    channel = new BroadcastChannel(CREDIT_EVENT_CHANNEL_NAME);
  } catch (error) {
    console.warn("[credit-events] subscribe failed:", error);
    return () => {};
  }
  channel.onmessage = (message: MessageEvent<unknown>) => {
    const event = toCreditEvent(message.data);
    if (!event) return;
    handler(event);
  };
  return () => {
    channel.onmessage = null;
    channel.close();
  };
}
