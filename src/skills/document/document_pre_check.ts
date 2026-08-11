import { ITaskSkill } from "@/skills/types";
import { IPseudoTask, IPseudoMission } from "@/skills/types";
import { ChatService } from "@/services/chat.service";
import { prepareDocumentContext } from "@/skills/utils/document_helper";
import { Schema } from "@google/generative-ai";
import { LLM_WORKER_TIMEOUT_MS } from "@/constants/llm";

export class DocumentPreCheckSkill implements ITaskSkill {
  name = "DOCUMENT_PRE_CHECK";
  description =
    "Pre-check a document before full parsing, including duplication validation.";
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
    const { images } = await prepareDocumentContext(task);

    // Info: (20260501 - Luphia) Use fullPrompt provided by executor to keep worker stateless
    const promptText = fullPrompt;

    let res: string = JSON.stringify({
      error: "AI 前置防呆掃描失敗，請稍後再試",
    });
    try {
      const responseSchema = (task.data as { responseSchema?: Schema })
        ?.responseSchema;
      const text = await chatService.generateRawWithImages(
        promptText,
        images,
        true,
        responseSchema,
        // Info: (20260811 - Luphia) worker 路徑的逾時上限：沒有它「失敗重試」的前提不成立
        { timeoutMs: LLM_WORKER_TIMEOUT_MS },
      );
      res = text.trim();
    } catch (error) {
      console.error("[DocumentPreCheckSkill] Error:", error);
    }
    /**
     * Info: (20260501 - Luphia)
     * Removed database duplication check to ensure worker remains stateless.
     * Duplication handling should be managed by the recorder/sync logic when saving the result.
     */

    return res;
  }
}
