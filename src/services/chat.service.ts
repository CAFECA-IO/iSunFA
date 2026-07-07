import {
  GoogleGenerativeAI,
  Part,
  Tool,
  Schema,
  GenerationConfig,
  ModelParams,
  SchemaType,
} from "@google/generative-ai";
import { DirectChatSkill } from "@/skills/chat/direct_chat";
import { IEsgReport } from "@/interfaces/esg_report";

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

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
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

  async generateEsgNarrative(
    report: IEsgReport,
    unverifiedItems: { id: string; note: string; type: string }[],
    language: string = "zh-TW",
  ): Promise<string> {
    const isEnglish = language.toLowerCase().startsWith("en");

    const prompt = `
你是一位具備 ISO 14064-1 主導稽核員資格的資深會計師。
請根據以下碳盤查系統產出的數據，以客觀、嚴謹、第三方的語氣撰寫合規的分析論述。

盤查數據總結：
總碳排放量: ${report.metrics.totalEmissions} kgCO2e
總不確定性: ${report.metrics.uncertaintyPercent}% (絕對誤差: ${report.metrics.absoluteUncertainty} kgCO2e)
未經驗證的單據筆數: ${unverifiedItems.length}

各範疇佔比:
- Scope 1: ${report.metrics.scope1Proportion}%
- Scope 2: ${report.metrics.scope2Proportion}%
- Scope 3: ${report.metrics.scope3Proportion}%

要求：
1. 請以結構化的方式產出「盤查結論 (executiveSummary)」、「邊界與顯著性排除 (materialityExclusion)」及「不確定性分析 (uncertaintyAnalysis)」。
2. 使用專業稽核術語。
3. 如果未經驗證的單據大於 0，請在不確定性分析中提及這可能帶來的潛在風險。
4. ${isEnglish ? "Please generate the narrative strictly in professional auditing English." : "請使用繁體中文撰寫。"}
    `;

    const responseSchema: Schema = {
      type: SchemaType.OBJECT,
      properties: {
        executiveSummary: {
          type: SchemaType.STRING,
          description: "盤查結論的 Markdown 文本",
        },
        materialityExclusion: {
          type: SchemaType.STRING,
          description: "邊界與顯著性排除的 Markdown 文本",
        },
        uncertaintyAnalysis: {
          type: SchemaType.STRING,
          description: "不確定性分析的 Markdown 文本",
        },
      },
      required: [
        "executiveSummary",
        "materialityExclusion",
        "uncertaintyAnalysis",
      ],
    };

    return this.generateRaw(prompt, responseSchema, { isJson: true });
  }
}
