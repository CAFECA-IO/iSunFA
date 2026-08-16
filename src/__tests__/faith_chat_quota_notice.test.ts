import { describe, it, expect } from "@jest/globals";
import {
  FIVE_HOURS_SEC,
  QUOTA_EXCEEDED_OPTION,
  QUOTA_WINDOW,
} from "@/constants/subscription_quota";
import type { IQuotaExceededPayload } from "@/interfaces/team_wallet";
import {
  describeQuotaCountdown,
  isQuotaExceededPayload,
  parseQuotaExceededError,
  quotaRemainingPercent,
  resolveQuotaResetAt,
} from "@/lib/quota/quota_notice";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { ApiError as RequestApiError } from "@/lib/utils/request";
import { parsePersonalPaymentRequired } from "@/hooks/use_carbon_chat.helpers";

/**
 * Info: (20260812 - Luphia) 費思對話「點數用罄」前端提示的純函式層測試。
 * 這一層決定用戶看到的是「額度用完，X 後恢復 + 導購」還是通用錯誤文案，
 * 因此重點在：只認得自己的錯誤碼、payload 形狀不符時 fail closed、倒數數學正確。
 */

const NOW_SEC = 1786500000;

const payload = (
  overrides: Partial<IQuotaExceededPayload> = {},
): IQuotaExceededPayload => ({
  exceeded: QUOTA_WINDOW.PER_5H,
  quota5h: { limit: "100", used: "100", resetAt: NOW_SEC + FIVE_HOURS_SEC },
  quotaWeek: { limit: "750", used: "312", resetAt: NOW_SEC + 3 * 86400 },
  allocationBalance: "0",
  // Info: (20260815 - Luphia) 一般的額度用罄：等重置就會好（第二輪 C-5）
  exceedsWindowLimit: false,
  options: [
    QUOTA_EXCEEDED_OPTION.WAIT_RESET,
    QUOTA_EXCEEDED_OPTION.USE_PERSONAL_WALLET,
  ],
  ...overrides,
});

const quotaApiError = (body: unknown) =>
  new RequestApiError("Team subscription quota exceeded", 402, body);

describe("parseQuotaExceededError", () => {
  it("extracts the payload from a 402 TW_QUOTA_EXCEEDED response", () => {
    const error = quotaApiError({
      success: false,
      errorCode: API_ERRORS.TW_QUOTA_EXCEEDED.code,
      payload: payload(),
    });

    expect(parseQuotaExceededError(error)).toEqual(payload());
  });

  it("ignores other API errors so they keep the generic error copy", () => {
    const error = quotaApiError({
      success: false,
      errorCode: API_ERRORS.IS_LLM_QUOTA_EXCEEDED.code,
      payload: payload(),
    });

    expect(parseQuotaExceededError(error)).toBeNull();
  });

  it("ignores non-API errors (network / thrown Error)", () => {
    expect(parseQuotaExceededError(new Error("boom"))).toBeNull();
    expect(parseQuotaExceededError(undefined)).toBeNull();
  });

  /**
   * Info: (20260812 - Luphia) fail closed：payload 缺欄位時回 null 而非半套物件。
   * 放行半套物件的後果是畫面直接寫出「將於 NaN:NaN:NaN 後恢復」。
   */
  it("rejects a malformed payload instead of rendering a broken countdown", () => {
    const error = quotaApiError({
      errorCode: API_ERRORS.TW_QUOTA_EXCEEDED.code,
      payload: { exceeded: QUOTA_WINDOW.PER_5H, quota5h: { limit: "100" } },
    });

    expect(parseQuotaExceededError(error)).toBeNull();
  });

  it("rejects unknown window ids and unknown options", () => {
    expect(isQuotaExceededPayload(payload())).toBe(true);
    expect(
      isQuotaExceededPayload({ ...payload(), exceeded: "PER_MONTH" }),
    ).toBe(false);
    expect(
      isQuotaExceededPayload({ ...payload(), options: ["FREE_LUNCH"] }),
    ).toBe(false);
  });

  it("rejects a resetAt that is not a finite number", () => {
    const broken = payload();
    expect(
      isQuotaExceededPayload({
        ...broken,
        quota5h: { ...broken.quota5h, resetAt: Number.NaN },
      }),
    ).toBe(false);
    expect(
      isQuotaExceededPayload({
        ...broken,
        quota5h: { ...broken.quota5h, resetAt: "1786518000" },
      }),
    ).toBe(false);
  });
});

describe("resolveQuotaResetAt", () => {
  it("reads the 5h window when the 5h window is the one exceeded", () => {
    expect(resolveQuotaResetAt(payload())).toBe(NOW_SEC + FIVE_HOURS_SEC);
  });

  /**
   * Info: (20260812 - Luphia) 週額度用罄時報 5h 的 resetAt 會讓用戶白等一場——
   * 5 小時後回來仍然被擋。
   */
  it("reads the week window when the week quota is the one exceeded", () => {
    expect(
      resolveQuotaResetAt(payload({ exceeded: QUOTA_WINDOW.PER_WEEK })),
    ).toBe(NOW_SEC + 3 * 86400);
  });
});

