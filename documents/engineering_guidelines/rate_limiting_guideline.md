# API Rate Limiting 規範

- 版本:v1.0(2026-07-16,Emily;GitHub issue #6516)
- 適用:所有對外 API route;首波落地於 carbon chatbot 六個 route

## 設計原則

1. **維度**:身份(DeWT address)× bucket(端點類別)。不做全域 middleware — route 於 DeWT 驗證後、業務邏輯前呼叫 `enforceCarbonRateLimit()`,維持 route「純端口」職責(一行 if)。
2. **Bucket 分類**(`src/constants/rate_limit.ts`):
   - `LLM`(chat/draft):次數即 Gemini 成本,最嚴;分鐘 + 每日雙窗口。每日上限同時承擔「每人成本上限」職責(#6515 決議:單一機制,不另建成本斷路器)。
   - `UPLOAD`(attachment):Laria 分片與儲存成本;時 + 日雙窗口。
   - `READ`(history/sessions/report GET):寬鬆,防爬掃。
   - `SAVE`(report PUT):上限需高於 autosave 節奏(debounce 2s ≈ 30/min)。
3. **回應**:HTTP 429 + `Retry-After` header(秒)+ 錯誤碼 `IS000013`(`IS_RATE_LIMITED`);前端以專屬文案提示(`carbon_chatbot.rate_limited`),不得顯示為一般系統錯誤。
4. **閾值哲學**:誤限流 = 可用性事故。初期刻意放寬(預設值見 constants,env `CARBON_RL_*` 可覆蓋),每次 429 皆有 `logger.warn` 記錄,上線觀測一週後依 log 收緊。
5. **實作**(`src/lib/rate_limiter.ts`):sliding window、單機 in-memory。記憶體防護:lazy sweep(每 N 次檢查清一次過期 key)+ 追蹤 key 總量上限(超限全清重計並告警)。**已知妥協**:多實例部署時各自計數,實際限額 ≈ 設定值 × 實例數;屆時將 `SlidingWindowRateLimiter` 替換為 Redis backend,呼叫端(`enforceCarbonRateLimit`)介面不變。

## 為新端點加限流(checklist)

1. 選 bucket;無合適者先在 constants 增訂(附 Info 註解說明成本屬性與窗口理由)。
2. route 於 DeWT 驗證後呼叫 `enforceCarbonRateLimit(address, bucket)`。
3. 前端對 `isRateLimitedApiError` 給專屬文案。
4. 補「連打超限 → 429 + Retry-After;窗口滑過恢復」的測試。

## 與其他機制的邊界

- 上游服務(Gemini)自身的 429 由 `isLlmQuotaError` 處理(`IS000011`),與本機制的 `IS000013` 語意不同:前者是「平台額度耗盡」,後者是「單一使用者過量」。
- worker 管線不適用本機制:外部限流時走 DLQ 重試(見 sovereign_cloud_security_drp 斷路器與 00.1 poison pill)。
