import { describe, it, expect } from "@jest/globals";
import { API_ERRORS, IErrorDef } from "@/lib/utils/error_dictionary";
import { ApiCode } from "@/lib/utils/status";

/**
 * Info: (20260817 - Julian) 錯誤碼字典的兩條防線。
 *
 * ## 為什麼需要這支測試
 *
 * 假勤模組第一版把 `FO_SELF_APPROVAL_FORBIDDEN` 與 `FO_NOT_AUTHORIZED_REVIEWER`
 * 當成「既有代碼、沿用即可」—— 它們確實被出勤模組計畫書 §D9 點名過，
 * 但補登單從未實作，因此**從來沒有被建立**。
 *
 * `API_ERRORS.FO_SELF_APPROVAL_FORBIDDEN` 於是是 `undefined`，
 * `new AppError(undefined)` 丟出來的不是 `AppError` 而是 `TypeError` ——
 * 呼叫端拿到 500，而真正的原因是一個不存在的常數。
 *
 * tsc 抓得到這種錯（`API_ERRORS` 是物件字面值，取不存在的鍵是編譯錯誤），
 * 但當時 schema 尚未套用、`tsc --noEmit` 整包跑不起來，於是它溜了過去。
 * **這支測試的職責就是在型別檢查跑不動的期間補位。**
 *
 * ## 為什麼不檢查「代碼前綴與 ApiCode 家族一致」
 *
 * 實測既有字典裡 `IS` / `AU` / `CF` / `AC` / `TW` 五個前綴都橫跨多個家族，
 * 那是歷史演進的結果而不是缺陷。寫一條會紅的規則只會讓人把測試關掉。
 */

/**
 * Info: (20260817 - Julian) 假勤模組實際使用的每一個錯誤碼，與它應有的家族。
 *
 * 新增引用時**必須同步登記在這裡** —— 否則下一次「以為它存在」不會有人發現。
 */
const LEAVE_MODULE_ERRORS: Readonly<Record<string, ApiCode>> = {
  VA_LEAVE_INSUFFICIENT_BALANCE: ApiCode.VALIDATION_ERROR,
  VA_LEAVE_UNIT_NOT_ALIGNED: ApiCode.VALIDATION_ERROR,
  VA_LEAVE_ALREADY_REVIEWED: ApiCode.VALIDATION_ERROR,
  VA_LEAVE_CYCLE_DISADVANTAGEOUS: ApiCode.VALIDATION_ERROR,
  VA_LEAVE_ON_NON_WORKING_DAY: ApiCode.VALIDATION_ERROR,
  VA_OVERTIME_EXCEEDS_DAILY_LIMIT: ApiCode.VALIDATION_ERROR,
  VA_OVERTIME_EXCEEDS_MONTHLY_LIMIT: ApiCode.VALIDATION_ERROR,
  VA_OVERTIME_EXCEEDS_QUARTERLY_LIMIT: ApiCode.VALIDATION_ERROR,
  VA_OVERTIME_FILING_TYPE_MISMATCH: ApiCode.VALIDATION_ERROR,
  FO_SELF_APPROVAL_FORBIDDEN: ApiCode.FORBIDDEN,
  FO_NOT_AUTHORIZED_REVIEWER: ApiCode.FORBIDDEN,
  FO_LEAVE_CALENDAR_SCOPE: ApiCode.FORBIDDEN,
  FO_LEAVE_REQUEST_SCOPE: ApiCode.FORBIDDEN,
  FO_OVERTIME_ON_REGULAR_OFF: ApiCode.FORBIDDEN,
  NF_LEAVE_POLICY: ApiCode.NOT_FOUND,
  NF_LEAVE_GRANT: ApiCode.NOT_FOUND,
  NF_LEAVE_REQUEST: ApiCode.NOT_FOUND,
  NF_OVERTIME_REQUEST: ApiCode.NOT_FOUND,
  CF_LEAVE_APPROVAL_CHAIN_UNRESOLVED: ApiCode.CONFLICT,
  CF_LEAVE_DAY_ALREADY_ACTIVE: ApiCode.CONFLICT,
  CF_LEAVE_CONCURRENCY_EXCEEDED: ApiCode.CONFLICT,
  CF_LEAVE_BALANCE_RACE: ApiCode.CONFLICT,
};

const dictionary = API_ERRORS as unknown as Record<string, IErrorDef | undefined>;

describe("假勤模組引用的錯誤碼", () => {
  it.each(Object.keys(LEAVE_MODULE_ERRORS))("%s 存在且欄位完整", (key) => {
    const entry = dictionary[key];
    expect(entry).toBeDefined();
    expect(typeof entry?.code).toBe("string");
    expect(entry?.code).toMatch(/^[A-Z]{2}\d{6}$/);
    expect(typeof entry?.message).toBe("string");
    expect(entry?.message.length).toBeGreaterThan(0);
  });

  it.each(Object.entries(LEAVE_MODULE_ERRORS))(
    "%s 的 ApiCode 家族正確",
    (key, expectedStatus) => {
      expect(dictionary[key]?.status).toBe(expectedStatus);
    },
  );

  /**
   * Info: (20260817 - Julian) `httpStatusOf()` 已於 2026-08-07 收斂為讀 `HTTP_MAP`
   * （`known_issues/api_http_status_dual_mapping.md`），因此新增錯誤碼不需要
   * 人工同步 HTTP 狀態 —— 但那個保證建立在「status 是一個真的 ApiCode 成員」之上。
   */
  it("所有 status 都是 ApiCode 的成員", () => {
    const members = new Set<string>(Object.values(ApiCode));
    for (const key of Object.keys(LEAVE_MODULE_ERRORS)) {
      expect(members.has(String(dictionary[key]?.status))).toBe(true);
    }
  });
});

describe("錯誤碼字典整體", () => {
  /**
   * Info: (20260817 - Julian) 代碼重複會讓兩個不同的失敗在監控上變成同一個 ——
   * 而其中一個從此不會有人查。
   */
  it("沒有重複的代碼", () => {
    const seen = new Map<string, string>();
    const duplicates: string[] = [];
    for (const [key, entry] of Object.entries(dictionary)) {
      if (entry === undefined) continue;
      const previous = seen.get(entry.code);
      if (previous !== undefined) {
        duplicates.push(`${entry.code}: ${previous} / ${key}`);
      }
      seen.set(entry.code, key);
    }
    expect(duplicates).toEqual([]);
  });

  it("每個項目都有非空的 message（監控與前端都靠它辨識）", () => {
    const empty = Object.entries(dictionary)
      .filter(([, entry]) => entry !== undefined && !entry.message)
      .map(([key]) => key);
    expect(empty).toEqual([]);
  });
});
