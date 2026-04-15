import { ITaskSkill } from "@/skills/types";
import { Task, Mission } from "@/generated/client";
import { ChatService } from "@/services/chat.service";
import { prepareDocumentContext } from "@/skills/utils/document_helper";

export class JournalParsingSkill implements ITaskSkill {
  name = "JOURNAL_PARSING";
  description = "Analyze journal documents using AI.";
  parameters = {
    type: "object",
    properties: {
      accountBookId: {
        type: "string",
        description: "The ID of the account book.",
      },
      fileId: { type: "string", description: "The ID of the uploaded file." },
    },
    required: ["fileId"],
  };

  async execute(
    task: Task,
    mission: Mission,
    fullPrompt: string,
    chatService: ChatService,
  ): Promise<string> {
    const { images, accountBook } = await prepareDocumentContext(task);
    const res = await chatService.analyzeJournal(images, accountBook);
    return res.text;
  }
}
