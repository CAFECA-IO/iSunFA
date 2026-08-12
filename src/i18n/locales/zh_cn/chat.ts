export const chat = {
  input_placeholder: "输入信息或上传凭证",
  login_warning: "您尚未登录，所有对话内容将不会被保存",
  guest_limit_reached: "已用完试用额度，请登录以继续使用本服务",
  generic_error: "抱歉，发生错误，请稍后再试。",
  // Info: (20260812 - Luphia) 额度用尽提示（设计书 §5）：倒数、绝对重置时间与导购
  quota_exceeded: {
    title: "{{window}}的 AI 对话点数已用尽",
    window_5h: "近 5 小时",
    window_week: "本周",
    reset_hint: "将于 {{countdown}} 后（{{resetAt}}）恢复可用。",
    reset_ready_title: "额度已重置，可以继续对话",
    countdown: "{{hours}}:{{minutes}}:{{seconds}}",
    countdown_days: "{{days}} 天 {{hours}} 小时",
    upsell_hint: "不想等？可加购点数或升级订阅方案，立即取得更高额度。",
    buy_credits: "购买点数",
    upgrade_plan: "升级方案",
  },
};
