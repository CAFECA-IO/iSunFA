export const purchaseTarget = {
  subscription_title: "订阅给哪个团队",
  credits_title: "点数存入哪里",
  seat_breakdown: "{{seats}} 席 × NT$ {{unit}} ＝ NT$ {{total}}",
  extension_note:
    "「{{team}}」当前的订阅期间至 {{date}}。本次购买的期间将自该日起算并累加，当期剩余天数不会消失（若为升级，新方案自付款完成起立即适用）。订阅剩余 30 天内才能购买延长。",
  extension_too_early_note:
    "「{{team}}」当前的订阅期间至 {{date}}。剩余天数尚多，暂不开放购买同方案的延长——请于到期前 30 天内再延长；升级方案不受此限制，随时可以进行。",
  downgrade_schedule_note:
    "「{{team}}」当前的订阅期间至 {{date}}。降级将于该日生效，当期权益维持原方案不变，本次不会收取费用；在生效前你都可以改回原方案取消这次降级。",
  upgrade_credit_note:
    "「{{team}}」当前的订阅期间至 {{date}}。升级自付款完成起立即生效，旧方案剩余期间不会消失：将按已付金额折抵为新方案的天数，加在新期间之后。",
  resume_autorenew_note:
    "「{{team}}」的自动续订目前是关闭的，当期至 {{date}} 到期后原本会转为免费版。本次购买完成后将恢复自动续订，期末会自动扣款；你随后仍可在团队钱包页再次关闭。",
  pending_downgrade_note:
    "「{{team}}」已排定于 {{date}} 起降级为{{plan}}。本次购买完成后，该降级将取消。",
  seat_note: "席次以团队目前人数计算；实际收费金额以结帐当下的人数为准。",
  // Info: (20260814 - Luphia) 沒有團隊可選時要說出是哪一種沒有（載入中／失敗／過期／無權限）
  session_expired: "登录已过期，请重新登录后再选择团队。",
  teams_loading: "正在加载你的团队⋯⋯",
  teams_failed: "团队清单加载失败，请重试。",
  team: "团队",
  personal: "个人",
  select_team: "请选择团队",
  single_team: "将套用于「{{team}}」",
  multi_team_hint: "你隶属多个团队，请选择这笔消费要记在哪一个团队。",
  team_required: "请先选择团队，再进行付款。",
  personal_hint: "点数存入你的个人账户，可用于任何未绑定团队的功能。",
  no_owner_team:
    "订阅需由团队拥有者操作。你目前不是任何团队的拥有者，请改请拥有者订阅，或先建立团队。",
  no_manager_team:
    "购买团队点数需要团队拥有者或管理员权限。你目前没有可管理的团队，可改为购买个人点数。",
};
