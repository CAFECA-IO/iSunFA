// Info: (20260815 - Luphia) email 邀請的落地頁（規範 §4 / P4）
export const invitePage = {
  loading: "讀取邀請中…",
  title: "{{team}} 邀請您加入團隊",
  role_note: "您將以「{{role}}」的身分加入。",
  accept: "接受邀請並加入",
  login_to_accept: "登入或註冊以加入",
  login_hint: "還沒有帳號也沒關係，註冊完成後會自動加入這個團隊。",
  accept_failed: "接受邀請失敗，請稍後再試。",
  invalid_title: "邀請連結已失效",
  invalid_description:
    "這個連結可能已被使用、已逾期，或已被撤回。請向邀請您的人索取新的連結。",
  // Info: (20260818 - Luphia) 暫時性失敗（429／5xx／網路）與「確定失效」分開（第六輪第 3 條）
  retryable_title: "暫時無法讀取邀請",
  retryable_description:
    "可能是網路不穩或短時間內嘗試太多次。這封邀請仍然有效，請稍後再試。",
  retry: "重試",
  joined_title: "已加入團隊",
  joined_description: "正在帶您前往團隊頁面…",
  decline: "我不加入這個團隊",
  decline_failed: "拒絕邀請失敗，請稍後再試。",
  declined_title: "已拒絕邀請",
  declined_description:
    "您不會被加入這個團隊。若是誤按，請向邀請您的人索取新的連結。",
};
