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
      new Error("Gemini connection reset: secret internal detail"),
    );
    const service = new ParagraphDraftService(mockChatService);

    const promise = service.generateParagraphDraft(baseInput);
    await expect(promise).rejects.toBeInstanceOf(ApiError);
    await expect(promise).rejects.toMatchObject({
      code: API_ERRORS.IS_PARAGRAPH_DRAFT_FAILED.code,
      message: API_ERRORS.IS_PARAGRAPH_DRAFT_FAILED.message,
    });
  });

  it("should map quota-exhaustion errors to IS_LLM_QUOTA_EXCEEDED without leaking details", async () => {
    // Info: (20260715 - Emily) isLlmQuotaError 以訊息關鍵字分類:429/quota 類錯誤需回專屬錯誤碼供前端顯示額度提示
    const mockChatService = buildMockChatService(
      new Error("Gemini quota exceeded: secret internal detail"),
    );
    const service = new ParagraphDraftService(mockChatService);

    const promise = service.generateParagraphDraft(baseInput);
    await expect(promise).rejects.toBeInstanceOf(ApiError);
    await expect(promise).rejects.toMatchObject({
      code: API_ERRORS.IS_LLM_QUOTA_EXCEEDED.code,
      message: API_ERRORS.IS_LLM_QUOTA_EXCEEDED.message,
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

describe("ParagraphDraftService revision mode (#55)", () => {
  it("should build a minimal-change revision prompt with original content and instruction", async () => {
    const generateRaw = jest.fn<() => Promise<string>>().mockResolvedValue(
      JSON.stringify({
        content: "修訂後的段落內文。",
        citedFacts: ["外購電力: 1,300,000 度"],
      }),
    );
    const mockChatService = { generateRaw } as unknown as ChatService;
    const service = new ParagraphDraftService(mockChatService);

    const draft = await service.generateParagraphDraft({
      ...baseInput,
      existingContent: "既有段落原文。",
      instruction: "依新版帳單更新用電量描述",
      contextFacts: [{ label: "外購電力", value: "1,300,000 度" }],
    });

    expect(draft.content).toBe("修訂後的段落內文。");
    // Info: (20260716 - Emily) 修訂 prompt 必含:原文、指示、最小變更規則、禁止無佐證新數字
    const prompt = generateRaw.mock.calls[0]?.[0] as unknown as string;
    expect(prompt).toContain("既有段落原文。");
    expect(prompt).toContain("依新版帳單更新用電量描述");
    expect(prompt).toContain("最小變更");
    expect(prompt).toContain("嚴禁引入無佐證的新數字");
  });

  it("should keep whitelist adjudication in revision mode", async () => {
    const mockChatService = buildMockChatService("{}");
    const service = new ParagraphDraftService(mockChatService);
    await expect(
      service.generateParagraphDraft({
        ...baseInput,
        paragraphId: "fabricated-section",
        existingContent: "原文",
        instruction: "改一下",
      }),
    ).rejects.toMatchObject({ code: API_ERRORS.VL_SCHEMA_ERROR.code });
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
