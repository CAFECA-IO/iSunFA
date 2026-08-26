export const notification = {
  aria: "通知",
  summary: "未処理 {{todos}} 件、完了通知 {{completed}} 件",
  empty: "通知はありません",
  todos_title: "未処理",
  completed_title: "完了",
  team_invitation:
    "「{{inviterName}}」がチーム「{{teamName}}」への参加に招待しています",
  wallet_upgrade:
    "会員カードなどのオンチェーン証明を受け取るため、ウォレットのアップグレードが必要です",
  analysis_completed:
    "分析ジョブが完了しました。クリックして結果を確認してください",
  analysis_failed:
    "分析ジョブが失敗しました。再送信するかサポートにご連絡ください",
  // Info: (20260825 - Julian) 帶報告名稱的版本；取不到名稱時退回上面那句
  analysis_completed_named:
    "「{{title}}」の分析が完了しました。クリックして結果をご確認ください",
  analysis_failed_named:
    "「{{title}}」の分析に失敗しました。再送信するかサポートにご連絡ください",
  unread: "未読",
  /**
   * Info: (20260826 - Julian) 由 `has_more_completed` 改名而來。
   *
   * 舊鍵是「還有更多未讀通知」，而面板改成保留已讀之後，那個旗標的意思
   * 變成「歷史超過上限」——於是它會在一個未讀只有 2 則的畫面上宣稱
   * 還有更多未讀，與徽章互相矛盾。改鍵名而不是只改字串：舊鍵留著的話，
   * 沒改到的語系會靜默沿用假話，而改名會讓 `tsc` 直接指出漏掉的那一個。
   */
  history_capped: "最新 {{count}} 件のみ表示しています",
  view_all: "すべての通知を表示",
  page_title: "通知",
  history_title: "履歴",
  history_empty: "完了・失敗の通知はまだありません",
  total_items: "全 {{count}} 件",
  view: "確認",
};
