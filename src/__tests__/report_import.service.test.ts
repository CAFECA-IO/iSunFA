// Info: (20260716 - Tzuhan) #56 報告匯入服務測試:白名單降級、同段串接、原文保真、活動數據裁決、文字/pdf 來源分流

import { describe, it, expect, jest } from "@jest/globals";
import { ReportImportService } from "@/services/report_import.service";
import { ChatService } from "@/services/chat.service";
import {
  CARBON_REPORT_OUTLINE,
  CARBON_REPORT_CHAPTERS,
} from "@/constants/carbon_report_outline";
import { GhgProtocolCategory } from "@/constants/esg";
import {
  LLM_MAX_OUTPUT_TOKENS,
  LLM_TRUNCATED_ERROR_MARKER,
} from "@/constants/llm";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { MeasurementUnit } from "@/constants/enums";

const VALID_ID = CARBON_REPORT_OUTLINE[0].id;
const VALID_ID_2 = CARBON_REPORT_OUTLINE[1].id;

type GenerateRawWithImages = (
  prompt: string,
  images?: { data: string; mimeType: string }[],
) => Promise<string>;

const buildService = (
  llmOutput: unknown,
): { service: ReportImportService; spy: jest.Mock<GenerateRawWithImages> } => {
  const spy = jest
    .fn<GenerateRawWithImages>()
    .mockResolvedValue(JSON.stringify(llmOutput));
  const mockChatService = {
    generateRawWithImages: spy,
  } as unknown as ChatService;
  return { service: new ReportImportService(mockChatService), spy };
};

const textSource = (data = "# 舊報告\n1.1 內文…") => ({
  name: "old_report.md",
  mimeType: "text/markdown",
  data,
  isText: true,
});

describe("ReportImportService", () => {
  it("should map segments verbatim, demote invalid ids to unmapped, and concat same-paragraph parts", async () => {
    const { service } = buildService({
      segments: [
        { paragraphId: VALID_ID, content: "第一段原文。" },
        { paragraphId: "not-in-outline", content: "野生段落原文。" },
        { paragraphId: VALID_ID, content: "第一段的第二片段。" },
        { paragraphId: VALID_ID_2, content: "第二段原文。" },
      ],
      unmapped: ["封面頁文字"],
    });

    const result = await service.importReport(textSource());

    // Info: (20260716 - Tzuhan) 同段多片段串接;內容逐字保真
    const first = result.segments.find((s) => s.paragraphId === VALID_ID);
    expect(first?.content).toBe("第一段原文。\n\n第一段的第二片段。");
    expect(first?.title).toContain(CARBON_REPORT_OUTLINE[0].code);
    expect(
      result.segments.find((s) => s.paragraphId === VALID_ID_2)?.content,
    ).toBe("第二段原文。");
    // Info: (20260716 - Tzuhan) 非法 id 不丟棄 → 降入 unmapped(由使用者裁決)
    expect(result.unmapped).toEqual(["封面頁文字", "野生段落原文。"]);
  });

  it("should adjudicate activities per record (bad unit dropped) and tag the file as source", async () => {
    const { service } = buildService({
      segments: [{ paragraphId: VALID_ID, content: "內文" }],
      unmapped: [],
      activities: [
        {
          scopeCategory: GhgProtocolCategory.SCOPE_2_INDIRECT,
          sourceName: "外購電力",
          quantity: "1,200,000",
          unit: MeasurementUnit.KWH,
        },
        {
          scopeCategory: GhgProtocolCategory.SCOPE_1_DIRECT,
          sourceName: "柴油",
          quantity: "500",
          unit: "桶",
        },
      ],
    });

    const result = await service.importReport(textSource());
    expect(result.activities).toHaveLength(1);
    expect(result.activities[0]).toMatchObject({
      sourceName: "外購電力",
      quantity: "1,200,000",
      source: "old_report.md",
    });
  });

  it("should embed text sources in the prompt and send pdf as inlineData", async () => {
    const { service, spy } = buildService({ segments: [], unmapped: [] });
    await service.importReport(textSource("這是報告原文全文"));
    expect(spy.mock.calls[0][0]).toContain("這是報告原文全文");
    expect(spy.mock.calls[0][1]).toBeUndefined();

    const { service: pdfService, spy: pdfSpy } = buildService({
      segments: [],
      unmapped: [],
    });
    await pdfService.importReport({
      name: "old.pdf",
      mimeType: "application/pdf",
      data: "cGRmLWJhc2U2NA==",
      isText: false,
    });
    expect(pdfSpy.mock.calls[0][1]).toEqual([
      { data: "cGRmLWJhc2U2NA==", mimeType: "application/pdf" },
    ]);
  });
});

