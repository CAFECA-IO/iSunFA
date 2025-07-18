import { APITestHelper } from '@/tests/integration/setup/api_helper';
import { createTestClient } from '@/tests/integration/setup/test_client';

// Info: (20250718 - Shirley) Import API handlers for income statement integration testing
import createAccountBookHandler from '@/pages/api/v2/user/[userId]/account_book';
import getAccountBookHandler from '@/pages/api/v2/account_book/[accountBookId]';
import connectAccountBookHandler from '@/pages/api/v2/account_book/[accountBookId]/connect';
import reportHandler from '@/pages/api/v2/account_book/[accountBookId]/report';
import voucherPostHandler from '@/pages/api/v2/account_book/[accountBookId]/voucher';

// Info: (20250718 - Shirley) Import required types and constants
import { WORK_TAG } from '@/interfaces/account_book';
import { LocaleKey } from '@/constants/normal_setting';
import { CurrencyType } from '@/constants/currency';
import { validateOutputData, validateAndFormatData } from '@/lib/utils/validator';
import { APIName } from '@/constants/api_connection';
import { ReportSheetType } from '@/constants/report';
import { FinancialReportTypesKey } from '@/interfaces/report_type';
import { TestDataFactory } from '@/tests/integration/setup/test_data_factory';
import { z } from 'zod';
import { TestClient } from '@/interfaces/test_client';

// Info: (20250718 - Shirley) Mock pusher for testing
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
 * Info: (20250718 - Shirley) Integration Test - Income Statement Report Integration (Test Case 8.1.2)
 *
 * Primary Purpose:
 * - Test income statement report API functionality and data structure
 * - Verify income statement calculation after voucher posting
 * - Ensure proper API response validation
 * - Test income statement with actual voucher data
 *
 * Test Flow:
 * 1. User Authentication and Account Book Setup
 * 2. Voucher Posting for Income Statement Data
 * 3. Income Statement Report Generation
 * 4. Report Data Validation
 */
