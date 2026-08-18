// Info: (20260815 - Luphia) email 邀請的落地頁（規範 §4 / P4）
export const invitePage = {
  loading: "招待を読み込んでいます…",
  title: "{{team}} からチームへの招待が届いています",
  role_note: "「{{role}}」として参加します。",
  accept: "招待を承諾して参加",
  login_to_accept: "ログインまたは登録して参加",
  login_hint:
    "アカウントがなくても大丈夫です。登録が完了すると自動的にこのチームに参加します。",
  accept_failed: "招待を承諾できませんでした。しばらくしてからお試しください。",
  invalid_title: "この招待リンクは無効です",
  invalid_description:
    "すでに使用済み、有効期限切れ、または取り消された可能性があります。招待した方に新しいリンクを依頼してください。",
  // Info: (20260818 - Luphia) 暫時性失敗（429／5xx／網路）與「確定失效」分開（第六輪第 3 條）
  retryable_title: "招待を読み込めませんでした",
  retryable_description:
    "ネットワークの不調、または短時間に試行が多すぎた可能性があります。この招待は有効ですので、しばらくしてからお試しください。",
  retry: "再試行",
  joined_title: "チームに参加しました",
  joined_description: "チームページへ移動します…",
  decline: "参加しません",
  decline_failed:
    "招待を辞退できませんでした。しばらくしてからお試しください。",
  declined_title: "招待を辞退しました",
  declined_description:
    "このチームには参加しません。誤って操作した場合は、招待した方に新しいリンクを依頼してください。",
};
