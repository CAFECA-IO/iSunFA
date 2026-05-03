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
import { AccountBook } from "@/generated";

export function generateCertificateAnalysisMission(
  params: IMissionParams,
): IMissionDefinition | null {
  const accountBook = params.prerequisiteData?.accountBook as
    | Partial<AccountBook>
    | undefined;

  const paramsObj = params as unknown as {
    files?: string[];
    accountBookId?: string;
  };
  const data =
    (params.data as { files?: string[]; accountBookId?: string }) || {};
  const accountBookId =
    data.accountBookId || paramsObj.accountBookId || accountBook?.id || "";
  const fileId = params.fileId; // Info: (20260422 - Luphia) The single targeted file hash passed by MissionIssuer

  const tasks: ITaskDefinition[] = [];

  const context = JSON.stringify({
    fileId,
    accountBookId,
  });

  tasks.push({
    type: "DOCUMENT_PRE_CHECK",
    order: 0,
    data: {
      key: `PRE_CHECK`,
      prompt: getDocumentDuplicateCheckPrompt(),
      context,
    },
  });

  tasks.push({
    type: "JOURNAL_PARSING",
    order: 1,
    data: {
      key: `JOURNAL`,
      prompt: getJournalPrompt(accountBook),
      context,
    },
  });

  tasks.push({
    type: "VOUCHER_BASE_PARSING",
    order: 1,
    data: {
      key: `VOUCHER_BASE`,
      prompt: getBaseVoucherPrompt(accountBook),
      context,
    },
  });

  tasks.push({
    type: "VOUCHER_LINES_PARSING",
    order: 1,
    data: {
      key: `VOUCHER_LINES`,
      prompt: getVoucherLinesPrompt(accountBook),
      context,
    },
  });

  tasks.push({
    type: "ESG_PARSING",
    order: 1,
    data: {
      key: `ESG`,
      prompt: getEsgPrompt(accountBook),
      context,
    },
  });

  return {
    name: `Certificate Analysis Batch - ${params.orderId || "Order"}`,
    tasks,
  };
}
