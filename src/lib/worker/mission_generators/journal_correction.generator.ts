import { ITaskDefinition } from "@/lib/worker/task.generator";
import {
  IMissionDefinition,
  IMissionParams,
} from "@/lib/worker/mission.interface";
import {
  getBaseVoucherPrompt,
  getVoucherLinesPrompt,
} from "@/constants/prompts/voucher";
import { getEsgPrompt } from "@/constants/prompts/esg";
import { IAccountBookBase } from "@/interfaces/account_book";
import { ICoefficient } from "@/interfaces/coefficient";

export function generateJournalCorrectionMission(
  params: IMissionParams,
): IMissionDefinition | null {
  const accountBook = params.prerequisiteData?.accountBook as
    | IAccountBookBase
    | undefined;
  const coefficients = params.prerequisiteData?.coefficients as
    | ICoefficient[]
    | undefined;

  console.log("🍓ESG prompt:", getEsgPrompt(accountBook, coefficients));

  const tasks: ITaskDefinition[] = [];
  const data = (params.data as { accountBookId?: string }) || {};
  const accountBookId =
    data.accountBookId || params.accountBookId || accountBook?.id || "";

  const context = JSON.stringify({
    fileId: params.fileId,
    fileBase64: params.fileBase64,
    fileMimeType: params.fileMimeType,
    journalId: params.journalId,
    journalText: params.journalText,
    voucherId: params.voucherId,
    esgRecordId: params.esgRecordId,
    accountBookId: accountBookId,
  });

  // Info: (20260407 - Julian) 跳過 PRE_CHECK 和 JOURNAL_PARSING，直接重產傳票與 ESG
  tasks.push({
    type: "VOUCHER_BASE_PARSING",
    order: 1,
    data: {
      key: "VOUCHER_BASE",
      prompt: getBaseVoucherPrompt(accountBook),
      context,
    },
  });

  tasks.push({
    type: "VOUCHER_LINES_PARSING",
    order: 1,
    data: {
      key: "VOUCHER_LINES",
      prompt: getVoucherLinesPrompt(accountBook),
      context,
    },
  });

  tasks.push({
    type: "ESG_PARSING",
    order: 1,
    data: {
      key: "ESG",
      prompt: getEsgPrompt(accountBook, coefficients),
      context,
    },
  });

  return {
    name: `Journal Correction - ${params.journalId || "Unknown"}`,
    tasks,
  };
}
