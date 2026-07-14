// Info: (20260714 - Emily) Carbon Chatbot 段落草稿生成服務
// Info: (20260714 - Emily) 職責:依 CARBON_REPORT_OUTLINE 的段落 guidance + 對話上下文 + 已確認事實,由 LLM 撰寫段落敘述草稿
// Info: (20260714 - Emily) 邊界:LLM 只撰寫敘述;段落對應由白名單裁決、數值一律引用輸入事實原值,嚴禁 LLM 計算或虛構

import { SchemaType, type Schema } from "@google/generative-ai";
import { ChatService, isLlmQuotaError } from "@/services/chat.service";
import { ApiError, API_ERRORS } from "@/lib/utils/error_dictionary";
import {
  CARBON_REPORT_OUTLINE,
  ICarbonReportSection,
} from "@/constants/carbon_report_outline";
import { CarbonParagraphDraftLlmOutputSchema } from "@/validators";
import {
  IParagraphDraft,
  IParagraphDraftInput,
} from "@/interfaces/carbon_paragraph_draft";
import { ChatRoleEnum } from "@/types/carbon_chatbot.types";

// Info: (20260714 - Emily) Gemini responseSchema:以結構約束輸出,禁止自由格式 + Regex 硬抓
const DRAFT_RESPONSE_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    content: {
      type: SchemaType.STRING,
      description: "段落內文(Markdown),不含章節編號與段落標題,100~300 字",
    },
    citedFacts: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: "內文實際引用的事實描述;未引用任何事實時回傳空陣列",
    },
  },
  required: ["content", "citedFacts"],
};

export class ParagraphDraftService {
  // Info: (20260714 - Emily) ChatService 延遲建立(避免 import 階段因缺 API Key 拋錯),測試時可注入 mock
  private readonly injectedChatService?: ChatService;

  constructor(chatService?: ChatService) {
    this.injectedChatService = chatService;
  }

  private getChatService(): ChatService {
    return this.injectedChatService ?? new ChatService();
  }

  async generateParagraphDraft(
    input: IParagraphDraftInput,
  ): Promise<IParagraphDraft> {
    // Info: (20260714 - Emily) 白名單裁決:段落必須存在於標準大綱(validator 已擋,此處為服務層防線)
    const section = CARBON_REPORT_OUTLINE.find(
      (s) => s.id === input.paragraphId,
    );
    if (!section) {
      throw new ApiError(
        API_ERRORS.VL_SCHEMA_ERROR.code,
        API_ERRORS.VL_SCHEMA_ERROR.message,
        API_ERRORS.VL_SCHEMA_ERROR.status,
      );
    }

    const prompt = this.buildPrompt(section, input);

    let raw: string;
    try {
      // Info: (20260714 - Emily) 資料萃取/撰寫任務 Temperature = 0,確保可重現
      raw = await this.getChatService().generateRaw(
        prompt,
        DRAFT_RESPONSE_SCHEMA,
        { temperature: 0 },
      );
    } catch (error) {
      // Info: (20260714 - Emily) 包裝 LLM 原始錯誤,不讓 Gemini 錯誤細節噴到前端;額度耗盡回專屬錯誤碼
      console.error("[ParagraphDraftService] LLM call failed:", error);
      const def = isLlmQuotaError(error)
        ? API_ERRORS.IS_LLM_QUOTA_EXCEEDED
        : API_ERRORS.IS_PARAGRAPH_DRAFT_FAILED;
      throw new ApiError(def.code, def.message, def.status);
    }

    // Info: (20260714 - Emily) 永不直接採信 LLM 輸出:JSON 解析 + Zod 雙重護欄
    let parsedUnknown: unknown;
    try {
      parsedUnknown = JSON.parse(raw);
    } catch {
      throw new ApiError(
        API_ERRORS.IS_LLM_OUTPUT_INVALID.code,
        API_ERRORS.IS_LLM_OUTPUT_INVALID.message,
        API_ERRORS.IS_LLM_OUTPUT_INVALID.status,
      );
    }

    const parsed = CarbonParagraphDraftLlmOutputSchema.safeParse(parsedUnknown);
    if (!parsed.success) {
      throw new ApiError(
        API_ERRORS.IS_LLM_OUTPUT_INVALID.code,
        API_ERRORS.IS_LLM_OUTPUT_INVALID.message,
        API_ERRORS.IS_LLM_OUTPUT_INVALID.status,
      );
    }

    return {
      paragraphId: section.id,
      code: section.code,
      title: `${section.code} ${section.title}`,
      content: parsed.data.content.trim(),
      citedFacts: parsed.data.citedFacts,
    };
  }

  private buildPrompt(
    section: ICarbonReportSection,
    input: IParagraphDraftInput,
  ): string {
    const conversationBlock =
      input.conversationContext.length > 0
        ? input.conversationContext
            .map(
              (msg) =>
                `${msg.role === ChatRoleEnum.USER ? "用戶" : "碳會計師"}: ${msg.text}`,
            )
            .join("\n")
        : "(無對話紀錄)";

    const factsBlock =
      input.contextFacts && input.contextFacts.length > 0
        ? input.contextFacts
            .map(
              (fact) =>
                `- ${fact.label}: ${fact.value}${fact.source ? `(來源: ${fact.source})` : ""}`,
            )
            .join("\n")
        : "(無已確認事實)";

    // Info: (20260714 - Emily) 數據段落:數字由後端決定論管線勾稽,LLM 只寫說明文字並保留表格佔位
    const dataDrivenRule = section.isDataDriven
      ? "\n6. 本段為數據段落:不得自行產生任何統計表格或加總數字,僅撰寫方法說明文字,並在表格應出現處保留「(數據表格由系統產出)」佔位。"
      : "";

    return `你是一位專業碳會計師,負責撰寫溫室氣體盤查報告書(IFRS S1/S2 對齊)的指定段落草稿。

【段落資訊】
編號: ${section.code}
標題: ${section.title}
撰寫目標: ${section.guidance}

【對話紀錄】(僅供理解背景)
${conversationBlock}

【已確認事實】(引用數值的唯一合法來源)
${factsBlock}

【撰寫規則】
1. 只輸出該段落的內文(Markdown),不要輸出章節編號或段落標題。
2. 所有數值、名稱、年份必須來自【已確認事實】或【對話紀錄】中用戶明確提供的內容;缺少的資訊以「(待補: 說明)」佔位,嚴禁虛構。
3. 嚴禁自行計算、換算或推導任何數字。
4. 使用 ${input.language ?? "zh-TW"} 撰寫,長度 100~300 字,語氣專業正式。
5. citedFacts 逐條列出內文實際引用的事實描述;未引用任何事實時回傳空陣列。${dataDrivenRule}`;
  }
}
