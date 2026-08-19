export const chat = {
  input_placeholder: "输入信息或上传凭证",
  login_warning: "您尚未登录，所有对话内容将不会被保存",
  guest_limit_reached: "已用完试用额度，请登录以继续使用本服务",
  generic_error: "抱歉，发生错误，请稍后再试。",
  // Info: (20260813 - Luphia) 常驻额度指示器（产品调整 20260813）：平时收合只显示百分比，点击展开细节
  quota_indicator: {
    label: "剩余额度",
    wallet_fallback: "改扣团队点数",
    reset_at: "{{time}} 重置",
    spend_order: "扣抵顺序：先用订阅额度，用完自动接续扣团队分配给您的点数。",
  },
  // Info: (20260812 - Luphia) 额度用尽提示（设计书 §5）：倒数、绝对重置时间与导购
  quota_exceeded: {
    title: "{{window}}的 AI 对话额度不足",
    window_5h: "近 5 小时",
    window_week: "本周",
    reset_hint: "将于 {{countdown}} 后（{{resetAt}}）恢复可用。",
    // Info: (20260815 - Luphia) 單筆超過視窗上限：等重置不會好（第二輪 C-5）
    over_window_limit_title: "本次操作超过方案的单次上限",
    over_window_limit_hint:
      "这笔操作需要的点数高于方案在单一时段的额度上限（{{limit}} 点），等待重置也无法完成。请改用个人点数支付，或升级方案。",
    reset_ready_title: "额度已重置，可以继续对话",
    meter_5h: "近 5 小时剩余额度",
    meter_week: "本周剩余额度",
    exhausted_hint:
      "订阅额度与团队分配点数都已用完。只要任一边还有剩余，系统会自动接续扣抵，不会挡下您的信息。",
    countdown: "{{hours}}:{{minutes}}:{{seconds}}",
    countdown_days: "{{days}} 天 {{hours}} 小时",
    upsell_hint: "不想等？可加购点数或升级订阅方案，立即取得更高额度。",
    buy_credits: "购买点数",
    upgrade_plan: "升级方案",
  },
};
