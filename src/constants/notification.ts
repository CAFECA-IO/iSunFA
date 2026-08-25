/**
 * Info: (20260821 - Luphia) 小鈴鐺通知的常數（ADR 021 補充）。
 *
 * 通知分兩類，**來源刻意不同**：
 *
 * - 待辦型（TODO）：待接受的團隊邀請、系統要求升級錢包。前者是活的狀態，
 *   讀取時向邀請表現算（不存副本——邀請被接受／撤回時通知必須同步消失）；
 *   後者是系統發出的紀錄（存 DB，錢包升級完成後標記已讀）。
 * - 事件型（DONE）：憑證掃描等工作完成。發生時寫入 DB，讀過即已讀。
 */

export const NOTIFICATION_TYPE = {
  // Info: (20260821 - Luphia) 待辦：有一封等你接受的團隊邀請（derived，不入庫）
  TEAM_INVITATION: "TEAM_INVITATION",
  // Info: (20260821 - Luphia) 待辦：系統要求升級錢包（ADR 021 rollout 第 5 步）
  WALLET_UPGRADE: "WALLET_UPGRADE",
  // Info: (20260821 - Luphia) 完成：一份分析／憑證掃描工作跑完了
  ANALYSIS_COMPLETED: "ANALYSIS_COMPLETED",
  /**
   * Info: (20260825 - Julian) 完成：一份分析**失敗**了（計畫書 D16）。
   *
   * 只通知成功等於只在不需要通知的時候通知：使用者付了錢、送出分析、
   * 等了十分鐘，任務失敗 —— 鈴鐺什麼都沒有，頁面上也沒有主動訊息，
   * 他只能自己回去看訂單。而「完成時會通知」的價值有一半在於
   * 他不必回去看。
   *
   * 歸在事件型而不是待辦型：它沒有「處理完」這個狀態，看過就過去了。
   */
  ANALYSIS_FAILED: "ANALYSIS_FAILED",
} as const;

export type NotificationType =
  (typeof NOTIFICATION_TYPE)[keyof typeof NOTIFICATION_TYPE];

/**
 * Info: (20260821 - Luphia) 待辦型 vs 事件型的分組（摘要那句話的兩個數字）。
 * 收斂在常數層：service 的計數與前端的分節都讀這一份，不各自維護清單。
 */
export const TODO_NOTIFICATION_TYPES: readonly NotificationType[] = [
  NOTIFICATION_TYPE.TEAM_INVITATION,
  NOTIFICATION_TYPE.WALLET_UPGRADE,
] as const;

/**
 * Info: (20260821 - Luphia) 小鈴鐺的輪詢間隔。
 *
 * 60 秒：通知的來源（邀請、worker 完成的分析）本身都是分鐘級的事件，
 * 更密只是把同一個答案多問幾次。搖動與音效只在**計數增加**時觸發，
 * 所以輪詢頻率不影響打擾頻率。
 */
export const NOTIFICATION_POLL_INTERVAL_MS = 60_000;

// Info: (20260821 - Luphia) 登入摘要氣泡的自動收合時間
export const NOTIFICATION_SUMMARY_TOAST_MS = 8_000;

/**
 * Info: (20260821 - Luphia) 清單一次最多帶回幾則（事件型）。
 *
 * Info: (20260825 - Julian) 這個上限**只套用在事件型**，而那是靠
 * `listUnreadExcludingTypes` 的型別條件做到的，不是靠這行註解。
 *
 * 原本兩種型別共用一支不帶型別條件的查詢，於是「事件型」三個字只是願望：
 * 一則舊的待辦排在 25 則新分析後面就被 `take` 切掉，
 * 而摘要的計數沒有截斷、照樣算它（計畫書 D4）。
 */
export const NOTIFICATION_LIST_LIMIT = 20;

/**
 * Info: (20260825 - Julian) 待辦型的上限。
 *
 * 待辦型天然有限（一人最多一則錢包升級），但仍然給一個上限：
 * 「天然有限」是今天的事實，不是資料庫層的約束，而下一個待辦型別
 * 未必有同樣的性質。
 */
export const NOTIFICATION_TODO_LIST_LIMIT = 20;