describe("describeQuotaCountdown", () => {
  it("breaks the remaining seconds into d/h/m/s", () => {
    expect(describeQuotaCountdown(NOW_SEC + 3661, NOW_SEC)).toEqual({
      expired: false,
      totalSeconds: 3661,
      days: 0,
      hours: 1,
      minutes: 1,
      seconds: 1,
    });
  });

  it("separates days so a week-long wait stays readable", () => {
    const countdown = describeQuotaCountdown(
      NOW_SEC + 3 * 86400 + 7200,
      NOW_SEC,
    );
    expect(countdown.days).toBe(3);
    expect(countdown.hours).toBe(2);
  });

  it("clamps a past resetAt to expired instead of counting backwards", () => {
    const countdown = describeQuotaCountdown(NOW_SEC - 10, NOW_SEC);
    expect(countdown).toEqual({
      expired: true,
      totalSeconds: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    });
  });

  it("flags the exact reset second as expired so the input unlocks", () => {
    expect(describeQuotaCountdown(NOW_SEC, NOW_SEC).expired).toBe(true);
  });
});

/**
 * Info: (20260813 - Luphia) 額度儀表的剩餘百分比（團隊錢包面板與費思提示共用）。
 *
 * 這一層正是「錢包頁顯示 30%、費思卻擋下」那份客訴的雙方數字來源：
 * 儀表報的是剩餘額度，擋下的原因是預扣上界超過剩餘——兩者都對，必須都能算對。
 */
describe("quotaRemainingPercent", () => {
  it("reports remaining, not used", () => {
    // Info: (20260813 - Luphia) free 方案每 5 小時 10 點、已用 7 → 剩 30%（截圖中的數字）
    expect(quotaRemainingPercent("10", "7")).toBe(30);
    expect(quotaRemainingPercent("40", "7")).toBe(83);
    expect(quotaRemainingPercent("10", "0")).toBe(100);
  });

  it("clamps a fully consumed or over-consumed window to 0", () => {
    expect(quotaRemainingPercent("10", "10")).toBe(0);
    expect(quotaRemainingPercent("10", "12")).toBe(0);
  });

  /**
   * Info: (20260813 - Luphia) 額度為 0 時儀表要是空的：回 100 會讓沒有額度的方案
   * 顯示成滿格，正好與事實相反。
   */
  it("treats a zero or unparsable limit as empty", () => {
    expect(quotaRemainingPercent("0", "0")).toBe(0);
    expect(quotaRemainingPercent("", "0")).toBe(0);
    expect(quotaRemainingPercent("abc", "1")).toBe(0);
    expect(quotaRemainingPercent("10", "abc")).toBe(0);
  });
});

/**
 * Info: (20260813 - Luphia) 無帳本會話的待付款 402（設計書 §5.5）。
 * 這一層決定用戶看到的是「付款後自動繼續」還是一句系統錯誤——
 * 沒有 orderId 就無從付款，形狀不符必須 fail closed。
 */
describe("parsePersonalPaymentRequired", () => {
  const paymentError = (body: unknown) =>
    new RequestApiError("Personal credit payment required", 402, body);

  it("extracts the pending order from a TW_PERSONAL_PAYMENT_REQUIRED response", () => {
    const error = paymentError({
      errorCode: API_ERRORS.TW_PERSONAL_PAYMENT_REQUIRED.code,
      payload: { orderId: "order-1", cost: 6 },
    });

    expect(parsePersonalPaymentRequired(error)).toEqual({
      orderId: "order-1",
      cost: 6,
    });
  });

  it("ignores the team quota error, which has a different remedy", () => {
    const error = paymentError({
      errorCode: API_ERRORS.TW_QUOTA_EXCEEDED.code,
      payload: { orderId: "order-1", cost: 6 },
    });

    expect(parsePersonalPaymentRequired(error)).toBeNull();
  });

  it("rejects a payload without a usable order", () => {
    for (const payload of [
      null,
      {},
      { orderId: "order-1" },
      { orderId: 1, cost: 6 },
      { orderId: "order-1", cost: "6" },
    ]) {
      const error = paymentError({
        errorCode: API_ERRORS.TW_PERSONAL_PAYMENT_REQUIRED.code,
        payload,
      });
      expect(parsePersonalPaymentRequired(error)).toBeNull();
    }
  });

  /**
   * Info: (20260815 - Luphia) 缺少 `exceedsWindowLimit` 的 payload 一律不採信（第二輪 C-5）。
   * 這個旗標決定畫面要不要顯示倒數；缺了它而預設「等重置就會好」，
   * 正是這條 finding 要修掉的誤導。
   */
  it("rejects a payload without the window-limit flag", () => {
    const incomplete = payload();
    delete (incomplete as Partial<IQuotaExceededPayload>).exceedsWindowLimit;

    expect(isQuotaExceededPayload(incomplete)).toBe(false);
  });
});
