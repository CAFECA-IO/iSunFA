// Info: (20260730 - Tzuhan) 段落來源與匯入導流:兩者都是「使用者到不到得了完整 33 節、看不看得出哪節是原文」的關鍵
import { describe, it, expect } from "@jest/globals";
import {
  IMPORT_CANDIDATE_MIME_TYPES,
  CARBON_IMPORT_SINGLE_CALL_MAX_BYTES,
  ParagraphOriginEnum,
} from "@/constants/carbon_chatbot";
import { CarbonReportDataSchema } from "@/validators/carbon_report_storage";

/** Info: (20260730 - Tzuhan) 複刻 hook 內的導流判準(純函數部分),確保門檻語意不被大小猜測綁回去 */
const isImportCandidate = (mimeType: string): boolean =>
  IMPORT_CANDIDATE_MIME_TYPES.includes(mimeType);

describe("匯入導流候選判斷", () => {
  it("PDF 與文字檔一律視為候選,不再依檔案大小猜測", () => {
    expect(isImportCandidate("application/pdf")).toBe(true);
    expect(isImportCandidate("text/markdown")).toBe(true);
    expect(isImportCandidate("text/plain")).toBe(true);
  });

  it("影像與試算表不觸發匯入導流(那些是佐證附件)", () => {
    expect(isImportCandidate("image/png")).toBe(false);
    expect(isImportCandidate("image/jpeg")).toBe(false);
    expect(
      isImportCandidate(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ),
    ).toBe(false);
  });

  it("2MB 的真實盤查報告不再因未達舊門檻而漏掉導流", () => {
    // Info: (20260730 - Tzuhan) 舊門檻為 PDF ≥ 4MB;高興昌 64 頁盤查報告只有 2.02MB
    const realReportBytes = Math.round(2.02 * 1024 * 1024);
    expect(realReportBytes).toBeLessThan(4 * 1024 * 1024);
    expect(isImportCandidate("application/pdf")).toBe(true);
  });

  it("單發全綱的大小上限僅用於決定要不要逐章,不再兼任導流門檻", () => {
    expect(CARBON_IMPORT_SINGLE_CALL_MAX_BYTES).toBe(64 * 1024);
  });
});

describe("段落來源(origin)持久化", () => {
  const baseParagraph = {
    id: "ch1-1",
    chapterId: "ch1",
    code: "1.1",
    title: "1.1 公司簡介與財務報告邊界",
    content: "本報告書旨在揭露…",
    isCompleted: true,
    isVerified: false,
    isDataDriven: false,
  };

  const baseReport = {
    documentName: "報告",
    title: "溫室氣體盤查報告書",
    section: "ch1-1",
    categories: [],
    totalEmissions: "0",
  };

  it("三種來源都能通過儲存驗證", () => {
    Object.values(ParagraphOriginEnum).forEach((origin) => {
      const parsed = CarbonReportDataSchema.safeParse({
        ...baseReport,
        paragraphs: [{ ...baseParagraph, origin }],
      });
      expect(parsed.success).toBe(true);
    });
  });

  it("舊草稿沒有 origin 欄位時不得整份被丟棄", () => {
    const parsed = CarbonReportDataSchema.safeParse({
      ...baseReport,
      paragraphs: [baseParagraph],
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.paragraphs?.[0].origin).toBeUndefined();
    }
  });

  it("未知的來源值直接拒收(不猜測、不預設為原文)", () => {
    const parsed = CarbonReportDataSchema.safeParse({
      ...baseReport,
      paragraphs: [{ ...baseParagraph, origin: "scraped_from_web" }],
    });
    expect(parsed.success).toBe(false);
  });
});
