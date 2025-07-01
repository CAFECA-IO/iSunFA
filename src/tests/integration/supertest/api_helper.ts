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

  constructor() {
    // Info: (20240701 - Shirley) Create test clients for different API endpoints
    this.statusClient = createTestClient(statusInfoHandler);
  }

  // Info: (20240701 - Shirley) Create dynamic OTP client for specific email
  private createOTPClient(email: string): TestClient {
    return createDynamicTestClient(otpHandler, { email });
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

    return otpClient.post('/').send({ code: authData.code }).expect(200);
  }

  // Info: (20240701 - Shirley) Get current user status through API
  async getStatusInfo(): Promise<TestResponse> {
    return this.statusClient.get('/api/v2/status_info').expect(200);
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
