/**
 * Info: (20260812 - Emily) 目錄頁數判定。
 *
 * 這個判定錯的兩個方向都不會拋錯,只有測試看得見:
 * 少跳一頁 → 每條頁碼都指向目錄;多跳一頁 → 那幾頁上的標題拿到錯的頁碼,
 * 而錯的頁碼比留白更糟(查證的人會照著它翻到錯的一頁然後以為報告漏了那一節)。
 */
import { describe, it, expect } from "@jest/globals";
import {
  assignTocPageNumbers,
  countLeadingTocPages,
  squeezeForTocMatch,
} from "@/lib/utils/carbon_toc_pages";
import { CARBON_TOC_PAGE_HEADING_HITS } from "@/constants/carbon_pdf";

const count = (
  pages: readonly string[],
  tocTitle: string,
  entries: readonly string[],
): number =>
  countLeadingTocPages({
    squeezedPages: pages.map(squeezeForTocMatch),
    squeezedTocTitle: squeezeForTocMatch(tocTitle),
    squeezedEntries: entries.map(squeezeForTocMatch),
    headingHits: CARBON_TOC_PAGE_HEADING_HITS,
  });

describe("squeezeForTocMatch", () => {
  /**
   * Info: (20260812 - Emily) 文字層抽出來的字不一定是同一個碼位:
   * 實測「第一章」的「一」是 U+2F00(康熙部首)。少了 NFKC,34 條裡有 10 條留白。
   */
  it("should fold Kangxi radicals onto the ordinary ideograph", () => {
    expect(squeezeForTocMatch("第⼀章")).toBe(squeezeForTocMatch("第一章"));
  });

  it("should drop the whitespace the text layer inserts between characters", () => {
    expect(squeezeForTocMatch("3.4 計 算\n細節")).toBe("3.4計算細節");
  });
});

describe("countLeadingTocPages", () => {
  /**
   * Info: (20260812 - Emily) 這是原本唯一的判準,對長報告有效,先釘住不要退化。
   */
  it("should skip a toc page identified by its heading count", () => {
    const entries = [
      "1 章一",
      "2 章二",
      "3 章三",
      "4 章四",
      "5 章五",
      "6 章六",
    ];
    const pages = [
      `目錄 ${entries.join(" ")}`,
      "1 章一 內文內文內文",
      "2 章二 內文內文內文",
    ];

    expect(count(pages, "目錄", entries)).toBe(1);
  });

  /**
   * Info: (20260812 - Emily) 這一條是修法的核心。
   *
   * 條目總數低於命中門檻時,原本的判準永遠不成立 → skip 0 →
   * 每一條的「第一個包含這個標題的頁」都是目錄自己 → 每條頁碼都是 1。
   * 而條目不全是被允許的(ADR 014:對不上的節標示「原文無此資訊」),
   * 所以短報告不是假想情境。
   */
  it("should still skip the toc of a report with fewer entries than the hit threshold", () => {
    const entries = ["3.4 計算細節", "3.6 總量匯總"];
    const pages = [
      `目錄 ${entries.join(" ")}`,
      "3.4 計算細節 內文內文內文",
      "3.6 總量匯總 內文內文內文",
    ];

    expect(entries.length).toBeLessThan(CARBON_TOC_PAGE_HEADING_HITS);
    expect(count(pages, "目錄", entries)).toBe(1);
  });

  // Info: (20260812 - Emily) 一條目也要成立 —— 命中數判準在這裡完全無效
  it("should skip the toc of a single-entry report", () => {
    const pages = ["目錄 3.4 計算細節", "3.4 計算細節 內文內文內文"];

    expect(count(pages, "目錄", ["3.4 計算細節"])).toBe(1);
  });

  /**
   * Info: (20260812 - Emily) 多頁目錄:第二頁沒有「目錄」那個字,靠命中數接手。
   * 兩個判準是聯集,各自只在一種規模下可靠。
   */
  it("should skip every page of a multi-page toc", () => {
    const first = ["1 甲", "2 乙", "3 丙", "4 丁", "5 戊"];
    const second = ["6 己", "7 庚", "8 辛", "9 壬", "10 癸"];
    const pages = [
      `目錄 ${first.join(" ")}`,
      second.join(" "),
      "1 甲 內文內文內文",
    ];

    expect(count(pages, "目錄", [...first, ...second])).toBe(2);
  });

  /**
   * Info: (20260812 - Emily) 內容頁只出現自己那一個標題,不能被吃掉。
   * 吃掉的後果是那一節的標題拿到錯的頁碼。
   */
  it("should not skip a content page that mentions only its own heading", () => {
    const entries = ["1 章一", "2 章二", "3 章三", "4 章四", "5 章五"];
    const pages = [`目錄 ${entries.join(" ")}`, "1 章一 內文", "2 章二 內文"];

    expect(count(pages, "目錄", entries)).toBe(1);
  });

  /**
   * Info: (20260812 - Emily) 判定失效時回 0(不跳)而不是跳掉整份文件。
   * 回 0 是一個看得出來的錯;跳掉內容頁產出的是看起來合理的錯頁碼。
   */
  it("should give up instead of skipping the whole document", () => {
    const entries = ["1 甲", "2 乙", "3 丙", "4 丁", "5 戊"];

    expect(count([`目錄 ${entries.join(" ")}`], "目錄", entries)).toBe(0);
  });

  it("should return 0 when there is nothing to match", () => {
    expect(count(["目錄"], "目錄", [])).toBe(0);
    expect(count([], "目錄", ["1 甲"])).toBe(0);
  });

  /**
   * Info: (20260812 - Emily) 取不到目錄標題時仍須靠命中數運作(不得整個放棄)。
   */
  it("should fall back to the hit count when the toc title is unavailable", () => {
    const entries = ["1 甲", "2 乙", "3 丙", "4 丁", "5 戊"];
    const pages = [entries.join(" "), "1 甲 內文"];

    expect(count(pages, "", entries)).toBe(1);
  });

  /**
   * Info: (20260812 - Emily) 標題判準只在第一頁有效。
   *
   * 它是子字串比對,而查證用的盤查報告裡「表目錄」「圖目錄」是常見章節名 ——
   * 兩者都含「目錄」。不限頁次的話那一頁被算進前綴而跳掉,
   * 於是它上面的章節拿到後面某一頁的頁碼:錯的頁碼比留白更糟。
   */
  it("should not skip a content page that merely contains the toc title", () => {
    const entries = ["1 章一", "2 章二", "3 章三", "4 章四", "5 章五"];
    const pages = [
      `目錄 ${entries.join(" ")}`,
      "表目錄 本章表格如下 1 章一",
      "2 章二 內文",
    ];

    expect(count(pages, "目錄", entries)).toBe(1);
  });

  /**
   * Info: (20260812 - Emily) 限第一頁不會傷到多頁目錄:
   * 第二頁本來就不靠標題,靠的是命中數(幾十個條目必然過門檻)。
   * 這一條與上面那條是同一個改動的兩面,一起壞才看得出來。
   */
  it("should still skip a multi-page toc whose later pages lack the title", () => {
    const first = ["1 甲", "2 乙", "3 丙", "4 丁", "5 戊"];
    const second = ["6 己", "7 庚", "8 辛", "9 壬", "10 癸"];
    const pages = [
      `目錄 ${first.join(" ")}`,
      second.join(" "),
      "表目錄 1 甲 內文",
    ];

    expect(count(pages, "目錄", [...first, ...second])).toBe(2);
  });
});

