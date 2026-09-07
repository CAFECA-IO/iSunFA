import { userDocumentRepo } from "@/repositories/user_document.repo";
import {
  USER_DOCUMENT_KIND,
  type IUserDocument,
} from "@/interfaces/user_document";

/**
 * Info: (20260817 - Luphia) 「文件與記憶」頁的文件清單。
 *
 * 把三種來源合成一份依時間排序的清單。每一列都帶 `kind` 與 `encrypted`，
 * 因為它們的性質差很多：
 *
 * - **可讀**：使用者自己建立的 Markdown 文件、上傳的憑證檔名
 * - **讀不到**：個人模式的碳盤查草稿是端對端加密，server 只知道它存在
 *
 * `encrypted` 要誠實地傳到畫面上——沒有這個旗標，使用者會以為系統看得到內容
 * 而我們選擇不顯示，那與事實相反。
 */

const SOURCE_LIMIT = 200;

function toSec(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

export async function listUserDocuments(params: {
  userId: string;
  address: string;
  limit: number;
}): Promise<IUserDocument[]> {
  const { userId, address, limit } = params;

  const [pdfDocs, evidence, drafts] = await Promise.all([
    userDocumentRepo.listPdfEditorDocuments(userId),
    userDocumentRepo.listEvidenceFiles(userId, SOURCE_LIMIT),
    userDocumentRepo.listCarbonDrafts(address, SOURCE_LIMIT),
  ]);

  const documents: IUserDocument[] = [];

  for (const doc of pdfDocs) {
    documents.push({
      id: doc.id,
      kind: USER_DOCUMENT_KIND.PDF_EDITOR,
      // Info: (20260817 - Luphia) 這個 model 沒有標題欄位，以 token 前段當可辨識的名字
      title: doc.token.slice(0, 8),
      updatedAt: toSec(doc.updatedAt),
      encrypted: false,
      // Info: (20260817 - Luphia) 分享連結是否仍開著，是使用者最該看到的一件事
      shared: doc.isActive,
    });
  }

  /**
   * Info: (20260817 - Luphia) 同一份檔案可能掛在多筆傳票上，以 fileId 去重。
   * 不去重的話，一張發票會在清單裡出現好幾次，而使用者無從分辨那是
   * 「上傳了好幾次」還是「同一份被引用多次」。
   */
  const seenFiles = new Set<string>();
  const pushFile = (
    file: { id: string; fileName: string | null },
    createdAt: Date,
    accountBookId: string,
  ) => {
    if (seenFiles.has(file.id)) return;
    seenFiles.add(file.id);
    documents.push({
      id: file.id,
      kind: USER_DOCUMENT_KIND.EVIDENCE_FILE,
      title: file.fileName ?? file.id,
      updatedAt: toSec(createdAt),
      encrypted: false,
      accountBookId,
    });
  };

  for (const journal of evidence.journals) {
    if (journal.file) {
      pushFile(journal.file, journal.createdAt, journal.accountBookId);
    }
  }
  for (const voucher of evidence.vouchers) {
    if (voucher.file) {
      pushFile(voucher.file, voucher.createdAt, voucher.accountBookId);
    }
  }

  for (const draft of drafts) {
    documents.push({
      id: draft.id,
      kind: USER_DOCUMENT_KIND.CARBON_DRAFT,
      title: draft.chatroom.channel,
      updatedAt: toSec(draft.updatedAt),
      /**
       * Info: (20260817 - Luphia) 個人模式的草稿是 ECIES 端對端加密（`plainContent` 為 null），
       * 帳本模式才是伺服器端可讀的明文。以此區分，而不是一律標成加密——
       * 兩者的「誰讀得到」確實不同，含糊其詞比不說更糟。
       */
      encrypted: draft.plainContent === null,
      accountBookId: draft.chatroom.accountBookId ?? undefined,
    });
  }

  return documents.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, limit);
}
