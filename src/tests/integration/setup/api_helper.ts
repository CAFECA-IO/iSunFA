/** Info: (20250703 - Shirley)
 * Implements necessary utilities for integration test, including session management, authentication flow, and multi-user testing capabilities.
 *
 * Purpose:
 * - Simulate real user behavior through API calls
 * - Manage authentication sessions and cookies
 * - Support multi-user testing scenarios
 * - Abstract common API testing patterns
 *
 * Usage:
 * // Single user authentication
 * const helper = await APITestHelper.createWithEmail('user@isunfa.com');
 * const response = await helper.getStatusInfo();
 *
 * // Multi-user authentication
 * const helper = await APITestHelper.createWithMultipleUsers(['user1@isunfa.com', 'user2@isunfa.com']);
 * helper.switchToUser('user2@isunfa.com');
 */
import { createTestClient } from '@/tests/integration/setup/test_client';
import { TestClient } from '@/interfaces/test_client';
import { TestDataFactory } from '@/tests/integration/setup/test_data_factory';

// Info: (20250701 - Shirley) Import API handlers for testing
import otpHandler from '@/pages/api/v2/email/[email]/one_time_password';
import statusInfoHandler from '@/pages/api/v2/status_info';
import { APIPath } from '@/constants/api_connection';
import { TPlanType } from '@/interfaces/subscription';
import { WORK_TAG } from '@/interfaces/account_book';
import { LocaleKey } from '@/constants/normal_setting';
import { CurrencyType } from '@/constants/currency';

interface TestResponse {
  status: number;
  body: {
    success: boolean;
    code?: string;
    payload?: Record<string, unknown>;
  };
}

interface AuthFlowResult {
  otpResponse: TestResponse;
  authResponse: TestResponse;
  statusResponse: TestResponse;
}

interface EmailTestResult {
  email: string;
  success: boolean;
  response?: AuthFlowResult;
  error?: Error;
}

export class APITestHelper {
  private statusClient: TestClient;

  private sessionCookies: string[] = [];

  // Info: (20250703 - Shirley) Multi-user session management
  private userSessions: Map<string, string[]> = new Map();

  private currentUser: string | null = null;

  constructor() {
    // Info: (20250701 - Shirley) Create test clients for different API endpoints
    this.statusClient = createTestClient(statusInfoHandler);
  }

  // Info: (20250701 - Shirley) Extract and store session cookies from response
  private extractSessionCookies(
    response: { headers: { 'set-cookie'?: string[] } },
    email?: string
  ): void {
    const setCookieHeaders = response.headers['set-cookie'];
    if (setCookieHeaders) {
      const sessionCookies = setCookieHeaders
        .filter((cookie: string) => cookie.includes('isunfa='))
        .map((cookie: string) => cookie.split(';')[0]);

      // Info: (20250703 - Shirley) Store cookies for specific user if email provided
      if (email) {
        this.userSessions.set(email, [...sessionCookies]);
        this.currentUser = email;
      } else {
        // Info: (20250703 - Shirley) Fallback to legacy behavior
        this.sessionCookies.push(...sessionCookies);
      }
    }
  }

  // Info: (20250701 - Shirley) Create dynamic OTP client for specific email
  private static createOTPClient(email: string): TestClient {
    return createTestClient({ handler: otpHandler, routeParams: { email } });
  }

  // Info: (20250701 - Shirley) Simulate user requesting OTP through API
  // eslint-disable-next-line class-methods-use-this
  async requestOTP(email?: string): Promise<TestResponse> {
    const testEmail = email || TestDataFactory.PRIMARY_TEST_EMAIL;
    const otpClient = APITestHelper.createOTPClient(testEmail);

    return otpClient.get('/').expect(200);
  }

  // Info: (20250701 - Shirley) Simulate user authentication through API
  async authenticateWithOTP(email?: string, code?: string): Promise<TestResponse> {
    const authData = TestDataFactory.createAuthenticationRequest(email, code);
    const otpClient = APITestHelper.createOTPClient(authData.email);

    const response = await otpClient.post('/').send({ code: authData.code }).expect(200);

    // Info: (20250701 - Shirley) Extract session cookies from authentication response
    this.extractSessionCookies(response, authData.email);

    return response;
  }

