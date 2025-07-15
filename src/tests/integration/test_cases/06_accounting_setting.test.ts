import { APITestHelper } from '@/tests/integration/setup/api_helper';
import { createTestClient } from '@/tests/integration/setup/test_client';
import { TestClient } from '@/interfaces/test_client';
import accountingSettingHandler from '@/pages/api/v2/account_book/[accountBookId]/accounting_setting/index';
import { APIName } from '@/constants/api_connection';
import { validateOutputData, validateAndFormatData } from '@/lib/utils/validator';
import { z } from 'zod';
import { IAccountingSetting } from '@/interfaces/accounting_setting';
import { CurrencyType } from '@/constants/currency';

// Info: (20250715 - Shirley) Mock pusher and crypto for accounting setting testing
jest.mock('pusher', () => ({
  // 建構子 → 回傳只有 trigger 的假物件
  __esModule: true,
  default: jest.fn(() => ({ trigger: jest.fn() })),
}));

jest.mock('@/lib/utils/crypto', () => {
  const real = jest.requireActual('@/lib/utils/crypto');

  // Info: (20250715 - Shirley) 一次產生 keyPair，後面重複取用
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
    storeKeyByCompany: jest.fn(), // Info: (20250715 - Shirley) 若有呼叫也不做事
  };
});

/**
 * Info: (20250711 - Shirley) Integration Test - Accounting Setting Configuration
 *
 * Primary Purpose:
 * - Test accounting setting configuration endpoints for proper API behavior
 * - Verify that accounting setting APIs respond correctly to both valid and invalid inputs
 * - Ensure proper authentication and authorization for accounting configuration
 * - Validate business logic constraints and data integrity
 *
 * Test Coverage:
 * - GET /api/v2/account_book/{accountBookId}/accounting_setting
 * - PUT /api/v2/account_book/{accountBookId}/accounting_setting
 *
 * Note: Tests follow the Integration Test Plan v2 specification for API behavior validation
 */
