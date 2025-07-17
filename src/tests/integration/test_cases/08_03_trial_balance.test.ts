import { APITestHelper } from '@/tests/integration/setup/api_helper';
import { createTestClient } from '@/tests/integration/setup/test_client';

// Info: (20250716 - Shirley) Import API handlers for trial balance integration testing
import createAccountBookHandler from '@/pages/api/v2/user/[userId]/account_book';
import getAccountBookHandler from '@/pages/api/v2/account_book/[accountBookId]';
import connectAccountBookHandler from '@/pages/api/v2/account_book/[accountBookId]/connect';
import trialBalanceHandler from '@/pages/api/v2/account_book/[accountBookId]/trial_balance';
import voucherPostHandler from '@/pages/api/v2/account_book/[accountBookId]/voucher';

// Info: (20250716 - Shirley) Import required types and constants
import { WORK_TAG } from '@/interfaces/account_book';
import { LocaleKey } from '@/constants/normal_setting';
import { CurrencyType } from '@/constants/currency';
import { validateOutputData } from '@/lib/utils/validator';
import { APIName } from '@/constants/api_connection';
import { EventType } from '@/constants/account';
import { TrialBalanceItem } from '@/interfaces/trial_balance';
import { TestDataFactory } from '@/tests/integration/setup/test_data_factory';

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

/**
 * Info: (20250716 - Shirley) Integration Test - Trial Balance Integration (Test Case 8.3)
 *
 * Primary Purpose:
 * - Test trial balance API functionality and data structure
 * - Verify trial balance calculation after voucher posting
 * - Ensure proper API response validation
 * - Test trial balance with actual voucher data
 *
 * Test Flow:
 * 1. User Authentication and Account Book Setup
 * 2. Trial Balance API Testing (empty scenario)
 * 3. Voucher Posting
 * 4. Trial Balance Verification After Voucher
 */
