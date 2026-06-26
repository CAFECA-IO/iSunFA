/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

export enum SchemaType {
  STRING = "string",
  NUMBER = "number",
  INTEGER = "integer",
  BOOLEAN = "boolean",
  ARRAY = "array",
  OBJECT = "object",
}

export interface Schema {
  type: SchemaType | string;
  description?: string;
  properties?: { [key: string]: Schema };
  items?: Schema;
  required?: string[];
  enum?: string[];
  nullable?: boolean;
  format?: string;
}

export interface Part {
  text?: string;
  inlineData?: {
    data: string;
    mimeType: string;
  };
  fileData?: {
    mimeType: string;
    fileUri: string;
  };
}

export interface GenerationConfig {
  responseMimeType?: string;
  responseSchema?: Schema;
  temperature?: number;
  maxOutputTokens?: number;
  [key: string]: any;
}

export interface GenerativeModel {
  generateContent: (parts: Part[] | string | any[]) => Promise<{
    response: { text: () => string };
  }>;
  countTokens: (text: string) => Promise<{ totalTokens: number }>;
}

export type Tool = any;

export class FaithService {
  private host: string;
  private defaultModel: string;

  constructor(apiKeyOrHost?: string) {
    this.host =
      process.env.AI_SERVICE || apiKeyOrHost || "http://localhost:20026";
    this.defaultModel = process.env.FAITH_MODEL || "gemma4:e4b";
  }

  public getGenerativeModel(config: {
    model?: string;
    generationConfig?: GenerationConfig;
    tools?: Tool[];
  }) {
    return {
      generateContent: async (request: any) => {
        let parts: Part[] = [];
        let reqConfig = config?.generationConfig;

        if (typeof request === "string") {
          parts = [{ text: request }];
        } else if (Array.isArray(request)) {
          parts = request;
        } else if (request.contents) {
          for (const content of request.contents) {
            if (content.parts && Array.isArray(content.parts)) {
              parts.push(...content.parts);
            }
          }
          if (request.generationConfig) {
            reqConfig = { ...reqConfig, ...request.generationConfig };
          }
        }

        const result = await this.generate(config?.model, reqConfig, parts);

        return {
          response: {
            text: () => result,
          },
        };
      },
      countTokens: async (text: string) => {
        // Info: (20260626 - Luphia) Fallback for token counting
        return { totalTokens: Math.ceil(text.length / 4) };
      },
    };
  }

  private async generate(
    modelName: string | undefined,
    config: GenerationConfig | undefined,
    parts: Part[],
  ): Promise<string> {
    const model = process.env.FAITH_MODEL || modelName || this.defaultModel;

    let prompt = "";
    const images: string[] = [];

    for (const part of parts) {
      if (part.text) prompt += part.text + "\n";
      if (part.inlineData) {
        images.push(part.inlineData.data);
      }
    }

    const payload: any = {
      model,
      prompt: prompt.trim(),
      stream: false,
      options: {},
    };

    if (images.length > 0) {
      payload.images = images;
    }

    if (config) {
      if (config.temperature !== undefined) {
        payload.options.temperature = config.temperature;
      }
      if (config.maxOutputTokens !== undefined) {
        payload.options.num_predict = config.maxOutputTokens;
      }
      if (config.responseMimeType === "application/json") {
        if (config.responseSchema) {
          payload.format = config.responseSchema;
        } else {
          payload.format = "json";
        }
      }
    }

    try {
      const res = await fetch(`${this.host}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Faith API error: ${res.status} ${errText}`);
      }

      const data = await res.json();
      return data.response;
    } catch (err) {
      console.error("FaithService generation error:", err);
      throw err;
    }
  }
}

export class GoogleAIFileManager {
  constructor(_apiKeyOrHost?: string) {}

  async uploadFile(filePath: string, metadata: any) {
    // Info: Mock upload for Ollama, returning local path as URI
    return {
      file: {
        mimeType: metadata.mimeType,
        uri: filePath,
      },
    };
  }
}
