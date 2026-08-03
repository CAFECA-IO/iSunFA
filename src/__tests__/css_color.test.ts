// Info: (20260802 - Tzuhan) CSS 色值轉換(mermaid 的 lab()/oklch() 崩潰修正)
// Info: (20260802 - Tzuhan) 現場:主題色票以現代色彩空間定義,SVG 屬性吃得下,但 mermaid 會在 JS 內
// Info: (20260802 - Tzuhan) 解析 themeVariables 推導衍生色,其色彩函式庫不認得 lab(),
// Info: (20260802 - Tzuhan) 於是 initialize 拋錯、報告預覽整頁掛掉。

import { describe, it, expect } from "@jest/globals";
import { resolveCssColorToHex, rgbToHex } from "@/lib/utils/css_color";

describe("rgbToHex", () => {
  it("補足兩位並轉小寫", () => {
    expect(rgbToHex(0, 0, 0)).toBe("#000000");
    expect(rgbToHex(255, 255, 255)).toBe("#ffffff");
    expect(rgbToHex(21, 44, 91)).toBe("#152c5b");
  });

  it("超出範圍夾到 0~255(不產生非法色碼)", () => {
    expect(rgbToHex(-10, 300, 128)).toBe("#00ff80");
  });

  it("小數四捨五入(canvas 讀回的值理論上為整數,仍不假設)", () => {
    expect(rgbToHex(127.6, 0.4, 63.5)).toBe("#800040");
  });
});

describe("resolveCssColorToHex", () => {
  it("已是十六進位就原樣回傳(最常見的情況,不必動用 canvas)", () => {
    expect(resolveCssColorToHex("#152C5B", "#000000")).toBe("#152c5b");
  });

  it("空字串回 fallback", () => {
    expect(resolveCssColorToHex("   ", "#abcdef")).toBe("#abcdef");
  });

  /**
   * Info: (20260802 - Tzuhan) jsdom 沒有 canvas 2d context,故此處驗的是「無法解析時的行為」:
   * 回 fallback 而非拋錯。這正是實際環境失敗時該有的降級 ——
   * 一張顏色略有差異的圖仍是可用的圖,拋錯會讓整份報告預覽消失,兩者代價不對等。
   */
  it("環境無法解析時回 fallback,不拋錯", () => {
    expect(() =>
      resolveCssColorToHex("lab(14.5749% -.231504 -10.8736)", "#152c5b"),
    ).not.toThrow();
    expect(
      resolveCssColorToHex("lab(14.5749% -.231504 -10.8736)", "#152c5b"),
    ).toBe("#152c5b");
  });

  it("oklch 同樣走降級路徑而非拋錯", () => {
    expect(resolveCssColorToHex("oklch(0.62 0.19 259)", "#ff9800")).toBe(
      "#ff9800",
    );
  });
});
