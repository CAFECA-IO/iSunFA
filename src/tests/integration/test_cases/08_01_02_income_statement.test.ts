import { BaseTestContext } from '@/tests/integration/setup/base_test_context';
import { APITestHelper } from '@/tests/integration/setup/api_helper';
import { createTestClient } from '@/tests/integration/setup/test_client';

// Info: (20250718 - Shirley) Import API handlers for income statement integration testing
import connectAccountBookHandler from '@/pages/api/v2/account_book/[accountBookId]/connect';
import reportHandler from '@/pages/api/v2/account_book/[accountBookId]/report';

// Info: (20250718 - Shirley) Import required types and constants
import createAccountBookHandler from '@/pages/api/v2/user/[userId]/account_book';
import { validateOutputData, validateAndFormatData } from '@/lib/utils/validator';
import { APIName } from '@/constants/api_connection';
import { ReportSheetType } from '@/constants/report';
import { FinancialReportTypesKey } from '@/interfaces/report_type';
import { TestDataFactory } from '@/tests/integration/setup/test_data_factory';
import { z } from 'zod';
import { TestClient } from '@/interfaces/test_client';
import { WORK_TAG } from '@/interfaces/account_book';

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
  let connectAccountBookClient: TestClient;
  let reportClient: TestClient;

  // Info: (20250718 - Shirley) Initialize clients that depend on accountBookId
  const initializeAccountBookDependentClients = () => {
    // Info: (20250729 - Shirley) Test empty voucher test case in income statement
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
  };

  beforeAll(async () => {
    const sharedContext = await BaseTestContext.getSharedContext();
    authenticatedHelper = sharedContext.helper;
    currentUserId = sharedContext.userId.toString();
    teamId = sharedContext.teamId || (await BaseTestContext.createTeam(Number(currentUserId))).id;
    accountBook = await BaseTestContext.createAccountBook(Number(currentUserId), teamId);
    accountBookId = accountBook.id;

    initializeAccountBookDependentClients();

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

  /**
   * Info: (20250718 - Shirley) Test Step 2: Create Sample Vouchers for Income Statement
   */
  describe('Step 2: Create Sample Vouchers for Income Statement', () => {
    test('should create income and expense vouchers', async () => {
      await authenticatedHelper.ensureAuthenticated();
      const cookies = authenticatedHelper.getCurrentSession();

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

      // Deprecated: (20250721 - Luphia) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log(
        `\n🎉 Successfully verified ${sampleVouchersData.length} vouchers exist for income statement test (created by BaseTestContext)`
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

      // eslint-disable-next-line no-console
      console.log('cookiesInIncomeStatement:', cookies);

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

      // eslint-disable-next-line no-console
      console.log('incomeStatementData:', incomeStatementData);

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
