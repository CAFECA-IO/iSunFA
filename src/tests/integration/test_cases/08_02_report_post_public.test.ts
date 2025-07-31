import { APITestHelper } from '@/tests/integration/setup/api_helper';
import { createTestClient } from '@/tests/integration/setup/test_client';

// Info: (20250725 - Shirley) Import API handlers for report post integration testing
import connectAccountBookHandler from '@/pages/api/v2/account_book/[accountBookId]/connect';
import reportPostHandler from '@/pages/api/v2/account_book/[accountBookId]/report/public';
import voucherPostHandler from '@/pages/api/v2/account_book/[accountBookId]/voucher';

// Info: (20250725 - Shirley) Import required types and constants
import { validateOutputData } from '@/lib/utils/validator';
import { APIName } from '@/constants/api_connection';
import { ReportSheetType } from '@/constants/report';
import { TestDataFactory } from '@/tests/integration/setup/test_data_factory';
import { BaseTestContext } from '@/tests/integration/setup/base_test_context';

// Info: (20250724 - Shirley) Mock pusher for testing
jest.mock('pusher', () => ({
  __esModule: true,
  default: jest.fn(() => ({ trigger: jest.fn() })),
}));

jest.mock('@/lib/utils/crypto', () => {
  const real = jest.requireActual('@/lib/utils/crypto');

  const keyPairPromise = crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['encrypt', 'decrypt']
  );

  return {
    ...real,
    getPublicKeyByCompany: jest.fn(async () => (await keyPairPromise).publicKey),
    getPrivateKeyByCompany: jest.fn(async () => (await keyPairPromise).privateKey),
    storeKeyByCompany: jest.fn(),
  };
});

/**
 * Info: (20250725 - Shirley) Integration Test - Report Post Public API Integration (Test Case 10)
 *
 * Primary Purpose:
 * - Test post report API functionality and data structure
 * - Verify report generation after voucher posting
 * - Ensure proper API response validation
 * - Test report creation with actual voucher data
 *
 * Test Flow:
 * 1. Use BaseTestContext for shared authentication and resources
 * 2. Create Account Book for report testing
 * 3. Voucher Posting for Report Data
 * 4. Report Generation via POST
 * 5. Report Data Validation
 */
