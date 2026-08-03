// Info: (20260801 - Luphia) 主題模式。抽為 enum 而非散落的字串：
// Info: (20260801 - Luphia) 這些值同時是 <html> 的 class 與 cookie 的持久化內容，
// Info: (20260801 - Luphia) 打錯字不會有型別錯誤，只會讓切換靜默失效（§3 拒絕魔法字串）。

export enum ThemeModeEnum {
  LIGHT = "light",
  DARK = "dark",
  /**
   * Info: (20260802 - Luphia) 跟隨作業系統。
   * 這一態**不會寫進 cookie** —— 它就是「沒有 cookie」本身。
   * 用一個特殊值來表示「沒設定過」會多出一種要同步的狀態，
   * 而且沒設定過的新使用者本來就沒有 cookie，兩者必須是同一件事。
   */
  SYSTEM = "system",
}

/**
 * Info: (20260802 - Luphia) 使用者明確做過的選擇。與 ThemeModeEnum 分開是為了讓型別
 * 擋住「把 SYSTEM 寫進 cookie」這種錯誤，而不是靠註解提醒。
 */
export type ThemeChoice = ThemeModeEnum.LIGHT | ThemeModeEnum.DARK;

/**
 * Info: (20260802 - Luphia) 存 cookie 而非 localStorage。
 *
 * localStorage 只有瀏覽器讀得到，伺服器算不出該渲染哪一版，
 * 必須注入一段在 hydration 之前執行的同步 script 才能避免畫面一閃 ——
 * 那段 script 的時序很難自己寫對，也是 next-themes 主要在解決的問題。
 * cookie 會隨請求送到伺服器，`layout.tsx` 在 SSR 當下就能寫出正確的 class，
 * 整個問題連同那個相依一起消失。
 */
export const THEME_COOKIE_NAME = "isunfa_theme";

/** Info: (20260802 - Luphia) 一年。外觀偏好沒有過期的道理，訂這個值只是因為 cookie 一定要有上限 */
export const THEME_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

/**
 * Info: (20260802 - Luphia) 掛在 <html> 上的 class。
 *
 * 明確選淺色時也要掛 `light`，不能只是「不掛 dark」——
 * globals.css 的系統偏好回退是 `:root:not(.light)`，
 * 少了這個 class，選了淺色的使用者在深色系統下仍會看到深色。
 */
export const THEME_ROOT_CLASS_BY_CHOICE: Record<ThemeChoice, string> = {
  [ThemeModeEnum.LIGHT]: "light",
  [ThemeModeEnum.DARK]: "dark",
};

/**
 * Info: (20260802 - Luphia) 跨分頁同步的頻道名稱。
 *
 * cookie 沒有變更事件（`CookieStore` 只有 Chromium 有），所以另一個分頁改了偏好，
 * 本分頁的 <html> class 不會自己跟上 —— 使用者會看到兩個分頁不同色，
 * 而且重整才會一致。BroadcastChannel 補上這個缺口。
 *
 * 只同步「已經寫進 cookie 的選擇」，不同步任何其他狀態：
 * 頻道是同源共享的，內容應視為輸入而非指令。
 */
export const THEME_SYNC_CHANNEL_NAME = "isunfa-theme-sync";

/** Info: (20260802 - Luphia) 切換當下暫時停用全站 transition 的 class，定義於 globals.css */
export const THEME_TRANSITION_SUPPRESS_CLASS = "theme-switching";

/**
 * Info: (20260802 - Luphia) 主題不變區的 class 名稱。
 *
 * 掛上之後，該子樹的中性色階與語意 token 一律指回淺色，不隨主題切換。
 * 用途是模擬實體紙張的容器（A4 預覽、報表列印版面）—— 紙不會因為
 * 使用者把介面切成深色就變黑，而其上的 `text-black` 也不該跟著反轉。
 *
 * 實作在 `src/app/globals.css`；此處抽成常數是為了讓引用處不必寫死字串（§3）。
 * 列印時的還原不需要這個 class，`@media print` 已一律套用。
 */
export const THEME_STATIC_LIGHT_CLASS = "theme-static-light";
