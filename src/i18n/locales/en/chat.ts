export const chat = {
  input_placeholder: "Type a message or upload document",
  login_warning:
    "You are not logged in. Conversation content will not be saved.",
  guest_limit_reached:
    "You have used up your trial quota. Please log in to continue using this service.",
  generic_error: "Sorry, something went wrong. Please try again later.",
  // Info: (20260812 - Luphia) 額度用罄提示（設計書 §5）：倒數、絕對重置時間與導購
  quota_exceeded: {
    title: "Not enough {{window}} AI chat quota",
    window_5h: "5-hour",
    window_week: "weekly",
    reset_hint: "Available again in {{countdown}} (at {{resetAt}}).",
    reset_ready_title: "Your quota has reset — you can keep chatting",
    meter_5h: "5-hour quota remaining",
    meter_week: "Weekly quota remaining",
    hold_hint:
      "Each message first reserves an upper bound of quota (estimated from the message length and the reply limit); the difference is returned once actual usage is settled. A message is blocked when the remaining quota is below that reservation — which is why some may still be shown above.",
    countdown: "{{hours}}:{{minutes}}:{{seconds}}",
    countdown_days: "{{days}}d {{hours}}h",
    upsell_hint:
      "Don't want to wait? Buy more credits or upgrade your plan for a higher quota right away.",
    buy_credits: "Buy credits",
    upgrade_plan: "Upgrade plan",
  },
};
