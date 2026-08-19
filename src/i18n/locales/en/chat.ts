export const chat = {
  input_placeholder: "Type a message or upload document",
  login_warning:
    "You are not logged in. Conversation content will not be saved.",
  guest_limit_reached:
    "You have used up your trial quota. Please log in to continue using this service.",
  generic_error: "Sorry, something went wrong. Please try again later.",
  // Info: (20260813 - Luphia) 常駐額度指示器（產品調整 20260813）：平時收合只顯示百分比，點擊展開細節
  quota_indicator: {
    label: "Quota left",
    wallet_fallback: "using team credits",
    reset_at: "Resets {{time}}",
    spend_order:
      "We draw from your subscription quota first, then automatically from the credits your team allocated to you.",
  },
  // Info: (20260812 - Luphia) 額度用罄提示（設計書 §5）：倒數、絕對重置時間與導購
  quota_exceeded: {
    title: "Not enough {{window}} AI chat quota",
    window_5h: "5-hour",
    window_week: "weekly",
    reset_hint: "Available again in {{countdown}} (at {{resetAt}}).",
    // Info: (20260815 - Luphia) 單筆超過視窗上限：等重置不會好（第二輪 C-5）
    over_window_limit_title: "This action exceeds your plan's per-window limit",
    over_window_limit_hint:
      "This action costs more than your plan allows in a single window ({{limit}} credits), so waiting for the reset will not help. Pay with your own credits, or upgrade the plan.",
    reset_ready_title: "Your quota has reset — you can keep chatting",
    meter_5h: "5-hour quota remaining",
    meter_week: "Weekly quota remaining",
    exhausted_hint:
      "Both your subscription quota and your allocated team credits are used up. As long as either still has a balance, we draw from it automatically and your message goes through.",
    countdown: "{{hours}}:{{minutes}}:{{seconds}}",
    countdown_days: "{{days}}d {{hours}}h",
    upsell_hint:
      "Don't want to wait? Buy more credits or upgrade your plan for a higher quota right away.",
    buy_credits: "Buy credits",
    upgrade_plan: "Upgrade plan",
  },
};
