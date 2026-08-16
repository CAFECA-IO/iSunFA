export const chat = {
  input_placeholder: "輸入訊息或上傳憑證",
  login_warning: "您尚未登入，所有對話內容將不會被儲存",
  guest_limit_reached: "已用完試用額度，請登入以繼續使用本服務",
  generic_error: "抱歉，發生錯誤，請稍後再試。",
  // Info: (20260813 - Luphia) 常駐額度指示器（產品調整 20260813）：平時收合只顯示百分比，點擊展開細節
  quota_indicator: {
    label: "剩餘額度",
    wallet_fallback: "改扣團隊點數",
    reset_at: "{{time}} 重置",
    spend_order: "扣抵順序：先用訂閱額度，用完自動接續扣團隊分配給您的點數。",
  },
  // Info: (20260812 - Luphia) 額度用罄提示（設計書 §5）：倒數、絕對重置時間與導購
  quota_exceeded: {
    title: "{{window}}的 AI 對話額度不足",
    window_5h: "近 5 小時",
    window_week: "本週",
    reset_hint: "將於 {{countdown}} 後（{{resetAt}}）恢復可用。",
    // Info: (20260815 - Luphia) 單筆超過視窗上限：等重置不會好（第二輪 C-5）
    over_window_limit_title: "本次操作超過方案的單次上限",
    over_window_limit_hint:
      "這筆操作需要的點數高於方案在單一時段的額度上限（{{limit}} 點），等待重置也無法完成。請改用個人點數支付，或升級方案。",
    reset_ready_title: "額度已重置，可以繼續對話",
    meter_5h: "近 5 小時剩餘額度",
    meter_week: "本週剩餘額度",
    exhausted_hint:
      "訂閱額度與團隊分配點數都已用完。只要任一邊還有剩餘，系統會自動接續扣抵，不會擋下您的訊息。",
    countdown: "{{hours}}:{{minutes}}:{{seconds}}",
    countdown_days: "{{days}} 天 {{hours}} 小時",
    upsell_hint: "不想等？可加購點數或升級訂閱方案，立即取得更高額度。",
    buy_credits: "購買點數",
    upgrade_plan: "升級方案",
  },
};
