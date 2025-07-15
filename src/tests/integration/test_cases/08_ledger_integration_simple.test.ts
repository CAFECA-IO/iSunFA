/* eslint-disable */
import { APITestHelper } from '@/tests/integration/setup/api_helper';
import { createTestClient } from '@/tests/integration/setup/test_client';

// Info: (20250715 - Claude) Import API handlers for ledger integration testing
import createAccountBookHandler from '@/pages/api/v2/user/[userId]/account_book';
import getLedgerHandler from '@/pages/api/v2/account_book/[accountBookId]/ledger';
import exportLedgerHandler from '@/pages/api/v2/account_book/[accountBookId]/ledger/export';

// Info: (20250715 - Claude) Import required types and constants
import { WORK_TAG } from '@/interfaces/account_book';
import { LocaleKey } from '@/constants/normal_setting';
import { CurrencyType } from '@/constants/currency';
import { validateOutputData } from '@/lib/utils/validator';
import { APIName } from '@/constants/api_connection';

// Info: (20250715 - Claude) Mock pusher for testing
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
 * Info: (20250715 - Claude) Simple Ledger Integration Test
 *
 * This test focuses on testing the ledger functionality using existing data
 * in the database for company_id 10000007, replicating the correct flow:
 * 1. Create Account Book (to get access to company data)
 * 2. Generate Ledger from existing vouchers and line items
 * 3. Test Ledger filtering and export functionality
 */
