// Info: (20260804 - Tzuhan) 頁碼切片:錯了的表現是「內容無聲消失」,不是錯誤也不是空白。
// Info: (20260804 - Tzuhan) 實測代價 —— 第四章被標早一頁,跨 p.42–44 的表3.8 只送進第一頁,
// Info: (20260804 - Tzuhan) 半張表被丟掉,而它是桑基圖唯一的資料來源,於是整張圖消失且畫面毫無異狀。

import { describe, it, expect } from "@jest/globals";
import {
  resolveChapterPageRange,
  validatePageIndex,
  PageIndexRejectReasonEnum,
} from "@/lib/carbon_page_slice";
import { CARBON_PAGE_SLICE_MARGIN } from "@/constants/carbon_page_slice";

describe("validatePageIndex", () => {
  it("依大綱順序非遞減即通過(允許同頁多節)", () => {
    const result = validatePageIndex([
      { id: "a", startPage: 1 },
      { id: "b", startPage: 5 },
      { id: "c", startPage: 5 },
      { id: "d", startPage: 9 },
    ]);
    expect(result.isValid).toBe(true);
  });

  it("缺漏的節不影響判定(缺漏由逐章的「有任一節未知即送全文」處理)", () => {
    const result = validatePageIndex([
      { id: "a", startPage: 1 },
      { id: "b", startPage: undefined },
      { id: "c", startPage: 9 },
    ]);
    expect(result.isValid).toBe(true);
  });

  it("頁碼倒退即整份不可信", () => {
    const result = validatePageIndex([
      { id: "a", startPage: 10 },
      { id: "b", startPage: 3 },
    ]);
    expect(result.isValid).toBe(false);
    expect(result.reason).toBe(PageIndexRejectReasonEnum.NOT_MONOTONIC);
    expect(result.offending).toEqual([{ paragraphId: "b", startPage: 3 }]);
  });

  it("非正整數即整份不可信", () => {
    expect(validatePageIndex([{ id: "a", startPage: 0 }]).reason).toBe(
      PageIndexRejectReasonEnum.NOT_POSITIVE_INTEGER,
    );
    expect(validatePageIndex([{ id: "a", startPage: 2.5 }]).reason).toBe(
      PageIndexRejectReasonEnum.NOT_POSITIVE_INTEGER,
    );
  });

  it("全部未知即無索引可用", () => {
    expect(validatePageIndex([{ id: "a", startPage: undefined }]).reason).toBe(
      PageIndexRejectReasonEnum.EMPTY,
    );
  });

  /**
   * Info: (20260804 - Tzuhan) 這道檢查的**限度**要寫成測試,否則會被誤以為能保證切片正確。
   * 把第四章標在 42 而實際在 45 仍然是單調的 —— 今天那次失敗它擋不住。
   * 擋那一類的是安全邊界與「缺表要說出來」,三者各擋一段。
   */
  it("擋不住「差幾頁」的索引(這是已知限度,不是遺漏)", () => {
    const result = validatePageIndex([
      { id: "ch3-6", startPage: 40 },
      { id: "ch4-intro", startPage: 42 },
    ]);
    expect(result.isValid).toBe(true);
  });
});

describe("resolveChapterPageRange", () => {
  it("上下界各留安全邊界", () => {
    const range = resolveChapterPageRange({
      sectionPages: [40, 41],
      nextChapterFirstPage: 45,
    });
    expect(range).toEqual({
      fromPage: 40 - CARBON_PAGE_SLICE_MARGIN,
      toPage: 45 + CARBON_PAGE_SLICE_MARGIN,
    });
  });

  /**
   * Info: (20260804 - Tzuhan) 重現實測那次失敗:第四章被標在 42(實際 45),
   * 表3.8 跨 p.42–44。沒有邊界時上界為 42,表3.8 只送進第一頁。
   */
  it("索引差三頁時,安全邊界仍救不回整張表(誠實記錄邊界的限度)", () => {
    const range = resolveChapterPageRange({
      sectionPages: [40, 41],
      nextChapterFirstPage: 42,
    });
    expect(range?.toPage).toBe(44);
    // Info: (20260804 - Tzuhan) 表3.8 跨到 44,剛好搆到;若原文跨到 45 就仍會被切
    expect(range?.toPage).toBeLessThan(45);
  });

  it("下界不會小於第一頁", () => {
    const range = resolveChapterPageRange({
      sectionPages: [1, 2],
      nextChapterFirstPage: 9,
    });
    expect(range?.fromPage).toBe(1);
  });

  it("有任一節未知即整章送全文(不猜)", () => {
    expect(
      resolveChapterPageRange({
        sectionPages: [40, undefined],
        nextChapterFirstPage: 45,
      }),
    ).toBeNull();
  });

  it("最後一章不帶上界(送到文末)", () => {
    const range = resolveChapterPageRange({
      sectionPages: [58, 60],
      nextChapterFirstPage: undefined,
    });
    expect(range).toEqual({ fromPage: 58 - CARBON_PAGE_SLICE_MARGIN });
    expect(range?.toPage).toBeUndefined();
  });

  /**
   * Info: (20260804 - Tzuhan) 下一章的索引落在本章範圍內 = 索引錯了。
   * 此時帶任何上界都不安全,寧可送全文 —— 多花 token 是成本,漏送內容是錯誤。
   */
  it("下一章起始頁落在本章範圍內時不帶上界", () => {
    const range = resolveChapterPageRange({
      sectionPages: [40, 44],
      nextChapterFirstPage: 41,
    });
    expect(range?.toPage).toBeUndefined();
  });
});