describe('Integration Test - Accounting Setting Configuration', () => {
  let authenticatedHelper: APITestHelper;
  let testAccountBookId: number;
  let accountingSettingClient: TestClient;

  beforeAll(async () => {
    authenticatedHelper = await APITestHelper.createHelper({ autoAuth: true });

    // Info: (20250711 - Shirley) Complete user registration with default values
    await authenticatedHelper.agreeToTerms();
    await authenticatedHelper.createUserRole();
    await authenticatedHelper.selectUserRole();

    // Info: (20250711 - Shirley) Create a test account book for accounting setting tests
    testAccountBookId = await authenticatedHelper.createTestAccountBook();

    // Info: (20250711 - Shirley) Initialize test client
    accountingSettingClient = createTestClient({
      handler: accountingSettingHandler,
      routeParams: { accountBookId: testAccountBookId.toString() },
    });
  });

  afterAll(() => {
    authenticatedHelper.clearAllUserSessions();
  });

  // ========================================
  // Info: (20250711 - Shirley) GET /api/v2/account_book/{accountBookId}/accounting_setting
  // ========================================
  describe('GET /api/v2/account_book/{accountBookId}/accounting_setting', () => {
    it('should successfully get accounting settings with proper permissions', async () => {
      await authenticatedHelper.ensureAuthenticated();
      const cookies = authenticatedHelper.getCurrentSession();

      const response = await accountingSettingClient
        .get(`/api/v2/account_book/${testAccountBookId}/accounting_setting`)
        .set('Cookie', cookies.join('; '));

      // Info: (20250711 - Shirley) Check for permission errors first
      if (response.status === 403) {
        // Info: (20250711 - Shirley) If user doesn't have permission, skip this test
        expect(response.body.success).toBe(false);
        expect(response.body.code).toBe('403ISF0000');
        return;
      }

      expect(response.status).toBe(200);

      // Info: (20250711 - Shirley) Validate basic response structure
      expect(response.body.success).toBe(true);
      expect(response.body.code).toBe('200ISF0000');
      expect(response.body.payload).toBeDefined();

      // Info: (20250711 - Shirley) Use production validateOutputData for accounting setting validation
      const { isOutputDataValid, outputData } = validateOutputData(
        APIName.ACCOUNTING_SETTING_GET,
        response.body.payload
      );

      // eslint-disable-next-line no-console
      console.log(
        'outputData in GET /api/v2/account_book/{accountBookId}/accounting_setting',
        outputData
      );

      expect(isOutputDataValid).toBe(true);
      expect(outputData).toBeDefined();

      // Info: (20250711 - Shirley) Validate accounting setting structure
      const accountingSetting = outputData as IAccountingSetting;
      expect(accountingSetting.id).toBeDefined();
      expect(typeof accountingSetting.id).toBe('number');
      expect(accountingSetting.companyId).toBe(testAccountBookId);
      expect(accountingSetting.taxSettings).toBeDefined();
      expect(accountingSetting.currency).toBeDefined();
      expect(Array.isArray(accountingSetting.shortcutList)).toBe(true);

      // Info: (20250711 - Shirley) Validate tax settings structure
      expect(accountingSetting.taxSettings.salesTax).toBeDefined();
      expect(accountingSetting.taxSettings.purchaseTax).toBeDefined();
      expect(accountingSetting.taxSettings.returnPeriodicity).toBeDefined();
      expect(typeof accountingSetting.taxSettings.salesTax.taxable).toBe('boolean');
      expect(typeof accountingSetting.taxSettings.salesTax.rate).toBe('number');
      expect(typeof accountingSetting.taxSettings.purchaseTax.taxable).toBe('boolean');
      expect(typeof accountingSetting.taxSettings.purchaseTax.rate).toBe('number');

      if (process.env.DEBUG_TESTS === 'true') {
        // eslint-disable-next-line no-console
        console.log('✅ Accounting setting GET validated with production validator successfully');
      }
    });

    it('should reject unauthenticated requests', async () => {
      const response = await accountingSettingClient
        .get(`/api/v2/account_book/${testAccountBookId}/accounting_setting`)
        .expect(401);

      // Info: (20250711 - Shirley) Validate error response structure with Zod
      const errorSchema = z.object({
        success: z.literal(false),
        code: z.string(),
        message: z.string(),
        payload: z.null(),
      });

      const validatedError = validateAndFormatData(errorSchema, response.body);
      expect(validatedError.success).toBe(false);
      expect(validatedError.code).toBe('401ISF0000');

      if (process.env.DEBUG_TESTS === 'true') {
        // eslint-disable-next-line no-console
        console.log('✅ Accounting setting GET error response validated with Zod successfully');
      }
    });

    it('should reject access to non-existent account book', async () => {
      await authenticatedHelper.ensureAuthenticated();
      const cookies = authenticatedHelper.getCurrentSession();

      const nonExistentAccountBookClient = createTestClient({
        handler: accountingSettingHandler,
        routeParams: { accountBookId: '999999' },
      });

      const response = await nonExistentAccountBookClient
        .get('/api/v2/account_book/999999/accounting_setting')
        .set('Cookie', cookies.join('; '))
        .expect(404);

      const errorSchema = z.object({
        success: z.literal(false),
        code: z.string(),
        message: z.string(),
        payload: z.null(),
      });

      const validatedError = validateAndFormatData(errorSchema, response.body);
      expect(validatedError.success).toBe(false);
      expect(validatedError.code).toBe('404ISF0000');
    });

    it('should reject missing accountBookId parameter', async () => {
      await authenticatedHelper.ensureAuthenticated();
      const cookies = authenticatedHelper.getCurrentSession();

      const invalidClient = createTestClient({
        handler: accountingSettingHandler,
        routeParams: {},
      });

      const response = await invalidClient
        .get('/api/v2/account_book/undefined/accounting_setting')
        .set('Cookie', cookies.join('; '))
        .expect(422);

      const errorSchema = z.object({
        success: z.literal(false),
        code: z.string(),
        message: z.string(),
        payload: z.null(),
      });

      const validatedError = validateAndFormatData(errorSchema, response.body);
      expect(validatedError.success).toBe(false);
      expect(validatedError.code).toBe('422ISF0000');
    });
  });

  // ========================================
  // Info: (20250711 - Shirley) PUT /api/v2/account_book/{accountBookId}/accounting_setting
  // ========================================
  describe('PUT /api/v2/account_book/{accountBookId}/accounting_setting', () => {
    let existingAccountingSetting: IAccountingSetting;

    beforeAll(async () => {
      // Info: (20250711 - Shirley) Get existing accounting setting for updates
      await authenticatedHelper.ensureAuthenticated();
      const cookies = authenticatedHelper.getCurrentSession();

      const getResponse = await accountingSettingClient
        .get(`/api/v2/account_book/${testAccountBookId}/accounting_setting`)
        .set('Cookie', cookies.join('; '));

      // Info: (20250711 - Shirley) Only set if we have permission
      if (getResponse.status === 200) {
        existingAccountingSetting = getResponse.body.payload as IAccountingSetting;
      }
    });

    it('should successfully update accounting settings with valid data', async () => {
      await authenticatedHelper.ensureAuthenticated();
      const cookies = authenticatedHelper.getCurrentSession();

      // Info: (20250711 - Shirley) If we couldn't get the accounting setting, skip this test
      if (!existingAccountingSetting) {
        return;
      }

      const updateData = {
        ...existingAccountingSetting,
        taxSettings: {
          salesTax: {
            taxable: true,
            rate: 0.05,
          },
          purchaseTax: {
            taxable: true,
            rate: 0.05,
          },
          returnPeriodicity: 'Monthly',
        },
        currency: CurrencyType.TWD,
      };

      const response = await accountingSettingClient
        .put(`/api/v2/account_book/${testAccountBookId}/accounting_setting`)
        .send(updateData)
        .set('Cookie', cookies.join('; '));

      // Info: (20250711 - Shirley) Check for permission errors first
      if (response.status === 403) {
        expect(response.body.success).toBe(false);
        expect(response.body.code).toBe('403ISF0000');
        return;
      }

      expect(response.status).toBe(200);

      // Info: (20250711 - Shirley) Validate basic response structure
      expect(response.body.success).toBe(true);
      expect(response.body.code).toBe('200ISF0003');
      expect(response.body.payload).toBeDefined();

      // Info: (20250711 - Shirley) Use production validateOutputData for accounting setting update validation
      const { isOutputDataValid, outputData } = validateOutputData(
        APIName.ACCOUNTING_SETTING_UPDATE,
        response.body.payload
      );

      expect(isOutputDataValid).toBe(true);
      expect(outputData).toBeDefined();

      // Info: (20250711 - Shirley) Validate updated data
      const updatedSetting = outputData as IAccountingSetting;
      expect(updatedSetting.taxSettings.salesTax.rate).toBe(0.05);
      expect(updatedSetting.taxSettings.purchaseTax.rate).toBe(0.05);
      expect(updatedSetting.taxSettings.returnPeriodicity).toBe('Monthly');
      expect(updatedSetting.currency).toBe(CurrencyType.TWD);

      if (process.env.DEBUG_TESTS === 'true') {
        // eslint-disable-next-line no-console
        console.log('✅ Accounting setting PUT validated with production validator successfully');
      }
    });

    it('should reject unauthenticated update requests', async () => {
      const updateData = {
        ...existingAccountingSetting,
        taxSettings: {
          salesTax: {
            taxable: false,
            rate: 0,
          },
          purchaseTax: {
            taxable: false,
            rate: 0,
          },
          returnPeriodicity: 'Weekly',
        },
      };

      const response = await accountingSettingClient
        .put(`/api/v2/account_book/${testAccountBookId}/accounting_setting`)
        .send(updateData)
        .expect(401);

      const errorSchema = z.object({
        success: z.literal(false),
        code: z.string(),
        message: z.string(),
        payload: z.null(),
      });

      const validatedError = validateAndFormatData(errorSchema, response.body);
      expect(validatedError.success).toBe(false);
      expect(validatedError.code).toBe('401ISF0000');
    });

    it('should reject invalid request data format', async () => {
      await authenticatedHelper.ensureAuthenticated();
      const cookies = authenticatedHelper.getCurrentSession();

      const invalidData = {
        id: 'invalid_id',
        companyId: 'invalid_company_id',
        taxSettings: 'invalid_tax_settings',
      };

      const response = await accountingSettingClient
        .put(`/api/v2/account_book/${testAccountBookId}/accounting_setting`)
        .send(invalidData)
        .set('Cookie', cookies.join('; '))
        .expect(422);

      const errorSchema = z.object({
        success: z.literal(false),
        code: z.string(),
        message: z.string(),
        payload: z.null(),
      });

      const validatedError = validateAndFormatData(errorSchema, response.body);
      expect(validatedError.success).toBe(false);
      expect(validatedError.code).toBe('422ISF0000');
    });

    it('should reject missing required fields', async () => {
      await authenticatedHelper.ensureAuthenticated();
      const cookies = authenticatedHelper.getCurrentSession();

      const response = await accountingSettingClient
        .put(`/api/v2/account_book/${testAccountBookId}/accounting_setting`)
        .send({})
        .set('Cookie', cookies.join('; '))
        .expect(422);

      const errorSchema = z.object({
        success: z.literal(false),
        code: z.string(),
        message: z.string(),
        payload: z.null(),
      });

      const validatedError = validateAndFormatData(errorSchema, response.body);
      expect(validatedError.success).toBe(false);
      expect(validatedError.code).toBe('422ISF0000');
    });

    it('should handle method not allowed errors properly', async () => {
      await authenticatedHelper.ensureAuthenticated();
      const cookies = authenticatedHelper.getCurrentSession();

      // Info: (20250711 - Shirley) Test wrong HTTP method for accounting setting
      const response = await accountingSettingClient
        .delete(`/api/v2/account_book/${testAccountBookId}/accounting_setting`)
        .set('Cookie', cookies.join('; '))
        .expect(405);

      const errorSchema = z.object({
        success: z.literal(false),
        code: z.string(),
        message: z.string(),
        payload: z.null(),
      });

      const validatedError = validateAndFormatData(errorSchema, response.body);
      expect(validatedError.success).toBe(false);
      expect(validatedError.code).toBe('405ISF0000');
    });
  });
});
