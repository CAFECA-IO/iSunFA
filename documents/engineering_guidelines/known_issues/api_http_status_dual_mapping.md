# 🐛 已知缺陷：API 錯誤碼對 HTTP 狀態碼存在雙套對照表，其中一套不完整

- 版本：v1.1（2026-08-07，Luphia）
- 狀態：**Resolved — 已修復（2026-08-07，feature/team_wallet_subscription_quota）**
  > `httpStatusOf()` 已改為 `return HTTP_MAP[code] ?? 500;`，雙套對照收斂為單一來源。
  > `HTTP_MAP` 型別為 `Record<ApiCode, number>`，日後新增 `ApiCode` 成員（如本次的
  > `PAYMENT_REQUIRED` 402）漏補對照會直接編譯失敗，不再依賴人工同步。
  > 以下原始描述保留供歷史脈絡。
- 嚴重度：中（影響監控正確性、前端錯誤分流、以及已成文規範的實際落地）
- 發現脈絡：處理 PR #6570 review 衍生的 `report_generate/route.ts` aborted 錯誤碼 ToDo 時發現

---

## 摘要

系統中「`ApiCode` → HTTP status code」的對照存在**兩份獨立實作**，其中 `jsonFail()` 實際使用的那一份**缺少 `CONFLICT` 與 `RATE_LIMIT` 兩個 case**，會靜默落入 `default: 500`。

結果是：宣告為 429 的限流回應實際回 **HTTP 500**，宣告為 409 的衝突回應實際回 **HTTP 500**。

---

## 兩份對照表

| 位置 | 完整度 | 被誰使用 |
|---|---|---|
| `src/lib/utils/status.ts` — `HTTP_MAP` | ✅ 完整（型別為 `Record<ApiCode, number>`，新增 enum 成員時 tsc 會強制補齊） | `src/lib/utils/error.ts:14` |
| `src/lib/utils/response.ts` — `httpStatusOf()` | ❌ **不完整**（`switch` 有 `default` 分支，缺 case 不會被 tsc 察覺） | **`jsonFail()`** ← 全庫 API 錯誤回應的主要出口 |

```typescript
// src/lib/utils/response.ts
function httpStatusOf(code: ApiCode): number {
  switch (code) {
    case ApiCode.SUCCESS:           return 200;
    case ApiCode.VALIDATION_ERROR:  return 400;
    case ApiCode.UNAUTHORIZED:      return 401;
    case ApiCode.FORBIDDEN:         return 403;
    case ApiCode.NOT_FOUND:         return 404;
    case ApiCode.CLIENT_CLOSED_REQUEST: return 499;  // Info: 20260731 新增
    // ⚠️ 缺 ApiCode.CONFLICT   → 應 409，實際 500
    // ⚠️ 缺 ApiCode.RATE_LIMIT → 應 429，實際 500
    default:                        return 500;
  }
}
```

---

## 實際影響

### 1. Rate Limiting 的實際行為與已成文規範不符

`documents/engineering_guidelines/rate_limiting_guideline.md` 第 3 條明訂：

> **回應**：HTTP 429 + `Retry-After` header（秒）+ 錯誤碼 `IS000013`（`IS_RATE_LIMITED`）；前端以專屬文案提示（`carbon_chatbot.rate_limited`），**不得顯示為一般系統錯誤**。

但實際呼叫鏈為：

```
enforceCarbonRateLimit()                    // src/lib/rate_limiter.ts:128
  └─ jsonFail(API_ERRORS.IS_RATE_LIMITED, { headers: { "Retry-After": ... } })
       └─ httpStatusOf(ApiCode.RATE_LIMIT)  // 無對應 case
            └─ default → 500
```

**送出的是 HTTP 500 配上一個 `Retry-After` header**——一個自相矛盾的回應。前端若依 HTTP 狀態碼分流，限流會被歸類成「一般系統錯誤」，正是規範明文禁止的行為。目前唯一能正確識別限流的途徑是讀 body 裡的 `errorCode === "IS000013"`。

### 2. 監控指標失真

限流與資源衝突都是**預期內的客戶端情境**，卻全部計入 5xx。伺服器錯誤率因此被灌水，真實故障容易被淹沒。

### 3. HTTP 語意錯誤

429 有標準的重試語意（配合 `Retry-After`），客戶端函式庫與 CDN 會據此自動退避；回 500 則喪失這層協定級的行為。

---

## 為何 tsc 抓不到

這是本缺陷最需要警惕的性質：

- `HTTP_MAP` 的型別是 `Record<ApiCode, number>` → **少一個 key 就編譯失敗**，具備自我防護
- `httpStatusOf()` 是帶 `default` 的 `switch` → **少一個 case 只會靜默回 500**，沒有任何警告

因此每次新增 `ApiCode` 成員，`HTTP_MAP` 會被強制提醒，`httpStatusOf()` 卻不會。兩者的漂移是必然的，只是時間問題——`CONFLICT` 與 `RATE_LIMIT` 就是已經漂掉的兩個。

> **給後續開發者**：在修好本缺陷之前，**任何新增 `ApiCode` 成員的變更都必須手動同步 `httpStatusOf()`**，否則新狀態碼會靜默變成 500。

---

## 建議修復方向

讓 `jsonFail()` 直接使用 `HTTP_MAP`，移除 `httpStatusOf()`，收斂為單一來源：

```typescript
// src/lib/utils/response.ts
import { ApiCode, HTTP_MAP } from "@/lib/utils/status";

export const jsonFail = (def: IErrorDef, init?: ResponseInit) =>
  NextResponse.json<IApiResponse<null>>(fail(def), {
    status: HTTP_MAP[def.status] ?? 500,
    ...init,
  });
```

`Record<ApiCode, number>` 的型別約束會讓未來任何新增的 `ApiCode` 都被強制對應，缺陷不會再復發。

### 為何未在發現當下一併修復

此修改會改變全庫 API 的實際回應狀態碼（500 → 429／409），屬於**對外行為變更**：

- 前端可能存在依賴 `status === 500` 的錯誤處理分支
- 既有整合測試可能以 500 為預期值
- 監控告警規則可能已針對現行（錯誤的）5xx 比率調校

因此應獨立成一個 PR，搭配以下工作一起進行，而非夾帶在無關的功能分支中：

1. 全庫盤點使用 `ApiCode.RATE_LIMIT` / `ApiCode.CONFLICT` 的錯誤定義與其呼叫端
2. 檢查前端是否有依 HTTP 狀態碼分流的邏輯需同步調整
3. 補上 `jsonFail` 對各 `ApiCode` 的回歸測試（正是目前缺乏、才讓此缺陷長期潛伏的原因）
4. 通知維運同步調整監控門檻

---

## 相關檔案

- `src/lib/utils/response.ts` — `httpStatusOf()`、`jsonFail()`
- `src/lib/utils/status.ts` — `ApiCode`、`HTTP_MAP`
- `src/lib/utils/error.ts` — 使用 `HTTP_MAP`（正確的那一套）
- `src/lib/rate_limiter.ts:128` — 受影響的實際呼叫端
- `documents/engineering_guidelines/rate_limiting_guideline.md` — 規範與實作不符之處
