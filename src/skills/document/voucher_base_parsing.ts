import { ITaskSkill } from "@/skills/types";
import { Task, Mission } from "@/generated/client";
import { ChatService } from "@/services/chat.service";
import { prepareDocumentContext } from "@/skills/utils/document_helper";

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
    task: Task,
    mission: Mission,
    fullPrompt: string,
    chatService: ChatService,
  ): Promise<string> {
    const { images, accountBook, parsedContext } =
      await prepareDocumentContext(task);
    // Info: (20260407 - Julian) 傳入修改後的日記帳文字內容，重新排程「傳票基本資料」 AI 分析
    const res = await chatService.analyzeVoucherBase(
      images,
      accountBook,
      parsedContext.journalText,
    );
    return JSON.stringify(res);
  }
}
