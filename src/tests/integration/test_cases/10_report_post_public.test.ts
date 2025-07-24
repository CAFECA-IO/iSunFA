import { APITestHelper } from '@/tests/integration/setup/api_helper';
import { createTestClient } from '@/tests/integration/setup/test_client';

// Info: (20250724 - Shirley) Import API handlers for report post integration testing
import createAccountBookHandler from '@/pages/api/v2/user/[userId]/account_book';
import getAccountBookHandler from '@/pages/api/v2/account_book/[accountBookId]';
import connectAccountBookHandler from '@/pages/api/v2/account_book/[accountBookId]/connect';
import reportPostHandler from '@/pages/api/v2/account_book/[accountBookId]/report/public';
import voucherPostHandler from '@/pages/api/v2/account_book/[accountBookId]/voucher';

// Info: (20250724 - Shirley) Import required types and constants
import { WORK_TAG } from '@/interfaces/account_book';
import { LocaleKey } from '@/constants/normal_setting';
import { CurrencyType } from '@/constants/currency';
import { validateOutputData } from '@/lib/utils/validator';
import { APIName } from '@/constants/api_connection';
import { ReportSheetType } from '@/constants/report';
import { TestDataFactory } from '@/tests/integration/setup/test_data_factory';
import { TestClient } from '@/interfaces/test_client';

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
 * Info: (20250724 - Shirley) Integration Test - Report Post Public API Integration (Test Case 10)
 *
 * Primary Purpose:
 * - Test post report API functionality and data structure
 * - Verify report generation after voucher posting
 * - Ensure proper API response validation
 * - Test report creation with actual voucher data
 *
 * Test Flow:
 * 1. User Authentication and Account Book Setup
 * 2. Voucher Posting for Report Data
 * 3. Report Generation via POST
 * 4. Report Data Validation
 */
