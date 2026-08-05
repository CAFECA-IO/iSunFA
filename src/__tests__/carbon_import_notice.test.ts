// Info: (20260805 - Tzuhan) 匯入摘要訊息:入庫的內容是系統的陳述,必須是決定性的。
// Info: (20260805 - Tzuhan) 前端只送事實,句子在伺服端組 —— 不能讓呼叫端塞任意字串進使用者的對話紀錄。

import { describe, it, expect } from "@jest/globals";
import {
  buildImportSummaryNotice,
  CarbonImportReconciliationStateEnum,
  type ICarbonImportSummary,
} from "@/constants/carbon_chatbot";
import { CarbonImportNoticeSchema } from "@/validators/carbon_import_notice";
import { CARBON_REPORT_OUTLINE } from "@/constants/carbon_report_outline";

const baseSummary: ICarbonImportSummary = {
  fileName: "高興昌鋼鐵股份有限公司溫室氣體盤查報告書.pdf",
  importedCount: 32,
  draftedCount: 1,
  reconciliation: CarbonImportReconciliationStateEnum.RECONCILED,
  failedChapters: [],
};

describe("buildImportSummaryNotice", () => {
  it("帶入檔名與逐字/草稿的節數", () => {
    const text = buildImportSummaryNotice("zh-TW", baseSummary);
    expect(text).toContain(baseSummary.fileName);
    expect(text).toContain("逐字落地 32 節");
    expect(text).toContain("AI 補寫草稿 1 節");
  });

  /**
   * Info: (20260805 - Tzuhan) 三種對帳結果必須說得不一樣。
   * 「勾稽通過」與「有表但一筆都沒入帳」的處置完全不同 ——
   * 前者可以往下走,後者要回去看對帳說明;寫成同一句話等於沒說。
   */
  it("三種對帳結果各有各的說法", () => {
    const texts = [
      CarbonImportReconciliationStateEnum.RECONCILED,
      CarbonImportReconciliationStateEnum.BLOCKED,
      CarbonImportReconciliationStateEnum.NONE,
    ].map((reconciliation) =>
      buildImportSummaryNotice("zh-TW", { ...baseSummary, reconciliation }),
    );
    expect(new Set(texts).size).toBe(3);
    expect(texts[0]).toContain("已寫入帳本");
    expect(texts[1]).toContain("勾稽未通過");
    expect(texts[2]).toContain("沒有可入帳");
  });

  it("失敗的章列出來;全部成功時不留空行", () => {
    const withFailures = buildImportSummaryNotice("zh-TW", {
      ...baseSummary,
      failedChapters: ["第四章 數據品質管理", "第九章 查證"],
    });
    expect(withFailures).toContain("第四章 數據品質管理、第九章 查證");

    const clean = buildImportSummaryNotice("zh-TW", baseSummary);
    expect(clean).not.toContain("解析失敗");
    expect(clean.split("\n").every((line) => line.length > 0)).toBe(true);
  });

  // Info: (20260805 - Tzuhan) 匯入的內容一律未查核 —— 這句不能因為勾稽通過就省略
  it("一律提醒未查核", () => {
    [
      CarbonImportReconciliationStateEnum.RECONCILED,
      CarbonImportReconciliationStateEnum.BLOCKED,
      CarbonImportReconciliationStateEnum.NONE,
    ].forEach((reconciliation) => {
      expect(
        buildImportSummaryNotice("zh-TW", { ...baseSummary, reconciliation }),
      ).toContain("未查核");
    });
  });

  it("五個語系都有文案,未知語系退回 zh-TW", () => {
    ["zh-TW", "zh-CN", "en", "ja", "ko"].forEach((language) => {
      expect(
        buildImportSummaryNotice(language, baseSummary).length,
      ).toBeGreaterThan(0);
    });
    expect(buildImportSummaryNotice("de", baseSummary)).toBe(
      buildImportSummaryNotice("zh-TW", baseSummary),
    );
    expect(buildImportSummaryNotice(undefined, baseSummary)).toBe(
      buildImportSummaryNotice("zh-TW", baseSummary),
    );
  });
});

describe("CarbonImportNoticeSchema", () => {
  const validPayload = {
    channel: "carbon-chat-0xabc-s123",
    fileName: "report.pdf",
    importedCount: 32,
    draftedCount: 1,
    reconciliation: CarbonImportReconciliationStateEnum.RECONCILED,
  };

  it("failedChapters 省略時預設空陣列", () => {
    const parsed = CarbonImportNoticeSchema.parse(validPayload);
    expect(parsed.failedChapters).toEqual([]);
  });

  /**
   * Info: (20260805 - Tzuhan) 節數上限取大綱節數:超過即不可能是真的落地節數,
   * 而讓一個誇大的數字入庫等於在對話紀錄裡留下假事實。
   */
  it("節數超過大綱節數即拒絕", () => {
    expect(
      CarbonImportNoticeSchema.safeParse({
        ...validPayload,
        importedCount: CARBON_REPORT_OUTLINE.length + 1,
      }).success,
    ).toBe(false);
  });

  it("對帳結果不是列舉值即拒絕(前端不得自訂狀態)", () => {
    expect(
      CarbonImportNoticeSchema.safeParse({
        ...validPayload,
        reconciliation: "LOOKS_FINE",
      }).success,
    ).toBe(false);
  });

  it("沒有可以塞文案的欄位(文案一律由伺服端組出)", () => {
    const parsed = CarbonImportNoticeSchema.parse({
      ...validPayload,
      text: "我自己寫的訊息",
    });
    expect("text" in parsed).toBe(false);
  });
});
