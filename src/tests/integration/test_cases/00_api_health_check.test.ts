// Info: (20240701 - Shirley) Supertest-based API health check integration tests
// Info: (20240701 - Shirley) Focus on API functionality without database dependencies
import { createTestClient, TestClient } from '@/tests/integration/test_client';
import statusInfoHandler from '@/pages/api/v2/status_info';
// import { ITeam } from '@/interfaces/team';

// interface StatusInfoPayload {
//   user: {
//     id: number;
//     email: string;
//     name: string;
//     createdAt: number;
//     updatedAt: number;
//   } | null;
//   company: Record<string, unknown> | null;
//   role: Record<string, unknown> | null;
//   teams: ITeam[];
// }

describe('Integration Test - API v2 status_info (Supertest)', () => {
  let testClient: TestClient;

  beforeAll(async () => {
    // Info: (20240701 - Shirley) Initialize test client for status API
    testClient = createTestClient(statusInfoHandler);
  });

  describe('GET /api/v2/status_info', () => {
    it('should return successful response with correct structure', async () => {
      const response = await testClient
        .get('/api/v2/status_info')
        .expect(200)
        .expect('Content-Type', /json/);

      const { body } = response;
      expect(body.success).toBe(true);
      expect(body.code).toBe('200ISF0002');
      expect(body.message).toBe('Get successfully');
      expect(body.powerby).toMatch(/iSunFA v\d+\.\d+\.\d+/);
      expect(body.payload).toBeDefined();
    });

    it('should return payload with expected properties', async () => {
      const response = await testClient.get('/api/v2/status_info').expect(200);

      const { body } = response;
      expect(body.payload).toHaveProperty('user');
      expect(body.payload).toHaveProperty('company');
      expect(body.payload).toHaveProperty('role');
      expect(body.payload).toHaveProperty('teams');
      expect(Array.isArray(body.payload.teams)).toBe(true);
    });

    it('should validate user data structure when present', async () => {
      const response = await testClient.get('/api/v2/status_info').expect(200);

      const { body } = response;
      if (body.payload.user !== null) {
        const { user } = body.payload;
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
      const response1 = await testClient.get('/api/v2/status_info').expect(200);

      const response2 = await testClient.get('/api/v2/status_info').expect(200);

      expect(response1.body.success).toBe(true);
      expect(response2.body.success).toBe(true);
      expect(response1.body.payload).toEqual(response2.body.payload);
    });

    it('should handle concurrent requests properly', async () => {
      // Info: (20240701 - Shirley) Create multiple concurrent requests
      const requests = Array(3)
        .fill(null)
        .map(() => testClient.get('/api/v2/status_info').expect(200));

      const responses = await Promise.all(requests);

      responses.forEach((response) => {
        expect(response.body.success).toBe(true);
        expect(response.body.code).toBe('200ISF0002');
      });
    });

    it('should respond within reasonable time', async () => {
      const startTime = Date.now();

      const response = await testClient.get('/api/v2/status_info').expect(200);

      const responseTime = Date.now() - startTime;
      expect(response.body.success).toBe(true);

      // Info: (20240701 - Shirley) Supertest should be faster than HTTP requests
      const timeoutLimit = process.env.CI ? 10000 : 2000; // Info: (20240701 - Shirley) 10s for CI, 2s for local
      expect(responseTime).toBeLessThan(timeoutLimit);
    });

    it('should handle invalid HTTP methods gracefully', async () => {
      const response = await testClient.delete('/api/v2/status_info').expect(405);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('405ISF0000');
    });

    it('should handle POST method gracefully', async () => {
      const response = await testClient.post('/api/v2/status_info').send({}).expect(405);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('405ISF0000');
    });

    it('should handle PUT method gracefully', async () => {
      const response = await testClient.put('/api/v2/status_info').send({}).expect(405);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('405ISF0000');
    });

    it('should return proper content type header', async () => {
      await testClient
        .get('/api/v2/status_info')
        .expect(200)
        .expect('Content-Type', /application\/json/);
    });
  });
});
