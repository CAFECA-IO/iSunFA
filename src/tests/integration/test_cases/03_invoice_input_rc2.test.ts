import fs from 'fs';
import path from 'path';
import { APITestHelper } from '@/tests/integration/setup/api_helper';
import { createTestClient } from '@/tests/integration/setup/test_client';
import { TestClient } from '@/interfaces/test_client';
import { APIName, APIPath } from '@/constants/api_connection';
import teamListHandler from '@/pages/api/v2/user/[userId]/team';
import accountBookCreateHandler from '@/pages/api/v2/user/[userId]/account_book';
import invoiceInputCreateHandler from '@/pages/api/rc2/account_book/[accountBookId]/invoice/input';
import invoiceInputModifyHandler from '@/pages/api/rc2/account_book/[accountBookId]/invoice/[invoiceId]/input';
import { validateOutputData } from '@/lib/utils/validator';
import { WORK_TAG } from '@/interfaces/account_book';
import { UPLOAD_TYPE_TO_FOLDER_MAP, UploadType } from '@/constants/file';
import { createFile } from '@/lib/utils/repo/file.repo';
import {
  CurrencyCode,
  DeductionType,
  InvoiceDirection,
  InvoiceType,
  TaxType,
} from '@/constants/invoice_rc2';
import * as cryptoUtils from '@/lib/utils/crypto';

describe('Integration Test - Invoice RC2', () => {
  let helper: APITestHelper;
  let currentUserId: string;
  let teamListClient: TestClient;
  let accountBookId: number;
  let fileId: number;
  let invoiceId: number;

  beforeAll(async () => {
    helper = await APITestHelper.createWithEmail('user1@isunfa.com');
    const cookies = helper.getCurrentSession();
    const statusResponse = await helper.getStatusInfo();
    const user = statusResponse.body.payload?.user as { id?: string } | undefined;
    currentUserId = `${user?.id ?? '1'}`;

    teamListClient = createTestClient({
      handler: teamListHandler,
      routeParams: { userId: currentUserId },
    });

    const teamResponse = await teamListClient
      .get(APIPath.LIST_TEAM.replace(':userId', currentUserId))
      .query({ page: 1, pageSize: 10 })
      .send({})
      .set('Cookie', cookies.join('; '))
      .expect(200);

    const team = teamResponse.body.payload?.data?.[0];
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
      .set('Cookie', cookies.join('; '))
      .expect(200);

    const { isOutputDataValid, outputData } = validateOutputData(
      APIName.CREATE_ACCOUNT_BOOK,
      accountBookResponse.body.payload
    );

    expect(accountBookResponse.body.success).toBe(true);
    expect(accountBookResponse.body.payload?.id).toBeDefined();
    expect(isOutputDataValid).toBe(true);
    accountBookId = outputData?.id || 0;

    const publicKey = await cryptoUtils.getPublicKeyByCompany(accountBookId);
    const filePath = path.resolve(__dirname, '../test_files/mock_invoice.png');
    const fileBuffer = fs.readFileSync(filePath);
    const file = new File([fileBuffer], 'mock_invoice.png', { type: 'image/png' });
    const { encryptedFile, encryptedSymmetricKey, iv } = await cryptoUtils.encryptFileWithPublicKey(
      file,
      publicKey!
    );
    const tempPath = path.resolve(__dirname, '../test_files/temp_encrypted_mock_invoice.png');
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
    fileId = fileInDB?.id || 0;
  });

  it('should create invoice RC2 input', async () => {
    const invoiceInputCreateClient = createTestClient({
      handler: invoiceInputCreateHandler,
      routeParams: { accountBookId: accountBookId.toString() },
    });

    const cookies = helper.getCurrentSession();

    // eslint-disable-next-line no-console
    console.log('Creating invoice RC2 input with fileId:', fileId);

    const invoiceInputCreateResponse = await invoiceInputCreateClient
      .post(`/api/rc2/account_book/${accountBookId}/invoice/input`)
      .send({
        fileId,
        direction: InvoiceDirection.INPUT,
        isGenerated: false,
        currencyCode: CurrencyCode.TWD,
      })
      .set('Cookie', cookies.join('; '))
      .expect(200);

    expect(invoiceInputCreateResponse.body.success).toBe(true);
    expect(invoiceInputCreateResponse.body.payload?.id).toBeDefined();

    // eslint-disable-next-line no-console
    console.log('Created invoice RC2 input:', invoiceInputCreateResponse.body.payload);

    const { isOutputDataValid, outputData } = validateOutputData(
      APIName.CREATE_INVOICE_RC2_INPUT,
      invoiceInputCreateResponse.body.payload
    );
    if (isOutputDataValid && outputData) {
      invoiceId = outputData.id;
    }
  });

  it('should update invoice RC2 input', async () => {
    if (invoiceId === undefined) {
      throw new Error('invoiceId is not defined, cannot update invoice input');
    }

    const invoiceInputModifyClient = createTestClient({
      handler: invoiceInputModifyHandler,
      routeParams: {
        accountBookId: accountBookId.toString(),
        invoiceId: invoiceId.toString(),
      },
    });

    const cookies = helper.getCurrentSession();

    const response = await invoiceInputModifyClient
      .put(
        APIPath.UPDATE_INVOICE_RC2_INPUT.replace(
          ':accountBookId',
          accountBookId.toString()
        ).replace(':invoiceId', invoiceId.toString())
      )
      .send({
        no: 'AB25000038',
        type: InvoiceType.INPUT_21,
        taxType: TaxType.TAXABLE,
        issuedDate: 1728835200,
        taxRate: 5,
        netAmount: 5200,
        taxAmount: 260,
        totalAmount: 5460,
        salesName: '統一智能空調工程有限公司',
        salesIdNumber: '00209406',
        deductionType: DeductionType.DEDUCTIBLE_FIXED_ASSETS,
        isSharedAmount: false,
      })
      .set('Cookie', cookies.join('; '))
      .expect(200);

    // eslint-disable-next-line no-console
    console.log('Updated invoice RC2 input:', response.body.payload);

    expect(response.body.success).toBe(true);
    expect(response.body.payload?.id).toBeDefined();

    const { isOutputDataValid: isUpdateValid, outputData: updatedData } = validateOutputData(
      APIName.UPDATE_INVOICE_RC2_INPUT,
      response.body.payload
    );
    expect(isUpdateValid).toBe(true);
    expect(updatedData?.no).toBe('AB25000038');
  });

  it('should delete invoice RC2 input', async () => {
    if (invoiceId === undefined) {
      throw new Error('invoiceId is not defined, cannot delete invoice input');
    }

    const invoiceInputModifyClient = createTestClient({
      handler: invoiceInputCreateHandler,
      routeParams: {
        accountBookId: accountBookId.toString(),
        // invoiceId: invoiceId.toString(),
      },
    });

    const cookies = helper.getCurrentSession();

    const invoiceInputResponse = await invoiceInputModifyClient
      .delete(APIPath.DELETE_INVOICE_RC2_INPUT.replace(':accountBookId', accountBookId.toString()))
      .send({
        invoiceIds: [invoiceId],
      })
      .set('Cookie', cookies.join('; '))
      .expect(200);

    // eslint-disable-next-line no-console
    console.log('Deleted invoice RC2 input:', invoiceInputResponse.body);

    expect(invoiceInputResponse.body.success).toBe(true);
  });

  afterAll(() => {
    helper.clearAllUserSessions();
  });
});
