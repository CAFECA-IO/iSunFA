export const notification = {
  aria: "通知",
  /**
   * Info: (20260826 - Julian) 帶未讀數的版本 —— `aria-label` 會**蓋掉**按鈕內容，
   * 包括那顆徽章。固定字串等於讓讀屏使用者永遠聽不到有幾則。
   */
  aria_unread: "通知，{{count}} 則未讀",
  // Info: (20260826 - Julian) 讀不到時說讀不到，不要退化成「目前沒有通知」
  load_failed: "通知讀取失敗，請稍後再試",
  summary: "{{todos}} 則待辦事項、{{completed}} 個工作完成通知",
  empty: "目前沒有通知",
  todos_title: "待辦事項",
  completed_title: "工作完成",
  team_invitation: "「{{inviterName}}」邀請你加入團隊「{{teamName}}」",
  wallet_upgrade: "系統要求升級你的錢包，以支援收取會員卡等鏈上憑證",
  analysis_completed: "你的分析工作已完成，點擊查看結果",
  analysis_failed: "你的分析工作失敗了，請重新送出或聯繫客服",
  // Info: (20260825 - Julian) 帶報告名稱的版本；取不到名稱時退回上面那句
  analysis_completed_named: "「{{title}}」分析已完成，點擊查看結果",
  analysis_failed_named: "「{{title}}」分析失敗了，請重新送出或聯繫客服",
  unread: "未讀",
  /**
   * Info: (20260826 - Julian) 由 `has_more_completed` 改名而來。
   *
   * 舊鍵是「還有更多未讀通知」，而面板改成保留已讀之後，那個旗標的意思
   * 變成「歷史超過上限」——於是它會在一個未讀只有 2 則的畫面上宣稱
   * 還有更多未讀，與徽章互相矛盾。改鍵名而不是只改字串：舊鍵留著的話，
   * 沒改到的語系會靜默沿用假話，而改名會讓 `tsc` 直接指出漏掉的那一個。
   */
  history_capped: "僅顯示最近 {{count}} 則",
  view_all: "查看全部通知",
  page_title: "通知",
  history_title: "歷史通知",
  history_empty: "還沒有任何工作完成或失敗的通知",
  total_items: "共 {{count}} 則",
};
