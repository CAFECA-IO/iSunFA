import {
  GoogleGenerativeAI,
  Part,
  Tool,
  Schema,
  SchemaType,
  GenerationConfig,
  ModelParams,
} from "@google/generative-ai";
import { DirectChatSkill } from "@/skills/chat/direct_chat";
import { CARBON_CHAT_GREETING_PROMPT } from "@/constants/carbon_chatbot";
import { CARBON_REPORT_OUTLINE } from "@/constants/carbon_report_outline";
import { CarbonChatStructuredReplySchema } from "@/validators";

// Info: (20260714 - Emily) 結構化聊天回覆:readyParagraphId 已通過白名單裁決(非法/none 一律為 null)
export interface ICarbonChatStructuredReply {
  reply: string;
  readyParagraphId: string | null;
}

// Info: (20260714 - Emily) readyParagraphId 的無段落標記(LLM enum 選項之一)
const NO_READY_PARAGRAPH = "none";

// Info: (20260714 - Emily) 判斷 LLM 錯誤是否為額度耗盡(429/RESOURCE_EXHAUSTED),供呼叫端回專屬錯誤碼
export const isLlmQuotaError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("429") ||
    message.includes("resource_exhausted") ||
    message.includes("quota")
  );
};

// Info: (20260714 - Emily) 聊天回覆 responseSchema:readyParagraphId 以 enum 約束,禁止 LLM 捏造段落 id
const CARBON_CHAT_REPLY_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    reply: {
      type: SchemaType.STRING,
      description: "顯示給用戶的對話回覆(Markdown)",
    },
    readyParagraphId: {
      type: SchemaType.STRING,
      format: "enum",
      enum: [...CARBON_REPORT_OUTLINE.map((s) => s.id), NO_READY_PARAGRAPH],
      description: "資訊已蒐集齊全可寫入報告的段落 id;尚未齊全時為 none",
    },
  },
  required: ["reply", "readyParagraphId"],
};

export type { Part, Schema, Tool };
// Info: (20260714 - Emily) SchemaType 一併由此 re-export:所有 AI 串接(含 responseSchema 定義)統一經 chat.service,
// Info: (20260714 - Emily) 其他服務不得直接 import @google/generative-ai(未來切換本地模型只需改本檔)
export { SchemaType };

export interface IChatGenerationOptions {
  modelName?: string;
  temperature?: number;
  maxOutputTokens?: number;
  responseSchema?: Schema;
  isJson?: boolean;
  tools?: Tool[];
}

export class ChatService {
  private genAI: GoogleGenerativeAI;
  private modelName: string;

  /**
   * Info: (20260707 - Luphia)
   * 1. API Key 管理中心化：apiKey 改為選填，預設從環境變數讀取。
   *    組件端與業務邏輯層不再需要負責 apiKey 的讀取與驗證，簡化呼叫流程。
   * 2. 本地模型支援預留：將 apiKey 讀取移入 Service 內部，是為了未來能根據環境變數
   *    直接切換至本地模型（如 Ollama）而不需要修改外部呼叫端的代碼。
   */
  constructor(apiKey?: string) {
    const key =
      apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (!key) {
      // Info: (20260707 - Luphia) 若未來支援純本地模型且不需 Key，此處應改為僅在切換至 Google Provider 時才拋錯
      throw new Error(
        "Missing GEMINI_API_KEY or GOOGLE_API_KEY in environment",
      );
    }

    this.genAI = new GoogleGenerativeAI(key);
    this.modelName = process.env.MODEL || "gemini-1.5-flash";
  }

  /**
   * Info: (20260701 - Tzuhan)
   * Universal generateContent interface for all services
   */
  async generateContent(
    parts: Part[],
    options?: IChatGenerationOptions,
  ): Promise<string> {
    const modelName = options?.modelName || this.modelName;
    const generationConfig: GenerationConfig = {};

    if (options?.temperature !== undefined) {
      generationConfig.temperature = options.temperature;
    }
    if (options?.maxOutputTokens !== undefined) {
      generationConfig.maxOutputTokens = options.maxOutputTokens;
    }
    if (options?.isJson || options?.responseSchema) {
      generationConfig.responseMimeType = "application/json";
    }
    if (options?.responseSchema) {
      generationConfig.responseSchema = options.responseSchema;
    }

    const modelOptions: ModelParams = {
      model: modelName,
      generationConfig,
    };

    if (options?.tools && options.tools.length > 0) {
      modelOptions.tools = options.tools;
    }

    const model = this.genAI.getGenerativeModel(modelOptions);

    const result = await model.generateContent(parts);
    const response = await result.response;
    return response.text();
  }

  async generateResponse(
    message: string,
    tags: string[] = [],
    file?: string,
    mimeType?: string,
  ): Promise<string> {
    const skill = new DirectChatSkill();
    return skill.execute(message, tags, file, mimeType, this);
  }

