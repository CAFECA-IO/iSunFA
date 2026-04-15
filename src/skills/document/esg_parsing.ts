import { ITaskSkill } from "@/skills/types";
import { Task, Mission } from "@/generated/client";
import { ChatService } from "@/services/chat.service";
import { prepareDocumentContext } from "@/skills/utils/document_helper";

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
    // Info: (20260407 - Julian) 傳入修改後的日記帳文字內容，重新排程「碳盤查」 AI 分析
    const res = await chatService.analyzeESG(
      images,
      accountBook,
      parsedContext.journalText,
    );
    return JSON.stringify(res);
  }
}
