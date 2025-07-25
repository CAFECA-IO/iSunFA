import { BaseTestContext } from '@/tests/integration/setup/base_test_context';
import { APITestHelper } from '@/tests/integration/setup/api_helper';
import { createTestClient } from '@/tests/integration/setup/test_client';

// Info: (20250721 - Shirley) Import API handlers for trial balance integration testing
/**  Info: (20250723 - Tzuhan) replaced by BaseTestContext
import createAccountBookHandler from '@/pages/api/v2/user/[userId]/account_book';
import getAccountBookHandler from '@/pages/api/v2/account_book/[accountBookId]';
import connectAccountBookHandler from '@/pages/api/v2/account_book/[accountBookId]/connect';
import voucherPostHandler from '@/pages/api/v2/account_book/[accountBookId]/voucher';
*/
import trialBalanceHandler from '@/pages/api/v2/account_book/[accountBookId]/trial_balance';
import trialBalanceExportHandler from '@/pages/api/v2/account_book/[accountBookId]/trial_balance/export';

// Info: (20250716 - Shirley) Import required types and constants
// import { WORK_TAG } from '@/interfaces/account_book';
// import { LocaleKey } from '@/constants/normal_setting';
// import { CurrencyType } from '@/constants/currency';
import { validateOutputData } from '@/lib/utils/validator';
import { APIName, APIPath } from '@/constants/api_connection';
import { TrialBalanceItem } from '@/interfaces/trial_balance';
import { TestDataFactory } from '@/tests/integration/setup/test_data_factory';
// import { TestClient } from '@/interfaces/test_client';

/**  Info: (20250723 - Tzuhan) replaced by BaseTestContext
// Info: (20250716 - Shirley) Mock pusher for testing
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
*/

/**
 * Info: (20250721 - Shirley) Integration Test - Trial Balance Integration (Test Case 8.3)
 *
 * Primary Purpose:
 * - Test trial balance API functionality and data structure
 * - Verify trial balance calculation after voucher posting
 * - Ensure proper API response validation with expected data
 * - Test trial balance with actual voucher data
 *
 * Test Flow:
 * 1. User Authentication and Account Book Setup
 * 2. Voucher Posting for Trial Balance Data
 * 3. Trial Balance Report Generation and Validation
 */