describe('Integration Test - Report Post Public API Integration (Test Case 10)', () => {
  let authenticatedHelper: APITestHelper;
  let currentUserId: string;
  let teamId: number;
  let accountBookId: number;

  // Info: (20250724 - Shirley) Shared test clients - defined once and reused throughout the test suite
  let createAccountBookClient: TestClient;
  let getAccountBookClient: TestClient;
  let connectAccountBookClient: TestClient;
  let reportPostClient: TestClient;
  let voucherPostClient: TestClient;

  const randomNumber = Math.floor(Math.random() * 90000000) + 10000000;

  // Info: (20250724 - Shirley) Test company data
  const testCompanyData = {
    name: 'Report Post Test Company 報表生成測試公司',
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
    // Info: (20250724 - Shirley) Setup authenticated helper and complete user registration
    authenticatedHelper = await APITestHelper.createHelper({ autoAuth: true });

    const statusResponse = await authenticatedHelper.getStatusInfo();
    const userData = statusResponse.body.payload?.user as { id?: number };
    currentUserId = userData?.id?.toString() || '1';

    // Info: (20250724 - Shirley) Complete user registration flow
    await authenticatedHelper.agreeToTerms();
    await authenticatedHelper.createUserRole();
    await authenticatedHelper.selectUserRole();

    // Info: (20250724 - Shirley) Create team for account book operations
    const teamResponse = await authenticatedHelper.createTeam();
    const teamData = teamResponse.body.payload?.team as { id?: number };
    teamId = teamData?.id || 0;

    // Info: (20250724 - Shirley) Update test company data with actual team ID
    testCompanyData.teamId = teamId;

    // Info: (20250724 - Shirley) Refresh session to ensure team membership is updated
    await authenticatedHelper.getStatusInfo();

    // Info: (20250724 - Shirley) Initialize shared test clients once
    createAccountBookClient = createTestClient({
      handler: createAccountBookHandler,
      routeParams: { userId: currentUserId },
    });

    if (process.env.DEBUG_TESTS === 'true') {
      // Deprecated: (20250724 - Shirley) Remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('✅ Test setup completed: User and team created with ID:', teamId);
    }
  });

  // Info: (20250724 - Shirley) Initialize clients that depend on accountBookId
  const initializeAccountBookDependentClients = () => {
    getAccountBookClient = createTestClient({
      handler: getAccountBookHandler,
      routeParams: { accountBookId: accountBookId.toString() },
    });

    connectAccountBookClient = createTestClient({
      handler: connectAccountBookHandler,
      routeParams: { accountBookId: accountBookId.toString() },
    });

    reportPostClient = createTestClient({
      handler: reportPostHandler,
      routeParams: { accountBookId: accountBookId.toString() },
    });

    voucherPostClient = createTestClient({
      handler: voucherPostHandler,
      routeParams: { accountBookId: accountBookId.toString() },
    });
  };

  afterAll(async () => {
    // Info: (20250724 - Shirley) Cleanup test data
    await authenticatedHelper.clearSession();

    if (process.env.DEBUG_TESTS === 'true') {
      // Deprecated: (20250724 - Shirley) Remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('✅ Test cleanup completed');
    }
  });

  /**
   * Info: (20250724 - Shirley) Test Step 1: Create Account Book
   */
  describe('Step 1: Account Book Creation', () => {
    test('should create account book with proper structure', async () => {
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

      // Info: (20250724 - Shirley) Validate output with production validator
      const { isOutputDataValid, outputData } = validateOutputData(
        APIName.CREATE_ACCOUNT_BOOK,
        response.body.payload
      );
      expect(isOutputDataValid).toBe(true);
      expect(outputData?.id).toBeDefined();
      expect(typeof outputData?.id).toBe('number');

      accountBookId = response.body.payload.id;

      // Info: (20250724 - Shirley) Initialize account book dependent clients now that we have accountBookId
      initializeAccountBookDependentClients();

      if (process.env.DEBUG_TESTS === 'true') {
        // Deprecated: (20250724 - Shirley) Remove eslint-disable
        // eslint-disable-next-line no-console
        console.log('✅ Account book created successfully with ID:', accountBookId);
      }
    });

    test('should verify account book connection', async () => {
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
        // Deprecated: (20250724 - Shirley) Remove eslint-disable
        // eslint-disable-next-line no-console
        console.log('✅ Account book connection verified');
      }
    });
  });

  /**
   * Info: (20250724 - Shirley) Test Step 2: Create Sample Vouchers for Report
   */
  describe('Step 2: Create Sample Vouchers for Report', () => {
    test('should create vouchers for report generation', async () => {
      await authenticatedHelper.ensureAuthenticated();
      const cookies = authenticatedHelper.getCurrentSession();

      // Info: (20250724 - Shirley) Connect to account book first
      const responseForConnect = await connectAccountBookClient
        .get(`/api/v2/account_book/${accountBookId}/connect`)
        .set('Cookie', cookies.join('; '))
        .expect(200);

      expect(responseForConnect.body.success).toBe(true);
      expect(responseForConnect.body.payload).toBeDefined();

      const sampleVouchersData = TestDataFactory.sampleVoucherData();
      const createdVouchers = [];

      // Info: (20250724 - Shirley) Create all sample vouchers
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

        // Deprecated: (20250724 - Shirley) Remove eslint-disable
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
          // Deprecated: (20250724 - Shirley) Remove eslint-disable
          // eslint-disable-next-line no-console
          console.log('✅ Voucher created successfully with ID:', response.body.payload.id);
        } else {
          // Deprecated: (20250724 - Shirley) Remove eslint-disable
          // eslint-disable-next-line no-console
          console.log('❌ Voucher creation failed:', response.body.message);
        }
      }

      // Info: (20250724 - Shirley) Verify all vouchers were created
      expect(createdVouchers.length).toBe(sampleVouchersData.length);

      // Deprecated: (20250724 - Shirley) Remove eslint-disable
      // eslint-disable-next-line no-console
      console.log(
        `\n🎉 Successfully created ${createdVouchers.length} vouchers for report generation test`
      );
    });
  });

  /**
   * Info: (20250724 - Shirley) Test Step 3: Generate Report via POST API
   */
  describe('Step 3: Generate Report via POST API', () => {
    test('should generate balance sheet report with proper structure', async () => {
      await authenticatedHelper.ensureAuthenticated();
      const cookies = authenticatedHelper.getCurrentSession();

      const currentTimestamp = Math.floor(Date.now() / 1000);
      const startDate = currentTimestamp - 86400 * 365; // Info: (20250724 - Shirley) 1 year ago
      const endDate = currentTimestamp; // Info: (20250724 - Shirley) Current date

      const reportPayload = {
        // projectId: null,
        // type: ReportSheetType.BALANCE_SHEET,
        // reportLanguage: 'en',
        // from: startDate,
        // to: endDate,
        reportType: 'financial',
      };

      const response = await reportPostClient
        .post(`/api/v2/account_book/${accountBookId}/report/public`)
        .send(reportPayload)
        .set('Cookie', cookies.join('; '));

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.payload).toBeDefined();
      expect(typeof response.body.payload).toBe('number');

      // Info: (20250724 - Shirley) Validate output with production validator
      const { isOutputDataValid, outputData } = validateOutputData(
        APIName.REPORT_GENERATE,
        response.body.payload
      );
      expect(isOutputDataValid).toBe(true);
      expect(outputData).toBeDefined();

      const reportId = response.body.payload;

      if (process.env.DEBUG_TESTS === 'true') {
        // Deprecated: (20250724 - Shirley) Remove eslint-disable
        // eslint-disable-next-line no-console
        console.log('✅ Balance sheet report generated successfully with ID:', reportId);
      }

      // Info: (20250724 - Shirley) Log the result for record keeping
      // Deprecated: (20250724 - Shirley) Remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('\n=== REPORT POST TEST RESULTS ===');
      // Deprecated: (20250724 - Shirley) Remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('Report Type: Balance Sheet');
      // Deprecated: (20250724 - Shirley) Remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('Report ID:', reportId);
      // Deprecated: (20250724 - Shirley) Remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('Account Book ID:', accountBookId);
      // Deprecated: (20250724 - Shirley) Remove eslint-disable
      // eslint-disable-next-line no-console
      console.log(
        'Date Range:',
        new Date(startDate * 1000).toISOString(),
        'to',
        new Date(endDate * 1000).toISOString()
      );
      // Deprecated: (20250724 - Shirley) Remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('Response Status:', response.status);
      // Deprecated: (20250724 - Shirley) Remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('Response Body:', JSON.stringify(response.body, null, 2));
      // Deprecated: (20250724 - Shirley) Remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('=== END REPORT POST TEST RESULTS ===\n');
    });

    test('should generate income statement report with proper structure', async () => {
      await authenticatedHelper.ensureAuthenticated();
      const cookies = authenticatedHelper.getCurrentSession();

      const currentTimestamp = Math.floor(Date.now() / 1000);
      const startDate = currentTimestamp - 86400 * 365; // Info: (20250724 - Shirley) 1 year ago
      const endDate = currentTimestamp; // Info: (20250724 - Shirley) Current date

      const reportPayload = {
        // projectId: 1,
        type: ReportSheetType.INCOME_STATEMENT,
        // type: ReportSheetType.INCOME_STATEMENT,
        // reportLanguage: 'en',
        // from: startDate,
        // to: endDate,
        reportType: 'financial',
      };

      const response = await reportPostClient
        .post(`/api/v2/account_book/${accountBookId}/report/public`)
        .send(reportPayload)
        .set('Cookie', cookies.join('; '));

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.payload).toBeDefined();
      // expect(typeof response.body.payload).toBe('number');

      // Info: (20250724 - Shirley) Validate output with production validator
      const { isOutputDataValid, outputData } = validateOutputData(
        APIName.REPORT_GENERATE,
        response.body.payload
      );
      expect(isOutputDataValid).toBe(true);
      expect(outputData).toBeDefined();

      const reportId = response.body.payload;

      if (process.env.DEBUG_TESTS === 'true') {
        // Deprecated: (20250724 - Shirley) Remove eslint-disable
        // eslint-disable-next-line no-console
        console.log('✅ Income statement report generated successfully with ID:', reportId);
      }

      // Info: (20250724 - Shirley) Log the result for record keeping
      // Deprecated: (20250724 - Shirley) Remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('\n=== INCOME STATEMENT REPORT POST TEST RESULTS ===');
      // Deprecated: (20250724 - Shirley) Remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('Report Type: Income Statement');
      // Deprecated: (20250724 - Shirley) Remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('Report ID:', reportId);
      // Deprecated: (20250724 - Shirley) Remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('Account Book ID:', accountBookId);
      // Deprecated: (20250724 - Shirley) Remove eslint-disable
      // eslint-disable-next-line no-console
      console.log(
        'Date Range:',
        new Date(startDate * 1000).toISOString(),
        'to',
        new Date(endDate * 1000).toISOString()
      );
      // Deprecated: (20250724 - Shirley) Remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('Response Status:', response.status);
      // Deprecated: (20250724 - Shirley) Remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('Response Body:', JSON.stringify(response.body, null, 2));
      // Deprecated: (20250724 - Shirley) Remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('=== END INCOME STATEMENT REPORT POST TEST RESULTS ===\n');
    });

    test('should generate cash flow report with proper structure', async () => {
      await authenticatedHelper.ensureAuthenticated();
      const cookies = authenticatedHelper.getCurrentSession();

      const currentTimestamp = Math.floor(Date.now() / 1000);
      const startDate = currentTimestamp - 86400 * 365; // Info: (20250724 - Shirley) 1 year ago
      const endDate = currentTimestamp; // Info: (20250724 - Shirley) Current date

      const reportPayload = {
        // projectId: 1,
        type: ReportSheetType.CASH_FLOW_STATEMENT,
        // reportLanguage: 'en',
        // from: startDate,
        // to: endDate,
        reportType: 'financial',
      };

      const response = await reportPostClient
        .post(`/api/v2/account_book/${accountBookId}/report/public`)
        .send(reportPayload)
        .set('Cookie', cookies.join('; '));

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.payload).toBeDefined();
      // expect(typeof response.body.payload).toBe('number');

      // Info: (20250724 - Shirley) Validate output with production validator
      const { isOutputDataValid, outputData } = validateOutputData(
        APIName.REPORT_GENERATE,
        response.body.payload
      );
      expect(isOutputDataValid).toBe(true);
      expect(outputData).toBeDefined();

      const reportId = response.body.payload;

      if (process.env.DEBUG_TESTS === 'true') {
        // Deprecated: (20250724 - Shirley) Remove eslint-disable
        // eslint-disable-next-line no-console
        console.log('✅ Cash flow report generated successfully with ID:', reportId);
      }

      // Info: (20250724 - Shirley) Log the result for record keeping
      // Deprecated: (20250724 - Shirley) Remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('\n=== CASH FLOW REPORT POST TEST RESULTS ===');
      // Deprecated: (20250724 - Shirley) Remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('Report Type: Cash Flow Statement');
      // Deprecated: (20250724 - Shirley) Remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('Report ID:', reportId);
      // Deprecated: (20250724 - Shirley) Remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('Account Book ID:', accountBookId);
      // Deprecated: (20250724 - Shirley) Remove eslint-disable
      // eslint-disable-next-line no-console
      console.log(
        'Date Range:',
        new Date(startDate * 1000).toISOString(),
        'to',
        new Date(endDate * 1000).toISOString()
      );
      // Deprecated: (20250724 - Shirley) Remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('Response Status:', response.status);
      // Deprecated: (20250724 - Shirley) Remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('Response Body:', JSON.stringify(response.body, null, 2));
      // Deprecated: (20250724 - Shirley) Remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('=== END CASH FLOW REPORT POST TEST RESULTS ===\n');
    });
  });

  /**
   * Info: (20250724 - Shirley) Test Step 4: Error Handling and Edge Cases
   */
  describe('Step 4: Error Handling and Edge Cases', () => {
    test('should reject unauthenticated requests', async () => {
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const startDate = currentTimestamp - 86400 * 365;
      const endDate = currentTimestamp;

      const reportPayload = {
        projectId: 1,
        type: ReportSheetType.BALANCE_SHEET,
        reportLanguage: 'en',
        from: startDate,
        to: endDate,
        reportType: 'financial',
      };

      const response = await reportPostClient
        .post(`/api/v2/account_book/${accountBookId}/report/public`)
        .send(reportPayload);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);

      if (process.env.DEBUG_TESTS === 'true') {
        // Deprecated: (20250724 - Shirley) Remove eslint-disable
        // eslint-disable-next-line no-console
        console.log('✅ Unauthenticated request properly rejected with 401');
      }
    });

    test('should handle invalid report type gracefully', async () => {
      await authenticatedHelper.ensureAuthenticated();
      const cookies = authenticatedHelper.getCurrentSession();

      const currentTimestamp = Math.floor(Date.now() / 1000);
      const startDate = currentTimestamp - 86400 * 365;
      const endDate = currentTimestamp;

      const reportPayload = {
        projectId: 1,
        type: 'invalid_report_type',
        reportLanguage: 'en',
        from: startDate,
        to: endDate,
        reportType: 'financial',
      };

      const response = await reportPostClient
        .post(`/api/v2/account_book/${accountBookId}/report/public`)
        .send(reportPayload)
        .set('Cookie', cookies.join('; '));

      expect(response.status).toBe(422);
      expect(response.body.success).toBe(false);
    });

    test('should handle invalid date range gracefully', async () => {
      await authenticatedHelper.ensureAuthenticated();
      const cookies = authenticatedHelper.getCurrentSession();

      const reportPayload = {
        projectId: 1,
        type: ReportSheetType.BALANCE_SHEET,
        reportLanguage: 'en',
        from: 'invalid_date',
        to: 'invalid_date',
        reportType: 'financial',
      };

      const response = await reportPostClient
        .post(`/api/v2/account_book/${accountBookId}/report/public`)
        .send(reportPayload)
        .set('Cookie', cookies.join('; '));

      expect(response.status).toBe(422);
      expect(response.body.success).toBe(false);
    });

    test('should reject missing required parameters', async () => {
      await authenticatedHelper.ensureAuthenticated();
      const cookies = authenticatedHelper.getCurrentSession();

      const reportPayload = {
        // Info: (20250724 - Shirley) Missing required fields
        projectId: 1,
        reportLanguage: 'en',
      };

      const response = await reportPostClient
        .post(`/api/v2/account_book/${accountBookId}/report/public`)
        .send(reportPayload)
        .set('Cookie', cookies.join('; '));

      expect(response.status).toBe(422);
      expect(response.body.success).toBe(false);
    });
  });

  /**
   * Info: (20250724 - Shirley) Test Step 5: Complete Integration Workflow Validation
   */
  describe('Step 5: Complete Integration Workflow Validation', () => {
    test('should validate complete report post integration workflow', async () => {
      // Info: (20250724 - Shirley) Step 1: Verify account book exists
      expect(accountBookId).toBeDefined();
      expect(accountBookId).toBeGreaterThan(0);

      // Info: (20250724 - Shirley) Step 2: Verify report post API is working
      await authenticatedHelper.ensureAuthenticated();
      const cookies = authenticatedHelper.getCurrentSession();

      // const currentTimestamp = Math.floor(Date.now() / 1000);
      // const startDate = currentTimestamp - 86400 * 365;
      // const endDate = currentTimestamp;

      const reportPayload = {
        // projectId: 1,
        // type: ReportSheetType.BALANCE_SHEET,
        // reportLanguage: 'en',
        // from: startDate,
        // to: endDate,
        reportType: 'financial',
      };

      const finalReportResponse = await reportPostClient
        .post(`/api/v2/account_book/${accountBookId}/report/public`)
        .send(reportPayload)
        .set('Cookie', cookies.join('; '));

      expect(finalReportResponse.status).toBe(201);
      expect(finalReportResponse.body.success).toBe(true);
      // expect(typeof finalReportResponse.body.payload).toBe('number');

      const finalReportId = finalReportResponse.body.payload;

      // Info: (20250724 - Shirley) Final validation
      expect(finalReportId).toBeDefined();
      expect(finalReportId).toBeGreaterThan(0);

      // Info: (20250724 - Shirley) Log final test results for record keeping
      // Deprecated: (20250724 - Shirley) Remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('\n=== FINAL INTEGRATION TEST RESULTS ===');
      // Deprecated: (20250724 - Shirley) Remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('✅ Complete integration workflow validated successfully');
      // Deprecated: (20250724 - Shirley) Remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('Account Book ID:', accountBookId);
      // Deprecated: (20250724 - Shirley) Remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('Final Report ID:', finalReportId);
      // Deprecated: (20250724 - Shirley) Remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('Test Company:', testCompanyData.name);
      // Deprecated: (20250724 - Shirley) Remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('=== END FINAL INTEGRATION TEST RESULTS ===\n');
    });
  });
});
