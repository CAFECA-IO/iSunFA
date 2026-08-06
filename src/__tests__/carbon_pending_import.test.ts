/**
 * Info: (20260806 - Tzuhan) 待匯入解析結果的持久化形狀。
 *
 * 這一組守的是使用者實測踩到的那件事:解析一份 64 頁報告要跑十幾次 LLM、
 * 好幾分鐘,而結果原本只存在 React state —— 重整就沒了,「先不匯入」無從表達。
 * 入庫之後,能不能**完整**還原就成了關鍵:少一個欄位的代價是使用者要重跑一次。
 */

import { describe, it, expect } from "@jest/globals";
import { CarbonPendingImportDataSchema } from "@/validators/carbon_pending_import";
import { CarbonInventoryStateSchema } from "@/validators/carbon_inventory";
import { CARBON_PENDING_IMPORT_STORAGE_VERSION } from "@/constants/carbon_chatbot";
import { CarbonInventoryStep } from "@/constants/carbon_chatbot";
import { GhgProtocolCategory } from "@/constants/esg";
import { MeasurementUnit } from "@/constants/enums";

const validData = {
  storageVersion: CARBON_PENDING_IMPORT_STORAGE_VERSION,
  savedAt: "2026-08-06T02:00:00.000Z",
  source: {
    cid: "bafyimportcid",
    fileName: "高興昌鋼鐵股份有限公司溫室氣體盤查報告書.pdf",
    mimeType: "application/pdf",
  },
  pending: {
    fileName: "高興昌鋼鐵股份有限公司溫室氣體盤查報告書.pdf",
    originSessionId: "s123",
    originSessionTitle: "溫盤 2025",
    items: [
      {
        paragraphId: "3.6",
        title: "排放量分析",
        content: "全公司總排放量為 2,831.9267 公噸 CO2e。",
        hasExisting: false,
        checked: true,
      },
    ],
    unmapped: ["附錄:查證聲明書"],
    activityCount: 1,
    failedChapters: [{ id: "ch3", title: "第三章 排放量盤查結果" }],
  },
  activities: [
    {
      scopeCategory: GhgProtocolCategory.SCOPE_1_DIRECT,
      sourceName: "天然氣鍋爐",
      quantity: "1234.5",
      unit: MeasurementUnit.LITER,
      tradingTimestamp: 1_767_225_600,
    },
  ],
  pageIndex: [["3.6", 42] as [string, number]],
};

describe("CarbonPendingImportDataSchema", () => {
  it("完整的解析結果通過驗證", () => {
    expect(CarbonPendingImportDataSchema.safeParse(validData).success).toBe(
      true,
    );
  });

  /**
   * Info: (20260806 - Tzuhan) cid 是重載後「重試失敗章節」的唯一素材(File 是記憶體物件)。
   * 允許 null 是因為上傳失敗時會退回直傳 —— 那時重試沒有素材,
   * 但整份解析結果仍該保存下來。
   */
  it("cid 可以是 null(上傳失敗走了直傳退路),但欄位必須在", () => {
    expect(
      CarbonPendingImportDataSchema.safeParse({
        ...validData,
        source: { ...validData.source, cid: null },
      }).success,
    ).toBe(true);
    const { cid, ...withoutCid } = validData.source;
    expect(cid).toBeTruthy();
    expect(
      CarbonPendingImportDataSchema.safeParse({
        ...validData,
        source: withoutCid,
      }).success,
    ).toBe(false);
  });

  /**
   * Info: (20260806 - Tzuhan) 版本不符整筆丟棄(不嘗試相容):
   * 待匯入結果尚未落地,重新上傳解析一次即可 ——
   * 不值得為它背相容邏輯的風險。
   */
  it("storageVersion 不符即拒絕", () => {
    expect(
      CarbonPendingImportDataSchema.safeParse({
        ...validData,
        storageVersion: CARBON_PENDING_IMPORT_STORAGE_VERSION + 1,
      }).success,
    ).toBe(false);
  });

  it("頁碼索引原樣還原(重試才不必再問一次索引)", () => {
    const parsed = CarbonPendingImportDataSchema.parse(validData);
    expect(new Map(parsed.pageIndex).get("3.6")).toBe(42);
  });

  /**
   * Info: (20260806 - Tzuhan) 活動數據必須一起存。
   * 原本它只在 `importActivitiesRef` 裡,少了它、重載後套用會得到
   * 「有段落、沒有活動數據」的半套結果 —— 而那個矛盾使用者已經看過一次了。
   */
  it("活動數據隨解析結果一起還原,且保留交易時間戳", () => {
    const parsed = CarbonPendingImportDataSchema.parse(validData);
    expect(parsed.activities).toHaveLength(1);
    expect(parsed.activities[0].tradingTimestamp).toBe(1_767_225_600);
  });

  /**
   * Info: (20260806 - Tzuhan) 壞掉的原文表格逐張丟,不賠掉整份解析結果 ——
   * 整筆丟棄的代價是使用者要重跑十幾次 LLM。
   */
  it("格式不合的原文表格逐張丟掉,其餘內容照樣還原", () => {
    const parsed = CarbonPendingImportDataSchema.parse({
      ...validData,
      pending: {
        ...validData.pending,
        items: [
          {
            ...validData.pending.items[0],
            sourceTables: [
              { tableNo: "不是表號", caption: "壞的", markdown: "|a|" },
            ],
          },
        ],
      },
    });
    expect(parsed.pending.items).toHaveLength(1);
    expect(parsed.pending.items[0].sourceTables).toBeUndefined();
  });
});