  // Info: (20250701 - Shirley) Get current user status through API
  async getStatusInfo(): Promise<TestResponse> {
    let request = this.statusClient.get('/api/v2/status_info');
    const currentSession = this.getCurrentSession();
    if (currentSession.length > 0) {
      request = request.set('Cookie', currentSession.join('; '));
    }
    return request.expect(200) as Promise<TestResponse>;
  }

  // Info: (20250703 - Shirley) Complete authentication flow - request OTP then authenticate
  async completeAuthenticationFlow(email?: string, code?: string): Promise<AuthFlowResult> {
    return this.performAuthentication(email, code);
  }

  // Info: (20250703 - Shirley) Test all default emails for authentication
  static async testAllDefaultEmails(): Promise<Array<EmailTestResult>> {
    const results: Array<EmailTestResult> = [];

    // Info: (20250703 - Shirley) Use Promise.all instead of for loop to avoid eslint warnings
    const emailPromises = TestDataFactory.DEFAULT_TEST_EMAILS.map(async (email) => {
      try {
        // Info: (20250703 - Shirley) Create a fresh helper for each email to avoid session conflicts
        const emailHelper = new APITestHelper();
        const response = await emailHelper.completeAuthenticationFlow(email);
        return {
          email,
          success: true,
          response,
        };
      } catch (error) {
        return {
          email,
          success: false,
          error: error as Error,
        };
      }
    });

    const promiseResults = await Promise.all(emailPromises);
    results.push(...promiseResults);

    return results;
  }

  // Info: (20250703 - Shirley) Clear session cookies for fresh authentication
  clearSession(): void {
    this.sessionCookies = [];
    // Info: (20250703 - Shirley) Also clear multi-user session data for complete reset
    this.currentUser = null;
    this.userSessions.clear();
  }

  // Info: (20250703 - Shirley) Get current session cookies for debugging
  getCurrentSession(): string[] {
    if (this.currentUser && this.userSessions.has(this.currentUser)) {
      return [...this.userSessions.get(this.currentUser)!];
    }
    return [...this.sessionCookies];
  }

  // Info: (20250703 - Shirley) Check if user is currently authenticated
  isAuthenticated(): boolean {
    if (this.currentUser && this.userSessions.has(this.currentUser)) {
      return this.userSessions.get(this.currentUser)!.length > 0;
    }
    return this.sessionCookies.length > 0;
  }

  // Info: (20250703 - Shirley) Core authentication method to avoid duplication
  private async performAuthentication(email?: string, code?: string): Promise<AuthFlowResult> {
    const testEmail = email || TestDataFactory.PRIMARY_TEST_EMAIL;
    const testCode = code || TestDataFactory.DEFAULT_VERIFICATION_CODE;

    const otpResponse = await this.requestOTP(testEmail);
    const authResponse = await this.authenticateWithOTP(testEmail, testCode);
    const statusResponse = await this.getStatusInfo();

    return { otpResponse, authResponse, statusResponse };
  }

  // Info: (20250703 - Shirley) Quick authentication for test setup - throws if authentication fails
  async ensureAuthenticated(): Promise<void> {
    if (!this.isAuthenticated()) {
      this.clearSession();
      const result = await this.performAuthentication();
      if (!result.authResponse.body.success) {
        throw new Error(`Authentication failed: ${result.authResponse.body.code}`);
      }
    }
  }

  // Info: (20250703 - Shirley) Multi-user authentication methods

  // Info: (20250703 - Shirley) Login with specific email
  async loginWithEmail(email: string): Promise<AuthFlowResult> {
    // Info: (20250703 - Shirley) Validate email is in default list
    if (!TestDataFactory.DEFAULT_TEST_EMAILS.includes(email)) {
      throw new Error(`Email ${email} is not in the default test emails list`);
    }

    const result = await this.performAuthentication(email);
    if (!result.authResponse.body.success) {
      throw new Error(`Authentication failed for ${email}: ${result.authResponse.body.code}`);
    }

    return result;
  }

  // Info: (20250703 - Shirley) Switch to a specific user
  switchToUser(email: string): void {
    if (!this.userSessions.has(email)) {
      throw new Error(`User ${email} is not authenticated. Please login first.`);
    }
    this.currentUser = email;
  }

  // Info: (20250703 - Shirley) Get current user email
  getCurrentUser(): string | null {
    return this.currentUser;
  }

