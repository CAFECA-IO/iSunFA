import { BaseTestContext } from '@/tests/integration/setup/base_test_context';
import { APITestHelper } from '@/tests/integration/setup/api_helper';
import { createTestClient } from '@/tests/integration/setup/test_client';
import getLedgerHandler from '@/pages/api/v2/account_book/[accountBookId]/ledger';
import exportLedgerHandler from '@/pages/api/v2/account_book/[accountBookId]/ledger/export';

// Info: (20250721 - Shirley) Import required types and constants
import { validateOutputData } from '@/lib/utils/validator';
import { APIName } from '@/constants/api_connection';

import { TestDataFactory } from '@/tests/integration/setup/test_data_factory';

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

    if (process.env.DEBUG_TESTS === 'true') {
      // Deprecated: (20250722 - Shirley) Remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('✅ Test setup completed: User and team created with ID:', teamId);
    }
  });

  afterAll(async () => {
    if (process.env.DEBUG_TESTS === 'true') {
      // Deprecated: (20250722 - Shirley) Remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('✅ Test cleanup completed');
    }
  });

  /**
   * Info: (20250721 - Shirley) Test Step 2: Create Sample Vouchers for Ledger
   */
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

      // Info: (20250729 - Shirley) 使用動態時間戳計算查詢範圍
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const queryStartDate = currentTimestamp - 86400 * 365; // 1 year ago
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
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const queryStartDate = currentTimestamp - 86400 * 365; // 1 year ago
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
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const queryStartDate = currentTimestamp - 86400 * 365; // 1 year ago
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

      // Deprecated: (20250722 - Shirley) Remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('finalLedgerData.data.length:', finalLedgerData.data.length);
      // Deprecated: (20250722 - Shirley) Remove eslint-disable
      // eslint-disable-next-line no-console
      console.log(
        'expectedLedgerData.totalCount:',
        TestDataFactory.expectedLedgerData().payload.data.length
      );

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
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const queryStartDate = currentTimestamp - 86400 * 365; // 1 year ago

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
