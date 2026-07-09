import {
  GoogleGenerativeAI,
  Part,
  Tool,
  Schema,
  GenerationConfig,
  ModelParams,
} from "@google/generative-ai";
import { DirectChatSkill } from "@/skills/chat/direct_chat";

export type { Part, Schema, Tool };

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
   * Info: (20260708 - Tzuhan) Carbon Chatbot Framework
   * Dedicated method to handle Carbon Accountant persona conversation
   */
  async generateCarbonChatbotResponse(
    history: { role: "user" | "model"; text: string }[],
    currentStep?: string,
    language?: string,
  ): Promise<string> {
    const langInstruction = language ? `\\n請務必使用 ${language} 回覆。` : "";
    const systemInstruction = `你是一個專業的碳會計師 (Carbon Accountant)。你的任務是引導用戶進行溫室氣體盤查。請一步步問問題，引導用戶回答，並在適當的時機請用戶上傳相關資料（如BOM表、能源帳單等）。請保持專業、友善，且每次對話只問一個核心問題以免用戶混淆。${currentStep ? `\\n當前盤查流程節點：【${currentStep}】。請根據此階段的目標來引導對話。` : ""}${langInstruction}`;

    const model = this.genAI.getGenerativeModel({
      model: this.modelName,
      systemInstruction: systemInstruction,
    });

    const contents = history.map((msg) => ({
      role: msg.role,
      parts: [{ text: msg.text }],
    }));

    try {
      const response = await model.generateContent({ contents });
      return response.response.text();
    } catch (error) {
      console.error(
        "[ChatService] generateCarbonChatbotResponse error:",
        error,
      );
      throw error;
    }
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
