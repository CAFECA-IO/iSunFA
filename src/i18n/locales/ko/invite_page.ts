// Info: (20260815 - Luphia) email 邀請的落地頁（規範 §4 / P4）
export const invitePage = {
  loading: "초대를 불러오는 중…",
  title: "{{team}} 팀에서 초대했습니다",
  role_note: "'{{role}}' 권한으로 참여합니다.",
  accept: "초대 수락하고 참여",
  login_to_accept: "로그인 또는 가입하고 참여",
  login_hint:
    "계정이 없어도 괜찮습니다. 가입을 마치면 자동으로 이 팀에 참여합니다.",
  accept_failed: "초대를 수락하지 못했습니다. 잠시 후 다시 시도해 주세요.",
  invalid_title: "초대 링크가 만료되었습니다",
  invalid_description:
    "이미 사용되었거나, 기한이 지났거나, 취소된 링크일 수 있습니다. 초대한 분에게 새 링크를 요청하세요.",
  // Info: (20260818 - Luphia) 暫時性失敗（429／5xx／網路）與「確定失效」分開（第六輪第 3 條）
  retryable_title: "초대를 불러올 수 없습니다",
  retryable_description:
    "네트워크가 불안정하거나 짧은 시간에 시도가 너무 많았을 수 있습니다. 이 초대는 여전히 유효하니 잠시 후 다시 시도해 주세요.",
  retry: "다시 시도",
  joined_title: "팀에 참여했습니다",
  joined_description: "팀 페이지로 이동합니다…",
  decline: "참여하지 않겠습니다",
  decline_failed: "초대를 거절하지 못했습니다. 잠시 후 다시 시도해 주세요.",
  declined_title: "초대를 거절했습니다",
  declined_description:
    "이 팀에 참여하지 않습니다. 잘못 누르셨다면 초대한 분에게 새 링크를 요청하세요.",
};
