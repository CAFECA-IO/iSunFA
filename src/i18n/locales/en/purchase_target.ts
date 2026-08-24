export const purchaseTarget = {
  subscription_title: "Which team is this subscription for?",
  credits_title: "Where should the credits go?",
  seat_breakdown: "{{seats}} seats × NT$ {{unit}} = NT$ {{total}}",
  extension_note:
    'The current subscription period for "{{team}}" runs until {{date}}. The purchased period is added on top of that date — the remaining days are not lost (for an upgrade, the new plan applies immediately upon payment). Extensions can only be purchased within 30 days of the period end.',
  extension_too_early_note:
    'The current subscription period for "{{team}}" runs until {{date}}. Too many days remain to extend the same plan — please come back within 30 days of the period end. Upgrades are not restricted and can be made at any time.',
  downgrade_schedule_note:
    'The current subscription period for "{{team}}" runs until {{date}}. The downgrade takes effect on that date; your current plan and its benefits stay unchanged until then, and no payment is taken now. You can switch back to your current plan any time before it takes effect to cancel it.',
  upgrade_credit_note:
    'The current subscription period for "{{team}}" runs until {{date}}. The upgrade takes effect as soon as payment completes, and the remaining time on your current plan is not lost: its paid value is credited as additional days of the new plan, added after the new period.',
  resume_autorenew_note:
    'Auto-renewal for "{{team}}" is currently off — the current period ends {{date}} and would become the free plan. Completing this purchase turns auto-renewal back on, so it will be charged automatically at the period end; you can turn it off again from the team wallet page.',
  pending_downgrade_note:
    '"{{team}}" is scheduled to change to {{plan}} on {{date}}. Completing this purchase cancels that scheduled change.',
  seat_note:
    "Seats are counted from your team's current size; the amount charged reflects the size at checkout.",
  // Info: (20260814 - Luphia) 沒有團隊可選時要說出是哪一種沒有（載入中／失敗／過期／無權限）
  session_expired: "Your session has expired. Sign in again to choose a team.",
  teams_loading: "Loading your teams…",
  teams_failed: "Could not load your teams. Please retry.",
  team: "Team",
  personal: "Personal",
  select_team: "Select a team",
  single_team: 'Will apply to "{{team}}"',
  multi_team_hint:
    "You belong to more than one team. Choose which team this purchase belongs to.",
  team_required: "Select a team before paying.",
  personal_hint:
    "Credits go to your personal account and can be used for anything not tied to a team.",
  no_owner_team:
    "Only a team owner can subscribe. You do not own any team yet — ask the owner to subscribe, or create a team first.",
  no_manager_team:
    // Info: (20260819 - Luphia) 團隊 ADMIN 已取消（產品決定 20260819），文案不得再提到它
    "Buying team credits requires owner rights. You have no team to manage right now; you can buy personal credits instead.",
};
