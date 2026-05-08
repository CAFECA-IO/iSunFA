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

  // Info: (20260508 - Julian) 轉換為 prompt 需要的格式
  const accountBookForPrompt: IAccountBookBase | null = accountBook
    ? {
        id: accountBook.id ?? "",
        name: accountBook.name ?? "",
        country: accountBook.country ?? "",
        currency: accountBook.currency ?? "",
        rule: accountBook.rule ?? "",
      }
    : null;

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
      prompt: getJournalPrompt(accountBookForPrompt),
      context,
    },
  });

  tasks.push({
    type: "VOUCHER_BASE_PARSING",
    order: 1,
    data: {
      key: "VOUCHER_BASE",
      prompt: getBaseVoucherPrompt(accountBookForPrompt),
      context,
    },
  });

  tasks.push({
    type: "VOUCHER_LINES_PARSING",
    order: 1,
    data: {
      key: "VOUCHER_LINES",
      prompt: getVoucherLinesPrompt(accountBookForPrompt),
      context,
    },
  });

  tasks.push({
    type: "ESG_PARSING",
    order: 1,
    data: {
      key: "ESG",
      prompt: getEsgPrompt(accountBookForPrompt, coefficients),
      context,
    },
  });

  return {
    name: `Document Parsing - ${params.fileId}`,
    tasks,
  };
}
