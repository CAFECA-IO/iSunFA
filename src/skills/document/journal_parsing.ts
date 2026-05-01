import { ITaskSkill } from "@/skills/types";
import { getJournalPrompt } from "@/constants/prompts/journal";
import { IPseudoTask, IPseudoMission } from "@/skills/types";
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
    task: IPseudoTask,
    mission: IPseudoMission,
    fullPrompt: string,
    chatService: ChatService,
  ): Promise<string> {
    const { images, accountBook } = await prepareDocumentContext(task);

    // Info: (20260429 - Luphia) Moved from ChatService to Skill
    const promptText = getJournalPrompt(accountBook);

    try {
      const text = await chatService.generateRawWithImages(promptText, images);
      if (text.includes("上傳內容無法解析狀態")) {
        return "上傳內容無法解析，請重新上傳或手動調整";
      }
      return text.trim();
    } catch (error) {
      console.error("[JournalParsingSkill] Error:", error);
      return "AI 暫時無法解析，請稍後再試或手動調整";
    }
  }
}
