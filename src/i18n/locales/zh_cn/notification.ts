export const notification = {
  aria: "通知",
  summary: "{{todos}} 则待办事项、{{completed}} 个工作完成通知",
  empty: "目前没有通知",
  todos_title: "待办事项",
  completed_title: "工作完成",
  team_invitation: "「{{inviterName}}」邀请你加入团队「{{teamName}}」",
  wallet_upgrade: "系统要求升级你的钱包，以支持接收会员卡等链上凭证",
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
  view_all: "查看全部通知",
  page_title: "通知",
  history_title: "历史通知",
  history_empty: "还没有任何工作完成或失败的通知",
  total_items: "共 {{count}} 则",
  view: "查看",
};
