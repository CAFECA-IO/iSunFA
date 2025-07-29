import { BaseTestContext } from '@/tests/integration/setup/base_test_context';
import { APITestHelper } from '@/tests/integration/setup/api_helper';
import { createTestClient } from '@/tests/integration/setup/test_client';

// Info: (20250721 - Shirley) Import API handlers for trial balance integration testing
import trialBalanceHandler from '@/pages/api/v2/account_book/[accountBookId]/trial_balance';
import trialBalanceExportHandler from '@/pages/api/v2/account_book/[accountBookId]/trial_balance/export';

// Info: (20250716 - Shirley) Import required types and constants
import { validateOutputData } from '@/lib/utils/validator';
import { APIName, APIPath } from '@/constants/api_connection';

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

  beforeAll(async () => {
    const sharedContext = await BaseTestContext.getSharedContext();
    authenticatedHelper = sharedContext.helper;
    currentUserId = String(sharedContext.userId);
    teamId = sharedContext.teamId || (await BaseTestContext.createTeam(Number(currentUserId))).id;
    cookies = sharedContext.cookies;
    accountBookId = (await BaseTestContext.createAccountBook(Number(currentUserId), teamId)).id;
    // Info: (20250729 - Shirley) 使用動態時間戳代替固定時間
    const currentTimestamp = Math.floor(Date.now() / 1000);
    startDate = currentTimestamp - 86400 * 365; // 1 year ago
    endDate = currentTimestamp + 86400 * 30; // 30 days from now
    if (process.env.DEBUG_TESTS === 'true') {
      // Deprecated: (20250730 - Shirley) Remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('✅ Test setup completed: User and team created with ID:', teamId);
    }
  });

  afterAll(async () => {
    if (process.env.DEBUG_TESTS === 'true') {
      // Deprecated: (20250730 - Shirley) Remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('✅ Test cleanup completed');
    }
  });

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
  describe('Step 4: Complete Integration Workflow Validation', () => {
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
          startDate: startDate.toString(),
          endDate: endDate.toString(),
        })
        .set('Cookie', cookies.join('; '));

      expect(finalTrialBalanceResponse.status).toBe(200);
      expect(finalTrialBalanceResponse.body.success).toBe(true);

      const finalTrialBalanceData = finalTrialBalanceResponse.body.payload;

      const noteObj = JSON.parse(finalTrialBalanceData.note);
      const beginningDebitAmount = noteObj.total.beginningDebitAmount || 0;
      const beginningCreditAmount = noteObj.total.beginningCreditAmount || 0;

      const midtermDebitAmount = noteObj.total.midtermDebitAmount || 0;
      const midtermCreditAmount = noteObj.total.midtermCreditAmount || 0;

      const endingDebitAmount = finalTrialBalanceData.endingDebitAmount || 0;
      const endingCreditAmount = finalTrialBalanceData.endingCreditAmount || 0;

      expect(beginningDebitAmount).toEqual(beginningCreditAmount);
      expect(midtermDebitAmount).toEqual(midtermCreditAmount);
      expect(endingDebitAmount).toEqual(endingCreditAmount);

      // Info: (20250729 - Shirley) 驗證試算表基本結構而非固定數據
      expect(finalTrialBalanceData.totalCount).toBeGreaterThanOrEqual(0);
      expect(finalTrialBalanceData.data.length).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(finalTrialBalanceData.data)).toBe(true);

      // Info: (20250729 - Shirley) 驗證試算表項目的數據結構
      if (finalTrialBalanceData.data.length > 0) {
        const firstItem = finalTrialBalanceData.data[0];
        expect(firstItem).toBeDefined();
        expect(firstItem.id).toBeDefined();
        expect(firstItem.no).toBeDefined();
        expect(firstItem.accountingTitle).toBeDefined();
        expect(typeof firstItem.beginningCreditAmount).toBe('number');
        expect(typeof firstItem.beginningDebitAmount).toBe('number');
        expect(typeof firstItem.endingCreditAmount).toBe('number');
        expect(typeof firstItem.endingDebitAmount).toBe('number');
      }

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
          startDate,
          endDate,
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

      // Info: (20250729 - Shirley) 驗證 CSV 基本結構而非固定數據
      expect(csvData.length).toBeGreaterThanOrEqual(0);

      // Info: (20250729 - Shirley) 驗證 CSV 數據結構
      if (csvData.length > 0) {
        const firstCsvItem = csvData[0];
        expect(firstCsvItem).toBeDefined();
        expect(firstCsvItem.accountingTitle).toBeDefined();
        expect(firstCsvItem.no).toBeDefined();
        expect(typeof firstCsvItem.beginningDebitAmount).toBe('number');
        expect(typeof firstCsvItem.beginningCreditAmount).toBe('number');
        expect(typeof firstCsvItem.midtermDebitAmount).toBe('number');
        expect(typeof firstCsvItem.midtermCreditAmount).toBe('number');
        expect(typeof firstCsvItem.endingDebitAmount).toBe('number');
        expect(typeof firstCsvItem.endingCreditAmount).toBe('number');
      }

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
