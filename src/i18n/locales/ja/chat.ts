export const chat = {
  input_placeholder: "メッセージを入力または文書をアップロード",
  login_warning: "ログインしていません。会話の内容は保存されません。",
  guest_limit_reached:
    "試用枠を使い切りました。引き続きサービスを利用するにはログインしてください。",
  generic_error:
    "申し訳ありません。エラーが発生しました。しばらくしてからお試しください。",
  // Info: (20260812 - Luphia) 額度用罄提示（設計書 §5）：倒數、絕對重置時間與導購
  quota_exceeded: {
    title: "{{window}}の AI 対話枠が不足しています",
    window_5h: "直近 5 時間",
    window_week: "今週",
    reset_hint: "{{countdown}} 後（{{resetAt}}）に再度ご利用いただけます。",
    reset_ready_title: "枠がリセットされました。対話を続けられます",
    meter_5h: "直近 5 時間の残り枠",
    meter_week: "今週の残り枠",
    hold_hint:
      "メッセージごとに枠の上限をいったん確保します（メッセージ長と返信上限から見積もり）。実際の使用量が確定した後に差額を返却します。残りの枠がこの確保分を下回ると送信できないため、上に残量が表示されていることがあります。",
    countdown: "{{hours}}:{{minutes}}:{{seconds}}",
    countdown_days: "{{days}} 日 {{hours}} 時間",
    upsell_hint:
      "お待ちになれない場合は、クレジットの追加購入またはプランのアップグレードで今すぐ上限を引き上げられます。",
    buy_credits: "クレジットを購入",
    upgrade_plan: "プランをアップグレード",
  },
};
