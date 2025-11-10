import { BaseTestContext } from '@/tests/integration/setup/base_test_context';
import { APITestHelper } from '@/tests/integration/setup/api_helper';
import { createTestClient } from '@/tests/integration/setup/test_client';
import { TestClient } from '@/interfaces/test_client';
import accountingSettingHandler from '@/pages/api/v2/account_book/[accountBookId]/accounting_setting/index';
import accountListHandler from '@/pages/api/v2/account_book/[accountBookId]/account/index';
import accountByIdHandler from '@/pages/api/v2/account_book/[accountBookId]/account/[accountId]/index';
import { APIName } from '@/constants/api_connection';
import { validateOutputData, validateAndFormatData } from '@/lib/utils/validator';
import { z } from 'zod';
import { IAccountingSetting } from '@/interfaces/accounting_setting';
import { IAccount, IPaginatedAccount } from '@/interfaces/accounting_account';
import { CurrencyType } from '@/constants/currency';

/**  Info: (20250723 - Tzuhan) replaced by BaseTestContext
// Info: (20250715 - Shirley) Mock pusher and crypto for accounting setting testing
jest.mock('pusher', () => ({
  // Info: (20250715 - Shirley) 建構子 → 回傳只有 trigger 的假物件
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

*/

/**
 * Info: (20250715 - Shirley) Integration Test - Accounting Setting Configuration
 *
 * Primary Purpose:
 * - Test accounting setting configuration endpoints for proper API behavior
 * - Test chart of accounts management endpoints for proper API behavior
 * - Verify that accounting APIs respond correctly to both valid and invalid inputs
 * - Ensure proper authentication and authorization for accounting configuration
 * - Validate business logic constraints and data integrity
 *
 * Test Coverage:
 * - GET /api/v2/account_book/{accountBookId}/accounting_setting
 * - PUT /api/v2/account_book/{accountBookId}/accounting_setting
 * - GET /api/v2/account_book/{accountBookId}/account (Chart of Accounts List)
 * - POST /api/v2/account_book/{accountBookId}/account (Create Sub-Account)
 * - GET /api/v2/account_book/{accountBookId}/account/{accountId} (Account Details)
 * - PUT /api/v2/account_book/{accountBookId}/account/{accountId} (Update Account)
 *
 * Note: Tests follow the Integration Test Plan v2 specification (sections 4.1-4.5) for API behavior validation
 */
