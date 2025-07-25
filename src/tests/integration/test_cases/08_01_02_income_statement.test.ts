import { BaseTestContext } from '@/tests/integration/setup/base_test_context';
import { APITestHelper } from '@/tests/integration/setup/api_helper';
import { createTestClient } from '@/tests/integration/setup/test_client';

// Info: (20250718 - Shirley) Import API handlers for income statement integration testing
// import getAccountBookHandler from '@/pages/api/v2/account_book/[accountBookId]';
import connectAccountBookHandler from '@/pages/api/v2/account_book/[accountBookId]/connect';
import reportHandler from '@/pages/api/v2/account_book/[accountBookId]/report';
import voucherPostHandler from '@/pages/api/v2/account_book/[accountBookId]/voucher';

// Info: (20250718 - Shirley) Import required types and constants
import createAccountBookHandler from '@/pages/api/v2/user/[userId]/account_book';
// import { WORK_TAG } from '@/interfaces/account_book';
// import { LocaleKey } from '@/constants/normal_setting';
// import { CurrencyType } from '@/constants/currency';
import { validateOutputData, validateAndFormatData } from '@/lib/utils/validator';
import { APIName } from '@/constants/api_connection';
import { ReportSheetType } from '@/constants/report';
import { FinancialReportTypesKey } from '@/interfaces/report_type';
import { TestDataFactory } from '@/tests/integration/setup/test_data_factory';
import { z } from 'zod';
import { TestClient } from '@/interfaces/test_client';
import { WORK_TAG } from '@/interfaces/account_book';

