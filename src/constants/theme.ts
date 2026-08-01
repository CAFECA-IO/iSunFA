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
