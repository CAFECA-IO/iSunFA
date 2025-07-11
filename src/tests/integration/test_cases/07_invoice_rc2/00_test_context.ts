import fs from 'fs';
import path from 'path';
import { APITestHelper } from '@/tests/integration/setup/api_helper';
import { createTestClient } from '@/tests/integration/setup/test_client';
import teamListHandler from '@/pages/api/v2/user/[userId]/team';
import accountBookCreateHandler from '@/pages/api/v2/user/[userId]/account_book';
import { APIPath } from '@/constants/api_connection';
import { WORK_TAG } from '@/interfaces/account_book';
import { UPLOAD_TYPE_TO_FOLDER_MAP, UploadType } from '@/constants/file';
import { createFile } from '@/lib/utils/repo/file.repo';
import * as cryptoUtils from '@/lib/utils/crypto';
import { TestClient } from '@/interfaces/test_client';
import { IInvoiceRC2Input, IInvoiceRC2Output } from '@/interfaces/invoice_rc2';
import { CurrencyCode, InvoiceDirection } from '@/constants/invoice_rc2';
import invoiceInputCreateHandler from '@/pages/api/rc2/account_book/[accountBookId]/invoice/input';
import invoiceOutputCreateHandler from '@/pages/api/rc2/account_book/[accountBookId]/invoice/output';

/** Info: (20250711 - Tzuhan) 提供給測試檔使用的型別 */
export interface InvoiceTestContext {
  helper: APITestHelper;
  cookies: string[];
  currentUserId: string;
  accountBookId: number;
  fileIdForInput: number;
  fileIdForOutput: number;
  /** Info: (20250711 - Tzuhan) 若之後測試有需要，可再擴充欄位 */
}

async function saveFileToDB(filename: string, accountBookId: number): Promise<number> {
  const publicKey = await cryptoUtils.getPublicKeyByCompany(accountBookId);
  const filePath = path.resolve(
    process.cwd(),
    'src/tests/integration/test_cases/07_invoice_rc2/test_files',
    `${filename}.png`
  );
  const fileBuffer = fs.readFileSync(filePath);
  const file = new File([fileBuffer], 'mock_invoice.png', { type: 'image/png' });
  const { encryptedFile, encryptedSymmetricKey, iv } = await cryptoUtils.encryptFileWithPublicKey(
    file,
    publicKey!
  );
  const tempPath = path.resolve(
    process.cwd(),
    'src/tests/integration/test_cases/07_invoice_rc2/test_files',
    `temp_encrypted_${filename}.png`
  );
  const fileInDB = await createFile({
    name: encryptedFile.name,
    size: encryptedFile.size,
    mimeType: 'image/png',
    type: UPLOAD_TYPE_TO_FOLDER_MAP[UploadType.INVOICE],
    url: tempPath,
    isEncrypted: true,
    encryptedSymmetricKey,
    iv: Buffer.from(iv as Uint8Array),
  });

  /* Info: (20250711 - Tzuhan) === 防呆檢查區 === */
  if (!fileInDB || !fileInDB.id) {
    throw new Error(`[invoiceTestContext] createFile failed, got: ${JSON.stringify(fileInDB)}`);
  }
  /* Info: (20250711 - Tzuhan) ================= */

  const fileId = fileInDB.id;
  return fileId;
}

/** Info: (20250711 - Tzuhan) 真‧單例：同一個 Jest worker 只建一次 */
let cachedCtx: Promise<InvoiceTestContext> | undefined;

