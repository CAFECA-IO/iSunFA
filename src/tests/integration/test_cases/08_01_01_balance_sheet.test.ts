import { BaseTestContext } from '@/tests/integration/setup/base_test_context';
import { APIName } from '@/constants/api_connection';
import { validateOutputData, validateAndFormatData } from '@/lib/utils/validator';
import { APITestHelper } from '@/tests/integration/setup/api_helper';
import { createTestClient } from '@/tests/integration/setup/test_client';

// Info: (20250717 - Julian) API Handler Imports
// import connectAccountBookHandler from '@/pages/api/v2/account_book/[accountBookId]/connect';
// import createAccountBookHandler from '@/pages/api/v2/user/[userId]/account_book';
import getReportHandler from '@/pages/api/v2/account_book/[accountBookId]/report';
// import getAccountBookHandler from '@/pages/api/v2/account_book/[accountBookId]';
// import voucherPostHandler from '@/pages/api/v2/account_book/[accountBookId]/voucher';

// Info: (20250717 - Julian) 測試用 constants
import { ReportSheetType } from '@/constants/report';
import { LocaleKey } from '@/constants/normal_setting';
// import { WORK_TAG } from '@/interfaces/account_book';
// import { CurrencyType } from '@/constants/currency';
import { TestClient } from '@/interfaces/test_client';
import { TestDataFactory } from '@/tests/integration/setup/test_data_factory';
import { z } from 'zod';
// import { WORK_TAG } from '@/interfaces/account_book';