  // Info: (20250703 - Shirley) Check if specific user is authenticated
  isUserAuthenticated(email: string): boolean {
    return this.userSessions.has(email) && this.userSessions.get(email)!.length > 0;
  }

  // Info: (20250703 - Shirley) Get all authenticated users
  getAllAuthenticatedUsers(): string[] {
    return Array.from(this.userSessions.keys()).filter(
      (email) => this.userSessions.get(email)!.length > 0
    );
  }

  // Info: (20250703 - Shirley) Clear session for specific user
  clearUserSession(email: string): void {
    this.userSessions.delete(email);
    if (this.currentUser === email) {
      this.currentUser = null;
    }
  }

  // Info: (20250703 - Shirley) Clear all user sessions
  clearAllUserSessions(): void {
    this.userSessions.clear();
    this.currentUser = null;
    this.sessionCookies = [];
  }

  // Info: (20250703 - Shirley) Unified helper creation method
  static async createHelper(options?: {
    email?: string;
    emails?: string[];
    autoAuth?: boolean;
  }): Promise<APITestHelper> {
    const helper = new APITestHelper();

    if (options?.emails?.length) {
      // Multi-user mode
      await helper.authenticateMultipleUsers(options.emails);
    } else if (options?.email) {
      // Single user mode
      await helper.loginWithEmail(options.email);
    } else if (options?.autoAuth !== false) {
      // Default auto authentication
      await helper.ensureAuthenticated();
    }

    return helper;
  }

  // Info: (20250703 - Shirley) Create helper with specific user already authenticated
  static async createWithEmail(email: string): Promise<APITestHelper> {
    return APITestHelper.createHelper({ email });
  }

  // Info: (20250703 - Shirley) Create helper with multiple users authenticated
  static async createWithMultipleUsers(emails: string[]): Promise<APITestHelper> {
    return APITestHelper.createHelper({ emails });
  }

  // Info: (20250703 - Shirley) Create authenticated helper instance for test reuse
  static async createAuthenticatedHelper(): Promise<APITestHelper> {
    return APITestHelper.createHelper({ autoAuth: true });
  }

  // Info: (20250703 - Shirley) Helper method for multi-user authentication
  private async authenticateMultipleUsers(emails: string[]): Promise<void> {
    // Info: (20250703 - Shirley) Login users sequentially to avoid server creation race conditions
    await emails.reduce(async (previousPromise, email) => {
      await previousPromise;
      await this.loginWithEmail(email);
    }, Promise.resolve());
    // Info: (20250703 - Shirley) Set first user as current
    if (emails.length > 0) {
      this.switchToUser(emails[0]);
    }
  }

  // Info: (20250707 - Shirley) Complete user registration flow with default values
  async completeUserRegistrationFlow(userId?: string): Promise<{
    agreementResponse: TestResponse;
    roleResponse: TestResponse;
    selectRoleResponse: TestResponse;
    statusResponse: TestResponse;
  }> {
    await this.ensureAuthenticated();
    const cookies = this.getCurrentSession();

    // Info: (20250707 - Shirley) Get user ID from status if not provided
    let userIdToUse = userId;
    if (!userIdToUse) {
      const statusResponse = await this.getStatusInfo();
      const userData = statusResponse.body.payload?.user as { id?: number };
      userIdToUse = userData?.id?.toString() || '1';
    }

    // Info: (20250707 - Shirley) Import handlers
    const { default: agreementHandler } = await import('@/pages/api/v2/user/[userId]/agreement');
    const { default: userRoleHandler } = await import('@/pages/api/v2/user/[userId]/role');
    const { default: userRoleSelectHandler } = await import(
      '@/pages/api/v2/user/[userId]/selected_role'
    );

    // Info: (20250707 - Shirley) Create clients
    const agreementClient = createTestClient({
      handler: agreementHandler,
      routeParams: { userId: userIdToUse },
    });
    const userRoleCreateClient = createTestClient({
      handler: userRoleHandler,
      routeParams: { userId: userIdToUse },
    });
    const userRoleSelectClient = createTestClient({
      handler: userRoleSelectHandler,
      routeParams: { userId: userIdToUse },
    });

    // Info: (20250707 - Shirley) Step 1: Agree to terms
    const agreementData = TestDataFactory.createTermsAgreementRequest();
    const agreementResponse = await agreementClient
      .post(`/api/v1/user/${userIdToUse}/agreement`)
      .send(agreementData)
      .set('Cookie', cookies.join('; '));

    // Info: (20250707 - Shirley) Step 2: Create role
    const roleData = TestDataFactory.createRoleRequest();
    const roleResponse = await userRoleCreateClient
      .post(`/api/v2/user/${userIdToUse}/role`)
      .send(roleData)
      .set('Cookie', cookies.join('; '));

    // Info: (20250707 - Shirley) Step 3: Select role
    const selectRoleResponse = await userRoleSelectClient
      .put(`/api/v2/user/${userIdToUse}/selected_role`)
      .send(roleData)
      .set('Cookie', cookies.join('; '));

    // Info: (20250707 - Shirley) Handle 405 error gracefully for role selection
    if (selectRoleResponse.status === 405) {
      // eslint-disable-next-line no-console
      console.warn('Role selection returned 405, this may be due to API routing issues');
    }

    // Info: (20250707 - Shirley) Step 4: Get final status
    const statusResponse = await this.getStatusInfo();

    return {
      agreementResponse,
      roleResponse,
      selectRoleResponse,
      statusResponse,
    };
  }

