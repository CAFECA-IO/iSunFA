import { ApiError } from "@/lib/utils/request";

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
 * Info: (20260814 - Julian) `overrides` 是「錯誤碼 → i18n key」，沒登記的走 `fallbackKey`。
 * 刻意回 key 而非字串，呼叫端才會經過 `t()`，不會有人不小心把英文直接塞進畫面。
 */
export const errorI18nKeyOf = (
  error: unknown,
  fallbackKey: string,
  overrides: Readonly<Record<string, string>> = {},
): string => overrides[errorCodeOf(error)] ?? fallbackKey;
