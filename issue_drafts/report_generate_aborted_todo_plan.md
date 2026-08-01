# `report_generate/route.ts` aborted 錯誤碼 ToDo 處理計劃

> ToDo: (20260721 - Luphia) 中止回傳 IS_UNKNOWN 語意不精確，建議新增專屬 aborted 錯誤碼以區隔真正的未知錯誤
>
> 位置：`src/app/api/v1/admin/pdf_editor/report_generate/route.ts:47`

---

## 一、問題確認

```typescript
} catch (error) {
  // Info: 使用者中止：客戶端已離線，無需視為錯誤或噪音記錄
  if (req.signal.aborted) {
    return jsonFail(API_ERRORS.IS_UNKNOWN);        // ← 與下面那行完全同碼
  }
  console.error("[API] /admin/pdf_editor/report_generate error:", error);
  if (error instanceof Error && error.message.includes("GEMINI_API_KEY")) {
    return jsonFail(API_ERRORS.IN_SERVER_CONFIGURATION_ERROR);
  }
  return jsonFail(API_ERRORS.IS_UNKNOWN);          // ← 真正的未知錯誤
}
```

「使用者主動取消」與「伺服器發生未預期錯誤」回傳**完全相同的 `IS000099` / HTTP 500**。程式碼刻意分了兩條路徑（前者不 `console.error`），但回傳值卻讓這個區分在下游消失。

### 影響範圍：主要是可觀測性，不是使用者體驗

實測前端行為（`pdf_editor.tsx:277-316`）：客戶端以 `AbortController` 中止，`fetch` 會在本地 reject 成 `AbortError`，程式碼在 catch 中比對 `message.includes("abort")` 後直接 `return`。**客戶端從頭到尾不會去讀這個 response body。**

所以修這個 ToDo 的價值不在前端，而在：

1. **APM / 監控**：使用者取消目前計入 HTTP 500，會污染 5xx 錯誤率。AI 報告生成耗時長、被取消是常態，這類噪音會讓真實故障被淹沒
2. **日誌與追查**：`IS000099` 同時代表兩種完全不同的情況，事後查問題無法區分
3. **語意正確性**：使用者取消不是伺服器故障，回 5xx 不符合 HTTP 語意

---

## 二、實作前必須先知道的兩個既有問題

### 🔴 問題 1：`code → HTTP status` 有兩套並存的對照表，其中一套是壞的

| 位置 | 內容 | 使用者 |
|---|---|---|
| `src/lib/utils/status.ts:17` `HTTP_MAP` | **完整 8 項**（含 CONFLICT 409、RATE_LIMIT 429） | `src/lib/utils/error.ts:14` |
| `src/lib/utils/response.ts:69` `httpStatusOf()` | **只有 5 項**，`CONFLICT` / `RATE_LIMIT` 缺 case → 落入 `default: 500` | `jsonFail()` |

`jsonFail()` 走的是**不完整的那一套**。實際後果——這是現在就存在的 bug，非本次引入：

```typescript
// error_dictionary.ts:711  IS_RATE_LIMITED
{ code: "IS000013", status: ApiCode.RATE_LIMIT }   // 期望 429
// 但 jsonFail → httpStatusOf(RATE_LIMIT) → default → 實際回 500
```

`ApiCode.CONFLICT` 同理（期望 409，實際 500）。

**為何與本 ToDo 相關**：若採用下方方案 B（新增 `ApiCode` 成員），`HTTP_MAP` 因為型別是 `Record<ApiCode, number>` 會**強制** tsc 報錯提醒補上；但 `httpStatusOf` 有 `default` 分支，**會靜默回 500**，改了等於沒改。這個坑必須先知道。

### 🟡 問題 2：`IS_` 錯誤碼編號現況

已使用 `IS000001`–`IS000016`，`IS000099` 為 `IS_UNKNOWN`。**下一個可用編號為 `IS000017`**（已確認無衝突）。

---

## 三、方案

### 方案 A（最小改動，符合 ToDo 字面要求）

只新增專屬錯誤碼，沿用既有 `ApiCode.INTERNAL_SERVER_ERROR`。

```typescript
// src/lib/utils/error_dictionary.ts
// Info: (20260731 - Julian) 使用者主動中止請求（客戶端已離線，非伺服器故障）
IS_REQUEST_ABORTED: {
  code: "IS000017",
  message: "Request aborted by client",
  status: ApiCode.INTERNAL_SERVER_ERROR,
} as IErrorDef,
```

```typescript
// route.ts
if (req.signal.aborted) {
  return jsonFail(API_ERRORS.IS_REQUEST_ABORTED);
}
```

- ✅ 日誌／追查可區分（`IS000017` vs `IS000099`）
- ✅ 改動極小：2 檔、各 1 處，零風險
- ❌ HTTP 仍為 500，**5xx 錯誤率污染的問題沒有解決**（這其實是最主要的實務痛點）

### 方案 B（建議）：方案 A + 專屬 `ApiCode`，HTTP 回 499

在 A 的基礎上補上語意正確的 HTTP 狀態。499 Client Closed Request 是 nginx 起源的業界慣例，正是用於「客戶端在伺服器回應前關閉連線」。

