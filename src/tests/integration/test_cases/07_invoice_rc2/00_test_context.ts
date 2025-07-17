import fs from 'fs';
import path from 'path';
import { APITestHelper } from '@/tests/integration/setup/api_helper';
import { createTestClient } from '@/tests/integration/setup/test_client';
import accountBookCreateHandler from '@/pages/api/v2/user/[userId]/account_book';
import invoiceInputCreateHandler from '@/pages/api/rc2/account_book/[accountBookId]/invoice/input';
import invoiceOutputCreateHandler from '@/pages/api/rc2/account_book/[accountBookId]/invoice/output';
import { APIPath } from '@/constants/api_connection';
import { WORK_TAG } from '@/interfaces/account_book';
import { UPLOAD_TYPE_TO_FOLDER_MAP, UploadType } from '@/constants/file';
import { createFile } from '@/lib/utils/repo/file.repo';
import * as cryptoUtils from '@/lib/utils/crypto';
import { IInvoiceRC2Input, IInvoiceRC2Output, IInvoiceRC2Base } from '@/interfaces/invoice_rc2';
import { CurrencyCode, InvoiceDirection } from '@/constants/invoice_rc2';
// import teamListHandler from '@/pages/api/v2/user/[userId]/team';
// import { TestClient } from '@/interfaces/test_client';
import { BaseTestContext } from '@/tests/integration/setup/base_test_context';

/* Info: (20250711 - Tzuhan) ---------- 型別 ---------- */
export interface InvoiceTestContext {
  helper: APITestHelper;
  cookies: string[];
  currentUserId: string;
  accountBookId: number;
  fileIdForInput: number;
  fileIdForOutput: number;
}

/* Info: (20250711 - Tzuhan) ---------- 自訂 Error ---------- */
class SetupError extends Error {
  constructor(message: string, detail?: unknown) {
    super(`[InvoiceTestContext] ${message}: ${JSON.stringify(detail)}`);
  }
}

/* Info: (20250711 - Tzuhan) ---------- 共用常數 ---------- */
const TEST_FILES_DIR = 'src/tests/integration/test_cases/07_invoice_rc2/test_files';

/* Info: (20250711 - Tzuhan) ---------- 工具函式 ---------- */
/** 1. 上傳加密檔並回傳 fileId */
async function uploadEncryptedFile(filename: string, bookId: number): Promise<number> {
  const pubKey = await cryptoUtils.getPublicKeyByCompany(bookId);
  const filePath = path.resolve(process.cwd(), TEST_FILES_DIR, `${filename}.png`);
  const fileBuffer = fs.readFileSync(filePath);
  const file = new File([fileBuffer], 'mock_invoice.png', { type: 'image/png' });

  const enc = await cryptoUtils.encryptFileWithPublicKey(file, pubKey!);
  const tempPath = path.resolve(process.cwd(), TEST_FILES_DIR, `temp_encrypted_${filename}.png`);

  const fileDB = await createFile({
    name: enc.encryptedFile.name,
    size: enc.encryptedFile.size,
    mimeType: 'image/png',
    type: UPLOAD_TYPE_TO_FOLDER_MAP[UploadType.INVOICE],
    url: tempPath,
    isEncrypted: true,
    encryptedSymmetricKey: enc.encryptedSymmetricKey,
    iv: Buffer.from(enc.iv as Uint8Array),
  });

  if (!fileDB?.id) throw new SetupError('createFile failed', fileDB);
  return fileDB.id;
}

/* Info: (20250711 - Tzuhan) ---------- 單例 Context ---------- */
let ctxPromise: Promise<InvoiceTestContext> | undefined;
let cleared = false;

export async function getInvoiceTestContext(): Promise<InvoiceTestContext> {
  if (ctxPromise) return ctxPromise; // Info: (20250711 - Tzuhan) 已建好

  ctxPromise = (async () => {
    const { helper, cookies, userId, teamId } = await BaseTestContext.getSharedContext();

    /* Info: (20250711 - Tzuhan) 4. 建帳簿 */
    const bookClient = createTestClient({
      handler: accountBookCreateHandler,
      routeParams: { userId: userId.toString() },
    });
    const bookRes = await bookClient
      .post(APIPath.CREATE_ACCOUNT_BOOK.replace(':userId', userId.toString()))
      .send({
        name: `AccountBook ${Date.now()}`,
        taxId: Math.random().toString(36).slice(2, 10),
        tag: WORK_TAG.ALL,
        teamId: Number(teamId),
      })
      .set('Cookie', cookies.join('; '));

    const bookId = Number(bookRes.body.payload?.id);
    if (!bookId) throw new SetupError('create accountBook failed', bookRes.body);

    /* Info: (20250711 - Tzuhan) 5. 上傳測試檔 */
    const fileIdForInput = await uploadEncryptedFile('invoice_input', bookId);
    const fileIdForOutput = await uploadEncryptedFile('invoice_output', bookId);

    return {
      helper,
      cookies,
      currentUserId: String(userId),
      accountBookId: bookId,
      fileIdForInput,
      fileIdForOutput,
    };
  })();

  cleared = false; // Info: (20250711 - Tzuhan) 清理狀態

  return ctxPromise;
}

/*  Info: (20250711 - Tzuhan) ---------- 快取發票 (Input / Output) ---------- */
let cacheInput: IInvoiceRC2Input | undefined;
let cacheOutput: IInvoiceRC2Output | undefined;

/** 建 Info: (20250711 - Tzuhan) 立並快取一張發票（依方向） */
export async function createInvoice<T extends IInvoiceRC2Base>(
  ctx: InvoiceTestContext,
  direction: InvoiceDirection
): Promise<T> {
  if (direction === InvoiceDirection.INPUT && cacheInput) return cacheInput as T;
  if (direction === InvoiceDirection.OUTPUT && cacheOutput) return cacheOutput as T;

  const handler =
    direction === InvoiceDirection.INPUT ? invoiceInputCreateHandler : invoiceOutputCreateHandler;
  const fileId = direction === InvoiceDirection.INPUT ? ctx.fileIdForInput : ctx.fileIdForOutput;

  const client = createTestClient({
    handler,
    routeParams: { accountBookId: ctx.accountBookId.toString() },
  });

  const res = await client
    .post(
      (direction === InvoiceDirection.INPUT
        ? APIPath.CREATE_INVOICE_RC2_INPUT
        : APIPath.CREATE_INVOICE_RC2_OUTPUT
      ).replace(':accountBookId', ctx.accountBookId.toString())
    )
    .send({
      fileId,
      direction,
      isGenerated: false,
      currencyCode: CurrencyCode.TWD,
    })
    .set('Cookie', ctx.cookies.join('; '));

  if (!res.body.success) throw new SetupError('invoice creation failed', res.body);

  if (direction === InvoiceDirection.INPUT) cacheInput = res.body.payload;
  else cacheOutput = res.body.payload;

  return res.body.payload as T;
}

/*  Info: (20250711 - Tzuhan)---------- 清理 ---------- */

export async function clearInvoiceTestContext() {
  if (cleared) return;
  const ctx = await ctxPromise;
  ctx?.helper?.clearAllUserSessions?.();
  cleared = true;
}