/** Info: (20250711 - Tzuhan) 取得共用測試情境，保證只初始化一次（lazy） */
export async function getInvoiceTestContext(): Promise<InvoiceTestContext> {
  if (cachedCtx) return cachedCtx; // Info: (20250711 - Tzuhan) 已建好直接回傳

  cachedCtx = (async () => {
    const helper = await APITestHelper.createWithEmail('user1@isunfa.com');
    const cookies = helper.getCurrentSession();

    // Info: (20250711 - Tzuhan) 1. 取 userId
    const statusResponse = await helper.getStatusInfo();
    const user = statusResponse.body.payload?.user as { id?: string } | undefined;

    if (!user || !user.id) {
      throw new Error('User not found in status response');
    }
    const currentUserId = `${user.id}`;

    // eslint-disable-next-line no-console
    console.log('currentUserId', currentUserId);

    // Info: (20250711 - Tzuhan) 2. 查 team
    const teamListClient: TestClient = createTestClient({
      handler: teamListHandler,
      routeParams: { userId: currentUserId },
    });

    const teamResponse = await teamListClient
      .get(APIPath.LIST_TEAM.replace(':userId', currentUserId))
      .query({ page: 1, pageSize: 10 })
      .send({})
      .set('Cookie', cookies.join('; '));

    // eslint-disable-next-line no-console
    console.log('teamResponse.body', teamResponse.body);

    const team = teamResponse.body.payload?.data?.[0];

    if (!team || !team.id) {
      throw new Error('No team found for the user');
    }

    // Info: (20250711 - Tzuhan) 3. 建帳簿
    const accountBookCreateClient = createTestClient({
      handler: accountBookCreateHandler,
      routeParams: { userId: currentUserId },
    });

    const accountBookData = {
      name: `AccountBook ${Date.now()}`,
      taxId: Math.random().toString(36).substring(2, 15),
      tag: WORK_TAG.ALL,
      teamId: Number(team.id),
    };

    const accountBookResponse = await accountBookCreateClient
      .post(APIPath.CREATE_ACCOUNT_BOOK.replace(':userId', currentUserId))
      .send(accountBookData)
      .set('Cookie', cookies.join('; '));

    // eslint-disable-next-line no-console
    console.log('accountBookResponse.body', accountBookResponse.body);

    const accountBook = accountBookResponse.body.payload;
    if (!accountBook || !accountBook.id) {
      throw new Error('Account book creation failed');
    }
    const accountBookId = Number(accountBook.id);
    const fileIdForInput = await saveFileToDB('invoice_input', accountBookId);
    const fileIdForOutput = await saveFileToDB('invoice_output', accountBookId);
    return { helper, cookies, currentUserId, accountBookId, fileIdForInput, fileIdForOutput };
  })();

  return cachedCtx;
}
let invoiceInput: IInvoiceRC2Input | undefined;
let invoiceOutput: IInvoiceRC2Output | undefined;

export const createInvoice = async (ctx: InvoiceTestContext, direction: InvoiceDirection) => {
  if (direction === InvoiceDirection.INPUT) {
    if (invoiceInput) {
      return invoiceInput; // Info: (20250711 - Tzuhan) 若已存在，直接回傳
    }
    const invoiceInputCreateClient = createTestClient({
      handler: invoiceInputCreateHandler,
      routeParams: { accountBookId: ctx.accountBookId.toString() },
    });

    const invoiceInputCreateResponse = await invoiceInputCreateClient
      .post(
        `${APIPath.CREATE_INVOICE_RC2_INPUT.replace(':accountBookId', ctx.accountBookId.toString())}`
      )
      .send({
        fileId: ctx.fileIdForInput,
        direction: InvoiceDirection.INPUT,
        isGenerated: false,
        currencyCode: CurrencyCode.TWD,
      })
      .set('Cookie', ctx.cookies.join('; '));

    if (!invoiceInputCreateResponse.body.success) {
      throw new Error('Invoice input creation failed');
    }
    invoiceInput = invoiceInputCreateResponse.body.payload as IInvoiceRC2Input;
    return invoiceInput;
  }
  if (direction === InvoiceDirection.OUTPUT) {
    if (invoiceOutput) {
      return invoiceOutput; // Info: (20250711 - Tzuhan) 若已存在，直接回傳
    }
    const invoiceOutputCreateClient = createTestClient({
      handler: invoiceOutputCreateHandler,
      routeParams: { accountBookId: ctx.accountBookId.toString() },
    });

    const invoiceOutputCreateResponse = await invoiceOutputCreateClient
      .post(
        `${APIPath.CREATE_INVOICE_RC2_OUTPUT.replace(':accountBookId', ctx.accountBookId.toString())}`
      )
      .send({
        fileId: ctx.fileIdForOutput,
        direction: InvoiceDirection.OUTPUT,
        isGenerated: false,
        currencyCode: CurrencyCode.TWD,
      })
      .set('Cookie', ctx.cookies.join('; '));

    if (!invoiceOutputCreateResponse.body.success) {
      throw new Error('Invoice output creation failed');
    }
    invoiceOutput = invoiceOutputCreateResponse.body.payload as IInvoiceRC2Output;
    return invoiceOutput;
  }
  throw new Error('Invalid invoice direction');
};

/** Info: (20250711 - Tzuhan) 如真的需要 afterAll 清除 session，可導出這函式在任一測試檔最後呼叫一次 */
export async function clearInvoiceTestContext(): Promise<void> {
  const ctx = await cachedCtx;
  ctx?.helper?.clearAllUserSessions?.();
}
