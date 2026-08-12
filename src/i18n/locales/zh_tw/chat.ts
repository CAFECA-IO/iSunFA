export const chat = {
  input_placeholder: "輸入訊息或上傳憑證",
  login_warning: "您尚未登入，所有對話內容將不會被儲存",
  guest_limit_reached: "已用完試用額度，請登入以繼續使用本服務",
  generic_error: "抱歉，發生錯誤，請稍後再試。",
  // Info: (20260812 - Luphia) 額度用罄提示（設計書 §5）：倒數、絕對重置時間與導購
  quota_exceeded: {
    title: "{{window}}的 AI 對話點數已用盡",
    window_5h: "近 5 小時",
    window_week: "本週",
    reset_hint: "將於 {{countdown}} 後（{{resetAt}}）恢復可用。",
    reset_ready_title: "額度已重置，可以繼續對話",
    countdown: "{{hours}}:{{minutes}}:{{seconds}}",
    countdown_days: "{{days}} 天 {{hours}} 小時",
    upsell_hint: "不想等？可加購點數或升級訂閱方案，立即取得更高額度。",
    buy_credits: "購買點數",
    upgrade_plan: "升級方案",
  },
};
