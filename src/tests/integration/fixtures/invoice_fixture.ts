import fs from 'fs';
import path from 'path';
import invoiceInputCreateHandler from '@/pages/api/rc2/account_book/[accountBookId]/invoice/input';
import invoiceOutputCreateHandler from '@/pages/api/rc2/account_book/[accountBookId]/invoice/output';
import { APIPath } from '@/constants/api_connection';
import { UPLOAD_TYPE_TO_FOLDER_MAP, UploadType } from '@/constants/file';
import { createFile } from '@/lib/utils/repo/file.repo';
import * as cryptoUtils from '@/lib/utils/crypto';
import { IInvoiceRC2Input, IInvoiceRC2Output, IInvoiceRC2Base } from '@/interfaces/invoice_rc2';
import { CurrencyCode, InvoiceDirection } from '@/constants/invoice_rc2';
import { BaseTestContext, SharedContext } from '@/tests/integration/setup/base_test_context';
import { createTestClient } from '@/tests/integration/setup/test_client';

const TEST_FILES_DIR = path.resolve(__dirname, '../test_cases/07_invoice_rc2/test_files');

export interface InvoiceContext extends SharedContext {
  fileIdForInput: number;
  fileIdForOutput: number;
}

export class InvoiceFixture {
  private ctx!: InvoiceContext;

  private cacheInput?: IInvoiceRC2Input;

  private cacheOutput?: IInvoiceRC2Output;

  /** Info: (20250716 - Tzuhan) 初始化：讀取 SharedContext 並上傳測試檔 */
  async init(): Promise<InvoiceContext> {
    const shared = await BaseTestContext.getSharedContext();
    const [fileIdForInput, fileIdForOutput] = await Promise.all([
      InvoiceFixture.uploadEncryptedFile('invoice_input', shared.accountBookId),
      InvoiceFixture.uploadEncryptedFile('invoice_output', shared.accountBookId),
    ]);
    this.ctx = {
      ...shared,
      fileIdForInput,
      fileIdForOutput,
    };

    return this.ctx;
  }

  /** Info: (20250716 - Tzuhan) 上傳加密檔並快存到 shared 上 */
  private static async uploadEncryptedFile(
    filename: 'invoice_input' | 'invoice_output',
    accountBookId: number
  ): Promise<number> {
    const pubKey = await cryptoUtils.getPublicKeyByCompany(accountBookId);
    const filePath = path.join(TEST_FILES_DIR, `${filename}.png`);
    const buffer = fs.readFileSync(filePath);
    const file = new File([buffer], `${filename}.png`, { type: 'image/png' });

    const enc = await cryptoUtils.encryptFileWithPublicKey(file, pubKey!);
    const tempPath = path.join(TEST_FILES_DIR, `temp_enc_${filename}.png`);

    const record = await createFile({
      name: enc.encryptedFile.name,
      size: enc.encryptedFile.size,
      mimeType: 'image/png',
      type: UPLOAD_TYPE_TO_FOLDER_MAP[UploadType.INVOICE],
      url: tempPath,
      isEncrypted: true,
      encryptedSymmetricKey: enc.encryptedSymmetricKey,
      iv: Buffer.from(enc.iv as Uint8Array),
    });
    if (!record?.id) {
      throw new Error(`upload ${filename} failed, ${JSON.stringify(record)}`);
    }

    return record.id;
  }

  /** Info: (20250716 - Tzuhan) 建立或快取一張發票（Input / Output） */
  async createInvoice<T extends IInvoiceRC2Base>(direction: InvoiceDirection): Promise<T> {
    if (direction === InvoiceDirection.INPUT && this.cacheInput) {
      return this.cacheInput as T;
    }
    if (direction === InvoiceDirection.OUTPUT && this.cacheOutput) {
      return this.cacheOutput as T;
    }

    const handler =
      direction === InvoiceDirection.INPUT ? invoiceInputCreateHandler : invoiceOutputCreateHandler;
    const fileId =
      direction === InvoiceDirection.INPUT ? this.ctx.fileIdForInput : this.ctx.fileIdForOutput;

    const client = createTestClient({
      handler,
      routeParams: { accountBookId: String(this.ctx.accountBookId) },
    });

    const res = await client
      .post(
        (direction === InvoiceDirection.INPUT
          ? APIPath.CREATE_INVOICE_RC2_INPUT
          : APIPath.CREATE_INVOICE_RC2_OUTPUT
        ).replace(':accountBookId', String(this.ctx.accountBookId))
      )
      .send({
        fileId,
        direction,
        isGenerated: false,
        currencyCode: CurrencyCode.TWD,
      })
      .set('Cookie', this.ctx.cookies.join('; '));

    if (!res.body.success) {
      throw new Error(`invoice creation failed, res.body: ${JSON.stringify(res.body)}`);
    }

    if (direction === InvoiceDirection.INPUT) {
      this.cacheInput = res.body.payload as IInvoiceRC2Input;
      return this.cacheInput as T;
    } else {
      this.cacheOutput = res.body.payload as IInvoiceRC2Output;
      return this.cacheOutput as T;
    }
  }
}
