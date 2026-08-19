export const chat = {
  input_placeholder: "메시지 입력 또는 문서 업로드",
  login_warning: "로그인하지 않았습니다. 대화 내용은 저장되지 않습니다.",
  guest_limit_reached:
    "체험 한도를 모두 사용했습니다. 서비스를 계속 이용하려면 로그인해 주십시오.",
  generic_error: "죄송합니다. 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
  // Info: (20260813 - Luphia) 常駐額度指示器（產品調整 20260813）：平時收合只顯示百分比，點擊展開細節
  quota_indicator: {
    label: "남은 한도",
    wallet_fallback: "팀 크레딧에서 차감",
    reset_at: "{{time}} 초기화",
    spend_order:
      "구독 한도에서 먼저 차감하고, 모두 사용하면 팀이 배정한 크레딧에서 자동으로 이어서 차감합니다.",
  },
  // Info: (20260812 - Luphia) 額度用罄提示（設計書 §5）：倒數、絕對重置時間與導購
  quota_exceeded: {
    title: "{{window}} AI 대화 한도가 부족합니다",
    window_5h: "최근 5시간",
    window_week: "이번 주",
    reset_hint: "{{countdown}} 후({{resetAt}})에 다시 사용할 수 있습니다.",
    // Info: (20260815 - Luphia) 單筆超過視窗上限：等重置不會好（第二輪 C-5）
    over_window_limit_title: "이 작업은 플랜의 단일 구간 한도를 초과합니다",
    over_window_limit_hint:
      "이 작업에 필요한 크레딧이 플랜의 단일 구간 한도({{limit}} 크레딧)를 초과합니다. 초기화를 기다려도 실행할 수 없습니다. 개인 크레딧으로 결제하거나 플랜을 업그레이드하세요.",
    reset_ready_title: "한도가 초기화되었습니다. 대화를 계속할 수 있습니다",
    meter_5h: "최근 5시간 남은 한도",
    meter_week: "이번 주 남은 한도",
    exhausted_hint:
      "구독 한도와 팀 배정 크레딧을 모두 사용했습니다. 어느 한쪽에 잔액이 있으면 자동으로 차감하므로 메시지가 차단되지 않습니다.",
    countdown: "{{hours}}:{{minutes}}:{{seconds}}",
    countdown_days: "{{days}}일 {{hours}}시간",
    upsell_hint:
      "기다리기 어렵다면 크레딧을 추가 구매하거나 플랜을 업그레이드해 지금 바로 한도를 늘릴 수 있습니다.",
    buy_credits: "크레딧 구매",
    upgrade_plan: "플랜 업그레이드",
  },
};
