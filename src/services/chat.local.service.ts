import { DirectChatSkill } from "@/skills/chat/direct_chat";
import { ChatService } from "@/services/chat.service";

export class ChatLocalService {
  private modelName: string;
  private ollamaUrl: string;

  constructor(_apiKey?: string) {
    void _apiKey; // Info: (20260429 - Luphia) Ignore API key, use local model
    this.modelName = process.env.OLLAMA_MODEL || "gemma4:e4b";
    this.ollamaUrl = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
  }

  private async ollamaGenerate(prompt: string, images?: { data: string; mimeType: string }[]): Promise<string> {
    const payload: Record<string, unknown> = {
      model: this.modelName,
      prompt: prompt,
      stream: false,
      options: {
        temperature: 0.2,
      }
    };

    if (images && images.length > 0) {
      payload.images = images.map(img => img.data);
    }

    try {
      const response = await fetch(`${this.ollamaUrl}/api/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.response;
    } catch (e) {
      console.error("[ChatLocalService] Ollama request failed:", e);
      throw e;
    }
  }

  async generateResponse(
    message: string,
    tags: string[] = [],
    file?: string,
    mimeType?: string,
  ): Promise<string> {
    const skill = new DirectChatSkill();
    return skill.execute(message, tags, file, mimeType, this as unknown as ChatService);
  }

  async generateRawWithImages(prompt: string, images?: { data: string; mimeType: string }[]): Promise<string> {
    return this.ollamaGenerate(prompt, images);
  }

  async generateRaw(prompt: string): Promise<string> {
    return this.ollamaGenerate(prompt);
  }

  async countTokens(text: string): Promise<number> {
    return Math.ceil(text.length / 4);
  }

  async generateRawWithSearch(prompt: string): Promise<string> {
    return this.ollamaGenerate(prompt);
  }
}
