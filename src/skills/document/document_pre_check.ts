import { ITaskSkill } from "@/skills/types";
import { getDocumentDuplicateCheckPrompt } from "@/constants/prompts/document_check";
import { IPseudoTask, IPseudoMission } from "@/skills/types";
import { ChatService } from "@/services/chat.service";
import { prepareDocumentContext } from "@/skills/utils/document_helper";
import { voucherRepo } from "@/repositories/voucher.repo";
import { journalRepo } from "@/repositories/journal.repo";
import { esgRepo } from "@/repositories/esg.repo";

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
    const { images, parsedContext } = await prepareDocumentContext(task);
    const promptText = getDocumentDuplicateCheckPrompt();

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
    const result = JSON.stringify(res); // Info: (20260406 - Luphia) Check duplication with backend database
    if (res.data && parsedContext.accountBookId) {
      const dupResult = await voucherRepo.checkDocumentDuplication(
        parsedContext.accountBookId,
        res.data,
      );
      if (dupResult.isDuplicate) {
        const msg = `憑證已入錄，停止後續分析。 (與${
          dupResult.duplicateType === "VOUCHER" ? "傳票" : "日記帳"
        } ID: ${dupResult.duplicateId} 重複)`;

        // Info: (20260406 - Luphia) 即使重複而停止後續分析，仍要將截取到的交易日期寫回原本建立的紀錄中
        if (parsedContext.fileId && res.data.tradingDate) {
          const tradingDateObj = new Date(res.data.tradingDate);
          if (!isNaN(tradingDateObj.getTime())) {
            try {
              await voucherRepo.updateManyVouchersByFile(
                parsedContext.fileId,
                parsedContext.accountBookId,
                { tradingDate: tradingDateObj },
              );

              await journalRepo.updateManyJournalsByFile(
                parsedContext.fileId,
                parsedContext.accountBookId,
                { tradingDate: tradingDateObj },
              );

              await esgRepo.updateManyEsgRecordsByFile(
                parsedContext.fileId,
                parsedContext.accountBookId,
                { tradingDate: tradingDateObj },
              );
            } catch (updateErr) {
              console.error(
                "[TaskService] Failed to update trading date for duplicate document:",
                updateErr,
              );
            }
          }
        }

        throw new Error(msg);
      }
    }

    return result;
  }
}