/**
 * Info: (20260812 - Emily) 頁碼指派。
 *
 * 這一整組原本測不到:邏輯住在 `fillTocPageNumbers` 裡,而那個方法要有 Chrome
 * 才跑得起來(`page.evaluate` 取目錄、寫回頁碼)。它的兩個 bug(相鄰同名條目、
 * 誤命中往後傳染)都是靠人翻 53 頁才發現的 —— 抽成純函式就是為了不再這樣。
 */
describe("assignTocPageNumbers", () => {
  const assign = (
    entries: readonly string[],
    pages: readonly string[],
    skip: number,
  ) =>
    assignTocPageNumbers({
      squeezedPages: pages.map(squeezeForTocMatch),
      squeezedEntries: entries.map(squeezeForTocMatch),
      skip,
    });

  const pagesOf = (
    entries: readonly string[],
    pages: readonly string[],
    skip: number,
  ) => assign(entries, pages, skip).map((entry) => entry.page);

  // Info: (20260812 - Emily) 最平常的情形:一節一頁,順序一致
  it("should number entries in document order", () => {
    const pages = ["目錄 甲 乙 丙", "甲 內文", "乙 內文", "丙 內文"];

    expect(pagesOf(["甲", "乙", "丙"], pages, 1)).toEqual([2, 3, 4]);
  });

  /**
   * Info: (20260812 - Emily) 游標必須允許停在原地:
   * 短的節不會各佔一頁,同一頁上常有好幾節開始。這是 `>= cursor` 的理由,
   * 也是下一條那個代價的來源。
   */
  it("should let several sections share one page", () => {
    const pages = ["目錄 甲 乙 丙", "甲 內文 乙 內文 丙 內文"];

    expect(pagesOf(["甲", "乙", "丙"], pages, 1)).toEqual([2, 2, 2]);
  });

  /**
   * Info: (20260812 - Emily) 標題文字重複時,後面那條不得指回前面那一節。
   * 這份報告的「排放源明細」「範疇小計」各出現三次。
   */
  it("should not point a repeated heading back at the earlier one", () => {
    const entries = ["第三章", "排放源明細", "第四章", "排放源明細"];
    const pages = [
      "目錄 第三章 排放源明細 第四章 排放源明細",
      "第三章 範疇",
      "排放源明細 甲類 乙類",
      "第四章 範疇",
      "排放源明細 丙類 丁類",
    ];

    expect(pagesOf(entries, pages, 1)).toEqual([2, 3, 4, 5]);
  });

  /**
   * Info: (20260812 - Emily) 這是 `>= cursor` 的代價,也是本次修掉的那一條。
   *
   * 相鄰兩條同名時,第一條把游標停在第 n 頁,第二條從第 n 頁找又找到同一頁 ——
   * 兩條頁碼一樣。上面那條「排放源明細 ×3」測不出來,因為中間夾著別的條目
   * 會把游標推走;要相鄰才現形。
   */
  it("should advance past the previous page for an adjacent duplicate", () => {
    const pages = ["目錄 小結 小結", "第三章 小結", "第四章 小結"];

    expect(pagesOf(["小結", "小結"], pages, 1)).toEqual([2, 3]);
  });

  // Info: (20260812 - Emily) 連續三條同名也要逐頁前進,不是只修第二條
  it("should keep advancing across three adjacent duplicates", () => {
    const pages = ["目錄", "甲 小結", "乙 小結", "丙 小結"];

    expect(pagesOf(["小結", "小結", "小結"], pages, 1)).toEqual([2, 3, 4]);
  });

  /**
   * Info: (20260812 - Emily) 純單調會讓一個誤命中往後傳染:
   * 游標被推過真正的章節之後,後面每一條都找不到而**全部留白**。
   * 退回全域搜尋是為了讓錯誤留在局部 —— 這一條釘的就是「只錯一條」。
   */
  it("should keep a single bad hit from blanking every later entry", () => {
    const entries = ["甲節", "乙節", "丙節", "丁節"];
    const pages = [
      "目錄 甲節 乙節 丙節 丁節",
      "乙節 內文",
      // Info: (20260812 - Emily) 甲節真正的位置在乙節之後 → 游標被推過乙節
      "甲節 內文",
      "丙節 內文",
      "丁節 內文",
    ];

    const result = assign(entries, pages, 1);

    expect(result.map((entry) => entry.page)).toEqual([3, 2, 4, 5]);
    // Info: (20260812 - Emily) 只有乙節那一條是錯的,丙節丁節沒有被連坐
    expect(result.map((entry) => entry.outOfOrder)).toEqual([
      false,
      true,
      false,
      false,
    ]);
  });

  it("should mark an entry that only the global fallback could find", () => {
    const entries = ["乙節", "甲節"];
    const pages = ["目錄 甲節 乙節", "甲節 內文", "乙節 內文"];

    const result = assign(entries, pages, 1);

    expect(result[0]).toEqual({ page: 3, outOfOrder: false });
    // Info: (20260812 - Emily) 甲節在乙節之前,單調找不到 → 退回全域並標記
    expect(result[1]).toEqual({ page: 2, outOfOrder: true });
  });

  /**
   * Info: (20260812 - Emily) 退回時不推進游標,錯誤留在局部:
   * 上一條走了 fallback,下一條仍從原本的游標找。
   */
  it("should not move the cursor when it falls back", () => {
    const entries = ["乙節", "甲節", "丙節"];
    const pages = ["目錄", "甲節 內文", "乙節 內文", "丙節 內文"];

    expect(pagesOf(entries, pages, 1)).toEqual([3, 2, 4]);
  });

  // Info: (20260812 - Emily) 找不到就留白(0),不猜也不填 skip
  it("should report 0 for an entry that is nowhere in the text layer", () => {
    const pages = ["目錄 甲節", "甲節 內文"];

    expect(pagesOf(["甲節", "原文無此資訊"], pages, 1)).toEqual([2, 0]);
  });

  // Info: (20260812 - Emily) 空字串條目不參與比對,也不得推進游標
  it("should skip an empty entry without disturbing the cursor", () => {
    const pages = ["目錄", "甲節 內文", "乙節 內文"];

    expect(pagesOf(["甲節", "", "乙節"], pages, 1)).toEqual([2, 0, 3]);
  });

  // Info: (20260812 - Emily) 目錄自己那幾頁不得被搜到(否則每條都指向目錄)
  it("should never return a page inside the toc", () => {
    const pages = ["目錄 甲節 乙節", "目錄續頁 丙節", "甲節 內文"];

    expect(pagesOf(["甲節"], pages, 2)).toEqual([3]);
  });
});
