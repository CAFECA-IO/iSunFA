## 前言

本文件為 iSunFA 整合測試的 Cookie/Session 管理原理說明。

## Cookie/Session 管理原理

### 為什麼需要手動管理 Cookie？

在 SuperTest 測試環境中，與真實瀏覽器不同，需要手動管理 session cookie。這不是因為 API 有問題，而是
因為 SuperTest 的設計限制。

#### 真實瀏覽器環境 vs SuperTest 環境

| 環境       | Cookie 存儲 | Cookie 發送 | Session 狀態 |
| ---------- | ----------- | ----------- | ------------ |
| 真實瀏覽器 | ✅ 自動存儲 | ✅ 自動發送 | ✅ 正常維持  |
| SuperTest  | ❌ 不存儲   | ❌ 不發送   | ❌ 每次重置  |

### iSunFA 的 Session 實作

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
  // 1. 優先從 header 中獲取 isunfa
  let sessionId = req.headers.isunfa as string;

  // 2. 從 cookie 中獲取 isunfa
  if (!sessionId && req.cookies) {
    sessionId = req.cookies.isunfa;
  }

  // 3. 其他 fallback 方法...
};
```

### SuperTest 中的 Cookie 管理實作

#### 核心邏輯

```typescript
// src/tests/integration/setup/api_helper.ts
export class APITestHelper {
  private sessionCookies: string[] = [];

  // 從響應中提取 session cookie
  private extractSessionCookies(response: any): void {
    const setCookieHeaders = response.headers['set-cookie'];
    if (setCookieHeaders) {
      const sessionCookies = setCookieHeaders
        .filter((cookie: string) => cookie.includes('isunfa='))
        .map((cookie: string) => cookie.split(';')[0]);
      this.sessionCookies.push(...sessionCookies);
    }
  }

  // 獲取當前會話的 cookies
  public getCurrentSession(): string[] {
    return this.sessionCookies;
  }

  // 在請求中設置 cookies
  public applySessionCookies(client: TestClient): TestClient {
    if (this.sessionCookies.length > 0) {
      return client.set('Cookie', this.sessionCookies.join('; '));
    }
    return client;
  }
}
```

#### Cookie 生命週期

```typescript
// 1. 認證流程
const authResponse = await otpClient.post('/').send({ code: '555666' });
// 服務器響應: Set-Cookie: isunfa=abc123...

// 2. 自動提取 cookie
helper.extractSessionCookies(authResponse);

// 3. 後續請求自動攜帶 cookie
const cookies = helper.getCurrentSession();
const response = await client
  .get('/api/v2/status_info')
  .set('Cookie', cookies.join('; '))
  .expect(200);
```

### 驗證 Cookie 設置

#### 使用 curl 驗證

```bash
curl -v -X POST \
  -H "Content-Type: application/json" \
  -d '{"code": "555666"}' \
  http://localhost:3000/api/v2/email/user@isunfa.com/one_time_password

# 輸出會包含:
# < Set-Cookie: isunfa=some-session-id; Path=/; HttpOnly; SameSite=Lax
```

#### 在 SuperTest 中檢查響應

```typescript
const authResponse = await otpClient.post('/').send({ code: '555666' });
console.log('Set-Cookie headers:', authResponse.headers['set-cookie']);
// 輸出: ['isunfa=abc123def...; Path=/; HttpOnly; SameSite=Lax']
```

### 最佳實踐

1. **使用 APITestHelper 的工廠方法**：自動處理 session 管理
2. **檢查認證狀態**：使用 `isAuthenticated()` 和 `ensureAuthenticated()`
3. **多用戶測試**：利用 `switchToUser()` 進行權限測試
4. **Session 清理**：測試後使用 `clearSession()` 清理狀態
