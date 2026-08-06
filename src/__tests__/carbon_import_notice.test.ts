// Info: (20260805 - Tzuhan) 匯入摘要訊息:入庫的內容是系統的陳述,必須是決定性的。
// Info: (20260805 - Tzuhan) 前端只送事實,句子在伺服端組 —— 不能讓呼叫端塞任意字串進使用者的對話紀錄。

import { describe, it, expect } from "@jest/globals";
import {
  buildImportSummaryNotice,
  buildImportFollowUpPrompt,
  CARBON_IMPORT_FOLLOW_UPS,
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

  /**
   * Info: (20260806 - Tzuhan) 原本斷言「整段完全沒有空行」。
   *
   * 那條斷言真正要守的是 `.filter(Boolean)` 有生效 ——
   * 沒有失敗章節時不該留下一行空白(那個位置本來是失敗章節那句話)。
   * 20260806 摘要後面接上「接下來可以…」的引導區塊,兩段之間有一行**刻意的**空行,
   * 於是原斷言開始失敗。
   *
   * 放寬範圍而不放棄意圖:改為只檢查摘要那一段(引導抬頭之前)沒有空行。
   * 直接改成「允許空行」會讓 filter(Boolean) 哪天壞掉也沒人知道。
   */
  it("失敗的章列出來;全部成功時摘要段不留空行", () => {
    const withFailures = buildImportSummaryNotice("zh-TW", {
      ...baseSummary,
      failedChapters: ["第四章 數據品質管理", "第九章 查證"],
    });
    expect(withFailures).toContain("第四章 數據品質管理、第九章 查證");

    const clean = buildImportSummaryNotice("zh-TW", baseSummary);
    expect(clean).not.toContain("解析失敗");
    const summaryPart = clean.split("接下來我可以幫你:")[0].trimEnd();
    expect(summaryPart.split("\n").every((line) => line.length > 0)).toBe(true);
  });

  /**
   * Info: (20260806 - Tzuhan) 摘要不能講完就停:使用者匯入報告的目的是要有人幫他看。
   * 三個選項的文案**同時是**使用者點按鈕時送出的那句話(共用 CARBON_IMPORT_FOLLOW_UPS),
   * 所以這裡順便釘住兩者一致 —— 按鈕寫一句、實際送另一句是最難查的一種不一致。
   */
  it("摘要後面接上後續建議,且與按鈕送出的內容是同一份文案", () => {
    const text = buildImportSummaryNotice("zh-TW", baseSummary);
    expect(text).toContain("接下來我可以幫你:");
    CARBON_IMPORT_FOLLOW_UPS.forEach((followUp, index) => {
      const prompt = buildImportFollowUpPrompt("zh-TW", followUp);
      expect(text).toContain(`${index + 1}. ${prompt}`);
    });
  });

  /**
   * Info: (20260806 - Tzuhan) 引導語只說「可以做什麼」,不說「這份報告怎麼樣」——
   * 此刻只看得到段落計數,沒看過內容,任何對報告品質的斷言都是捏造。
   */
  it("引導語不對報告內容下任何斷語", () => {
    const text = buildImportSummaryNotice("zh-TW", baseSummary);
    ["品質良好", "符合規範", "沒有問題", "完整"].forEach((claim) => {
      expect(text).not.toContain(claim);
    });
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
