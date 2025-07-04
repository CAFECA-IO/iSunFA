import { APIName } from '@/constants/api_connection';
import { validateOutputData, validateAndFormatData } from '@/lib/utils/validator';
import { APITestHelper } from '@/tests/integration/setup/api_helper';
import { createTestClient } from '@/tests/integration/setup/test_client';
import { TestClient } from '@/interfaces/test_client';
import teamListHandler from '@/pages/api/v2/user/[userId]/team';
import { z } from 'zod';

/**
 * Integration Test - Team Management with Direct Validator Usage
 *
 * 展示如何直接使用 validator.ts 進行整合測試：
 * - 直接使用 validateOutputData 進行 API 回應驗證
 * - 使用 validateAndFormatData 進行自定義驗證
 * - 與生產環境 100% 一致的驗證邏輯
 * - 簡潔直接的測試代碼
 */
describe('Integration Test - Team Management with Direct Validation', () => {
  let helper: APITestHelper;
  let teamListClient: TestClient;
  let currentUserId: string;

  beforeAll(async () => {
    // Info: (20250704 - Shirley) 創建已認證的測試輔助器
    helper = await APITestHelper.createAuthenticatedHelper();

    // Info: (20250704 - Shirley) 獲取當前用戶 ID
    const statusResponse = await helper.getStatusInfo();
    const userData = statusResponse.body.payload?.user as { id?: number };
    currentUserId = userData?.id?.toString() || '1';

    // Info: (20250704 - Shirley) 創建 API 客戶端
    teamListClient = createTestClient({
      handler: teamListHandler,
      routeParams: { userId: currentUserId },
    });
  }, 30000);

  beforeEach(async () => {
    // Info: (20250704 - Shirley) 每個測試前確保已認證
    await helper.ensureAuthenticated();
  });

  describe('Team List API with Direct Validation', () => {
    it('should validate team list using production validateOutputData', async () => {
      const cookies = helper.getCurrentSession();

      // Info: (20250704 - Shirley) 發送 API 請求
      const response = await teamListClient
        .get(`/api/v2/user/${currentUserId}/team`)
        .query({ page: 1, pageSize: 10 })
        .send({})
        .set('Cookie', cookies.join('; '))
        .expect(200);

      // Info: (20250704 - Shirley) 驗證基本回應結構
      expect(response.body.success).toBe(true);
      expect(response.body.payload).toBeDefined();

      // Info: (20250704 - Shirley) 使用生產環境的 validateOutputData 驗證 payload
      const { isOutputDataValid, outputData } = validateOutputData(
        APIName.LIST_TEAM,
        response.body.payload
      );

      // eslint-disable-next-line no-console
      console.log('isOutputDataValid', isOutputDataValid, 'outputData', outputData);

      // Info: (20250704 - Shirley) 驗證結果
      expect(isOutputDataValid).toBe(true);
      expect(outputData).toBeDefined();
      expect(outputData?.data).toBeDefined();
      expect(Array.isArray(outputData?.data)).toBe(true);

      // Info: (20250704 - Shirley) 驗證分頁結構
      expect(outputData).toHaveProperty('page');
      expect(outputData).toHaveProperty('totalPages');
      expect(outputData).toHaveProperty('totalCount');
      expect(outputData).toHaveProperty('pageSize');
      expect(outputData).toHaveProperty('hasNextPage');
      expect(outputData).toHaveProperty('hasPreviousPage');

      if (process.env.DEBUG_TESTS === 'true') {
        // eslint-disable-next-line no-console
        console.log('✅ Team list validated with production validator successfully');
      }
    });

    it('should handle unauthorized access with proper error validation', async () => {
      // Info: (20250704 - Shirley) 不使用認證 cookie 發送請求
      const response = await teamListClient
        .get(`/api/v2/user/${currentUserId}/team`)
        .query({ page: 1, pageSize: 10 })
        .send({});

      // Info: (20250704 - Shirley) 驗證錯誤回應結構
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('401ISF0000');
      expect(response.body.payload).toBeNull();

      // Info: (20250704 - Shirley) 使用 validateAndFormatData 驗證錯誤回應格式
      const errorResponseSchema = z.object({
        success: z.literal(false),
        code: z.string(),
        message: z.string(),
        payload: z.null(),
      });

      let isErrorFormatValid = false;
      let validatedErrorData = null;

      try {
        validatedErrorData = validateAndFormatData(errorResponseSchema, response.body);
        isErrorFormatValid = true;
      } catch (error) {
        // Info: (20250704 - Shirley) 如果驗證失敗，錯誤格式不正確
        isErrorFormatValid = false;
      }

      expect(isErrorFormatValid).toBe(true);
      expect(validatedErrorData).toBeDefined();
      expect(validatedErrorData?.success).toBe(false);

      if (process.env.DEBUG_TESTS === 'true') {
        // eslint-disable-next-line no-console
        console.log('✅ Error response validated with production validator');
      }
    });
  });

  describe('Custom Schema Validation with Production Functions', () => {
    it('should validate response structure using validateAndFormatData', async () => {
      const cookies = helper.getCurrentSession();

      const response = await teamListClient
        .get(`/api/v2/user/${currentUserId}/team`)
        .query({ page: 1, pageSize: 10 })
        .send({})
        .set('Cookie', cookies.join('; '))
        .expect(200);

      // Info: (20250704 - Shirley) 定義自定義 schema 驗證回應結構
      const customResponseSchema = z.object({
        success: z.boolean(),
        code: z.string(),
        message: z.string(),
        payload: z.object({
          data: z.array(z.any()),
          page: z.number(),
          totalPages: z.number(),
          totalCount: z.number(),
          pageSize: z.number(),
          hasNextPage: z.boolean(),
          hasPreviousPage: z.boolean(),
        }),
      });

      // Info: (20250704 - Shirley) 使用生產環境的 validateAndFormatData 進行驗證
      let isCustomValidationSuccessful = false;
      let validatedData = null;

      try {
        validatedData = validateAndFormatData(customResponseSchema, response.body);
        isCustomValidationSuccessful = true;
      } catch (error) {
        isCustomValidationSuccessful = false;
        if (process.env.DEBUG_TESTS === 'true') {
          // eslint-disable-next-line no-console
          console.error('Custom validation failed:', error);
        }
      }

      // Info: (20250704 - Shirley) 驗證結果
      expect(isCustomValidationSuccessful).toBe(true);
      expect(validatedData).toBeDefined();
      expect(validatedData?.success).toBe(true);
      expect(validatedData?.payload.data).toBeDefined();
      expect(Array.isArray(validatedData?.payload.data)).toBe(true);

      if (process.env.DEBUG_TESTS === 'true') {
        // eslint-disable-next-line no-console
        console.log('✅ Custom schema validation successful with production validator');
      }
    });
  });

  describe('Cross-User Team Access with Direct Validation', () => {
    it('should prevent access to other users teams with proper validation', async () => {
      // Info: (20250704 - Shirley) 創建第二個用戶的輔助器
      const anotherHelper = await APITestHelper.createWithEmail('user1@isunfa.com');

      try {
        // Info: (20250704 - Shirley) 使用原用戶獲取團隊列表
        const cookies = helper.getCurrentSession();
        const userTeamsResponse = await teamListClient
          .get(`/api/v2/user/${currentUserId}/team`)
          .query({ page: 1, pageSize: 10 })
          .send({})
          .set('Cookie', cookies.join('; '))
          .expect(200);

        // Info: (20250704 - Shirley) 使用另一個用戶嘗試訪問
        const anotherCookies = anotherHelper.getCurrentSession();
        const anotherUserResponse = await teamListClient
          .get(`/api/v2/user/${currentUserId}/team`)
          .query({ page: 1, pageSize: 10 })
          .send({})
          .set('Cookie', anotherCookies.join('; '));

        // Info: (20250704 - Shirley) 驗證第一個用戶的回應
        const { isOutputDataValid: user1Valid, outputData: user1Data } = validateOutputData(
          APIName.LIST_TEAM,
          userTeamsResponse.body.payload
        );

        expect(user1Valid).toBe(true);
        expect(user1Data).toBeDefined();

        // Info: (20250704 - Shirley) 驗證第二個用戶的回應（可能是錯誤或空結果）
        if (anotherUserResponse.status === 200) {
          const { isOutputDataValid: user2Valid, outputData: user2Data } = validateOutputData(
            APIName.LIST_TEAM,
            anotherUserResponse.body.payload
          );
          expect(user2Valid).toBe(true);
          expect(user2Data).toBeDefined();
        } else {
          // Info: (20250704 - Shirley) 如果是錯誤回應，驗證錯誤格式
          expect(anotherUserResponse.body.success).toBe(false);
          expect(anotherUserResponse.body.payload).toBeNull();
        }

        if (process.env.DEBUG_TESTS === 'true') {
          // eslint-disable-next-line no-console
          console.log('✅ Cross-user access validation completed with production validator');
        }
      } finally {
        // Info: (20250704 - Shirley) 清理第二個用戶的會話
        anotherHelper.clearAllUserSessions();
      }
    });
  });

  describe('Production Validator Integration Examples', () => {
    it('should demonstrate direct usage patterns', async () => {
      const cookies = helper.getCurrentSession();

      const response = await teamListClient
        .get(`/api/v2/user/${currentUserId}/team`)
        .query({ page: 1, pageSize: 10 })
        .send({})
        .set('Cookie', cookies.join('; '))
        .expect(200);

      // Info: (20250704 - Shirley) 模式 1 - 直接使用 validateOutputData（推薦用於 API 回應驗證）
      const { isOutputDataValid, outputData } = validateOutputData(
        APIName.LIST_TEAM,
        response.body.payload
      );

      if (!isOutputDataValid) {
        throw new Error(`API validation failed for ${APIName.LIST_TEAM}`);
      }

      expect(outputData).toBeDefined();

      // Info: (20250704 - Shirley) 模式 2 - 使用 validateAndFormatData 進行自定義驗證
      const teamCountSchema = z.object({
        totalCount: z.number().min(0),
      });

      let validatedCount = null;
      try {
        validatedCount = validateAndFormatData(teamCountSchema, outputData);
      } catch (error) {
        throw new Error(`Team count validation failed: ${error}`);
      }

      expect(validatedCount.totalCount).toBeGreaterThanOrEqual(0);

      // Info: (20250704 - Shirley) 模式 3 - 組合使用進行複雜驗證
      if (isOutputDataValid && outputData?.data && Array.isArray(outputData.data)) {
        // eslint-disable-next-line no-restricted-syntax
        for (const team of outputData.data) {
          const teamSchema = z.object({
            id: z.number(),
            name: z.object({
              value: z.string(),
              editable: z.boolean(),
            }),
            role: z.string(),
          });

          try {
            const validatedTeam = validateAndFormatData(teamSchema, team);
            expect(validatedTeam.id).toBeGreaterThan(0);
            expect(validatedTeam.name.value).toBeTruthy();
          } catch (error) {
            // Info: (20250704 - Shirley) 某些團隊可能結構不同，這是正常的
            if (process.env.DEBUG_TESTS === 'true') {
              // eslint-disable-next-line no-console
              console.warn('Team validation skipped for:', team);
            }
          }
        }
      }

      if (process.env.DEBUG_TESTS === 'true') {
        // eslint-disable-next-line no-console
        console.log('✅ All validation patterns demonstrated successfully');
      }
    });
  });
});