  // Info: (20250707 - Shirley) Simple agreement method using default values
  async agreeToTerms(userId?: string): Promise<TestResponse> {
    await this.ensureAuthenticated();
    const cookies = this.getCurrentSession();

    // Info: (20250707 - Shirley) Get user ID from status if not provided
    let userIdToUse = userId;
    if (!userIdToUse) {
      const statusResponse = await this.getStatusInfo();
      const userData = statusResponse.body.payload?.user as { id?: number };
      userIdToUse = userData?.id?.toString() || '1';
    }

    const { default: agreementHandler } = await import('@/pages/api/v2/user/[userId]/agreement');
    const agreementClient = createTestClient({
      handler: agreementHandler,
      routeParams: { userId: userIdToUse },
    });

    const agreementData = TestDataFactory.createTermsAgreementRequest();
    return agreementClient
      .post(`/api/v1/user/${userIdToUse}/agreement`)
      .send(agreementData)
      .set('Cookie', cookies.join('; '));
  }

  // Info: (20250707 - Shirley) Simple role creation method using default values
  async createUserRole(userId?: string, roleName?: string): Promise<TestResponse> {
    await this.ensureAuthenticated();
    const cookies = this.getCurrentSession();

    // Info: (20250707 - Shirley) Get user ID from status if not provided
    let userIdToUse = userId;
    if (!userIdToUse) {
      const statusResponse = await this.getStatusInfo();
      const userData = statusResponse.body.payload?.user as { id?: number };
      userIdToUse = userData?.id?.toString() || '1';
    }

    const { default: userRoleHandler } = await import('@/pages/api/v2/user/[userId]/role');
    const userRoleClient = createTestClient({
      handler: userRoleHandler,
      routeParams: { userId: userIdToUse },
    });

    const roleData = TestDataFactory.createRoleRequest(roleName);
    return userRoleClient
      .post(`/api/v2/user/${userIdToUse}/role`)
      .send(roleData)
      .set('Cookie', cookies.join('; '));
  }

  // Info: (20250707 - Shirley) Simple role selection method using default values
  async selectUserRole(userId?: string, roleName?: string): Promise<TestResponse> {
    await this.ensureAuthenticated();
    const cookies = this.getCurrentSession();

    // Info: (20250707 - Shirley) Get user ID from status if not provided
    let userIdToUse = userId;
    if (!userIdToUse) {
      const statusResponse = await this.getStatusInfo();
      const userData = statusResponse.body.payload?.user as { id?: number };
      userIdToUse = userData?.id?.toString() || '1';
    }

    const { default: userRoleSelectHandler } = await import(
      '@/pages/api/v2/user/[userId]/selected_role'
    );
    const userRoleSelectClient = createTestClient({
      handler: userRoleSelectHandler,
      routeParams: { userId: userIdToUse },
    });

    const roleData = TestDataFactory.createRoleRequest(roleName);
    return userRoleSelectClient
      .put(`/api/v2/user/${userIdToUse}/selected_role`)
      .send(roleData)
      .set('Cookie', cookies.join('; '));
  }