describe('Integration Test - Accounting Setting Configuration', () => {
  let authenticatedHelper: APITestHelper;
  let testAccountBookId: number;
  let accountingSettingClient: TestClient;
  let accountListClient: TestClient;
  let cookies: string[];
  // let accountByIdClient: TestClient;

  beforeAll(async () => {
    const sharedContext = await BaseTestContext.getSharedContext();
    authenticatedHelper = sharedContext.helper;
    const currentUserId = String(sharedContext.userId);
    cookies = sharedContext.cookies;
    const teamId =
      sharedContext.teamId || (await BaseTestContext.createTeam(Number(currentUserId))).id;
    testAccountBookId = (await authenticatedHelper.createAccountBook(Number(currentUserId), teamId))
      .id;
    /**  Info: (20250723 - Tzuhan) replaced by BaseTestContext
    authenticatedHelper = await APITestHelper.createHelper({ autoAuth: true });

    // Info: (20250711 - Shirley) Complete user registration with default values
    await authenticatedHelper.agreeToTerms();
    await authenticatedHelper.createUserRole();
    await authenticatedHelper.selectUserRole();

    // Info: (20250711 - Shirley) Create a test account book for accounting setting tests
    testAccountBookId = await authenticatedHelper.createTestAccountBook();

    // Info: (20250715 - Shirley) Refresh session to include new team membership
    await authenticatedHelper.getStatusInfo();
    */

    // Info: (20250711 - Shirley) Initialize test clients
    accountingSettingClient = createTestClient({
      handler: accountingSettingHandler,
      routeParams: { accountBookId: testAccountBookId.toString() },
    });

    accountListClient = createTestClient({
      handler: accountListHandler,
      routeParams: { accountBookId: testAccountBookId.toString() },
    });

    // const accountByIdClient = createTestClient({
    //   handler: accountByIdHandler,
    //   routeParams: { accountBookId: testAccountBookId.toString() },
    // });
  });

  afterAll(() => {
    /**  Info: (20250723 - Tzuhan) replaced by BaseTestContext
    authenticatedHelper.clearAllUserSessions();
    */
  });

  // ========================================
  // Info: (20250711 - Shirley) GET /api/v2/account_book/{accountBookId}/accounting_setting
  // ========================================
  describe('GET /api/v2/account_book/{accountBookId}/accounting_setting', () => {
    it('should successfully get accounting settings with proper permissions', async () => {
      await authenticatedHelper.ensureAuthenticated();

      const response = await accountingSettingClient
        .get(`/api/v2/account_book/${testAccountBookId}/accounting_setting`)
        .set('Cookie', cookies.join('; '));

      expect(response.status).toBe(200);

      // Info: (20250711 - Shirley) Validate basic response structure
      expect(response.body.success).toBe(true);
      expect(response.body.code).toBe('200ISF0002');
      expect(response.body.payload).toBeDefined();

      // Info: (20250711 - Shirley) Use production validateOutputData for accounting setting validation
      const { isOutputDataValid, outputData } = validateOutputData(
        APIName.ACCOUNTING_SETTING_GET,
        response.body.payload
      );

      expect(isOutputDataValid).toBe(true);
      expect(outputData).toBeDefined();

      // Info: (20250711 - Shirley) Validate accounting setting structure
      const accountingSetting = outputData as IAccountingSetting;
      expect(accountingSetting.id).toBeDefined();
      expect(typeof accountingSetting.id).toBe('number');
      expect(accountingSetting.accountBookId).toBe(testAccountBookId);
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
    });

    it('should reject access to non-existent account book', async () => {
      await authenticatedHelper.ensureAuthenticated();

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

      const getResponse = await accountingSettingClient
        .get(`/api/v2/account_book/${testAccountBookId}/accounting_setting`)
        .set('Cookie', cookies.join('; '));

      expect(getResponse.status).toBe(200);
      existingAccountingSetting = getResponse.body.payload as IAccountingSetting;
    });

    it('should successfully update accounting settings with valid data', async () => {
      await authenticatedHelper.ensureAuthenticated();

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

  // ========================================
  // Info: (20250715 - Shirley) GET /api/v2/account_book/{accountBookId}/account
  // ========================================
  describe('GET /api/v2/account_book/{accountBookId}/account', () => {
    it('should successfully get chart of accounts with proper permissions', async () => {
      await authenticatedHelper.ensureAuthenticated();

      const response = await accountListClient
        .get(`/api/v2/account_book/${testAccountBookId}/account`)
        .set('Cookie', cookies.join('; '));

      expect(response.status).toBe(200);

      // Info: (20250715 - Shirley) Validate basic response structure
      expect(response.body.success).toBe(true);
      expect(response.body.code).toBe('200ISF0001'); // SUCCESS_LIST for paginated results
      expect(response.body.payload).toBeDefined();

      // Info: (20250715 - Shirley) Use production validateOutputData for account list validation
      const { isOutputDataValid, outputData } = validateOutputData(
        APIName.ACCOUNT_LIST,
        response.body.payload
      );

      expect(isOutputDataValid).toBe(true);
      expect(outputData).toBeDefined();

      // Info: (20250715 - Shirley) Validate paginated account list structure
      const accountList = outputData as IPaginatedAccount;
      expect(accountList.data).toBeDefined();
      expect(Array.isArray(accountList.data)).toBe(true);
      expect(accountList.page).toBeDefined();
      expect(typeof accountList.page).toBe('number');
      expect(accountList.totalPages).toBeDefined();
      expect(typeof accountList.totalPages).toBe('number');
      expect(accountList.totalCount).toBeDefined();
      expect(typeof accountList.totalCount).toBe('number');
      expect(accountList.pageSize).toBeDefined();
      expect(typeof accountList.pageSize).toBe('number');
      expect(accountList.hasNextPage).toBeDefined();
      expect(typeof accountList.hasNextPage).toBe('boolean');
      expect(accountList.hasPreviousPage).toBeDefined();
      expect(typeof accountList.hasPreviousPage).toBe('boolean');
    });

    it('should reject unauthenticated requests', async () => {
      const response = await accountListClient
        .get(`/api/v2/account_book/${testAccountBookId}/account`)
        .expect(401);

      // Info: (20250715 - Shirley) Validate error response structure with Zod
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

    it('should reject access to non-existent account book', async () => {
      await authenticatedHelper.ensureAuthenticated();

      const nonExistentAccountBookClient = createTestClient({
        handler: accountListHandler,
        routeParams: { accountBookId: '999999' },
      });

      const response = await nonExistentAccountBookClient
        .get('/api/v2/account_book/999999/account')
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

    it('should handle invalid query parameters', async () => {
      await authenticatedHelper.ensureAuthenticated();

      const response = await accountListClient
        .get(`/api/v2/account_book/${testAccountBookId}/account`)
        .query({ page: 'invalid', limit: 'invalid' })
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
  // Info: (20250715 - Shirley) POST /api/v2/account_book/{accountBookId}/account
  // ========================================
  describe('POST /api/v2/account_book/{accountBookId}/account', () => {
    let createdAccountId: number;

    it('should successfully create new sub-account with valid data', async () => {
      await authenticatedHelper.ensureAuthenticated();

      const newAccountData = {
        name: `Test Sub Account ${Date.now()}`,
        // code: `TEST${Date.now()}`,
        accountId: 1602,
        // parentCode: '1100', // Assets parent account
        note: 'Test account created by integration test',
      };

      const response = await accountListClient
        .post(`/api/v2/account_book/${testAccountBookId}/account`)
        .send(newAccountData)
        .set('Cookie', cookies.join('; '));

      expect(response.status).toBe(201);

      // Info: (20250715 - Shirley) Validate basic response structure
      expect(response.body.success).toBe(true);
      expect(response.body.code).toBe('201ISF0000'); // CREATED
      expect(response.body.payload).toBeDefined();

      // Info: (20250715 - Shirley) Use production validateOutputData for account creation validation
      const { isOutputDataValid, outputData } = validateOutputData(
        APIName.CREATE_NEW_SUB_ACCOUNT,
        response.body.payload
      );

      expect(isOutputDataValid).toBe(true);
      expect(outputData).toBeDefined();

      // Info: (20250715 - Shirley) Validate created account structure
      const createdAccount = outputData as IAccount;
      expect(createdAccount.id).toBeDefined();
      expect(typeof createdAccount.id).toBe('number');
      expect(createdAccount.name).toContain(newAccountData.name); // Info: (20250715 - Shirley) API prefixes parent account name
      expect(createdAccount.code).toBeDefined(); // Info: (20250715 - Shirley) API generates code based on parent
      expect(createdAccount.note).toBe(newAccountData.note);

      // Info: (20250715 - Shirley) Store account ID for cleanup and further tests
      createdAccountId = createdAccount.id;
    });

    it('should reject unauthenticated creation requests', async () => {
      const newAccountData = {
        name: 'Unauthorized Test Account',
        accountId: 160200,
        // code: 'UNAUTH001',
        // parentCode: '1100',
        note: 'Should not be created',
      };

      const response = await accountListClient
        .post(`/api/v2/account_book/${testAccountBookId}/account`)
        .send(newAccountData)
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

      const invalidData = {
        name: '', // Info: (20250715 - Shirley) Empty name should be invalid
        // code: '', // Info: (20250715 - Shirley) Empty code should be invalid
        // parentCode: 'INVALID_PARENT',
        accountId: 160200,
      };

      const response = await accountListClient
        .post(`/api/v2/account_book/${testAccountBookId}/account`)
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

      const response = await accountListClient
        .post(`/api/v2/account_book/${testAccountBookId}/account`)
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

    // Info: (20250715 - Shirley) Clean up created account after tests
    afterAll(async () => {
      if (createdAccountId) {
        try {
          await authenticatedHelper.ensureAuthenticated();

          const deleteClient = createTestClient({
            handler: accountByIdHandler,
            routeParams: {
              accountBookId: testAccountBookId.toString(),
              accountId: createdAccountId.toString(),
            },
          });

          await deleteClient
            .delete(`/api/v2/account_book/${testAccountBookId}/account/${createdAccountId}`)
            .set('Cookie', cookies.join('; '));
        } catch (error) {
          // Info: (20250715 - Shirley) Ignore cleanup errors
          if (error instanceof Error) {
            error.message += ' - Ignored during cleanup';
          }
        }
      }
    });
  });

  // ========================================
  // Info: (20250715 - Shirley) GET /api/v2/account_book/{accountBookId}/account/{accountId}
  // ========================================
  describe('GET /api/v2/account_book/{accountBookId}/account/{accountId}', () => {
    let testAccountId: number;

    beforeAll(async () => {
      // Info: (20250715 - Shirley) Create a test account for the GET by ID tests
      await authenticatedHelper.ensureAuthenticated();

      const newAccountData = {
        name: `Test Account for GET ${Date.now()}`,
        // code: `TESTGET${Date.now()}`,
        accountId: 1100,
        // parentCode: '1100',
        note: 'Test account for GET by ID tests',
      };

      const createResponse = await accountListClient
        .post(`/api/v2/account_book/${testAccountBookId}/account`)
        .send(newAccountData)
        .set('Cookie', cookies.join('; '));

      expect(createResponse.status).toBe(201);
      testAccountId = createResponse.body.payload.id;
    });

    it('should successfully get account details with valid ID', async () => {
      await authenticatedHelper.ensureAuthenticated();

      const getByIdClient = createTestClient({
        handler: accountByIdHandler,
        routeParams: {
          accountBookId: testAccountBookId.toString(),
          accountId: testAccountId.toString(),
        },
      });

      const response = await getByIdClient
        .get(`/api/v2/account_book/${testAccountBookId}/account/${testAccountId}`)
        .set('Cookie', cookies.join('; '));

      expect(response.status).toBe(200);

      // Info: (20250715 - Shirley) Validate basic response structure
      expect(response.body.success).toBe(true);
      expect(response.body.code).toContain('200'); // SUCCESS_GET
      expect(response.body.payload).toBeDefined();

      // Info: (20250715 - Shirley) Use production validateOutputData for account GET validation
      const { isOutputDataValid, outputData } = validateOutputData(
        APIName.ACCOUNT_GET_BY_ID,
        response.body.payload
      );

      expect(isOutputDataValid).toBe(true);
      expect(outputData).toBeDefined();

      // Info: (20250715 - Shirley) Validate account structure
      const account = outputData as IAccount;
      expect(account.id).toBe(testAccountId);
      expect(account.name).toBeDefined();
      expect(typeof account.name).toBe('string');
      expect(account.code).toBeDefined();
      expect(typeof account.code).toBe('string');
    });

    it('should reject unauthenticated requests', async () => {
      const getByIdClient = createTestClient({
        handler: accountByIdHandler,
        routeParams: {
          accountBookId: testAccountBookId.toString(),
          accountId: testAccountId.toString(),
        },
      });

      const response = await getByIdClient
        .get(`/api/v2/account_book/${testAccountBookId}/account/${testAccountId}`)
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

    it('should reject access to non-existent account', async () => {
      await authenticatedHelper.ensureAuthenticated();

      const getByIdClient = createTestClient({
        handler: accountByIdHandler,
        routeParams: {
          accountBookId: testAccountBookId.toString(),
          accountId: '999999',
        },
      });

      const response = await getByIdClient
        .get(`/api/v2/account_book/${testAccountBookId}/account/999999`)
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

    it('should reject invalid account ID parameter', async () => {
      await authenticatedHelper.ensureAuthenticated();

      const getByIdClient = createTestClient({
        handler: accountByIdHandler,
        routeParams: {
          accountBookId: testAccountBookId.toString(),
          accountId: 'invalid',
        },
      });

      const response = await getByIdClient
        .get(`/api/v2/account_book/${testAccountBookId}/account/invalid`)
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

    // Info: (20250715 - Shirley) Clean up test account
    afterAll(async () => {
      if (testAccountId) {
        try {
          await authenticatedHelper.ensureAuthenticated();

          const deleteClient = createTestClient({
            handler: accountByIdHandler,
            routeParams: {
              accountBookId: testAccountBookId.toString(),
              accountId: testAccountId.toString(),
            },
          });

          await deleteClient
            .delete(`/api/v2/account_book/${testAccountBookId}/account/${testAccountId}`)
            .set('Cookie', cookies.join('; '));
        } catch (error) {
          // Info: (20250715 - Shirley) Ignore cleanup errors
          if (error instanceof Error) {
            error.message += ' - Ignored during cleanup';
          }
        }
      }
    });
  });

  // ========================================
  // Info: (20250715 - Shirley) PUT /api/v2/account_book/{accountBookId}/account/{accountId}
  // ========================================
  describe('PUT /api/v2/account_book/{accountBookId}/account/{accountId}', () => {
    let testAccountId: number;
    let originalAccountData: IAccount;

    beforeAll(async () => {
      // Info: (20250715 - Shirley) Create a test account for the PUT tests
      await authenticatedHelper.ensureAuthenticated();

      const newAccountData = {
        name: `Test Account for PUT ${Date.now()}`,
        // code: `TESTPUT${Date.now()}`,
        accountId: 1100,
        // parentCode: '1100',
        note: 'Test account for PUT tests',
      };

      const createResponse = await accountListClient
        .post(`/api/v2/account_book/${testAccountBookId}/account`)
        .send(newAccountData)
        .set('Cookie', cookies.join('; '));

      expect(createResponse.status).toBe(201);
      testAccountId = createResponse.body.payload.id;
      originalAccountData = createResponse.body.payload;
    });

    it('should successfully update account info with valid data', async () => {
      await authenticatedHelper.ensureAuthenticated();

      const updateData = {
        ...originalAccountData,
        name: `Updated Account Name ${Date.now()}`,
        note: 'Updated note for account',
      };

      const putByIdClient = createTestClient({
        handler: accountByIdHandler,
        routeParams: {
          accountBookId: testAccountBookId.toString(),
          accountId: testAccountId.toString(),
        },
      });

      const response = await putByIdClient
        .put(`/api/v2/account_book/${testAccountBookId}/account/${testAccountId}`)
        .send(updateData)
        .set('Cookie', cookies.join('; '));

      expect(response.status).toBe(200);

      // Info: (20250715 - Shirley) Validate basic response structure
      expect(response.body.success).toBe(true);
      expect(response.body.code).toBe('200ISF0003'); // SUCCESS_UPDATE
      expect(response.body.payload).toBeDefined();

      // Info: (20250715 - Shirley) Use production validateOutputData for account update validation
      const { isOutputDataValid, outputData } = validateOutputData(
        APIName.UPDATE_ACCOUNT_INFO_BY_ID,
        response.body.payload
      );

      expect(isOutputDataValid).toBe(true);
      expect(outputData).toBeDefined();

      // Info: (20250715 - Shirley) Validate updated account structure
      const updatedAccount = outputData as IAccount;
      expect(updatedAccount.id).toBe(testAccountId);
      expect(updatedAccount.name).toBe(updateData.name);
      expect(updatedAccount.note).toBe(updateData.note);
    });

    it('should reject unauthenticated update requests', async () => {
      const updateData = {
        ...originalAccountData,
        name: 'Unauthorized Update',
      };

      const putByIdClient = createTestClient({
        handler: accountByIdHandler,
        routeParams: {
          accountBookId: testAccountBookId.toString(),
          accountId: testAccountId.toString(),
        },
      });

      const response = await putByIdClient
        .put(`/api/v2/account_book/${testAccountBookId}/account/${testAccountId}`)
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

      const invalidData = {
        id: 'invalid_id',
        name: '', // Info: (20250715 - Shirley) Empty name should be invalid
        code: '', // Info: (20250715 - Shirley) Empty code should be invalid
      };

      const putByIdClient = createTestClient({
        handler: accountByIdHandler,
        routeParams: {
          accountBookId: testAccountBookId.toString(),
          accountId: testAccountId.toString(),
        },
      });

      const response = await putByIdClient
        .put(`/api/v2/account_book/${testAccountBookId}/account/${testAccountId}`)
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

    it('should reject access to non-existent account', async () => {
      await authenticatedHelper.ensureAuthenticated();

      const updateData = {
        ...originalAccountData,
        name: 'Update Non-existent Account',
      };

      const putByIdClient = createTestClient({
        handler: accountByIdHandler,
        routeParams: {
          accountBookId: testAccountBookId.toString(),
          accountId: '999999',
        },
      });

      const response = await putByIdClient
        .put(`/api/v2/account_book/${testAccountBookId}/account/999999`)
        .send(updateData)
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

    it('should handle method not allowed errors properly', async () => {
      await authenticatedHelper.ensureAuthenticated();

      const putByIdClient = createTestClient({
        handler: accountByIdHandler,
        routeParams: {
          accountBookId: testAccountBookId.toString(),
          accountId: testAccountId.toString(),
        },
      });

      // Info: (20250715 - Shirley) Test wrong HTTP method for account update
      const response = await putByIdClient
        .patch(`/api/v2/account_book/${testAccountBookId}/account/${testAccountId}`)
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

    // Info: (20250715 - Shirley) Clean up test account
    afterAll(async () => {
      if (testAccountId) {
        try {
          await authenticatedHelper.ensureAuthenticated();

          const deleteClient = createTestClient({
            handler: accountByIdHandler,
            routeParams: {
              accountBookId: testAccountBookId.toString(),
              accountId: testAccountId.toString(),
            },
          });

          await deleteClient
            .delete(`/api/v2/account_book/${testAccountBookId}/account/${testAccountId}`)
            .set('Cookie', cookies.join('; '));
        } catch (error) {
          // Info: (20250715 - Shirley) Ignore cleanup errors
          if (error instanceof Error) {
            error.message += ' - Ignored during cleanup';
          }
        }
      }
    });
  });
});
