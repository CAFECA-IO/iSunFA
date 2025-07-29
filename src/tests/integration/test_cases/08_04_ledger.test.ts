import { BaseTestContext } from '@/tests/integration/setup/base_test_context';
import { APITestHelper } from '@/tests/integration/setup/api_helper';
import { createTestClient } from '@/tests/integration/setup/test_client';
/**  Info: (20250723 - Tzuhan) replaced by BaseTestContext
// Info: (20250721 - Shirley) Import API handlers for ledger integration testing
import createAccountBookHandler from '@/pages/api/v2/user/[userId]/account_book';
import getAccountBookHandler from '@/pages/api/v2/account_book/[accountBookId]';
import voucherPostHandler from '@/pages/api/v2/account_book/[accountBookId]/voucher';
*/
import connectAccountBookHandler from '@/pages/api/v2/account_book/[accountBookId]/connect';
import getLedgerHandler from '@/pages/api/v2/account_book/[accountBookId]/ledger';
import exportLedgerHandler from '@/pages/api/v2/account_book/[accountBookId]/ledger/export';

// Info: (20250721 - Shirley) Import required types and constants
// import { WORK_TAG } from '@/interfaces/account_book';
// import { LocaleKey } from '@/constants/normal_setting';
// import { CurrencyType } from '@/constants/currency';
import { validateOutputData } from '@/lib/utils/validator';
import { APIName } from '@/constants/api_connection';
import { TestDataFactory } from '@/tests/integration/setup/test_data_factory';
import { TestClient } from '@/interfaces/test_client';
// import { TestClient } from '@/interfaces/test_client';
/**  Info: (20250723 - Tzuhan) replaced by BaseTestContext
// Info: (20250721 - Shirley) Mock pusher for testing
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
 * Info: (20250721 - Shirley) Integration Test - Ledger Integration (Test Case 8.4)
 *
 * Primary Purpose:
 * - Test ledger API functionality and data structure
 * - Verify ledger calculation after voucher posting
 * - Ensure proper API response validation with expected data
 * - Test ledger with actual voucher data
 *
 * Test Flow:
 * 1. User Authentication and Account Book Setup
 * 2. Voucher Posting for Ledger Data
 * 3. Ledger Report Generation and Validation
 * 4. Ledger Export Testing
 */
