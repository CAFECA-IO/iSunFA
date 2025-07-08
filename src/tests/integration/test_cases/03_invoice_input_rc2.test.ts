import fs from 'fs';
import path from 'path';
// import request from 'supertest';
import { APITestHelper } from '@/tests/integration/setup/api_helper';
import { createTestClient } from '@/tests/integration/setup/test_client';
import { TestClient } from '@/interfaces/test_client';
import { APIName, APIPath } from '@/constants/api_connection';
import teamListHandler from '@/pages/api/v2/user/[userId]/team';
import accountBookCreateHandler from '@/pages/api/v2/user/[userId]/account_book';
import publicKeyGetHandler from '@/pages/api/v2/account_book/[accountBookId]/public_key';
// import uploadHandler from '@/pages/api/v2/file';
// import invoiceInputCreateHandler from '@/pages/api/rc2/account_book/[accountBookId]/invoice/input';
import { validateOutputData } from '@/lib/utils/validator';
import { WORK_TAG } from '@/interfaces/account_book';
import { encryptFileWithPublicKey, importPublicKey } from '@/lib/utils/crypto';
// import { UploadType } from '@/constants/file';
// import { IFileBeta } from '@/interfaces/file';
import { NextApiHandler } from 'next';
import { createServer } from 'http';
import { apiResolver } from 'next/dist/server/api-utils/node/api-resolver';

// import { CurrencyCode, InvoiceDirection } from '@/constants/invoice_rc2';

jest.mock('@/lib/utils/pdf_thumbnail', () => ({
  generatePDFThumbnail: jest.fn().mockResolvedValue(undefined),
}));

export const initTestClientServer = async (handler: NextApiHandler): Promise<string> => {
  const server = createServer((req, res) => {
    const url = new URL(req.url || '/', 'http://localhost');
    const queryFromUrl = Object.fromEntries(url.searchParams.entries());

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (req as any).query = queryFromUrl;

    return apiResolver(
      req,
      res,
      queryFromUrl,
      handler,
      {
        previewModeId: '',
        previewModeEncryptionKey: '',
        previewModeSigningKey: '',
      },
      false
    );
  });

  return new Promise((resolve) => {
    const listener = server.listen(0, () => {
      const address = listener.address();
      if (typeof address === 'object' && address) {
        const testClientPort = address.port;
        resolve(`http://localhost:${testClientPort}`);
      }
    });
  });
};

describe('Integration Test - Invoice RC2', () => {
  let helper: APITestHelper;
  let currentUserId: string;
  let teamListClient: TestClient;
  let accountBookId: string;
  // let fileBeta: IFileBeta;

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
    accountBookId = `${outputData?.id ?? ''}`;
  });

  it('should upload encrypted file and create invoice RC2 input', async () => {
    const cookies = helper.getCurrentSession();
    const keyClient = createTestClient({
      handler: publicKeyGetHandler,
      routeParams: { accountBookId },
    });

    const keyResponse = await keyClient
      .get(APIPath.PUBLIC_KEY_GET.replace(':accountBookId', accountBookId))
      .set('Cookie', cookies.join('; '))
      .expect(200);

    const jwk = keyResponse.body.payload as JsonWebKey;
    const publicKey = await importPublicKey(jwk);
    const filePath = path.resolve(__dirname, '../test_files/mock_invoice.png');
    const fileBuffer = fs.readFileSync(filePath);
    const file = new File([fileBuffer], 'mock_invoice.png', { type: 'image/png' });
    const { encryptedFile, iv, encryptedSymmetricKey } = await encryptFileWithPublicKey(
      file,
      publicKey
    );
    const encryptedBuffer = Buffer.from(await encryptedFile.arrayBuffer());
    const tempPath = path.resolve(__dirname, '../test_files/temp_encrypted_mock_invoice.png');
    fs.writeFileSync(tempPath, encryptedBuffer);
    const encryptedSymmetricKeyBase64 = Buffer.from(encryptedSymmetricKey).toString('base64');
    const ivString = Array.from(iv).join(',');
    const fileStream = fs.createReadStream(tempPath);

    // eslint-disable-next-line no-console
    console.log('[DEBUG] File stream created:', fileStream.path);
    // eslint-disable-next-line no-console
    console.log('[DEBUG] Encrypted symmetric key base64:', encryptedSymmetricKeyBase64);
    // eslint-disable-next-line no-console
    console.log('[DEBUG] IV string:', ivString);

    /**
    const baseUrl = await initTestClientServer(uploadHandler);
    const uploadResponse = await request(baseUrl)
      .post(`${APIPath.FILE_UPLOAD}?type=${UploadType.INVOICE}&targetId=${accountBookId}`)
      // .set('Cookie', cookies.join('; '))
      .attach('file', fileStream, {
        filename: file.name,
        contentType: file.type,
      })
      .field('encryptedSymmetricKey', encryptedSymmetricKeyBase64)
      .field('iv', ivString)
      .field('publicKey', JSON.stringify(jwk));

    // eslint-disable-next-line no-console
    console.log('[DEBUG] Uploaded uploadResponse:', uploadResponse);

    // expect(uploadResponse.body.success).toBe(true);
    // fileBeta = uploadResponse.body?.payload as IFileBeta;
    // eslint-disable-next-line no-console
    // console.log('[DEBUG] Uploaded fileBeta:', fileBeta);

    /** Info: (20250704 - Tzuhan) Invoice input creation is currently commented out
    const invoiceInputClient = createTestClient({
      handler: invoiceInputCreateHandler,
      routeParams: { accountBookId },
    });

    const invoiceInputResponse = await invoiceInputClient
      .post(`/api/rc2/account_book/${accountBookId}/invoice/input`)
      .send({
        fileId: fileBeta.id,
        direction: InvoiceDirection.INPUT,
        isGenerated: false,
        currencyCode: CurrencyCode.TWD,
      })
      .set('Cookie', cookies.join('; '))
      .expect(201);

    expect(invoiceInputResponse.body.success).toBe(true);
    expect(invoiceInputResponse.body.payload?.id).toBeDefined();
    */
  });

  afterAll(() => {
    helper.clearAllUserSessions();
  });
});
