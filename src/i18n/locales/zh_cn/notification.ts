export const notification = {
  aria: "通知",
  /**
   * Info: (20260826 - Julian) 帶未讀數的版本 —— `aria-label` 會**蓋掉**按鈕內容，
   * 包括那顆徽章。固定字串等於讓讀屏使用者永遠聽不到有幾則。
   */
  aria_unread: "通知，{{count}} 则未读",
  // Info: (20260826 - Julian) 讀不到時說讀不到，不要退化成「目前沒有通知」
  load_failed: "通知读取失败，请稍后再试",
  summary: "{{todos}} 则待办事项、{{completed}} 个工作完成通知",
  empty: "目前没有通知",
  todos_title: "待办事项",
  completed_title: "工作完成",
  team_invitation: "「{{inviterName}}」邀请你加入团队「{{teamName}}」",
  wallet_upgrade: "系统要求升级你的钱包，以支持接收会员卡等链上凭证",
  // Info: (20260828 - Julian) 已经做了一部分；剩余章数比「3/14」直观（见计划 §3）
  job_resumable: "这份导入可以接着做了，还有 {{remaining}} 章没有导入",
  // Info: (20260828 - Julian) 一步都还没跑：说「继续」会让人以为已经做过一半
  job_resumable_fresh: "这份报告的导入可以开始了",
  analysis_completed: "你的分析工作已完成，点击查看结果",
  analysis_failed: "你的分析工作失败了，请重新送出或联系客服",
  // Info: (20260825 - Julian) 帶報告名稱的版本；取不到名稱時退回上面那句
  analysis_completed_named: "「{{title}}」分析已完成，点击查看结果",
  analysis_failed_named: "「{{title}}」分析失败了，请重新送出或联系客服",
  unread: "未读",
  /**
   * Info: (20260826 - Julian) 由 `has_more_completed` 改名而來。
   *
   * 舊鍵是「還有更多未讀通知」，而面板改成保留已讀之後，那個旗標的意思
   * 變成「歷史超過上限」——於是它會在一個未讀只有 2 則的畫面上宣稱
   * 還有更多未讀，與徽章互相矛盾。改鍵名而不是只改字串：舊鍵留著的話，
   * 沒改到的語系會靜默沿用假話，而改名會讓 `tsc` 直接指出漏掉的那一個。
   */
  history_capped: "仅显示最近 {{count}} 则",
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
  todos_capped: "还有更多待办没有显示",
  /**
   * Info: (20260902 - Julian) 截斷要有**出口**，不只有說明（review R3 的 A2）。
   *
   * 原本只有上面那一句純文字：第 6 份可以繼續的匯入起，在鈴鐺與
   * `/user/notifications` 兩個畫面上都不存在，也沒有任何路徑到得了 ——
   * 而被藏起來的正是 `updatedAt` 排最後、等最久的那幾份。
   *
   * 這個模組自己寫下的不變式是「分岔永遠伴隨一個看得見的說明**與一個出口**」，
   * 完成側有（`view_all` → 分頁清單），待辦側先前沒有。
   * 去處是盤查對話清單而不是通知分頁：可接續的匯入本來就一個會話一筆
   *（`@@unique([resourceKey, type])`），那份清單就是完整的待辦清單。
   */
  todos_capped_action: "到盘查对话查看",
  view_all: "查看全部通知",
  page_title: "通知",
  history_title: "历史通知",
  history_empty: "还没有任何工作完成或失败的通知",
  total_items: "共 {{count}} 则",
};