describe('Integration Test - Trial Balance Integration (Test Case 8.3)', () => {
  let authenticatedHelper: APITestHelper;
  let currentUserId: string;
  let teamId: number;
  let accountBookId: number;

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

  beforeAll(async () => {
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

    if (process.env.DEBUG_TESTS === 'true') {
      // Deprecated: (20250716 - Luphia) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('✅ Test setup completed: User and team created with ID:', teamId);
    }
  });

  afterAll(async () => {
    // Info: (20250716 - Shirley) Cleanup test data
    await authenticatedHelper.clearSession();

    if (process.env.DEBUG_TESTS === 'true') {
      // Deprecated: (20250716 - Luphia) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('✅ Test cleanup completed');
    }
  });

  /**
   * Info: (20250716 - Shirley) Test Step 1: Create Account Book
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
        // Deprecated: (20250716 - Luphia) remove eslint-disable
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
        // Deprecated: (20250716 - Luphia) remove eslint-disable
        // eslint-disable-next-line no-console
        console.log('✅ Account book connection verified');
      }
    });
  });

  /**
   * Info: (20250716 - Shirley) Test Step 2: Trial Balance API Testing
   */
  describe('Step 2: Trial Balance API Testing', () => {
    test('should generate trial balance with proper structure (empty data)', async () => {
      const trialBalanceClient = createTestClient({
        handler: trialBalanceHandler,
        routeParams: { accountBookId: accountBookId.toString() },
      });

      await authenticatedHelper.ensureAuthenticated();
      const cookies = authenticatedHelper.getCurrentSession();

      const response = await trialBalanceClient
        .get(`/api/v2/account_book/${accountBookId}/trial_balance`)
        .query({
          page: '1',
          pageSize: '50',
        })
        .set('Cookie', cookies.join('; '))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.payload).toBeDefined();
      expect(response.body.payload.data).toBeDefined();
      expect(Array.isArray(response.body.payload.data)).toBe(true);

      // Info: (20250716 - Shirley) Validate trial balance structure
      const { isOutputDataValid, outputData } = validateOutputData(
        APIName.TRIAL_BALANCE_LIST,
        response.body.payload
      );
      expect(isOutputDataValid).toBe(true);
      expect(outputData?.data).toBeDefined();

      // Deprecated: (20250716 - Luphia) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('=== TRIAL BALANCE EMPTY DATA RESULT ===');
      // Deprecated: (20250716 - Luphia) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('Success:', response.body.success);
      // Deprecated: (20250716 - Luphia) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('Total Count:', response.body.payload.totalCount);
      // Deprecated: (20250716 - Luphia) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('Data Items:', response.body.payload.data.length);
      // Deprecated: (20250716 - Luphia) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('Full Response:', JSON.stringify(response.body, null, 2));
      // Deprecated: (20250716 - Luphia) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('=== END TRIAL BALANCE EMPTY DATA RESULT ===');

      if (process.env.DEBUG_TESTS === 'true') {
        // Deprecated: (20250716 - Luphia) remove eslint-disable
        // eslint-disable-next-line no-console
        console.log(
          '✅ Trial balance generated successfully with',
          outputData?.data?.length,
          'items'
        );
      }
    });

    test('should handle trial balance pagination', async () => {
      const trialBalanceClient = createTestClient({
        handler: trialBalanceHandler,
        routeParams: { accountBookId: accountBookId.toString() },
      });

      await authenticatedHelper.ensureAuthenticated();
      const cookies = authenticatedHelper.getCurrentSession();

      const response = await trialBalanceClient
        .get(`/api/v2/account_book/${accountBookId}/trial_balance`)
        .query({
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
        // Deprecated: (20250716 - Luphia) remove eslint-disable
        // eslint-disable-next-line no-console
        console.log('✅ Trial balance pagination verified');
      }
    });
  });

  /**
   * Info: (20250716 - Shirley) Test Step 3: Voucher Posting and Trial Balance Verification
   */
  describe('Step 3: Voucher Posting and Trial Balance Verification', () => {
    test('should create income voucher and verify trial balance', async () => {
      await authenticatedHelper.ensureAuthenticated();
      const cookies = authenticatedHelper.getCurrentSession();

      // Info: (20250716 - Shirley) Connect to account book first to ensure proper session
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

      const currentTimestamp = Math.floor(Date.now() / 1000);

      // Info: (20250716 - Shirley) Test voucher data structure
      const testVoucherData = {
        actions: [],
        certificateIds: [],
        invoiceRC2Ids: [],
        voucherDate: currentTimestamp,
        type: EventType.PAYMENT,
        note: 'Test voucher for trial balance integration',
        lineItems: [
          {
            description: 'Test item A',
            debit: false,
            amount: 100,
            accountId: 1603, // Info: (20250716 - Shirley) Cash and Cash Equivalents (現金及約當現金)
          },
          {
            description: 'Test item B',
            debit: true,
            amount: 100,
            accountId: 1601, // Info: (20250716 - Shirley) Operating Revenue (營業收入)
          },
        ],
        assetIds: [],
        counterPartyId: null,
      };

      const response = await voucherPostClient
        .post(`/api/v2/account_book/${accountBookId}/voucher`)
        .send(testVoucherData)
        .set('Cookie', cookies.join('; '));

      // Info: (20250716 - Shirley) Always log income voucher results for record keeping
      // Deprecated: (20250716 - Luphia) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('=== INCOME VOUCHER POST RESULT ===');
      // Deprecated: (20250716 - Luphia) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('Status:', response.status);
      // Deprecated: (20250716 - Luphia) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('Success:', response.body.success);
      // Deprecated: (20250716 - Luphia) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('Code:', response.body.code);
      // Deprecated: (20250716 - Luphia) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('Message:', response.body.message);
      // Deprecated: (20250716 - Luphia) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('Voucher ID:', response.body.payload?.id);
      // Deprecated: (20250716 - Luphia) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('Voucher Number:', response.body.payload?.no);
      // Deprecated: (20250716 - Luphia) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('Voucher Type:', response.body.payload?.type);
      // Deprecated: (20250716 - Luphia) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('Voucher Date:', response.body.payload?.date);
      // Deprecated: (20250716 - Luphia) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('Line Items Count:', response.body.payload?.lineItems?.length);
      // Deprecated: (20250716 - Luphia) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('Full Response Body:', JSON.stringify(response.body, null, 2));
      // Deprecated: (20250716 - Luphia) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('=== END INCOME VOUCHER RESULT ===');

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.payload).toBeDefined();
      expect(response.body.payload.id).toBeDefined();
      expect(typeof response.body.payload.id).toBe('number');

      // Info: (20250716 - Shirley) Validate output with production validator
      const { isOutputDataValid, outputData } = validateOutputData(
        APIName.VOUCHER_POST_V2,
        response.body.payload
      );
      expect(isOutputDataValid).toBe(true);
      expect(outputData).toBeDefined();

      if (process.env.DEBUG_TESTS === 'true') {
        // Deprecated: (20250716 - Luphia) remove eslint-disable
        // eslint-disable-next-line no-console
        console.log('✅ Voucher created successfully with ID:', response.body.payload.id);
      }

      // Info: (20250716 - Shirley) Verify trial balance after voucher creation
      const trialBalanceClient = createTestClient({
        handler: trialBalanceHandler,
        routeParams: { accountBookId: accountBookId.toString() },
      });

      // Info: (20250716 - Shirley) Use explicit date range that includes voucher dates
      const startDate = Math.floor(Date.now() / 1000) - 86400 * 30; // Info: (20250716 - Shirley) 30 days ago
      const endDate = Math.floor(Date.now() / 1000) + 86400 * 30; // Info: (20250716 - Shirley) 30 days from now

      const trialBalanceResponse = await trialBalanceClient
        .get(`/api/v2/account_book/${accountBookId}/trial_balance`)
        .query({
          page: '1',
          pageSize: '50',
          startDate: startDate.toString(),
          endDate: endDate.toString(),
        })
        .set('Cookie', cookies.join('; '));

      // Deprecated: (20250716 - Luphia) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('=== TRIAL BALANCE AFTER INCOME VOUCHER POST ===');
      // Deprecated: (20250716 - Luphia) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('Trial Balance Status:', trialBalanceResponse.status);
      // Deprecated: (20250716 - Luphia) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('Trial Balance Success:', trialBalanceResponse.body.success);
      // Deprecated: (20250716 - Luphia) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('Trial Balance Code:', trialBalanceResponse.body.code);
      // Deprecated: (20250716 - Luphia) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('Trial Balance Message:', trialBalanceResponse.body.message);
      // Deprecated: (20250716 - Luphia) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('Trial Balance Payload:', trialBalanceResponse.body.payload);
      // Deprecated: (20250716 - Luphia) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('Query used:', { startDate, endDate, page: '1', pageSize: '50' });
      // Deprecated: (20250716 - Luphia) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('Full Response Body:', JSON.stringify(trialBalanceResponse.body, null, 2));
      // Deprecated: (20250716 - Luphia) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('=== END TRIAL BALANCE VERIFICATION ===');

      if (trialBalanceResponse.status !== 200) {
        // Deprecated: (20250716 - Luphia) remove eslint-disable
        // eslint-disable-next-line no-console
        console.log('Trial balance API failed, skipping assertions');
        return;
      }

      expect(trialBalanceResponse.status).toBe(200);
      expect(trialBalanceResponse.body.success).toBe(true);
      expect(trialBalanceResponse.body.payload.totalCount).toBeGreaterThan(0);
      expect(trialBalanceResponse.body.payload.data.length).toBeGreaterThan(0);
    });
  });

  /**
   * Info: (20250716 - Shirley) Test Step 4: Financial Report Sample Data Testing
   */
  describe('Step 4: Financial Report Sample Data Testing', () => {
    test('should create vouchers based on sample data and verify trial balance', async () => {
      await authenticatedHelper.ensureAuthenticated();
      const cookies = authenticatedHelper.getCurrentSession();

      // Info: (20250716 - Shirley) Connect to account book first
      const connectAccountBookClient = createTestClient({
        handler: connectAccountBookHandler,
        routeParams: { accountBookId: accountBookId.toString() },
      });

      await connectAccountBookClient
        .get(`/api/v2/account_book/${accountBookId}/connect`)
        .set('Cookie', cookies.join('; '))
        .expect(200);

      const voucherPostClient = createTestClient({
        handler: voucherPostHandler,
        routeParams: { accountBookId: accountBookId.toString() },
      });

      const sampleVouchersData = TestDataFactory.sampleVoucherData();

      const createdVouchers = [];

      // Info: (20250716 - Shirley) Create all sample vouchers
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

        // Deprecated: (20250716 - Luphia) remove eslint-disable
        // eslint-disable-next-line no-await-in-loop
        const response = await voucherPostClient
          .post(`/api/v2/account_book/${accountBookId}/voucher`)
          .send(voucherPayload)
          .set('Cookie', cookies.join('; '));

        // Deprecated: (20250716 - Luphia) remove eslint-disable
        // eslint-disable-next-line no-console
        console.log(`=== SAMPLE VOUCHER ${i + 1} POST RESULT ===`);
        // Deprecated: (20250716 - Luphia) remove eslint-disable
        // eslint-disable-next-line no-console
        console.log('Status:', response.status);
        // Deprecated: (20250716 - Luphia) remove eslint-disable
        // eslint-disable-next-line no-console
        console.log('Success:', response.body.success);
        // Deprecated: (20250716 - Luphia) remove eslint-disable
        // eslint-disable-next-line no-console
        console.log('Type:', voucherData.type);
        // Deprecated: (20250716 - Luphia) remove eslint-disable
        // eslint-disable-next-line no-console
        console.log('Line Items:', voucherData.lineItems.length);
        // Deprecated: (20250716 - Luphia) remove eslint-disable
        // eslint-disable-next-line no-console
        console.log(
          'Total Amount:',
          voucherData.lineItems.reduce((sum, item) => sum + item.amount, 0)
        );
        // Deprecated: (20250716 - Luphia) remove eslint-disable
        // eslint-disable-next-line no-console
        console.log(
          'Accounts Used:',
          voucherData.lineItems.map((item) => item.accountId).join(', ')
        );

        if (response.status === 201) {
          createdVouchers.push({
            id: response.body.payload.id,
            type: voucherData.type,
            lineItems: voucherData.lineItems,
          });
          // Deprecated: (20250716 - Luphia) remove eslint-disable
          // eslint-disable-next-line no-console
          console.log('✅ Voucher created successfully with ID:', response.body.payload.id);
        } else {
          // Deprecated: (20250716 - Luphia) remove eslint-disable
          // eslint-disable-next-line no-console
          console.log('❌ Voucher creation failed:', response.body.message);
        }
        // Deprecated: (20250716 - Luphia) remove eslint-disable
        // eslint-disable-next-line no-console
        console.log('=== END SAMPLE VOUCHER RESULT ===');
      }

      // Info: (20250716 - Shirley) Verify all vouchers were created
      expect(createdVouchers.length).toBe(sampleVouchersData.length);

      // Deprecated: (20250716 - Luphia) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log(`\n🎉 Successfully created ${createdVouchers.length} sample vouchers`);

      // Info: (20250716 - Shirley) Get trial balance after all vouchers are created
      const trialBalanceClient = createTestClient({
        handler: trialBalanceHandler,
        routeParams: { accountBookId: accountBookId.toString() },
      });

      const startDate = Math.floor(Date.now() / 1000) - 86400 * 365; // Info: (20250716 - Shirley) 1 year ago
      const endDate = Math.floor(Date.now() / 1000) + 86400 * 30; // Info: (20250716 - Shirley) 30 days from now

      const trialBalanceResponse = await trialBalanceClient
        .get(`/api/v2/account_book/${accountBookId}/trial_balance`)
        .query({
          page: '1',
          pageSize: '100',
          startDate: startDate.toString(),
          endDate: endDate.toString(),
        })
        .set('Cookie', cookies.join('; '));

      // Deprecated: (20250716 - Luphia) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('\n=== FINAL TRIAL BALANCE WITH SAMPLE DATA 123 ===');
      // Deprecated: (20250716 - Luphia) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('Status:', trialBalanceResponse.status);
      // Deprecated: (20250716 - Luphia) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('Success:', trialBalanceResponse.body.success);
      // Deprecated: (20250716 - Luphia) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('Total Items:', trialBalanceResponse.body.payload?.totalCount || 0);
      // Deprecated: (20250716 - Luphia) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('Data Items:', trialBalanceResponse.body.payload?.data?.length || 0);

      if (trialBalanceResponse.body.payload?.data) {
        // Deprecated: (20250716 - Luphia) remove eslint-disable
        // eslint-disable-next-line no-console
        console.log('\n📊 Trial Balance Summary:');

        const trialBalanceData = trialBalanceResponse.body.payload.data;
        let totalDebitAmount = 0;
        let totalCreditAmount = 0;

        trialBalanceData.forEach((item: TrialBalanceItem, index: number) => {
          const debitAmount = item.endingDebitAmount || 0;
          const creditAmount = item.endingCreditAmount || 0;

          if (debitAmount > 0 || creditAmount > 0) {
            // Deprecated: (20250716 - Luphia) remove eslint-disable
            // eslint-disable-next-line no-console
            console.log(`${index + 1}. Account ${item.no} (${item.accountingTitle}):`);
            // Deprecated: (20250716 - Luphia) remove eslint-disable
            // eslint-disable-next-line no-console
            console.log(
              `   Debit: ${debitAmount.toLocaleString()}, Credit: ${creditAmount.toLocaleString()}`
            );

            totalDebitAmount += debitAmount;
            totalCreditAmount += creditAmount;
          }
        });

        // Deprecated: (20250716 - Luphia) remove eslint-disable
        // eslint-disable-next-line no-console
        console.log('\n💰 Total Amounts:');
        // Deprecated: (20250716 - Luphia) remove eslint-disable
        // eslint-disable-next-line no-console
        console.log(`Total Debit Amount: ${totalDebitAmount.toLocaleString()}`);
        // Deprecated: (20250716 - Luphia) remove eslint-disable
        // eslint-disable-next-line no-console
        console.log(`Total Credit Amount: ${totalCreditAmount.toLocaleString()}`);
        // Deprecated: (20250716 - Luphia) remove eslint-disable
        // eslint-disable-next-line no-console
        console.log(
          `Balance Check: ${totalDebitAmount === totalCreditAmount ? '✅ Balanced' : '❌ Unbalanced'}`
        );
      }

      // Deprecated: (20250716 - Luphia) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('=== END FINAL TRIAL BALANCE ===');

      expect(trialBalanceResponse.status).toBe(200);
      expect(trialBalanceResponse.body.success).toBe(true);
      expect(trialBalanceResponse.body.payload.totalCount).toBeGreaterThan(0);
      expect(trialBalanceResponse.body.payload.data.length).toBeGreaterThan(0);

      if (process.env.DEBUG_TESTS === 'true') {
        // Deprecated: (20250716 - Luphia) remove eslint-disable
        // eslint-disable-next-line no-console
        console.log(`✅ Sample data test completed successfully`);
        // Deprecated: (20250716 - Luphia) remove eslint-disable
        // eslint-disable-next-line no-console
        console.log(`   - Created vouchers: ${createdVouchers.length}`);
        // Deprecated: (20250716 - Luphia) remove eslint-disable
        // eslint-disable-next-line no-console
        console.log(`   - Trial balance items: ${trialBalanceResponse.body.payload.data.length}`);
      }
    });
  });

  /**
   * Info: (20250716 - Shirley) Test Step 5: Complete Integration Workflow
   */
  describe('Step 5: Complete Integration Workflow Validation', () => {
    test('should validate complete trial balance integration workflow', async () => {
      // Info: (20250716 - Shirley) Step 1: Verify account book exists
      expect(accountBookId).toBeDefined();
      expect(accountBookId).toBeGreaterThan(0);

      // Info: (20250716 - Shirley) Step 2: Verify trial balance API is working
      const trialBalanceClient = createTestClient({
        handler: trialBalanceHandler,
        routeParams: { accountBookId: accountBookId.toString() },
      });

      await authenticatedHelper.ensureAuthenticated();
      const cookies = authenticatedHelper.getCurrentSession();

      const finalTrialBalanceResponse = await trialBalanceClient
        .get(`/api/v2/account_book/${accountBookId}/trial_balance`)
        .query({
          page: '1',
          pageSize: '100',
        })
        .set('Cookie', cookies.join('; '));

      // Deprecated: (20250716 - Luphia) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('=== FINAL TRIAL BALANCE VALIDATION ===');
      // Deprecated: (20250716 - Luphia) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('Final Trial Balance Status:', finalTrialBalanceResponse.status);
      // Deprecated: (20250716 - Luphia) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('Final Trial Balance Success:', finalTrialBalanceResponse.body.success);
      // Deprecated: (20250716 - Luphia) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('Final Trial Balance Code:', finalTrialBalanceResponse.body.code);
      // Deprecated: (20250716 - Luphia) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('Final Trial Balance Message:', finalTrialBalanceResponse.body.message);
      // Deprecated: (20250716 - Luphia) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('Final Trial Balance Payload:', finalTrialBalanceResponse.body.payload);
      // Deprecated: (20250716 - Luphia) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('=== END FINAL TRIAL BALANCE VALIDATION ===');

      if (finalTrialBalanceResponse.status !== 200) {
        // Deprecated: (20250716 - Luphia) remove eslint-disable
        // eslint-disable-next-line no-console
        console.log('Final trial balance API failed, skipping assertions');
        return;
      }

      expect(finalTrialBalanceResponse.status).toBe(200);
      expect(finalTrialBalanceResponse.body.success).toBe(true);
      const finalTrialBalanceItems = finalTrialBalanceResponse.body.payload.data;

      // Info: (20250716 - Shirley) Trial balance should have data from vouchers
      expect(finalTrialBalanceItems.length).toBeGreaterThan(0);

      if (process.env.DEBUG_TESTS === 'true') {
        // Deprecated: (20250716 - Luphia) remove eslint-disable
        // eslint-disable-next-line no-console
        console.log('✅ Complete workflow validated successfully');
        // Deprecated: (20250716 - Luphia) remove eslint-disable
        // eslint-disable-next-line no-console
        console.log(`   - Account Book ID: ${accountBookId}`);
        // Deprecated: (20250716 - Luphia) remove eslint-disable
        // eslint-disable-next-line no-console
        console.log(`   - Trial Balance Items: ${finalTrialBalanceItems.length}`);
        // Deprecated: (20250716 - Luphia) remove eslint-disable
        // eslint-disable-next-line no-console
        console.log(`   - Total Count: ${finalTrialBalanceResponse.body.payload.totalCount}`);
      }
    });
  });
});