describe('Report Post Public API – 完整報表生成測試', () => {
  let helper: APITestHelper;
  let userId: number;
  let teamId: number;
  let accountBookId: number;
  let cookies: string[];

  beforeAll(async () => {
    // Info: (20250725 - Shirley) Use BaseTestContext for shared resources
    const sharedContext = await BaseTestContext.getSharedContext();
    helper = sharedContext.helper;
    userId = sharedContext.userId;
    teamId = sharedContext.teamId;
    cookies = sharedContext.cookies;

    // Info: (20250725 - Shirley) Create account book for report testing
    accountBookId = (await helper.createAccountBook(userId, teamId)).id;
  });

  it('POST → 建立 Vouchers 作為報表資料來源', async () => {
    // Info: (20250725 - Shirley) Connect to account book first
    const connectClient = createTestClient({
      handler: connectAccountBookHandler,
      routeParams: { accountBookId: accountBookId.toString() },
    });

    const responseForConnect = await connectClient
      .get(`/api/v2/account_book/${accountBookId}/connect`)
      .set('Cookie', cookies.join('; '))
      .expect(200);

    expect(responseForConnect.body.success).toBe(true);
    expect(responseForConnect.body.payload).toBeDefined();

    const sampleVouchersData = TestDataFactory.sampleVoucherData();
    const createdVouchers = [];

    // Info: (20250725 - Shirley) Create vouchers for report data
    const voucherClient = createTestClient({
      handler: voucherPostHandler,
      routeParams: { accountBookId: accountBookId.toString() },
    });

    for (let i = 0; i < sampleVouchersData.length; i += 1) {
      const voucherData = sampleVouchersData[i];

      const voucherPayload = {
        actions: [],
        certificateIds: [],
        invoiceRC2Ids: [],
        voucherDate: voucherData.date,
        type: voucherData.type,
        note: voucherData.note,
        lineItems: voucherData.lineItems,
        assetIds: [],
        counterPartyId: null,
      };

      // ToDo: (20250725 - Luphia) Fix this, something always goes wrong when using await in a loop
      // eslint-disable-next-line no-await-in-loop
      const response = await voucherClient
        .post(`/api/v2/account_book/${accountBookId}/voucher`)
        .send(voucherPayload)
        .set('Cookie', cookies.join('; '));

      if (response.status === 201) {
        createdVouchers.push({
          id: response.body.payload.id,
          type: voucherData.type,
          lineItems: voucherData.lineItems,
        });
      }
    }

    expect(createdVouchers.length).toBe(sampleVouchersData.length);
  });

  it('POST → 生成資產負債表報表', async () => {
    const reportClient = createTestClient({
      handler: reportPostHandler,
      routeParams: { accountBookId: accountBookId.toString() },
    });

    const currentTimestamp = Math.floor(Date.now() / 1000);
    const startDate = currentTimestamp - 86400 * 365;
    const endDate = currentTimestamp;

    const reportPayload = {
      type: ReportSheetType.BALANCE_SHEET,
      startDate,
      endDate,
      reportType: 'financial',
    };

    const response = await reportClient
      .post(`/api/v2/account_book/${accountBookId}/report/public`)
      .send(reportPayload)
      .set('Cookie', cookies.join('; '));

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.payload).toBeDefined();
    console.log('balanceSheetPublicResponse:', response.body);
    // expect(typeof response.body.payload).toBe('number');

    const { isOutputDataValid, outputData } = validateOutputData(
      APIName.REPORT_GENERATE,
      response.body.payload
    );
    expect(isOutputDataValid).toBe(true);
    expect(outputData).toBeDefined();
  });

  it('POST → 生成損益表報表', async () => {
    const reportClient = createTestClient({
      handler: reportPostHandler,
      routeParams: { accountBookId: accountBookId.toString() },
    });

    const currentTimestamp = Math.floor(Date.now() / 1000);
    const startDate = currentTimestamp - 86400 * 365;
    const endDate = currentTimestamp;

    const reportPayload = {
      type: ReportSheetType.INCOME_STATEMENT,
      startDate,
      endDate,
      reportType: 'financial',
    };

    const response = await reportClient
      .post(`/api/v2/account_book/${accountBookId}/report/public`)
      .send(reportPayload)
      .set('Cookie', cookies.join('; '));

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.payload).toBeDefined();
    console.log('incomeStatementPublicResponse:', response.body);

    const { isOutputDataValid, outputData } = validateOutputData(
      APIName.REPORT_GENERATE,
      response.body.payload
    );
    expect(isOutputDataValid).toBe(true);
    expect(outputData).toBeDefined();
  });

  it('POST → 生成現金流量表報表', async () => {
    const reportClient = createTestClient({
      handler: reportPostHandler,
      routeParams: { accountBookId: accountBookId.toString() },
    });

    const currentTimestamp = Math.floor(Date.now() / 1000);
    const startDate = currentTimestamp - 86400 * 365;
    const endDate = currentTimestamp;

    const reportPayload = {
      startDate,
      endDate,
      type: ReportSheetType.CASH_FLOW_STATEMENT,
      reportType: 'financial',
    };

    const response = await reportClient
      .post(`/api/v2/account_book/${accountBookId}/report/public`)
      .send(reportPayload)
      .set('Cookie', cookies.join('; '));

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.payload).toBeDefined();
    console.log('cashFlowStatementPublicResponse:', response.body);

    const { isOutputDataValid, outputData } = validateOutputData(
      APIName.REPORT_GENERATE,
      response.body.payload
    );
    expect(isOutputDataValid).toBe(true);
    expect(outputData).toBeDefined();
  });

  it('應該拒絕未認證的請求', async () => {
    const reportClient = createTestClient({
      handler: reportPostHandler,
      routeParams: { accountBookId: accountBookId.toString() },
    });

    const currentTimestamp = Math.floor(Date.now() / 1000);
    const reportPayload = {
      type: ReportSheetType.BALANCE_SHEET,
      startDate: currentTimestamp - 86400 * 365,
      endDate: currentTimestamp,
      reportType: 'financial',
    };

    const response = await reportClient
      .post(`/api/v2/account_book/${accountBookId}/report/public`)
      .send(reportPayload);

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('應該正確處理無效的報表類型', async () => {
    const reportClient = createTestClient({
      handler: reportPostHandler,
      routeParams: { accountBookId: accountBookId.toString() },
    });

    const currentTimestamp = Math.floor(Date.now() / 1000);
    const reportPayload = {
      type: 'invalid_report_type',
      startDate: currentTimestamp - 86400 * 365,
      endDate: currentTimestamp,
      reportType: 'financial',
    };

    const response = await reportClient
      .post(`/api/v2/account_book/${accountBookId}/report/public`)
      .send(reportPayload)
      .set('Cookie', cookies.join('; '));

    expect(response.status).toBe(422);
    expect(response.body.success).toBe(false);
  });
});
