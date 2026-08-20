export const purchaseTarget = {
  subscription_title: "어느 팀의 구독인가요",
  credits_title: "크레딧을 어디에 넣을까요",
  seat_breakdown: "{{seats}}석 × NT$ {{unit}} = NT$ {{total}}",
  extension_note:
    "「{{team}}」의 현재 구독 기간은 {{date}}까지입니다. 이번 구매는 해당 날짜부터 **가산**되며 남은 일수는 사라지지 않습니다. 횟수 제한 없이 반복 구매하여 연장할 수 있습니다.",
  pending_downgrade_note:
    "「{{team}}」은(는) {{date}}부터 {{plan}}으로 변경될 예정입니다. 이번 구매가 완료되면 해당 예정은 취소됩니다.",
  seat_note:
    "좌석 수는 현재 팀 인원으로 계산하며, 실제 청구 금액은 결제 시점의 인원을 기준으로 합니다.",
  // Info: (20260814 - Luphia) 沒有團隊可選時要說出是哪一種沒有（載入中／失敗／過期／無權限）
  session_expired: "로그인이 만료되었습니다. 다시 로그인한 뒤 팀을 선택하세요.",
  teams_loading: "팀을 불러오는 중…",
  teams_failed: "팀 목록을 불러오지 못했습니다. 다시 시도하세요.",
  team: "팀",
  personal: "개인",
  select_team: "팀을 선택하세요",
  single_team: '"{{team}}"에 적용됩니다',
  multi_team_hint:
    "여러 팀에 속해 있습니다. 이 결제를 어느 팀에 귀속할지 선택하세요.",
  team_required: "결제하기 전에 팀을 선택하세요.",
  personal_hint:
    "크레딧은 개인 계정에 적립되며 팀에 연결되지 않은 기능에 사용할 수 있습니다.",
  no_owner_team:
    "구독은 팀 소유자만 진행할 수 있습니다. 현재 소유한 팀이 없습니다. 소유자에게 요청하거나 먼저 팀을 만드세요.",
  no_manager_team:
    "팀 크레딧 구매에는 소유자 또는 관리자 권한이 필요합니다. 관리할 팀이 없으므로 개인 크레딧을 구매할 수 있습니다.",
};