/** Info: (20250722 - Tzuhan) replace by jest_up
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
 */

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
  let accountBook: { id: number; name: string; taxId: string };
  let accountBookId: number;

  // Info: (20250718 - Shirley) Shared test clients - defined once and reused throughout the test suite
  let createAccountBookClient: TestClient;
  // let getAccountBookClient: TestClient;
  let connectAccountBookClient: TestClient;
  let reportClient: TestClient;
  let voucherPostClient: TestClient;

  /** Info: (20250722 - Tzuhan) replaced by BaseTestContent
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
  */

  // Info: (20250718 - Shirley) Initialize clients that depend on accountBookId
  const initializeAccountBookDependentClients = () => {
    // getAccountBookClient = createTestClient({
    //   handler: getAccountBookHandler,
    //   routeParams: { accountBookId: accountBookId.toString() },
    // });
    // Info: (20250718 - Shirley) Initialize shared test clients once
    createAccountBookClient = createTestClient({
      handler: createAccountBookHandler,
      routeParams: { userId: currentUserId },
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

  beforeAll(async () => {
    const sharedContext = await BaseTestContext.getSharedContext();
    authenticatedHelper = sharedContext.helper;
    currentUserId = sharedContext.userId.toString();
    teamId = sharedContext.teamId || (await BaseTestContext.createTeam(Number(currentUserId))).id;
    accountBook = await authenticatedHelper.createAccountBook(Number(currentUserId), teamId);
    accountBookId = accountBook.id;

    initializeAccountBookDependentClients();
    /** Info: (20250722 - Tzuhan) replaced by BaseTestContent
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
    */

    if (process.env.DEBUG_TESTS === 'true') {
      // Deprecated: (20250721 - Luphia) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('✅ Test setup completed: User and team created with ID:', teamId);
    }
  });

  afterAll(async () => {
    // Info: (20250718 - Shirley) Cleanup test data
    await authenticatedHelper.clearSession();

    if (process.env.DEBUG_TESTS === 'true') {
      // Deprecated: (20250721 - Luphia) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('✅ Test cleanup completed');
    }
  });

  /** Info: (20250722 - Tzuhan) replaced by BaseTestContent
  // Info: (20250718 - Shirley) Test Step 1: Create Account Book
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
        // Deprecated: (20250721 - Luphia) remove eslint-disable
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
        // Deprecated: (20250721 - Luphia) remove eslint-disable
        // eslint-disable-next-line no-console
        console.log('✅ Account book connection verified');
      }
    });
  });
  */

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

        // Deprecated: (20250721 - Luphia) remove eslint-disable
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
          // Deprecated: (20250721 - Luphia) remove eslint-disable
          // eslint-disable-next-line no-console
          console.log('✅ Voucher created successfully with ID:', response.body.payload.id);
        } else {
          // Deprecated: (20250721 - Luphia) remove eslint-disable
          // eslint-disable-next-line no-console
          console.log('❌ Voucher creation failed:', response.body.message);
        }
      }

      // Info: (20250718 - Shirley) Verify all vouchers were created
      expect(createdVouchers.length).toBe(sampleVouchersData.length);

      // Deprecated: (20250721 - Luphia) remove eslint-disable
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
      const startDate = currentTimestamp - 86400 * 365; // Info: (20250721 - Shirley) 1 year ago
      const endDate = currentTimestamp + 86400 * 30; // Info: (20250721 - Shirley) 30 days from now

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
        // Deprecated: (20250721 - Luphia) remove eslint-disable
        // eslint-disable-next-line no-console
        console.log('✅ Income statement report generated successfully');
        // Deprecated: (20250721 - Luphia) remove eslint-disable
        // eslint-disable-next-line no-console
        console.log(`   - Report Type: ${outputData?.reportType}`);
      }
    });

    test('should validate income statement data structure and calculations', async () => {
      await authenticatedHelper.ensureAuthenticated();
      const cookies = authenticatedHelper.getCurrentSession();

      const currentTimestamp = Math.floor(Date.now() / 1000);
      const startDate = currentTimestamp - 86400 * 365; // Info: (20250721 - Shirley) 1 year ago
      const endDate = currentTimestamp + 86400 * 30; // Info: (20250721 - Shirley) 30 days from now

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
      expect(incomeStatementData.company.name).toBe(accountBook.name);
      expect(incomeStatementData.company.code).toBe(accountBook.taxId);

      // Info: (20250718 - Shirley) Validate date ranges
      expect(incomeStatementData.curDate).toBeDefined();
      expect(incomeStatementData.preDate).toBeDefined();
      expect(incomeStatementData.curDate.from).toBe(startDate);
      expect(incomeStatementData.curDate.to).toBe(endDate);

      // Info: (20250718 - Shirley) Validate account data structure
      expect(Array.isArray(incomeStatementData.general)).toBe(true);
      expect(Array.isArray(incomeStatementData.details)).toBe(true);
    });
  });

  /**
   * Info: (20250718 - Shirley) Test Step 4: Comprehensive Error Handling and Edge Cases
   */
  describe('Step 4: Comprehensive Error Handling and Edge Cases', () => {
    // Info: (20250718 - Shirley) Define standard error response schema for validation
    const errorResponseSchema = z.object({
      success: z.literal(false),
      code: z.string(),
      message: z.string(),
      payload: z.null(),
    });

    /**
     * Info: (20250718 - Shirley) Test Case 4.1: Authentication Failure Cases
     */
    describe('4.1 Authentication Failure Cases', () => {
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
        expect(validatedError.code).toBe('401ISF0000'); // Info: (20250721 - Shirley) Unauthorized access

        if (process.env.DEBUG_TESTS === 'true') {
          // Deprecated: (20250721 - Luphia) remove eslint-disable
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
      });
    });

    /**
     * Info: (20250718 - Shirley) Test Case 4.2: Input Validation Failure Cases
     */
    describe('4.2 Input Validation Failure Cases', () => {
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
      });
    });

    /**
     * Info: (20250718 - Shirley) Test Case 4.3: Business Logic and Edge Cases
     */
    describe('4.3 Business Logic and Edge Cases', () => {
      test('should handle account book with no accounting data gracefully', async () => {
        await authenticatedHelper.ensureAuthenticated();
        const cookies = authenticatedHelper.getCurrentSession();

        // Info: (20250718 - Shirley) Create a new account book with no vouchers/transactions
        const emptyTestCompanyData = {
          name: 'Empty Test Company 空資料測試公司',
          taxId: (Math.floor(Math.random() * 90000000) + 10000000).toString(),
          teamId,
          tag: WORK_TAG.ALL,
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

      test('should handle extremely large date ranges', async () => {
        await authenticatedHelper.ensureAuthenticated();
        const cookies = authenticatedHelper.getCurrentSession();

        // Info: (20250718 - Shirley) Test with very large date range (10 years)
        const currentTimestamp = Math.floor(Date.now() / 1000);
        const startDate = currentTimestamp - 86400 * 365 * 10; // Info: (20250721 - Shirley) 10 years ago
        const endDate = currentTimestamp + 86400 * 365 * 10; // Info: (20250721 - Shirley) 10 years in future

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
          // Deprecated: (20250721 - Luphia) remove eslint-disable
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
          // Deprecated: (20250721 - Luphia) remove eslint-disable
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

        // Deprecated: (20250721 - Luphia) remove eslint-disable
        // eslint-disable-next-line no-restricted-syntax
        for (const language of supportedLanguages) {
          // Deprecated: (20250721 - Luphia) remove eslint-disable
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
            // Deprecated: (20250721 - Luphia) remove eslint-disable
            // eslint-disable-next-line no-console
            console.log(`✅ Language '${language}' handled successfully`);
          }
        }
      });
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

      expect(finalIncomeStatementResponse.status).toBe(200);
      expect(finalIncomeStatementResponse.body.success).toBe(true);
      expect(finalIncomeStatementResponse.body.payload.reportType).toBe(
        ReportSheetType.INCOME_STATEMENT
      );

      const finalIncomeStatementData = finalIncomeStatementResponse.body.payload;

      // Info: (20250721 - Shirley) Filter non-zero items for validation
      const nonZeroItems = finalIncomeStatementData.details.filter(
        (item: {
          curPeriodAmount: number;
          prePeriodAmount: number;
          children: {
            curPeriodAmount: number;
            prePeriodAmount: number;
          }[];
        }) =>
          (item.curPeriodAmount && item.curPeriodAmount !== 0) ||
          (item.prePeriodAmount && item.prePeriodAmount !== 0) ||
          item.children.some((child) => child.curPeriodAmount !== 0 || child.prePeriodAmount !== 0)
      );
      const nonZeroGeneralItems = finalIncomeStatementData.general.filter(
        (item: {
          curPeriodAmount: number;
          prePeriodAmount: number;
          children: {
            curPeriodAmount: number;
            prePeriodAmount: number;
          }[];
        }) =>
          (item.curPeriodAmount && item.curPeriodAmount !== 0) ||
          (item.prePeriodAmount && item.prePeriodAmount !== 0) ||
          item.children.some((child) => child.curPeriodAmount !== 0 || child.prePeriodAmount !== 0)
      );

      const allNonZeroItems = nonZeroItems.concat(nonZeroGeneralItems);

      // Info: (20250721 - Shirley) Get expected income statement items from TestDataFactory
      const expectedBasicChecks = TestDataFactory.expectedIncomeStatementItems();

      expectedBasicChecks.forEach((expectedItem) => {
        expect(allNonZeroItems).toContainEqual(expect.objectContaining(expectedItem));
      });

      // Info: (20250718 - Shirley) Income statement should have proper structure
      expect(finalIncomeStatementData.company).toBeDefined();
      expect(finalIncomeStatementData.curDate).toBeDefined();
      expect(finalIncomeStatementData.preDate).toBeDefined();
      expect(finalIncomeStatementData.general).toBeDefined();
      expect(finalIncomeStatementData.details).toBeDefined();
    });
  });
});
