// Info: (20260802 - Luphia) 主題 cookie 的解析與組裝。
// Info: (20260802 - Luphia) 這幾個函式的錯誤都是「靜默」的 —— 解析錯只會讓使用者
// Info: (20260802 - Luphia) 看到非預期的顏色，沒有例外也沒有紅字，因此必須有測試盯著。

import { describe, it, expect } from "@jest/globals";
import {
  buildThemeCookie,
  parseThemeCookie,
  readThemeCookie,
  resolveThemeRootClass,
  toThemeChoice,
} from "@/lib/utils/theme_cookie";
import { THEME_COOKIE_NAME, ThemeModeEnum } from "@/constants/theme";

describe("parseThemeCookie", () => {
  it("認得兩個明確選擇", () => {
    expect(parseThemeCookie("light")).toBe(ThemeModeEnum.LIGHT);
    expect(parseThemeCookie("dark")).toBe(ThemeModeEnum.DARK);
  });

  it("沒有 cookie 即為跟隨系統", () => {
    expect(parseThemeCookie(undefined)).toBe(ThemeModeEnum.SYSTEM);
  });

  /**
   * Info: (20260802 - Luphia) 使用者可以手動改 cookie，舊版格式也可能殘留。
   * 這些情況一律回到跟隨系統，而不是丟例外把整個 layout 炸掉。
   */
  it.each(["", "SYSTEM", "Dark", "true", "1", "dark; evil", "系統"])(
    "不認得的值 %p 視為跟隨系統",
    (value) => {
      expect(parseThemeCookie(value)).toBe(ThemeModeEnum.SYSTEM);
    },
  );
});

describe("resolveThemeRootClass", () => {
  it("明確選擇各自掛上對應 class", () => {
    expect(resolveThemeRootClass(ThemeModeEnum.LIGHT)).toBe("light");
    expect(resolveThemeRootClass(ThemeModeEnum.DARK)).toBe("dark");
  });

  /**
   * Info: (20260802 - Luphia) 跟隨系統必須是空字串而非 "system"。
   * globals.css 的回退條件是 `:root:not(.light)`，掛上任何 class 都不影響它，
   * 但掛上 "system" 會讓 CSS 出現一個沒有人定義的 class，日後極易被誤解為有作用。
   */
  it("跟隨系統時不掛任何 class", () => {
    expect(resolveThemeRootClass(ThemeModeEnum.SYSTEM)).toBe("");
  });
});

describe("buildThemeCookie", () => {
  it("帶上 path、max-age 與 SameSite", () => {
    const cookie = buildThemeCookie(ThemeModeEnum.DARK, false);
    expect(cookie).toContain(`${THEME_COOKIE_NAME}=dark`);
    expect(cookie).toContain("path=/");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toMatch(/max-age=\d+/);
  });

  /**
   * Info: (20260802 - Luphia) 本機開發是 http，寫死 Secure 會讓 cookie
   * 靜默寫不進去 —— 切換看起來有效（class 有變）但重整就回原樣。
   */
  it("僅在 https 下加上 Secure", () => {
    expect(buildThemeCookie(ThemeModeEnum.DARK, true)).toContain("Secure");
    expect(buildThemeCookie(ThemeModeEnum.DARK, false)).not.toContain("Secure");
  });
});

describe("readThemeCookie", () => {
  it("從多個 cookie 中取出目標值", () => {
    expect(readThemeCookie(`a=1; ${THEME_COOKIE_NAME}=dark; b=2`)).toBe("dark");
  });

  it("沒有目標 cookie 時回 undefined", () => {
    expect(readThemeCookie("a=1; b=2")).toBeUndefined();
  });

  /**
   * Info: (20260802 - Luphia) 名稱以目標為前綴的其他 cookie 不可誤取 ——
   * 這正是用 startsWith 比對「名稱=」而非直接找子字串的原因。
   */
  it("不會誤取名稱相近的 cookie", () => {
    expect(
      readThemeCookie(`${THEME_COOKIE_NAME}_backup=light`),
    ).toBeUndefined();
    expect(readThemeCookie(`x_${THEME_COOKIE_NAME}=light`)).toBeUndefined();
  });

  it("容忍分號後的空白", () => {
    expect(readThemeCookie(`a=1;${THEME_COOKIE_NAME}=light`)).toBe("light");
  });
});

describe("toThemeChoice", () => {
  it("認得兩個明確選擇", () => {
    expect(toThemeChoice("light")).toBe(ThemeModeEnum.LIGHT);
    expect(toThemeChoice("dark")).toBe(ThemeModeEnum.DARK);
  });

  /**
   * Info: (20260802 - Luphia) 跨分頁廣播的內容會直接影響 <html> 的 class。
   * 這裡與 parseThemeCookie 的差別是：不認得就 undefined（不要動），
   * 而不是回到跟隨系統 —— 收到雜訊時正確的反應是忽略，不是改變畫面。
   */
  it.each([
    undefined,
    null,
    "",
    "system",
    "SYSTEM",
    "Dark",
    0,
    1,
    true,
    {},
    [],
    ["dark"],
    { theme: "dark" },
  ])("不認得的值 %p 回 undefined", (value) => {
    expect(toThemeChoice(value)).toBeUndefined();
  });
});
