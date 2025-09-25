## 前言

iSunFA 整合測試開發者指南主要說明如何用 Supertest 測試 API。

## 目錄

1. [測試架構概覽](#測試架構概覽)

2. [核心組件說明](#核心組件說明)

3. [生產 Validator 直接使用](#生產-validator-直接使用)

4. [編寫新測試的步驟](#編寫新測試的步驟)

5. [可重複使用的模塊](#可重複使用的模塊)

6. [最佳實踐](#最佳實踐)

7. [測試範例](#測試範例)

## 測試架構概覽

### 目錄結構

```
src/tests/integration/
├── helpers/                   # 其他 utils
├── setup/
│   ├── api_helper.ts          # 核心 API 測試輔助類，大多 API 需要用到的邏輯，包含登入
│   ├── test_client.ts         # SuperTest 客戶端
│   ├── test_data_factory.ts   # 測試資料工廠，通用資料 (e.g. 登入 email)，可以放在這裡方便共用
│   └── jest_setup.ts          # Jest 環境設置
├── test_cases/
│   ├── 00_*.test.ts          # 健康檢查測試
│   ├── 01_*.test.ts          # 用戶認證測試
│   └── 02_*.test.ts          # 團隊管理測試
└── test_files/               # 測試用檔案
```

### 核心設計原則

1. **真實 API 測試** - 使用真實的 HTTP 請求，不使用 Mock

2. **完全一致性** - 測試與生產環境使用完全相同的驗證邏輯

3. **測試隔離** - 每個測試獨立，避免相互影響

4. **可重複執行** - 測試可以重複運行而不會失敗

5. **直接使用生產驗證** - 使用 `src/lib/utils/validator.ts` 的函數

## 核心組件說明

### 1\. APITestHelper 類 - 核心 API 測試輔助類

**位置**: `src/tests/integration/setup/api_helper.ts`

APITestHelper 是整合測試的核心類別，提供完整的用戶認證、會話管理和多用戶測試能力。

#### 主要功能分組

##### A. 工廠方法 (推薦使用)

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

// 4. 統一創建方法 (支援所有選項)
const helper = await APITestHelper.createHelper({
  email: 'user@isunfa.com', // 單用戶模式
  emails: ['user1@', 'user2@'], // 多用戶模式
  autoAuth: true, // 是否自動認證
});
```

##### B. 會話管理

```typescript
// 獲取當前會話 cookies (用於 API 請求)
const cookies = helper.getCurrentSession();

// 檢查認證狀態
if (helper.isAuthenticated()) {
  // 已認證，可以發送 API 請求
}

// 確保已認證 (如果未認證會自動認證)
await helper.ensureAuthenticated();

// 清除所有會話
helper.clearSession();
```

##### C. 多用戶管理

```typescript
// 切換到指定用戶
helper.switchToUser('user2@isunfa.com');

// 獲取當前用戶
const currentUser = helper.getCurrentUser();

// 獲取所有已認證用戶
const users = helper.getAllAuthenticatedUsers();

// 檢查特定用戶是否已認證
if (helper.isUserAuthenticated('user2@isunfa.com')) {
  // 用戶已認證
}

// 清除特定用戶會話
helper.clearUserSession('user2@isunfa.com');
```

##### D. 手動認證方法 (低階 API，通常不需要直接使用)

```typescript
// 請求 OTP
const otpResponse = await helper.requestOTP('user@isunfa.com');

// 使用 OTP 認證
const authResponse = await helper.authenticateWithOTP('user@isunfa.com', '123456');

// 完整認證流程
const { otpResponse, authResponse, statusResponse } =
  await helper.completeAuthenticationFlow('user@isunfa.com');

// 使用特定 email 登入
await helper.loginWithEmail('user@isunfa.com');
```

### 2\. TestClient 類 - SuperTest HTTP 客戶端管理

**位置**: `src/tests/integration/setup/test_client.ts`

TestClient 類基於 SuperTest 提供 HTTP 客戶端管理，使用 singleton 模式避免端口衝突。

#### 核心功能

##### A. 客戶端創建

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

##### B. SuperTest 框架說明

SuperTest 是建立在 superagent 上的 HTTP 斷言／請求封裝。它的核心只要求你傳入一個符合 Node.js
http.Server 介面的物件或一段 URL，因此 Express、Koa、Hapi 乃至自行手寫的原生伺服器都能搭配使用

```typescript
// 基本 HTTP 請求
const response = await client
  .get(APIPath.LIST_TEAM.replace(':userId', currentUserId)) // HTTP 方法和路徑
  .query({ page: 1, pageSize: 10 }) // URL 查詢參數
  .send({ data: 'body' }) // 請求 body
  .set('Cookie', cookies.join('; ')) // 設定 headers
  .expect(200); // 預期狀態碼

// 支援的 HTTP 方法
await client.get('/path'); // GET
await client.post('/path'); // POST
await client.put('/path'); // PUT
await client.delete('/path'); // DELETE
await client.patch('/path'); // PATCH
```

##### C. Cookie 會話管理

```typescript
// 從 APITestHelper 獲取認證 cookies
const cookies = helper.getCurrentSession();

// 在請求中設定 cookies 進行認證
const response = await client
  .get(APIPath.LIST_TEAM.replace(':userId', currentUserId))
  .set('Cookie', cookies.join('; ')) // 重要：設定認證 cookies
  .expect(200);

// 無認證請求 (測試權限控制)
const unauthResponse = await client
  .get(APIPath.LIST_TEAM.replace(':userId', currentUserId))
  .expect(401); // 應該返回未授權
```

##### D. 客戶端生命週期管理

```typescript
// TestClient 使用 singleton 快取，自動管理伺服器生命週期
// 每個不同的 handler + routeParams 組合都會有獨立的伺服器實例

// 測試結束時清理所有伺服器 (已經設定在 jest_setup.ts 中，test case 裡不需要再設定)
import { closeAllTestServers } from '@/tests/integration/setup/test_client';

afterAll(async () => {
  await closeAllTestServers();
});
```

#### 最佳實踐

##### 1\. 使用 API Connection 常數

```typescript
// 建議：使用 APIName 和 APIPath 枚舉
import { APIName, APIPath } from '@/constants/api_connection';

const response = await client.get(APIPath.LIST_TEAM.replace(':userId', userId)).expect(200);

// 不建議：硬編碼路徑
// const response = await client.get('/api/v2/user/1/team');
```

##### 2\. 路由參數處理

```typescript
// 對於動態路由，使用 routeParams
const client = createTestClient({
  handler: teamListHandler,
  routeParams: {
    userId: '1',
    teamId: '100',
  },
});

// 實際請求會正確解析路由參數
const response = await client.get('/api/v2/user/1/team/100');
```

### 3\. 生產 Validator 函數

直接使用 `src/lib/utils/validator.ts` 的函數：

```typescript
import { validateOutputData, validateAndFormatData } from '@/lib/utils/validator';

// API 回應驗證
const { isOutputDataValid, outputData } = validateOutputData(
  APIName.LIST_TEAM,
  response.body.payload
);

// 自定義 Schema 驗證
const validatedData = validateAndFormatData(customSchema, data);
```

## 生產 Validator 直接使用

### 優勢

1. **零重複代碼** - 完全重用生產邏輯

2. **100% 一致性** - 測試與生產使用相同的驗證

3. **自動同步** - Schema 更新時測試自動同步

4. **可信度最高** - 直接測試生產代碼路徑

### 主要函數

#### `validateOutputData`

用於驗證 API 回應 payload：

```typescript
import { validateOutputData } from '@/lib/utils/validator';
import { APIName } from '@/constants/api_connection';

const { isOutputDataValid, outputData } = validateOutputData(
  APIName.LIST_TEAM,
  response.body.payload
);

if (!isOutputDataValid) {
  throw new Error(`API validation failed for ${APIName.LIST_TEAM}`);
}

// outputData 現在是經過驗證的資料
expect(outputData).toBeDefined();
```

#### `validateAndFormatData`

用於自定義 Schema 驗證：

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

try {
  const validatedData = validateAndFormatData(customSchema, response.body);
  // 驗證成功
  expect(validatedData.success).toBe(true);
} catch (error) {
  // 驗證失敗
  throw new Error(`Custom validation failed: ${error}`);
}
```

### 錯誤處理模式

```typescript
// 模式 1：Try-Catch 處理
let isValid = false;
let validatedData = null;

try {
  validatedData = validateAndFormatData(schema, data);
  isValid = true;
} catch (error) {
  isValid = false;
  if (process.env.DEBUG_TESTS === 'true') {
    console.error('Validation failed:', error);
  }
}

expect(isValid).toBe(true);
expect(validatedData).toBeDefined();

// 模式 2：直接拋錯處理（適用於必須成功的情況）
const validatedData = validateAndFormatData(schema, data);
expect(validatedData).toBeDefined();
```

## 編寫新測試的步驟

### 步驟 1：創建測試檔案

```typescript
// src/tests/integration/test_cases/05_new_feature.test.ts
import { APIName } from '@/constants/api_connection';
import { validateOutputData, validateAndFormatData } from '@/lib/utils/validator';
import { APITestHelper } from '@/tests/integration/setup/api_helper';
import { createTestClient } from '@/tests/integration/setup/test_client';
import { z } from 'zod';

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

  // 測試案例...
});
```

### 步驟 2：確認必要常數和 Schema

#### A. 檢查 API 定義

確認 `src/constants/api_connection.ts` 中已定義 API：

```typescript
// 1. 確認 APIName 枚舉中有對應名稱
export enum APIName {
  // ...
  YOUR_NEW_API = 'YOUR_NEW_API',
  // ...
}

// 2. 確認 APIPath 枚舉中有對應路徑
export enum APIPath {
  // ...
  YOUR_NEW_API = '/api/v2/your-endpoint/:param',
  // ...
}

// 3. 確認 APIConfig 中有完整配置
[APIName.YOUR_NEW_API]: createConfig({
  name: APIName.YOUR_NEW_API,
  method: HttpMethod.GET,
  path: APIPath.YOUR_NEW_API,
}),
```

#### B. 檢查 Zod Schema

確認 `src/constants/zod_schema.ts` 中已定義對應的 schema：

```typescript
// 確認 ZOD_SCHEMA_API 中有對應的 APIName
export const ZOD_SCHEMA_API = {
  // ...
  [APIName.YOUR_NEW_API]: yourNewApiSchema,
  // ...
};
```

#### C. 檢查團隊權限 (如果 API 需要)

如果 API 涉及團隊權限，檢查 `src/constants/team/permissions.ts`：

```typescript
// 確認權限定義
export enum TeamPermission {
  // ...
  YOUR_PERMISSION = 'YOUR_PERMISSION',
  // ...
}
```

### 步驟 3：編寫測試案例

```typescript
it('should validate API response using production validator', async () => {
  const cookies = helper.getCurrentSession();

  // 1. 發送請求
  const response = await apiClient
    .get('/api/v2/your-endpoint')
    .query({ page: 1, pageSize: 10 })
    .send({})
    .set('Cookie', cookies.join('; '))
    .expect(200);

  // 2. 驗證基本回應結構
  expect(response.body.success).toBe(true);
  expect(response.body.payload).toBeDefined();

  // 3. 使用生產 validator 驗證 payload
  const { isOutputDataValid, outputData } = validateOutputData(
    APIName.YOUR_NEW_API,
    response.body.payload
  );

  // 4. 斷言驗證結果
  expect(isOutputDataValid).toBe(true);
  expect(outputData).toBeDefined();

  // 5. 業務邏輯驗證
  expect(outputData.someProperty).toBeDefined();
});

it('should handle error responses properly', async () => {
  const response = await apiClient.get(APIPath.EXAMPLE_API).send({
    /* invalid data */
  });

  // 驗證錯誤回應格式
  expect(response.status).toBe(400);
  expect(response.body.success).toBe(false);
  expect(response.body.payload).toBeNull();

  // 使用自定義 schema 驗證錯誤結構
  const errorSchema = z.object({
    success: z.literal(false),
    code: z.string(),
    message: z.string(),
    payload: z.null(),
  });

  let isErrorValid = false;
  try {
    validateAndFormatData(errorSchema, response.body);
    isErrorValid = true;
  } catch (error) {
    isErrorValid = false;
  }

  expect(isErrorValid).toBe(true);
});
```

## 可重複使用的模塊

### 1\. 認證模塊

```typescript
// 自動認證，預設用戶信箱為 DefaultValue.EMAIL_LOGIN.EMAIL[0]
const helper = await APITestHelper.createAuthenticatedHelper();

// 多用戶認證
const multiUserHelper = await APITestHelper.createWithMultipleUsers([
  'user1@isunfa.com',
  'user2@isunfa.com',
]);
```

### 2\. 驗證模塊

```typescript
// API 回應驗證函數
function validateApiResponse(response: any, apiName: APIName) {
  expect(response.body.success).toBe(true);

  const { isOutputDataValid, outputData } = validateOutputData(apiName, response.body.payload);

  if (!isOutputDataValid) {
    throw new Error(`API validation failed for ${apiName}`);
  }

  return outputData;
}

// 錯誤回應驗證函數
function validateErrorResponse(response: any, expectedStatus: number) {
  expect(response.status).toBe(expectedStatus);
  expect(response.body.success).toBe(false);
  expect(response.body.payload).toBeNull();

  const errorSchema = z.object({
    success: z.literal(false),
    code: z.string(),
    message: z.string(),
    payload: z.null(),
  });

  try {
    validateAndFormatData(errorSchema, response.body);
    return true;
  } catch (error) {
    throw new Error(`Error response validation failed: ${error}`);
  }
}
```

### 3\. 清理模塊

```typescript
beforeEach(async () => {
  await helper.ensureAuthenticated();
});

afterAll(async () => {
  helper.clearAllUserSessions();
});
```

## 最佳實踐

### 1\. 命名規範

- 測試檔案：`##_feature_name.test.ts` （數字前綴確保執行順序）

- 測試群組：`describe('Integration Test - Feature Name', () => {})`

- 測試案例：明確描述測試目的

### 2\. 測試結構

```typescript
describe('API Feature', () => {
  describe('Success Cases', () => {
    it('should validate successful response with production validator', async () => {
      // 成功案例測試
    });
  });

  describe('Error Cases', () => {
    it('should validate error response with production validator', async () => {
      // 錯誤案例測試
    });
  });

  describe('Permission Tests', () => {
    it('should prevent unauthorized access', async () => {
      // 權限測試
    });
  });
});
```

### 3\. 驗證層次

1. **HTTP 狀態碼**：`expect(response.status).toBe(200)`

2. **基本回應結構**：`expect(response.body.success).toBe(true)`

3. **生產 Validator**：`validateOutputData(apiName, payload)`

4. **業務邏輯**：驗證資料正確性

5. **權限檢查**：驗證存取控制

### 4\. 錯誤處理

```typescript
// 統一的錯誤驗證模式
function expectValidationSuccess(apiName: APIName, payload: any) {
  const { isOutputDataValid, outputData } = validateOutputData(apiName, payload);
  expect(isOutputDataValid).toBe(true);
  expect(outputData).toBeDefined();
  return outputData;
}

// 使用範例
const teamData = expectValidationSuccess(APIName.LIST_TEAM, response.body.payload);
```

### 5\. 調試支援

```typescript
if (process.env.DEBUG_TESTS === 'true') {
  // eslint-disable-next-line no-console
  // console.log('✅ Validation successful:', outputData);
}
```

## 測試範例

### 完整的 Team API 測試

參考 `src/tests/integration/test_cases/02_team_management.test.ts` 的完整實作，包含：

- ✅ 直接使用 `validateOutputData` 驗證 API 回應

- ✅ 使用 `validateAndFormatData` 進行自定義驗證

- ✅ 成功和錯誤案例的完整覆蓋

- ✅ 跨用戶權限測試

- ✅ 與生產環境 100% 一致的驗證邏輯

### 關鍵要點

1. **生產一致性**：測試使用與生產環境完全相同的驗證邏輯

2. **零重複代碼**：直接重用 `validator.ts`，無需額外包裝

3. **錯誤訊息清晰**：生產級的錯誤處理和訊息

4. **維護性最佳**：Schema 更新時測試自動同步

## 執行測試

```bash
# 運行特定測試檔案
npm run test:integration -- --testPathPattern="01"

# 運行特定測試案例
npm run test:integration -- --testPathPattern="02" --testNamePattern="should successfully list teams with proper parameters"

# 運行所有整合測試
npm run test:integration
```

## 參考檔案

### 必要檔案

- 在撰寫整合測試時的參考檔案如以下，用 api_connection 去找到真的 API 檔案位置，用 zod_schema 去找到
  API 對應的 type guard，作為型別驗證，用 team/permission 作為團隊角色權限的參考，用 validator 作為
  驗證 function

  - src/constants/api_connection.ts

  - src/constants/zod_schema.ts

  - src/constants/team/permissions.ts

  - src/lib/utils/validator.ts
