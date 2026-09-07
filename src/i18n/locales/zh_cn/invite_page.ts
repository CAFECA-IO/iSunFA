// Info: (20260815 - Luphia) email 邀請的落地頁（規範 §4 / P4）
export const invitePage = {
  loading: "读取邀请中…",
  title: "{{team}} 邀请您加入团队",
  role_note: "您将以「{{role}}」的身份加入。",
  accept: "接受邀请并加入",
  login_to_accept: "登录或注册以加入",
  login_hint: "还没有账号也没关系，注册完成后会自动加入这个团队。",
  accept_failed: "接受邀请失败，请稍后再试。",
  invalid_title: "邀请链接已失效",
  invalid_description:
    "这个链接可能已被使用、已过期，或已被撤回。请向邀请您的人索取新的链接。",
  // Info: (20260818 - Luphia) 暫時性失敗（429／5xx／網路）與「確定失效」分開（第六輪第 3 條）
  retryable_title: "暂时无法读取邀请",
  retryable_description:
    "可能是网络不稳或短时间内尝试太多次。这封邀请仍然有效，请稍后再试。",
  retry: "重试",
  joined_title: "已加入团队",
  joined_description: "正在带您前往团队页面…",
  decline: "我不加入这个团队",
  decline_failed: "拒绝邀请失败，请稍后再试。",
  declined_title: "已拒绝邀请",
  declined_description:
    "您不会被加入这个团队。若是误按，请向邀请您的人索取新的链接。",
};
