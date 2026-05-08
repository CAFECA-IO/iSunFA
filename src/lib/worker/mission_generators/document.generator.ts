import { ITaskDefinition } from "@/lib/worker/task.generator";
import {
  IMissionDefinition,
  IMissionParams,
} from "@/lib/worker/mission.interface";
import { getJournalPrompt } from "@/constants/prompts/journal";
import {
  getBaseVoucherPrompt,
  getVoucherLinesPrompt,
} from "@/constants/prompts/voucher";
import { getEsgPrompt } from "@/constants/prompts/esg";
import { getDocumentDuplicateCheckPrompt } from "@/constants/prompts/document_check";
import { IAccountBookBase } from "@/interfaces/account_book";
import { ICoefficient } from "@/interfaces/coefficient";

export function generateDocumentParsingMission(
  params: IMissionParams,
): IMissionDefinition | null {
  const accountBook = params.prerequisiteData?.accountBook as
    | IAccountBookBase
    | undefined;
  const coefficients = params.prerequisiteData?.coefficients as
    | ICoefficient[]
    | undefined;

  const tasks: ITaskDefinition[] = [];
  const data = (params.data as { accountBookId?: string }) || {};
  const accountBookId =
    data.accountBookId || params.accountBookId || accountBook?.id || "";

  const context = JSON.stringify({
    fileId: params.fileId,
    fileBase64: params.fileBase64,
    fileMimeType: params.fileMimeType,
    accountBookId: accountBookId,
  });

  tasks.push({
    type: "DOCUMENT_PRE_CHECK",
    order: 0,
    data: {
      key: "PRE_CHECK",
      prompt: getDocumentDuplicateCheckPrompt(),
      context,
    },
  });

  tasks.push({
    type: "JOURNAL_PARSING",
    order: 1,
    data: {
      key: "JOURNAL",
      prompt: getJournalPrompt(accountBook),
      context,
    },
  });

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
    name: `Document Parsing - ${params.fileId}`,
    tasks,
  };
}
