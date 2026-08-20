import { describe, it, expect } from "@jest/globals";
import { ApiError } from "@/lib/utils/request";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import {
  errorCodeOf,
  errorI18nKeyOf,
  SHARED_ATTENDANCE_ERROR_I18N_KEY,
} from "@/lib/utils/attendance_error_message";

/**
 * Info: (20260817 - Luphia) 出勤錯誤文案的對照。
 *
 * ## 為什麼需要這一支
 *
 * `attendance_i18n_keys.test.ts` 掃的是「`src` 裡出現的 key 字面量在五個語系都有值」，
 * 它抓不到**把對照整筆刪掉**：key 不再出現在 `src` 裡，掃描器就不再掃它，一切照綠。
 * 實測確認過這件事 —— 拿掉限流那一筆，全套測試沒有任何反應。
 *
 * 於是「使用者被限流時看到的是通用的『請稍後再試』而不是『太頻繁，等一下』」
 * 這個退化沒有任何東西守著。這支補的就是那個缺口。
 *
 * ## 為什麼共用表要用碼集合斷言，而不是逐筆檢查
 *
 * 逐筆檢查只保證「登記的這幾筆是對的」，不保證「該登記的都登記了」。
 * 用集合相等，刪掉一筆或多加一筆都會紅，而多加一筆時 i18n 掃描會接手驗它的字典。
 */

const apiErrorWith = (code: string): ApiError =>
  new ApiError("developer-facing message", 400, { errorCode: code });

describe("errorCodeOf", () => {
  it("從 ApiError 的 data 取出 errorCode", () => {
    expect(errorCodeOf(apiErrorWith("IS000013"))).toBe("IS000013");
  });

  /**
   * Info: (20260817 - Luphia) `request()` 連網路錯誤都包成 `ApiError`，
   * 但那種錯誤沒有 `data.errorCode`。回空字串而非 undefined，
   * 讓呼叫端的 `??` 一定落到 fallback。
   */
  it("沒有 errorCode 的 ApiError 回空字串", () => {
    expect(errorCodeOf(new ApiError("Network error", 0))).toBe("");
  });

  it("不是 ApiError 的東西一律回空字串", () => {
    expect(errorCodeOf(new Error("boom"))).toBe("");
    expect(errorCodeOf("IS000013")).toBe("");
    expect(errorCodeOf(null)).toBe("");
  });
});

describe("errorI18nKeyOf", () => {
  const FALLBACK = "hr_management.attendance.error_load";

  it("沒登記的錯誤碼走 fallback", () => {
    expect(errorI18nKeyOf(apiErrorWith("XX999999"), FALLBACK)).toBe(FALLBACK);
  });

  /**
   * Info: (20260817 - Luphia) 這是本檔存在的主要理由：**不必每一頁各自登記**。
   * 限流掛在全部 13 支端點上，漏登記的那一頁不會報錯，
   * 只會讓使用者看到「請稍後再試」而不知道等一下就好。
   */
  it("限流錯誤不必呼叫端登記就有專屬文案", () => {
    expect(
      errorI18nKeyOf(apiErrorWith(API_ERRORS.IS_RATE_LIMITED.code), FALLBACK),
    ).toBe("hr_management.attendance_common.error_rate_limited");
  });

  /**
   * Info: (20260817 - Luphia) 主管閘的 403 同理。**這兩件事的下一步完全不同**：
   * 限流等一下就好，沒有權限等到明天也一樣 —— 共用一句「請稍後再試」會誤導。
   */
  it("主管閘的 403 也有專屬文案", () => {
    expect(
      errorI18nKeyOf(
        apiErrorWith(API_ERRORS.FO_ATTENDANCE_SUPERVISOR_ONLY.code),
        FALLBACK,
      ),
    ).toBe("hr_management.attendance_common.error_supervisor_only");
  });

  it("呼叫端的 overrides 蓋得掉共用文案", () => {
    expect(
      errorI18nKeyOf(apiErrorWith(API_ERRORS.IS_RATE_LIMITED.code), FALLBACK, {
        [API_ERRORS.IS_RATE_LIMITED.code]:
          "hr_management.attendance.error_punch",
      }),
    ).toBe("hr_management.attendance.error_punch");
  });

  it("非 ApiError 走 fallback，不會把英文開發訊息印到畫面上", () => {
    expect(
      errorI18nKeyOf(new Error("This schedule day was modified"), FALLBACK),
    ).toBe(FALLBACK);
  });
});

describe("共用文案的覆蓋範圍", () => {
  /**
   * Info: (20260817 - Luphia) 集合相等，不是「至少包含」。
   * 刪掉一筆會紅（那正是實測發現沒人守的那個退化），多加一筆也會紅，
   * 而多加時請一併更新這裡並確認五個語系都有字典（由 i18n 掃描接手）。
   */
  it("共用表恰好覆蓋這六個錯誤碼", () => {
    expect(Object.keys(SHARED_ATTENDANCE_ERROR_I18N_KEY).sort()).toEqual(
      [
        API_ERRORS.IS_RATE_LIMITED.code,
        API_ERRORS.FO_ATTENDANCE_SUPERVISOR_ONLY.code,
        /**
         * Info: (20260820 - Julian) 三個跨模組的閘（review 第 5 輪第 3 條）。
         *
         * `FO_HR_FUNCTION_REQUIRED` 是 §32 IV 認定端點最主要的錯誤，
         * 而那個按鈕就在已經存在的加班待簽清單上 —— 先前它落到 fallback
         * 「認定失敗」，按下去的人不知道自己缺的是人事職能。
         */
        API_ERRORS.FO_HR_FUNCTION_REQUIRED.code,
        API_ERRORS.FO_NO_PERMISSION_TO_VIEW_THIS.code,
        API_ERRORS.NF_EMPLOYEE_FOR_USER.code,
        /**
         * Info: (20260820 - Julian) 區間上限（review 第 7 輪 M26）。
         *
         * 三支 service 會丟它：出勤結果、排班、加班的「未核准時段」——
         * 三者都是畫面上的日期選擇器，而使用者要做的事只有一件（縮短區間）。
         * 它先前被歸在假勤覆蓋測試的豁免名單，理由寫「簽到模組的缺口」，
         * 而那個推論漏了加班那一支。放共用表，同 `NF_EMPLOYEE_FOR_USER` 的理由：
         * 跨模組、同一個判準在三個地方各擋一次。
         */
        API_ERRORS.VA_ATTENDANCE_RANGE_TOO_LARGE.code,
      ].sort(),
    );
  });

  // Info: (20260817 - Luphia) 值必須是 hr_management 命名空間的路徑，否則 t() 找不到
  it("共用表的值都掛在 hr_management 命名空間下", () => {
    const strays = Object.values(SHARED_ATTENDANCE_ERROR_I18N_KEY).filter(
      (key) => !key.startsWith("hr_management."),
    );

    expect(strays).toEqual([]);
  });
});