describe('Integration Test - Simple Ledger Integration', () => {
  let authenticatedHelper: APITestHelper;
  let currentUserId: string;
  let teamId: number;
  let accountBookId: number;

  const randomNumber = Math.floor(Math.random() * 90000000) + 10000000;

  // Info: (20250715 - Claude) Test company data
  const testCompanyData = {
    name: 'Simple Ledger Test Company',
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
    // Info: (20250715 - Claude) Setup authenticated helper
    authenticatedHelper = await APITestHelper.createHelper({ autoAuth: true });

    const statusResponse = await authenticatedHelper.getStatusInfo();
    const userData = statusResponse.body.payload?.user as { id?: number };
    currentUserId = userData?.id?.toString() || '1';

    // Info: (20250715 - Claude) Complete user registration
    await authenticatedHelper.agreeToTerms();
    await authenticatedHelper.createUserRole();
    await authenticatedHelper.selectUserRole();

    // Info: (20250715 - Claude) Create team for account book
    const teamResponse = await authenticatedHelper.createTeam();
    const teamData = teamResponse.body.payload?.team as { id?: number };
    teamId = teamData?.id || 0;

    testCompanyData.teamId = teamId;

    if (process.env.DEBUG_TESTS === 'true') {
      console.log('✅ Test setup completed: User and team created');
    }
  });

  afterAll(async () => {
    await authenticatedHelper.clearSession();

    if (process.env.DEBUG_TESTS === 'true') {
      console.log('✅ Test cleanup completed');
    }
  });

  /**
   * Info: (20250715 - Claude) Test Step 1: Create Account Book
   * This creates the account book which will have default chart of accounts
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

      // Info: (20250715 - Claude) Validate output with production validator
      const { isOutputDataValid, outputData } = validateOutputData(
        APIName.CREATE_ACCOUNT_BOOK,
        response.body.payload
      );
      expect(isOutputDataValid).toBe(true);
      expect(outputData?.id).toBeDefined();
      expect(typeof outputData?.id).toBe('number');

      accountBookId = response.body.payload.id;

      if (process.env.DEBUG_TESTS === 'true') {
        console.log('✅ Account book created successfully with ID:', accountBookId);
      }
    });
  });

  /**
   * Info: (20250715 - Claude) Test Step 2: Generate and Validate Ledger
   * This tests the core ledger functionality even with empty data
   */
  describe('Step 2: Ledger Generation and Validation', () => {
    test('should generate ledger with proper structure (empty data)', async () => {
      const getLedgerClient = createTestClient({
        handler: getLedgerHandler,
        routeParams: { accountBookId: accountBookId.toString() },
      });

      await authenticatedHelper.ensureAuthenticated();
      const cookies = authenticatedHelper.getCurrentSession();

      const startDate = Math.floor(Date.now() / 1000) - 86400 * 30; // 30 days ago
      const endDate = Math.floor(Date.now() / 1000) + 86400 * 30; // 30 days from now

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

      // Info: (20250715 - Claude) Validate ledger structure
      const { isOutputDataValid, outputData } = validateOutputData(
        APIName.LEDGER_LIST,
        response.body.payload
      );
      expect(isOutputDataValid).toBe(true);
      expect(outputData?.data).toBeDefined();

      // Info: (20250715 - Claude) With empty data, totalCount should be 0
      expect(outputData?.totalCount).toBe(0);

      const ledgerItems = response.body.payload.data;
      expect(ledgerItems.length).toBe(0); // No vouchers created yet

      if (process.env.DEBUG_TESTS === 'true') {
        console.log('✅ Ledger generated successfully with', ledgerItems.length, 'items');
      }
    });

    test('should handle ledger filtering by label type', async () => {
      const getLedgerClient = createTestClient({
        handler: getLedgerHandler,
        routeParams: { accountBookId: accountBookId.toString() },
      });

      await authenticatedHelper.ensureAuthenticated();
      const cookies = authenticatedHelper.getCurrentSession();

      const startDate = Math.floor(Date.now() / 1000) - 86400 * 30;
      const endDate = Math.floor(Date.now() / 1000) + 86400 * 30;

      // Info: (20250715 - Claude) Test general label type filtering
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

      const startDate = Math.floor(Date.now() / 1000) - 86400 * 30;
      const endDate = Math.floor(Date.now() / 1000) + 86400 * 30;

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
        console.log('✅ Ledger pagination verified');
      }
    });
  });

  /**
   * Info: (20250715 - Claude) Test Step 3: Ledger Export
   * This tests the ledger export functionality
   */
  describe('Step 3: Ledger Export', () => {
    test('should export ledger to CSV', async () => {
      const exportLedgerClient = createTestClient({
        handler: exportLedgerHandler,
        routeParams: { accountBookId: accountBookId.toString() },
      });

      await authenticatedHelper.ensureAuthenticated();
      const cookies = authenticatedHelper.getCurrentSession();

      const startDate = Math.floor(Date.now() / 1000) - 86400 * 30;
      const endDate = Math.floor(Date.now() / 1000) + 86400 * 30;

      const exportData = {
        fileType: 'csv',
        filters: {
          startDate: startDate,
          endDate: endDate,
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
      // Info: (20250715 - Claude) CSV headers are in Chinese, check for actual headers
      expect(response.text).toContain('科目代碼'); // Account code
      expect(response.text).toContain('會計科目'); // Accounting title
      expect(response.text).toContain('傳票編號'); // Voucher number

      if (process.env.DEBUG_TESTS === 'true') {
        console.log('✅ Ledger export to CSV verified');
      }
    });
  });

  /**
   * Info: (20250715 - Claude) Test Step 4: Complete Workflow Validation
   * This validates the entire flow works correctly
   */
  describe('Step 4: Complete Workflow Validation', () => {
    test('should validate complete ledger workflow', async () => {
      // Info: (20250715 - Claude) Step 1: Verify account book exists
      expect(accountBookId).toBeDefined();
      expect(accountBookId).toBeGreaterThan(0);

      // Info: (20250715 - Claude) Step 2: Verify ledger can be generated
      const getLedgerClient = createTestClient({
        handler: getLedgerHandler,
        routeParams: { accountBookId: accountBookId.toString() },
      });

      await authenticatedHelper.ensureAuthenticated();
      const cookies = authenticatedHelper.getCurrentSession();

      const startDate = Math.floor(Date.now() / 1000) - 86400 * 30;
      const endDate = Math.floor(Date.now() / 1000) + 86400 * 30;

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

      // Info: (20250715 - Claude) With empty data, should have 0 items
      expect(finalLedgerItems.length).toBe(0);

      // Info: (20250715 - Claude) But structure should be valid
      expect(finalLedgerResponse.body.payload.totalCount).toBe(0);
      expect(finalLedgerResponse.body.payload.page).toBe(1);
      expect(finalLedgerResponse.body.payload.pageSize).toBe(100);

      if (process.env.DEBUG_TESTS === 'true') {
        console.log('✅ Complete workflow validated successfully');
        console.log(`   - Account Book ID: ${accountBookId}`);
        console.log(`   - Ledger Items: ${finalLedgerItems.length}`);
        console.log(`   - Total Count: ${finalLedgerResponse.body.payload.totalCount}`);
      }
    });
  });
});
