import { ITaskSkill } from "@/skills/types";
import { IPseudoTask, IPseudoMission } from "@/skills/types";
import { ChatService } from "@/services/chat.service";
import { prepareDocumentContext } from "@/skills/utils/document_helper";
import { Schema } from "@google/generative-ai";

export class VoucherBaseParsingSkill implements ITaskSkill {
  name = "VOUCHER_BASE_PARSING";
  description = "Analyze the base data of a voucher document using AI.";
  parameters = {
    type: "object",
    properties: {
      accountBookId: {
        type: "string",
        description: "The ID of the account book.",
      },
      fileId: { type: "string", description: "The ID of the uploaded file." },
      journalText: {
        type: "string",
        description: "The parsed text of the journal.",
      },
    },
    required: ["fileId"],
  };

  async execute(
    task: IPseudoTask,
    mission: IPseudoMission,
    fullPrompt: string,
    chatService: ChatService,
  ): Promise<string> {
    const { images, parsedContext } = await prepareDocumentContext(task);

    // Info: (20260501 - Luphia) Use fullPrompt provided by executor to keep worker stateless
    let promptText = fullPrompt;

    if (parsedContext.journalText) {
      promptText += `\n\n【重要指示】\n使用者已提供/修正日記帳的最新內容如下。請優先依據以下文字資訊進行解析，若與圖片內容有衝突，以此文字為準：\n${parsedContext.journalText}`;
    }

    try {
      const responseSchema = (task.data as Record<string, unknown>)
        ?.responseSchema as Schema | undefined;
      const text = await chatService.generateRawWithImages(
        promptText,
        images,
        true,
        responseSchema,
      );

      // Info: (20260527 - Tzuhan) [ADR Migration] 
      // 過去此處包含大段的外幣匯率轉換 (getCrossExchangeRateStatic) 邏輯。
      // 為貫徹 Zero Trust Architecture 與 Segregation of Duties，
      // 所有外幣換算與高精度數學運算已全數抽離至後端的 FxInterceptorService 與 VoucherPipelineOrchestrator。
      // 絕對禁止 AI Parser 層進行任何數學運算。
      return text.trim();
    } catch (error) {
      console.error("[VoucherBaseParsingSkill] Error:", error);
      return JSON.stringify({
        error: "AI 解析傳票基礎資料失敗，請稍後再試",
      });
    }
  }
}
