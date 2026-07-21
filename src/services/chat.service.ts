import {
  GoogleGenerativeAI,
  Part,
  Tool,
  Schema,
  SchemaType,
  GenerationConfig,
  ModelParams,
  GenerateContentResult,
} from "@google/generative-ai";
import { DirectChatSkill } from "@/skills/chat/direct_chat";
import { CARBON_CHAT_GREETING_PROMPT } from "@/constants/carbon_chatbot";
import { CARBON_REPORT_OUTLINE } from "@/constants/carbon_report_outline";
import {
  DEFAULT_GEMINI_MODEL,
  LLM_SYNC_TIMEOUT_MS,
  LLM_TEMPERATURE,
  LLM_TIMEOUT_ERROR_MARKER,
  LlmTaskKeyEnum,
} from "@/constants/llm";
import {
  CarbonChatStructuredReplySchema,
  CarbonActivityRecordSchema,
  CarbonInventoryExtractionSchema,
} from "@/validators";
import { GhgProtocolCategory } from "@/constants/esg";
import { MeasurementUnit } from "@/constants/enums";
import { IInventoryExtraction } from "@/types/carbon_chatbot.types";
import { logger } from "@/lib/utils/logger";

// Info: (20260714 - Emily) 結構化聊天回覆: readyParagraphId 已通過白名單裁決(非法/none 一律為 null)
// Info: (20260716 - Emily) #6518:extraction 為已裁決的事實萃取(壞欄位逐筆丟棄),null = 本輪無可萃取
export interface ICarbonChatStructuredReply {
  reply: string;
  readyParagraphId: string | null;
  extraction: IInventoryExtraction | null;
  // Info: (20260716 - Emily) #55 修訂請求:使用者要求「依附件/指示修改既有段落」時的目標段落(白名單裁決後)
  revisionParagraphId: string | null;
}

// Info: (20260714 - Emily) readyParagraphId 的無段落標記(LLM enum 選項之一)
const NO_READY_PARAGRAPH = "none";

// Info: (20260714 - Emily) 判斷 LLM 錯誤是否為額度耗盡(429/RESOURCE_EXHAUSTED)，供呼叫端回專屬錯誤碼
export const isLlmQuotaError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("429") ||
    message.includes("resource_exhausted") ||
    message.includes("quota")
  );
};

// Info: (20260716 - Emily) 判斷 LLM 錯誤是否為同步路徑逾時(#6515)，供 route/service 層映射 IS_LLM_TIMEOUT
export const isLlmTimeoutError = (error: unknown): boolean =>
  error instanceof Error && error.message.startsWith(LLM_TIMEOUT_ERROR_MARKER);

// Info: (20260714 - Emily) 聊天回覆 responseSchema:readyParagraphId 以 enum 約束，禁止 LLM 捏造段落 id
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
      description: "資訊已蒐集齊全可寫入報告的段落 id；尚未齊全時為 none",
    },
    // Info: (20260716 - Emily) #55 修訂請求:僅當使用者明確要求「修改/更新既有段落」時填段落 id,否則 none
    revisionParagraphId: {
      type: SchemaType.STRING,
      format: "enum",
      enum: [...CARBON_REPORT_OUTLINE.map((s) => s.id), NO_READY_PARAGRAPH],
      description:
        "使用者要求依附件或指示『修改既有段落』時填該段 id;非修改請求一律 none",
    },
    // Info: (20260716 - Emily) #6518 事實萃取: enum 鎖死範疇/單位，數值原樣字串(嚴禁換算),TS 端再白名單複驗
    extraction: {
      type: SchemaType.OBJECT,
      description: "本輪用戶訊息中可萃取的盤查事實；無則各欄位省略",
      properties: {
        company: { type: SchemaType.STRING, description: "企業名稱(用戶原文)" },
        year: {
          type: SchemaType.STRING,
          description: "盤查年度(西元，原樣數字字串)",
        },
        boundaryApproach: {
          type: SchemaType.STRING,
          format: "enum",
          enum: ["operational_control", "financial_control", "equity_share"],
        },
        activities: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              scopeCategory: {
                type: SchemaType.STRING,
                format: "enum",
                enum: Object.values(GhgProtocolCategory),
              },
              sourceName: {
                type: SchemaType.STRING,
                description: "排放源名稱(如: 外購電力、公務車柴油)",
              },
              quantity: {
                type: SchemaType.STRING,
                description: "數量，連同千分位原樣照抄，嚴禁換算或加總",
              },
              unit: {
                type: SchemaType.STRING,
                format: "enum",
                enum: Object.values(MeasurementUnit),
              },
              confidence: {
                type: SchemaType.STRING,
                format: "enum",
                enum: ["high", "medium", "low"],
              },
            },
            required: ["scopeCategory", "sourceName", "quantity", "unit"],
          },
        },
      },
    },
  },
  required: ["reply", "readyParagraphId"],
};

