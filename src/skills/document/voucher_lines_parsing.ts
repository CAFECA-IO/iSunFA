import { ITaskSkill } from "@/skills/types";
import { getVoucherLinesPrompt } from "@/constants/prompts/voucher";
import { IPseudoTask, IPseudoMission } from "@/skills/types";
import { ChatService } from "@/services/chat.service";
import { prepareDocumentContext } from "@/skills/utils/document_helper";

export class VoucherLinesParsingSkill implements ITaskSkill {
  name = "VOUCHER_LINES_PARSING";
  description = "Analyze the line items of a voucher document using AI.";
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
    const { images, accountBook, parsedContext } =
      await prepareDocumentContext(task);

    let promptText = getVoucherLinesPrompt(accountBook);

    if (parsedContext.journalText) {
      promptText += `\n\n【重要指示】\n使用者已提供/修正日記帳的最新內容如下。請優先依據以下文字資訊進行解析，若與圖片內容有衝突，以此文字為準：\n${parsedContext.journalText}`;
    }

    try {
      const text = await chatService.generateRawWithImages(promptText, images);
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.stringify({ data: JSON.parse(jsonMatch[0]) });
      }
      return JSON.stringify({
        data: null,
        error: "無法從 AI 回應中解析出有效的 JSON 格式",
      });
    } catch (error) {
      console.error("[VoucherLinesParsingSkill] Error:", error);
      return JSON.stringify({
        data: null,
        error: "AI 解析傳票分錄失敗，請稍後再試",
      });
    }
  }
}
