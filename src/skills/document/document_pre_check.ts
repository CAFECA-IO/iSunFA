import { ITaskSkill } from "@/skills/types";
import { IPseudoTask, IPseudoMission } from "@/skills/types";
import { ChatService } from "@/services/chat.service";
import { prepareDocumentContext } from "@/skills/utils/document_helper";

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

    let res: {
      data: {
        invoiceNumber?: string | null;
        vendorTaxId?: string | null;
        tradingDate?: string | null;
        totalAmount?: number | null;
      } | null;
      error?: string;
    } = { data: null, error: "AI 前置防呆掃描失敗，請稍後再試" };
    try {
      const text = await chatService.generateRawWithImages(promptText, images);
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        res = { data: JSON.parse(jsonMatch[0]) };
      } else {
        res = { data: null, error: "無法從 AI 回應中解析出有效的 JSON 格式" };
      }
    } catch (error) {
      console.error("[DocumentPreCheckSkill] Error:", error);
    }
    /**
     * Info: (20260501 - Luphia)
     * Removed database duplication check to ensure worker remains stateless.
     * Duplication handling should be managed by the recorder/sync logic when saving the result.
     */

    return JSON.stringify(res);
  }
}
