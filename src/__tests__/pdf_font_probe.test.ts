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

/**
 * Info: (20260801 - Luphia) 判定改以點陣特徵而非前進寬度。
 *
 * 第一版用寬度,而 CJK 字型的 .notdef 與真正的中文字同為全角,寬度必然相同。
 * 以沙箱內的實際字型檔量測(字級 100px):
 *   Noto Sans CJK  M=81.2  測=100.0  U+FFFF=100.0   → 寬度判準誤判為缺字
 *   DejaVu Sans    M=83.3  測=60.0   U+FFFF=60.0    → 寬度判準碰巧正確
 * 也就是說寬度判準在兩種環境下都回 MISSING,只是在缺字時剛好答對。
 *
 * 同一組字型的點陣特徵則能正確分辨:
 *   Noto Sans CJK  測 ink=3663 ≠ notdef ink=3133   → AVAILABLE
 *   DejaVu Sans    測 ink=1600 = notdef ink=1600(且雜湊相同) → MISSING
 * 以下常數即取自該次實測。
 */
describe("assessGlyphCoverage", () => {
  const NOTO = {
    cjk: { inkPixels: 3663, checksum: 1613468216 },
    notdef: { inkPixels: 3133, checksum: 1530947699 },
    latin: { inkPixels: 2346, checksum: 42 },
  };
  const DEJAVU = {
    cjk: { inkPixels: 1600, checksum: 2022827699 },
    notdef: { inkPixels: 1600, checksum: 2022827699 },
    latin: { inkPixels: 2651, checksum: 99 },
  };

  it("實測 Noto Sans CJK 的特徵判定為有字形", () => {
    expect(assessGlyphCoverage(NOTO)).toBe(GlyphCoverageEnum.AVAILABLE);
  });

  it("實測 DejaVu Sans 的特徵判定為缺字", () => {
    expect(assessGlyphCoverage(DEJAVU)).toBe(GlyphCoverageEnum.MISSING);
  });

  /**
   * Info: (20260801 - Luphia) 這是第一版誤判的回歸測試:
   * 中文與 .notdef 同寬(全角)但字形不同時,必須判為有字形。
   * 點陣特徵不含寬度資訊,故此案例只要雜湊不同就會正確 —— 固化它是為了防止
   * 有人「順手」把寬度比較加回來當作額外條件。
   */
  it("中文與 notdef 同寬但字形不同時仍判定有字形", () => {
    expect(
      assessGlyphCoverage({
        cjk: { inkPixels: 3663, checksum: 111 },
        notdef: { inkPixels: 3133, checksum: 222 },
        latin: { inkPixels: 2346, checksum: 333 },
      }),
    ).toBe(GlyphCoverageEnum.AVAILABLE);
  });

  it("中文完全沒畫出墨色即判定缺字(空白而非方框的情況)", () => {
    expect(
      assessGlyphCoverage({
        cjk: { inkPixels: 0, checksum: 0 },
        notdef: { inkPixels: 3133, checksum: 222 },
        latin: { inkPixels: 2346, checksum: 333 },
      }),
    ).toBe(GlyphCoverageEnum.MISSING);
  });

  /**
   * Info: (20260801 - Luphia) 墨色像素數與雜湊必須**同時**相同才算同字形。
   * 只看雜湊會有碰撞風險,只看像素數則不同字形可能碰巧同量。
   */
  it("僅墨色量相同但雜湊不同時不判為同字形", () => {
    expect(
      assessGlyphCoverage({
        cjk: { inkPixels: 1600, checksum: 111 },
        notdef: { inkPixels: 1600, checksum: 222 },
        latin: { inkPixels: 2651, checksum: 333 },
      }),
    ).toBe(GlyphCoverageEnum.AVAILABLE);
  });

  /**
   * Info: (20260801 - Luphia) 渲染管線失效時必須與「確定缺字」區分開。
   * 拉丁字必然有字形,它畫不出墨色代表 canvas 根本沒運作 ——
   * 此時中文與 notdef 也會都是空的而「相同」,混為一談會讓偵測故障時擋掉全部匯出。
   */
  it.each([
    ["拉丁字無墨色", { cjk: 0, notdef: 0, latin: 0 }],
    ["墨色數為 NaN", { cjk: Number.NaN, notdef: 3133, latin: 2346 }],
    ["墨色數為負", { cjk: -1, notdef: 3133, latin: 2346 }],
  ])("%s 時回 INDETERMINATE", (_label, ink) => {
    expect(
      assessGlyphCoverage({
        cjk: { inkPixels: ink.cjk, checksum: 1 },
        notdef: { inkPixels: ink.notdef, checksum: 2 },
        latin: { inkPixels: ink.latin, checksum: 3 },
      }),
    ).toBe(GlyphCoverageEnum.INDETERMINATE);
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
