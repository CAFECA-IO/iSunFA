import { ChatService } from "@/services/chat.service";
import { REPORT_GENERATION_PROMPT } from "@/constants/prompts/pdf_editor/report_generation";
import {
  AI_REFINE_INSTRUCTIONS,
  TEXT_REFINEMENT_PROMPT,
} from "@/constants/prompts/pdf_editor/text_refinement";
import { getMermaidModificationPrompt } from "@/constants/prompts/pdf_editor/mermaid_modification";
import { MermaidChartType } from "@/constants/mermaid_chart";

/**
 * Info: (20260812 - Luphia) 本檔三個方法都不再自行從環境變數讀 LLM 金鑰。
 *
 * 原本每個方法都先讀 env、缺就 `throw new Error("Missing GEMINI_API_KEY")`,
 * 再把讀到的值當「明確傳入」交給 ChatService。兩個後果:
 *
 * 1. ChatService 的優先序是「建構子明確傳入 > 資料庫設定 > 環境變數」,
 *    於是 /admin/settings 裡輪替或撤銷金鑰對這三條路徑無效 —— 沿用 env 舊值。
 * 2. 反過來,已經把金鑰搬進資料庫、env 不再保留的部署,這三個功能會直接不可用,
 *    而金鑰明明設好了。這三條路徑對應 /admin/pdf_editor 的三個端點。
 *
 * 缺金鑰的錯誤改由 ChatService 在實際呼叫時拋出,錯誤帶 `LLM_KEY_MISSING_ERROR_MARKER`;
 * 那三條路由以 `isLlmKeyMissingError()` 分類並回 `IS_GEMINI_API_KEY_UNDEFINED`。
 *
 * Info: (20260812 - Luphia) 這段原本寫「訊息仍含 GEMINI_API_KEY,因此字串比對行為不變」——
 * 那個機制在同一支 branch 的下一個 commit 就被換掉了,註解沒跟上。
 * 留著會讓下一個人以為字串比對還在用,甚至為了「保護」那個訊息而不敢改它。
 */
export class PdfEditorService {
  /**
   * Info: (20260623 - Julian) 根據使用者指令修改 Mermaid 圖表
   */
  public static async modifyMermaidChart(
    originalChart: string,
    chartType: MermaidChartType,
    instruction: string,
  ): Promise<string> {
    const finalPrompt = `${getMermaidModificationPrompt(chartType)}

    【原始 Mermaid 圖表 (Original Mermaid Chart)】：
    ${originalChart}

    【修改指令 (Modification Instruction)】：
    ${instruction}
`;

    const chatService = new ChatService();
    const reply = await chatService.generateRaw(finalPrompt);

    // Info: (20260623 - Julian) 移除 AI 的自我反思過程 (<thinking>...</thinking>) 並確保輸出為純 Mermaid 語法
    const cleaned = reply
      .replace(/<thinking>[\s\S]*?<\/thinking>\n*/gi, "")
      .replace(/```mermaid\n?/gi, "")
      .replace(/```\n?/gi, "")
      .trim();

    return cleaned;
  }

  /**
   * Info: (20260605 - Julian) 根據 input 生成結構化的 AI 報告
   */
  public static async generateAiReport(
    data: string,
    instruction: string = "",
    signal?: AbortSignal,
  ): Promise<string> {
    const finalPrompt = `${REPORT_GENERATION_PROMPT}

【輸入數據 (Input Data)】：
${data}

${instruction ? `【額外指示 (Additional Instructions)】：\n${instruction}\n` : ""}
`;

    const chatService = new ChatService();
    // Info: (20260720 - Julian) 傳入 signal，使用者中止時連底層 LLM 請求一起取消
    const reply = await chatService.generateRaw(
      finalPrompt,
      undefined,
      signal ? { signal } : undefined,
    );

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
    const instruction = AI_REFINE_INSTRUCTIONS[action] || action;

    const finalPrompt = `${TEXT_REFINEMENT_PROMPT}

【待處理文本】：
${text}

【使用者指令】：
${instruction}`;

    const chatService = new ChatService();
    const reply = await chatService.generateRaw(finalPrompt);

    return reply.trim();
  }
}
