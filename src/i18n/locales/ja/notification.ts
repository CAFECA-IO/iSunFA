export const notification = {
  aria: "通知",
  /**
   * Info: (20260826 - Julian) 帶未讀數的版本 —— `aria-label` 會**蓋掉**按鈕內容，
   * 包括那顆徽章。固定字串等於讓讀屏使用者永遠聽不到有幾則。
   */
  aria_unread: "通知、未読 {{count}} 件",
  // Info: (20260826 - Julian) 讀不到時說讀不到，不要退化成「目前沒有通知」
  load_failed: "通知を読み込めませんでした。しばらくしてからお試しください",
  summary: "未処理 {{todos}} 件、完了通知 {{completed}} 件",
  empty: "通知はありません",
  todos_title: "未処理",
  completed_title: "完了",
  team_invitation:
    "「{{inviterName}}」がチーム「{{teamName}}」への参加に招待しています",
  wallet_upgrade:
    "会員カードなどのオンチェーン証明を受け取るため、ウォレットのアップグレードが必要です",
  // Info: (20260828 - Julian) 一部完了；残り章数のほうが「3/14」より分かりやすい
  job_resumable:
    "利用枠が回復しました。あと {{remaining}} 章がインポート待ちです。",
  // Info: (20260828 - Julian) まだ 1 章も実行していない：「再開」は誤解を招く
  job_resumable_fresh:
    "利用枠が回復しました。レポートのインポートを開始できます。",
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
};
