import { ChatService } from "@/services/chat.service";
import { REPORT_GENERATION_PROMPT } from "@/constants/prompts/pdf_editor/report_generation";
import {
  AI_REFINE_INSTRUCTIONS,
  TEXT_REFINEMENT_PROMPT,
} from "@/constants/prompts/pdf_editor/text_refinement";

export class PdfEditorService {
  /**
   * Info: (20260605 - Julian) 根據 input 生成結構化的 AI 報告
   */
  public static async generateAiReport(
    data: string,
    instruction: string = "",
  ): Promise<string> {
    const apiKey = process.env.AI_SERVICE;
    if (!apiKey) {
      throw new Error("Missing AI_SERVICE");
    }

    const finalPrompt = `${REPORT_GENERATION_PROMPT}

【輸入數據 (Input Data)】：
${data}

${instruction ? `【額外指示 (Additional Instructions)】：\n${instruction}\n` : ""}
`;

    const chatService = new ChatService(apiKey);
    const reply = await chatService.generateRaw(finalPrompt);

    // Info: (20260608 - Julian) 過濾掉 AI 的自我反思過程 (<thinking>...</thinking>)
    const finalReport = reply
      .replace(/<thinking>[\s\S]*?<\/thinking>\n*/gi, "")
      .trim();

    return finalReport;
  }

  /**
   * Info: (20260605 - Julian) 根據使用者指令，讓 AI 微調選取文字
   */
  public static async refineText(
    text: string,
    action: string,
  ): Promise<string> {
    const apiKey = process.env.AI_SERVICE;
    if (!apiKey) {
      throw new Error("Missing AI_SERVICE");
    }

    const instruction = AI_REFINE_INSTRUCTIONS[action] || action;

    const finalPrompt = `${TEXT_REFINEMENT_PROMPT}

【待處理文本】：
${text}

【使用者指令】：
${instruction}`;

    const chatService = new ChatService(apiKey);
    const reply = await chatService.generateRaw(finalPrompt);

    return reply.trim();
  }
}
