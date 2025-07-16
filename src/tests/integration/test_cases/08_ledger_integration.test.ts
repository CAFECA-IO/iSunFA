import { APITestHelper } from '@/tests/integration/setup/api_helper';
import { createTestClient } from '@/tests/integration/setup/test_client';

// Info: (20250715 - Shirley) Import API handlers for ledger integration testing
import createAccountBookHandler from '@/pages/api/v2/user/[userId]/account_book';
import connectAccountBookHandler from '@/pages/api/v2/account_book/[accountBookId]/connect';
import getAccountBookHandler from '@/pages/api/v2/account_book/[accountBookId]';
import getLedgerHandler from '@/pages/api/v2/account_book/[accountBookId]/ledger';
import exportLedgerHandler from '@/pages/api/v2/account_book/[accountBookId]/ledger/export';
import voucherPostHandler from '@/pages/api/v2/account_book/[accountBookId]/voucher';

// Info: (20250715 - Shirley) Import required types and constants
import { WORK_TAG } from '@/interfaces/account_book';
import { LocaleKey } from '@/constants/normal_setting';
import { CurrencyType } from '@/constants/currency';
import { validateOutputData } from '@/lib/utils/validator';
import { APIName } from '@/constants/api_connection';
import { EventType } from '@/constants/account';

// Info: (20250715 - Shirley) Mock pusher for testing
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
 * Info: (20250715 - Shirley) Integration Test - Ledger Integration (Test Case 8)
 *
 * Primary Purpose:
 * - Test ledger API functionality and data structure
 * - Verify ledger filtering, pagination, and export functionality
 * - Ensure proper API response validation
 * - Test empty and populated ledger scenarios
 *
 * Test Flow:
 * 1. User Authentication and Account Book Setup
 * 2. Ledger API Testing (empty ledger scenario)
 * 3. Ledger Filtering and Export Testing
 */
