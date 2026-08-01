import { describe, expect, it } from "@jest/globals";
import {
  assessGlyphCoverage,
  containsCjk,
  GlyphCoverageEnum,
  shouldBlockForMissingGlyphs,
} from "@/lib/utils/pdf_font_probe";
import {
  PDF_FONT_PROBE_NOTDEF_REFERENCE,
  PDF_FONT_STACK,
} from "@/constants/pdf_font";

/**
 * Info: (20260801 - Luphia) 這組測試固化的是一次實測事故:
 * 伺服器 `fc-list :lang=zh` 只有 X11 點陣字 `Fixed`,沒有任何真正的 CJK 字型,
 * 於是 R01-AIR 報告的「台北市政府」「曼徹斯特博物館」全數渲染成空心方框,
 * 而流程回報產生成功。偵測邏輯是唯一能讓這件事不再靜默發生的東西,故必須有測試。
 */
describe("PDF_FONT_STACK", () => {
  /**
   * Info: (20260801 - Luphia) 堆疊會被嵌進 dpp 頁尾的 `style="..."` 行內屬性。
   * 家族名若用雙引號會提前結束屬性值,整段樣式靜默失效 —— 沒有錯誤訊息,只是不套用。
   */
  it("家族名不含雙引號(否則會破壞行內 style 屬性)", () => {
    expect(PDF_FONT_STACK).not.toContain('"');
  });

  /**
   * Info: (20260801 - Luphia) 先前只寫 Google Fonts 的網頁名 "Noto Sans TC",
   * 而 Linux 上 apt fonts-noto-cjk 的家族名是 "Noto Sans CJK TC" —— 不同字串不會匹配。
   */
  it("涵蓋 Linux 上 fonts-noto-cjk 的真實家族名", () => {
    expect(PDF_FONT_STACK).toContain("'Noto Sans CJK TC'");
  });

  it("保留各平台繁中家族名與最終 sans-serif 備援", () => {
    ["'PingFang TC'", "'Microsoft JhengHei'", "sans-serif"].forEach((family) =>
      expect(PDF_FONT_STACK).toContain(family),
    );
  });

  /**
   * Info: (20260801 - Luphia) 對照字元必須是 U+FFFF 這個 Unicode 永久保留的 noncharacter。
   * 換成任何「看起來很少用」的字都不行 —— 只要某個字型剛好有那個字形,整個判定就反了。
   */
  it("notdef 對照字元為 U+FFFF 且僅一個碼位", () => {
    expect(PDF_FONT_PROBE_NOTDEF_REFERENCE).toHaveLength(1);
    expect(PDF_FONT_PROBE_NOTDEF_REFERENCE.codePointAt(0)).toBe(0xffff);
  });
});

describe("containsCjk", () => {
  it.each(["台北市政府", "曼徹斯特博物館", "逐段路徑圖", "方案總排放"])(
    "%s 判定為含中文",
    (text) => expect(containsCjk(text)).toBe(true),
  );

  // Info: (20260801 - Luphia) 純拉丁報告即使環境無中文字型也能正確輸出,不該被擋
  it.each([
    "Manchester Airport",
    "R01-AIR Air Multimodal",
    "5,880.97 kg CO2e · 2026-08-01",
  ])("%s 判定為不含中文", (text) => expect(containsCjk(text)).toBe(false));
});

describe("assessGlyphCoverage", () => {
  /**
   * Info: (20260801 - Luphia) 實測情境:DejaVu Sans 沒有中文字形,
   * 中文字與 U+FFFF 都落在同一個 .notdef 方框上,量得同寬。
   */
  it("中文與 notdef 同寬即判定缺字", () => {
    expect(assessGlyphCoverage({ cjk: 63.5, notdef: 63.5, latin: 83.4 })).toBe(
      GlyphCoverageEnum.MISSING,
    );
  });

  // Info: (20260801 - Luphia) measureText 回浮點數,次像素差異不該被誤判為有字形
  it("次像素級差異仍判定缺字", () => {
    expect(
      assessGlyphCoverage({ cjk: 63.5, notdef: 63.4999, latin: 83.4 }),
    ).toBe(GlyphCoverageEnum.MISSING);
  });

  // Info: (20260801 - Luphia) 有中文字型時中文為全角(1em),.notdef 方框約 0.6em
  it("中文為全角寬度時判定有字形", () => {
    expect(assessGlyphCoverage({ cjk: 100, notdef: 60, latin: 83.4 })).toBe(
      GlyphCoverageEnum.AVAILABLE,
    );
  });

  it("中文寬度為零即判定缺字", () => {
    expect(assessGlyphCoverage({ cjk: 0, notdef: 60, latin: 83.4 })).toBe(
      GlyphCoverageEnum.MISSING,
    );
  });

  /**
   * Info: (20260801 - Luphia) 量測本身失效時必須與「確定缺字」區分開。
   * 兩者混為一談的後果是偵測故障時靜默擋掉全部匯出,或反之靜默放過全部。
   */
  it.each([
    ["拉丁字寬度為零", { cjk: 0, notdef: 0, latin: 0 }],
    ["notdef 寬度為零", { cjk: 100, notdef: 0, latin: 83 }],
    ["寬度為 NaN", { cjk: Number.NaN, notdef: 60, latin: 83 }],
  ])("%s 時回 INDETERMINATE", (_label, widths) => {
    expect(assessGlyphCoverage(widths)).toBe(GlyphCoverageEnum.INDETERMINATE);
  });
});

describe("shouldBlockForMissingGlyphs", () => {
  it("含中文且確定缺字才擋下", () => {
    expect(shouldBlockForMissingGlyphs(GlyphCoverageEnum.MISSING, true)).toBe(
      true,
    );
  });

  it.each([
    ["純拉丁報告即使缺字也不擋", GlyphCoverageEnum.MISSING, false],
    ["有字形時不擋", GlyphCoverageEnum.AVAILABLE, true],
    // Info: (20260801 - Luphia) 診斷功能不該成為匯出的單點故障
    ["無法判定時不擋", GlyphCoverageEnum.INDETERMINATE, true],
  ])("%s", (_label, coverage, hasCjk) => {
    expect(shouldBlockForMissingGlyphs(coverage, hasCjk)).toBe(false);
  });
});