/**
 * Info: (20260821 - Luphia) dedupe key 的前綴（與訂單 idempotencyKey 同形狀）：
 * worker 重試、腳本重跑都不會發出第二則同一件事的通知。
 */
export const NOTIFICATION_DEDUPE_PREFIX = {
  ANALYSIS_COMPLETED: "analysis-completed:",
  /**
   * Info: (20260825 - Julian) 失敗以 **orderId** 為鍵，不是 analysisId。
   *
   * 失敗的路徑上 `analysis` 可能根本沒有（結果解析不出來、payload 缺漏），
   * 而 order 一定在。一張訂單失敗一次，發一則。
   */
  ANALYSIS_FAILED: "analysis-failed:",
  WALLET_UPGRADE: "wallet-upgrade:",
} as const;

/**
 * Info: (20260825 - Julian) 每一種通知的圖示色與去處，**收斂在常數層**。
 *
 * 原本這兩件事寫在 `notification_bell.tsx` 的一串 `if` 裡，而顏色用的是
 * `text-orange-500` / `text-blue-500` / `text-green-600` 原始色 ——
 * header 的其他子元件一律用語意 token，深色模式下那三個顏色不會跟著換。
 *
 * 比照 `MOVEMENT_ALERT_STYLE` 的做法：**元件不做決定**，
 * 顏色與去處都是查表查出來的。第二個消費者（手機版側欄）出現時
 * 不必把那串 `if` 抄第二份。
 */
export const NOTIFICATION_TYPE_STYLE: Record<
  NotificationType,
  { icon: "mail" | "wallet" | "check" | "alert"; className: string }
> = {
  /**
   * Info: (20260825 - Julian) 只用 `@theme` 真的定義過的 token。
   *
   * 可用的語意色只有 `brand` / `brand-soft` / `brand-on-soft` /
   * `danger` / `danger-soft` 與 text / surface / border 三組 ——
   * **沒有 `success`**。寫 `text-success` 會產出一個無效 class，
   * 而 `tsc` 與 `lint` 都不會抱怨（那正是 D3 的成因）。
   *
   * 因此「完成」不用綠色，改由 icon 區分。這符合
   * `movement_alert_badge.tsx` 的既有規則：顏色 + 文字 + icon 三者並用，
   * **不靠顏色單獨傳達**。真的需要一個 success 色時，那是往
   * `globals.css` 的 `@theme` 加 token 的決定，不該由這個模組順手發明。
   */
  [NOTIFICATION_TYPE.TEAM_INVITATION]: {
    icon: "mail",
    className: "text-brand",
  },
  [NOTIFICATION_TYPE.WALLET_UPGRADE]: {
    icon: "wallet",
    className: "text-brand",
  },
  [NOTIFICATION_TYPE.ANALYSIS_COMPLETED]: {
    icon: "check",
    className: "text-brand",
  },
  [NOTIFICATION_TYPE.ANALYSIS_FAILED]: {
    icon: "alert",
    className: "text-danger",
  },
};

/**
 * Info: (20260825 - Julian) 每一種通知點下去要去哪裡（站內相對路徑）。
 *
 * `null` = 這一種沒有去處，畫面就不要把它做成可點的東西 ——
 * 一個按了沒反應的待辦比沒有連結更糟（service 自己的註解說過同一件事）。
 * `WALLET_UPGRADE` 目前是 null：**全站沒有任何升級錢包的頁面**
 * （`grep upgrade src/app` 零命中），有了之後把它填進來。
 *
 * 分析類指向 `?tab=history`：`analysis_view.tsx` 讀 `searchParams.get("tab")`
 * 初始化分頁，所以這個參數今天就有效，使用者會直接落在歷史報告清單。
 * 逐筆的 `?analysisId=` 要動 `HistorySection`，留待後續。
 */
export const NOTIFICATION_LINK_PATH: Record<NotificationType, string | null> = {
  [NOTIFICATION_TYPE.TEAM_INVITATION]: "/user/team",
  [NOTIFICATION_TYPE.WALLET_UPGRADE]: null,
  [NOTIFICATION_TYPE.ANALYSIS_COMPLETED]: "/analysis?tab=history",
  [NOTIFICATION_TYPE.ANALYSIS_FAILED]: "/analysis?tab=history",
};