describe('Integration Test - Income Statement Report Integration (Test Case 8.1.2)', () => {
  let authenticatedHelper: APITestHelper;
  let currentUserId: string;
  let teamId: number;
  let accountBookId: number;

  // Info: (20250718 - Shirley) Shared test clients - defined once and reused throughout the test suite
  let createAccountBookClient: TestClient;
  let getAccountBookClient: TestClient;
  let connectAccountBookClient: TestClient;
  let reportClient: TestClient;
  let voucherPostClient: TestClient;

  const randomNumber = Math.floor(Math.random() * 90000000) + 10000000;

  // Info: (20250718 - Shirley) Test company data
  const testCompanyData = {
    name: 'Income Statement Test Company 損益表測試公司',
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
    // Info: (20250718 - Shirley) Setup authenticated helper and complete user registration
    authenticatedHelper = await APITestHelper.createHelper({ autoAuth: true });

    const statusResponse = await authenticatedHelper.getStatusInfo();
    const userData = statusResponse.body.payload?.user as { id?: number };
    currentUserId = userData?.id?.toString() || '1';

    // Info: (20250718 - Shirley) Complete user registration flow
    await authenticatedHelper.agreeToTerms();
    await authenticatedHelper.createUserRole();
    await authenticatedHelper.selectUserRole();

    // Info: (20250718 - Shirley) Create team for account book operations
    const teamResponse = await authenticatedHelper.createTeam();
    const teamData = teamResponse.body.payload?.team as { id?: number };
    teamId = teamData?.id || 0;

    // Info: (20250718 - Shirley) Update test company data with actual team ID
    testCompanyData.teamId = teamId;

    // Info: (20250718 - Shirley) Refresh session to ensure team membership is updated
    await authenticatedHelper.getStatusInfo();

    // Info: (20250718 - Shirley) Initialize shared test clients once
    createAccountBookClient = createTestClient({
      handler: createAccountBookHandler,
      routeParams: { userId: currentUserId },
    });

    if (process.env.DEBUG_TESTS === 'true') {
      // eslint-disable-next-line no-console
      console.log('✅ Test setup completed: User and team created with ID:', teamId);
    }
  });

  // Info: (20250718 - Shirley) Initialize clients that depend on accountBookId
  const initializeAccountBookDependentClients = () => {
    getAccountBookClient = createTestClient({
      handler: getAccountBookHandler,
      routeParams: { accountBookId: accountBookId.toString() },
    });

    connectAccountBookClient = createTestClient({
      handler: connectAccountBookHandler,
      routeParams: { accountBookId: accountBookId.toString() },
    });

    reportClient = createTestClient({
      handler: reportHandler,
      routeParams: { accountBookId: accountBookId.toString() },
    });

    voucherPostClient = createTestClient({
      handler: voucherPostHandler,
      routeParams: { accountBookId: accountBookId.toString() },
    });
  };

  afterAll(async () => {
    // Info: (20250718 - Shirley) Cleanup test data
    await authenticatedHelper.clearSession();

    if (process.env.DEBUG_TESTS === 'true') {
      // eslint-disable-next-line no-console
      console.log('✅ Test cleanup completed');
    }
  });

  /**
   * Info: (20250718 - Shirley) Test Step 1: Create Account Book
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

      // Info: (20250718 - Shirley) Validate output with production validator
      const { isOutputDataValid, outputData } = validateOutputData(
        APIName.CREATE_ACCOUNT_BOOK,
        response.body.payload
      );
      expect(isOutputDataValid).toBe(true);
      expect(outputData?.id).toBeDefined();
      expect(typeof outputData?.id).toBe('number');

      accountBookId = response.body.payload.id;

      // Info: (20250718 - Shirley) Initialize account book dependent clients now that we have accountBookId
      initializeAccountBookDependentClients();

      if (process.env.DEBUG_TESTS === 'true') {
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
        // eslint-disable-next-line no-console
        console.log('✅ Account book connection verified');
      }
    });
  });

  /**
   * Info: (20250718 - Shirley) Test Step 2: Create Sample Vouchers for Income Statement
   */
  describe('Step 2: Create Sample Vouchers for Income Statement', () => {
    test('should create income and expense vouchers', async () => {
      await authenticatedHelper.ensureAuthenticated();
      const cookies = authenticatedHelper.getCurrentSession();

      // Info: (20250718 - Shirley) Connect to account book first
      const responseForConnect = await connectAccountBookClient
        .get(`/api/v2/account_book/${accountBookId}/connect`)
        .set('Cookie', cookies.join('; '))
        .expect(200);

      expect(responseForConnect.body.success).toBe(true);
      expect(responseForConnect.body.payload).toBeDefined();

      const sampleVouchersData = TestDataFactory.sampleVoucherData();
      const createdVouchers = [];

      // Info: (20250718 - Shirley) Create all sample vouchers
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

        // eslint-disable-next-line no-console
        console.log(`=== VOUCHER ${i + 1} FOR INCOME STATEMENT POST RESULT ===`);
        // eslint-disable-next-line no-console
        console.log('Status:', response.status);
        // eslint-disable-next-line no-console
        console.log('Success:', response.body.success);
        // eslint-disable-next-line no-console
        console.log('Type:', voucherData.type);
        // eslint-disable-next-line no-console
        console.log('Note:', voucherData.note);
        // eslint-disable-next-line no-console
        console.log('Line Items:', voucherData.lineItems.length);
        // eslint-disable-next-line no-console
        console.log('Full Response:', JSON.stringify(response.body, null, 2));
        // eslint-disable-next-line no-console
        console.log('=== END VOUCHER RESULT ===');

        if (response.status === 201) {
          createdVouchers.push({
            id: response.body.payload.id,
            type: voucherData.type,
            lineItems: voucherData.lineItems,
          });
          // eslint-disable-next-line no-console
          console.log('✅ Voucher created successfully with ID:', response.body.payload.id);
        } else {
          // eslint-disable-next-line no-console
          console.log('❌ Voucher creation failed:', response.body.message);
        }
      }

      // Info: (20250718 - Shirley) Verify all vouchers were created
      expect(createdVouchers.length).toBe(sampleVouchersData.length);

      // eslint-disable-next-line no-console
      console.log(
        `\n🎉 Successfully created ${createdVouchers.length} vouchers for income statement test`
      );
    });
  });

  /**
   * Info: (20250718 - Shirley) Test Step 3: Generate Income Statement Report
   */
  describe('Step 3: Generate Income Statement Report', () => {
    test('should generate income statement report with proper structure', async () => {
      await authenticatedHelper.ensureAuthenticated();
      const cookies = authenticatedHelper.getCurrentSession();

      const currentTimestamp = Math.floor(Date.now() / 1000);
      const startDate = currentTimestamp - 86400 * 365; // 1 year ago
      const endDate = currentTimestamp + 86400 * 30; // 30 days from now

      const response = await reportClient
        .get(`/api/v2/account_book/${accountBookId}/report`)
        .query({
          reportType: FinancialReportTypesKey.comprehensive_income_statement,
          startDate: startDate.toString(),
          endDate: endDate.toString(),
          language: 'en',
        })
        .set('Cookie', cookies.join('; '));

      // eslint-disable-next-line no-console
      console.log('=== INCOME STATEMENT REPORT RESULT ===');
      // eslint-disable-next-line no-console
      console.log('Status:', response.status);
      // eslint-disable-next-line no-console
      console.log('Success:', response.body.success);
      // eslint-disable-next-line no-console
      console.log('Code:', response.body.code);
      // eslint-disable-next-line no-console
      console.log('Message:', response.body.message);
      // eslint-disable-next-line no-console
      console.log('Report Type:', response.body.payload?.reportType);
      // eslint-disable-next-line no-console
      console.log('Company:', response.body.payload?.company);
      // eslint-disable-next-line no-console
      console.log('Current Period:', response.body.payload?.curDate);
      // eslint-disable-next-line no-console
      console.log('Previous Period:', response.body.payload?.preDate);
      // eslint-disable-next-line no-console
      console.log('General Items Count:', response.body.payload?.general?.length);
      // eslint-disable-next-line no-console
      console.log('Detail Items Count:', response.body.payload?.details?.length);
      // eslint-disable-next-line no-console
      console.log('Other Info:', response.body.payload?.otherInfo);
      // eslint-disable-next-line no-console
      console.log('Full Response:', JSON.stringify(response.body, null, 2));
      // eslint-disable-next-line no-console
      console.log('=== END INCOME STATEMENT REPORT RESULT ===');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.payload).toBeDefined();
      expect(response.body.payload.reportType).toBe(ReportSheetType.INCOME_STATEMENT);

      // Info: (20250718 - Shirley) Validate output with production validator
      const { isOutputDataValid, outputData } = validateOutputData(
        APIName.REPORT_GET_V2,
        response.body.payload
      );
      expect(isOutputDataValid).toBe(true);
      expect(outputData).toBeDefined();

      // Info: (20250718 - Shirley) Verify income statement specific structure
      expect(outputData?.company).toBeDefined();

      expect(outputData?.reportType).toBe(ReportSheetType.INCOME_STATEMENT);
      expect(outputData?.curDate).toBeDefined();
      expect(outputData?.preDate).toBeDefined();
      expect(outputData?.general).toBeDefined();
      expect(outputData?.details).toBeDefined();
      expect(Array.isArray(outputData?.general)).toBe(true);
      expect(Array.isArray(outputData?.details)).toBe(true);

      if (process.env.DEBUG_TESTS === 'true') {
        // eslint-disable-next-line no-console
        console.log('✅ Income statement report generated successfully');
        // eslint-disable-next-line no-console
        console.log(`   - Report Type: ${outputData?.reportType}`);
      }
    });

    test('should validate income statement data structure and calculations', async () => {
      await authenticatedHelper.ensureAuthenticated();
      const cookies = authenticatedHelper.getCurrentSession();

      const currentTimestamp = Math.floor(Date.now() / 1000);
      const startDate = currentTimestamp - 86400 * 365; // 1 year ago
      const endDate = currentTimestamp + 86400 * 30; // 30 days from now

      const response = await reportClient
        .get(`/api/v2/account_book/${accountBookId}/report`)
        .query({
          reportType: FinancialReportTypesKey.comprehensive_income_statement,
          startDate: startDate.toString(),
          endDate: endDate.toString(),
          language: 'en',
        })
        .set('Cookie', cookies.join('; '));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const incomeStatementData = response.body.payload;

      // Info: (20250718 - Shirley) Detailed income statement validation
      expect(incomeStatementData.reportType).toBe(ReportSheetType.INCOME_STATEMENT);
      expect(incomeStatementData.company).toBeDefined();
      expect(incomeStatementData.company.id).toBe(accountBookId);
      expect(incomeStatementData.company.name).toBe(testCompanyData.name);
      expect(incomeStatementData.company.code).toBe(testCompanyData.taxId);

      // Info: (20250718 - Shirley) Validate date ranges
      expect(incomeStatementData.curDate).toBeDefined();
      expect(incomeStatementData.preDate).toBeDefined();
      expect(incomeStatementData.curDate.from).toBe(startDate);
      expect(incomeStatementData.curDate.to).toBe(endDate);

      // Info: (20250718 - Shirley) Validate account data structure
      expect(Array.isArray(incomeStatementData.general)).toBe(true);
      expect(Array.isArray(incomeStatementData.details)).toBe(true);

      // eslint-disable-next-line no-console
      console.log('\n=== INCOME STATEMENT DETAILED ANALYSIS ===');
      // eslint-disable-next-line no-console
      console.log('📊 Report Summary:');
      // eslint-disable-next-line no-console
      console.log(
        `   Company: ${incomeStatementData.company.name} (${incomeStatementData.company.code})`
      );
      // eslint-disable-next-line no-console
      console.log(
        `   Period: ${new Date(startDate * 1000).toLocaleDateString()} to ${new Date(endDate * 1000).toLocaleDateString()}`
      );
      // eslint-disable-next-line no-console
      console.log(`   General Items: ${incomeStatementData.general.length}`);
      // eslint-disable-next-line no-console
      console.log(`   Detail Items: ${incomeStatementData.details.length}`);

      if (incomeStatementData.general.length > 0) {
        // eslint-disable-next-line no-console
        console.log('\n💰 General Income Statement Items:');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        incomeStatementData.general.forEach((item: any, index: number) => {
          // eslint-disable-next-line no-console
          console.log(`${index + 1}. ${item.no} - ${item.accountingTitle}`);
          // eslint-disable-next-line no-console
          console.log(`   Current: ${item.curPeriodAmount?.toLocaleString() || 0}`);
          // eslint-disable-next-line no-console
          console.log(`   Previous: ${item.prePeriodAmount?.toLocaleString() || 0}`);
        });
      }

      if (incomeStatementData.details.length > 0) {
        // eslint-disable-next-line no-console
        console.log('\n📋 Detailed Income Statement Items:');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        incomeStatementData.details.forEach((item: any, index: number) => {
          // eslint-disable-next-line no-console
          console.log(`${index + 1}. ${item.no} - ${item.accountingTitle}`);
          // eslint-disable-next-line no-console
          console.log(`   Current: ${item.curPeriodAmount?.toLocaleString() || 0}`);
          // eslint-disable-next-line no-console
          console.log(`   Previous: ${item.prePeriodAmount?.toLocaleString() || 0}`);
        });
      }

      // eslint-disable-next-line no-console
      console.log('\n📈 Other Information:');
      // eslint-disable-next-line no-console
      console.log('Other Info:', JSON.stringify(incomeStatementData.otherInfo, null, 2));
      // eslint-disable-next-line no-console
      console.log('=== END INCOME STATEMENT DETAILED ANALYSIS ===');

      if (process.env.DEBUG_TESTS === 'true') {
        // eslint-disable-next-line no-console
        console.log('✅ Income statement data structure validated successfully');
      }
    });
  });

  /**
   * Info: (20250718 - Shirley) Test Step 4: Error Handling and Edge Cases
   */
  describe('Step 4: Error Handling and Edge Cases', () => {
    test('should handle invalid report type gracefully', async () => {
      await authenticatedHelper.ensureAuthenticated();
      const cookies = authenticatedHelper.getCurrentSession();

      const currentTimestamp = Math.floor(Date.now() / 1000);
      const startDate = currentTimestamp - 86400 * 365;
      const endDate = currentTimestamp + 86400 * 30;

      const response = await reportClient
        .get(`/api/v2/account_book/${accountBookId}/report`)
        .query({
          reportType: 'invalid_report_type',
          startDate: startDate.toString(),
          endDate: endDate.toString(),
          language: 'en',
        })
        .set('Cookie', cookies.join('; '));

      // eslint-disable-next-line no-console
      console.log('=== INVALID REPORT TYPE ERROR HANDLING ===');
      // eslint-disable-next-line no-console
      console.log('Status:', response.status);
      // eslint-disable-next-line no-console
      console.log('Success:', response.body.success);
      // eslint-disable-next-line no-console
      console.log('Code:', response.body.code);
      // eslint-disable-next-line no-console
      console.log('Message:', response.body.message);
      // eslint-disable-next-line no-console
      console.log('=== END ERROR HANDLING ===');

      expect(response.status).toBe(422);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('422ISF0000');
    });

    test('should handle invalid date range gracefully', async () => {
      await authenticatedHelper.ensureAuthenticated();
      const cookies = authenticatedHelper.getCurrentSession();

      const response = await reportClient
        .get(`/api/v2/account_book/${accountBookId}/report`)
        .query({
          reportType: FinancialReportTypesKey.comprehensive_income_statement,
          startDate: 'invalid_date',
          endDate: 'invalid_date',
          language: 'en',
        })
        .set('Cookie', cookies.join('; '));

      expect(response.status).toBe(422);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('422ISF0000');
    });
  });

  /**
   * Info: (20250718 - Shirley) Test Step 5: Complete Integration Workflow Validation
   */
  describe('Step 5: Complete Integration Workflow Validation', () => {
    test('should validate complete income statement integration workflow', async () => {
      // Info: (20250718 - Shirley) Step 1: Verify account book exists
      expect(accountBookId).toBeDefined();
      expect(accountBookId).toBeGreaterThan(0);

      // Info: (20250718 - Shirley) Step 2: Verify income statement report API is working
      await authenticatedHelper.ensureAuthenticated();
      const cookies = authenticatedHelper.getCurrentSession();

      const currentTimestamp = Math.floor(Date.now() / 1000);
      const startDate = currentTimestamp - 86400 * 365;
      const endDate = currentTimestamp + 86400 * 30;

      const finalIncomeStatementResponse = await reportClient
        .get(`/api/v2/account_book/${accountBookId}/report`)
        .query({
          reportType: FinancialReportTypesKey.comprehensive_income_statement,
          startDate: startDate.toString(),
          endDate: endDate.toString(),
          language: 'en',
        })
        .set('Cookie', cookies.join('; '));

      // eslint-disable-next-line no-console
      console.log('=== FINAL INCOME STATEMENT VALIDATION ===');
      // eslint-disable-next-line no-console
      console.log('Final Income Statement Status:', finalIncomeStatementResponse.status);
      // eslint-disable-next-line no-console
      console.log('Final Income Statement Success:', finalIncomeStatementResponse.body.success);
      // eslint-disable-next-line no-console
      console.log('Final Income Statement Code:', finalIncomeStatementResponse.body.code);
      // eslint-disable-next-line no-console
      console.log('Final Income Statement Message:', finalIncomeStatementResponse.body.message);
      // eslint-disable-next-line no-console
      console.log('Final Income Statement Payload:', finalIncomeStatementResponse.body.payload);
      // eslint-disable-next-line no-console
      console.log('=== END FINAL INCOME STATEMENT VALIDATION ===');

      expect(finalIncomeStatementResponse.status).toBe(200);
      expect(finalIncomeStatementResponse.body.success).toBe(true);
      expect(finalIncomeStatementResponse.body.payload.reportType).toBe(
        ReportSheetType.INCOME_STATEMENT
      );

      const finalIncomeStatementData = finalIncomeStatementResponse.body.payload;

      // Info: (20250718 - Shirley) Income statement should have proper structure
      expect(finalIncomeStatementData.company).toBeDefined();
      expect(finalIncomeStatementData.curDate).toBeDefined();
      expect(finalIncomeStatementData.preDate).toBeDefined();
      expect(finalIncomeStatementData.general).toBeDefined();
      expect(finalIncomeStatementData.details).toBeDefined();

      if (process.env.DEBUG_TESTS === 'true') {
        // eslint-disable-next-line no-console
        console.log('✅ Complete income statement workflow validated successfully');
        // eslint-disable-next-line no-console
        console.log(`   - Account Book ID: ${accountBookId}`);
        // eslint-disable-next-line no-console
        console.log(`   - Company Name: ${finalIncomeStatementData.company.name}`);
        // eslint-disable-next-line no-console
        console.log(`   - Report Type: ${finalIncomeStatementData.reportType}`);
        // eslint-disable-next-line no-console
        console.log(`   - General Items: ${finalIncomeStatementData.general.length}`);
        // eslint-disable-next-line no-console
        console.log(`   - Detail Items: ${finalIncomeStatementData.details.length}`);
      }
    });
  });

  /**
   * Info: (20250718 - Shirley) Test Step 6: Comprehensive Failure Test Cases
   * Following Integration Test Plan v2 - Section 8.1.4: Common Financial Report Failure Cases
   */
  describe('Step 6: Comprehensive Failure Test Cases', () => {
    // Info: (20250718 - Shirley) Define standard error response schema for validation
    const errorResponseSchema = z.object({
      success: z.literal(false),
      code: z.string(),
      message: z.string(),
      payload: z.null(),
    });

    /**
     * Info: (20250718 - Shirley) Test Case 6.1: Authentication Failure Cases
     */
    describe('6.1 Authentication Failure Cases', () => {
      test('should reject unauthenticated requests', async () => {
        const currentTimestamp = Math.floor(Date.now() / 1000);
        const startDate = currentTimestamp - 86400 * 365;
        const endDate = currentTimestamp + 86400 * 30;

        const response = await reportClient
          .get(`/api/v2/account_book/${accountBookId}/report`)
          .query({
            reportType: FinancialReportTypesKey.comprehensive_income_statement,
            startDate: startDate.toString(),
            endDate: endDate.toString(),
            language: 'en',
          });
        // Info: (20250718 - Shirley) No cookies = no authentication

        expect(response.status).toBe(401);

        // Info: (20250718 - Shirley) Validate error response structure
        const validatedError = validateAndFormatData(errorResponseSchema, response.body);
        expect(validatedError.success).toBe(false);
        expect(validatedError.code).toBe('401ISF0000'); // Unauthorized access

        if (process.env.DEBUG_TESTS === 'true') {
          // eslint-disable-next-line no-console
          console.log('✅ Unauthenticated request properly rejected with 401');
        }
      });

      test('should reject requests with invalid session cookies', async () => {
        const currentTimestamp = Math.floor(Date.now() / 1000);
        const startDate = currentTimestamp - 86400 * 365;
        const endDate = currentTimestamp + 86400 * 30;

        const response = await reportClient
          .get(`/api/v2/account_book/${accountBookId}/report`)
          .query({
            reportType: FinancialReportTypesKey.comprehensive_income_statement,
            startDate: startDate.toString(),
            endDate: endDate.toString(),
            language: 'en',
          })
          .set('Cookie', 'invalid-session-cookie=invalid-value');

        expect(response.status).toBe(401);

        const validatedError = validateAndFormatData(errorResponseSchema, response.body);
        expect(validatedError.success).toBe(false);
        expect(validatedError.code).toBe('401ISF0000');

        if (process.env.DEBUG_TESTS === 'true') {
          // eslint-disable-next-line no-console
          console.log('✅ Invalid session properly rejected with 401');
        }
      });
    });

    /**
     * Info: (20250718 - Shirley) Test Case 6.2: Authorization Failure Cases
     */
    // TODO: (20250718 - Shirley) Report API test authentication and authorization by session companyId instead of parameter accountBookId, discuss if this needs to be changed
    xtest('6.2 Authorization Failure Cases', () => {
      test('should reject access to non-existent account book', async () => {
        await authenticatedHelper.ensureAuthenticated();
        const cookies = authenticatedHelper.getCurrentSession();

        const nonExistentAccountBookId = 999999;
        const nonExistentReportClient = createTestClient({
          handler: reportHandler,
          routeParams: { accountBookId: nonExistentAccountBookId.toString() },
        });

        const currentTimestamp = Math.floor(Date.now() / 1000);
        const startDate = currentTimestamp - 86400 * 365;
        const endDate = currentTimestamp + 86400 * 30;

        const response = await nonExistentReportClient
          .get(`/api/v2/account_book/${nonExistentAccountBookId}/report`)
          .query({
            reportType: FinancialReportTypesKey.comprehensive_income_statement,
            startDate: startDate.toString(),
            endDate: endDate.toString(),
            language: 'en',
          })
          .set('Cookie', cookies.join('; '));

        // eslint-disable-next-line no-console
        console.log('responseIn6.2', response.body);

        expect(response.status).toBe(403);

        const validatedError = validateAndFormatData(errorResponseSchema, response.body);
        expect(validatedError.success).toBe(false);
        expect(validatedError.code).toBe('403ISF0000'); // Forbidden

        if (process.env.DEBUG_TESTS === 'true') {
          // eslint-disable-next-line no-console
          console.log('✅ Non-existent account book access properly rejected with 403');
        }
      });
    });

    /**
     * Info: (20250718 - Shirley) Test Case 6.3: Input Validation Failure Cases
     */
    describe('6.3 Input Validation Failure Cases', () => {
      test('should reject invalid reportType parameter', async () => {
        await authenticatedHelper.ensureAuthenticated();
        const cookies = authenticatedHelper.getCurrentSession();

        const currentTimestamp = Math.floor(Date.now() / 1000);
        const startDate = currentTimestamp - 86400 * 365;
        const endDate = currentTimestamp + 86400 * 30;

        const response = await reportClient
          .get(`/api/v2/account_book/${accountBookId}/report`)
          .query({
            reportType: 'completely_invalid_report_type',
            startDate: startDate.toString(),
            endDate: endDate.toString(),
            language: 'en',
          })
          .set('Cookie', cookies.join('; '));

        expect(response.status).toBe(422);

        const validatedError = validateAndFormatData(errorResponseSchema, response.body);
        expect(validatedError.success).toBe(false);
        expect(validatedError.code).toBe('422ISF0000'); // Invalid input parameter

        if (process.env.DEBUG_TESTS === 'true') {
          // eslint-disable-next-line no-console
          console.log('✅ Invalid reportType properly rejected with 422');
        }
      });

      // TODO: (20250718 - Shirley) It'll succeed if we test date range validation by startDate and endDate parameters
      xtest('should reject invalid date range (endDate < startDate)', async () => {
        await authenticatedHelper.ensureAuthenticated();
        const cookies = authenticatedHelper.getCurrentSession();

        const currentTimestamp = Math.floor(Date.now() / 1000);
        const startDate = currentTimestamp + 86400 * 30; // 30 days in future
        const endDate = currentTimestamp - 86400 * 365; // 1 year ago (invalid: endDate < startDate)

        const response = await reportClient
          .get(`/api/v2/account_book/${accountBookId}/report`)
          .query({
            reportType: FinancialReportTypesKey.comprehensive_income_statement,
            startDate: startDate.toString(),
            endDate: endDate.toString(),
            language: 'en',
          })
          .set('Cookie', cookies.join('; '));

        expect(response.status).toBe(422);

        const validatedError = validateAndFormatData(errorResponseSchema, response.body);
        expect(validatedError.success).toBe(false);
        expect(validatedError.code).toBe('422ISF0000');

        if (process.env.DEBUG_TESTS === 'true') {
          // eslint-disable-next-line no-console
          console.log('✅ Invalid date range (endDate < startDate) properly rejected with 422');
        }
      });

      test('should reject missing required parameters', async () => {
        await authenticatedHelper.ensureAuthenticated();
        const cookies = authenticatedHelper.getCurrentSession();

        const response = await reportClient
          .get(`/api/v2/account_book/${accountBookId}/report`)
          .query({
            // Info: (20250718 - Shirley) Missing reportType, startDate, endDate parameters
            language: 'en',
          })
          .set('Cookie', cookies.join('; '));

        expect(response.status).toBe(422);

        const validatedError = validateAndFormatData(errorResponseSchema, response.body);
        expect(validatedError.success).toBe(false);
        expect(validatedError.code).toBe('422ISF0000');

        if (process.env.DEBUG_TESTS === 'true') {
          // eslint-disable-next-line no-console
          console.log('✅ Missing required parameters properly rejected with 422');
        }
      });

      // TODO: (20250718 - Shirley) It'll succeed if we test language code validation by language parameter
      xtest('should reject invalid language code', async () => {
        await authenticatedHelper.ensureAuthenticated();
        const cookies = authenticatedHelper.getCurrentSession();

        const currentTimestamp = Math.floor(Date.now() / 1000);
        const startDate = currentTimestamp - 86400 * 365;
        const endDate = currentTimestamp + 86400 * 30;

        const response = await reportClient
          .get(`/api/v2/account_book/${accountBookId}/report`)
          .query({
            reportType: FinancialReportTypesKey.comprehensive_income_statement,
            startDate: startDate.toString(),
            endDate: endDate.toString(),
            language: 'invalid_language_code',
          })
          .set('Cookie', cookies.join('; '));

        expect(response.status).toBe(422);

        const validatedError = validateAndFormatData(errorResponseSchema, response.body);
        expect(validatedError.success).toBe(false);
        expect(validatedError.code).toBe('422ISF0000');

        if (process.env.DEBUG_TESTS === 'true') {
          // eslint-disable-next-line no-console
          console.log('✅ Invalid language code properly rejected with 422');
        }
      });

      test('should reject non-numeric date values', async () => {
        await authenticatedHelper.ensureAuthenticated();
        const cookies = authenticatedHelper.getCurrentSession();

        const response = await reportClient
          .get(`/api/v2/account_book/${accountBookId}/report`)
          .query({
            reportType: FinancialReportTypesKey.comprehensive_income_statement,
            startDate: 'not-a-number',
            endDate: 'also-not-a-number',
            language: 'en',
          })
          .set('Cookie', cookies.join('; '));

        expect(response.status).toBe(422);

        const validatedError = validateAndFormatData(errorResponseSchema, response.body);
        expect(validatedError.success).toBe(false);
        expect(validatedError.code).toBe('422ISF0000');

        if (process.env.DEBUG_TESTS === 'true') {
          // eslint-disable-next-line no-console
          console.log('✅ Non-numeric date values properly rejected with 422');
        }
      });
    });

    /**
     * Info: (20250718 - Shirley) Test Case 6.4: Business Logic Failure Cases
     */
    describe('6.4 Business Logic Failure Cases', () => {
      test('should handle account book with no accounting data gracefully', async () => {
        await authenticatedHelper.ensureAuthenticated();
        const cookies = authenticatedHelper.getCurrentSession();

        // Info: (20250718 - Shirley) Create a new account book with no vouchers/transactions
        const emptyTestCompanyData = {
          ...testCompanyData,
          name: 'Empty Test Company 空資料測試公司',
          taxId: (Math.floor(Math.random() * 90000000) + 10000000).toString(),
          teamId,
        };

        const createResponse = await createAccountBookClient
          .post(`/api/v2/user/${currentUserId}/account_book`)
          .send(emptyTestCompanyData)
          .set('Cookie', cookies.join('; '));

        expect(createResponse.status).toBe(200);
        const emptyAccountBookId = createResponse.body.payload.id;

        // Info: (20250718 - Shirley) Try to generate income statement for empty account book
        const emptyReportClient = createTestClient({
          handler: reportHandler,
          routeParams: { accountBookId: emptyAccountBookId.toString() },
        });

        const currentTimestamp = Math.floor(Date.now() / 1000);
        const startDate = currentTimestamp - 86400 * 365;
        const endDate = currentTimestamp + 86400 * 30;

        const response = await emptyReportClient
          .get(`/api/v2/account_book/${emptyAccountBookId}/report`)
          .query({
            reportType: FinancialReportTypesKey.comprehensive_income_statement,
            startDate: startDate.toString(),
            endDate: endDate.toString(),
            language: 'en',
          })
          .set('Cookie', cookies.join('; '));

        // Info: (20250718 - Shirley) Should return 200 with empty results, not an error
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.payload.reportType).toBe(ReportSheetType.INCOME_STATEMENT);

        // Info: (20250718 - Shirley) Validate that empty report structure is still valid
        const { isOutputDataValid, outputData } = validateOutputData(
          APIName.REPORT_GET_V2,
          response.body.payload
        );
        expect(isOutputDataValid).toBe(true);
        expect(outputData?.company).toBeDefined();
        expect(outputData?.general).toBeDefined();
        expect(outputData?.details).toBeDefined();
        expect(Array.isArray(outputData?.general)).toBe(true);
        expect(Array.isArray(outputData?.details)).toBe(true);
      });
    });

    /**
     * Info: (20250718 - Shirley) Test Case 6.5: Edge Cases and Boundary Conditions
     */
    describe('6.5 Edge Cases and Boundary Conditions', () => {
      test('should handle extremely large date ranges', async () => {
        await authenticatedHelper.ensureAuthenticated();
        const cookies = authenticatedHelper.getCurrentSession();

        // Info: (20250718 - Shirley) Test with very large date range (10 years)
        const currentTimestamp = Math.floor(Date.now() / 1000);
        const startDate = currentTimestamp - 86400 * 365 * 10; // 10 years ago
        const endDate = currentTimestamp + 86400 * 365 * 10; // 10 years in future

        const response = await reportClient
          .get(`/api/v2/account_book/${accountBookId}/report`)
          .query({
            reportType: FinancialReportTypesKey.comprehensive_income_statement,
            startDate: startDate.toString(),
            endDate: endDate.toString(),
            language: 'en',
          })
          .set('Cookie', cookies.join('; '));

        // Info: (20250718 - Shirley) Should handle large date ranges gracefully
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);

        if (process.env.DEBUG_TESTS === 'true') {
          // eslint-disable-next-line no-console
          console.log('✅ Large date range handled gracefully');
        }
      });

      test('should handle same start and end date', async () => {
        await authenticatedHelper.ensureAuthenticated();
        const cookies = authenticatedHelper.getCurrentSession();

        const currentTimestamp = Math.floor(Date.now() / 1000);
        const sameDate = currentTimestamp;

        const response = await reportClient
          .get(`/api/v2/account_book/${accountBookId}/report`)
          .query({
            reportType: FinancialReportTypesKey.comprehensive_income_statement,
            startDate: sameDate.toString(),
            endDate: sameDate.toString(),
            language: 'en',
          })
          .set('Cookie', cookies.join('; '));

        // Info: (20250718 - Shirley) Should handle same start/end date
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);

        if (process.env.DEBUG_TESTS === 'true') {
          // eslint-disable-next-line no-console
          console.log('✅ Same start and end date handled gracefully');
        }
      });

      test('should handle all supported language codes', async () => {
        await authenticatedHelper.ensureAuthenticated();
        const cookies = authenticatedHelper.getCurrentSession();

        const currentTimestamp = Math.floor(Date.now() / 1000);
        const startDate = currentTimestamp - 86400 * 365;
        const endDate = currentTimestamp + 86400 * 30;

        const supportedLanguages = ['en', 'tw', 'cn'];

        // eslint-disable-next-line no-restricted-syntax
        for (const language of supportedLanguages) {
          // eslint-disable-next-line no-await-in-loop
          const response = await reportClient
            .get(`/api/v2/account_book/${accountBookId}/report`)
            .query({
              reportType: FinancialReportTypesKey.comprehensive_income_statement,
              startDate: startDate.toString(),
              endDate: endDate.toString(),
              language,
            })
            .set('Cookie', cookies.join('; '));

          expect(response.status).toBe(200);
          expect(response.body.success).toBe(true);
          expect(response.body.payload.reportType).toBe(ReportSheetType.INCOME_STATEMENT);

          if (process.env.DEBUG_TESTS === 'true') {
            // eslint-disable-next-line no-console
            console.log(`✅ Language '${language}' handled successfully`);
          }
        }
      });
    });
  });
});