  /**
   * Info: (20260714 - Emily) 碳會計師人設(單一來源):結構化回覆與招呼詞共用,避免 prompt 漂移
   */
  private buildCarbonPersonaInstruction(
    currentStep?: string,
    language?: string,
  ): string {
    const langInstruction = language ? `\n請務必使用 ${language} 回覆。` : "";
    const outlineCatalog = CARBON_REPORT_OUTLINE.map(
      (s) => `${s.id}: ${s.code} ${s.title}`,
    ).join("\n");
    return `你是一個專業的碳會計師 (Carbon Accountant)。你的任務是引導用戶進行溫室氣體盤查。請一步步問問題，引導用戶回答，並在適當的時機請用戶上傳相關資料（如BOM表、能源帳單等）。請保持專業、友善，且每次對話只問一個核心問題以免用戶混淆。${currentStep ? `\n當前盤查流程節點：【${currentStep}】。請根據此階段的目標來引導對話。` : ""}
【報告寫入機制】你的回覆一律為 JSON:reply 填對話內容;readyParagraphId 依下列規則填寫:
- 用戶已提供當前段落所需的關鍵資訊,或明確同意/確認你彙整的內容時 → 填該段落的 id(只能從下方清單挑選)
- 資訊尚未齊全、仍在追問時 → 填 "${NO_READY_PARAGRAPH}"
- 填入段落 id 後,系統會自動將該段草稿寫入右側報告;此時請在 reply 告知用戶「本段已寫入報告,可於右側預覽檢視」,不要把完整草稿貼在對話中,也不要再重複詢問同一段落。
【段落清單】
${outlineCatalog}${langInstruction}`;
  }

  /**
   * Info: (20260714 - Emily) 碳會計師結構化回覆:對話內容 + 段落完成訊號(碳盤查對 Gemini 的唯一對話路徑)
   * Info: (20260714 - Emily) 解決「無限訪談迴圈」:AI 判斷段落資訊已齊全時回報 readyParagraphId,
   * Info: (20260714 - Emily) 由路由層觸發 ParagraphDraftService 寫入報告;id 經 enum 約束 + 本方法白名單裁決
   */
  async generateCarbonChatbotStructuredResponse(
    history: { role: "user" | "model"; text: string }[],
    currentStep?: string,
    language?: string,
  ): Promise<ICarbonChatStructuredReply> {
    const model = this.genAI.getGenerativeModel({
      model: this.modelName,
      systemInstruction: this.buildCarbonPersonaInstruction(
        currentStep,
        language,
      ),
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: CARBON_CHAT_REPLY_SCHEMA,
      },
    });

    const contents = history.map((msg) => ({
      role: msg.role,
      parts: [{ text: msg.text }],
    }));

    const response = await model.generateContent({ contents });
    const raw = response.response.text();

    // Info: (20260714 - Emily) 永不直接採信 LLM 輸出:JSON + Zod 護欄;解析失敗降級為純文字回覆(不中斷對話)
    try {
      const parsed = CarbonChatStructuredReplySchema.parse(JSON.parse(raw));
      const isValidParagraph = CARBON_REPORT_OUTLINE.some(
        (s) => s.id === parsed.readyParagraphId,
      );
      return {
        reply: parsed.reply,
        readyParagraphId: isValidParagraph ? parsed.readyParagraphId : null,
      };
    } catch {
      return { reply: raw, readyParagraphId: null };
    }
  }

  /**
   * Info: (20260712 - Luphia)
   * 進入 channel 時的前置作業：以 bootstrap 指令產生開場招呼詞（不含真實對話歷史）
   * Info: (20260714 - Emily) 改走結構化回覆(移除重複的純文字對話方法,人設單一來源);招呼詞只取 reply
   */
  async generateCarbonChatbotGreeting(
    currentStep?: string,
    language?: string,
  ): Promise<string> {
    const structured = await this.generateCarbonChatbotStructuredResponse(
      [{ role: "user", text: CARBON_CHAT_GREETING_PROMPT }],
      currentStep,
      language,
    );
    return structured.reply;
  }

  async generateRawWithImages(
    prompt: string,
    images?: { data: string; mimeType: string }[],
    isJson: boolean = false,
    responseSchema?: Schema,
    options?: IChatGenerationOptions,
  ): Promise<string> {
    const parts: Part[] = [{ text: prompt }];

    if (images && images.length > 0) {
      images.forEach((img) => {
        parts.push({
          inlineData: {
            data: img.data,
            mimeType: img.mimeType,
          },
        });
      });
    }

    return this.generateContent(parts, {
      ...options,
      isJson: isJson || options?.isJson,
      responseSchema: responseSchema || options?.responseSchema,
    });
  }

  async generateRaw(
    prompt: string,
    responseSchema?: Schema,
    options?: IChatGenerationOptions,
  ): Promise<string> {
    return this.generateContent([{ text: prompt }], {
      temperature: 0.2, // Info: (20260701 - Tzuhan) Default legacy behavior
      ...options,
      responseSchema: responseSchema || options?.responseSchema,
    });
  }

  async countTokens(text: string): Promise<number> {
    try {
      const model = this.genAI.getGenerativeModel({ model: this.modelName });
      const response = await model.countTokens(text);
      return response.totalTokens;
    } catch {
      return 0;
    }
  }

  async generateRawWithSearch(
    prompt: string,
    options?: IChatGenerationOptions,
  ): Promise<string> {
    // Info: (20260311 - Tzuhan) Use explicitly typed googleSearch tool for Gemini Grounding
    const searchTool = { googleSearch: {} } as Tool & { googleSearch: unknown };

    return this.generateContent([{ text: prompt }], {
      temperature: 0.2, // Info: (20260701 - Tzuhan) Default strict temperature
      ...options,
      tools: [searchTool, ...(options?.tools || [])],
    });
  }
}