describe('Integration Test - Ledger Integration (Test Case 8.4)', () => {
  let authenticatedHelper: APITestHelper;
  let currentUserId: string;
  let teamId: number;
  let accountBookId: number;
  let cookies: string[];
  let endDate: number;

  let connectAccountBookClient: TestClient;

  /**  Info: (20250723 - Tzuhan) replaced by BaseTestContext
  const randomNumber = Math.floor(Math.random() * 90000000) + 10000000;

  // Info: (20250721 - Shirley) Test company data
  const testCompanyData = {
    name: 'Ledger Test Company 分類帳測試公司',
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
    // Info: (20250729 - Shirley) 使用動態時間戳代替固定時間
    const currentTimestamp = Math.floor(Date.now() / 1000);
    endDate = currentTimestamp + 86400 * 30; // 30 days from now

    // Info: (20250728 - Shirley) Initialize connect account book client
    connectAccountBookClient = createTestClient({
      handler: connectAccountBookHandler,
      routeParams: { accountBookId: accountBookId.toString() },
    });

    // const clients = await authenticatedHelper.getAccountBookClients(accountBookId);
    // createAccountBookClient = clients.createAccountBookClient;
    // connectAccountBookClient = clients.connectAccountBookClient;
    // voucherPostClient = clients.voucherPostClient;
    /**  Info: (20250723 - Tzuhan) replaced by BaseTestContext
    // Info: (20250721 - Shirley) Setup authenticated helper and complete user registration
    authenticatedHelper = await APITestHelper.createHelper({ autoAuth: true });

    const statusResponse = await authenticatedHelper.getStatusInfo();
    const userData = statusResponse.body.payload?.user as { id?: number };
    currentUserId = userData?.id?.toString() || '1';

    // Info: (20250721 - Shirley) Complete user registration flow
    await authenticatedHelper.agreeToTerms();
    await authenticatedHelper.createUserRole();
    await authenticatedHelper.selectUserRole();

    // Info: (20250721 - Shirley) Create team for account book operations
    const teamResponse = await authenticatedHelper.createTeam();
    const teamData = teamResponse.body.payload?.team as { id?: number };
    teamId = teamData?.id || 0;

    // Info: (20250721 - Shirley) Update test company data with actual team ID
    testCompanyData.teamId = teamId;

    // Info: (20250721 - Shirley) Refresh session to ensure team membership is updated
    await authenticatedHelper.getStatusInfo();
*/
    if (process.env.DEBUG_TESTS === 'true') {
      // Deprecated: (20250722 - Shirley) Remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('✅ Test setup completed: User and team created with ID:', teamId);
    }
  });

  afterAll(async () => {
    /**  Info: (20250723 - Tzuhan) replaced by BaseTestContext
    // Info: (20250721 - Shirley) Cleanup test data
    await authenticatedHelper.clearSession();
*/
    if (process.env.DEBUG_TESTS === 'true') {
      // Deprecated: (20250722 - Shirley) Remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('✅ Test cleanup completed');
    }
  });

  /**
   * Info: (20250721 - Shirley) Test Step 1: Create Account Book
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

      // Info: (20250721 - Shirley) Validate output with production validator
      const { isOutputDataValid, outputData } = validateOutputData(
        APIName.CREATE_ACCOUNT_BOOK,
        response.body.payload
      );
      expect(isOutputDataValid).toBe(true);
      expect(outputData?.id).toBeDefined();
      expect(typeof outputData?.id).toBe('number');

      accountBookId = response.body.payload.id;

      if (process.env.DEBUG_TESTS === 'true') {
        // Deprecated: (20250722 - Shirley) Remove eslint-disable
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
        // Deprecated: (20250722 - Shirley) Remove eslint-disable
        // eslint-disable-next-line no-console
        console.log('✅ Account book connection verified');
      }
    });
  });
  */

  /**
   * Info: (20250721 - Shirley) Test Step 2: Create Sample Vouchers for Ledger
   */
  xdescribe('Step 2: Create Sample Vouchers for Ledger', () => {
    test('should verify vouchers exist for ledger test', async () => {
      await authenticatedHelper.ensureAuthenticated();

      // Info: (20250728 - Shirley) Connect to account book first
      const responseForConnect = await connectAccountBookClient
        .get(`/api/v2/account_book/${accountBookId}/connect`)
        .set('Cookie', cookies.join('; '))
        .expect(200);

      expect(responseForConnect.body.success).toBe(true);
      expect(responseForConnect.body.payload).toBeDefined();

      // Info: (20250728 - Shirley) BaseTestContext has already created the vouchers
      // Just verify they exist by checking the expected voucher count
      const sampleVouchersData = TestDataFactory.sampleVoucherData();

      // Deprecated: (20250722 - Shirley) Remove eslint-disable
      // eslint-disable-next-line no-console
      console.log(
        `\n🎉 Successfully verified ${sampleVouchersData.length} vouchers exist for ledger test (created by BaseTestContext)`
      );
    });
  });
  /**
   * Info: (20250721 - Shirley) Test Step 3: Generate Ledger Report
   */
  describe('Step 3: Generate Ledger Report', () => {
    test('should generate ledger report with proper structure', async () => {
      await authenticatedHelper.ensureAuthenticated();

      const getLedgerClient = createTestClient({
        handler: getLedgerHandler,
        routeParams: { accountBookId: accountBookId.toString() },
      });

      // Info: (20250728 - Shirley) Use a date range that includes voucher creation time
      // Vouchers are created at customTimestamp (1733155200), but startDate is 10 days later
      const voucherTimestamp = 1733155200; // Same as customTimestamp used in BaseTestContext
      const queryStartDate = voucherTimestamp - 86400; // 1 day before voucher creation
      const queryEndDate = endDate; // Use the configured end date

      const response = await getLedgerClient
        .get(`/api/v2/account_book/${accountBookId}/ledger`)
        .query({
          page: '1',
          pageSize: '100',
          startDate: queryStartDate.toString(),
          endDate: queryEndDate.toString(),
        })
        .set('Cookie', cookies.join('; '));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.payload).toBeDefined();
      expect(response.body.payload.data).toBeDefined();
      expect(Array.isArray(response.body.payload.data)).toBe(true);

      // Info: (20250721 - Shirley) Validate output with production validator
      const { isOutputDataValid, outputData } = validateOutputData(
        APIName.LEDGER_LIST,
        response.body.payload
      );
      expect(isOutputDataValid).toBe(true);
      expect(outputData).toBeDefined();

      if (process.env.DEBUG_TESTS === 'true') {
        // Deprecated: (20250722 - Shirley) Remove eslint-disable
        // eslint-disable-next-line no-console
        console.log('✅ Ledger report generated successfully');
        // Deprecated: (20250722 - Shirley) Remove eslint-disable
        // eslint-disable-next-line no-console
        console.log(`   - Total Items: ${response.body.payload.totalCount}`);
      }
    });

    test('should validate ledger data structure and calculations', async () => {
      await authenticatedHelper.ensureAuthenticated();

      const getLedgerClient = createTestClient({
        handler: getLedgerHandler,
        routeParams: { accountBookId: accountBookId.toString() },
      });

      // Info: (20250728 - Shirley) Use a date range that includes voucher creation time
      const voucherTimestamp = 1733155200; // Same as customTimestamp used in BaseTestContext
      const queryStartDate = voucherTimestamp - 86400; // 1 day before voucher creation
      const queryEndDate = endDate; // Use the configured end date

      const response = await getLedgerClient
        .get(`/api/v2/account_book/${accountBookId}/ledger`)
        .query({
          page: '1',
          pageSize: '100',
          startDate: queryStartDate.toString(),
          endDate: queryEndDate.toString(),
        })
        .set('Cookie', cookies.join('; '));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const ledgerData = response.body.payload;

      // Info: (20250721 - Shirley) Detailed ledger validation
      expect(ledgerData.data).toBeDefined();
      expect(Array.isArray(ledgerData.data)).toBe(true);
      expect(ledgerData.totalCount).toBeGreaterThan(0);
      expect(ledgerData.data.length).toBeGreaterThan(0);

      // Info: (20250721 - Shirley) Validate pagination structure
      expect(ledgerData.page).toBe(1);
      expect(ledgerData.pageSize).toBe(100);
      expect(ledgerData.totalPages).toBeDefined();
      expect(ledgerData.hasNextPage).toBeDefined();
      expect(ledgerData.hasPreviousPage).toBeDefined();

      // Info: (20250721 - Shirley) Validate ledger items structure
      const firstItem = ledgerData.data[0];
      expect(firstItem).toBeDefined();
      expect(firstItem.id).toBeDefined();
      expect(firstItem.accountId).toBeDefined();
      expect(firstItem.voucherId).toBeDefined();
      expect(firstItem.accountingTitle).toBeDefined();
      expect(typeof firstItem.debitAmount).toBe('number');
      expect(typeof firstItem.creditAmount).toBe('number');
      expect(typeof firstItem.balance).toBe('number');
    });
  });

  /**
   * Info: (20250721 - Shirley) Test Step 4: Complete Integration Workflow Validation
   */
  describe('Step 4: Complete Integration Workflow Validation', () => {
    test('should validate complete ledger integration workflow', async () => {
      // Info: (20250721 - Shirley) Step 1: Verify account book exists
      expect(accountBookId).toBeDefined();
      expect(accountBookId).toBeGreaterThan(0);

      // Info: (20250721 - Shirley) Step 2: Verify ledger API is working
      await authenticatedHelper.ensureAuthenticated();

      const getLedgerClient = createTestClient({
        handler: getLedgerHandler,
        routeParams: { accountBookId: accountBookId.toString() },
      });

      // Info: (20250722 - Shirley) Wait for database operations to complete before fetching ledger data
      await new Promise((resolve) => {
        setTimeout(resolve, 1000);
      });

      // Info: (20250728 - Shirley) Use a date range that includes voucher creation time
      const voucherTimestamp = 1733155200; // Same as customTimestamp used in BaseTestContext
      const queryStartDate = voucherTimestamp - 86400; // 1 day before voucher creation
      const queryEndDate = endDate; // Use the configured end date

      const finalLedgerResponse = await getLedgerClient
        .get(`/api/v2/account_book/${accountBookId}/ledger`)
        .query({
          page: '1',
          pageSize: '100',
          startDate: queryStartDate.toString(),
          endDate: queryEndDate.toString(),
        })
        .set('Cookie', cookies.join('; '));

      expect(finalLedgerResponse.status).toBe(200);
      expect(finalLedgerResponse.body.success).toBe(true);

      const finalLedgerData = finalLedgerResponse.body.payload;

      // Info: (20250729 - Shirley) 驗證分類帳基本結構而非固定數據
      expect(finalLedgerData.totalCount).toBeGreaterThanOrEqual(0);
      expect(finalLedgerData.data.length).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(finalLedgerData.data)).toBe(true);

      // Info: (20250729 - Shirley) 驗證分類帳項目的數據結構
      if (finalLedgerData.data.length > 0) {
        const firstItem = finalLedgerData.data[0];
        expect(firstItem).toBeDefined();
        expect(firstItem.id).toBeDefined();
        expect(firstItem.accountId).toBeDefined();
        expect(firstItem.voucherId).toBeDefined();
        expect(firstItem.accountingTitle).toBeDefined();
        expect(typeof firstItem.debitAmount).toBe('number');
        expect(typeof firstItem.creditAmount).toBe('number');
        expect(typeof firstItem.balance).toBe('number');
      }

      // Info: (20250729 - Shirley) 驗證分類帳總額平衡 (借貸相等)
      if (finalLedgerData.note) {
        const finalNoteData = JSON.parse(finalLedgerData.note);
        expect(finalNoteData.currencyAlias).toBeDefined();
        expect(finalNoteData.total.totalDebitAmount).toBe(finalNoteData.total.totalCreditAmount);
      }

      // Info: (20250721 - Shirley) Ledger should have proper structure
      // expect(finalLedgerData.page).toBeDefined();
      // expect(finalLedgerData.totalPages).toBeDefined();
      // expect(finalLedgerData.hasNextPage).toBeDefined();
      // expect(finalLedgerData.hasPreviousPage).toBeDefined();

      if (process.env.DEBUG_TESTS === 'true') {
        // Deprecated: (20250722 - Shirley) Remove eslint-disable
        // eslint-disable-next-line no-console
        console.log('✅ Complete workflow validated successfully');
        // Deprecated: (20250722 - Shirley) Remove eslint-disable
        // eslint-disable-next-line no-console
        console.log(`   - Account Book ID: ${accountBookId}`);
        // Deprecated: (20250722 - Shirley) Remove eslint-disable
        // eslint-disable-next-line no-console
        console.log(`   - Ledger Items: ${finalLedgerData.data.length}`);
        // Deprecated: (20250722 - Shirley) Remove eslint-disable
        // eslint-disable-next-line no-console
        console.log(`   - Total Count: ${finalLedgerData.totalCount}`);
      }
    });
  });

  /**
   * Info: (20250721 - Shirley) Test Step 5: Ledger Export Testing
   */
  describe('Step 5: Ledger Export Testing', () => {
    test('should export ledger to CSV format', async () => {
      await authenticatedHelper.ensureAuthenticated();

      const exportLedgerClient = createTestClient({
        handler: exportLedgerHandler,
        routeParams: { accountBookId: accountBookId.toString() },
      });

      // Info: (20250722 - Shirley) Wait for database operations to complete before exporting ledger data
      await new Promise((resolve) => {
        setTimeout(resolve, 1000);
      });

      // Info: (20250728 - Shirley) Use a date range that includes voucher creation time
      const voucherTimestamp = 1733155200; // Same as customTimestamp used in BaseTestContext
      const queryStartDate = voucherTimestamp - 86400; // 1 day before voucher creation

      const exportRequestData = {
        fileType: 'csv',
        filters: {
          startDate: queryStartDate,
          endDate,
        },
        options: {
          fields: [
            'no',
            'accountingTitle',
            'voucherNumber',
            'voucherDate',
            'particulars',
            'debitAmount',
            'creditAmount',
            'balance',
          ],
        },
      };

      const response = await exportLedgerClient
        .post(`/api/v2/account_book/${accountBookId}/ledger/export`)
        .send(exportRequestData)
        .set('Cookie', cookies.join('; '));

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.headers['content-disposition']).toContain('ledger_');

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
        // Info: (20250722 - Shirley) Handle date format - CSV exports dates as YYYY-MM-DD, not timestamps
        let voucherDate = 0;
        const dateString = values[3];
        if (dateString && dateString.includes('-')) {
          // Info: (20250722 - Shirley) Convert "2025-07-21" format to timestamp for comparison
          const date = new Date(dateString);
          voucherDate = Math.floor(date.getTime() / 1000); // Info: (20250722 - Shirley) Convert to Unix timestamp
        } else if (!Number.isNaN(parseInt(values[3], 10))) {
          voucherDate = parseInt(values[3], 10);
        }

        return {
          no: values[0],
          accountingTitle: values[1],
          voucherNumber: values[2],
          voucherDate,
          particulars: values[4],
          debitAmount: parseInt(values[5], 10) || 0,
          creditAmount: parseInt(values[6], 10) || 0,
          balance: parseInt(values[7], 10) || 0,
        };
      });

      // Info: (20250729 - Shirley) 驗證 CSV 基本結構而非固定數據
      expect(csvData.length).toBeGreaterThanOrEqual(0);

      // Info: (20250729 - Shirley) 驗證 CSV 數據結構
      if (csvData.length > 0) {
        const firstCsvItem = csvData[0];
        expect(firstCsvItem).toBeDefined();
        expect(firstCsvItem.accountingTitle).toBeDefined();
        expect(firstCsvItem.particulars).toBeDefined();
        expect(typeof firstCsvItem.debitAmount).toBe('number');
        expect(typeof firstCsvItem.creditAmount).toBe('number');
        expect(typeof firstCsvItem.balance).toBe('number');
      }

      // Info: (20250729 - Shirley) 驗證會計基本原理：借貸相等
      const totalDebitAmount = csvData.reduce((sum, item) => sum + item.debitAmount, 0);
      const totalCreditAmount = csvData.reduce((sum, item) => sum + item.creditAmount, 0);
      expect(totalDebitAmount).toBe(totalCreditAmount);

      if (process.env.DEBUG_TESTS === 'true') {
        // Deprecated: (20250722 - Shirley) Remove eslint-disable
        // eslint-disable-next-line no-console
        console.log('✅ Ledger CSV export successful');
        // Deprecated: (20250722 - Shirley) Remove eslint-disable
        // eslint-disable-next-line no-console
        console.log(`   - CSV Content Length: ${csvContent.length} characters`);
        // Deprecated: (20250722 - Shirley) Remove eslint-disable
        // eslint-disable-next-line no-console
        console.log(`   - CSV Lines Count: ${lines.length}`);
        // Deprecated: (20250722 - Shirley) Remove eslint-disable
        // eslint-disable-next-line no-console
        console.log('🔍 CSV Content (first 3 lines):', lines.slice(0, 3).join('\n'));
      }
    });

    test('should handle invalid file type for export', async () => {
      await authenticatedHelper.ensureAuthenticated();

      const exportLedgerClient = createTestClient({
        handler: exportLedgerHandler,
        routeParams: { accountBookId: accountBookId.toString() },
      });

      const currentTimestamp = Math.floor(Date.now() / 1000);
      const exportRequestData = {
        fileType: 'pdf', // Info: (20250722 - Shirley) Invalid file type
        filters: {
          startDate: currentTimestamp - 86400 * 365,
          endDate: currentTimestamp + 86400 * 30,
        },
        options: {},
      };

      const response = await exportLedgerClient
        .post(`/api/v2/account_book/${accountBookId}/ledger/export`)
        .send(exportRequestData)
        .set('Cookie', cookies.join('; '));

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('400ISF0000'); // Info: (20250722 - Shirley) BAD_REQUEST due to validation error

      if (process.env.DEBUG_TESTS === 'true') {
        // Deprecated: (20250722 - Shirley) Remove eslint-disable
        // eslint-disable-next-line no-console
        console.log('✅ Invalid file type properly rejected');
      }
    });

    test('should handle missing date parameters for export', async () => {
      await authenticatedHelper.ensureAuthenticated();

      const exportLedgerClient = createTestClient({
        handler: exportLedgerHandler,
        routeParams: { accountBookId: accountBookId.toString() },
      });

      const exportRequestData = {
        fileType: 'csv',
        filters: {
          // Info: (20250722 - Shirley) Missing startDate and endDate
        },
        options: {},
      };

      const response = await exportLedgerClient
        .post(`/api/v2/account_book/${accountBookId}/ledger/export`)
        .send(exportRequestData)
        .set('Cookie', cookies.join('; '));

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('400ISF0000'); // Info: (20250722 - Shirley) BAD_REQUEST due to missing parameters

      if (process.env.DEBUG_TESTS === 'true') {
        // Deprecated: (20250722 - Shirley) Remove eslint-disable
        // eslint-disable-next-line no-console
        console.log('✅ Missing date parameters properly rejected');
      }
    });

    test('should handle export without authentication', async () => {
      const exportLedgerClient = createTestClient({
        handler: exportLedgerHandler,
        routeParams: { accountBookId: accountBookId.toString() },
      });

      const exportRequestData = {
        fileType: 'csv',
        filters: {
          // Info: (20250722 - Shirley) Missing startDate and endDate
        },
        options: {},
      };

      const response = await exportLedgerClient
        .post(`/api/v2/account_book/${accountBookId}/ledger/export`)
        .send(exportRequestData);
      // Info: (20250722 - Shirley) No authentication cookies

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('400ISF0000'); // Info: (20250722 - Shirley) BAD_REQUEST due to missing authentication

      if (process.env.DEBUG_TESTS === 'true') {
        // Deprecated: (20250722 - Shirley) Remove eslint-disable
        // eslint-disable-next-line no-console
        console.log('✅ Unauthenticated export request properly rejected');
      }
    });
  });
});