  // Info: (20250707 - Shirley) Check if user has already agreed to terms
  async hasUserAgreedToTerms(): Promise<boolean> {
    await this.ensureAuthenticated();

    try {
      const statusResponse = await this.getStatusInfo();
      const userData = statusResponse.body.payload?.user as {
        id?: number;
        hasAgreedToTerms?: boolean;
        agreementHash?: string;
      };

      // Info: (20250707 - Shirley) Check if user has agreement data
      return Boolean(userData?.hasAgreedToTerms || userData?.agreementHash);
    } catch (error) {
      return false;
    }
  }

  // Info: (20250707 - Shirley) List all available roles
  async listRoles(): Promise<TestResponse> {
    await this.ensureAuthenticated();
    const cookies = this.getCurrentSession();

    const { default: roleListHandler } = await import('@/pages/api/v2/role');
    const roleListClient = createTestClient(roleListHandler);

    return roleListClient.get('/').set('Cookie', cookies.join('; '));
  }

  // Info: (20250710 - Shirley) Create team method for account book testing
  async createTeam(teamName?: string): Promise<TestResponse> {
    await this.ensureAuthenticated();
    const cookies = this.getCurrentSession();

    const { default: teamCreateHandler } = await import('@/pages/api/v2/team');
    const teamCreateClient = createTestClient(teamCreateHandler);

    const teamData = {
      name: teamName || `Test Team ${Date.now()}`,
      about: 'Test team for integration testing',
      planType: TPlanType.TRIAL,
    };

    return teamCreateClient
      .post(APIPath.CREATE_TEAM)
      .send(teamData)
      .set('Cookie', cookies.join('; '));
  }

  // Info: (20250707 - Shirley) Complete registration flow for all test users from default_value.ts
  static async processAllTestUsers(): Promise<
    Array<{
      email: string;
      success: boolean;
      userId?: string;
      agreementResponse?: TestResponse;
      roleResponse?: TestResponse;
      selectRoleResponse?: TestResponse;
      statusResponse?: TestResponse;
      error?: Error;
    }>
  > {
    const results: Array<{
      email: string;
      success: boolean;
      userId?: string;
      agreementResponse?: TestResponse;
      roleResponse?: TestResponse;
      selectRoleResponse?: TestResponse;
      statusResponse?: TestResponse;
      error?: Error;
    }> = [];

    // Info: (20250707 - Shirley) Process all test emails from default_value.ts sequentially
    await TestDataFactory.DEFAULT_TEST_EMAILS.reduce(async (previousPromise, email) => {
      await previousPromise;
      try {
        // Info: (20250707 - Shirley) Create fresh helper for each user
        const helper = await APITestHelper.createHelper({ email });

        // Info: (20250707 - Shirley) Get user ID from status
        const statusResponse = await helper.getStatusInfo();
        const userData = statusResponse.body.payload?.user as { id?: number };
        const userId = userData?.id?.toString();

        if (!userId) {
          throw new Error(`Unable to get user ID for ${email}`);
        }

        // Info: (20250707 - Shirley) Check if user has already agreed to terms
        const hasAgreed = await helper.hasUserAgreedToTerms();

        let agreementResponse;

        if (!hasAgreed) {
          // Info: (20250707 - Shirley) Complete user registration flow
          agreementResponse = await helper.agreeToTerms(userId);
        }

        // Info: (20250707 - Shirley) Always create and select role
        const roleResponse = await helper.createUserRole(userId);
        const selectRoleResponse = await helper.selectUserRole(userId);

        // Info: (20250707 - Shirley) Get final status
        const finalStatusResponse = await helper.getStatusInfo();

        results.push({
          email,
          success: true,
          userId,
          agreementResponse,
          roleResponse,
          selectRoleResponse,
          statusResponse: finalStatusResponse,
        });
      } catch (error) {
        results.push({
          email,
          success: false,
          error: error as Error,
        });
      }
    }, Promise.resolve());

    return results;
  }