export type { Part, Schema, Tool };
/**
 * Info: (20260714 - Emily) SchemaType 一併由此 re-export
 * 所有 AI 串接，含 responseSchema 定義統一經 chat.service
 * 其他服務不得直接 import 任何 AI 相關套件
 */
export { SchemaType };

export interface IChatGenerationOptions {
  modelName?: string;
  temperature?: number;
  maxOutputTokens?: number;
  responseSchema?: Schema;
  isJson?: boolean;
  tools?: Tool[];
  /**
   * Info: (20260716 - Emily) 同步 HTTP 路徑專用防護(#6515)。
   * timeoutMs: 後端逾時上限，未提供則不啟用(executor 走檔案狀態機重試，行為零改變)。
   * taskKey: 提供時記錄一筆用量 log，欄位對齊 execution_log.json 以便成本聚合。
   */
  timeoutMs?: number;
  taskKey?: LlmTaskKeyEnum;
  // Info: (20260720 - Julian) 傳入呼叫端的 AbortSignal，使用者中止時一併取消底層 LLM 請求
  signal?: AbortSignal;
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
    this.modelName = process.env.MODEL || DEFAULT_GEMINI_MODEL;
  }

  /**
   * Info: (20260716 - Emily) 同步路徑防護執行器(#6515)
   * 1. timeoutMs 提供時以 Promise.race 限時，逾時拋帶識別標記的錯誤(isLlmTimeoutError 可辨識)
   *    SDK 呼叫無法真正中斷，但 HTTP 回應即刻釋放，不再無限期佔連線
   * 2. taskKey 提供時寫一筆用量 log，欄位名對齊 execution_log.json(taskKey/inputTokens/
   *    outputTokens/totalTokens)，token 數優先取 SDK usageMetadata(零額外 API 呼叫)
   * 兩者皆未提供時行為與裸呼叫完全相同 — executor 與既有呼叫端零改變。
   */
  private async invokeGuarded(
    exec: () => Promise<GenerateContentResult>,
    guards: {
      timeoutMs?: number;
      taskKey?: LlmTaskKeyEnum;
      modelName: string;
    },
  ): Promise<GenerateContentResult> {
    const { timeoutMs, taskKey, modelName } = guards;
    const startedAt = Date.now();

    const race = async (): Promise<GenerateContentResult> => {
      if (!timeoutMs) return exec();
      /**
       * Info: (20260716 - Emily) SDK 呼叫無法真正中斷，逾時後仍在背景執行
       * 先取得其 Promise 並吞掉「逾時之後才發生」的 reject，避免 unhandledRejection(#6521 review)。
       */
      const execPromise = exec();
      execPromise.catch(() => {});
      let timer: ReturnType<typeof setTimeout> | undefined;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timer = setTimeout(
          () =>
            reject(
              new Error(`${LLM_TIMEOUT_ERROR_MARKER}: exceeded ${timeoutMs}ms`),
            ),
          timeoutMs,
        );
      });
      try {
        return await Promise.race([execPromise, timeoutPromise]);
      } finally {
        if (timer) clearTimeout(timer);
      }
    };

    try {
      const result = await race();
      if (taskKey) {
        const usage = result.response.usageMetadata;
        logger.info("llm sync usage", {
          taskKey,
          model: modelName,
          inputTokens: usage?.promptTokenCount ?? 0,
          outputTokens: usage?.candidatesTokenCount ?? 0,
          totalTokens: usage?.totalTokenCount ?? 0,
          latencyMs: Date.now() - startedAt,
          outcome: "success",
        });
      }
      return result;
    } catch (error) {
      if (taskKey) {
        logger.error("llm sync usage", {
          taskKey,
          model: modelName,
          latencyMs: Date.now() - startedAt,
          outcome: isLlmTimeoutError(error) ? "timeout" : "error",
        });
      }
      throw error;
    }
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

    // Info: (20260720 - Julian) 有 signal 才帶 requestOptions，讓底層 fetch 可被中止
    const requestOptions = options?.signal
      ? { signal: options.signal }
      : undefined;

    // Info: (20260716 - Emily) 經防護執行器呼叫，未帶 timeoutMs 或 taskKey 時行為與原裸呼叫相同
    const result = await this.invokeGuarded(
      () => model.generateContent(parts, requestOptions),
      {
        timeoutMs: options?.timeoutMs,
        taskKey: options?.taskKey,
        modelName,
      },
    );
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
   * Info: (20260714 - Emily) 碳會計師人設，結構化回覆與招呼詞共用，避免 prompt 漂移
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
【報告寫入機制】你的回覆一律為 JSON:reply 填對話內容；readyParagraphId 依下列規則填寫:
- 用戶已提供當前段落所需的關鍵資訊，或明確同意/確認你彙整的內容時 → 填該段落的 id(只能從下方清單挑選)
- 資訊尚未齊全、仍在追問時 → 填 "${NO_READY_PARAGRAPH}"
- 填入段落 id 後，系統會自動將該段草稿寫入右側報告；此時請在 reply 告知用戶「本段已寫入報告，可於右側預覽檢視」，不要把完整草稿貼在對話中，也不要再重複詢問同一段落。
【段落修訂機制】使用者上傳新附件或明確要求「更新/修改某段」時 → revisionParagraphId 填該段 id(只能從段落清單挑選)，reply 告知「已產生修訂建議，請於預覽卡確認」；非修改請求一律填 "none"，且不要在 reply 貼修訂內容(由系統以對照卡呈現)。
【事實萃取機制】每輪回覆的 extraction 欄位，依下列規則萃取「用戶本輪訊息」中的盤查事實:
- 企業名稱、盤查年度(西元)、組織邊界方法: 用戶明確提供時填入，原文照抄，不確定就省略。
- activities: 用戶提供的活動數據(如用電量、油耗)。quantity 連同千分位「原樣照抄」為字串，嚴禁換算單位、加總或推導；單位只能從 unit 列舉挑選，對不上就整筆省略。
- 你是萃取器不是計算機: 任何需要計算的內容一律不填。沒有可萃取的事實時 extraction 省略。
【段落清單】
${outlineCatalog}${langInstruction}`;
  }

  /**
   * Info: (20260716 - Emily) 萃取結果裁決(#6518): 逐筆 Zod 驗證，壞欄位丟棄該筆而非整包作廢；
   * 全空回 null。enum 已在 responseSchema 鎖死，此處為 TS 端第二道白名單(永不直接採信 LLM)。
   */
  private adjudicateInventoryExtraction(
    value: unknown,
  ): IInventoryExtraction | null {
    if (!value || typeof value !== "object") return null;
    const candidate = value as { activities?: unknown };
    const rawActivities = Array.isArray(candidate.activities)
      ? candidate.activities
      : [];
    const activities = rawActivities.flatMap((item) => {
      const parsed = CarbonActivityRecordSchema.safeParse(item);
      return parsed.success ? [parsed.data] : [];
    });
    if (rawActivities.length !== activities.length) {
      logger.warn("inventory extraction dropped invalid activities", {
        dropped: rawActivities.length - activities.length,
      });
    }
    const orgParsed = CarbonInventoryExtractionSchema.safeParse({
      ...value,
      activities: [],
    });
    const org = orgParsed.success ? orgParsed.data : { activities: [] };
    if (
      !org.company &&
      !org.year &&
      !org.boundaryApproach &&
      activities.length === 0
    ) {
      return null;
    }
    return {
      company: org.company,
      year: org.year,
      boundaryApproach: org.boundaryApproach,
      activities,
    };
  }

  /**
   * Info: (20260714 - Emily) 碳會計師結構化回覆
   * 對話內容 + 段落完成訊號(碳盤查對 Gemini 的唯一對話路徑)
   * 解決「無限訪談迴圈」：AI 判斷段落資訊已齊全時回報 readyParagraphId
   * 由路由層觸發 ParagraphDraftService 寫入報告；id 經 enum 約束 + 本方法白名單裁決
   */
  async generateCarbonChatbotStructuredResponse(
    history: { role: "user" | "model"; text: string }[],
    currentStep?: string,
    language?: string,
    taskKey: LlmTaskKeyEnum = LlmTaskKeyEnum.CARBON_CHAT,
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

    // Info: (20260716 - Emily) 同步聊天路徑，45秒逾時 + 用量記錄(#6515)
    const response = await this.invokeGuarded(
      () => model.generateContent({ contents }),
      {
        timeoutMs: LLM_SYNC_TIMEOUT_MS,
        taskKey,
        modelName: this.modelName,
      },
    );
    const raw = response.response.text();

    // Info: (20260714 - Emily) 永不直接採信 LLM 輸出，JSON + Zod 護欄；解析失敗降級為純文字回覆(不中斷對話)
    try {
      const rawParsed: unknown = JSON.parse(raw);
      const parsed = CarbonChatStructuredReplySchema.parse(rawParsed);
      const isValidParagraph = CARBON_REPORT_OUTLINE.some(
        (s) => s.id === parsed.readyParagraphId,
      );
      // Info: (20260716 - Emily) #6518:extraction 逐筆裁決(獨立於 reply 護欄，萃取壞掉不影響對話)
      const extraction = this.adjudicateInventoryExtraction(
        (rawParsed as { extraction?: unknown }).extraction,
      );
      // Info: (20260716 - Emily) #55:修訂目標同樣經白名單裁決(enum 之外的值一律視為無請求)
      const rawRevision = (rawParsed as { revisionParagraphId?: unknown })
        .revisionParagraphId;
      const revisionParagraphId = CARBON_REPORT_OUTLINE.some(
        (s) => s.id === rawRevision,
      )
        ? (rawRevision as string)
        : null;
      return {
        reply: parsed.reply,
        readyParagraphId: isValidParagraph ? parsed.readyParagraphId : null,
        extraction,
        revisionParagraphId,
      };
    } catch {
      return {
        reply: raw,
        readyParagraphId: null,
        extraction: null,
        revisionParagraphId: null,
      };
    }
  }

  /**
   * Info: (20260714 - Emily) 產生開場招呼詞
   * 進入 channel 時的前置作業：以 bootstrap 指令產生開場招呼詞（不含真實對話歷史）
   * 改走結構化回覆，移除重複的純文字對話方法，人設單一來源；招呼詞只取 reply
   */
  async generateCarbonChatbotGreeting(
    currentStep?: string,
    language?: string,
  ): Promise<string> {
    const structured = await this.generateCarbonChatbotStructuredResponse(
      [{ role: "user", text: CARBON_CHAT_GREETING_PROMPT }],
      currentStep,
      language,
      LlmTaskKeyEnum.CARBON_GREETING,
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
      temperature: LLM_TEMPERATURE.CHAT, // Info: (20260701 - Tzuhan) Default legacy behavior
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
      temperature: LLM_TEMPERATURE.CHAT, // Info: (20260701 - Tzuhan) Default strict temperature
      ...options,
      tools: [searchTool, ...(options?.tools || [])],
    });
  }
}
