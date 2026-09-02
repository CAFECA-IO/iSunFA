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
   * Info: (20260901 - Julian) 待辦節被截斷時的說明（review：D4）。
   *
   * 與 `history_capped` 成對：徽章數的是全部，而清單只帶回上限內的幾筆。
   * 分岔本身可以接受，靜默的分岔不行。
   */
  todos_capped: "仅显示最近 {{count}} 则待办",
  view_all: "查看全部通知",
  page_title: "通知",
  history_title: "历史通知",
  history_empty: "还没有任何工作完成或失败的通知",
  total_items: "共 {{count}} 则",
};
