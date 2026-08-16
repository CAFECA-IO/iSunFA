export const chat = {
  input_placeholder: "メッセージを入力または文書をアップロード",
  login_warning: "ログインしていません。会話の内容は保存されません。",
  guest_limit_reached:
    "試用枠を使い切りました。引き続きサービスを利用するにはログインしてください。",
  generic_error:
    "申し訳ありません。エラーが発生しました。しばらくしてからお試しください。",
  // Info: (20260813 - Luphia) 常駐額度指示器（產品調整 20260813）：平時收合只顯示百分比，點擊展開細節
  quota_indicator: {
    label: "残り枠",
    wallet_fallback: "チームのクレジットから引き当て",
    reset_at: "{{time}} にリセット",
    spend_order:
      "まずサブスクリプションの枠から引き当て、使い切るとチームから割り当てられたクレジットに自動で切り替わります。",
  },
  // Info: (20260812 - Luphia) 額度用罄提示（設計書 §5）：倒數、絕對重置時間與導購
  quota_exceeded: {
    title: "{{window}}の AI 対話枠が不足しています",
    window_5h: "直近 5 時間",
    window_week: "今週",
    reset_hint: "{{countdown}} 後（{{resetAt}}）に再度ご利用いただけます。",
    // Info: (20260815 - Luphia) 單筆超過視窗上限：等重置不會好（第二輪 C-5）
    over_window_limit_title: "この操作はプランの単一枠の上限を超えています",
    over_window_limit_hint:
      "この操作に必要なポイントは、プランの単一枠の上限（{{limit}} ポイント）を超えています。リセットを待っても実行できません。個人のクレジットでお支払いいただくか、プランをアップグレードしてください。",
    reset_ready_title: "枠がリセットされました。対話を続けられます",
    meter_5h: "直近 5 時間の残り枠",
    meter_week: "今週の残り枠",
    exhausted_hint:
      "サブスクリプションの枠とチームの割当クレジットの両方を使い切りました。いずれかに残高があれば自動的に引き当てるため、メッセージが止まることはありません。",
    countdown: "{{hours}}:{{minutes}}:{{seconds}}",
    countdown_days: "{{days}} 日 {{hours}} 時間",
    upsell_hint:
      "お待ちになれない場合は、クレジットの追加購入またはプランのアップグレードで今すぐ上限を引き上げられます。",
    buy_credits: "クレジットを購入",
    upgrade_plan: "プランをアップグレード",
  },
};
