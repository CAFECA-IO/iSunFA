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
import { AccountBook } from "@/generated/client";

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
  const data = (params.data as { files?: string[]; accountBookId?: string }) || {};
  const files = data.files || paramsObj.files || [];
  const accountBookId = data.accountBookId || paramsObj.accountBookId || accountBook?.id || "";

  const tasks: ITaskDefinition[] = [];

  files.forEach((fileId, index) => {
    /**
     * Info: We only have fileId (hash) from the batch order array, 
     * real base64/mimeType should be handled downstream if needed, or this acts as trackable onchain skeleton.
     */
    const context = JSON.stringify({
      fileId,
      accountBookId,
    });

    tasks.push({
      type: "DOCUMENT_PRE_CHECK",
      order: index,
      data: {
        key: `PRE_CHECK_${index}`,
        prompt: getDocumentDuplicateCheckPrompt(),
        context,
      },
    });

    tasks.push({
      type: "JOURNAL_PARSING",
      order: index,
      data: {
        key: `JOURNAL_${index}`,
        prompt: getJournalPrompt(accountBook),
        context,
      },
    });

    tasks.push({
      type: "VOUCHER_BASE_PARSING",
      order: index,
      data: {
        key: `VOUCHER_BASE_${index}`,
        prompt: getBaseVoucherPrompt(accountBook),
        context,
      },
    });

    tasks.push({
      type: "VOUCHER_LINES_PARSING",
      order: index,
      data: {
        key: `VOUCHER_LINES_${index}`,
        prompt: getVoucherLinesPrompt(accountBook),
        context,
      },
    });

    tasks.push({
      type: "ESG_PARSING",
      order: index,
      data: {
        key: `ESG_${index}`,
        prompt: getEsgPrompt(accountBook),
        context,
      },
    });
  });

  return {
    name: `Certificate Analysis Batch - ${params.orderId || "Order"}`,
    tasks,
  };
}
