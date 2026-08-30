/**
 * Info: (20260827 - Luphia) 點數變動的跨分頁事件（issue #6714）。
 *
 * 為什麼需要跨分頁：暫停時畫面上的兩條出路（加購點數、升級方案）都是
 * `target="_blank"` 開新分頁（見 `chat/quota_exceeded_notice.tsx` 的註解——
 * 費思是常駐浮動視窗，原地跳頁會把整段對話清掉）。也就是說**付款一定發生在
 * 另一個分頁**，而付完錢的人回到原來那一頁時，那一頁對剛剛發生的事一無所知。
 *
 * 他剛剛就是為了「接著匯入」才付的錢。要他再回去按一次按鈕，是把系統
 * 已經知道的事情推回去讓使用者自己做。
 *
 * 只廣播**事實**（付款成功了、某個任務被放棄了），不廣播任何指令或金額：
 * 頻道是同源共享的，收到的內容應視為**輸入**而非指令（與
 * `THEME_SYNC_CHANNEL_NAME` 同一條規則）。要做什麼由收到的那一頁自己決定，
 * 而它會再向伺服器換一次執行許可（issue #6721）——廣播不是授權。
 */
export const CREDIT_EVENT_CHANNEL_NAME = "isunfa-credit-events";

export const CREDIT_EVENT = {
  /**
   * Info: (20260827 - Luphia) 一筆付款已經由**伺服器確認**完成。
   *
   * 只在伺服器回應成功之後才發：發在送出的那一刻等於廣播一個可能不成立的
   * 事實，而收到的那一頁會據此去花錢。
   */
  PAYMENT_SUCCEEDED: "PAYMENT_SUCCEEDED",
  /**
   * Info: (20260828 - Luphia) 使用者放棄了某個任務（review #6726 高-1）。
   *
   * 為什麼也要跨分頁：取消發生在分頁 A，而分頁 B 的那顆「接著匯入」是用
   * **客戶端狀態**判斷要不要顯示的——沒有這則廣播，它會一直留在那裡邀請
   * 使用者去花他剛剛才說不要花的點數。
   *
   * 這是**體驗**不是保證：真正擋住的是伺服器端的執行許可（已取消的任務拿不到
   * 許可）。BroadcastChannel 不可用時（SSR／舊瀏覽器／隱私設定，見本檔開頭）
   * 只有那道擋得住，所以兩件都要有。
   */
  JOB_CANCELLED: "JOB_CANCELLED",
} as const;

export type CreditEventType = (typeof CREDIT_EVENT)[keyof typeof CREDIT_EVENT];
