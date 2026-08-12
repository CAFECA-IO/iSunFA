export const chat = {
  input_placeholder: "메시지 입력 또는 문서 업로드",
  login_warning: "로그인하지 않았습니다. 대화 내용은 저장되지 않습니다.",
  guest_limit_reached:
    "체험 한도를 모두 사용했습니다. 서비스를 계속 이용하려면 로그인해 주십시오.",
  generic_error: "죄송합니다. 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
  // Info: (20260812 - Luphia) 額度用罄提示（設計書 §5）：倒數、絕對重置時間與導購
  quota_exceeded: {
    title: "{{window}} AI 대화 크레딧을 모두 사용했습니다",
    window_5h: "최근 5시간",
    window_week: "이번 주",
    reset_hint: "{{countdown}} 후({{resetAt}})에 다시 사용할 수 있습니다.",
    reset_ready_title: "한도가 초기화되었습니다. 대화를 계속할 수 있습니다",
    countdown: "{{hours}}:{{minutes}}:{{seconds}}",
    countdown_days: "{{days}}일 {{hours}}시간",
    upsell_hint:
      "기다리기 어렵다면 크레딧을 추가 구매하거나 플랜을 업그레이드해 지금 바로 한도를 늘릴 수 있습니다.",
    buy_credits: "크레딧 구매",
    upgrade_plan: "플랜 업그레이드",
  },
};
