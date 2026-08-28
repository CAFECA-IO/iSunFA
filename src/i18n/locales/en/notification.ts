export const notification = {
  aria: "Notifications",
  /**
   * Info: (20260826 - Julian) 帶未讀數的版本 —— `aria-label` 會**蓋掉**按鈕內容，
   * 包括那顆徽章。固定字串等於讓讀屏使用者永遠聽不到有幾則。
   */
  aria_unread: "Notifications, {{count}} unread",
  // Info: (20260826 - Julian) 讀不到時說讀不到，不要退化成「目前沒有通知」
  load_failed: "Could not load notifications — please try again later",
  summary: "{{todos}} to-dos, {{completed}} completed-job notices",
  empty: "No notifications",
  todos_title: "To-dos",
  completed_title: "Completed",
  team_invitation: "{{inviterName}} invited you to join team {{teamName}}",
  wallet_upgrade:
    "The system requests a wallet upgrade so it can receive on-chain credentials such as your membership card",
  job_resumable:
    "Credits are back. Your import ({{completed}}/{{total}}) can continue — go to Smart GHG Inventory and tap Resume.",
  analysis_completed:
    "Your analysis job has finished — click to view the result",
  analysis_failed:
    "Your analysis job failed — please resubmit or contact support",
  // Info: (20260825 - Julian) 帶報告名稱的版本；取不到名稱時退回上面那句
  analysis_completed_named:
    "Your “{{title}}” analysis is ready — click to view the result",
  analysis_failed_named:
    "Your “{{title}}” analysis failed — please resubmit or contact support",
  unread: "Unread",
  /**
   * Info: (20260826 - Julian) 由 `has_more_completed` 改名而來。
   *
   * 舊鍵是「還有更多未讀通知」，而面板改成保留已讀之後，那個旗標的意思
   * 變成「歷史超過上限」——於是它會在一個未讀只有 2 則的畫面上宣稱
   * 還有更多未讀，與徽章互相矛盾。改鍵名而不是只改字串：舊鍵留著的話，
   * 沒改到的語系會靜默沿用假話，而改名會讓 `tsc` 直接指出漏掉的那一個。
   */
  history_capped: "Showing the latest {{count}} only",
  view_all: "View all notifications",
  page_title: "Notifications",
  history_title: "History",
  history_empty: "No completed or failed job notices yet",
  total_items: "{{count}} in total",
};
