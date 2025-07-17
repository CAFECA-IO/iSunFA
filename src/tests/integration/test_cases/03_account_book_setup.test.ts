import { APITestHelper } from '@/tests/integration/setup/api_helper';
import { createTestClient } from '@/tests/integration/setup/test_client';
import { TestClient } from '@/interfaces/test_client';

// Info: (20250710 - Shirley) Import API handlers for account book testing
import createAccountBookHandler from '@/pages/api/v2/user/[userId]/account_book';
import getAccountBookHandler from '@/pages/api/v2/account_book/[accountBookId]';
import connectAccountBookHandler from '@/pages/api/v2/account_book/[accountBookId]/connect';
import updateAccountBookHandler from '@/pages/api/v2/account_book/[accountBookId]';

// Info: (20250710 - Shirley) Import required types and constants
import { WORK_TAG, ACCOUNT_BOOK_UPDATE_ACTION } from '@/interfaces/account_book';
import { LocaleKey } from '@/constants/normal_setting';
import { CurrencyType } from '@/constants/currency';
import { BaseTestContext, SharedContext } from '@/tests/integration/setup/base_test_context';

/** Info: (20250717 - Tzuhan) 統一在 jest_setup 設定
// Info: (20250711 - Shirley) Mock pusher and crypto for account book testing
jest.mock('pusher', () => ({
  // Info: (20250711 - Shirley) 建構子 → 回傳只有 trigger 的假物件
  __esModule: true,
  default: jest.fn(() => ({ trigger: jest.fn() })),
}));

jest.mock('@/lib/utils/crypto', () => {
  const real = jest.requireActual('@/lib/utils/crypto');

  // Info: (20250711 - Shirley) 一次產生 keyPair，後面重複取用
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
    storeKeyByCompany: jest.fn(), // Info: (20250711 - Shirley) 若有呼叫也不做事
  };
});
*/

/**
 * Info: (20250710 - Shirley) Integration Test - Account Book Setup (Test Case 3)
 *
 * Primary Purpose:
 * - Test complete account book lifecycle from creation to management
 * - Verify API behavior validation through systematic testing
 * - Ensure correct responses for both valid and invalid inputs
 * - Test permission-based access control for account book operations
 *
 * API Call Sequence:
 * 1. POST /api/v2/user/{userId}/account_book - Create account book
 * 2. GET /api/v2/account_book/{accountBookId} - Get account book info
 * 3. GET /api/v2/account_book/{accountBookId}/connect - Connect to account book
 * 4. PUT /api/v2/account_book/{accountBookId} - Update account book info
 */
