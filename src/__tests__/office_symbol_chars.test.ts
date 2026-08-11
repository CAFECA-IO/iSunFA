/**
 * Info: (20260811 - Emily) Word 私有區符號(issue_drafts/open/20 第 1 張票)。
 *
 * 樣本取自 UAT 那份報告 3.4 節:原文的項目符號是 Wingdings 的實心圓,
 * Word 存成 PDF 寫的是 U+F06C。私有區沒有任何字型有字形,
 * 所以裝字型解決不了 —— 預覽與 PDF 都是空心方框,實測 57 個。
 */
import { describe, it, expect } from "@jest/globals";
import {
  replaceOfficeSymbolChars,
  unmappedPrivateUseChars,
} from "@/lib/utils/office_symbol_chars";

// Info: (20260811 - Emily) 私有區字元在原始碼裡是看不見的,一律以 \uXXXX 表示 ——
// Info: (20260811 - Emily) 我第一版把 U+F0FE 當成「未對應」的例子,而它其實在對照表裡(Wingdings þ → ☑),
// Info: (20260811 - Emily) 測試因此紅了。看不見的字元用肉眼審查不出這種錯。
const WINGDINGS_CIRCLE = "\uF06C"; // Wingdings l → ●
const SYMBOL_BULLET = "\uF0B7"; // Symbol · → •
const UNMAPPED_A = "\uF0FF"; // 對照表裡沒有
const UNMAPPED_B = "\uF0FD"; // 對照表裡沒有

describe("replaceOfficeSymbolChars", () => {
  it("should replace the Wingdings bullet with a real black circle", () => {
    const line = `${WINGDINGS_CIRCLE} 緊急發電機柴油`;

    expect(replaceOfficeSymbolChars(line)).toBe("● 緊急發電機柴油");
  });

  it("should replace every occurrence, wherever it sits in the line", () => {
    const line = `1.5.2 盤查地址： ${WINGDINGS_CIRCLE} 總公司 ${WINGDINGS_CIRCLE} 台北分公司`;

    const out = replaceOfficeSymbolChars(line);

    expect(out).toBe("1.5.2 盤查地址： ● 總公司 ● 台北分公司");
    expect(out).not.toContain(WINGDINGS_CIRCLE);
  });

  it("should not change the length of the text", () => {
    const line = `${WINGDINGS_CIRCLE} 滅火器 ${SYMBOL_BULLET} 公務車之冷媒`;

    expect(replaceOfficeSymbolChars(line)).toHaveLength(line.length);
  });

  it("should be idempotent", () => {
    const once = replaceOfficeSymbolChars(`${WINGDINGS_CIRCLE} 冰水機`);

    expect(replaceOfficeSymbolChars(once)).toBe(once);
  });

  it("should leave text without private-use characters untouched", () => {
    const line = "a CO2、CH4、N2O 排放量 ＝ 加油量 × 排放係數 × GWP";

    expect(replaceOfficeSymbolChars(line)).toBe(line);
  });

  it("should leave an unknown private-use character alone rather than guess", () => {
    // Info: (20260811 - Emily) 猜錯一個符號比留一個方框糟:方框看得出是壞的
    const line = `${UNMAPPED_A} 未知符號`;

    expect(replaceOfficeSymbolChars(line)).toBe(line);
  });
});

describe("unmappedPrivateUseChars", () => {
  it("should report only the characters that would still render as a box", () => {
    const line = `${WINGDINGS_CIRCLE} 已知 ${UNMAPPED_A} 未知 ${UNMAPPED_B} 未知`;

    expect(unmappedPrivateUseChars(line)).toEqual([UNMAPPED_A, UNMAPPED_B]);
  });

  it("should report nothing when every symbol is mapped", () => {
    expect(
      unmappedPrivateUseChars(`${WINGDINGS_CIRCLE}${SYMBOL_BULLET}`),
    ).toEqual([]);
  });

  it("should not be confused by repeated calls (regex state)", () => {
    const line = `${WINGDINGS_CIRCLE} 已知 ${UNMAPPED_A} 未知`;

    expect(unmappedPrivateUseChars(line)).toEqual(
      unmappedPrivateUseChars(line),
    );
  });
});
