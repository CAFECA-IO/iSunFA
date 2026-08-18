// Info: (20260815 - Luphia) email 邀請的落地頁（規範 §4 / P4）
export const invitePage = {
  loading: "Loading invitation…",
  title: "{{team}} invited you to join",
  role_note: "You will join as {{role}}.",
  accept: "Accept and join",
  login_to_accept: "Sign in or register to join",
  login_hint:
    "No account yet? You will be added to this team right after you register.",
  accept_failed: "Could not accept the invitation. Please try again later.",
  invalid_title: "This invitation link is no longer valid",
  invalid_description:
    "It may have already been used, expired, or been withdrawn. Ask whoever invited you for a new link.",
  // Info: (20260818 - Luphia) 暫時性失敗（429／5xx／網路）與「確定失效」分開（第六輪第 3 條）
  retryable_title: "Can't load the invitation right now",
  retryable_description:
    "This may be a network hiccup or too many attempts in a short time. The invitation is still valid — please try again.",
  retry: "Try again",
  joined_title: "You have joined the team",
  joined_description: "Taking you to the team page…",
  decline: "I don't want to join",
  decline_failed: "Could not decline the invitation. Please try again later.",
  declined_title: "Invitation declined",
  declined_description:
    "You will not be added to this team. If that was a mistake, ask whoever invited you for a new link.",
};