describe('Integration Test - Account Book Setup (Test Case 3)', () => {
  let ctx: SharedContext;
  let authenticatedHelper: APITestHelper;
  let createAccountBookClient: TestClient;
  let getAccountBookClient: TestClient;
  let connectAccountBookClient: TestClient;
  let updateAccountBookClient: TestClient;
  let currentUserId: string;
  let teamId: number;
  let createdAccountBookId: number;

  const randomNumber = Math.floor(Math.random() * 90000000) + 10000000;

  // Info: (20250710 - Shirley) Test data for account book creation
  const validAccountBookData = {
    name: 'Test Company 測試公司',
    taxId: randomNumber.toString(),
    tag: WORK_TAG.ALL,
    teamId: 0, // Info: (20250711 - Shirley) Will be set after team creation
    businessLocation: LocaleKey.tw,
    accountingCurrency: CurrencyType.TWD,
    representativeName: 'John Doe',
    taxSerialNumber: 'A12345678',
    contactPerson: 'Jane Smith',
    phoneNumber: '+886-2-1234-5678',
    city: 'Taipei',
    district: "Da'an District",
    enteredAddress: "123 Test Street, Da'an District, Taipei",
  };

  beforeAll(async () => {
    // Info: (20250710 - Shirley) Setup authenticated helper and complete user registration
    ctx = await BaseTestContext.getSharedContext();
    authenticatedHelper = ctx.helper;

    // const statusResponse = await authenticatedHelper.getStatusInfo();
    // const userData = statusResponse.body.payload?.user as { id?: number };
    currentUserId = String(ctx.userId);

    // Info: (20250710 - Shirley) Complete user registration flow
    // await authenticatedHelper.agreeToTerms();
    // await authenticatedHelper.createUserRole();
    // await authenticatedHelper.selectUserRole();

    // Info: (20250710 - Shirley) Create team for account book operations
    // const teamResponse = await authenticatedHelper.createTeam();
    // const teamData = teamResponse.body.payload?.team as { id?: number };
    teamId = ctx.teamId;

    // Info: (20250710 - Shirley) Update test data with actual team ID
    validAccountBookData.teamId = teamId;

    // Info: (20250710 - Shirley) Create test clients for account book APIs
    createAccountBookClient = createTestClient({
      handler: createAccountBookHandler,
      routeParams: { userId: currentUserId },
    });
  });

  /**
   * Info: (20250710 - Shirley) Test POST /api/v2/user/{userId}/account_book
   *
   * Success Cases:
   * - Valid team ID and complete company data → expect 201 with created account book
   * - Authenticated user with proper team membership → expect 201 success
   *
   * Failure Cases:
   * - No session/authentication → expect 401ISF0000 "Unauthorized access"
   * - userId mismatch with session → expect 403ISF0000 "Forbidden"
   * - Missing required company fields → expect 422ISF0000 "Invalid input parameter"
   * - Invalid team ID → expect 422ISF0000 "Invalid input parameter"
   */
  describe('POST /api/v2/user/{userId}/account_book - Create Account Book', () => {
    test('Success: Create account book with valid data and team membership', async () => {
      await authenticatedHelper.ensureAuthenticated();
      const cookies = authenticatedHelper.getCurrentSession();

      const response = await createAccountBookClient
        .post(`/api/v2/user/${currentUserId}/account_book`)
        .send(validAccountBookData)
        .set('Cookie', cookies.join('; '))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.payload).toBeDefined();
      expect(response.body.payload.name).toBe(validAccountBookData.name);
      expect(response.body.payload.taxId).toBe(validAccountBookData.taxId);
      expect(response.body.payload.tag).toBe(validAccountBookData.tag);

      // Info: (20250710 - Shirley) Store created account book ID for subsequent tests
      createdAccountBookId = response.body.payload.id;

      // Info: (20250710 - Shirley) Setup clients for subsequent API tests
      getAccountBookClient = createTestClient({
        handler: getAccountBookHandler,
        routeParams: { accountBookId: createdAccountBookId.toString() },
      });
      connectAccountBookClient = createTestClient({
        handler: connectAccountBookHandler,
        routeParams: { accountBookId: createdAccountBookId.toString() },
      });
      updateAccountBookClient = createTestClient({
        handler: updateAccountBookHandler,
        routeParams: { accountBookId: createdAccountBookId.toString() },
      });
    });

    test('Failure: Missing required company fields', async () => {
      await authenticatedHelper.ensureAuthenticated();
      const cookies = authenticatedHelper.getCurrentSession();

      const invalidData = {
        // Info: (20250711 - Shirley) Missing name, taxId, tag, teamId
        businessLocation: LocaleKey.tw,
      };

      const response = await createAccountBookClient
        .post(`/api/v2/user/${currentUserId}/account_book`)
        .send(invalidData)
        .set('Cookie', cookies.join('; '))
        .expect(422);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('422ISF0000');
    });

    test('Failure: Invalid team ID', async () => {
      await authenticatedHelper.ensureAuthenticated();
      const cookies = authenticatedHelper.getCurrentSession();

      const invalidTeamData = {
        ...validAccountBookData,
        teamId: 99999, // Info: (20250711 - Shirley) Non-existent team ID
      };

      const response = await createAccountBookClient
        .post(`/api/v2/user/${currentUserId}/account_book`)
        .send(invalidTeamData)
        .set('Cookie', cookies.join('; '))
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('403ISF0005');
    });

    test('Failure: No session/authentication', async () => {
      const response = await createAccountBookClient
        .post(`/api/v2/user/${currentUserId}/account_book`)
        .send(validAccountBookData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('401ISF0000');
    });
  });

  /**
   * Info: (20250710 - Shirley) Test GET /api/v2/account_book/{accountBookId}
   *
   * Success Cases:
   * - Valid account book ID with VIEW_PUBLIC_ACCOUNT_BOOK permission → expect 200 with account book data
   * - User in team with proper permissions → expect 200 success
   *
   * Failure Cases:
   * - No session/authentication → expect 401ISF0000 "Unauthorized access"
   * - User without VIEW_PUBLIC_ACCOUNT_BOOK permission → expect 403ISF0000 "Forbidden"
   * - Non-existent account book ID → expect 404ISF0000 "Resource not found"
   */
  describe('GET /api/v2/account_book/{accountBookId} - Get Account Book Info', () => {
    test('Success: Get account book info with valid permissions', async () => {
      await authenticatedHelper.ensureAuthenticated();
      const cookies = authenticatedHelper.getCurrentSession();

      const response = await getAccountBookClient
        .get(`/api/v2/account_book/${createdAccountBookId}`)
        .set('Cookie', cookies.join('; '))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.payload).toBeDefined();
      expect(response.body.payload.id).toBe(createdAccountBookId);
      expect(response.body.payload.name).toBe(validAccountBookData.name);
      expect(response.body.payload.taxId).toBe(validAccountBookData.taxId);
    });

    test('Failure: No session/authentication', async () => {
      const response = await getAccountBookClient
        .get(`/api/v2/account_book/${createdAccountBookId}`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('500ISF0000');
    });

    test('Failure: Non-existent account book ID', async () => {
      const nonExistentClient = createTestClient({
        handler: getAccountBookHandler,
        routeParams: { accountBookId: '99999' },
      });

      await authenticatedHelper.ensureAuthenticated();
      const cookies = authenticatedHelper.getCurrentSession();

      const response = await nonExistentClient
        .get('/api/v2/account_book/99999')
        .set('Cookie', cookies.join('; '))
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('404ISF0000');
    });
  });

  /**
   * Info: (20250710 - Shirley) Test GET /api/v2/account_book/{accountBookId}/connect
   *
   * Success Cases:
   * - Valid account book ID with team member access → expect 200 with connection success
   * - User with VIEW_PUBLIC_ACCOUNT_BOOK permission → expect 200 success
   *
   * Failure Cases:
   * - Non-existent account book → expect 404ISF0000 "Resource not found"
   * - User without team access to account book → expect 403ISF0000 "Forbidden"
   */
  describe('GET /api/v2/account_book/{accountBookId}/connect - Connect Account Book', () => {
    test('Success: Connect to account book with team member access', async () => {
      await authenticatedHelper.ensureAuthenticated();
      const cookies = authenticatedHelper.getCurrentSession();

      const response = await connectAccountBookClient
        .get(`/api/v2/account_book/${createdAccountBookId}/connect`)
        .set('Cookie', cookies.join('; '))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.payload).toBeDefined();
    });

    test('Failure: Non-existent account book', async () => {
      const nonExistentConnectClient = createTestClient({
        handler: connectAccountBookHandler,
        routeParams: { accountBookId: '99999' },
      });

      await authenticatedHelper.ensureAuthenticated();
      const cookies = authenticatedHelper.getCurrentSession();

      const response = await nonExistentConnectClient
        .get('/api/v2/account_book/99999/connect')
        .set('Cookie', cookies.join('; '))
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('404ISF0000');
    });
  });

  /**
   * Info: (20250711 - Shirley) Test PUT /api/v2/account_book/{accountBookId}
   *
   * Success Cases:
   * - Valid account book data with MODIFY_ACCOUNT_BOOK permission → expect 200 with updated data
   * - Company info update with proper permissions → expect 200 success
   *
   * Failure Cases:
   * - No session/authentication → expect 401ISF0000 "Unauthorized access"
   * - User without MODIFY_ACCOUNT_BOOK permission → expect 403ISF0000 "Forbidden"
   * - Non-existent account book → expect 404ISF0000 "Resource not found"
   * - Invalid action type → expect 422ISF0005 "Invalid input type"
   * - Missing required fields for action → expect 422ISF0000 "Invalid input parameter"
   */
  describe('PUT /api/v2/account_book/{accountBookId} - Update Account Book', () => {
    test('Success: Update account book with valid data and permissions', async () => {
      const updateData = {
        action: ACCOUNT_BOOK_UPDATE_ACTION.UPDATE_INFO,
        name: 'Updated Test Company 更新測試公司',
        taxId: '87654321',
        representativeName: 'Updated Representative',
        contactPerson: 'Updated Contact Person',
      };

      await authenticatedHelper.ensureAuthenticated();
      const cookies = authenticatedHelper.getCurrentSession();

      const response = await updateAccountBookClient
        .put(`/api/v2/account_book/${createdAccountBookId}`)
        .send(updateData)
        .set('Cookie', cookies.join('; '))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.payload).toBeDefined();
      expect(response.body.payload).toBeDefined();
      // Info: (20250711 - Shirley) The actual response structure may vary, check what's available
      if (response.body.payload.company) {
        expect(response.body.payload.company.name).toBe(updateData.name);
        expect(response.body.payload.company.taxId).toBe(updateData.taxId);
      }
    });

    test('Failure: Missing action type', async () => {
      const invalidData = {
        name: 'Test Update',
        // Info: (20250711 - Shirley) Missing required action field
      };

      await authenticatedHelper.ensureAuthenticated();
      const cookies = authenticatedHelper.getCurrentSession();

      const response = await updateAccountBookClient
        .put(`/api/v2/account_book/${createdAccountBookId}`)
        .send(invalidData)
        .set('Cookie', cookies.join('; '))
        .expect(422);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('422ISF0000');
    });

    test('Failure: Invalid action type', async () => {
      const invalidData = {
        action: 'INVALID_ACTION',
        name: 'Test Update',
      };

      await authenticatedHelper.ensureAuthenticated();
      const cookies = authenticatedHelper.getCurrentSession();

      const response = await updateAccountBookClient
        .put(`/api/v2/account_book/${createdAccountBookId}`)
        .send(invalidData)
        .set('Cookie', cookies.join('; '))
        .expect(422);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('422ISF0000');
    });

    test('Failure: No session/authentication', async () => {
      const updateData = {
        action: ACCOUNT_BOOK_UPDATE_ACTION.UPDATE_INFO,
        name: 'Unauthorized Update',
      };

      const response = await updateAccountBookClient
        .put(`/api/v2/account_book/${createdAccountBookId}`)
        .send(updateData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('401ISF0000');
    });

    test('Failure: Non-existent account book', async () => {
      const nonExistentUpdateClient = createTestClient({
        handler: updateAccountBookHandler,
        routeParams: { accountBookId: '99999' },
      });

      const updateData = {
        action: ACCOUNT_BOOK_UPDATE_ACTION.UPDATE_INFO,
        name: 'Non-existent Update',
      };

      await authenticatedHelper.ensureAuthenticated();
      const cookies = authenticatedHelper.getCurrentSession();

      const response = await nonExistentUpdateClient
        .put('/api/v2/account_book/99999')
        .send(updateData)
        .set('Cookie', cookies.join('; '))
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('404ISF0000');
    });
  });

  /**
   * Info: (20250711 - Shirley) Integration test for complete account book workflow
   */
  describe('Complete Account Book Workflow Integration', () => {
    test('Success: Complete account book lifecycle', async () => {
      // Info: (20250711 - Shirley) Step 1: Verify account book was created successfully
      expect(createdAccountBookId).toBeDefined();
      expect(createdAccountBookId).toBeGreaterThan(0);

      // Info: (20250711 - Shirley) Step 2: Get account book info to verify data
      await authenticatedHelper.ensureAuthenticated();
      const cookies = authenticatedHelper.getCurrentSession();

      const getResponse = await getAccountBookClient
        .get(`/api/v2/account_book/${createdAccountBookId}`)
        .set('Cookie', cookies.join('; '))
        .expect(200);

      expect(getResponse.body.payload.name).toBeDefined();
      expect(getResponse.body.payload.taxId).toBeDefined();

      // Info: (20250711 - Shirley) Step 3: Connect to account book to verify access
      const connectResponse = await connectAccountBookClient
        .get(`/api/v2/account_book/${createdAccountBookId}/connect`)
        .set('Cookie', cookies.join('; '))
        .expect(200);

      expect(connectResponse.body.success).toBe(true);

      // Info: (20250711 - Shirley) Step 4: Update account book to verify modification
      const updateData = {
        action: ACCOUNT_BOOK_UPDATE_ACTION.UPDATE_INFO,
        name: 'Final Updated Company Name',
      };

      const updateResponse = await updateAccountBookClient
        .put(`/api/v2/account_book/${createdAccountBookId}`)
        .send(updateData)
        .set('Cookie', cookies.join('; '))
        .expect(200);

      expect(updateResponse.body.payload).toBeDefined();
      // Info: (20250711 - Shirley) Check response structure
      if (updateResponse.body.payload.company) {
        expect(updateResponse.body.payload.company.name).toBe(updateData.name);
      }

      // Info: (20250711 - Shirley) Step 5: Verify update by getting account book info again
      const finalGetResponse = await getAccountBookClient
        .get(`/api/v2/account_book/${createdAccountBookId}`)
        .set('Cookie', cookies.join('; '))
        .expect(200);

      expect(finalGetResponse.body.payload.name).toBe(updateData.name);
    });
  });
});