describe('Integration Test - Trial Balance Integration (Test Case 8.3)', () => {
  let authenticatedHelper: APITestHelper;
  let currentUserId: string;
  let teamId: number;
  let accountBookId: number;
  let cookies: string[];
  let startDate: number;
  let endDate: number;
  // let connectAccountBookClient: TestClient;
  // let voucherPostClient: TestClient;

  /**  Info: (20250723 - Tzuhan) replaced by BaseTestContext
  const randomNumber = Math.floor(Math.random() * 90000000) + 10000000;

  // Info: (20250716 - Shirley) Test company data
  const testCompanyData = {
    name: 'Trial Balance Test Company 試算表測試公司',
    taxId: randomNumber.toString(),
    tag: WORK_TAG.ALL,
    teamId: 0,
    businessLocation: LocaleKey.tw,
    accountingCurrency: CurrencyType.TWD,
    representativeName: 'Test Representative',
    taxSerialNumber: `A${randomNumber}`,
    contactPerson: 'Test Contact',
    phoneNumber: '+886-2-1234-5678',
    city: 'Taipei',
    district: 'Xinyi District',
    enteredAddress: '123 Test Street, Xinyi District, Taipei',
  };
  */

  beforeAll(async () => {
    const sharedContext = await BaseTestContext.getSharedContext();
    authenticatedHelper = sharedContext.helper;
    currentUserId = String(sharedContext.userId);
    teamId = sharedContext.teamId || (await BaseTestContext.createTeam(Number(currentUserId))).id;
    cookies = sharedContext.cookies;
    accountBookId = (await BaseTestContext.createAccountBook(Number(currentUserId), teamId)).id;
    startDate = sharedContext.startDate;
    endDate = sharedContext.endDate;
    // const clients = await authenticatedHelper.getAccountBookClients(accountBookId);
    // createAccountBookClient = clients.createAccountBookClient;
    // connectAccountBookClient = clients.connectAccountBookClient;
    // voucherPostClient = clients.voucherPostClient;
    /**  Info: (20250723 - Tzuhan) replaced by BaseTestContext
    // Info: (20250716 - Shirley) Setup authenticated helper and complete user registration
    authenticatedHelper = await APITestHelper.createHelper({ autoAuth: true });

    const statusResponse = await authenticatedHelper.getStatusInfo();
    const userData = statusResponse.body.payload?.user as { id?: number };
    currentUserId = userData?.id?.toString() || '1';

    // Info: (20250716 - Shirley) Complete user registration flow
    await authenticatedHelper.agreeToTerms();
    await authenticatedHelper.createUserRole();
    await authenticatedHelper.selectUserRole();

    // Info: (20250716 - Shirley) Create team for account book operations
    const teamResponse = await authenticatedHelper.createTeam();
    const teamData = teamResponse.body.payload?.team as { id?: number };
    teamId = teamData?.id || 0;

    // Info: (20250716 - Shirley) Update test company data with actual team ID
    testCompanyData.teamId = teamId;

    // Info: (20250716 - Shirley) Refresh session to ensure team membership is updated
    await authenticatedHelper.getStatusInfo();
*/
    if (process.env.DEBUG_TESTS === 'true') {
      // Deprecated: (20250730 - Shirley) Remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('✅ Test setup completed: User and team created with ID:', teamId);
    }
  });

  afterAll(async () => {
    /**  Info: (20250723 - Tzuhan) replaced by BaseTestContext
    // Info: (20250716 - Shirley) Cleanup test data
    await authenticatedHelper.clearSession();
*/
    if (process.env.DEBUG_TESTS === 'true') {
      // Deprecated: (20250730 - Shirley) Remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('✅ Test cleanup completed');
    }
  });

  /**
   * Info: (20250716 - Shirley) Test Step 1: Create Account Book
   */
  /**  Info: (20250723 - Tzuhan) replaced by BaseTestContext
  describe('Step 1: Account Book Creation', () => {
    test('should create account book with proper structure', async () => {
      const createAccountBookClient = createTestClient({
        handler: createAccountBookHandler,
        routeParams: { userId: currentUserId },
      });

      await authenticatedHelper.ensureAuthenticated();

      const response = await createAccountBookClient
        .post(`/api/v2/user/${currentUserId}/account_book`)
        .send(testCompanyData)
        .set('Cookie', cookies.join('; '))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.payload).toBeDefined();
      expect(response.body.payload.name).toBe(testCompanyData.name);
      expect(response.body.payload.taxId).toBe(testCompanyData.taxId);

      // Info: (20250716 - Shirley) Validate output with production validator
      const { isOutputDataValid, outputData } = validateOutputData(
        APIName.CREATE_ACCOUNT_BOOK,
        response.body.payload
      );
      expect(isOutputDataValid).toBe(true);
      expect(outputData?.id).toBeDefined();
      expect(typeof outputData?.id).toBe('number');

      accountBookId = response.body.payload.id;

      if (process.env.DEBUG_TESTS === 'true') {
        // Deprecated: (20250730 - Shirley) Remove eslint-disable
        // eslint-disable-next-line no-console
        console.log('✅ Account book created successfully with ID:', accountBookId);
      }
    });

    test('should verify account book connection', async () => {
      const getAccountBookClient = createTestClient({
        handler: getAccountBookHandler,
        routeParams: { accountBookId: accountBookId.toString() },
      });

      await authenticatedHelper.ensureAuthenticated();

      const response = await getAccountBookClient
        .get(`/api/v2/account_book/${accountBookId}`)
        .set('Cookie', cookies.join('; '))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.payload.id).toBe(accountBookId);
      expect(response.body.payload.name).toBe(testCompanyData.name);

      if (process.env.DEBUG_TESTS === 'true') {
        // Deprecated: (20250730 - Shirley) Remove eslint-disable
        // eslint-disable-next-line no-console
        console.log('✅ Account book connection verified');
      }
    });
  });
*/
  /**
   * Info: (20250721 - Shirley) Test Step 2: Create Sample Vouchers for Trial Balance
   */
  /** Info: (20250722 - Tzuhan) replaced by BaseTestContent
  describe('Step 2: Create Sample Vouchers for Trial Balance', () => {
    test('should create vouchers and verify trial balance data', async () => {
      await authenticatedHelper.ensureAuthenticated();

      // Info: (20250721 - Shirley) Connect to account book first
      const connectAccountBookClient = createTestClient({
        handler: connectAccountBookHandler,
        routeParams: { accountBookId: accountBookId.toString() },
      });

      const responseForConnect = await connectAccountBookClient
        .get(`/api/v2/account_book/${accountBookId}/connect`)
        .set('Cookie', cookies.join('; '))
        .expect(200);

      expect(responseForConnect.body.success).toBe(true);
      expect(responseForConnect.body.payload).toBeDefined();
      const voucherPostClient = createTestClient({
        handler: voucherPostHandler,
        routeParams: { accountBookId: accountBookId.toString() },
      });

      const sampleVouchersData = TestDataFactory.sampleVoucherData();
      const createdVouchers = [];

      // Info: (20250721 - Shirley) Create all sample vouchers
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

        // eslint-disable-next-line no-await-in-loop
        const response = await voucherPostClient
          .post(`/api/v2/account_book/${accountBookId}/voucher`)
          .send(voucherPayload)
          .set('Cookie', cookies.join('; '));

        if (response.status === 201) {
          createdVouchers.push({
            id: response.body.payload.id,
            type: voucherData.type,
            lineItems: voucherData.lineItems,
          });
          // Deprecated: (20250730 - Shirley) Remove eslint-disable
          // eslint-disable-next-line no-console
          console.log('✅ Voucher created successfully with ID:', response.body.payload.id);
        } else {
          // Deprecated: (20250730 - Shirley) Remove eslint-disable
          // eslint-disable-next-line no-console
          console.log('❌ Voucher creation failed:', response.body.message);
        }
      }

      // Info: (20250721 - Shirley) Verify all vouchers were created
      expect(createdVouchers.length).toBe(sampleVouchersData.length);

      // Deprecated: (20250730 - Shirley) Remove eslint-disable
      // eslint-disable-next-line no-console
      console.log(
        `\n🎉 Successfully created ${createdVouchers.length} vouchers for trial balance test`
      );
    });
  });
  */

  /**
   * Info: (20250721 - Shirley) Test Step 3: Generate Trial Balance Report
   */
  describe('Step 3: Generate Trial Balance Report', () => {
    test('should generate trial balance report with proper structure', async () => {
      await authenticatedHelper.ensureAuthenticated();

      const trialBalanceClient = createTestClient({
        handler: trialBalanceHandler,
        routeParams: { accountBookId: accountBookId.toString() },
      });

      const response = await trialBalanceClient
        .get(APIPath.TRIAL_BALANCE_LIST.replace(':accountBookId', accountBookId.toString()))
        .query({
          page: '1',
          pageSize: '100',
          startDate: startDate.toString(),
          endDate: endDate.toString(),
        })
        .set('Cookie', cookies.join('; '));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.payload).toBeDefined();
      expect(response.body.payload.data).toBeDefined();
      expect(Array.isArray(response.body.payload.data)).toBe(true);

      // Info: (20250721 - Shirley) Validate output with production validator
      const { isOutputDataValid, outputData } = validateOutputData(
        APIName.TRIAL_BALANCE_LIST,
        response.body.payload
      );
      expect(isOutputDataValid).toBe(true);
      expect(outputData).toBeDefined();

      if (process.env.DEBUG_TESTS === 'true') {
        // Deprecated: (20250730 - Shirley) Remove eslint-disable
        // eslint-disable-next-line no-console
        console.log('✅ Trial balance report generated successfully');
        // Deprecated: (20250730 - Shirley) Remove eslint-disable
        // eslint-disable-next-line no-console
        console.log(`   - Total Items: ${response.body.payload.totalCount}`);
      }
    });

    test('should validate trial balance data structure and calculations', async () => {
      await authenticatedHelper.ensureAuthenticated();

      const trialBalanceClient = createTestClient({
        handler: trialBalanceHandler,
        routeParams: { accountBookId: accountBookId.toString() },
      });

      const response = await trialBalanceClient
        .get(APIPath.TRIAL_BALANCE_LIST.replace(':accountBookId', accountBookId.toString()))
        .query({
          page: '1',
          pageSize: '100',
          startDate: startDate.toString(),
          endDate: endDate.toString(),
        })
        .set('Cookie', cookies.join('; '));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const trialBalanceData = response.body.payload;

      // Info: (20250721 - Shirley) Detailed trial balance validation
      expect(trialBalanceData.data).toBeDefined();
      expect(Array.isArray(trialBalanceData.data)).toBe(true);
      expect(trialBalanceData.totalCount).toBeGreaterThan(0);
      expect(trialBalanceData.data.length).toBeGreaterThan(0);

      // Info: (20250721 - Shirley) Validate pagination structure
      expect(trialBalanceData.page).toBe(1);
      expect(trialBalanceData.pageSize).toBe(100);
      expect(trialBalanceData.totalPages).toBeDefined();
      expect(trialBalanceData.hasNextPage).toBeDefined();
      expect(trialBalanceData.hasPreviousPage).toBeDefined();

      // Info: (20250721 - Shirley) Validate trial balance items structure
      const firstItem = trialBalanceData.data[0];
      expect(firstItem).toBeDefined();
      expect(firstItem.id).toBeDefined();
      expect(firstItem.no).toBeDefined();
      expect(firstItem.accountingTitle).toBeDefined();
      expect(typeof firstItem.beginningCreditAmount).toBe('number');
      expect(typeof firstItem.beginningDebitAmount).toBe('number');
      expect(typeof firstItem.endingCreditAmount).toBe('number');
      expect(typeof firstItem.endingDebitAmount).toBe('number');
    });
  });

  /**
   * Info: (20250721 - Shirley) Test Step 4: Complete Integration Workflow Validation
   */
  describe.skip('Step 4: Complete Integration Workflow Validation', () => {
    test('should validate complete trial balance integration workflow', async () => {
      // Info: (20250721 - Shirley) Step 1: Verify account book exists
      expect(accountBookId).toBeDefined();
      expect(accountBookId).toBeGreaterThan(0);

      // Info: (20250721 - Shirley) Step 2: Verify trial balance API is working
      await authenticatedHelper.ensureAuthenticated();

      const trialBalanceClient = createTestClient({
        handler: trialBalanceHandler,
        routeParams: { accountBookId: accountBookId.toString() },
      });

      const finalTrialBalanceResponse = await trialBalanceClient
        .get(APIPath.TRIAL_BALANCE_LIST.replace(':accountBookId', accountBookId.toString()))
        .query({
          page: '1',
          pageSize: '100',
          startDate: (startDate + 86400 * 365 * 2).toString(),
          endDate: (endDate + 86400 * 365 * 2).toString(),
        })
        .set('Cookie', cookies.join('; '));

      expect(finalTrialBalanceResponse.status).toBe(200);
      expect(finalTrialBalanceResponse.body.success).toBe(true);

      const finalTrialBalanceData = finalTrialBalanceResponse.body.payload;

      // Info: (20250721 - Shirley) Get expected trial balance data from TestDataFactory
      const expectedTrialBalanceData = TestDataFactory.expectedTrialBalanceData();

      // Info: (20250721 - Shirley) Validate payload structure
      expect(finalTrialBalanceData.totalCount).toBe(expectedTrialBalanceData.payload.totalCount);
      expect(finalTrialBalanceData.data.length).toBe(expectedTrialBalanceData.payload.data.length);

      // Info: (20250721 - Shirley) Validate specific trial balance items
      expectedTrialBalanceData.payload.data.forEach((expectedItem: TrialBalanceItem) => {
        const actualItem = finalTrialBalanceData.data.find(
          (item: TrialBalanceItem) => item.id === expectedItem.id
        );

        expect(actualItem).toBeDefined();
        if (actualItem) {
          expect(actualItem.no).toBe(expectedItem.no);
          expect(actualItem.accountingTitle).toBe(expectedItem.accountingTitle);
          expect(actualItem.beginningCreditAmount).toBe(expectedItem.beginningCreditAmount);
          expect(actualItem.beginningDebitAmount).toBe(expectedItem.beginningDebitAmount);
          expect(actualItem.endingCreditAmount).toBe(expectedItem.endingCreditAmount);
          expect(actualItem.endingDebitAmount).toBe(expectedItem.endingDebitAmount);
        }
      });

      // Info: (20250721 - Shirley) Trial balance should have proper structure
      expect(finalTrialBalanceData.page).toBeDefined();
      expect(finalTrialBalanceData.totalPages).toBeDefined();
      expect(finalTrialBalanceData.hasNextPage).toBeDefined();
      expect(finalTrialBalanceData.hasPreviousPage).toBeDefined();

      if (process.env.DEBUG_TESTS === 'true') {
        // Deprecated: (20250730 - Shirley) Remove eslint-disable
        // eslint-disable-next-line no-console
        console.log('✅ Complete workflow validated successfully');
        // Deprecated: (20250730 - Shirley) Remove eslint-disable
        // eslint-disable-next-line no-console
        console.log(`   - Account Book ID: ${accountBookId}`);
        // Deprecated: (20250730 - Shirley) Remove eslint-disable
        // eslint-disable-next-line no-console
        console.log(`   - Trial Balance Items: ${finalTrialBalanceData.data.length}`);
        // Deprecated: (20250730 - Shirley) Remove eslint-disable
        // eslint-disable-next-line no-console
        console.log(`   - Total Count: ${finalTrialBalanceData.totalCount}`);
      }
    });
  });

  /**
   * Info: (20250721 - Shirley) Test Step 5: Trial Balance Export Testing
   */
  describe('Step 5: Trial Balance Export Testing', () => {
    test('should export trial balance to CSV format', async () => {
      await authenticatedHelper.ensureAuthenticated();

      const trialBalanceExportClient = createTestClient({
        handler: trialBalanceExportHandler,
        routeParams: { accountBookId: accountBookId.toString() },
      });

      const exportRequestData = {
        fileType: 'csv',
        filters: {
          startDate: startDate + 86400 * 365 * 2,
          endDate: endDate + 86400 * 365 * 2,
        },
        options: {
          fields: [
            'accountingTitle',
            'no',
            'beginningDebitAmount',
            'beginningCreditAmount',
            'midtermDebitAmount',
            'midtermCreditAmount',
            'endingDebitAmount',
            'endingCreditAmount',
          ],
        },
      };

      const response = await trialBalanceExportClient
        .post(`/api/v2/account_book/${accountBookId}/trial_balance/export`)
        .send(exportRequestData)
        .set('Cookie', cookies.join('; '));

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.headers['content-disposition']).toContain('trial_balance_');

      // Info: (20250721 - Shirley) Validate CSV content structure
      const csvContent = response.text;

      expect(csvContent).toBeDefined();
      expect(typeof csvContent).toBe('string');
      expect(csvContent.length).toBeGreaterThan(0);

      // Info: (20250721 - Shirley) Parse CSV content and convert to JSON for comparison
      const lines = csvContent.split('\n').filter((line) => line.trim().length > 0);
      expect(lines.length).toBeGreaterThan(1);

      const headers = lines[0].split(',');
      expect(headers.length).toBeGreaterThanOrEqual(8);

      // Info: (20250721 - Shirley) Convert CSV to JSON format for comparison
      const csvData = lines.slice(1).map((line) => {
        const values = line.split(',');
        return {
          accountingTitle: values[0],
          no: values[1],
          beginningDebitAmount: parseInt(values[2], 10) || 0,
          beginningCreditAmount: parseInt(values[3], 10) || 0,
          midtermDebitAmount: parseInt(values[4], 10) || 0,
          midtermCreditAmount: parseInt(values[5], 10) || 0,
          endingDebitAmount: parseInt(values[6], 10) || 0,
          endingCreditAmount: parseInt(values[7], 10) || 0,
        };
      });

      // Info: (20250721 - Shirley) Get expected data from TestDataFactory for comparison
      const expectedData = TestDataFactory.expectedTrialBalanceData();

      // Info: (20250721 - Shirley) Compare CSV data with expected data
      expect(csvData.length).toBe(expectedData.payload.data.length);

      expectedData.payload.data.forEach((expectedItem) => {
        const csvItem = csvData.find((item) => item.no === expectedItem.no);
        expect(csvItem).toBeDefined();

        if (csvItem) {
          // Deprecated: (20250730 - Tzuhan) Remove eslint-disable
          // eslint-disable-next-line no-console
          console.log(`Comparing CSV item:`, csvItem);
          // Deprecated: (20250730 - Tzuhan) Remove eslint-disable
          // eslint-disable-next-line no-console
          console.log(`Against expected item:`, expectedItem);
          expect(csvItem.accountingTitle).toBe(expectedItem.accountingTitle);
          expect(csvItem.beginningDebitAmount).toBe(expectedItem.beginningDebitAmount);
          expect(csvItem.beginningCreditAmount).toBe(expectedItem.beginningCreditAmount);
          expect(csvItem.midtermDebitAmount).toBe(expectedItem.midtermDebitAmount);
          expect(csvItem.midtermCreditAmount).toBe(expectedItem.midtermCreditAmount);
          expect(csvItem.endingDebitAmount).toBe(expectedItem.endingDebitAmount);
          expect(csvItem.endingCreditAmount).toBe(expectedItem.endingCreditAmount);
        }
      });

      if (process.env.DEBUG_TESTS === 'true') {
        // Deprecated: (20250730 - Shirley) Remove eslint-disable
        // eslint-disable-next-line no-console
        console.log('✅ Trial balance CSV export successful');
        // Deprecated: (20250730 - Shirley) Remove eslint-disable
        // eslint-disable-next-line no-console
        console.log(`   - CSV Content Length: ${csvContent.length} characters`);
        // Deprecated: (20250730 - Shirley) Remove eslint-disable
        // eslint-disable-next-line no-console
        console.log(`   - CSV Lines Count: ${lines.length}`);
      }
    });

    test('should handle invalid file type for export', async () => {
      await authenticatedHelper.ensureAuthenticated();

      const trialBalanceExportClient = createTestClient({
        handler: trialBalanceExportHandler,
        routeParams: { accountBookId: accountBookId.toString() },
      });

      const exportRequestData = {
        fileType: 'pdf', // Invalid file type
        filters: {
          startDate,
          endDate,
        },
        options: {},
      };

      const response = await trialBalanceExportClient
        .post(`/api/v2/account_book/${accountBookId}/trial_balance/export`)
        .send(exportRequestData)
        .set('Cookie', cookies.join('; '));

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('400ISF0000'); // BAD_REQUEST due to validation error

      if (process.env.DEBUG_TESTS === 'true') {
        // Deprecated: (20250730 - Shirley) Remove eslint-disable
        // eslint-disable-next-line no-console
        console.log('✅ Invalid file type properly rejected');
      }
    });

    test('should handle missing date parameters for export', async () => {
      await authenticatedHelper.ensureAuthenticated();

      const trialBalanceExportClient = createTestClient({
        handler: trialBalanceExportHandler,
        routeParams: { accountBookId: accountBookId.toString() },
      });

      const exportRequestData = {
        fileType: 'csv',
        filters: {
          // Missing startDate and endDate
        },
        options: {},
      };

      const response = await trialBalanceExportClient
        .post(`/api/v2/account_book/${accountBookId}/trial_balance/export`)
        .send(exportRequestData)
        .set('Cookie', cookies.join('; '));

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('400ISF0000'); // BAD_REQUEST due to missing parameters

      if (process.env.DEBUG_TESTS === 'true') {
        // Deprecated: (20250730 - Shirley) Remove eslint-disable
        // eslint-disable-next-line no-console
        console.log('✅ Missing date parameters properly rejected');
      }
    });

    test('should handle export without authentication', async () => {
      const trialBalanceExportClient = createTestClient({
        handler: trialBalanceExportHandler,
        routeParams: { accountBookId: accountBookId.toString() },
      });

      const exportRequestData = {
        fileType: 'csv',
        filters: {
          startDate,
          endDate,
        },
        options: {},
      };

      const response = await trialBalanceExportClient
        .post(`/api/v2/account_book/${accountBookId}/trial_balance/export`)
        .send(exportRequestData);
      // No authentication cookies

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('400ISF0000'); // BAD_REQUEST due to missing authentication

      if (process.env.DEBUG_TESTS === 'true') {
        // Deprecated: (20250730 - Shirley) Remove eslint-disable
        // eslint-disable-next-line no-console
        console.log('✅ Unauthenticated export request properly rejected');
      }
    });
  });
});
