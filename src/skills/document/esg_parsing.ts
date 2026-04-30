import { ITaskSkill } from "@/skills/types";
import { getEsgPrompt } from "@/constants/prompts/esg";
import { IPseudoTask, IPseudoMission } from "@/skills/types";
import { ChatService } from "@/services/chat.service";
import { prepareDocumentContext } from "@/skills/utils/document_helper";
import { esgRepo } from "@/repositories/esg.repo";

export class EsgParsingSkill implements ITaskSkill {
  name = "ESG_PARSING";
  description = "Analyze the ESG data from a document using AI.";
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

    // Info: (20260416 - Julian) 讀取標準係數與該帳本的專屬係數
    const coefficients = await esgRepo.getEsgCoefficients({
      where: {
        OR: [
          { accountBookId: accountBook?.id },
          { accountBookId: null }
        ]
      }
    });

    const formattedCoefficients = coefficients.map((c) => ({
      ...c,
      createdAt: c.createdAt.getTime() / 1000,
      updatedAt: c.updatedAt.getTime() / 1000,
      deletedAt: c.deletedAt ? c.deletedAt.getTime() / 1000 : null,
      emissionFactor: Number(c.emissionFactor),
    }))

    let promptText = getEsgPrompt(accountBook, formattedCoefficients);

    if (parsedContext.journalText) {
      promptText += `\n\n【重要指示】\n使用者已提供/修正日記帳的最新內容如下。請優先依據以下文字資訊進行解析，若與圖片內容有衝突，以此文字為準：\n${parsedContext.journalText}`;
    }

    try {
      const text = await chatService.generateRawWithImages(promptText, images);
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.stringify({ data: JSON.parse(jsonMatch[0]) });
      }
      return JSON.stringify({ data: null, error: "無法從 AI 回應中解析出有效的 JSON 格式" });
    } catch (error) {
      console.error("[EsgParsingSkill] Error:", error);
      return JSON.stringify({ data: null, error: "AI 解析碳盤查失敗，請稍後再試" });
    }
  }
}
