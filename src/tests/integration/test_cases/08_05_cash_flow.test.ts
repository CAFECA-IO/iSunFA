import { APITestHelper } from '@/tests/integration/setup/api_helper';
import { createTestClient } from '@/tests/integration/setup/test_client';

import createAccountBookHandler from '@/pages/api/v2/user/[userId]/account_book';
import getAccountBookHandler from '@/pages/api/v2/account_book/[accountBookId]';
import connectAccountBookHandler from '@/pages/api/v2/account_book/[accountBookId]/connect';
import reportHandler from '@/pages/api/v2/account_book/[accountBookId]/report';
import voucherPostHandler from '@/pages/api/v2/account_book/[accountBookId]/voucher';

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

describe('Integration Test - Cash Flow Statement Report Integration', () => {
  let helper: APITestHelper;
  let currentUserId: string;
  let teamId: number;
  let accountBookId: number;

  let createAccountBookClient: TestClient;
  let getAccountBookClient: TestClient;
  let connectAccountBookClient: TestClient;
  let reportClient: TestClient;
  let voucherPostClient: TestClient;

  const randomTaxId = `${Math.floor(Math.random() * 90000000) + 10000000}`;
  const testCompanyData = {
    name: `Cash Flow Test Company 現金流量測試公司`,
    taxId: randomTaxId,
    tag: WORK_TAG.ALL,
    teamId: 0,
    businessLocation: LocaleKey.tw,
    accountingCurrency: CurrencyType.TWD,
    representativeName: 'CF Test Rep',
    taxSerialNumber: `CF${randomTaxId}`,
    contactPerson: 'CF Tester',
    phoneNumber: '+886-2-1234-5678',
    city: 'Taipei',
    district: 'Zhongzheng District',
    enteredAddress: '100 Test Rd, Zhongzheng, Taipei',
  };

  beforeAll(async () => {
    helper = await APITestHelper.createHelper({ autoAuth: true });
    const status = await helper.getStatusInfo();
    currentUserId = (status.body.payload?.user as { id: number })?.id?.toString() ?? '1';

    await helper.agreeToTerms();
    await helper.createUserRole();
    await helper.selectUserRole();

    const teamResp = await helper.createTeam();
    teamId = (teamResp.body.payload?.team as { id: number })?.id || 0;
    testCompanyData.teamId = teamId;

    await helper.getStatusInfo(); // refresh

    createAccountBookClient = createTestClient({
      handler: createAccountBookHandler,
      routeParams: { userId: currentUserId },
    });
  });

  const initClients = () => {
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
    helper.clearSession();
  });

  describe('Step 1: Account Book Creation', () => {
    test('creates an account book successfully', async () => {
      await helper.ensureAuthenticated();
      const cookies = helper.getCurrentSession();

      const res = await createAccountBookClient
        .post(`/api/v2/user/${currentUserId}/account_book`)
        .send(testCompanyData)
        .set('Cookie', cookies.join('; '))
        .expect(200);

      expect(res.body.success).toBe(true);
      accountBookId = res.body.payload.id;
      expect(typeof accountBookId).toBe('number');

      initClients();
    });

    test('verifies account book connection', async () => {
      await helper.ensureAuthenticated();
      const cookies = helper.getCurrentSession();

      const res = await getAccountBookClient
        .get(`/api/v2/account_book/${accountBookId}`)
        .set('Cookie', cookies.join('; '))
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.payload.id).toBe(accountBookId);
    });
  });

  describe('Step 2: Create Sample Vouchers for Cash Flow', () => {
    test('posts cash flow vouchers via API', async () => {
      await helper.ensureAuthenticated();
      const cookies = helper.getCurrentSession();

      const conn = await connectAccountBookClient
        .get(`/api/v2/account_book/${accountBookId}/connect`)
        .set('Cookie', cookies.join('; '))
        .expect(200);
      expect(conn.body.success).toBe(true);

      const vouchers = TestDataFactory.sampleVoucherData();

      const created = await Promise.all(
        vouchers.map(async (v) => {
          const payload = {
            actions: [],
            certificateIds: [],
            invoiceRC2Ids: [],
            voucherDate: v.date,
            type: v.type,
            note: v.note,
            lineItems: v.lineItems,
            assetIds: [],
            counterPartyId: null,
          };
          const resp = await voucherPostClient
            .post(`/api/v2/account_book/${accountBookId}/voucher`)
            .send(payload)
            .set('Cookie', cookies.join('; '));
          expect(resp.status).toBe(201);
          return resp.body.payload.id;
        })
      );

      expect(created.length).toBe(vouchers.length);
    });
  });

  describe('Step 3: Generate Cash Flow Statement Report', () => {
    let startDate: number;
    let endDate: number;

    beforeAll(() => {
      const now = Math.floor(Date.now() / 1000);
      startDate = now - 86400 * 30;
      endDate = now + 86400 * 30;
    });

    test('returns valid cash flow report structure', async () => {
      await helper.ensureAuthenticated();
      const cookies = helper.getCurrentSession();

      const res = await reportClient
        .get(`/api/v2/account_book/${accountBookId}/report`)
        .query({
          reportType: FinancialReportTypesKey.cash_flow_statement,
          startDate: startDate.toString(),
          endDate: endDate.toString(),
          language: 'en',
        })
        .set('Cookie', cookies.join('; '))
        .expect(200);

      expect(res.body.success).toBe(true);
      const { payload } = res.body;
      expect(payload.reportType).toBe(ReportSheetType.CASH_FLOW_STATEMENT);

      const { isOutputDataValid, outputData } = validateOutputData(APIName.REPORT_GET_V2, payload);
      expect(isOutputDataValid).toBe(true);

      expect(outputData).not.toBeNull();
      expect(outputData?.company).toBeDefined();
      expect(Array.isArray(outputData?.general)).toBe(true);
      expect(Array.isArray(outputData?.details)).toBe(true);
      expect(
        outputData?.curDate && typeof (outputData.curDate as { from?: number }).from === 'number'
      ).toBe(true);
      expect(
        outputData?.curDate && typeof (outputData.curDate as { to?: number }).to === 'number'
      ).toBe(true);
    });
  });

  describe('Step 4: Error Handling & Edge Cases', () => {
    const errorSchema = z.object({
      success: z.literal(false),
      code: z.string(),
      message: z.string(),
      payload: z.null(),
    });

    test('rejects unauthenticated', async () => {
      const now = Math.floor(Date.now() / 1000);
      const res = await reportClient
        .get(`/api/v2/account_book/${accountBookId}/report`)
        .query({
          reportType: FinancialReportTypesKey.cash_flow_statement,
          startDate: now.toString(),
          endDate: now.toString(),
          language: 'en',
        })
        .expect(401);
      const err = validateAndFormatData(errorSchema, res.body);
      expect(err.success).toBe(false);
    });

    test('invalid reportType yields 422', async () => {
      await helper.ensureAuthenticated();
      const cookies = helper.getCurrentSession();
      const now = Math.floor(Date.now() / 1000);
      const res = await reportClient
        .get(`/api/v2/account_book/${accountBookId}/report`)
        .query({
          reportType: 'foo',
          startDate: now.toString(),
          endDate: now.toString(),
          language: 'en',
        })
        .set('Cookie', cookies.join('; '))
        .expect(422);
      expect(res.body.success).toBe(false);
    });

    test('missing params yields 422', async () => {
      await helper.ensureAuthenticated();
      const cookies = helper.getCurrentSession();
      const res = await reportClient
        .get(`/api/v2/account_book/${accountBookId}/report`)
        .query({ language: 'en' })
        .set('Cookie', cookies.join('; '))
        .expect(422);
      const err = validateAndFormatData(errorSchema, res.body);
      expect(err.success).toBe(false);
    });

    test('empty account book returns empty arrays', async () => {
      await helper.ensureAuthenticated();
      const cookies = helper.getCurrentSession();

      const emptyData = { ...testCompanyData, taxId: `${Date.now()}`, name: 'Empty CF Co.' };
      const cr = await createAccountBookClient
        .post(`/api/v2/user/${currentUserId}/account_book`)
        .send(emptyData)
        .set('Cookie', cookies.join('; '))
        .expect(200);
      const emptyId = cr.body.payload.id;
      const emptyClient = createTestClient({
        handler: reportHandler,
        routeParams: { accountBookId: emptyId.toString() },
      });

      const now = Math.floor(Date.now() / 1000);
      const res = await emptyClient
        .get(`/api/v2/account_book/${emptyId}/report`)
        .query({
          reportType: FinancialReportTypesKey.cash_flow_statement,
          startDate: now.toString(),
          endDate: now.toString(),
          language: 'en',
        })
        .set('Cookie', cookies.join('; '))
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.payload.general)).toBe(true);
      expect(Array.isArray(res.body.payload.details)).toBe(true);
    });
  });

  describe('Step 5: Complete Workflow Validation', () => {
    test('end-to-end cash flow report contains non-zero items', async () => {
      await helper.ensureAuthenticated();
      const cookies = helper.getCurrentSession();
      const now = Math.floor(Date.now() / 1000);

      const res = await reportClient
        .get(`/api/v2/account_book/${accountBookId}/report`)
        .query({
          reportType: FinancialReportTypesKey.cash_flow_statement,
          startDate: (now - 86400 * 30).toString(),
          endDate: (now + 86400 * 30).toString(),
          language: 'en',
        })
        .set('Cookie', cookies.join('; '))
        .expect(200);

      const data = res.body.payload;
      const nonZero = [...data.general, ...data.details].filter(
        (item) => item.curPeriodAmount !== 0 || item.prePeriodAmount !== 0
      );

      expect(nonZero.length).toBeGreaterThan(0);
    });
  });
});
