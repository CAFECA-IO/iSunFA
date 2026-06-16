# 🧪 iSunFA 整合測試與 Cookie/Session 管理指南 (Integration Test & Cookie Session Guide)

> **Date**: June 2026
> **Version**: 1.2
> **Status**: Active
> **Context**: 指引開發者如何使用 Supertest 對 API 進行整合測試，以及如何在測試環境中管理 Cookie 與 Session。

---

## 📖 目錄

1. [第 1 章：整合測試架構概覽](#第-1-章整合測試架構概覽)
2. [第 2 章：整合測試核心組件說明](#第-2-章整合測試核心組件說明)
3. [第 3 章：Cookie 與 Session 管理原理](#第-3-章cookie-與-session-管理原理)
4. [第 4 章：直接使用生產 Validator](#第-4-章直接使用生產-validator)
5. [第 5 章：編寫新測試的步驟](#第-5-章編寫新測試的步驟)
6. [第 6 章：可重複使用的測試模組](#第-6-章可重複使用的測試模組)
7. [第 7 章：整合測試最佳實踐與執行](#第-7-章整合測試最佳實踐與執行)

---

## 第 1 章：整合測試架構概覽

### 1.1 目錄結構
```text
src/tests/integration/
├── helpers/                   # 其他 utils
├── setup/
│   ├── api_helper.ts          # 核心 API 測試輔助類，包含登入
│   ├── test_client.ts         # SuperTest 客戶端
│   ├── test_data_factory.ts   # 測試資料工廠，通用資料方便共用
│   └── jest_setup.ts          # Jest 環境設置
├── test_cases/
│   ├── 00_*.test.ts          # 健康檢查測試
│   ├── 01_*.test.ts          # 用戶認證測試
│   └── 02_*.test.ts          # 團隊管理測試
└── test_files/               # 測試用檔案
```

### 1.2 核心設計原則
1. **真實 API 測試** - 使用真實的 HTTP 請求，不使用 Mock。
2. **完全一致性** - 測試與生產環境使用完全相同的驗證邏輯。
3. **測試隔離** - 每個測試獨立，避免相互影響。
4. **可重複執行** - 測試可以重複運行而不會失敗。
5. **直接使用生產驗證** - 使用 `src/lib/utils/validator.ts` 的函數。

---

## 第 2 章：整合測試核心組件說明

### 2.1 APITestHelper 類 (核心 API 測試輔助)

**位置**: `src/tests/integration/setup/api_helper.ts`

APITestHelper 提供完整的用戶認證、會話管理和多用戶測試能力。

#### 主要功能分組

* **工廠方法**：
  ```typescript
  // 1. 自動認證 (預設用戶)
  const helper = await APITestHelper.createAuthenticatedHelper();
  
  // 2. 指定 email 認證
  const helper = await APITestHelper.createWithEmail('user@isunfa.com');
  
  // 3. 多用戶認證
  const helper = await APITestHelper.createWithMultipleUsers([
    'user1@isunfa.com', // 第一個用戶會被設為當前用戶
    'user2@isunfa.com',
    'user3@isunfa.com',
  ]);
  
  // 4. 統一創建方法
  const helper = await APITestHelper.createHelper({
    email: 'user@isunfa.com',
    emails: ['user1@', 'user2@'],
    autoAuth: true,
  });
  ```
* **會話管理**：
  ```typescript
  // 獲取當前會話 cookies (用於 API 請求)
  const cookies = helper.getCurrentSession();
  
  // 確保已認證 (如果未認證會自動認證)
  await helper.ensureAuthenticated();
  
  // 清除所有會話
  helper.clearSession();
  ```
* **多用戶管理**：
  ```typescript
  // 切換到指定用戶
  helper.switchToUser('user2@isunfa.com');
  
  // 獲取當前用戶
  const currentUser = helper.getCurrentUser();
  ```

### 2.2 TestClient 類 (SuperTest HTTP 客戶端管理)

**位置**: `src/tests/integration/setup/test_client.ts`

TestClient 類基於 SuperTest 提供 HTTP 客戶端管理，使用 singleton 模式避免端口衝突。

#### 核心功能

* **客戶端創建**：
  ```typescript
  import { createTestClient } from '@/tests/integration/setup/test_client';
  import teamListHandler from '@/pages/api/v2/user/[userId]/team';
  
  // 1. 靜態路由客戶端
  const client = createTestClient(handler);
  
  // 2. 動態路由客戶端 (推薦使用)
  const client = createTestClient({
    handler: teamListHandler,
    routeParams: { userId: '1' },
  });
  ```
* **SuperTest 框架說明**：
  ```typescript
  // 基本 HTTP 請求
  const response = await client
    .get(APIPath.LIST_TEAM.replace(':userId', currentUserId)) // HTTP 方法和路徑
    .query({ page: 1, pageSize: 10 }) // URL 查詢參數
    .send({ data: 'body' }) // 請求 body
    .set('Cookie', cookies.join('; ')) // 設定 headers
    .expect(200); // 預期狀態碼
  ```
* **Cookie 會話管理**：
  ```typescript
  // 從 APITestHelper 獲取認證 cookies
  const cookies = helper.getCurrentSession();
  
  // 在請求中設定 cookies 進行認證
  const response = await client
    .get(APIPath.LIST_TEAM.replace(':userId', currentUserId))
    .set('Cookie', cookies.join('; ')) // 重要：設定認證 cookies
    .expect(200);
  ```

---

## 第 3 章：Cookie 與 Session 管理原理

### 3.1 為什麼需要手動管理 Cookie？

在 SuperTest 測試環境中，與真實瀏覽器不同，需要手動管理 session cookie。這不是因為 API 有問題，而是因為 SuperTest 的設計限制。

| 環境 | Cookie 存儲 | Cookie 發送 | Session 狀態 |
| :--- | :--- | :--- | :--- |
| 真實瀏覽器 | ✅ 自動存儲 | ✅ 自動發送 | ✅ 正常維持 |
| SuperTest | ❌ 不存儲 | ❌ 不發送 | ❌ 每次重置 |

### 3.2 iSunFA 的 Session 實作

#### 1. 認證 API 設置 Cookie
```typescript
// src/pages/api/v2/email/[email]/one_time_password.ts
function setSessionCookie(res: NextApiResponse, sessionId: string) {
  const cookieValue = `isunfa=${sessionId}; Path=/; HttpOnly; SameSite=Lax`;
  res.setHeader('Set-Cookie', cookieValue);
}
```

#### 2. API 讀取 Cookie
```typescript
// src/lib/utils/parser/session.ts
export const parseSessionId = (req: NextApiRequest): string => {
  let sessionId = req.headers.isunfa as string;
  if (!sessionId && req.cookies) {
    sessionId = req.cookies.isunfa;
  }
  return sessionId;
};
```

### 3.3 SuperTest 中的 Cookie 管理實作

APITestHelper 會在認證流程中自動從響應中提取並維護 `isunfa` session cookie：
```typescript
// 1. 認證流程中自動提取 cookie
const authResponse = await otpClient.post('/').send({ code: '555666' });
// 2. 後續請求自動攜帶 cookie
const cookies = helper.getCurrentSession();
const response = await client
  .get('/api/v2/status_info')
  .set('Cookie', cookies.join('; '))
  .expect(200);
```

---

## 第 4 章：直接使用生產 Validator

### 4.1 優勢
1. **零重複代碼** - 完全重用生產邏輯。
2. **100% 一致性** - 測試與生產使用相同的驗證。
3. **自動同步** - Schema 更新時測試自動同步。
4. **可信度最高** - 直接測試生產代碼路徑。

### 4.2 主要函數

* **`validateOutputData` (驗證 API 回應 payload)**：
  ```typescript
  import { validateOutputData } from '@/lib/utils/validator';
  import { APIName } from '@/constants/api_connection';
  
  const { isOutputDataValid, outputData } = validateOutputData(
    APIName.LIST_TEAM,
    response.body.payload
  );
  expect(isOutputDataValid).toBe(true);
  ```
* **`validateAndFormatData` (自定義 Schema 驗證)**：
  ```typescript
  import { validateAndFormatData } from '@/lib/utils/validator';
  import { z } from 'zod';
  
  const customSchema = z.object({
    success: z.boolean(),
    payload: z.object({
      data: z.array(z.any()),
      totalCount: z.number(),
    }),
  });
  const validatedData = validateAndFormatData(customSchema, response.body);
  ```

---

## 第 5 章：編寫新測試的步驟

### 5.1 步驟 1：創建測試檔案
```typescript
// src/tests/integration/test_cases/05_new_feature.test.ts
import { APIName } from '@/constants/api_connection';
import { validateOutputData } from '@/lib/utils/validator';
import { APITestHelper } from '@/tests/integration/setup/api_helper';
import { createTestClient } from '@/tests/integration/setup/test_client';

describe('Integration Test - New Feature', () => {
  let helper: APITestHelper;
  let apiClient: ReturnType<typeof createTestClient>;

  beforeAll(async () => {
    helper = await APITestHelper.createAuthenticatedHelper();
    apiClient = createTestClient(yourApiHandler);
  }, 30000);

  beforeEach(async () => {
    await helper.ensureAuthenticated();
  });
});
```

### 5.2 步驟 2：確認必要常數和 Schema
1. **確認 API 定義**：確認 `src/constants/api_connection.ts` 的 `APIName`、`APIPath` 與 `APIConfig` 中已註冊該 API。
2. **確認 Zod Schema**：確認 `src/constants/zod_schema.ts` 的 `ZOD_SCHEMA_API` 中有對應的 schema。
3. **確認團隊權限**：如果 API 涉及團隊權限，檢查 `src/constants/team/permissions.ts`。

---

## 第 6 章：可重複使用的測試模組

### 6.1 API 成功與錯誤回應驗證函數
```typescript
// 成功回應驗證
function validateApiResponse(response: any, apiName: APIName) {
  expect(response.body.success).toBe(true);
  const { isOutputDataValid, outputData } = validateOutputData(apiName, response.body.payload);
  if (!isOutputDataValid) {
    throw new Error(`API validation failed for ${apiName}`);
  }
  return outputData;
}

// 錯誤回應驗證
function validateErrorResponse(response: any, expectedStatus: number) {
  expect(response.status).toBe(expectedStatus);
  expect(response.body.success).toBe(false);
  expect(response.body.payload).toBeNull();
}
```

---

## 第 7 章：整合測試最佳實踐與執行

### 7.1 命名與結構規範
* 測試檔案：`##_feature_name.test.ts`（數字前綴確保執行順序）。
* 測試結構分組：分為 `Success Cases`、`Error Cases` 與 `Permission Tests`。

### 7.2 執行測試指令
```bash
# 運行特定測試檔案
npm run test:integration -- --testPathPattern="01"

# 運行特定測試案例
npm run test:integration -- --testPathPattern="02" --testNamePattern="should successfully list teams"

# 運行所有整合測試
npm run test:integration
```
