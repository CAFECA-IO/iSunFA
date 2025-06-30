import { ITeam } from '@/interfaces/team';
import { ApiClient } from '@/tests/integration/api-client';
import { IntegrationTestSetup } from '@/tests/integration/setup';

interface StatusInfoPayload {
  user: {
    id: number;
    email: string;
    name: string;
    createdAt: number;
    updatedAt: number;
  } | null;
  company: object | null;
  role: object | null;
  teams: ITeam[];
}

interface StatusInfoResponse {
  success: boolean;
  code: string;
  message: string;
  payload: StatusInfoPayload;
  powerby: string;
}

describe('Integration Test - API v2 status_info', () => {
  let apiClient: ApiClient;

  beforeAll(async () => {
    await IntegrationTestSetup.initialize();
    apiClient = new ApiClient();
  }, 60000); // 60 second timeout for server startup

  afterAll(async () => {
    await IntegrationTestSetup.cleanup();
  }, 30000); // 30 second timeout for cleanup

  beforeEach(() => {
    apiClient.clearSession();
  });

  describe('GET /api/v2/status_info', () => {
    it('should return successful response with correct structure', async () => {
      const response = await apiClient.get<StatusInfoResponse>('/api/v2/status_info');

      expect(response.success).toBe(true);
      expect(response.code).toBe('200ISF0002');
      expect(response.message).toBe('Get successfully');
      expect(response.powerby).toMatch(/iSunFA v\d+\.\d+\.\d+/);
      expect(response.payload).toBeDefined();
    });

    it('should return payload with expected properties', async () => {
      const response = (await apiClient.get<StatusInfoResponse>(
        '/api/v2/status_info'
      )) as StatusInfoResponse;

      expect(response.payload).toHaveProperty('user');
      expect(response.payload).toHaveProperty('company');
      expect(response.payload).toHaveProperty('role');
      expect(response.payload).toHaveProperty('teams');
      expect(Array.isArray(response.payload.teams)).toBe(true);
    });

    it('should validate user data structure when present', async () => {
      const response = (await apiClient.get<StatusInfoResponse>(
        '/api/v2/status_info'
      )) as StatusInfoResponse;

      if (response.payload.user !== null) {
        const { user } = response.payload;
        expect(typeof user.id).toBe('number');
        expect(user.id).toBeGreaterThan(0);
        expect(typeof user.email).toBe('string');
        expect(user.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
        expect(typeof user.name).toBe('string');
        expect(user.name.length).toBeGreaterThan(0);
        expect(typeof user.createdAt).toBe('number');
        expect(user.createdAt).toBeGreaterThan(1000000000);
        expect(typeof user.updatedAt).toBe('number');
      }
    });

    it('should return consistent data across multiple requests', async () => {
      const response1 = await apiClient.get<StatusInfoResponse>('/api/v2/status_info');
      const response2 = await apiClient.get<StatusInfoResponse>('/api/v2/status_info');

      expect(response1.success).toBe(true);
      expect(response2.success).toBe(true);
      expect(response1.payload).toEqual(response2.payload);
    });

    it('should handle concurrent requests properly', async () => {
      const requests = Array(3)
        .fill(null)
        .map(() => apiClient.get<StatusInfoResponse>('/api/v2/status_info'));

      const responses = await Promise.all(requests);

      responses.forEach((response) => {
        expect(response.success).toBe(true);
        expect(response.code).toBe('200ISF0002');
      });
    });

    it('should respond within reasonable time', async () => {
      const startTime = Date.now();
      const response = await apiClient.get<StatusInfoResponse>('/api/v2/status_info');
      const responseTime = Date.now() - startTime;

      expect(response.success).toBe(true);
      // Increase timeout for GitHub Actions environment
      const timeoutLimit = process.env.CI ? 15000 : 5000; // 15s for CI, 5s for local
      expect(responseTime).toBeLessThan(timeoutLimit);
    }, 15000); // 15 second timeout for CI environment

    it('should return proper HTTP status and headers', async () => {
      const url = `${IntegrationTestSetup.getApiBaseUrl()}/api/v2/status_info`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      try {
        const httpResponse = await fetch(url, { signal: controller.signal });

        expect(httpResponse.status).toBe(200);
        expect(httpResponse.ok).toBe(true);
        expect(httpResponse.headers.get('content-type')).toContain('application/json');

        const jsonResponse = await httpResponse.json();
        expect(jsonResponse.success).toBe(true);
      } finally {
        clearTimeout(timeoutId);
      }
    }, 15000); // 15 second timeout for CI environment

    it('should handle invalid HTTP methods gracefully', async () => {
      const url = `${IntegrationTestSetup.getApiBaseUrl()}/api/v2/status_info`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      try {
        const httpResponse = await fetch(url, {
          method: 'DELETE',
          signal: controller.signal,
        });

        expect(httpResponse.status).toBe(405);
        const jsonResponse = await httpResponse.json();
        expect(jsonResponse.success).toBe(false);
        expect(jsonResponse.code).toBe('405ISF0000');
      } finally {
        clearTimeout(timeoutId);
      }
    }, 15000); // 15 second timeout for CI environment
  });
});
