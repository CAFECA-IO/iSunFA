import { ApiError } from "@/lib/utils/request";
import { API_ERRORS } from "@/lib/utils/error_dictionary";

/**
 * Info: (20260814 - Julian) 把後端錯誤轉成使用者看得懂的說法。
 *
 * 不可直接把 `ApiError.message` 印到畫面上：`error_dictionary` 的 message 是寫給開發者的英文
 * （例如 "This schedule day was modified concurrently; retry"），而 `request()` 連網路錯誤
 * 都包成 `ApiError`，因此「有 message 就用它、否則 t() fallback」的寫法會讓 fallback 永遠不觸發，
 * 使用者一律看到英文。改為只認 `errorCode`：登記過的給專屬訊息，其餘一律回該頁的通用訊息。
 */
export const errorCodeOf = (error: unknown): string => {
  if (!(error instanceof ApiError)) return "";
  if (typeof error.data !== "object" || error.data === null) return "";
  const { errorCode } = error.data as { errorCode?: unknown };
  return typeof errorCode === "string" ? errorCode : "";
};

/**
 * Info: (20260817 - Luphia) 全模組共用的錯誤文案，不必每一頁各自登記。
 *
 * 這些碼**任何一支端點都可能回**：限流掛在全部 13 支上，職能／可見範圍閘
 * 掛在假別設定、額度、加班政策、§32 IV 認定與各種明細查詢上。
 * 而「每一頁都要記得登記」這種要求，漏掉的那一頁不會報錯 ——
 * 只會讓使用者看到「請稍後再試」，而不知道是被限流（等一下就好）
 * 還是自己沒有權限（等到明天也一樣）。那兩件事的下一步完全不同。
 *
 * Info: (20260820 - Julian) 新增三個跨模組的閘（review 第 5 輪第 3 條）。
 *
 * `FO_HR_FUNCTION_REQUIRED` 是**本輪新端點最主要的錯誤**：
 * 沒有 HR 職能的人按下「認定天災事變」會落到 fallback「認定失敗」，
 * 而他需要知道的是「這個動作要人事職能」—— 一句「認定失敗」會讓他
 * 一直重按，或去找工程師。同一個碼也擋著額度調整與所有人事設定。
 *
 * 它先前被歸到「屬人事設定畫面的文案」而略過，但那個推論錯了：
 * 觸發它的按鈕就在**已經存在**的加班待簽清單上。
 *
 * 呼叫端傳入的 `overrides` 優先，某一頁需要更具體的說法時蓋得掉。
 */
export const SHARED_ATTENDANCE_ERROR_I18N_KEY: Readonly<
  Record<string, string>
> = {
  [API_ERRORS.IS_RATE_LIMITED.code]:
    "hr_management.attendance_common.error_rate_limited",
  [API_ERRORS.FO_ATTENDANCE_SUPERVISOR_ONLY.code]:
    "hr_management.attendance_common.error_supervisor_only",
  [API_ERRORS.FO_HR_FUNCTION_REQUIRED.code]:
    "hr_management.attendance_common.error_hr_function_required",
  [API_ERRORS.FO_NO_PERMISSION_TO_VIEW_THIS.code]:
    "hr_management.attendance_common.error_no_permission_to_view",
  /**
   * Info: (20260820 - Julian) 登入的帳號在這個帳本裡沒有對應的員工。
   * 每一支假勤端點都先跑 `resolveEmployee`，因此它是所有頁面共同的第一道門
   * —— 而使用者看到的若是各頁的通用訊息（「載入失敗」），
   * 他會以為是系統壞了，而實際上是人事還沒把他建進這個帳本。
   */
  [API_ERRORS.NF_EMPLOYEE_FOR_USER.code]:
    "hr_management.attendance_common.error_no_employee_record",
};

/**
 * Info: (20260814 - Julian) `overrides` 是「錯誤碼 → i18n key」，沒登記的走 `fallbackKey`。
 * 刻意回 key 而非字串，呼叫端才會經過 `t()`，不會有人不小心把英文直接塞進畫面。
 *
 * Info: (20260817 - Luphia) 查找順序：呼叫端的 overrides → 全模組共用 → fallback。
 */
export const errorI18nKeyOf = (
  error: unknown,
  fallbackKey: string,
  overrides: Readonly<Record<string, string>> = {},
): string => {
  const code = errorCodeOf(error);
  return (
    overrides[code] ?? SHARED_ATTENDANCE_ERROR_I18N_KEY[code] ?? fallbackKey
  );
};
