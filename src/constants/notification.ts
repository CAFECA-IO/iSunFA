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

// Info: (20260821 - Luphia) 清單一次最多帶回幾則（事件型；待辦型天然有限）
export const NOTIFICATION_LIST_LIMIT = 20;

/**
 * Info: (20260821 - Luphia) dedupe key 的前綴（與訂單 idempotencyKey 同形狀）：
 * worker 重試、腳本重跑都不會發出第二則同一件事的通知。
 */
export const NOTIFICATION_DEDUPE_PREFIX = {
  ANALYSIS_COMPLETED: "analysis-completed:",
  WALLET_UPGRADE: "wallet-upgrade:",
} as const;
