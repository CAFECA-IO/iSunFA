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
    // Info: (20260709 - Tzuhan) 1. 歷史紀錄維持純文字
    history: { role: "user" | "model"; text: string }[],
    currentStep?: string,
    language?: string,
    // Info: (20260709 - Tzuhan) 2. 新增第四個參數：接收當次上傳的獨立附件
    attachments?: { base64: string; type: string }[],
  ): Promise<string> {
    const langInstruction = language ? `\n請務必使用 ${language} 回覆。` : "";
    const systemInstruction = `你是一個專業的碳會計師 (Carbon Accountant)。你的任務是引導用戶進行溫室氣體盤查。請一步步問問題，引導用戶回答，並在適當的時機請用戶上傳相關資料（如BOM表、能源帳單等）。請保持專業、友善，且每次對話只問一個核心問題以免用戶混淆。${currentStep ? `\n當前盤查流程節點：【${currentStep}】。請根據此階段的目標來引導對話。` : ""}${langInstruction}`;

    const model = this.genAI.getGenerativeModel({
      model: this.modelName,
      systemInstruction: systemInstruction,
    });

    const contents = history.map((msg, index) => {
      const parts: Part[] = [];

      // Info: (20260709 - Tzuhan) 放入文字訊息 (加入防呆：若無文字則放空字串或預設提示)
      if (msg.text && msg.text.trim() !== "") {
        parts.push({ text: msg.text });
      }

      // Info: (20260709 - Tzuhan) 3. 關鍵邏輯：如果是陣列的「最後一筆」(也就是使用者剛發出的最新訊息)，就把獨立的 attachments 塞進去
      const isLastMessage = index === history.length - 1;

      if (isLastMessage && attachments && attachments.length > 0) {
        // Info: (20260709 - Tzuhan) 如果使用者沒打字、只傳了附件，我們偷偷塞一句話引導 AI
        if (!msg.text || msg.text.trim() === "") {
          parts.push({ text: "請協助分析我上傳的附件資料。" });
        }

        // Info: (20260709 - Tzuhan) 將獨立的附件轉為 inlineData 塞入
        attachments.forEach((att) => {
          let base64Data = att.base64;
          if (base64Data.includes(",")) {
            base64Data = base64Data.split(",")[1];
          }
          parts.push({
            inlineData: {
              data: base64Data,
              mimeType: att.type,
            },
          });
        });
      }

      return {
        role: msg.role === "model" ? "model" : "user",
        parts,
      };
    });

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
