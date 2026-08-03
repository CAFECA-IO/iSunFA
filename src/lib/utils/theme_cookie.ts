// Info: (20260802 - Luphia) 主題 cookie 的讀寫（純函數 + 一個 DOM 寫入）。
// Info: (20260802 - Luphia) 抽成模組是因為同一份規則有兩個消費者：
// Info: (20260802 - Luphia) 伺服器在 layout 決定 <html> 的 class，瀏覽器在切換時寫回。
// Info: (20260802 - Luphia) 兩邊若各自解析，遲早會對「不認得的值」有不同看法。

import {
  THEME_COOKIE_MAX_AGE_SECONDS,
  THEME_COOKIE_NAME,
  THEME_ROOT_CLASS_BY_CHOICE,
  ThemeChoice,
  ThemeModeEnum,
} from "@/constants/theme";

/**
 * Info: (20260802 - Luphia) 把 cookie 值收斂成三態之一。
 *
 * 不認得的值（使用者手動改過、舊版格式、被其他工具覆寫）一律當成「沒設定過」，
 * 而不是丟例外或猜一個 —— 主題是純粹的外觀偏好，讀不懂就回到跟隨系統，
 * 使用者最多是看到系統色，不會看到錯誤頁。
 */
export function parseThemeCookie(
  value: string | undefined,
): ThemeModeEnum.LIGHT | ThemeModeEnum.DARK | ThemeModeEnum.SYSTEM {
  if (value === ThemeModeEnum.LIGHT) return ThemeModeEnum.LIGHT;
  if (value === ThemeModeEnum.DARK) return ThemeModeEnum.DARK;
  return ThemeModeEnum.SYSTEM;
}

/**
 * Info: (20260802 - Luphia) 把不可信的值收斂成一個明確選擇，不是就回 undefined。
 *
 * 用於跨分頁廣播：訊息雖然同源，仍是本函式之外的東西送進來的，
 * 直接拿去 `classList.add()` 等於讓任何同源腳本往 <html> 塞任意 class。
 * 與 parseThemeCookie 分開是因為語意不同 —— 那個把「不認得」當成跟隨系統，
 * 這個把「不認得」當成不要動。
 */
export function toThemeChoice(value: unknown): ThemeChoice | undefined {
  if (value === ThemeModeEnum.LIGHT) return ThemeModeEnum.LIGHT;
  if (value === ThemeModeEnum.DARK) return ThemeModeEnum.DARK;
  return undefined;
}

/**
 * Info: (20260802 - Luphia) <html> 該掛的 class。跟隨系統時回空字串 ——
 * 由 globals.css 的 `prefers-color-scheme` 媒體查詢承接。
 */
export function resolveThemeRootClass(
  mode: ThemeModeEnum.LIGHT | ThemeModeEnum.DARK | ThemeModeEnum.SYSTEM,
): string {
  return mode === ThemeModeEnum.SYSTEM
    ? ""
    : THEME_ROOT_CLASS_BY_CHOICE[mode as ThemeChoice];
}

/**
 * Info: (20260802 - Luphia) 組出 `document.cookie` 的賦值字串。
 *
 * `SameSite=Lax` 而非 `Strict`：外部連結進站時仍要帶上，否則從 email
 * 點進來的第一頁會閃一下錯的主題。
 * 不設 `HttpOnly`（瀏覽器要寫），`Secure` 僅在 https 下加上 ——
 * 本機開發是 http，寫死 Secure 會讓 cookie 在開發環境靜默寫不進去。
 */
export function buildThemeCookie(
  choice: ThemeChoice,
  isSecure: boolean,
): string {
  const attributes = [
    `${THEME_COOKIE_NAME}=${choice}`,
    "path=/",
    `max-age=${THEME_COOKIE_MAX_AGE_SECONDS}`,
    "SameSite=Lax",
  ];
  if (isSecure) attributes.push("Secure");
  return attributes.join("; ");
}

/**
 * Info: (20260802 - Luphia) 從 `document.cookie` 這種 "a=1; b=2" 的字串取值。
 * 自己切而不用正則，是因為值裡若含有正則的特殊字元，
 * 用名稱組出來的樣式會意外匹配到別的 cookie。
 */
export function readThemeCookie(cookieString: string): string | undefined {
  const prefix = `${THEME_COOKIE_NAME}=`;
  const found = cookieString
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));
  return found?.slice(prefix.length);
}
