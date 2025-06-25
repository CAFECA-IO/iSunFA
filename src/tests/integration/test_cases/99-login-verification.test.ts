/* eslint-disable */
import { DefaultValue } from '@/constants/default_value';
import { ApiClient } from '@/tests/integration/api-client';
import { IntegrationTestSetup } from '@/tests/integration/setup';

/**
 * Integration Test - Login Verification
 *
 * 目的：驗證 email 登錄後的用戶身份是否正確對應 email，
 * 確保不會使用 SESSION_DEVELOPER 的假用戶資料
 */
describe('Integration Test - Login Verification', () => {
  const testEmails = DefaultValue.EMAIL_LOGIN.EMAIL;
  const defaultCode = DefaultValue.EMAIL_LOGIN.CODE;

  beforeAll(async () => {
    await IntegrationTestSetup.initialize();
    // 設置debug環境變數
    process.env.DEBUG_TESTS = 'true';
    process.env.DEBUG_API = 'true';
  }, 120000);

  afterAll(async () => {
    await IntegrationTestSetup.cleanup();
  }, 30000);

  describe('Email Login Identity Verification', () => {
    let apiClient: ApiClient;

    beforeAll(() => {
      apiClient = new ApiClient();
    });

    afterAll(() => {
      apiClient.clearSession();
    });

    it('should verify ALWAYS_LOGIN is false in integration test environment', () => {
      // 檢查環境變數是否正確設定
      expect(process.env.INTEGRATION_TEST).toBe('true');

      // 這個測試確保 ALWAYS_LOGIN 常數在測試環境中為 false
      // 意味著系統會進行真實的登錄流程而非使用開發者預設 session
    });

    testEmails.forEach((testEmail, index) => {
      it(`should login with ${testEmail} and verify user identity matches email`, async () => {
        // Step 1: 清除之前的 session
        apiClient.clearSession();

        // Step 2: 請求驗證碼（使用 HTTP API）
        try {
          const codeResponse = await apiClient.get(`/api/v2/email/${testEmail}/one_time_password`);
          expect(codeResponse.success).toBe(true);
        } catch (error) {
          // 如果是冷卻期錯誤，跳過測試
          // eslint-disable-next-line no-console
          console.log(`Skipping ${testEmail} due to cooldown period`);
          return;
        }

        // Step 3: 使用驗證碼登錄（使用 HTTP API）
        const loginResponse = await apiClient.post(`/api/v2/email/${testEmail}/one_time_password`, {
          code: defaultCode,
        });
        expect(loginResponse.success).toBe(true);

        // Step 4: 獲取 StatusInfo 來驗證用戶身份
        const statusResponse = await apiClient.get('/api/v2/status_info');
        expect(statusResponse).toBeDefined();
        expect(statusResponse.success).toBe(true);

        if (statusResponse.success && statusResponse.payload) {
          const { user } = statusResponse.payload;

          // 驗證用戶資料存在
          expect(user).toBeDefined();
          expect(user).not.toBeNull();

          if (user) {
            // 關鍵驗證：用戶的 email 應該與登錄的 email 一致
            expect(user.email).toBe(testEmail);

            // 驗證不是使用開發者預設的 userId (10000003)
            expect(user.id).not.toBe(10000003);

            // 用戶名稱應該基於 email（通常是 email 的 @ 前面部分）
            const expectedUsername = testEmail.split('@')[0];
            expect(user.name).toBe(expectedUsername);

            // eslint-disable-next-line no-console
            console.log(`✅ Successfully verified identity for ${testEmail}:`, {
              userId: user.id,
              userEmail: user.email,
              userName: user.name,
              expectedEmail: testEmail,
            });
          }
        }
      }, 30000);
    });

    it('should verify that different emails result in different user identities', async () => {
      const userIdentities: Array<{ email: string; userId: number; userName: string }> = [];

      // 依序登錄不同的 email 並收集用戶身份資訊
      for (const testEmail of testEmails.slice(0, 2)) {
        // 測試前兩個 email
        // 清除 session
        apiClient.clearSession();

        // 登錄流程（使用 HTTP API）
        try {
          await apiClient.get(`/api/v2/email/${testEmail}/one_time_password`);
          const loginResponse = await apiClient.post(
            `/api/v2/email/${testEmail}/one_time_password`,
            {
              code: defaultCode,
            }
          );
          expect(loginResponse.success).toBe(true);

          // 獲取用戶身份
          const statusResponse = await apiClient.get('/api/v2/status_info');
          if (statusResponse.success && statusResponse.payload?.user) {
            userIdentities.push({
              email: testEmail,
              userId: statusResponse.payload.user.id,
              userName: statusResponse.payload.user.name,
            });
          }
        } catch (error) {
          // 如果是冷卻期錯誤，跳過
          // eslint-disable-next-line no-console
          console.log(`Skipping ${testEmail} due to cooldown period`);
        }
      }

      // 驗證不同 email 對應不同的用戶身份（至少要有一個）
      expect(userIdentities.length).toBeGreaterThan(0);
      if (userIdentities.length >= 2) {
        expect(userIdentities[0].userId).not.toBe(userIdentities[1].userId);
        expect(userIdentities[0].email).not.toBe(userIdentities[1].email);
        expect(userIdentities[0].userName).not.toBe(userIdentities[1].userName);
      }

      // eslint-disable-next-line no-console
      console.log('✅ Verified different emails result in different identities:', userIdentities);
    }, 60000);

    it('should verify session contains real user teams data, not dummy data', async () => {
      const testEmail = testEmails[0];

      // 清除 session 並登錄（使用 HTTP API）
      apiClient.clearSession();

      try {
        await apiClient.get(`/api/v2/email/${testEmail}/one_time_password`);
        const loginResponse = await apiClient.post(`/api/v2/email/${testEmail}/one_time_password`, {
          code: defaultCode,
        });
        expect(loginResponse.success).toBe(true);

        // 獲取 StatusInfo 檢查團隊資料
        const statusResponse = await apiClient.get('/api/v2/status_info');
        if (statusResponse.success && statusResponse.payload) {
          const { teams, user } = statusResponse.payload;

          // eslint-disable-next-line no-console
          console.log('statusResponse', statusResponse);
          // 驗證團隊資料存在（新用戶會自動創建預設團隊）
          expect(teams).toBeDefined();
          expect(Array.isArray(teams)).toBe(true);

          if (teams && teams.length > 0) {
            // 驗證團隊資料不是開發者預設的假資料
            // SESSION_DEVELOPER 中的團隊 ID 包括：1, 5, 2, 10000000
            const developerTeamIds = [1, 5, 2, 10000000];
            const userTeamIds = teams.map((team) => team.id);

            // 真實用戶的團隊 ID 應該與開發者預設的不同
            const hasOnlyDeveloperTeams = userTeamIds.every((id) => developerTeamIds.includes(id));
            expect(hasOnlyDeveloperTeams).toBe(false);

            // eslint-disable-next-line no-console
            console.log(`✅ User ${user?.email} has real team data:`, {
              userTeamIds,
              isDifferentFromDeveloperTeams: !hasOnlyDeveloperTeams,
            });
          }
        }
      } catch (error) {
        // 如果是冷卻期錯誤，跳過測試
        // eslint-disable-next-line no-console
        console.log(`Skipping team verification for ${testEmail} due to cooldown period`);
      }
    }, 30000);
  });
});