```typescript
// src/lib/utils/status.ts
export enum ApiCode {
  SUCCESS = "SUCCESS",
  // ... 既有
  // Info: (20260731 - Julian) 499: 客戶端在伺服器回應前中止連線（非伺服器故障，不應計入 5xx）
  CLIENT_CLOSED_REQUEST = "CLIENT_CLOSED_REQUEST",
  INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR",
}

export const HTTP_MAP: Record<ApiCode, number> = {
  // ... 既有
  [ApiCode.CLIENT_CLOSED_REQUEST]: 499,   // ← tsc 會強制要求補這行
};
```

```typescript
// src/lib/utils/response.ts —— ⚠️ 有 default 分支，不會被 tsc 提醒，必須手動補
function httpStatusOf(code: ApiCode): number {
  switch (code) {
    // ... 既有
    case ApiCode.CLIENT_CLOSED_REQUEST:
      return 499;
    default:
      return 500;
  }
}
```

錯誤字典的 `status` 改為 `ApiCode.CLIENT_CLOSED_REQUEST`。

- ✅ 錯誤碼與 HTTP 狀態兩層語意都正確，5xx 指標乾淨
- ✅ 未來其他長時間 API（分析、碳盤查報告）可共用同一套語意
- ⚠️ 動到核心 `ApiCode` enum，需確認監控／閘道對 499 的處理

### 順帶建議（獨立 ticket，不綁本次）

`httpStatusOf()` 與 `HTTP_MAP` 應**收斂為單一來源**，直接讓 `jsonFail` 使用 `HTTP_MAP`，並移除 `httpStatusOf`。這會同時修好 `RATE_LIMIT` / `CONFLICT` 回錯 HTTP 的既有 bug。因牽涉全庫 API 回應狀態碼，建議獨立 PR 並搭配回歸測試，不要夾在本次 ToDo 裡。

---

## 四、方案比較

| | 方案 A | 方案 B |
|---|---|---|
| 日誌可區分中止 vs 未知錯誤 | ✅ | ✅ |
| HTTP 語意正確 | ❌ 仍 500 | ✅ 499 |
| 5xx 監控噪音 | ❌ 未解決 | ✅ 解決 |
| 改動檔數 | 2 | 4 |
| 動到核心 enum | 否 | 是 |
| 需確認基礎設施 | 否 | 是（見下） |

**建議採方案 B**，因為 ToDo 的實務痛點正是「真正的未知錯誤被中止噪音淹沒」，而方案 A 只解決了一半——日誌能分辨了，但監控儀表板上仍是同一片 5xx。

**採 B 前需確認**：Vercel / 反向代理 / APM 是否正確處理 499（部分工具會歸類為 5xx 或視為異常）。若基礎設施不支援，退回方案 A 並在 ticket 註明原因。

---

## 五、執行步驟（方案 B）

1. `src/lib/utils/status.ts`：`ApiCode` 新增 `CLIENT_CLOSED_REQUEST`，`HTTP_MAP` 補 `499`
2. `src/lib/utils/response.ts`：`httpStatusOf()` 補 `case`（**此步驟 tsc 不會提醒，最容易漏**）
3. `src/lib/utils/error_dictionary.ts`：新增 `IS_REQUEST_ABORTED`（`IS000017`）
4. `route.ts`：`IS_UNKNOWN` → `IS_REQUEST_ABORTED`，移除 `ToDo:` 標籤改為 `Info:` 註解
5. 驗證（見下節）

**改動範圍**：4 檔，皆為單點新增。route.ts 的控制流程不變（仍是 `if (req.signal.aborted)` 早退、不 `console.error`）。

---

## 六、驗證清單

自動化：

```bash
npx tsc --noEmit                        # HTTP_MAP 的 Record<ApiCode,number> 會強制檢查完整性
npx eslint src/lib/utils/status.ts src/lib/utils/response.ts \
           src/lib/utils/error_dictionary.ts \
           src/app/api/v1/admin/pdf_editor/report_generate/route.ts
```

必須人工確認（tsc 抓不到）：

- [ ] `httpStatusOf()` 確實補了 `CLIENT_CLOSED_REQUEST` 的 case——**故意漏掉時 tsc 不會報錯，只會靜默回 500**
- [ ] `IS000017` 在 `error_dictionary.ts` 全域唯一

行為驗證：

- [ ] 觸發 AI 報告生成後於回應前按取消 → 伺服器不出現 `console.error` 噪音、回應為 499 / `IS000017`
- [ ] 前端仍正常走 `AbortError` 分支、不彈錯誤 Modal（此路徑不讀 response body，理應完全不受影響）
- [ ] 真正的錯誤（如故意移除 `GEMINI_API_KEY`）仍回原本的 `IN_SERVER_CONFIGURATION_ERROR`
- [ ] 未設定 signal 的一般失敗仍回 `IS000099`

---

## 七、建議提交方式

與 PR #6570 的直方圖主題無關，建議另開分支：

```
feat(api): add dedicated aborted error code for client-cancelled requests
```

`httpStatusOf` / `HTTP_MAP` 收斂為單一來源那項另開 ticket，不併入。
