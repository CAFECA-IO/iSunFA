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
  /**
   * Info: (20260831 - Julian) **不講原因**（review #6732 的 1-A）。
   *
   * 這一句原本開頭是「額度已恢復」，而翻面有兩條路：團隊額度視窗重置／方案升級，
   * 以及個人付款到帳。後者恢復的不是額度，是那筆款項付掉了 ——
   * 對那條路而言「額度已恢復」是一句假話，而通知說假話比少說一句嚴重。
   *
   * 兩條路共用同一句，是因為翻面時 `pauseReason` 已經被清成 null
   *（schema 的定義：null＝不是暫停狀態）。要分辨就得另存 `resumedBy`，
   * 見 `resumable_job_resume_landing_and_copy.md` §5 —— 那件事還沒做，
   * 所以現在只說**做得到的下一步**，不說原因。
   */
  // Info: (20260828 - Julian) 已經做了一部分；剩餘章數比「3/14」直觀（見計劃 §3）
  job_resumable: "這份匯入可以接著做了，還有 {{remaining}} 章沒有匯入",
  // Info: (20260828 - Julian) 一步都還沒跑：說「繼續」會讓人以為已經做過一半
  job_resumable_fresh: "這份報告的匯入可以開始了",
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
  /**
   * Info: (20260902 - Julian) 待辦節被截斷時的說明（review #6742）。
   *
   * **不帶數字，也不說「最近幾則」**：這一節有三個來源（邀請不截斷、可接續
   * 最多 `JOB_RESUMABLE_NOTICE_LIMIT` 筆、入庫待辦最多
   * `NOTIFICATION_TODO_LIST_LIMIT` 筆），而這個旗標只反映中間那一支。初版把
   * 數字寫死成 5，於是 2 封邀請 + 8 份可接續時，畫面列出 7 則、文案說 5、
   * 徽章說 10 —— 三個數字互不相符。「最近」也不成立：被藏起來的是可接續
   * 任務裡最舊的那幾份，而它們仍可能比某封列出來的舊邀請更新。
   *
   * 與 `history_capped` 的差別在此：那一節只有一支查詢，說得出「最近 N 則」；
   * 這一節說得出的只有「還有更多」。要給得出數字，得讓這支端點也數得出全部
   *（多一次 `summarizeResumable` 與未截斷的入庫計數），那是另一個決定。
   */
  todos_capped: "還有更多待辦沒有顯示",
  view_all: "查看全部通知",
  page_title: "通知",
  history_title: "歷史通知",
  history_empty: "還沒有任何工作完成或失敗的通知",
  total_items: "共 {{count}} 則",
};
