import { API_ERRORS } from "@/lib/utils/error_dictionary";

/**
 * Info: (20260818 - Julian) 假勤畫面的「錯誤碼 → i18n key」對照。
 *
 * ## 為什麼需要它
 *
 * `error_dictionary` 的 `message` 是**寫給開發者的英文**
 * （例："Leave cannot be taken on a day without a working shift"）。
 * 第一版的假勤畫面清一色寫成 `error instanceof ApiError ? error.message : t(fallback)`，
 * 也就是把那句英文原封不動印在使用者眼前 —— 而看到它的人既讀不懂、
 * 也不知道下一步該做什麼。
 *
 * ## 為什麼不共用一句「操作失敗」
 *
 * 這些碼的**下一步完全不同**：額度不足要改天數、非上班日要改日期、
 * 不是當前簽核者要等上一關、簽核鏈展不開則要找人資改設定 ——
 * 最後一個甚至不是使用者自己能解決的。折成同一句話等於把診斷資訊丟掉。
 *
 * ## 傳法
 *
 * 當成 `errorI18nKeyOf(error, fallbackKey, LEAVE_ERROR_I18N_KEY)` 的第三個參數。
 * 查找順序是「呼叫端 overrides → 全模組共用 → fallback」，因此限流（429）與
 * 主管閘（403）這兩個**任何端點都可能回**的碼由 `SHARED_ATTENDANCE_ERROR_I18N_KEY`
 * 接住，不必在這裡重複登記。
 *
 * ToDo: (20260818 - Julian) `VA_LEAVE_APPROVAL_RULE_INVALID` 與
 * `VA_LEAVE_GENERAL_RULE_REQUIRED` 刻意不在此列：service 會把不變式的原文
 * 覆寫進 `message`（「區間有洞 [3, 5)」與「最後一條不得有上界」是兩個不同的修法，
 * 共用一句泛用訊息等於只說「存不進去」），而那些原文目前是英文。
 * 簽核規則設定畫面（L31／L32）做出來時要一併決定：把不變式訊息翻成五語系，
 * 或改成回結構化的 `payload` 讓前端自己組句。在那之前這兩個碼沒有畫面會碰到。
 */
export const LEAVE_ERROR_I18N_KEY: Readonly<Record<string, string>> = {
  // Info: (20260818 - Julian) 送出假單
  [API_ERRORS.VA_LEAVE_INSUFFICIENT_BALANCE.code]:
    "hr_management.leave.error_insufficient_balance",
  [API_ERRORS.VA_LEAVE_UNIT_NOT_ALIGNED.code]:
    "hr_management.leave.error_unit_not_aligned",
  [API_ERRORS.VA_LEAVE_ON_NON_WORKING_DAY.code]:
    "hr_management.leave.error_non_working_day",
  [API_ERRORS.CF_LEAVE_APPROVAL_CHAIN_UNRESOLVED.code]:
    "hr_management.leave.error_chain_unresolved",
  [API_ERRORS.CF_LEAVE_DAY_ALREADY_ACTIVE.code]:
    "hr_management.leave.error_day_already_active",
  [API_ERRORS.CF_LEAVE_CONCURRENCY_EXCEEDED.code]:
    "hr_management.leave.error_concurrency_exceeded",
  // Info: (20260820 - Julian) review 第 5 輪 M2：併休規則本身設定壞了
  [API_ERRORS.VA_LEAVE_CONCURRENCY_RULE_INVALID.code]:
    "hr_management.leave.error_concurrency_rule_invalid",
  [API_ERRORS.NF_LEAVE_POLICY.code]:
    "hr_management.leave.error_policy_not_found",

  // Info: (20260818 - Julian) 簽核
  [API_ERRORS.FO_SELF_APPROVAL_FORBIDDEN.code]:
    "hr_management.leave.error_self_approval",
  [API_ERRORS.FO_NOT_AUTHORIZED_REVIEWER.code]:
    "hr_management.leave.error_not_reviewer",
  [API_ERRORS.VA_LEAVE_ALREADY_REVIEWED.code]:
    "hr_management.leave.error_already_reviewed",
  [API_ERRORS.CF_LEAVE_BALANCE_RACE.code]:
    "hr_management.leave.error_balance_race",

  // Info: (20260818 - Julian) 明細與可見範圍
  [API_ERRORS.FO_LEAVE_REQUEST_SCOPE.code]:
    "hr_management.leave.error_request_scope",
  [API_ERRORS.NF_LEAVE_REQUEST.code]:
    "hr_management.leave.error_request_not_found",
};
