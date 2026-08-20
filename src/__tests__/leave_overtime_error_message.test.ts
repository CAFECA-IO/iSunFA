import { describe, it, expect } from "@jest/globals";
import { ApiError } from "@/lib/utils/request";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { errorI18nKeyOf } from "@/lib/utils/attendance_error_message";
import { LEAVE_ERROR_I18N_KEY } from "@/lib/utils/leave_error_message";
import { OVERTIME_ERROR_I18N_KEY } from "@/lib/utils/overtime_error_message";
import { hrManagement as en } from "@/i18n/locales/en/hr_management";
import { hrManagement as ja } from "@/i18n/locales/ja/hr_management";
import { hrManagement as ko } from "@/i18n/locales/ko/hr_management";
import { hrManagement as zhCn } from "@/i18n/locales/zh_cn/hr_management";
import { hrManagement as zhTw } from "@/i18n/locales/zh_tw/hr_management";

/**
 * Info: (20260819 - Julian) 假勤錯誤文案的對照 —— **這兩張表先前零測試**（review B9）。
 *
 * ## 為什麼 i18n 掃描抓不到這個缺口
 *
 * `attendance_i18n_keys.test.ts` 掃的是「`src` 裡出現的 key 字面量在五個語系
 * 都有值」。它抓不到**把對照整筆刪掉**：key 不再出現在 `src` 裡，
 * 掃描器就不再掃它，一切照綠。`attendance_error_message.test.ts:14-20`
 * 已經把這個失效模式寫下來，並實測確認過（拿掉限流那一筆，全套測試沒有反應）——
 * 但那支只守出勤那張表，假單與加班這兩張沒有人守。
 *
 * 症狀是使用者被擋下時看到的是通用的「操作失敗」而不是
 * 「這一季超過 138 小時」——**而那正是他唯一能據以行動的那句話**。
 *
 * ## 為什麼用「碼集合相等」而不是逐筆檢查
 *
 * 逐筆檢查只保證「登記的這幾筆是對的」，不保證「該登記的都登記了」。
 * 集合相等的話，刪掉一筆或多加一筆都會紅；多加一筆時 i18n 掃描接手驗它的字典。
 */

const DICTIONARIES: Record<string, Record<string, unknown>> = {
  en,
  ja,
  ko,
  zh_cn: zhCn,
  zh_tw: zhTw,
};

/** Info: (20260819 - Julian) `hr_management.leave.error_x` → 在該語系字典裡取值 */
const lookup = (
  dictionary: Record<string, unknown>,
  key: string,
): unknown => {
  const path = key.replace(/^hr_management\./, "").split(".");
  let cursor: unknown = dictionary;
  for (const segment of path) {
    if (typeof cursor !== "object" || cursor === null) return undefined;
    cursor = (cursor as Record<string, unknown>)[segment];
  }
  return cursor;
};

/**
 * Info: (20260819 - Julian) 這兩張表**必須**登記的碼。
 *
 * 寫死一份名單而不是從對照表自己算 —— 從被測物推導期望值，等於問它
 * 「你等於你自己嗎」（checklist §1.9）。刪掉任何一筆，下面的集合相等就會紅。
 */
const EXPECTED_LEAVE_CODES: readonly string[] = [
  API_ERRORS.VA_LEAVE_INSUFFICIENT_BALANCE.code,
  API_ERRORS.VA_LEAVE_UNIT_NOT_ALIGNED.code,
  API_ERRORS.VA_LEAVE_ON_NON_WORKING_DAY.code,
  API_ERRORS.CF_LEAVE_APPROVAL_CHAIN_UNRESOLVED.code,
  API_ERRORS.CF_LEAVE_DAY_ALREADY_ACTIVE.code,
  API_ERRORS.CF_LEAVE_CONCURRENCY_EXCEEDED.code,
  API_ERRORS.NF_LEAVE_POLICY.code,
  API_ERRORS.FO_SELF_APPROVAL_FORBIDDEN.code,
  API_ERRORS.FO_NOT_AUTHORIZED_REVIEWER.code,
  API_ERRORS.VA_LEAVE_ALREADY_REVIEWED.code,
  API_ERRORS.CF_LEAVE_BALANCE_RACE.code,
  API_ERRORS.FO_LEAVE_REQUEST_SCOPE.code,
  API_ERRORS.NF_LEAVE_REQUEST.code,
];

