import { ITaskSkill } from "@/skills/types";
import { Task, Mission } from "@/generated/client";
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
    task: Task,
    mission: Mission,
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

    // Info: (20260407 - Julian) 傳入修改後的日記帳文字內容與係數，重新排程「碳盤查」 AI 分析
    const res = await chatService.analyzeESG(
      images,
      accountBook,
      parsedContext.journalText,
      formattedCoefficients
    );
    return JSON.stringify(res);
  }
}
