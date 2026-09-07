export const paymentSource = {
  title: "결제 수단",
  team: "팀 한도",
  personal: "개인 크레딧",
  single_team:
    "'{{team}}'의 구독 한도와 배정 크레딧에서 결제됩니다(서명 불필요).",
  team_insufficient:
    "이 팀의 사용 가능 한도가 부족합니다(사용 가능 {{available}}, 필요 {{cost}}). 한도 초기화를 기다리거나 관리자에게 크레딧 배정을 요청하거나 개인 크레딧으로 결제하세요.",
  personal_insufficient:
    "개인 크레딧이 부족합니다(잔액 {{available}}, 필요 {{cost}}). 크레딧을 추가 구매하거나 팀 한도로 결제하세요.",
  quota_5h: "최근 5시간 남은 한도",
  quota_week: "이번 주 남은 한도",
  allocation_balance: "회원님에게 배정된 크레딧: {{balance}}",
  personal_balance: "회원님의 크레딧 잔액: {{balance}}",
  select_team: "결제할 팀 선택",
  multi_team_hint:
    "여러 팀에 속해 있습니다. 어느 팀이 결제할지 선택하세요. 해당 팀의 구독 한도와 회원님에게 배정된 크레딧에서 차감됩니다.",
  team_required: "여러 팀에 속해 있습니다. 결제할 팀을 먼저 선택하세요.",
};