describe("ReportImportService chapter-scoped mode (chunked import)", () => {
  it("should scope the catalog to the chapter and demote out-of-scope ids to unmapped", async () => {
    const chapter = CARBON_REPORT_CHAPTERS[0];
    const inChapter = CARBON_REPORT_OUTLINE.filter(
      (s) => s.chapterId === chapter.id,
    );
    const outOfChapter = CARBON_REPORT_OUTLINE.find(
      (s) => s.chapterId !== chapter.id,
    );
    const { service, spy } = buildService({
      segments: [
        { paragraphId: inChapter[0].id, content: "本章內文" },
        // Info: (20260716 - Tzuhan) 範圍外 id(即使是合法大綱段落)必須降入 unmapped
        { paragraphId: outOfChapter?.id ?? "x", content: "他章內文" },
      ],
      unmapped: [],
    });

    const result = await service.importReport(textSource(), "zh-TW", {
      chapterId: chapter.id,
      extractActivities: false,
    });

    expect(result.segments.map((s) => s.paragraphId)).toEqual([
      inChapter[0].id,
    ]);
    expect(result.unmapped).toEqual(["他章內文"]);
    // Info: (20260716 - Tzuhan) prompt 只含本章段落目錄與範圍規則
    const prompt = spy.mock.calls[0][0];
    expect(prompt).toContain(inChapter[0].id);
    expect(prompt).not.toContain(outOfChapter?.id ?? "___");
    expect(prompt).toContain("本次只處理下列段落範圍");
    expect(prompt).toContain("本次呼叫不需要萃取活動數據");
  });
});

// Info: (20260727 - Tzuhan) #57 草稿補齊:白名單複驗、範圍外捨棄、同段串接、prompt 含草稿規則
describe("ReportImportService.draftMissingSections", () => {
  it("should return drafts only for requested sections and discard out-of-scope ids", async () => {
    const { service, spy } = buildService({
      segments: [
        { paragraphId: VALID_ID, content: "依原文撰寫的草稿。" },
        { paragraphId: VALID_ID_2, content: "範圍外草稿,應被捨棄。" },
        { paragraphId: VALID_ID, content: "同段第二片段。" },
      ],
    });

    const drafts = await service.draftMissingSections(
      textSource(),
      [VALID_ID],
      "zh-TW",
    );

    expect(drafts).toHaveLength(1);
    expect(drafts[0].paragraphId).toBe(VALID_ID);
    expect(drafts[0].content).toBe("依原文撰寫的草稿。\n\n同段第二片段。");
    // Info: (20260727 - Tzuhan) prompt 必須載明草稿規則:允許改寫但事實僅限原文、缺漏以(待補)佔位
    const prompt = spy.mock.calls[0][0];
    expect(prompt).toContain("待補");
    expect(prompt).toContain("嚴禁自行計算");
  });

  it("should reject empty or unknown section id lists", async () => {
    const { service } = buildService({ segments: [] });
    await expect(
      service.draftMissingSections(textSource(), [], "zh-TW"),
    ).rejects.toThrow();
    await expect(
      service.draftMissingSections(textSource(), ["not-in-outline"], "zh-TW"),
    ).rejects.toThrow();
  });
});

// Info: (20260730 - Tzuhan) 實測 gemini-2.5-pro 逐章匯入時,思考 token 與輸出共用 maxOutputTokens,
// Info: (20260730 - Tzuhan) 原本 8192 讓內容較多的前四章全數截斷。截斷必須與「模型亂回」分流。
describe("ReportImportService 輸出額度與截斷處理", () => {
  const truncatingService = (): ReportImportService => {
    const spy = jest
      .fn<GenerateRawWithImages>()
      .mockRejectedValue(
        new Error(`${LLM_TRUNCATED_ERROR_MARKER}: output hit maxOutputTokens`),
      );
    return new ReportImportService({
      generateRawWithImages: spy,
    } as unknown as ChatService);
  };

  it("逐字照抄以放大的輸出額度呼叫(不再是 8192)", async () => {
    const { service, spy } = buildService({ segments: [], unmapped: [] });
    await service.importReport(textSource(), "zh_tw", {
      extractActivities: false,
    });
    const options = spy.mock.calls[0][4] as { maxOutputTokens?: number };
    expect(options.maxOutputTokens).toBe(LLM_MAX_OUTPUT_TOKENS.REPORT_IMPORT);
    expect(LLM_MAX_OUTPUT_TOKENS.REPORT_IMPORT).toBeGreaterThan(8192);
  });

  it("輸出被截斷時回專屬錯誤碼,而非籠統的匯入失敗", async () => {
    await expect(
      truncatingService().importReport(textSource(), "zh_tw"),
    ).rejects.toMatchObject({
      code: API_ERRORS.IS_LLM_OUTPUT_TRUNCATED.code,
    });
  });

  it("草稿補齊同樣區分截斷錯誤", async () => {
    await expect(
      truncatingService().draftMissingSections(textSource(), [VALID_ID]),
    ).rejects.toMatchObject({
      code: API_ERRORS.IS_LLM_OUTPUT_TRUNCATED.code,
    });
  });
});