  // Info: (20250707 - Shirley) Process specific test user with full registration flow
  static async processTestUser(email: string): Promise<{
    email: string;
    success: boolean;
    userId?: string;
    agreementResponse?: TestResponse;
    roleResponse?: TestResponse;
    selectRoleResponse?: TestResponse;
    statusResponse?: TestResponse;
    error?: Error;
  }> {
    try {
      // Info: (20250707 - Shirley) Validate email is in default test emails
      if (!TestDataFactory.DEFAULT_TEST_EMAILS.includes(email)) {
        throw new Error(`Email ${email} is not in the default test emails list`);
      }

      // Info: (20250707 - Shirley) Create authenticated helper
      const helper = await APITestHelper.createHelper({ email });

      // Info: (20250707 - Shirley) Get user ID
      const statusResponse = await helper.getStatusInfo();
      const userData = statusResponse.body.payload?.user as { id?: number };
      const userId = userData?.id?.toString();

      if (!userId) {
        throw new Error(`Unable to get user ID for ${email}`);
      }

      // Info: (20250707 - Shirley) Check if user has already agreed to terms
      const hasAgreed = await helper.hasUserAgreedToTerms();

      let agreementResponse;
      const roleResponse = await helper.createUserRole(userId);
      const selectRoleResponse = await helper.selectUserRole(userId);

      if (!hasAgreed) {
        // Info: (20250707 - Shirley) User needs to agree to terms
        agreementResponse = await helper.agreeToTerms(userId);
      }

      // Info: (20250707 - Shirley) Get final status
      const finalStatusResponse = await helper.getStatusInfo();

      return {
        email,
        success: true,
        userId,
        agreementResponse,
        roleResponse,
        selectRoleResponse,
        statusResponse: finalStatusResponse,
      };
    } catch (error) {
      return {
        email,
        success: false,
        error: error as Error,
      };
    }
  }

  async createAccountBook(userId: number, teamId: number) {
    await this.ensureAuthenticated();
    const cookies = this.getCurrentSession();

    const { default: accountBookCreateHandler } = await import(
      '@/pages/api/v2/user/[userId]/account_book'
    );
    const accountBookCreateClient = createTestClient({
      handler: accountBookCreateHandler,
      routeParams: { userId: userId.toString() },
    });
    const randomTaxId = `${Math.floor(Math.random() * 90000000) + 10000000}`;
    const accountBook = {
      name: `IT Shared Test Account Book`,
      taxId: randomTaxId,
      tag: WORK_TAG.ALL,
      teamId,
      businessLocation: LocaleKey.tw,
      accountingCurrency: CurrencyType.TWD,
      representativeName: 'VT Rep',
      taxSerialNumber: `VT${randomTaxId}`,
      contactPerson: 'VT Tester',
      phoneNumber: '+886-2-1234-5678',
      city: 'Taipei',
      district: 'Zhongzheng',
      enteredAddress: '100 Test Rd, Zhongzheng, Taipei',
    };

    const response = await accountBookCreateClient
      .post(APIPath.CREATE_ACCOUNT_BOOK.replace(':userId', userId.toString()))
      .send(accountBook)
      .set('Cookie', cookies.join('; '));

    return response.body.payload?.id || 0;
  }

  // Info: (20250711 - Shirley) Create test account book for integration tests
  async createTestAccountBook(): Promise<number> {
    const cookies = this.getCurrentSession();

    // Info: (20250711 - Shirley) Get user ID from status
    const statusResponse = await this.getStatusInfo();
    const userData = statusResponse.body.payload?.user as { id?: number };
    const userId = userData?.id?.toString() || '1';

    // Info: (20250711 - Shirley) Create a team first
    const teamResponse = await this.createTeam(`Accounting Test Team ${Date.now()}`);
    const teamData = teamResponse.body.payload?.team as { id?: number };
    const teamId = teamData?.id || 0;

    // Info: (20250711 - Shirley) Create account book
    const accountBookData = {
      teamId,
      name: `Test Company ${Date.now()}`,
      taxId: `${Date.now()}`,
      tag: 'ALL',
      businessLocation: 'tw',
      accountingCurrency: 'TWD',
    };

    // Info: (20250711 - Shirley) Import account book handler and create client
    const { default: accountBookHandler } = await import(
      '@/pages/api/v2/user/[userId]/account_book'
    );
    const accountBookClient = createTestClient({
      handler: accountBookHandler,
      routeParams: { userId },
    });

    const accountBookResponse = await accountBookClient
      .post(`/api/v2/user/${userId}/account_book`)
      .send(accountBookData)
      .set('Cookie', cookies.join('; '));

    return accountBookResponse.body.payload.id;
  }
}
