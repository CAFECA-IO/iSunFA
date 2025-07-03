// Info: (20250701 - Shirley) API helper for integration tests - simulates real user behavior through API calls
import { createTestClient, createDynamicTestClient } from '@/tests/integration/test_client';
import { TestClient } from '@/interfaces/test_client';
import { TestDataFactory } from '@/tests/integration/test_data_factory';

// Info: (20250701 - Shirley) Import API handlers for testing
import otpHandler from '@/pages/api/v2/email/[email]/one_time_password';
import statusInfoHandler from '@/pages/api/v2/status_info';

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
    return createDynamicTestClient(otpHandler, { email });
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
}
