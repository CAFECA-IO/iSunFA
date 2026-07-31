// Info: (20260730 - Tzuhan) 頁碼索引兩階段的切片邏輯。
// Info: (20260730 - Tzuhan) 這是「省成本」與「資料遺失」之間的分界:切錯不能靜默丟內容,一律退回送全文。
import { describe, it, expect } from "@jest/globals";
import { slicePagesForRange, splitTextByPages } from "@/lib/pdf_text_layer";
import { PDF_TEXT_PAGE_SLICE_MIN_CHARS } from "@/constants/pdf_text_layer";

/** Info: (20260730 - Tzuhan) 造出帶頁標記的文字層(標記位於每頁尾端,與 extractPdfTextLayer 一致) */
function buildPagedText(pageCount: number, charsPerPage = 400): string {
  return Array.from({ length: pageCount }, (_, index) => {
    const page = index + 1;
    const body = `第${page}頁內容 ${"甲乙丙丁戊己庚辛".repeat(
      Math.ceil(charsPerPage / 8),
    )}`.slice(0, charsPerPage);
    return `${body}\n-- p.${page}/${pageCount} --`;
  }).join("");
}

describe("splitTextByPages", () => {
  it("依頁標記切出正確頁數", () => {
    expect(splitTextByPages(buildPagedText(64))).toHaveLength(64);
  });

  it("末頁沒有結尾標記時仍計入", () => {
    const text = `${buildPagedText(3)}最後一頁沒有標記的殘餘內容`;
    expect(splitTextByPages(text)).toHaveLength(4);
  });

  it("沒有任何頁標記時回傳單一元素(呼叫端據此退回全文)", () => {
    expect(splitTextByPages("一份沒有頁標記的文字")).toHaveLength(1);
  });
});

describe("slicePagesForRange", () => {
  const text = buildPagedText(64);

  it("切出指定範圍並前後各留一頁緩衝", () => {
    const result = slicePagesForRange(text, 10, 12);
    expect(result.fellBack).toBe(false);
    expect(result.range).toEqual({ from: 9, to: 13 });
    expect(result.text).toContain("第9頁內容");
    expect(result.text).toContain("第13頁內容");
    expect(result.text).not.toContain("第8頁內容");
    expect(result.text).not.toContain("第14頁內容");
  });

  it("切片大幅縮減輸入量(這正是兩階段的目的)", () => {
    const result = slicePagesForRange(text, 10, 12);
    expect(result.text.length).toBeLessThan(text.length / 5);
  });

  it("保留頁標記,讓照抄內容可回原文對照", () => {
    const result = slicePagesForRange(text, 10, 12);
    expect(result.text).toContain("-- p.10/64 --");
  });

  it("範圍碰到文件邊界時夾在合法範圍內", () => {
    expect(slicePagesForRange(text, 1, 2).range).toEqual({ from: 1, to: 3 });
    expect(slicePagesForRange(text, 63, 64).range).toEqual({
      from: 62,
      to: 64,
    });
  });

  it("沒有頁標記時退回全文", () => {
    const plain = "一份沒有頁標記的報告全文".repeat(50);
    const result = slicePagesForRange(plain, 3, 5);
    expect(result.fellBack).toBe(true);
    expect(result.range).toBeNull();
    expect(result.text).toBe(plain);
  });

  it("範圍顛倒或非數值時退回全文,不回傳空內容", () => {
    expect(slicePagesForRange(text, 30, 10).fellBack).toBe(true);
    expect(slicePagesForRange(text, Number.NaN, 5).fellBack).toBe(true);
    expect(slicePagesForRange(text, 5, Number.POSITIVE_INFINITY).fellBack).toBe(
      true,
    );
  });

  it("切片過短(索引抓錯頁)時退回全文,絕不讓內容靜默消失", () => {
    // Info: (20260730 - Tzuhan) 每頁僅 10 字 → 三頁仍低於門檻
    const tiny = buildPagedText(40, 10);
    const result = slicePagesForRange(tiny, 20, 20);
    expect(result.text.length).toBeGreaterThan(PDF_TEXT_PAGE_SLICE_MIN_CHARS);
    expect(result.fellBack).toBe(true);
    expect(result.text).toBe(tiny);
  });
});
