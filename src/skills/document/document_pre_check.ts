import { ITaskSkill } from "@/skills/types";
import { Task, Mission } from "@/generated/client";
import { ChatService } from "@/services/chat.service";
import { prepareDocumentContext } from "@/skills/utils/document_helper";
import { voucherRepo } from "@/repositories/voucher.repo";
import { journalRepo } from "@/repositories/journal.repo";
import { esgRepo } from "@/repositories/esg.repo";
import { taskRepo } from "@/repositories/task.repo";

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
    task: Task,
    mission: Mission,
    fullPrompt: string,
    chatService: ChatService,
  ): Promise<string> {
    const { images, parsedContext } = await prepareDocumentContext(task);
    const res = await chatService.analyzeDocumentPreCheck(images);
    const result = JSON.stringify(res);

    // Info: (20260406 - Luphia) Check duplication with backend database
    if (res.data && parsedContext.accountBookId) {
      const dupResult = await voucherRepo.checkDocumentDuplication(
        parsedContext.accountBookId,
        res.data,
      );
      if (dupResult.isDuplicate) {
        const msg = `憑證已入錄，停止後續分析。 (與${dupResult.duplicateType === "VOUCHER" ? "傳票" : "日記帳"
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

        await taskRepo.cancelPendingTasks(mission.id, msg);
        throw new Error(msg);
      }
    }

    return result;
  }
}
