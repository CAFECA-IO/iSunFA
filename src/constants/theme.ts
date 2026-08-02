// Info: (20260801 - Luphia) 主題模式。抽為 enum 而非散落的字串:
// Info: (20260801 - Luphia) 這些值同時是 next-themes 的 API 契約與 localStorage 的持久化內容,
// Info: (20260801 - Luphia) 打錯字不會有型別錯誤,只會讓切換靜默失效(§3 拒絕魔法字串)。

export enum ThemeModeEnum {
  LIGHT = "light",
  DARK = "dark",
  /** Info: (20260801 - Luphia) 跟隨作業系統;next-themes 會據此監聽 prefers-color-scheme */
  SYSTEM = "system",
}

/**
 * Info: (20260801 - Luphia) 切換器的顯示順序。
 * 淺色 → 深色 → 跟隨系統:前兩者是明確選擇,「跟隨系統」是放棄選擇回到預設,故置末。
 */
export const THEME_MODE_ORDER = [
  ThemeModeEnum.LIGHT,
  ThemeModeEnum.DARK,
  ThemeModeEnum.SYSTEM,
] as const;

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
