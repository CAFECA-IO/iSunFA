// Info: (20260714 - Tzuhan) Carbon Chatbot 段落草稿生成服務
// Info: (20260714 - Tzuhan) 職責:依 CARBON_REPORT_OUTLINE 的段落 guidance + 對話上下文 + 已確認事實,由 LLM 撰寫段落敘述草稿
// Info: (20260714 - Tzuhan) 邊界:LLM 只撰寫敘述;段落對應由白名單裁決、數值一律引用輸入事實原值,嚴禁 LLM 計算或虛構

import { logger } from "@/lib/utils/logger";
// Info: (20260714 - Tzuhan) AI 串接單一閘道:SDK 型別與呼叫一律經 chat.service,本檔不直接依賴 @google/generative-ai
import {
  ChatService,
  isLlmQuotaError,
  isLlmTimeoutError,
  SchemaType,
  type Schema,
} from "@/services/chat.service";
import {
  LLM_SYNC_TIMEOUT_MS,
  LLM_TEMPERATURE,
  LlmTaskKeyEnum,
} from "@/constants/llm";
import { ApiError, API_ERRORS } from "@/lib/utils/error_dictionary";
import {
  CARBON_REPORT_OUTLINE,
  ICarbonReportSection,
} from "@/constants/carbon_report_outline";
import {
  carbonFrameworkView,
  type ICarbonFrameworkView,
} from "@/lib/carbon_framework_view";
import { CarbonDisclosureFrameworkEnum } from "@/constants/carbon_report_framework";
import { CarbonParagraphDraftLlmOutputSchema } from "@/validators";
import {
  IParagraphDraft,
  IParagraphDraftInput,
} from "@/interfaces/carbon_paragraph_draft";
import { ChatRoleEnum } from "@/types/carbon_chatbot.types";

