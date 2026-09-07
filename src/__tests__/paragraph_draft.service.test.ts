// Info: (20260714 - Tzuhan) ParagraphDraftService 單元測試:mock ChatService,驗證白名單裁決、LLM 輸出護欄與錯誤包裝

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
    // Info: (20260715 - Tzuhan) isLlmQuotaError 以訊息關鍵字分類:429/quota 類錯誤需回專屬錯誤碼供前端顯示額度提示
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
    const generateRaw = jest
      .fn<(prompt: string) => Promise<string>>()
      .mockResolvedValue(
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
    // Info: (20260716 - Tzuhan) 修訂 prompt 必含:原文、指示、最小變更規則、禁止無佐證新數字
    const prompt = generateRaw.mock.calls[0]?.[0] ?? "";
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

/**
 * Info: (20260904 - Emily) 產物守門搬進服務本體(#6745;PR #6716 round-3 阻擋 3 的完整版)。
 *
 * 三個入口(對話 readyParagraphId、`/draft` 生成與修訂、附件管線)原本只有第一個
 * 在 route 裡接了一段守門,另外兩個**零檢查** —— 主入口攔下的東西,重試一次就從沒門的路進來。
 * 守門放在生成本體,呼叫端想繞都繞不掉;這一組直接對服務逼:攔/不攔成對。
 */
describe("產物守門:帶排放單位的數字必須溯源到事實包(#6745)", () => {
  const fabricated = JSON.stringify({
    content: "本公司 2024 年度總排放量為 12,345.67 公噸 CO2e。",
    citedFacts: [],
  });
  const facts = [
    { label: "總排放量", value: "8,332.581 公噸 CO2e", source: "帳本" },
  ];

  it("事實包裡沒有那個數字 → 攔下,拋具名錯誤,草稿不落地", async () => {
    const service = new ParagraphDraftService(buildMockChatService(fabricated));
    await expect(
      service.generateParagraphDraft({ ...baseInput, contextFacts: facts }),
    ).rejects.toMatchObject({
      code: API_ERRORS.VA_DRAFT_QUANTITY_UNSOURCED.code,
    });
  });

  it("數字在事實包裡 → 放行(否則「攔掉一切」也會讓上面那條綠)", async () => {
    const sourced = JSON.stringify({
      content: "本公司 2024 年度總排放量為 8,332.581 公噸 CO2e。",
      citedFacts: ["總排放量"],
    });
    const service = new ParagraphDraftService(buildMockChatService(sourced));
    const draft = await service.generateParagraphDraft({
      ...baseInput,
      contextFacts: facts,
    });
    expect(draft.content).toContain("8,332.581");
  });

  it("呼叫端沒帶事實包(undefined)→ 跳過,與回覆守門同一個上崗條件", async () => {
    /**
     * Info: (20260904 - Emily) 這一條是**界**,不是放行的理由:它意味著 `/draft`
     * 的前端若不帶事實包,這道門對它永遠是跳過 —— 所以前端那半是本票的必要條件,
     * 由 hook 的接線掃描守。
     */
    const service = new ParagraphDraftService(buildMockChatService(fabricated));
    await expect(
      service.generateParagraphDraft(baseInput),
    ).resolves.toMatchObject({ paragraphId: VALID_PARAGRAPH_ID });
  });

  it("帶了空陣列 → 照跑(帳本空正是編造最沒阻力的一格)", async () => {
    const service = new ParagraphDraftService(buildMockChatService(fabricated));
    await expect(
      service.generateParagraphDraft({ ...baseInput, contextFacts: [] }),
    ).rejects.toMatchObject({
      code: API_ERRORS.VA_DRAFT_QUANTITY_UNSOURCED.code,
    });
  });

  it("使用者自己說過的數字算合法(與回覆守門同一對來源)", async () => {
    const service = new ParagraphDraftService(buildMockChatService(fabricated));
    await expect(
      service.generateParagraphDraft({
        ...baseInput,
        conversationContext: [
          { role: ChatRoleEnum.USER, text: "我們去年總量 12,345.67 公噸" },
        ],
        contextFacts: [],
      }),
    ).resolves.toMatchObject({ paragraphId: VALID_PARAGRAPH_ID });
  });

  it("修訂模式:原文既有的數字算合法(修訂不該因原文本來就有的數字被攔)", async () => {
    const service = new ParagraphDraftService(buildMockChatService(fabricated));
    await expect(
      service.generateParagraphDraft({
        ...baseInput,
        contextFacts: [],
        existingContent: "本公司總排放量 12,345.67 公噸 CO2e,較去年下降。",
        instruction: "把語氣改得更正式",
      }),
    ).resolves.toMatchObject({ paragraphId: VALID_PARAGRAPH_ID });
  });

  it("AI 輪次的數字**不**算合法(否則模型可以先在對話裡編、再在草稿裡引用自己)", async () => {
    const service = new ParagraphDraftService(buildMockChatService(fabricated));
    await expect(
      service.generateParagraphDraft({
        ...baseInput,
        conversationContext: [
          { role: ChatRoleEnum.AI, text: "貴公司去年總量約 12,345.67 公噸" },
        ],
        contextFacts: [],
      }),
    ).rejects.toMatchObject({
      code: API_ERRORS.VA_DRAFT_QUANTITY_UNSOURCED.code,
    });
  });

  it("被攔下的錯誤能被型別守衛認出,且與生成失敗分得開", async () => {
    const { isDraftQuantityGateError } =
      await import("@/services/paragraph_draft.service");
    const gateError = new ApiError(
      API_ERRORS.VA_DRAFT_QUANTITY_UNSOURCED.code,
      "x",
      API_ERRORS.VA_DRAFT_QUANTITY_UNSOURCED.status,
    );
    const failure = new ApiError(
      API_ERRORS.IS_PARAGRAPH_DRAFT_FAILED.code,
      "x",
      API_ERRORS.IS_PARAGRAPH_DRAFT_FAILED.status,
    );
    expect(isDraftQuantityGateError(gateError)).toBe(true);
    expect(isDraftQuantityGateError(failure)).toBe(false);
    expect(isDraftQuantityGateError(new Error("x"))).toBe(false);
  });
});
