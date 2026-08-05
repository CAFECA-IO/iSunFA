// Info: (20260804 - Tzuhan) 頁碼切片:錯了的表現是「內容無聲消失」,不是錯誤也不是空白。
// Info: (20260804 - Tzuhan) 實測代價 —— 第四章被標早一頁,跨 p.42–44 的表3.8 只送進第一頁,
// Info: (20260804 - Tzuhan) 半張表被丟掉,而它是桑基圖唯一的資料來源,於是整張圖消失且畫面毫無異狀。

import { describe, it, expect } from "@jest/globals";
import {
  buildImportUnits,
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

/**
 * Info: (20260805 - Tzuhan) 把章切成「單次呼叫跑得完」的工作單元。
 * 閘道的 60 秒是**閒置**逾時,而等 LLM 期間一個位元組都沒送,整段都算閒置;
 * 拉長逾時已被否決,所以要縮的是工作本身。
 */
describe("buildImportUnits", () => {
  const outline = [
    ...Array.from({ length: 7 }, (_, i) => ({
      id: `ch1-${i}`,
      chapterId: "ch1",
    })),
    ...Array.from({ length: 3 }, (_, i) => ({
      id: `ch4-${i}`,
      chapterId: "ch4",
    })),
  ];

  it("節數超過上限的章切成多份", () => {
    const units = buildImportUnits(outline, ["ch1"], 4);
    expect(units).toHaveLength(2);
    expect(units[0].sectionIds).toEqual(["ch1-0", "ch1-1", "ch1-2", "ch1-3"]);
    expect(units[1].sectionIds).toEqual(["ch1-4", "ch1-5", "ch1-6"]);
    expect(units.map((u) => `${u.partIndex}/${u.partTotal}`)).toEqual([
      "1/2",
      "2/2",
    ]);
  });

  it("節數未超過上限的章維持一份(行為與先前相同)", () => {
    const units = buildImportUnits(outline, ["ch4"], 4);
    expect(units).toHaveLength(1);
    expect(units[0].partTotal).toBe(1);
    expect(units[0].sectionIds).toEqual(["ch4-0", "ch4-1", "ch4-2"]);
  });

  it("保持大綱原序(合併結果必須是決定性的)", () => {
    const units = buildImportUnits(outline, ["ch1", "ch4"], 4);
    expect(units.flatMap((u) => u.sectionIds)).toEqual(
      outline.map((s) => s.id),
    );
  });

  it("沒有對應節的章不產生單元", () => {
    expect(buildImportUnits(outline, ["ch9"], 4)).toEqual([]);
  });

  /**
   * Info: (20260805 - Tzuhan) 已知限度:節數少但單節極重的章切不動。
   * ch4 只有 3 節卻跑 2.5 分鐘 —— 成本集中在 4.2 一節的九張表。
   * 再往下切就會把跨頁的表格切成兩半,那是拿無聲的資料損失換請求跑得完。
   */
  it("切不動節數少但單節極重的章(已知限度,不是遺漏)", () => {
    expect(buildImportUnits(outline, ["ch4"], 1)).toHaveLength(3);
    expect(buildImportUnits(outline, ["ch4"], 4)).toHaveLength(1);
  });
});