describe('Integration Test - Balance Sheet (Test Case 8.1.1)', () => {
  let authenticatedHelper: APITestHelper;
  let currentUserId: string;
  let teamId: number;
  let accountBook: { id: number; name: string; taxId: string };
  let accountBookId: number;

  // Info: (20250721 - Julian) test clients
  // let createAccountBookClient: TestClient;
  // let getAccountBookClient: TestClient;
  let connectAccountBookClient: TestClient;
  let getBalanceSheetClient: TestClient;
  let voucherPostClient: TestClient;

  /** Info: (20250722 - Tzuhan) replaced by BaseTestContent
  const randomNumber = Math.floor(Math.random() * 90000000) + 10000000;

  // Info: (20250717 - Julian) 借用 Shirley 的 Test company data
  const testCompanyData = {
    name: 'Balance Sheet Test Company 資產負債表測試公司',
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

  // Info: (20250721 - Julian) 基於 accountBookId 的 client 初始化
  const initializeAccountBookDependentClients = () => {
    // getAccountBookClient = createTestClient({
    //   handler: getAccountBookHandler,
    //   routeParams: { accountBookId: accountBookId.toString() },
    // });
    // connectAccountBookClient = createTestClient({
    //   handler: connectAccountBookHandler,
    //   routeParams: { accountBookId: accountBookId.toString() },
    // });
    // getBalanceSheetClient = createTestClient({
    //   handler: getReportHandler,
    //   routeParams: { accountBookId: accountBookId.toString() },
    // });
    // voucherPostClient = createTestClient({
    //   handler: voucherPostHandler,
    //   routeParams: { accountBookId: accountBookId.toString() },
    // });
  };

  beforeAll(async () => {
    const sharedContext = await BaseTestContext.getSharedContext();
    authenticatedHelper = sharedContext.helper;
    currentUserId = sharedContext.userId.toString();
    teamId = sharedContext.teamId || (await BaseTestContext.createTeam(sharedContext.userId)).id;
    accountBook = await authenticatedHelper.createAccountBook(Number(currentUserId), teamId);
    accountBookId = accountBook.id;

    // Info: (20250721 - Julian) 建立測試用的帳本
    const clients = await authenticatedHelper.getAccountBookClients(accountBookId);
    // createAccountBookClient = clients.createAccountBookClient;
    connectAccountBookClient = clients.connectAccountBookClient;
    voucherPostClient = clients.voucherPostClient;
    getBalanceSheetClient = clients.reportClient;
    /** Info: (20250722 - Tzuhan) replaced by BaseTestContent
    // Info: (20250717 - Julian) 設定 Helper
    authenticatedHelper = await APITestHelper.createHelper({ autoAuth: true });

    // Info: (20250717 - Julian) 取得測試用的使用者資訊
    const statusResponse = await authenticatedHelper.getStatusInfo();
    const userData = statusResponse.body.payload?.user as { id?: number };
    currentUserId = userData?.id?.toString() || '1';

    // Info: (20250717 - Julian) 確保登入流程正確
    await authenticatedHelper.agreeToTerms();
    await authenticatedHelper.createUserRole();
    await authenticatedHelper.selectUserRole();

    // Info: (20250717 - Julian) 取得測試用的團隊資訊
    const teamResponse = await authenticatedHelper.createTeam();
    const teamData = teamResponse.body.payload?.team as { id?: number };
    teamId = teamData?.id || 0;

    // Info: (20250717 - Julian) 將測試用的公司資料加入團隊
    testCompanyData.teamId = teamId;

    // Info: (20250717 - Julian) 刷新 session
    await authenticatedHelper.getStatusInfo();

    // Info: (20250721 - Julian) 建立測試用的帳本
    createAccountBookClient = createTestClient({
      handler: createAccountBookHandler,
      routeParams: { userId: currentUserId },
    });

    if (process.env.DEBUG_TESTS === 'true') {
      // Deprecated: (20250717 - Julian) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('✅ Test setup completed: User and team created with ID:', teamId);
    }
    */

    // Info: (20250721 - Julian) 有了 accountBookId 後就初始化相關的 client
    initializeAccountBookDependentClients();
  });

  afterAll(async () => {
    // Info: (20250717 - Julian) 清理測試資料
    await authenticatedHelper.clearSession();

    if (process.env.DEBUG_TESTS === 'true') {
      // Deprecated: (20250717 - Julian) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('✅ Test cleanup completed');
    }
  });

  /**
   * Info: (20250717 - Julian) Test Step 1: Create Account Book
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

      // Info: (20250721 - Julian) 驗證 output 資料結構
      const { isOutputDataValid, outputData } = validateOutputData(
        APIName.CREATE_ACCOUNT_BOOK,
        response.body.payload
      );
      expect(isOutputDataValid).toBe(true);
      expect(outputData?.id).toBeDefined();
      expect(typeof outputData?.id).toBe('number');

      accountBookId = response.body.payload.id;

      // Info: (20250721 - Julian) 有了 accountBookId 後就初始化相關的 client
      initializeAccountBookDependentClients();

      if (process.env.DEBUG_TESTS === 'true') {
        // Deprecated: (20250721 - Julian) remove eslint-disable
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
        // Deprecated: (20250721 - Julian) remove eslint-disable
        // eslint-disable-next-line no-console
        console.log('✅ Account book connection verified');
      }
    });
  });
   */

  /**
   * Info: (20250721 - Julian) Test Step 2: Create Sample Vouchers for Income Statement
   */
  describe('Step 2: Create Sample Vouchers for Income Statement', () => {
    it('should create income and expense vouchers', async () => {
      // Info: (20250717 - Julian) 確保登入流程正確
      await authenticatedHelper.ensureAuthenticated();
      const cookies = authenticatedHelper.getCurrentSession();

      const responseForConnect = await connectAccountBookClient
        .get(`/api/v2/account_book/${accountBookId}/connect`)
        .set('Cookie', cookies.join('; '))
        .expect(200);

      // // Info: (20250718 - Julian) 確認連結帳本成功
      expect(responseForConnect.body.success).toBe(true);
      expect(responseForConnect.body.payload).toBeDefined();

      // Info: (20250721 - Julian) 測試用的 voucher 資料
      const sampleVouchersData = TestDataFactory.sampleVoucherData();
      const createdVouchers = [];

      // Info: (20250721 - Julian) 逐一建立測試用的 voucher
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

        // Deprecated: (20250721 - Julian) remove eslint-disable
        // eslint-disable-next-line no-await-in-loop
        const response = await voucherPostClient
          .post(`/api/v2/account_book/${accountBookId}/voucher`)
          .send(voucherPayload)
          .set('Cookie', cookies.join('; '));

        // Deprecated: (20250721 - Julian) remove eslint-disable
        // eslint-disable-next-line no-console
        console.log(`=== VOUCHER ${i + 1} FOR INCOME STATEMENT POST RESULT ===`);
        // Deprecated: (20250721 - Julian) remove eslint-disable
        // eslint-disable-next-line no-console
        console.log('Status:', response.status);
        // Deprecated: (20250721 - Julian) remove eslint-disable
        // eslint-disable-next-line no-console
        console.log('Success:', response.body.success);
        // Deprecated: (20250721 - Julian) remove eslint-disable
        // eslint-disable-next-line no-console
        console.log('Type:', voucherData.type);
        // Deprecated: (20250721 - Julian) remove eslint-disable
        // eslint-disable-next-line no-console
        console.log('Note:', voucherData.note);
        // Deprecated: (20250721 - Julian) remove eslint-disable
        // eslint-disable-next-line no-console
        console.log('Line Items:', voucherData.lineItems.length);
        // Deprecated: (20250721 - Julian) remove eslint-disable
        // eslint-disable-next-line no-console
        console.log('Full Response:', JSON.stringify(response.body, null, 2));
        // Deprecated: (20250721 - Julian) remove eslint-disable
        // eslint-disable-next-line no-console
        console.log('=== END VOUCHER RESULT ===');

        if (response.status === 201) {
          createdVouchers.push({
            id: response.body.payload.id,
            type: voucherData.type,
            lineItems: voucherData.lineItems,
          });
          // Deprecated: (20250721 - Julian) remove eslint-disable
          // eslint-disable-next-line no-console
          console.log('✅ Voucher created successfully with ID:', response.body.payload.id);
        } else {
          // Deprecated: (20250721 - Julian) remove eslint-disable
          // eslint-disable-next-line no-console
          console.log('❌ Voucher creation failed:', response.body.message);
        }
      }

      // Info: (20250721 - Julian) 檢查是否成功建立所有 vouchers
      expect(createdVouchers.length).toBe(sampleVouchersData.length);

      // Deprecated: (20250721 - Julian) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log(
        `\n🎉 Successfully created ${createdVouchers.length} vouchers for balance sheet test.`
      );
    });
  });

  /**
   * Info: (20250721 - Julian) Test Step 3: Generate Balance Sheet Report
   */
  describe('Step 3: Generate Balance Sheet Report', () => {
    it('should generate balance sheet report with proper structure', async () => {
      // Info: (20250718 - Julian) 確保登入流程正確
      await authenticatedHelper.ensureAuthenticated();
      const cookies = authenticatedHelper.getCurrentSession();

      const currentTimestamp = Math.floor(Date.now() / 1000); // Info: (20250721 - Julian) 取得當前時間
      const startDate = currentTimestamp - 86400 * 365; // Info: (20250721 - Julian) 從現在起往前 365 天
      const endDate = currentTimestamp + 86400 * 30; // Info: (20250721 - Julian) 從現在起往後 30 天

      const response = await getBalanceSheetClient
        .get(`/api/v2/account_book/${accountBookId}/report`)
        .query({
          reportType: ReportSheetType.BALANCE_SHEET,
          startDate: startDate.toString(),
          endDate: endDate.toString(),
          language: LocaleKey.en,
        })
        .set('Cookie', cookies.join('; '));

      // Deprecated: (20250721 - Julian) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('=== BALANCE SHEET REPORT RESULT ===');
      // Deprecated: (20250721 - Julian) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('Status:', response.status);
      // Deprecated: (20250721 - Julian) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('Success:', response.body.success);
      // Deprecated: (20250721 - Julian) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('Code:', response.body.code);
      // Deprecated: (20250721 - Julian) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('Message:', response.body.message);
      // Deprecated: (20250721 - Julian) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('Report Type:', response.body.payload?.reportType);
      // Deprecated: (20250721 - Julian) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('Company:', response.body.payload?.company);
      // Deprecated: (20250721 - Julian) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('Current Period:', response.body.payload?.curDate);
      // Deprecated: (20250721 - Julian) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('Previous Period:', response.body.payload?.preDate);
      // Deprecated: (20250721 - Julian) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('General Items Count:', response.body.payload?.general?.length);
      // Deprecated: (20250721 - Julian) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('Detail Items Count:', response.body.payload?.details?.length);
      // Deprecated: (20250721 - Julian) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('Other Info:', response.body.payload?.otherInfo);
      // Deprecated: (20250721 - Julian) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('Full Response:', JSON.stringify(response.body, null, 2));
      // Deprecated: (20250721 - Julian) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('=== END BALANCE SHEET REPORT RESULT ===');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.payload).toBeDefined();
      expect(response.body.payload.reportType).toBe(ReportSheetType.BALANCE_SHEET);

      // Info: (20250718 - Julian) 驗證輸出資料結構
      const { isOutputDataValid, outputData } = validateOutputData(
        APIName.REPORT_GET_V2,
        response.body.payload
      );
      expect(isOutputDataValid).toBe(true);
      expect(outputData).toBeDefined();

      expect(outputData?.company).toBeDefined();
      expect(outputData?.reportType).toBe(ReportSheetType.BALANCE_SHEET);
      expect(outputData?.curDate).toBeDefined();
      expect(outputData?.preDate).toBeDefined();
      expect(outputData?.general).toBeDefined();
      expect(outputData?.details).toBeDefined();
      expect(Array.isArray(outputData?.general)).toBe(true);
      expect(Array.isArray(outputData?.details)).toBe(true);

      if (process.env.DEBUG_TESTS === 'true') {
        // Deprecated: (20250721 - Julian) remove eslint-disable
        // eslint-disable-next-line no-console
        console.log('✅ Balance sheet report generated successfully');
        // Deprecated: (20250721 - Julian) remove eslint-disable
        // eslint-disable-next-line no-console
        console.log(`   - Report Type: ${outputData?.reportType}`);
      }
    });

    it('should validate balance sheet report structure and calculations', async () => {
      // Info: (20250718 - Julian) 確保登入流程正確
      await authenticatedHelper.ensureAuthenticated();
      const cookies = authenticatedHelper.getCurrentSession();

      const currentTimestamp = Math.floor(Date.now() / 1000); // Info: (20250721 - Julian) 取得當前時間
      const startDate = currentTimestamp - 86400 * 365; // Info: (20250721 - Julian) 從現在起往前 365 天
      const endDate = currentTimestamp + 86400 * 30; // Info: (20250721 - Julian) 從現在起往後 30 天

      const response = await getBalanceSheetClient
        .get(`/api/v2/account_book/${accountBookId}/report`)
        .query({
          reportType: ReportSheetType.BALANCE_SHEET,
          startDate: startDate.toString(),
          endDate: endDate.toString(),
          language: LocaleKey.en,
        })
        .set('Cookie', cookies.join('; '));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const balanceSheetData = response.body.payload;

      // Info: (20250721 - Julian) 1️⃣ 驗證 reportType
      expect(balanceSheetData.reportType).toBe(ReportSheetType.BALANCE_SHEET);

      // Info: (20250721 - Julian) 2️⃣ 驗證 company
      expect(balanceSheetData.company).toBeDefined();
      expect(balanceSheetData.company.id).toBe(accountBookId);
      expect(balanceSheetData.company.code).toBe(accountBook.taxId);
      expect(balanceSheetData.company.name).toBe(accountBook.name);

      // Info: (20250721 - Julian) 3️⃣ 檢查 preDate 和 curDate 的範圍
      expect(balanceSheetData.preDate).toBeDefined();
      expect(balanceSheetData.curDate).toBeDefined();
      expect(balanceSheetData.curDate.from).toBe(startDate);
      expect(balanceSheetData.curDate.to).toBe(endDate);

      // Info: (20250721 - Julian) 4️⃣ 驗證 details 項目
      expect(Array.isArray(balanceSheetData.details)).toBe(true);
      expect(Array.isArray(balanceSheetData.details)).toBe(true);

      // Info: (20250721 - Julian) 5️⃣ 確認資產 = 負債 + 權益
      // ToDo: (20250721 - Julian) 計畫以後會從 DB 抽取出正確答案，再逐一驗證每個項目
      const totalAssets = balanceSheetData.general.find(
        // Deprecated: (20250721 - Julian) remove eslint-disable
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (item: any) => item.accountId === 1000
      ).curPeriodAmount;
      const totalLiabilitiesAndEquity = balanceSheetData.general.find(
        // Deprecated: (20250721 - Julian) remove eslint-disable
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (item: any) => item.accountId === 1035
      ).curPeriodAmount;

      expect(totalAssets).toBeDefined();
      expect(totalLiabilitiesAndEquity).toBeDefined();
      expect(totalAssets === totalLiabilitiesAndEquity).toBe(true);

      // Deprecated: (20250721 - Julian) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('\n=== BALANCE SHEET DETAILS VALIDATION ===');
      // Deprecated: (20250721 - Julian) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('📊 Report Summary:');
      // Deprecated: (20250721 - Julian) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log(
        `   Company: ${balanceSheetData.company.name} (${balanceSheetData.company.code})`
      );
      // Deprecated: (20250721 - Julian) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log(
        `   Period: ${new Date(startDate * 1000).toLocaleDateString()} to ${new Date(endDate * 1000).toLocaleDateString()}`
      );
      // Deprecated: (20250721 - Julian) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log(`   General Items: ${balanceSheetData.general.length}`);
      // Deprecated: (20250721 - Julian) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log(`   Detail Items: ${balanceSheetData.details.length}`);

      if (balanceSheetData.general.length > 0) {
        // Deprecated: (20250721 - Julian) remove eslint-disable
        // eslint-disable-next-line no-console
        console.log('\n💰 General Balance Sheet Items:');
        // Deprecated: (20250721 - Julian) remove eslint-disable
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        balanceSheetData.general.forEach((item: any, index: number) => {
          // Deprecated: (20250721 - Julian) remove eslint-disable
          // eslint-disable-next-line no-console
          console.log(`${index + 1}. ${item.no} - ${item.accountingTitle}`);
          // Deprecated: (20250721 - Julian) remove eslint-disable
          // eslint-disable-next-line no-console
          console.log(`   Current: ${item.curPeriodAmount?.toLocaleString() || 0}`);
          // Deprecated: (20250721 - Julian) remove eslint-disable
          // eslint-disable-next-line no-console
          console.log(`   Previous: ${item.prePeriodAmount?.toLocaleString() || 0}`);
        });
      }

      if (balanceSheetData.details.length > 0) {
        // Deprecated: (20250721 - Julian) remove eslint-disable
        // eslint-disable-next-line no-console
        console.log('\n💰 Detailed Balance Sheet Items:');
        // Deprecated: (20250721 - Julian) remove eslint-disable
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        balanceSheetData.general.forEach((item: any, index: number) => {
          // Deprecated: (20250721 - Julian) remove eslint-disable
          // eslint-disable-next-line no-console
          console.log(`${index + 1}. ${item.no} - ${item.accountingTitle}`);
          // Deprecated: (20250721 - Julian) remove eslint-disable
          // eslint-disable-next-line no-console
          console.log(`   Current: ${item.curPeriodAmount?.toLocaleString() || 0}`);
          // Deprecated: (20250721 - Julian) remove eslint-disable
          // eslint-disable-next-line no-console
          console.log(`   Previous: ${item.prePeriodAmount?.toLocaleString() || 0}`);
        });
      }

      // Deprecated: (20250721 - Julian) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('\n📈 Other Information:');
      // Deprecated: (20250721 - Julian) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('Other Info:', JSON.stringify(balanceSheetData.otherInfo, null, 2));
      // Deprecated: (20250721 - Julian) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('=== END BALANCE SHEET DETAILS VALIDATION ===');

      if (process.env.DEBUG_TESTS === 'true') {
        // Deprecated: (20250721 - Julian) remove eslint-disable
        // eslint-disable-next-line no-console
        console.log('✅ Balance sheet data structure validated successfully');
      }
    });
  });

  /**
   * Info: (20250721 - Julian) Test Step 4: Error Handling and Edge Cases
   */
  describe('Step 4: Error Handling and Edge Cases', () => {
    it('should handle invalid report type gracefully', async () => {
      // Info: (20250718 - Julian) 確保登入流程正確
      await authenticatedHelper.ensureAuthenticated();
      const cookies = authenticatedHelper.getCurrentSession();

      const currentTimestamp = Math.floor(Date.now() / 1000); // Info: (20250721 - Julian) 取得當前時間
      const startDate = currentTimestamp - 86400 * 365; // Info: (20250721 - Julian) 從現在起往前 365 天
      const endDate = currentTimestamp + 86400 * 30; // Info: (20250721 - Julian) 從現在起往後 30 天

      const response = await getBalanceSheetClient
        .get(`/api/v2/account_book/${accountBookId}/report`)
        .query({
          reportType: 'invalid_report_type',
          startDate: startDate.toString(),
          endDate: endDate.toString(),
          language: LocaleKey.en,
        })
        .set('Cookie', cookies.join('; '));

      // Deprecated: (20250721 - Julian) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('=== INVALID REPORT TYPE ERROR HANDLING ===');
      // Deprecated: (20250721 - Julian) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('Status:', response.status);
      // Deprecated: (20250721 - Julian) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('Success:', response.body.success);
      // Deprecated: (20250721 - Julian) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('Code:', response.body.code);
      // Deprecated: (20250721 - Julian) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('Message:', response.body.message);
      // Deprecated: (20250721 - Julian) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('=== END ERROR HANDLING ===');

      expect(response.status).toBe(422);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('422ISF0000'); // Info: (20250721 - Julian) Invalid input parameter
    });

    it('should handle invalid date range gracefully', async () => {
      // Info: (20250718 - Julian) 確保登入流程正確
      await authenticatedHelper.ensureAuthenticated();
      const cookies = authenticatedHelper.getCurrentSession();

      const response = await getBalanceSheetClient
        .get(`/api/v2/account_book/${accountBookId}/report`)
        .query({
          reportType: ReportSheetType.BALANCE_SHEET,
          startDate: 'invalid_date',
          endDate: 'invalid_date',
          language: LocaleKey.en,
        })
        .set('Cookie', cookies.join('; '));

      expect(response.status).toBe(422);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('422ISF0000'); // Info: (20250721 - Julian) Invalid input parameter
    });
  });

  /**
   * Info: (20250721 - Julian) Test Step 5: Complete Integration Workflow Validation
   */
  describe('Step 5: Complete Integration Workflow Validation', () => {
    it('should validate complete integration workflow', async () => {
      // Info: (20250718 - Julian) Step 1: 確認帳本已連結
      expect(accountBookId).toBeDefined();
      expect(accountBookId).toBeGreaterThan(0);

      // Info: (20250718 - Julian) Step 2: 確認報表 API 正常運作
      await authenticatedHelper.ensureAuthenticated();
      const cookies = authenticatedHelper.getCurrentSession();

      const currentTimestamp = Math.floor(Date.now() / 1000); // Info: (20250721 - Julian) 取得當前時間
      const startDate = currentTimestamp - 86400 * 365; // Info: (20250721 - Julian) 從現在起往前 365 天
      const endDate = currentTimestamp + 86400 * 30; // Info: (20250721 - Julian) 從現在起往後 30 天

      const finalBalanceSheetResponse = await getBalanceSheetClient
        .get(`/api/v2/account_book/${accountBookId}/report`)
        .query({
          reportType: ReportSheetType.BALANCE_SHEET,
          startDate: startDate.toString(),
          endDate: endDate.toString(),
          language: LocaleKey.en,
        })
        .set('Cookie', cookies.join('; '));

      // Deprecated: (20250721 - Julian) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('=== FINAL BALANCE SHEET VALIDATION ===');
      // Deprecated: (20250721 - Julian) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('Final Balance Sheet Status:', finalBalanceSheetResponse.status);
      // Deprecated: (20250721 - Julian) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('Final Balance Sheet Success:', finalBalanceSheetResponse.body.success);
      // Deprecated: (20250721 - Julian) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('Final Balance Sheet Code:', finalBalanceSheetResponse.body.code);
      // Deprecated: (20250721 - Julian) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('Final Balance Sheet Message:', finalBalanceSheetResponse.body.message);
      // Deprecated: (20250721 - Julian) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('Final Balance Sheet Payload:', finalBalanceSheetResponse.body.payload);
      // Deprecated: (20250721 - Julian) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('=== END FINAL BALANCE SHEET VALIDATION ===');

      expect(finalBalanceSheetResponse.status).toBe(200);
      expect(finalBalanceSheetResponse.body.success).toBe(true);
      expect(finalBalanceSheetResponse.body.payload.reportType).toBe(ReportSheetType.BALANCE_SHEET);

      const finalBalanceSheetData = finalBalanceSheetResponse.body.payload;

      // Info: (20250721 - Julian) 驗證完整的報表結構
      expect(finalBalanceSheetData.company).toBeDefined();
      expect(finalBalanceSheetData.curDate).toBeDefined();
      expect(finalBalanceSheetData.preDate).toBeDefined();
      expect(finalBalanceSheetData.general).toBeDefined();
      expect(finalBalanceSheetData.details).toBeDefined();

      if (process.env.DEBUG_TESTS === 'true') {
        // Deprecated: (20250721 - Julian) remove eslint-disable
        // eslint-disable-next-line no-console
        console.log('✅ Complete balance sheet workflow validated successfully');
        // Deprecated: (20250721 - Julian) remove eslint-disable
        // eslint-disable-next-line no-console
        console.log(`   - Account Book ID: ${accountBookId}`);
        // Deprecated: (20250721 - Julian) remove eslint-disable
        // eslint-disable-next-line no-console
        console.log(`   - Company Name: ${finalBalanceSheetData.company.name}`);
        // Deprecated: (20250721 - Julian) remove eslint-disable
        // eslint-disable-next-line no-console
        console.log(`   - Report Type: ${finalBalanceSheetData.reportType}`);
        // Deprecated: (20250721 - Julian) remove eslint-disable
        // eslint-disable-next-line no-console
        console.log(`   - General Items: ${finalBalanceSheetData.general.length}`);
        // Deprecated: (20250721 - Julian) remove eslint-disable
        // eslint-disable-next-line no-console
        console.log(`   - Detail Items: ${finalBalanceSheetData.details.length}`);
      }
    });
  });

  /**
   * Info: (20250721 - Julian) Test Step 6: Balance Sheet Failure Test Cases
   * Following Integration Test Plan v2 - Section 8.1.4: Common Financial Report Failure Cases
   */
  describe('Step 6: Balance Sheet Failure Test Cases', () => {
    // Info: (20250721 - Julian) Define standard error response schema for validation
    const errorResponseSchema = z.object({
      success: z.literal(false),
      code: z.string(),
      message: z.string(),
      payload: z.null(),
    });

    /**
     * Info: (20250721 - Julian) Test Case 6.1: Authentication Failure Cases
     */
    describe('6.1 Authentication Failure Cases', () => {
      it('should reject unauthenticated requests', async () => {
        const currentTimestamp = Math.floor(Date.now() / 1000); // Info: (20250721 - Julian) 取得當前時間
        const startDate = currentTimestamp - 86400 * 365; // Info: (20250721 - Julian) 從現在起往前 365 天
        const endDate = currentTimestamp + 86400 * 30; // Info: (20250721 - Julian) 從現在起往後 30 天

        // Info: (20250721 - Julian) 沒有 cookie = 未認證請求
        const response = await getBalanceSheetClient
          .get(`/api/v2/account_book/${accountBookId}/report`)
          .query({
            reportType: ReportSheetType.BALANCE_SHEET,
            startDate: startDate.toString(),
            endDate: endDate.toString(),
            language: LocaleKey.en,
          });

        expect(response.status).toBe(401);

        // Info: (20250721 - Julian) 驗證錯誤回應結構和內容
        const validatedError = validateAndFormatData(errorResponseSchema, response.body);
        expect(validatedError.success).toBe(false);
        expect(validatedError.code).toBe('401ISF0000');

        if (process.env.DEBUG_TESTS === 'true') {
          // Deprecated: (20250721 - Julian) remove eslint-disable
          // eslint-disable-next-line no-console
          console.log('✅ Unauthenticated request properly rejected with 401');
        }
      });

      it('should reject requests with invalid session cookies', async () => {
        const currentTimestamp = Math.floor(Date.now() / 1000); // Info: (20250721 - Julian) 取得當前時間
        const startDate = currentTimestamp - 86400 * 365; // Info: (20250721 - Julian) 從現在起往前 365 天
        const endDate = currentTimestamp + 86400 * 30; // Info: (20250721 - Julian) 從現在起往後 30 天

        // Info: (20250721 - Julian) 使用無效的 session cookie
        const response = await getBalanceSheetClient
          .get(`/api/v2/account_book/${accountBookId}/report`)
          .query({
            reportType: ReportSheetType.BALANCE_SHEET,
            startDate: startDate.toString(),
            endDate: endDate.toString(),
            language: LocaleKey.en,
          })
          .set('Cookie', 'invalid-session-cookie=invalid-value');

        expect(response.status).toBe(401);
        // Info: (20250721 - Julian) 驗證錯誤回應結構和內容
        const validatedError = validateAndFormatData(errorResponseSchema, response.body);
        expect(validatedError.success).toBe(false);
        expect(validatedError.code).toBe('401ISF0000');

        if (process.env.DEBUG_TESTS === 'true') {
          // Deprecated: (20250721 - Julian) remove eslint-disable
          // eslint-disable-next-line no-console
          console.log('✅ Invalid session cookie properly rejected with 401');
        }
      });
    });

    /**
     * Info: (20250721 - Julian) Test Case 6.2: Authorization Failure Cases
     */
    // ToDo: (20250721 - Julian) Verify this test case in the future
    xit('6.2 Authorization Failure Cases', () => {
      // Info: (20250721 - Julian) 測試未授權的帳本存取
      it('should reject access to non-existent account book', async () => {
        // Info: (20250718 - Julian) 確保登入流程正確
        await authenticatedHelper.ensureAuthenticated();
        const cookies = authenticatedHelper.getCurrentSession();

        const nonExistentAccountBookId = 999999;
        const nonExistentReportClient = createTestClient({
          handler: getReportHandler,
          routeParams: { accountBookId: nonExistentAccountBookId.toString() },
        });

        const currentTimestamp = Math.floor(Date.now() / 1000); // Info: (20250721 - Julian) 取得當前時間
        const startDate = currentTimestamp - 86400 * 365; // Info: (20250721 - Julian) 從現在起往前 365 天
        const endDate = currentTimestamp + 86400 * 30; // Info: (20250721 - Julian) 從現在起往後 30 天

        const response = await nonExistentReportClient
          .get(`/api/v2/account_book/${accountBookId}/report`)
          .query({
            reportType: ReportSheetType.BALANCE_SHEET,
            startDate: startDate.toString(),
            endDate: endDate.toString(),
            language: LocaleKey.en,
          })
          .set('Cookie', cookies.join('; '));

        // Deprecated: (20250721 - Julian) remove eslint-disable
        // eslint-disable-next-line no-console
        console.log('responseIn6.2', response.body);

        expect(response.status).toBe(403);
        // Info: (20250721 - Julian) 驗證錯誤回應結構和內容
        const validatedError = validateAndFormatData(errorResponseSchema, response.body);
        expect(validatedError.success).toBe(false);
        expect(validatedError.code).toBe('403ISF0000'); // Info: (20250721 - Julian) Forbidden

        if (process.env.DEBUG_TESTS === 'true') {
          // Deprecated: (20250721 - Julian) remove eslint-disable
          // eslint-disable-next-line no-console
          console.log(
            '✅ Unauthorized access to non-existent account book properly rejected with 403'
          );
        }
      });
    });

    /**
     * Info: (20250721 - Julian) Test Case 6.3: Input Validation Failure Cases
     */
    describe('6.3 Input Validation Failure Cases', () => {
      // Info: (20250721 - Julian) 測試無效的 reportType 參數
      it('should reject invalid reportType parameter', async () => {
        // Info: (20250718 - Julian) 確保登入流程正確
        await authenticatedHelper.ensureAuthenticated();
        const cookies = authenticatedHelper.getCurrentSession();

        const currentTimestamp = Math.floor(Date.now() / 1000); // Info: (20250721 - Julian) 取得當前時間
        const startDate = currentTimestamp - 86400 * 365; // Info: (20250721 - Julian) 從現在起往前 365 天
        const endDate = currentTimestamp + 86400 * 30; // Info: (20250721 - Julian) 從現在起往後 30 天

        const response = await getBalanceSheetClient
          .get(`/api/v2/account_book/${accountBookId}/report`)
          .query({
            reportType: 'completely_invalid_report_type', // Info: (20250721 - Julian) 無效的 input
            startDate: startDate.toString(),
            endDate: endDate.toString(),
            language: LocaleKey.en,
          })
          .set('Cookie', cookies.join('; '));

        expect(response.status).toBe(422);

        // Info: (20250721 - Julian) 驗證錯誤回應結構和內容
        const validatedError = validateAndFormatData(errorResponseSchema, response.body);
        expect(validatedError.success).toBe(false);
        expect(validatedError.code).toBe('422ISF0000'); // Info: (20250721 - Julian) Invalid input parameter

        if (process.env.DEBUG_TESTS === 'true') {
          // Deprecated: (20250721 - Julian) remove eslint-disable
          // eslint-disable-next-line no-console
          console.log('✅ Invalid reportType properly rejected with 422');
        }
      });

      // Info: (20250721 - Julian) 測試無效的日期範圍
      // ToDo: (20250721 - Julian) Verify this test case in the future
      xit('should reject invalid date range (endDate < startDate)', async () => {
        // Info: (20250718 - Julian) 確保登入流程正確
        await authenticatedHelper.ensureAuthenticated();
        const cookies = authenticatedHelper.getCurrentSession();

        const currentTimestamp = Math.floor(Date.now() / 1000); // Info: (20250721 - Julian) 取得當前時間
        const startDate = currentTimestamp + 86400 * 30; // Info: (20250721 - Julian) 從現在起往前 30 天
        const endDate = currentTimestamp - 86400 * 365; // Info: (20250721 - Julian) 從現在起往後 365 天

        const response = await getBalanceSheetClient
          .get(`/api/v2/account_book/${accountBookId}/report`)
          .query({
            reportType: ReportSheetType.BALANCE_SHEET,
            // Info: (20250721 - Julian) 故意將 startDate 設在 endDate 之後
            startDate: startDate.toString(),
            endDate: endDate.toString(),
            language: LocaleKey.en,
          })
          .set('Cookie', cookies.join('; '));

        expect(response.status).toBe(422);
        // Info: (20250721 - Julian) 驗證錯誤回應結構和內容
        const validatedError = validateAndFormatData(errorResponseSchema, response.body);
        expect(validatedError.success).toBe(false);
        expect(validatedError.code).toBe('422ISF0000'); // Info: (20250721 - Julian) Invalid input parameter

        if (process.env.DEBUG_TESTS === 'true') {
          // Deprecated: (20250721 - Julian) remove eslint-disable
          // eslint-disable-next-line no-console
          console.log('✅ Invalid date range (endDate < startDate) properly rejected with 422');
        }
      });

      // Info: (20250721 - Julian) 測試缺少必要的參數
      it('should reject missing required parameters', async () => {
        // Info: (20250718 - Julian) 確保登入流程正確
        await authenticatedHelper.ensureAuthenticated();
        const cookies = authenticatedHelper.getCurrentSession();

        const response = await getBalanceSheetClient
          .get(`/api/v2/account_book/${accountBookId}/report`)
          .query({
            // Info: (20250721 - Julian) 故意不傳入 reportType, startDate, endDate
            language: LocaleKey.en,
          })
          .set('Cookie', cookies.join('; '));

        expect(response.status).toBe(422);
        // Info: (20250721 - Julian) 驗證錯誤回應結構和內容
        const validatedError = validateAndFormatData(errorResponseSchema, response.body);
        expect(validatedError.success).toBe(false);
        expect(validatedError.code).toBe('422ISF0000'); // Info: (20250721 - Julian) Invalid input parameter

        if (process.env.DEBUG_TESTS === 'true') {
          // Deprecated: (20250721 - Julian) remove eslint-disable
          // eslint-disable-next-line no-console
          console.log('✅ Missing required parameters properly rejected with 422');
        }
      });

      // Info: (20250721 - Julian) 測試無效的語言參數
      // ToDo: (20250721 - Julian) Verify this test case in the future
      xit('should reject invalid language code', async () => {
        // Info: (20250718 - Julian) 確保登入流程正確
        await authenticatedHelper.ensureAuthenticated();
        const cookies = authenticatedHelper.getCurrentSession();

        const currentTimestamp = Math.floor(Date.now() / 1000); // Info: (20250721 - Julian) 取得當前時間
        const startDate = currentTimestamp - 86400 * 365; // Info: (20250721 - Julian) 從現在起往前 365 天
        const endDate = currentTimestamp + 86400 * 30; // Info: (20250721 - Julian) 從現在起往後 30 天

        const response = await getBalanceSheetClient
          .get(`/api/v2/account_book/${accountBookId}/report`)
          .query({
            reportType: ReportSheetType.BALANCE_SHEET,
            startDate: startDate.toString(),
            endDate: endDate.toString(),
            language: 'invalid_language_code', // Info: (20250721 - Julian) 無效的語言參數
          })
          .set('Cookie', cookies.join('; '));

        expect(response.status).toBe(422);
        // Info: (20250721 - Julian) 驗證錯誤回應結構和內容
        const validatedError = validateAndFormatData(errorResponseSchema, response.body);
        expect(validatedError.success).toBe(false);
        expect(validatedError.code).toBe('422ISF0000'); // Info: (20250721 - Julian) Invalid input parameter

        if (process.env.DEBUG_TESTS === 'true') {
          // Deprecated: (20250721 - Julian) remove eslint-disable
          // eslint-disable-next-line no-console
          console.log('✅ Invalid language code properly rejected with 422');
        }
      });

      // Info: (20250721 - Julian) 測試日期格式為非數字
      it('should reject non-numeric date values', async () => {
        // Info: (20250718 - Julian) 確保登入流程正確
        await authenticatedHelper.ensureAuthenticated();
        const cookies = authenticatedHelper.getCurrentSession();

        const response = await getBalanceSheetClient
          .get(`/api/v2/account_book/${accountBookId}/report`)
          .query({
            reportType: ReportSheetType.BALANCE_SHEET,
            // Info: (20250721 - Julian) 非數字的日期格式
            startDate: 'i-am-not-a-number',
            endDate: 'me-neither',
            language: LocaleKey.en,
          })
          .set('Cookie', cookies.join('; '));

        expect(response.status).toBe(422);
        // Info: (20250721 - Julian) 驗證錯誤回應結構和內容
        const validatedError = validateAndFormatData(errorResponseSchema, response.body);
        expect(validatedError.success).toBe(false);
        expect(validatedError.code).toBe('422ISF0000'); // Info: (20250721 - Julian) Invalid input parameter

        if (process.env.DEBUG_TESTS === 'true') {
          // Deprecated: (20250721 - Julian) remove eslint-disable
          // eslint-disable-next-line no-console
          console.log('✅ Non-numeric date values properly rejected with 422');
        }
      });
    });

    /**
     * Info: (20250721 - Julian) Test Case 6.4: Business Logic Failure Cases
     */
    describe('6.4 Business Logic Failure Cases', () => {
      // Info: (20250721 - Julian) 測試帳本中沒有會計資料的情況
      it('should handle account book with no accounting data gracefully', async () => {
        // Info: (20250718 - Julian) 確保登入流程正確
        await authenticatedHelper.ensureAuthenticated();
        const cookies = authenticatedHelper.getCurrentSession();

        // Info: (20250721 - Julian) Create a new account book with no vouchers/transactions
        // const emptyTestCompanyData = {
        //   name: 'Empty Test Company 空資料測試公司',
        //   taxId: (Math.floor(Math.random() * 90000000) + 10000000).toString(),
        //   teamId,
        //   tag: WORK_TAG.FINANCIAL,
        // };

        // const createResponse = await createAccountBookClient
        //   .post(`/api/v2/user/${currentUserId}/account_book`)
        //   .send(emptyTestCompanyData)
        //   .set('Cookie', cookies.join('; '));

        // expect(createResponse.status).toBe(200);
        const emptyAccountBook = await authenticatedHelper.createAccountBook(
          Number(currentUserId),
          teamId,
          'Empty Test Company 空資料測試公司'
        );
        const emptyAccountBookId = emptyAccountBook.id;

        // Info: (20250721 - Julian) 用空帳本產生報表
        const emptyReportClient = createTestClient({
          handler: getReportHandler,
          routeParams: { accountBookId: emptyAccountBookId.toString() },
        });

        const currentTimestamp = Math.floor(Date.now() / 1000); // Info: (20250721 - Julian) 取得當前時間
        const startDate = currentTimestamp - 86400 * 365; // Info: (20250721 - Julian) 從現在起往前 365 天
        const endDate = currentTimestamp + 86400 * 30; // Info: (20250721 - Julian) 從現在起往後 30 天

        const response = await emptyReportClient
          .get(`/api/v2/account_book/${accountBookId}/report`)
          .query({
            reportType: ReportSheetType.BALANCE_SHEET,
            startDate: startDate.toString(),
            endDate: endDate.toString(),
            language: LocaleKey.en,
          })
          .set('Cookie', cookies.join('; '));

        // Info: (20250721 - Julian) 驗證空帳本報表的回應（應該成功）
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.payload.reportType).toBe(ReportSheetType.BALANCE_SHEET);

        // Info: (20250721 - Julian) 驗證空帳本報表的結構
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
     * Info: (20250721 - Julian) Test Case 6.5: Edge Cases and Boundary Conditions
     */
    describe('6.5 Edge Cases and Boundary Conditions', () => {
      // Info: (20250721 - Julian) 測試極端的日期範圍
      it('should handle extremely large date ranges', async () => {
        // Info: (20250718 - Julian) 確保登入流程正確
        await authenticatedHelper.ensureAuthenticated();
        const cookies = authenticatedHelper.getCurrentSession();

        const currentTimestamp = Math.floor(Date.now() / 1000); // Info: (20250721 - Julian) 取得當前時間
        const startDate = currentTimestamp - 86400 * 365 * 10; // Info: (20250721 - Julian) 從現在起往前 10 年
        const endDate = currentTimestamp + 86400 * 365 * 10; // Info: (20250721 - Julian) 從現在起往後 10 年

        const response = await getBalanceSheetClient
          .get(`/api/v2/account_book/${accountBookId}/report`)
          .query({
            reportType: ReportSheetType.BALANCE_SHEET,
            startDate: startDate.toString(),
            endDate: endDate.toString(),
            language: LocaleKey.en,
          })
          .set('Cookie', cookies.join('; '));

        // Info: (20250721 - Julian) 驗證極端日期範圍的回應（應該成功）
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);

        if (process.env.DEBUG_TESTS === 'true') {
          // Deprecated: (20250721 - Julian) remove eslint-disable
          // eslint-disable-next-line no-console
          console.log('✅ Extremely large date range handled successfully');
        }
      });

      // Info: (20250721 - Julian) 測試起始和結束日期相同的情況
      it('should handle same start and end date', async () => {
        // Info: (20250718 - Julian) 確保登入流程正確
        await authenticatedHelper.ensureAuthenticated();
        const cookies = authenticatedHelper.getCurrentSession();

        const currentTimestamp = Math.floor(Date.now() / 1000); // Info: (20250721 - Julian) 取得當前時間
        const sameDate = currentTimestamp;

        const response = await getBalanceSheetClient
          .get(`/api/v2/account_book/${accountBookId}/report`)
          .query({
            reportType: ReportSheetType.BALANCE_SHEET,
            startDate: sameDate.toString(),
            endDate: sameDate.toString(),
            language: LocaleKey.en,
          })
          .set('Cookie', cookies.join('; '));

        // Info: (20250721 - Julian) 驗證相同起始和結束日期的回應（應該成功）
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);

        if (process.env.DEBUG_TESTS === 'true') {
          // Deprecated: (20250721 - Julian) remove eslint-disable
          // eslint-disable-next-line no-console
          console.log('✅ Same start and end date handled successfully');
        }
      });

      // Info: (20250721 - Julian) 測試所有可支援的語言代碼
      it('should handle all supported language codes', async () => {
        // Info: (20250718 - Julian) 確保登入流程正確
        await authenticatedHelper.ensureAuthenticated();
        const cookies = authenticatedHelper.getCurrentSession();

        const currentTimestamp = Math.floor(Date.now() / 1000); // Info: (20250721 - Julian) 取得當前時間
        const startDate = currentTimestamp - 86400 * 365; // Info: (20250721 - Julian) 從現在起往前 365 天
        const endDate = currentTimestamp + 86400 * 30; // Info: (20250721 - Julian) 從現在起往後 30 天

        const supportedLanguages = Object.values(LocaleKey);

        // Info: (20250721 - Julian) 逐一測試所有支援的語言
        // Deprecated: (20250721 - Julian) remove eslint-disable
        // eslint-disable-next-line no-restricted-syntax
        for (const language of supportedLanguages) {
          // Deprecated: (20250721 - Julian) remove eslint-disable
          // eslint-disable-next-line no-await-in-loop
          const response = await getBalanceSheetClient
            .get(`/api/v2/account_book/${accountBookId}/report`)
            .query({
              reportType: ReportSheetType.BALANCE_SHEET,
              startDate: startDate.toString(),
              endDate: endDate.toString(),
              language,
            })
            .set('Cookie', cookies.join('; '));

          expect(response.status).toBe(200);
          expect(response.body.success).toBe(true);
          expect(response.body.payload.reportType).toBe(ReportSheetType.BALANCE_SHEET);

          if (process.env.DEBUG_TESTS === 'true') {
            // Deprecated: (20250721 - Julian) remove eslint-disable
            // eslint-disable-next-line no-console
            console.log(`✅ Language ${language} handled successfully`);
          }
        }
      });
    });
  });
});
