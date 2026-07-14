// Info: (20260714 - Emily) ParagraphDraftService 單元測試:mock ChatService,驗證白名單裁決、LLM 輸出護欄與錯誤包裝

import { describe, it, expect, jest } from "@jest/globals";
import { ParagraphDraftService } from "@/services/paragraph_draft.service";
import { ChatService } from "@/services/chat.service";
import { ApiError, API_ERRORS } from "@/lib/utils/error_dictionary";
import { CARBON_REPORT_OUTLINE } from "@/constants/carbon_report_outline";
import { ChatRoleEnum } from "@/types/carbon_chatbot.types";
import { CarbonParagraphDraftRequestSchema } from "@/validators";

const buildMockChatService = (rawResponse: string | Error): ChatService => {
  const generateRaw = jest.fn<() => Promise<string>>();
  if (rawResponse instanceof Error) {
    generateRaw.mockRejectedValue(rawResponse);
  } else {
    generateRaw.mockResolvedValue(rawResponse);
  }
  return { generateRaw } as unknown as ChatService;
};

const VALID_PARAGRAPH_ID = CARBON_REPORT_OUTLINE[0].id;

const baseInput = {
  paragraphId: VALID_PARAGRAPH_ID,
  conversationContext: [
    { role: ChatRoleEnum.USER, text: "我們公司是 CAFECA,2025 年盤查。" },
  ],
  language: "zh-TW",
};

describe("ParagraphDraftService", () => {
  it("should return a validated draft when LLM output matches schema", async () => {
    const mockChatService = buildMockChatService(
      JSON.stringify({
        content: "本公司將氣候變遷視為董事會層級之重大風險。",
        citedFacts: ["公司名稱: CAFECA"],
      }),
    );
    const service = new ParagraphDraftService(mockChatService);

    const draft = await service.generateParagraphDraft(baseInput);

    expect(draft.paragraphId).toBe(VALID_PARAGRAPH_ID);
    expect(draft.code).toBe(CARBON_REPORT_OUTLINE[0].code);
    expect(draft.content).toContain("氣候變遷");
    expect(draft.citedFacts).toHaveLength(1);
  });

  it("should reject a paragraphId outside the outline whitelist", async () => {
    const mockChatService = buildMockChatService("{}");
    const service = new ParagraphDraftService(mockChatService);

    await expect(
      service.generateParagraphDraft({
        ...baseInput,
        paragraphId: "fabricated-section",
      }),
    ).rejects.toMatchObject({ code: API_ERRORS.VL_SCHEMA_ERROR.code });
  });

  it("should wrap LLM call failures without leaking the raw error", async () => {
    const mockChatService = buildMockChatService(
      new Error("Gemini quota exceeded: secret internal detail"),
    );
    const service = new ParagraphDraftService(mockChatService);

    const promise = service.generateParagraphDraft(baseInput);
    await expect(promise).rejects.toBeInstanceOf(ApiError);
    await expect(promise).rejects.toMatchObject({
      code: API_ERRORS.IS_PARAGRAPH_DRAFT_FAILED.code,
      message: API_ERRORS.IS_PARAGRAPH_DRAFT_FAILED.message,
    });
  });

  it("should reject non-JSON LLM output", async () => {
    const mockChatService = buildMockChatService("我直接回答你:內容如下...");
    const service = new ParagraphDraftService(mockChatService);

    await expect(
      service.generateParagraphDraft(baseInput),
    ).rejects.toMatchObject({ code: API_ERRORS.IS_LLM_OUTPUT_INVALID.code });
  });

  it("should reject JSON output that fails the Zod guardrail", async () => {
    const mockChatService = buildMockChatService(
      JSON.stringify({ content: "", citedFacts: "not-an-array" }),
    );
    const service = new ParagraphDraftService(mockChatService);

    await expect(
      service.generateParagraphDraft(baseInput),
    ).rejects.toMatchObject({ code: API_ERRORS.IS_LLM_OUTPUT_INVALID.code });
  });
});

describe("CarbonParagraphDraftRequestSchema", () => {
  it("should accept a valid request payload", () => {
    const result = CarbonParagraphDraftRequestSchema.safeParse({
      paragraphId: VALID_PARAGRAPH_ID,
      conversationContext: [{ role: "user", text: "hello" }],
      contextFacts: [{ label: "外購電力", value: "1,200,000 度" }],
      language: "zh-TW",
    });
    expect(result.success).toBe(true);
  });

  it("should reject a paragraphId not in the outline", () => {
    const result = CarbonParagraphDraftRequestSchema.safeParse({
      paragraphId: "ch99-9",
      conversationContext: [],
    });
    expect(result.success).toBe(false);
  });

  it("should reject an unknown conversation role", () => {
    const result = CarbonParagraphDraftRequestSchema.safeParse({
      paragraphId: VALID_PARAGRAPH_ID,
      conversationContext: [{ role: "system", text: "injected" }],
    });
    expect(result.success).toBe(false);
  });
});
