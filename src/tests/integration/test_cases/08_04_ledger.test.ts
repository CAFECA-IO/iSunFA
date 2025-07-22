import { APITestHelper } from '@/tests/integration/setup/api_helper';
import { createTestClient } from '@/tests/integration/setup/test_client';

// Info: (20250721 - Shirley) Import API handlers for ledger integration testing
import createAccountBookHandler from '@/pages/api/v2/user/[userId]/account_book';
import getAccountBookHandler from '@/pages/api/v2/account_book/[accountBookId]';
import connectAccountBookHandler from '@/pages/api/v2/account_book/[accountBookId]/connect';
import getLedgerHandler from '@/pages/api/v2/account_book/[accountBookId]/ledger';
import exportLedgerHandler from '@/pages/api/v2/account_book/[accountBookId]/ledger/export';
import voucherPostHandler from '@/pages/api/v2/account_book/[accountBookId]/voucher';

// Info: (20250721 - Shirley) Import required types and constants
import { WORK_TAG } from '@/interfaces/account_book';
import { LocaleKey } from '@/constants/normal_setting';
import { CurrencyType } from '@/constants/currency';
import { validateOutputData } from '@/lib/utils/validator';
import { APIName } from '@/constants/api_connection';
import { ILedgerItem } from '@/interfaces/ledger';
import { TestDataFactory } from '@/tests/integration/setup/test_data_factory';

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

  beforeAll(async () => {
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

    if (process.env.DEBUG_TESTS === 'true') {
      // Deprecated: (20250722 - Shirley) Remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('✅ Test setup completed: User and team created with ID:', teamId);
    }
  });

  afterAll(async () => {
    // Info: (20250721 - Shirley) Cleanup test data
    await authenticatedHelper.clearSession();

    if (process.env.DEBUG_TESTS === 'true') {
      // Deprecated: (20250722 - Shirley) Remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('✅ Test cleanup completed');
    }
  });

  /**
   * Info: (20250721 - Shirley) Test Step 1: Create Account Book
   */
  describe('Step 1: Account Book Creation', () => {
    test('should create account book with proper structure', async () => {
      const createAccountBookClient = createTestClient({
        handler: createAccountBookHandler,
        routeParams: { userId: currentUserId },
      });

      await authenticatedHelper.ensureAuthenticated();
      const cookies = authenticatedHelper.getCurrentSession();

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
      const cookies = authenticatedHelper.getCurrentSession();

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

  /**
   * Info: (20250721 - Shirley) Test Step 2: Create Sample Vouchers for Ledger
   */
  describe('Step 2: Create Sample Vouchers for Ledger', () => {
    test('should create vouchers and verify ledger data', async () => {
      await authenticatedHelper.ensureAuthenticated();
      const cookies = authenticatedHelper.getCurrentSession();

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

      // Info: (20250721 - Shirley) Create all sample vouchers with dates in test range
      const testDateBase = 1753050000; // Within test date range
      for (let i = 0; i < sampleVouchersData.length; i += 1) {
        const voucherData = sampleVouchersData[i];

        const voucherPayload = {
          actions: [],
          certificateIds: [],
          invoiceRC2Ids: [],
          voucherDate: testDateBase + i * 3600, // Use test date range with incremental hours
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
          // Deprecated: (20250722 - Shirley) Remove eslint-disable
          // eslint-disable-next-line no-console
          console.log('✅ Voucher created successfully with ID:', response.body.payload.id);
        } else {
          // Deprecated: (20250722 - Shirley) Remove eslint-disable
          // eslint-disable-next-line no-console
          console.log('❌ Voucher creation failed:', response.body.message);
        }
      }

      // Info: (20250721 - Shirley) Verify all vouchers were created
      expect(createdVouchers.length).toBe(sampleVouchersData.length);

      // Deprecated: (20250722 - Shirley) Remove eslint-disable
      // eslint-disable-next-line no-console
      console.log(`\n🎉 Successfully created ${createdVouchers.length} vouchers for ledger test`);
    });
  });

  /**
   * Info: (20250721 - Shirley) Test Step 3: Generate Ledger Report
   */
  describe('Step 3: Generate Ledger Report', () => {
    test('should generate ledger report with proper structure', async () => {
      await authenticatedHelper.ensureAuthenticated();
      const cookies = authenticatedHelper.getCurrentSession();

      const getLedgerClient = createTestClient({
        handler: getLedgerHandler,
        routeParams: { accountBookId: accountBookId.toString() },
      });

      const startDate = 1753027200;
      const endDate = 1753113599;

      const response = await getLedgerClient
        .get(`/api/v2/account_book/${accountBookId}/ledger`)
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
      const cookies = authenticatedHelper.getCurrentSession();

      const getLedgerClient = createTestClient({
        handler: getLedgerHandler,
        routeParams: { accountBookId: accountBookId.toString() },
      });

      const startDate = 1753027200;
      const endDate = 1753113599;

      const response = await getLedgerClient
        .get(`/api/v2/account_book/${accountBookId}/ledger`)
        .query({
          page: '1',
          pageSize: '100',
          startDate: startDate.toString(),
          endDate: endDate.toString(),
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
      const cookies = authenticatedHelper.getCurrentSession();

      const getLedgerClient = createTestClient({
        handler: getLedgerHandler,
        routeParams: { accountBookId: accountBookId.toString() },
      });

      const startDate = 1753027200;
      const endDate = 1753113599;

      // Info: (20250722 - Shirley) Wait for database operations to complete before fetching ledger data
      await new Promise((resolve) => {
        setTimeout(resolve, 1000);
      });

      const finalLedgerResponse = await getLedgerClient
        .get(`/api/v2/account_book/${accountBookId}/ledger`)
        .query({
          page: '1',
          pageSize: '100',
          startDate: startDate.toString(),
          endDate: endDate.toString(),
        })
        .set('Cookie', cookies.join('; '));

      expect(finalLedgerResponse.status).toBe(200);
      expect(finalLedgerResponse.body.success).toBe(true);

      const finalLedgerData = finalLedgerResponse.body.payload;

      // Info: (20250721 - Shirley) Get expected ledger data from TestDataFactory for exact value validation
      const expectedLedgerData = TestDataFactory.expectedLedgerData();

      // Deprecated: (20250722 - Shirley) Remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('step5, finalLedgerData:', finalLedgerData);
      // eslint-disable-next-line no-console
      console.log('step5, expectedLedgerData:', expectedLedgerData);

      // Info: (20250722 - Shirley) Debug - temporarily log actual data to update expected data
      if (process.env.DEBUG_TESTS === 'true') {
        // Deprecated: (20250722 - Shirley) Remove eslint-disable
        // eslint-disable-next-line no-console
        console.log('🔍 Actual ledger data:', JSON.stringify(finalLedgerData, null, 2));
        // Deprecated: (20250722 - Shirley) Remove eslint-disable
        // eslint-disable-next-line no-console
        console.log('🔍 Expected ledger data:', JSON.stringify(expectedLedgerData, null, 2));
      }

      // Info: (20250721 - Shirley) Validate payload structure matches exactly with expected data
      expect(finalLedgerData.totalCount).toBe(expectedLedgerData.payload.totalCount);
      expect(finalLedgerData.data.length).toBe(expectedLedgerData.payload.data.length);
      expect(finalLedgerData.page).toBe(expectedLedgerData.payload.page);
      expect(finalLedgerData.totalPages).toBe(expectedLedgerData.payload.totalPages);
      expect(finalLedgerData.pageSize).toBe(expectedLedgerData.payload.pageSize);
      expect(finalLedgerData.hasNextPage).toBe(expectedLedgerData.payload.hasNextPage);
      expect(finalLedgerData.hasPreviousPage).toBe(expectedLedgerData.payload.hasPreviousPage);
      expect(finalLedgerData.sort).toEqual(expectedLedgerData.payload.sort);
      expect(finalLedgerData.note).toBe(expectedLedgerData.payload.note);

      // Info: (20250721 - Shirley) Validate each ledger item matches expected data (flexible matching by account and core business data)
      expectedLedgerData.payload.data.forEach((expectedItem: ILedgerItem) => {
        const actualItem = finalLedgerData.data.find(
          (item: ILedgerItem) =>
            item.accountId === expectedItem.accountId &&
            item.no === expectedItem.no &&
            item.accountingTitle === expectedItem.accountingTitle &&
            item.particulars === expectedItem.particulars &&
            item.debitAmount === expectedItem.debitAmount &&
            item.creditAmount === expectedItem.creditAmount
        );

        expect(actualItem).toBeDefined();
        if (actualItem) {
          // Info: (20250722 - Shirley) Check core business logic fields (ignore auto-generated IDs and timestamps)
          expect(actualItem.accountId).toBe(expectedItem.accountId);
          expect(actualItem.voucherDate).toBe(expectedItem.voucherDate);
          expect(actualItem.no).toBe(expectedItem.no);
          expect(actualItem.accountingTitle).toBe(expectedItem.accountingTitle);
          expect(actualItem.voucherNumber).toBe(expectedItem.voucherNumber);
          expect(actualItem.voucherType).toBe(expectedItem.voucherType);
          expect(actualItem.particulars).toBe(expectedItem.particulars);
          expect(actualItem.debitAmount).toBe(expectedItem.debitAmount);
          expect(actualItem.creditAmount).toBe(expectedItem.creditAmount);
          expect(actualItem.balance).toBe(expectedItem.balance);
          // Info: (20250722 - Shirley) IDs and timestamps are auto-generated, so we just check they exist
          expect(actualItem.id).toBeDefined();
          expect(actualItem.voucherId).toBeDefined();
          expect(actualItem.createdAt).toBeDefined();
          expect(actualItem.updatedAt).toBeDefined();
        }
      });

      // Info: (20250721 - Shirley) Ledger should have proper structure
      expect(finalLedgerData.page).toBeDefined();
      expect(finalLedgerData.totalPages).toBeDefined();
      expect(finalLedgerData.hasNextPage).toBeDefined();
      expect(finalLedgerData.hasPreviousPage).toBeDefined();

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
      const cookies = authenticatedHelper.getCurrentSession();

      const exportLedgerClient = createTestClient({
        handler: exportLedgerHandler,
        routeParams: { accountBookId: accountBookId.toString() },
      });

      const startDate = 1753027200;
      const endDate = 1753113599;

      // Info: (20250722 - Shirley) Wait for database operations to complete before exporting ledger data
      await new Promise((resolve) => {
        setTimeout(resolve, 1000);
      });

      const exportRequestData = {
        fileType: 'csv',
        filters: {
          startDate,
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
          voucherDate = Math.floor(date.getTime() / 1000); // Convert to Unix timestamp
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

      // Info: (20250721 - Shirley) Get expected data from TestDataFactory for exact value comparison
      const expectedData = TestDataFactory.expectedLedgerData();

      // Info: (20250721 - Shirley) Compare CSV data length with expected data
      expect(csvData.length).toBe(expectedData.payload.data.length);
      expect(csvData.length).toBe(lines.length - 1); // Should match actual data minus header

      // Deprecated: (20250722 - Shirley) Remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('step5, csvData:', csvData);
      // eslint-disable-next-line no-console
      console.log('step5,expectedData:', expectedData.payload.data);

      // Info: (20250721 - Shirley) Validate each CSV row matches expected ledger data (flexible matching by core business data)
      expectedData.payload.data.forEach((expectedItem) => {
        const csvItem = csvData.find(
          (item) =>
            item.no === expectedItem.no &&
            item.accountingTitle === expectedItem.accountingTitle &&
            item.particulars === expectedItem.particulars &&
            item.debitAmount === expectedItem.debitAmount &&
            item.creditAmount === expectedItem.creditAmount
        );
        expect(csvItem).toBeDefined();

        if (csvItem) {
          expect(csvItem.no).toBe(expectedItem.no);
          expect(csvItem.accountingTitle).toBe(expectedItem.accountingTitle);
          expect(csvItem.voucherNumber).toBe(expectedItem.voucherNumber);
          // Info: (20250722 - Shirley) Skip exact voucher date validation as CSV uses formatted date (YYYY-MM-DD) vs timestamp
          expect(csvItem.voucherDate).toBeDefined();
          expect(csvItem.particulars).toBe(expectedItem.particulars);
          expect(csvItem.debitAmount).toBe(expectedItem.debitAmount);
          expect(csvItem.creditAmount).toBe(expectedItem.creditAmount);
          expect(csvItem.balance).toBe(expectedItem.balance);
        }
      });

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
      const cookies = authenticatedHelper.getCurrentSession();

      const exportLedgerClient = createTestClient({
        handler: exportLedgerHandler,
        routeParams: { accountBookId: accountBookId.toString() },
      });

      const exportRequestData = {
        fileType: 'pdf', // Invalid file type
        filters: {
          startDate: 1753027200,
          endDate: 1753113599,
        },
        options: {},
      };

      const response = await exportLedgerClient
        .post(`/api/v2/account_book/${accountBookId}/ledger/export`)
        .send(exportRequestData)
        .set('Cookie', cookies.join('; '));

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('400ISF0000'); // BAD_REQUEST due to validation error

      if (process.env.DEBUG_TESTS === 'true') {
        // Deprecated: (20250722 - Shirley) Remove eslint-disable
        // eslint-disable-next-line no-console
        console.log('✅ Invalid file type properly rejected');
      }
    });

    test('should handle missing date parameters for export', async () => {
      await authenticatedHelper.ensureAuthenticated();
      const cookies = authenticatedHelper.getCurrentSession();

      const exportLedgerClient = createTestClient({
        handler: exportLedgerHandler,
        routeParams: { accountBookId: accountBookId.toString() },
      });

      const exportRequestData = {
        fileType: 'csv',
        filters: {
          // Missing startDate and endDate
        },
        options: {},
      };

      const response = await exportLedgerClient
        .post(`/api/v2/account_book/${accountBookId}/ledger/export`)
        .send(exportRequestData)
        .set('Cookie', cookies.join('; '));

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('400ISF0000'); // BAD_REQUEST due to missing parameters

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
          // Missing startDate and endDate
        },
        options: {},
      };

      const response = await exportLedgerClient
        .post(`/api/v2/account_book/${accountBookId}/ledger/export`)
        .send(exportRequestData);
      // No authentication cookies

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('400ISF0000'); // BAD_REQUEST due to missing authentication

      if (process.env.DEBUG_TESTS === 'true') {
        // Deprecated: (20250722 - Shirley) Remove eslint-disable
        // eslint-disable-next-line no-console
        console.log('✅ Unauthenticated export request properly rejected');
      }
    });
  });
});
