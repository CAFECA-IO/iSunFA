import fs from 'fs';
import path from 'path';
import request from 'supertest';
import { UploadType } from '@/constants/file';
import { InvoiceDirection, CurrencyCode } from '@/constants/invoice_rc2';
import { IAccountBook } from '@/interfaces/account_book';
import { IFileBeta } from '@/interfaces/file';
import { IInvoiceRC2Input, IInvoiceRC2InputUI } from '@/interfaces/invoice_rc2';
import { ITeam } from '@/interfaces/team';
import { encryptFileWithPublicKey, importPublicKey } from '@/lib/utils/crypto';
import { createTestClient } from '@/tests/integration/setup/test_client';
import { APITestHelper } from '@/tests/integration/setup/api_helper';
import teamCreateHandler from '@/pages/api/v2/team/index';
import accountBookCreateHandler from '@/pages/api/v2/user/[userId]/account_book';
import publicKeyGetHandler from '@/pages/api/v2/account_book/[accountBookId]/public_key';
// import fileUploadHandler from '@/pages/api/v2/file';
import invoiceInputCreateHandler from '@/pages/api/rc2/account_book/[accountBookId]/invoice/input';
import invoiceInputModifyHandler from '@/pages/api/rc2/account_book/[accountBookId]/invoice/[invoiceId]/input';
import { APIPath } from '@/constants/api_connection';
import { TeamPlanType } from '@prisma/client';

export class InvoiceRC2TestHelper {
  constructor(private helper: APITestHelper) {}

  static async create(email = 'user@isunfa.com') {
    const helper = await APITestHelper.createWithEmail(email);
    return new InvoiceRC2TestHelper(helper);
  }

  async createTeam(name?: string): Promise<ITeam> {
    const teamCreateClient = createTestClient(teamCreateHandler);
    const response = await teamCreateClient
      .post(APIPath.CREATE_TEAM)
      .send({
        name: name ?? `Test Team ${Date.now()}`,
        about: 'Test team created in invoice test',
        profile: 'Invoice RC2 Integration Testing',
        planType: TeamPlanType.TRIAL,
      })
      .set('Cookie', this.helper.getCurrentSession().join('; '))
      .expect(201);

    return response.body.payload;
  }

  async createAccountBookWithTeam(teamId: number, userId: number): Promise<IAccountBook> {
    const handler = accountBookCreateHandler;
    const client = createTestClient({ handler, routeParams: { userId: userId.toString() } });
    const response = await client
      .post(`/api/v2/user/${userId}/account_book`)
      .send({
        name: 'Integration帳本',
        tag: 'ALL',
        taxId: '12345678',
        teamId,
        taxSerialNumber: '',
      })
      .set('Cookie', this.helper.getCurrentSession().join('; '))
      .expect(201);

    return response.body.payload;
  }

  async getPublicKey(accountBookId: number): Promise<{ jwk: JsonWebKey; publicKey: CryptoKey }> {
    const handler = publicKeyGetHandler;
    const client = createTestClient({
      handler,
      routeParams: { accountBookId: accountBookId.toString() },
    });
    const response = await client
      .get(`/api/v2/account_book/${accountBookId}/public_key`)
      .set('Cookie', this.helper.getCurrentSession().join('; '))
      .expect(200);

    const jwk = response.body.payload as JsonWebKey;
    const publicKey = await importPublicKey(jwk);
    return { jwk, publicKey };
  }

  async uploadEncryptedFileFake(accountBookId: number): Promise<IFileBeta> {
    const filePath = path.resolve(__dirname, '../test_files/mock_invoice.png');
    const fileBuffer = fs.readFileSync(filePath);
    const file = new File([fileBuffer], 'mock_invoice.png', { type: 'image/png' });

    const { jwk, publicKey } = await this.getPublicKey(accountBookId);
    const { encryptedFile, iv, encryptedSymmetricKey } = await encryptFileWithPublicKey(
      file,
      publicKey
    );
    const encryptedBuffer = Buffer.from(await encryptedFile.arrayBuffer());

    const tempEncryptedPath = path.resolve(
      __dirname,
      '../test_files/temp_encrypted_mock_invoice.png'
    );
    fs.writeFileSync(tempEncryptedPath, encryptedBuffer); // Info: (20250704 - Tzuhan) 先寫入加密檔案
    const fileStream = fs.createReadStream(tempEncryptedPath);

    const response = await request(`http://localhost:3001}`)
      .post(`/api/v2/file?type=${UploadType.INVOICE}&targetId=${accountBookId}`)
      .attach('file', fileStream, {
        filename: file.name,
        contentType: file.type,
      })
      .field('encryptedSymmetricKey', Buffer.from(encryptedSymmetricKey).toString('base64'))
      .field('iv', Array.from(iv).join(','))
      .field('publicKey', JSON.stringify(jwk));

    if (!response.body.success) {
      throw new Error(`Failed to upload file: ${response.body.message}`);
    }

    return response.body.payload as IFileBeta;

    // const handler = fileUploadHandler;
    // const client = createTestClient({
    //   handler,
    //   routeParams: { type: UploadType.INVOICE, targetId: accountBookId.toString() },
    // });
    // const response = await client
    //   .attach('file', fs.createReadStream(tempPath), {
    //     filename: file.name,
    //     contentType: file.type,
    //   })
    //   .field('encryptedSymmetricKey', Buffer.from(encryptedSymmetricKey).toString('base64'))
    //   .field('iv', Array.from(iv).join(','))
    //   .field('publicKey', JSON.stringify(jwk))
    //   .set('Cookie', this.helper.getCurrentSession().join('; '));

    return response.body.payload;
  }

  async createInvoiceRC2Input(accountBookId: number, fileId: number): Promise<IInvoiceRC2Input> {
    const handler = invoiceInputCreateHandler;
    const client = createTestClient({
      handler,
      routeParams: { accountBookId: accountBookId.toString() },
    });
    const response = await client
      .post(`/api/rc2/account_book/${accountBookId}/invoice/input`)
      .send({
        fileId,
        direction: InvoiceDirection.INPUT,
        isGenerated: false,
        currencyCode: CurrencyCode.TWD,
      })
      .set('Cookie', this.helper.getCurrentSession().join('; '))
      .expect(201);

    return response.body.payload;
  }

  async updateInvoiceRC2Input(
    accountBookId: number,
    invoiceId: number,
    data: Partial<IInvoiceRC2InputUI>
  ): Promise<IInvoiceRC2Input> {
    const handler = invoiceInputModifyHandler;
    const client = createTestClient({
      handler,
      routeParams: {
        accountBookId: accountBookId.toString(),
        invoiceId: invoiceId.toString(),
      },
    });
    const response = await client
      .put(`/api/rc2/account_book/${accountBookId}/invoice/${invoiceId}/input`)
      .send(data)
      .set('Cookie', this.helper.getCurrentSession().join('; '))
      .expect(200);

    return response.body.payload;
  }

  async deleteInvoiceRC2Input(accountBookId: number, invoiceIds: number[]): Promise<number[]> {
    const handler = invoiceInputModifyHandler;
    const client = createTestClient({
      handler,
      routeParams: { accountBookId: accountBookId.toString() },
    });
    const response = await client
      .delete(`/api/rc2/account_book/${accountBookId}/invoice/undefined/input`)
      .send({ invoiceIds })
      .set('Cookie', this.helper.getCurrentSession().join('; '))
      .expect(200);

    return response.body.payload.deletedIds;
  }
}