describe('Integration Test - Ledger Integration (Test Case 8)', () => {
  let authenticatedHelper: APITestHelper;
  let currentUserId: string;
  let teamId: number;
  let accountBookId: number;

  const randomNumber = Math.floor(Math.random() * 90000000) + 10000000;

  // Info: (20250715 - Shirley) Test company data
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
    // Info: (20250715 - Shirley) Setup authenticated helper and complete user registration
    authenticatedHelper = await APITestHelper.createHelper({ autoAuth: true });

    const statusResponse = await authenticatedHelper.getStatusInfo();
    const userData = statusResponse.body.payload?.user as { id?: number };
    currentUserId = userData?.id?.toString() || '1';

    // Info: (20250715 - Shirley) Complete user registration flow
    await authenticatedHelper.agreeToTerms();
    await authenticatedHelper.createUserRole();
    await authenticatedHelper.selectUserRole();

    // Info: (20250715 - Shirley) Create team for account book operations
    const teamResponse = await authenticatedHelper.createTeam();
    const teamData = teamResponse.body.payload?.team as { id?: number };
    teamId = teamData?.id || 0;

    testCompanyData.teamId = teamId;

    if (process.env.DEBUG_TESTS === 'true') {
      // eslint-disable-next-line no-console
      console.log('✅ Test setup completed: User and team created');
    }
  });

  afterAll(async () => {
    // Info: (20250715 - Shirley) Cleanup test data
    await authenticatedHelper.clearSession();

    if (process.env.DEBUG_TESTS === 'true') {
      // eslint-disable-next-line no-console
      console.log('✅ Test cleanup completed');
    }
  });

  /**
   * Info: (20250715 - Shirley) Test Step 1: Create Account Book
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

      // Info: (20250715 - Shirley) Validate output with production validator
      const { isOutputDataValid, outputData } = validateOutputData(
        APIName.CREATE_ACCOUNT_BOOK,
        response.body.payload
      );
      expect(isOutputDataValid).toBe(true);
      expect(outputData?.id).toBeDefined();
      expect(typeof outputData?.id).toBe('number');

      accountBookId = response.body.payload.id;

      if (process.env.DEBUG_TESTS === 'true') {
        // eslint-disable-next-line no-console
        console.log('✅ Account book created successfully with ID:', accountBookId);
      }
    });

    test('should verify account book connection', async () => {
      const connectAccountBookClient = createTestClient({
        handler: getAccountBookHandler,
        routeParams: { accountBookId: accountBookId.toString() },
      });

      await authenticatedHelper.ensureAuthenticated();
      const cookies = authenticatedHelper.getCurrentSession();

      const response = await connectAccountBookClient
        .get(`/api/v2/account_book/${accountBookId}`)
        .set('Cookie', cookies.join('; '))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.payload.id).toBe(accountBookId);
      expect(response.body.payload.name).toBe(testCompanyData.name);

      if (process.env.DEBUG_TESTS === 'true') {
        // eslint-disable-next-line no-console
        console.log('✅ Account book connection verified');
      }
    });
  });

  /**
   * Info: (20250715 - Shirley) Test Step 2: Ledger API Testing
   */
  describe('Step 2: Ledger API Testing', () => {
    test('should generate ledger with proper structure (empty data)', async () => {
      const getLedgerClient = createTestClient({
        handler: getLedgerHandler,
        routeParams: { accountBookId: accountBookId.toString() },
      });

      await authenticatedHelper.ensureAuthenticated();
      const cookies = authenticatedHelper.getCurrentSession();

      const startDate = Math.floor(Date.now() / 1000) - 86400 * 7; // 7 days ago
      const endDate = Math.floor(Date.now() / 1000) + 86400 * 7; // 7 days from now

      const response = await getLedgerClient
        .get(`/api/v2/account_book/${accountBookId}/ledger`)
        .query({
          startDate: startDate.toString(),
          endDate: endDate.toString(),
          page: '1',
          pageSize: '50',
        })
        .set('Cookie', cookies.join('; '))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.payload).toBeDefined();
      expect(response.body.payload.data).toBeDefined();
      expect(Array.isArray(response.body.payload.data)).toBe(true);

      // Info: (20250715 - Shirley) Validate ledger structure
      const { isOutputDataValid, outputData } = validateOutputData(
        APIName.LEDGER_LIST,
        response.body.payload
      );
      expect(isOutputDataValid).toBe(true);
      expect(outputData?.data).toBeDefined();
      expect(outputData?.totalCount).toBe(0); // Empty ledger is expected

      if (process.env.DEBUG_TESTS === 'true') {
        // eslint-disable-next-line no-console
        console.log('✅ Ledger generated successfully with', outputData?.totalCount, 'items');
      }
    });

    test('should handle ledger filtering by label type', async () => {
      const getLedgerClient = createTestClient({
        handler: getLedgerHandler,
        routeParams: { accountBookId: accountBookId.toString() },
      });

      await authenticatedHelper.ensureAuthenticated();
      const cookies = authenticatedHelper.getCurrentSession();

      const startDate = Math.floor(Date.now() / 1000) - 86400 * 7;
      const endDate = Math.floor(Date.now() / 1000) + 86400 * 7;

      // Info: (20250715 - Shirley) Test general label type filtering
      const generalResponse = await getLedgerClient
        .get(`/api/v2/account_book/${accountBookId}/ledger`)
        .query({
          startDate: startDate.toString(),
          endDate: endDate.toString(),
          labelType: 'general',
          page: '1',
          pageSize: '50',
        })
        .set('Cookie', cookies.join('; '))
        .expect(200);

      expect(generalResponse.body.success).toBe(true);
      expect(generalResponse.body.payload.data).toBeDefined();
      expect(Array.isArray(generalResponse.body.payload.data)).toBe(true);

      if (process.env.DEBUG_TESTS === 'true') {
        // eslint-disable-next-line no-console
        console.log('✅ Label type filtering verified');
      }
    });

    test('should handle ledger pagination', async () => {
      const getLedgerClient = createTestClient({
        handler: getLedgerHandler,
        routeParams: { accountBookId: accountBookId.toString() },
      });

      await authenticatedHelper.ensureAuthenticated();
      const cookies = authenticatedHelper.getCurrentSession();

      const startDate = Math.floor(Date.now() / 1000) - 86400 * 7;
      const endDate = Math.floor(Date.now() / 1000) + 86400 * 7;

      const response = await getLedgerClient
        .get(`/api/v2/account_book/${accountBookId}/ledger`)
        .query({
          startDate: startDate.toString(),
          endDate: endDate.toString(),
          page: '1',
          pageSize: '10',
        })
        .set('Cookie', cookies.join('; '))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.payload.page).toBe(1);
      expect(response.body.payload.pageSize).toBe(10);
      expect(response.body.payload.totalPages).toBeDefined();
      expect(response.body.payload.hasNextPage).toBeDefined();
      expect(response.body.payload.hasPreviousPage).toBeDefined();

      if (process.env.DEBUG_TESTS === 'true') {
        // eslint-disable-next-line no-console
        console.log('✅ Ledger pagination verified');
      }
    });
  });

  /**
   * Info: (20250715 - Shirley) Test Step 3: Ledger Export
   */
  describe('Step 3: Ledger Export', () => {
    test('should export ledger to CSV', async () => {
      const exportLedgerClient = createTestClient({
        handler: exportLedgerHandler,
        routeParams: { accountBookId: accountBookId.toString() },
      });

      await authenticatedHelper.ensureAuthenticated();
      const cookies = authenticatedHelper.getCurrentSession();

      const startDate = Math.floor(Date.now() / 1000) - 86400 * 7;
      const endDate = Math.floor(Date.now() / 1000) + 86400 * 7;

      const exportData = {
        fileType: 'csv',
        filters: {
          startDate,
          endDate,
          labelType: 'all',
        },
        options: {
          timezone: '+0800',
        },
      };

      const response = await exportLedgerClient
        .post(`/api/v2/account_book/${accountBookId}/ledger/export`)
        .send(exportData)
        .set('Cookie', cookies.join('; '))
        .expect(200);

      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.text).toContain('科目代碼'); // Chinese headers
      expect(response.text).toContain('會計科目');
      expect(response.text).toContain('傳票編號');

      // eslint-disable-next-line no-console
      console.log('response.text', response.text);

      if (process.env.DEBUG_TESTS === 'true') {
        // eslint-disable-next-line no-console
        console.log('✅ Ledger export to CSV verified');
      }
    });
  });

  /**
   * Info: (20250715 - Shirley) Test Step 4: Complete Integration Workflow
   */
  describe('Step 4: Complete Integration Workflow Validation', () => {
    test('should validate complete ledger integration workflow', async () => {
      // Info: (20250715 - Shirley) Step 1: Verify account book exists
      expect(accountBookId).toBeDefined();
      expect(accountBookId).toBeGreaterThan(0);

      // Info: (20250715 - Shirley) Step 2: Verify ledger API is working
      const getLedgerClient = createTestClient({
        handler: getLedgerHandler,
        routeParams: { accountBookId: accountBookId.toString() },
      });

      await authenticatedHelper.ensureAuthenticated();
      const cookies = authenticatedHelper.getCurrentSession();

      const startDate = Math.floor(Date.now() / 1000) - 86400 * 7;
      const endDate = Math.floor(Date.now() / 1000) + 86400 * 7;

      const finalLedgerResponse = await getLedgerClient
        .get(`/api/v2/account_book/${accountBookId}/ledger`)
        .query({
          startDate: startDate.toString(),
          endDate: endDate.toString(),
          page: '1',
          pageSize: '100',
        })
        .set('Cookie', cookies.join('; '))
        .expect(200);

      expect(finalLedgerResponse.body.success).toBe(true);
      const finalLedgerItems = finalLedgerResponse.body.payload.data;

      // Info: (20250715 - Shirley) Empty ledger is expected for this test
      expect(finalLedgerItems.length).toBe(0);

      if (process.env.DEBUG_TESTS === 'true') {
        // eslint-disable-next-line no-console
        console.log('✅ Complete workflow validated successfully');
        // eslint-disable-next-line no-console
        console.log(`   - Account Book ID: ${accountBookId}`);
        // eslint-disable-next-line no-console
        console.log(`   - Ledger Items: ${finalLedgerItems.length}`);
        // eslint-disable-next-line no-console
        console.log(`   - Total Count: ${finalLedgerResponse.body.payload.totalCount}`);
      }
    });

    test('should create voucher successfully via voucherPost', async () => {
      await authenticatedHelper.ensureAuthenticated();
      const cookies = authenticatedHelper.getCurrentSession();

      const connectAccountBookClient = createTestClient({
        handler: connectAccountBookHandler,
        routeParams: { accountBookId: accountBookId.toString() },
      });

      await authenticatedHelper.ensureAuthenticated();

      const responseForConnect = await connectAccountBookClient
        .get(`/api/v2/account_book/${accountBookId}/connect`)
        .set('Cookie', cookies.join('; '))
        .expect(200);

      // eslint-disable-next-line no-console
      console.log('responseForConnect', responseForConnect.body);

      expect(responseForConnect.body.success).toBe(true);
      expect(responseForConnect.body.payload).toBeDefined();

      const voucherPostClient = createTestClient({
        handler: voucherPostHandler,
        routeParams: { accountBookId: accountBookId.toString() },
      });

      const currentTimestamp = Math.floor(Date.now() / 1000);

      // Info: (20250715 - Shirley) Test voucher data structure
      const testVoucherData = {
        actions: [],
        // actions: [VoucherV2Action.ADD_ASSET],
        certificateIds: [],
        invoiceRC2Ids: [],
        voucherDate: currentTimestamp,
        type: EventType.INCOME,
        note: 'Test voucher for ledger integration',
        lineItems: [
          {
            description: 'Test income item',
            debit: true,
            amount: 1000,
            accountId: 1256, // Info: (20250715 - Shirley) Cash and Cash Equivalents (現金及約當現金)
          },
          {
            description: 'Test revenue item',
            debit: false,
            amount: 1000,
            accountId: 1001, // Info: (20250715 - Shirley) Operating Revenue (營業收入)
          },
        ],
        assetIds: [],
        counterPartyId: null,
      };

      const response = await voucherPostClient
        .post(`/api/v2/account_book/${accountBookId}/voucher`)
        .send(testVoucherData)
        .set('Cookie', cookies.join('; '));

      // Info: (20250715 - Shirley) Debug the response
      // eslint-disable-next-line no-console
      console.log('Response status:', response.status);
      // eslint-disable-next-line no-console
      console.log('Response body:', response.body);

      expect(response.status).toBe(201);

      expect(response.body.success).toBe(true);
      expect(response.body.payload).toBeDefined();
      expect(response.body.payload.id).toBeDefined();
      expect(typeof response.body.payload.id).toBe('number');

      // Info: (20250715 - Shirley) Validate output with production validator
      const { isOutputDataValid, outputData } = validateOutputData(
        APIName.VOUCHER_POST_V2,
        response.body.payload
      );
      expect(isOutputDataValid).toBe(true);
      expect(outputData).toBeDefined();

      // eslint-disable-next-line no-console
      console.log('outputDataForVoucherPost', outputData);

      if (process.env.DEBUG_TESTS === 'true') {
        // eslint-disable-next-line no-console
        console.log('✅ Voucher created successfully with ID:', response.body.payload.id);
      }

      // Info: (20250716 - Shirley) Verify ledger after voucher creation
      const getLedgerClient = createTestClient({
        handler: getLedgerHandler,
        routeParams: { accountBookId: accountBookId.toString() },
      });

      const startDate = Math.floor(Date.now() / 1000) - 86400 * 7;
      const endDate = Math.floor(Date.now() / 1000) + 86400 * 7;

      const ledgerResponse = await getLedgerClient
        .get(`/api/v2/account_book/${accountBookId}/ledger`)
        .query({
          startDate: startDate.toString(),
          endDate: endDate.toString(),
          page: '1',
          pageSize: '50',
        })
        .set('Cookie', cookies.join('; '))
        .expect(200);

      // eslint-disable-next-line no-console
      console.log('=== LEDGER AFTER INCOME VOUCHER POST ===');
      // eslint-disable-next-line no-console
      console.log('Ledger Success:', ledgerResponse.body.success);
      // eslint-disable-next-line no-console
      console.log('Ledger Total Count:', ledgerResponse.body.payload.totalCount);
      // eslint-disable-next-line no-console
      console.log('Ledger Items Count:', ledgerResponse.body.payload.data.length);
      // eslint-disable-next-line no-console
      console.log('Ledger Items:', JSON.stringify(ledgerResponse.body.payload.data, null, 2));
      // eslint-disable-next-line no-console
      console.log('=== END LEDGER VERIFICATION ===');

      expect(ledgerResponse.body.success).toBe(true);
      expect(ledgerResponse.body.payload.totalCount).toBeGreaterThan(0);
      expect(ledgerResponse.body.payload.data.length).toBeGreaterThan(0);
    });

    test('should create payment voucher based on screenshot requirements', async () => {
      const voucherPostClient = createTestClient({
        handler: voucherPostHandler,
        routeParams: { accountBookId: accountBookId.toString() },
      });

      await authenticatedHelper.ensureAuthenticated();
      const cookies = authenticatedHelper.getCurrentSession();

      // Info: (20250716 - Shirley) Payment voucher data based on screenshot
      const paymentVoucherData = {
        actions: [],
        certificateIds: [],
        invoiceRC2Ids: [],
        voucherDate: 1751299200, // Info: (20250716 - Shirley) Date from screenshot
        type: 'payment',
        note: '{"note":""}',
        lineItems: [
          {
            accountId: 1601,
            amount: 12,
            debit: true,
            description: '',
          },
          {
            accountId: 1601,
            amount: 12,
            debit: false,
            description: '',
          },
        ],
        reverseVouchers: [],
        assetIds: [],
        counterPartyId: null,
      };

      const response = await voucherPostClient
        .post(`/api/v2/account_book/${accountBookId}/voucher`)
        .send(paymentVoucherData)
        .set('Cookie', cookies.join('; '));

      // Info: (20250716 - Shirley) Always log payment voucher results for record keeping
      // eslint-disable-next-line no-console
      console.log('=== PAYMENT VOUCHER POST RESULT ===');
      // eslint-disable-next-line no-console
      console.log('Status:', response.status);
      // eslint-disable-next-line no-console
      console.log('Success:', response.body.success);
      // eslint-disable-next-line no-console
      console.log('Code:', response.body.code);
      // eslint-disable-next-line no-console
      console.log('Message:', response.body.message);
      // eslint-disable-next-line no-console
      console.log('Voucher ID:', response.body.payload?.id);
      // eslint-disable-next-line no-console
      console.log('Voucher Number:', response.body.payload?.no);
      // eslint-disable-next-line no-console
      console.log('Voucher Type:', response.body.payload?.type);
      // eslint-disable-next-line no-console
      console.log('Voucher Date:', response.body.payload?.date);
      // eslint-disable-next-line no-console
      console.log('Line Items Count:', response.body.payload?.lineItems?.length);
      // eslint-disable-next-line no-console
      console.log('Full Response Body:', JSON.stringify(response.body, null, 2));
      // eslint-disable-next-line no-console
      console.log('=== END PAYMENT VOUCHER RESULT ===');

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.payload).toBeDefined();
      expect(response.body.payload.id).toBeDefined();
      expect(typeof response.body.payload.id).toBe('number');

      // Info: (20250716 - Shirley) Validate output structure
      const { isOutputDataValid, outputData } = validateOutputData(
        APIName.VOUCHER_POST_V2,
        response.body.payload
      );
      expect(isOutputDataValid).toBe(true);
      expect(outputData).toBeDefined();

      if (process.env.DEBUG_TESTS === 'true') {
        // eslint-disable-next-line no-console
        console.log('✅ Payment voucher created successfully with ID:', response.body.payload.id);
      }

      // Info: (20250716 - Shirley) Verify ledger after payment voucher creation
      const getLedgerClient = createTestClient({
        handler: getLedgerHandler,
        routeParams: { accountBookId: accountBookId.toString() },
      });

      const startDate = Math.floor(Date.now() / 1000) - 86400 * 7;
      const endDate = Math.floor(Date.now() / 1000) + 86400 * 7;

      const ledgerResponse = await getLedgerClient
        .get(`/api/v2/account_book/${accountBookId}/ledger`)
        .query({
          startDate: startDate.toString(),
          endDate: endDate.toString(),
          page: '1',
          pageSize: '50',
        })
        .set('Cookie', cookies.join('; '))
        .expect(200);

      // eslint-disable-next-line no-console
      console.log('=== LEDGER AFTER PAYMENT VOUCHER POST ===');
      // eslint-disable-next-line no-console
      console.log('Ledger Success:', ledgerResponse.body.success);
      // eslint-disable-next-line no-console
      console.log('Ledger Total Count:', ledgerResponse.body.payload.totalCount);
      // eslint-disable-next-line no-console
      console.log('Ledger Items Count:', ledgerResponse.body.payload.data.length);
      // eslint-disable-next-line no-console
      console.log('Ledger Items:', JSON.stringify(ledgerResponse.body.payload.data, null, 2));
      // eslint-disable-next-line no-console
      console.log('=== END LEDGER VERIFICATION ===');

      expect(ledgerResponse.body.success).toBe(true);
      expect(ledgerResponse.body.payload.totalCount).toBeGreaterThan(0);
      expect(ledgerResponse.body.payload.data.length).toBeGreaterThan(0);
    });
  });
});