// Info: (20260714 - Tzuhan) Gemini responseSchema:以結構約束輸出,禁止自由格式 + Regex 硬抓
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
  // Info: (20260714 - Tzuhan) ChatService 延遲建立(避免 import 階段因缺 API Key 拋錯),測試時可注入 mock
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
    // Info: (20260714 - Tzuhan) 白名單裁決:段落必須存在於標準大綱(validator 已擋,此處為服務層防線)
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

    /*
     * Info: (20260821 - Emily) 角色句與 guidance 走同一個框架視圖 —— 兩個框架欄位
     * 出自同一次呼叫,不存在「guidance 換了 IFRS、角色句還在說 ISO」的寫法
     * (08-18 那個分裂的反向版,見 carbon_framework_view.ts 檔頭)。
     */
    const view = carbonFrameworkView(
      input.framework ?? CarbonDisclosureFrameworkEnum.INVENTORY_ONLY,
    );
    const prompt = this.buildPrompt(section, input, view);

    let raw: string;
    try {
      // Info: (20260714 - Tzuhan) 資料萃取/撰寫任務 Temperature = 0,確保可重現
      // Info: (20260716 - Tzuhan) 同步路徑防護(#6515):45s 逾時 + 用量記錄
      raw = await this.getChatService().generateRaw(
        prompt,
        DRAFT_RESPONSE_SCHEMA,
        {
          temperature: LLM_TEMPERATURE.EXTRACTION,
          timeoutMs: LLM_SYNC_TIMEOUT_MS,
          taskKey: LlmTaskKeyEnum.PARAGRAPH_DRAFT,
        },
      );
    } catch (error) {
      // Info: (20260714 - Tzuhan) 包裝 LLM 原始錯誤,不讓 Gemini 錯誤細節噴到前端;額度耗盡/逾時回專屬錯誤碼
      logger.error(
        `[ParagraphDraftService] LLM call failed: ${JSON.stringify(error)}`,
      );
      let def = API_ERRORS.IS_PARAGRAPH_DRAFT_FAILED;
      if (isLlmQuotaError(error)) def = API_ERRORS.IS_LLM_QUOTA_EXCEEDED;
      else if (isLlmTimeoutError(error)) def = API_ERRORS.IS_LLM_TIMEOUT;
      throw new ApiError(def.code, def.message, def.status);
    }

    // Info: (20260714 - Tzuhan) 永不直接採信 LLM 輸出:JSON 解析 + Zod 雙重護欄
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
    view: ICarbonFrameworkView,
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

    // Info: (20260714 - Tzuhan) 數據段落:數字由後端決定論管線勾稽,LLM 只寫說明文字並保留表格佔位
    /*
     * Info: (20260821 - Emily) fail fast(PR review B1):原本寫
     * `view.guidanceOf(id) ?? section.guidance` —— 視圖的整個目的是讓
     * 「只換其中一個」寫不出來,而那個 fallback 在呼叫端把它寫回來了:
     * IFRS 角色句配 ISO guidance,就是 08-18 那個分裂。集合相等測試讓它
     * 今天不可達,但不可達的洞要用 throw 封死,不是靠測試蓋住。
     */
    const guidance = view.guidanceOf(section.id);
    if (guidance === undefined) {
      throw new ApiError(
        API_ERRORS.VL_SCHEMA_ERROR.code,
        API_ERRORS.VL_SCHEMA_ERROR.message,
        API_ERRORS.VL_SCHEMA_ERROR.status,
      );
    }

    const dataDrivenRule = section.isDataDriven
      ? "\n6. 本段為數據段落:不得自行產生任何統計表格或加總數字,僅撰寫方法說明文字,並在表格應出現處保留「(數據表格由系統產出)」佔位。"
      : "";

    // Info: (20260716 - Tzuhan) #55 修訂模式:提供原文與指示,規則改為「最小變更」;
    // Info: (20260716 - Tzuhan) 修訂稿不直接落地 — 由前端以對照卡呈現,人工確認後才寫入報告
    if (input.existingContent && input.instruction) {
      return `你是一位專業碳會計師,負責「修訂」溫室氣體盤查報告書的既有段落。

【段落資訊】
編號: ${section.code}
標題: ${section.title}

【既有段落原文】(修訂基準)
${input.existingContent}

【修訂指示】
${input.instruction}

【已確認事實】(引用數值的唯一合法來源)
${factsBlock}

【修訂規則】
1. 只輸出修訂後的完整段落內文(Markdown),不要輸出章節編號或段落標題。
2. 最小變更原則:僅修改與指示及新事實相關的語句,其餘句子逐字保留原文。
3. 所有數值、名稱、年份必須來自【已確認事實】或原文既有內容;嚴禁引入無佐證的新數字。
4. 嚴禁自行計算、換算或推導任何數字。
5. 使用 ${input.language ?? "zh-TW"} 撰寫。
6. citedFacts 逐條列出修訂實際引用的事實;未引用回空陣列。${dataDrivenRule}`;
    }

    /**
     * Info: (20260818 - Emily) 角色句原本寫「(IFRS S1/S2 對齊)」——
     * 而 `open/44` 只改了 guidance(`open/44` 的驗收條件也只寫到 guidance)。
     *
     * 這一句的位置比 guidance **更前面**,而且每一次草稿呼叫都會注入:
     * 模型會同時收到「這是一份 IFRS S1/S2 對齊的報告」與「請依 ISO 14064-1 寫這一節」,
     * 兩句互相矛盾而框架句在前。改了 guidance 卻留著這句,等於修正端與生效端沒對上 ——
     * B2 的閘門(「報告上宣告錯的標準」)在這裡才真的關上。
     *
     * 標準名稱取自框架視圖(單一來源)。直接 import 標準常數在本檔是禁止的,
     * 由 carbon_framework_view.test.ts 的掃描釘住 —— 掃描含註解,所以這裡不寫常數名。
     */
    return `你是一位專業碳會計師,負責撰寫依 ${view.standardLabel} 編製的溫室氣體盤查報告書的指定段落草稿。

【段落資訊】
編號: ${section.code}
標題: ${section.title}
撰寫目標: ${guidance}

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
