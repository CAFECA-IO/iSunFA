// Info: (20260730 - Tzuhan) 頁碼索引兩階段的切片邏輯。
// Info: (20260730 - Tzuhan) 這是「省成本」與「資料遺失」之間的分界:切錯不能靜默丟內容,一律退回送全文。
import { describe, it, expect } from "@jest/globals";
import { slicePagesForRange, splitTextByPages } from "@/lib/pdf_text_layer";
import {
  PDF_TEXT_PAGE_SLICE_MIN_CHARS,
  PDF_TEXT_PAGE_SLICE_PADDING,
} from "@/constants/pdf_text_layer";

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

  /**
   * Info: (20260817 - Emily) `toPage === null`（沒有上界）
   * （`data/issue_drafts/open/42_page_slice_falls_back.md`,PR review A3）。
   *
   * 08-17 實測 14 次呼叫裡有 7 次走這條:章節有索引（下界拿得到）,
   * 但後段章節擠在同一頁,`resolveUnitPageRange` 只回下界 —— 原本這支要求
   * `toPage` 是有限數,route 更進一步要求它非 null,於是那 7 次是**整份送**,
   * 連 `fromPage` 之前的頁一起。每次多花約 41.7k token。
   *
   * 這一段的必要性:改的是「送什麼給模型」,而模型的輸出會變成盤查報告上
   * 對外宣告的數字。這支自己的檔頭寫著「寧可多花 token,也不能讓內容其實在
   * 文件裡卻沒被送給模型變成靜默的資料遺失」—— 那句話原本沒有任何機械保證。
   */
  describe("沒有上界(toPage 為 null)", () => {
    it("取到文末,而不是退回全文", () => {
      const result = slicePagesForRange(text, 50, null);

      expect(result.fellBack).toBe(false);
      expect(result.range).toEqual({ from: 49, to: 64 });
      expect(result.text).toContain("第64頁內容");
      expect(result.text).toContain("第49頁內容");
    });

    /**
     * Info: (20260817 - Emily) 這一條才是這個修正的目的:比整份送少。
     * 只斷言 `fellBack === false` 不夠 —— 回傳整份文字並標 false 也會過。
     */
    it("下界之前的頁不送,輸入量因此比整份少", () => {
      const result = slicePagesForRange(text, 50, null);

      expect(result.text).not.toContain("第48頁內容");
      expect(result.text).not.toContain("第1頁內容");
      expect(result.text.length).toBeLessThan(text.length / 3);
    });

    // Info: (20260817 - Emily) `from` 的推導必須與有上界那條路完全一樣,包含 padding
    it("下界照樣留 PDF_TEXT_PAGE_SLICE_PADDING 頁緩衝", () => {
      const withBound = slicePagesForRange(text, 50, 60);
      const withoutBound = slicePagesForRange(text, 50, null);

      expect(withoutBound.range?.from).toBe(50 - PDF_TEXT_PAGE_SLICE_PADDING);
      expect(withoutBound.range?.from).toBe(withBound.range?.from);
    });

    it("下界碰到文件開頭時夾在第 1 頁,不會變成第 0 頁", () => {
      expect(slicePagesForRange(text, 1, null).range).toEqual({
        from: 1,
        to: 64,
      });
    });

    /**
     * Info: (20260817 - Emily) 沒有上界**不**等於放棄其他守衛。
     * 沒有頁標記時照樣退回全文 —— 這條在改成 `pages.length` 之後仍然要成立。
     */
    it("沒有頁標記時照樣退回全文", () => {
      const plain = "一份沒有頁標記的報告全文".repeat(50);
      const result = slicePagesForRange(plain, 3, null);

      expect(result.fellBack).toBe(true);
      expect(result.range).toBeNull();
      expect(result.text).toBe(plain);
    });

    /**
     * Info: (20260817 - Emily) 上一條的 `fromPage` 是 3,於是它其實是被
     * `from > to` 攔下來的,而不是被 `pages.length <= 1` 攔下來的。
     *
     * 變異測試量出來的:拿掉 `pages.length <= 1` 那道退回,上一條照樣綠。
     * `fromPage` 為 1 才走得到那道守衛 —— 而拿掉它的話,這支會回
     * `fellBack: false` 並在全文尾端**補上一個不存在的 `-- p.1/1 --` 標記**
     * （實測 600 字進、612 字出）。呼叫端會據此以為切片成功。
     */
    it("沒有頁標記且下界為第 1 頁時,不得偽造頁標記", () => {
      const plain = "一份沒有頁標記的報告全文".repeat(50);
      const result = slicePagesForRange(plain, 1, null);

      expect(result.fellBack).toBe(true);
      expect(result.range).toBeNull();
      expect(result.text).toBe(plain);
      expect(result.text).not.toContain("-- p.1/1 --");
    });

    // Info: (20260817 - Emily) 下界本身壞掉時,沒有上界不該讓它變成「照樣切」
    it("下界非數值時照樣退回全文", () => {
      expect(slicePagesForRange(text, Number.NaN, null).fellBack).toBe(true);
      expect(
        slicePagesForRange(text, Number.POSITIVE_INFINITY, null).fellBack,
      ).toBe(true);
    });

    // Info: (20260817 - Emily) 下界超出文件頁數時 from > to,仍然要退回全文而不是回空字串
    it("下界超出文件頁數時退回全文", () => {
      const result = slicePagesForRange(text, 200, null);

      expect(result.fellBack).toBe(true);
      expect(result.text).toBe(text);
    });

    it("切片過短時照樣退回全文", () => {
      const tiny = buildPagedText(40, 10);
      const result = slicePagesForRange(tiny, 39, null);

      expect(result.fellBack).toBe(true);
      expect(result.text).toBe(tiny);
    });
  });
});
