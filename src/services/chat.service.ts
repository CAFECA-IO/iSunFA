import { GoogleGenerativeAI, Part, Tool } from "@google/generative-ai";
import { DirectChatSkill } from "@/skills/chat/direct_chat";

export class ChatService {
  private genAI: GoogleGenerativeAI;
  private modelName: string;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.modelName = process.env.MODEL || "gemini-1.5-flash";
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

  async generateRawWithImages(prompt: string, images?: { data: string; mimeType: string }[]): Promise<string> {
    const model = this.genAI.getGenerativeModel({ model: this.modelName });
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

    const result = await model.generateContent(parts);
    const response = await result.response;
    return response.text();
  }

  async generateRaw(prompt: string): Promise<string> {
    const model = this.genAI.getGenerativeModel({
      model: this.modelName,
      generationConfig: {
        temperature: 0.2,
      },
    });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
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

  async generateRawWithSearch(prompt: string): Promise<string> {
    // Info: (20260311 - Tzuhan) Use explicitly typed googleSearch tool for Gemini Grounding
    const searchTool = { googleSearch: {} } as Tool & { googleSearch: unknown };

    const model = this.genAI.getGenerativeModel({
      model: this.modelName,
      generationConfig: {
        temperature: 0.2, // Info: (20260311 - Tzuhan) Strict temperature for financial analysis
      },
      tools: [searchTool],
    });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  }
}
