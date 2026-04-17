import { Task } from "@/generated/client";
import { accountBookRepo } from "@/repositories/account_book.repo";
import { esgRepo } from "@/repositories/esg.repo";

export interface IDocumentContext {
  fileId: string;
  accountBookId: string;
  fileBase64?: string;
  fileMimeType?: string;
  journalText?: string;
  journalId?: string;
  voucherId?: string;
  esgRecordId?: string;
}

export async function prepareDocumentContext(task: Task) {
  const taskData = task.data as { context?: string };
  let parsedContext: IDocumentContext = { fileId: "", accountBookId: "", esgRecordId: "" };
  try {
    if (taskData?.context) {
      parsedContext = JSON.parse(taskData.context);
    }
  } catch (e) {
    console.warn(
      "[TaskService] Could not parse task context for Document Parsing",
      e,
    );
  }

  let images: { data: string; mimeType: string }[] = [];
  if (parsedContext.fileBase64 && parsedContext.fileMimeType) {
    images = [
      { data: parsedContext.fileBase64, mimeType: parsedContext.fileMimeType },
    ];
  } else if (!parsedContext.journalText) {
    // Info: (20260320 - Julian) 中止對於舊任務（沒有 Base64）的執行，避免觸發 400 Bad Request
    throw new Error(
      "No fileBase64, fileMimeType, or journalText provided for document parsing task. This might be an outdated task format.",
    );
  }

  // Info: (20260326 - Julian) 取得帳本資訊
  const accountBook = parsedContext.accountBookId
    ? await accountBookRepo.getAccountBookById(parsedContext.accountBookId)
    : null;

  // Info: (20260417 - Julian) 取得碳排查紀錄
  const esgRecord = parsedContext.esgRecordId
    ? await esgRepo.getEsgRecordById(parsedContext.esgRecordId)
    : null;

  return { parsedContext, images, accountBook, esgRecord };
}