const EXPECTED_OVERTIME_CODES: readonly string[] = [
  API_ERRORS.VA_OVERTIME_FILING_TYPE_MISMATCH.code,
  API_ERRORS.FO_OVERTIME_ON_REGULAR_OFF.code,
  API_ERRORS.VA_OVERTIME_DAY_NOT_SCHEDULED.code,
  API_ERRORS.VA_OVERTIME_PREMIUM_UNDEFINED.code,
  API_ERRORS.VA_OVERTIME_EXCEEDS_DAILY_LIMIT.code,
  API_ERRORS.VA_OVERTIME_EXCEEDS_MONTHLY_LIMIT.code,
  API_ERRORS.VA_OVERTIME_EXCEEDS_QUARTERLY_LIMIT.code,
  API_ERRORS.VA_OVERTIME_ALREADY_REVIEWED.code,
  API_ERRORS.VA_OVERTIME_RECLASSIFIED_MIDWAY.code,
  API_ERRORS.VA_OVERTIME_EMERGENCY_ALREADY_DECLARED.code,
  API_ERRORS.VA_OVERTIME_EMERGENCY_NOT_DECLARED.code,
  API_ERRORS.VA_OVERTIME_COMP_EXPIRY_UNSET.code,
  API_ERRORS.FO_OVERTIME_NOT_APPLICANT.code,
  API_ERRORS.VA_OVERTIME_WITHDRAW_REASON_REQUIRED.code,
  API_ERRORS.NF_OVERTIME_REQUEST.code,
];

const TABLES: readonly [string, Readonly<Record<string, string>>, readonly string[]][] = [
  ["假單", LEAVE_ERROR_I18N_KEY, EXPECTED_LEAVE_CODES],
  ["加班", OVERTIME_ERROR_I18N_KEY, EXPECTED_OVERTIME_CODES],
];

describe.each(TABLES)("%s 錯誤對照表", (_label, table, expected) => {
  it("登記的碼與名單完全相同（刪一筆或多一筆都會紅）", () => {
    expect(Object.keys(table).sort()).toEqual([...expected].sort());
  });

  it("每一個碼都真的存在於錯誤字典裡", () => {
    const known = new Set(
      Object.values(API_ERRORS).map((entry) => entry.code),
    );
    for (const code of Object.keys(table)) expect(known.has(code)).toBe(true);
  });

  it("每一個 i18n key 在五個語系都有字串", () => {
    for (const [code, key] of Object.entries(table)) {
      for (const [locale, dictionary] of Object.entries(DICTIONARIES)) {
        const value = lookup(dictionary, key);
        expect(
          typeof value === "string" && value.trim().length > 0,
        ).toBe(true);
        if (typeof value !== "string") {
          throw new Error(`${locale} 缺 ${key}（碼 ${code}）`);
        }
      }
    }
  });

  /**
   * Info: (20260819 - Julian) 兩個碼不得對到同一句話。
   *
   * 「這一季超過 138 小時」與「今天超過 12 小時」的下一步不同：前者要等下一季、
   * 後者只要縮短今天的時數。指到同一個 key 等於把診斷資訊丟掉，
   * 而畫面上看起來完全正常。
   */
  it("沒有兩個碼共用同一個 key", () => {
    const keys = Object.values(table);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

/**
 * Info: (20260819 - Julian) 對照表要**真的被 `errorI18nKeyOf` 用到**。
 *
 * 上面三條驗的是表的內容；這一條驗的是它有沒有被接上去 —— 同 review B9
 * 對限流的觀察：「改的是那支函式，不是它有沒有被接上去」。
 */
describe("errorI18nKeyOf 真的會查這兩張表", () => {
  const apiErrorWith = (code: string): ApiError =>
    new ApiError("developer-facing", 400, { errorCode: code });

  it.each(TABLES)("%s：查得到就回登記的 key", (_label, table) => {
    const [code, key] = Object.entries(table)[0];
    expect(errorI18nKeyOf(apiErrorWith(code), "fallback.key", table)).toBe(key);
  });

  it("查不到的碼落到 fallback，而不是回空字串或碼本身", () => {
    expect(
      errorI18nKeyOf(
        apiErrorWith("ZZ999999"),
        "hr_management.overtime.error_decide",
        OVERTIME_ERROR_I18N_KEY,
      ),
    ).toBe("hr_management.overtime.error_decide");
  });

  /**
   * Info: (20260819 - Julian) 限流（429）與主管閘（403）由共用表接住，
   * 兩張模組表刻意不重複登記。這一條把那個分工寫下來 ——
   * 有人日後在這裡補一筆限流，共用表那一筆就會變成死碼。
   */
  it("限流不在模組表裡（由共用表接住）", () => {
    expect(LEAVE_ERROR_I18N_KEY[API_ERRORS.IS_RATE_LIMITED.code]).toBeUndefined();
    expect(
      OVERTIME_ERROR_I18N_KEY[API_ERRORS.IS_RATE_LIMITED.code],
    ).toBeUndefined();
    expect(
      errorI18nKeyOf(
        apiErrorWith(API_ERRORS.IS_RATE_LIMITED.code),
        "fallback.key",
        OVERTIME_ERROR_I18N_KEY,
      ),
    ).not.toBe("fallback.key");
  });
});
