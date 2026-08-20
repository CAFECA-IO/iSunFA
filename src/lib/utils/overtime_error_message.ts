import { API_ERRORS } from "@/lib/utils/error_dictionary";

/**
 * Info: (20260818 - Julian) 加班畫面的「錯誤碼 → i18n key」對照，比照 `LEAVE_ERROR_I18N_KEY`。
 *
 * ## 為什麼需要它
 *
 * `error_dictionary` 的 `message` 是**寫給開發者的英文**
 * （例："Overtime exceeds the statutory 12-hour daily total"）。直接印在畫面上，
 * 看到它的人既讀不懂、也不知道下一步該做什麼。
 *
 * ## 為什麼不共用一句「操作失敗」
 *
 * 這些碼的下一步完全不同：超過單日上限要縮短時數、例假日要走 §40 找人資、
 * 補休期限未設定要改選加班費、那天沒排班要請人資先排 —— 後兩個甚至不是
 * 使用者自己解決得了的。折成同一句話等於把診斷資訊丟掉。
 *
 * 限流（429）與主管閘（403）由 `SHARED_ATTENDANCE_ERROR_I18N_KEY` 接住，
 * 不必在這裡重複登記。
 */
export const OVERTIME_ERROR_I18N_KEY: Readonly<Record<string, string>> = {
  // Info: (20260818 - Julian) 送出
  [API_ERRORS.VA_OVERTIME_FILING_TYPE_MISMATCH.code]:
    "hr_management.overtime.error_filing_mismatch",
  [API_ERRORS.FO_OVERTIME_ON_REGULAR_OFF.code]:
    "hr_management.overtime.error_regular_off",
  [API_ERRORS.VA_OVERTIME_DAY_NOT_SCHEDULED.code]:
    "hr_management.overtime.error_day_not_scheduled",
  [API_ERRORS.VA_OVERTIME_PREMIUM_UNDEFINED.code]:
    "hr_management.overtime.error_premium_undefined",

  // Info: (20260818 - Julian) 核准（上限護欄一次可能破三條，但只會回最嚴的那一條）
  [API_ERRORS.VA_OVERTIME_EXCEEDS_DAILY_LIMIT.code]:
    "hr_management.overtime.error_exceeds_daily",
  [API_ERRORS.VA_OVERTIME_EXCEEDS_MONTHLY_LIMIT.code]:
    "hr_management.overtime.error_exceeds_monthly",
  [API_ERRORS.VA_OVERTIME_EXCEEDS_QUARTERLY_LIMIT.code]:
    "hr_management.overtime.error_exceeds_quarterly",
  [API_ERRORS.VA_OVERTIME_ALREADY_REVIEWED.code]:
    "hr_management.overtime.error_already_reviewed",
  /**
   * Info: (20260820 - Julian) 與「已決行」分開的一句（review 第 3 條）。
   * 兩者的下一步相反：一句是不用再管，這一句是重新看過再按一次。
   */
  [API_ERRORS.VA_OVERTIME_RECLASSIFIED_MIDWAY.code]:
    "hr_management.overtime.error_reclassified_midway",
  [API_ERRORS.VA_OVERTIME_EMERGENCY_REVOKED_MIDWAY.code]:
    "hr_management.overtime.error_emergency_revoked_midway",
  // Info: (20260820 - Julian) review 第 13 輪第 2 條：同日時段重疊
  [API_ERRORS.VA_OVERTIME_OVERLAPS_EXISTING.code]:
    "hr_management.overtime.error_overlaps_existing",
  // Info: (20260820 - Julian) review 第 5 輪 M7／M8：算不出這個人的一日工時
  [API_ERRORS.VA_OVERTIME_DAY_LENGTH_UNKNOWN.code]:
    "hr_management.overtime.error_day_length_unknown",
  // Info: (20260820 - Julian) review 第 5 輪 M9：放寬到 54 小時但沒留下記載
  [API_ERRORS.VA_OVERTIME_AGREEMENT_RECORD_REQUIRED.code]:
    "hr_management.overtime.error_agreement_record_required",
  /**
   * Info: (20260820 - Julian) §32 IV 認定的兩種落空（review 第 3 輪第 2 條）。
   * 都不與「已決行」共用：那一句要人資不用再管，這兩句分別是
   * 「要先撤回既有的那份」與「本來就沒有可撤回的認定」。
   */
  [API_ERRORS.VA_OVERTIME_EMERGENCY_ALREADY_DECLARED.code]:
    "hr_management.overtime.error_emergency_already_declared",
  [API_ERRORS.VA_OVERTIME_EMERGENCY_NOT_DECLARED.code]:
    "hr_management.overtime.error_emergency_not_declared",
  [API_ERRORS.VA_OVERTIME_REPORTED_AT_OUT_OF_RANGE.code]:
    "hr_management.overtime.error_reported_at_out_of_range",
  [API_ERRORS.VA_OVERTIME_COMP_EXPIRY_UNSET.code]:
    "hr_management.overtime.error_comp_expiry_unset",

  // Info: (20260818 - Julian) 撤回（只有申請人、只在待簽核）
  [API_ERRORS.FO_OVERTIME_NOT_APPLICANT.code]:
    "hr_management.overtime.error_not_applicant",
  [API_ERRORS.VA_OVERTIME_WITHDRAW_REASON_REQUIRED.code]:
    "hr_management.overtime.error_withdraw_reason_required",

  // Info: (20260818 - Julian) 明細與可見範圍
  [API_ERRORS.NF_OVERTIME_REQUEST.code]:
    "hr_management.overtime.error_not_found",

  /**
   * Info: (20260820 - Julian) 這三個碼由**加班的 service** 丟出，先前只登記在
   * 假單那張表（review 第 10 輪第 2 條）。
   *
   * 症狀最清楚的是 `FO_SELF_APPROVAL_FORBIDDEN`：人資對自己的加班單按下
   * 「登記天災事變」，查不到文案而落到 fallback「請確認你具備人資管理員職能
   * 且此單仍待簽核」—— 而他確實有職能、單子確實待簽核。
   *
   * 不與假單共用同一個 key：同一個碼在兩個模組要說的是不同的話
   * （「不能簽核自己送出的假單」對加班的認定動作是錯的敘述）。
   * 每一頁本來就會傳自己的 overrides，這正是那個機制存在的理由。
   */
  [API_ERRORS.FO_SELF_APPROVAL_FORBIDDEN.code]:
    "hr_management.overtime.error_self_decide",
  [API_ERRORS.FO_NOT_AUTHORIZED_REVIEWER.code]:
    "hr_management.overtime.error_not_reviewer",
  [API_ERRORS.NF_LEAVE_POLICY.code]:
    "hr_management.overtime.error_comp_policy_missing",
};
