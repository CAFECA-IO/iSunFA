import { LeaveApprovalUnresolvedReason } from "@/interfaces/leave_request";

/**
 * Info: (20260820 - Julian) 展不開的成因 → i18n key（review 第 7 輪 M27）。
 *
 * ## 為什麼需要它
 *
 * 畫面原本是 `t("...preview_chain_unresolved", { reason: preview.unresolvedReason })`
 * —— 而 `unresolvedReason` 是 **enum 值**，於是使用者讀到
 * 「簽核流程展不開（NO_DEPARTMENT_MANAGER），請聯繫人事…」。
 *
 * 這與 `leave_error_message.ts` 檔頭寫下的規矩是同一件事：
 * `error_dictionary` 的 `message` 是寫給開發者的英文，不可原封不動印給使用者。
 * enum 值更糟 —— 它連英文句子都不是。
 *
 * ## 為什麼一個成因一句話
 *
 * 這個 enum 分得這麼細，理由 `LeaveApprovalUnresolvedReason` 的檔頭已經寫了：
 * 「錯誤訊息必須指出缺什麼：解法在 HR 手上不在員工手上」。
 * 合成一句「簽核規則有問題」等於把那個分辨力丟掉，而它正是分這麼細的目的。
 *
 * `Record<enum, string>` 而不是 `Partial<...>`：新增一個成因而忘了寫文案時，
 * **編譯期**就會紅。這正是這一條缺陷的形狀 —— 有東西要顯示、沒有人給它文案。
 */
export const LEAVE_UNRESOLVED_REASON_I18N_KEY: Readonly<
  Record<LeaveApprovalUnresolvedReason, string>
> = {
  [LeaveApprovalUnresolvedReason.NO_MATCHING_RULE]:
    "hr_management.leave.unresolved_no_matching_rule",
  [LeaveApprovalUnresolvedReason.EMPTY_RULE_STEPS]:
    "hr_management.leave.unresolved_empty_rule_steps",
  [LeaveApprovalUnresolvedReason.NO_DIRECT_MANAGER]:
    "hr_management.leave.unresolved_no_direct_manager",
  [LeaveApprovalUnresolvedReason.NO_DEPARTMENT_MANAGER]:
    "hr_management.leave.unresolved_no_department_manager",
  [LeaveApprovalUnresolvedReason.NO_HR]: "hr_management.leave.unresolved_no_hr",
  [LeaveApprovalUnresolvedReason.NO_OTHER_HR]:
    "hr_management.leave.unresolved_no_other_hr",
  [LeaveApprovalUnresolvedReason.SPECIFIC_EMPLOYEE_MISSING]:
    "hr_management.leave.unresolved_specific_employee_missing",
  [LeaveApprovalUnresolvedReason.MALFORMED_RULE_THRESHOLD]:
    "hr_management.leave.unresolved_malformed_rule_threshold",
};
