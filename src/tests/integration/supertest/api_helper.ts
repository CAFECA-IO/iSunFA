// Info: (20240701 - Shirley) API helper for integration tests - simulates real user behavior through API calls
import {
  createTestClient,
  createDynamicTestClient,
  TestClient,
} from '@/tests/integration/supertest/test_client';
import { TestDataFactory } from '@/tests/integration/supertest/test_data_factory';

// Info: (20240701 - Shirley) Import API handlers for testing
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

  constructor() {
    // Info: (20240701 - Shirley) Create test clients for different API endpoints
    this.statusClient = createTestClient(statusInfoHandler);
  }

  // Info: (20240701 - Shirley) Extract and store session cookies from response
  private extractSessionCookies(response: { headers: { 'set-cookie'?: string[] } }): void {
    const setCookieHeaders = response.headers['set-cookie'];
    if (setCookieHeaders) {
      const sessionCookies = setCookieHeaders
        .filter((cookie: string) => cookie.includes('isunfa='))
        .map((cookie: string) => cookie.split(';')[0]);
      this.sessionCookies.push(...sessionCookies);
    }
  }

  // Info: (20240701 - Shirley) Create dynamic OTP client for specific email
  private createOTPClient(email: string): TestClient {
    // Info: (20240701 - Shirley) Method accesses instance sessionCookies
    const client = createDynamicTestClient(otpHandler, { email });
    return this.sessionCookies.length > 0 ? client : client;
  }

  // Info: (20240701 - Shirley) Simulate user requesting OTP through API
  async requestOTP(email?: string): Promise<TestResponse> {
    const testEmail = email || TestDataFactory.PRIMARY_TEST_EMAIL;
    const otpClient = this.createOTPClient(testEmail);

    return otpClient.get('/').expect(200);
  }

  // Info: (20240701 - Shirley) Simulate user authentication through API
  async authenticateWithOTP(email?: string, code?: string): Promise<TestResponse> {
    const authData = TestDataFactory.createAuthenticationRequest(email, code);
    const otpClient = this.createOTPClient(authData.email);

    const response = await otpClient.post('/').send({ code: authData.code }).expect(200);

    // Info: (20240701 - Shirley) Extract session cookies from authentication response
    this.extractSessionCookies(response);

    return response;
  }

  // Info: (20240701 - Shirley) Get current user status through API
  async getStatusInfo(): Promise<TestResponse> {
    let request = this.statusClient.get('/api/v2/status_info');
    if (this.sessionCookies.length > 0) {
      request = request.set('Cookie', this.sessionCookies.join('; '));
    }
    return request.expect(200) as Promise<TestResponse>;
  }

  // Info: (20240701 - Shirley) Test authentication flow - request OTP then authenticate
  async completeAuthenticationFlow(email?: string, code?: string): Promise<AuthFlowResult> {
    const testEmail = email || TestDataFactory.PRIMARY_TEST_EMAIL;
    const testCode = code || TestDataFactory.DEFAULT_VERIFICATION_CODE;

    // Info: (20240701 - Shirley) Step 1: Request OTP
    const otpResponse = await this.requestOTP(testEmail);

    // Info: (20240701 - Shirley) Step 2: Authenticate with OTP
    const authResponse = await this.authenticateWithOTP(testEmail, testCode);

    // Info: (20240701 - Shirley) Step 3: Verify authentication by checking status
    const statusResponse = await this.getStatusInfo();

    return {
      otpResponse,
      authResponse,
      statusResponse,
    };
  }

  // Info: (20240701 - Shirley) Test all default emails for authentication
  async testAllDefaultEmails(): Promise<EmailTestResult[]> {
    const results: EmailTestResult[] = [];

    // Info: (20240701 - Shirley) Use Promise.all instead of for loop to avoid eslint warnings
    const emailPromises = TestDataFactory.DEFAULT_TEST_EMAILS.map(async (email) => {
      try {
        const response = await this.completeAuthenticationFlow(email);
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
}
