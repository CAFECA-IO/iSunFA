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
};