/**
 * Info: (20260806 - Tzuhan) 這一組不在待匯入的範圍,但錯的形狀完全一樣,所以放在一起:
 * Zod 預設 **strip** 未宣告的鍵。schema 少宣告 `tradingTimestamp`,
 * 活動明細解密後過那道驗證就把時間戳洗掉了 —— 而畫面上看不出任何異狀:
 * 桑基圖只是安靜地退回「未標註期間」一個節點,月別分層等於只在重載前有效。
 */
describe("CarbonInventoryStateSchema 的時間戳保留", () => {
  const baseState = {
    step: CarbonInventoryStep.ACTIVITY_DATA,
    activities: [
      {
        scopeCategory: GhgProtocolCategory.SCOPE_1_DIRECT,
        sourceName: "天然氣鍋爐",
        quantity: "1234.5",
        unit: MeasurementUnit.LITER,
        tradingTimestamp: 1_767_225_600,
      },
    ],
    updatedAt: "2026-08-06T02:00:00.000Z",
    version: 1,
  };

  it("活動明細的 tradingTimestamp 不被 strip 掉", () => {
    const parsed = CarbonInventoryStateSchema.parse(baseState);
    expect(parsed.activities[0].tradingTimestamp).toBe(1_767_225_600);
  });

  it("計算總表的 entry 也保留 tradingTimestamp", () => {
    const parsed = CarbonInventoryStateSchema.parse({
      ...baseState,
      computedLedger: {
        entries: [
          {
            activityKey: "天然氣鍋爐",
            scopeCategory: GhgProtocolCategory.SCOPE_1_DIRECT,
            sourceName: "天然氣鍋爐",
            quantityRaw: "1234.5",
            convertedQuantity: "1234.5",
            convertedUnit: "LITER",
            co2eKg: "2345.6789",
            tradingTimestamp: 1_767_225_600,
            factor: {
              factorId: "f1",
              name: "天然氣",
              value: "1.9",
              unit: "kgCO2e/L",
              source: "環境部",
            },
          },
        ],
        pending: [],
        scopeSubtotals: {},
        totalCo2eKg: "2345.6789",
        computedAt: "2026-08-06T02:00:00.000Z",
      },
    });
    expect(parsed.computedLedger?.entries[0].tradingTimestamp).toBe(
      1_767_225_600,
    );
  });

  /**
   * Info: (20260806 - Tzuhan) 上下界擋的是「毫秒誤傳成秒」:
   * 換算出來的年份會落在五萬多年後,而月別標籤照樣印得出來 ——
   * 一個假日期在查核文件上比一個空白嚴重得多。
   */
  it("毫秒誤傳成秒即拒絕(而不是印出五萬年後的月份)", () => {
    expect(
      CarbonInventoryStateSchema.safeParse({
        ...baseState,
        activities: [
          { ...baseState.activities[0], tradingTimestamp: 1_767_225_600_000 },
        ],
      }).success,
    ).toBe(false);
  });
});
