# 不採用:以 proxy_read_timeout 300s 解長請求

> **狀態**:🟡 分支 `chore/gateway_proxy_timeout` 已推 origin(`f98926781`),**未併 develop、未開 PR**。依據:`2026-08-04_retrospective.md`

**Labels**: infra, wontfix
**狀態**: **CLOSED / wontfix(2026-08-04 Emily 否決;2026-08-06 已由別的作法取代,可關票)**
**相關分支**: `chore/gateway_proxy_timeout`(`f98926781`,已推 origin)—— **不要合併,可刪除**

---

## 原本的提案

碳盤查的「附件 → 段落」管線跑約 87 秒,而 `dockerfiles/gateway/nginx.conf`
從未設定 `proxy_read_timeout`,套用 nginx 預設 60 秒 → 瀏覽器收到 504,
但**伺服端其實已經跑完並回應了**。提案是把逾時放寬到 300s。

## 為什麼不採用

**拉長連線本身就是問題,不是解法。**

1. **安全隱患。** 讓單一連線可以保持五分鐘,等於把慢速連線攻擊的成本降低五倍;
   而這個設定是**全站共用**的,每一條 API 都會被放寬,不只碳盤查。
2. **它沒有解決任何事。** 只是把 60 秒的轉圈變成 300 秒的轉圈 ——
   期間任何網路波動仍會讓使用者失去結果,而卡住的請求佔用連線更久。
3. **原提案自己就寫了這句**:「不要靠它解決長工作」。既然如此就不該合併它,
   否則下一個人看到 300s 只會以為「加大即可」。

## 正確的方向

**結果不能依賴單一連線存活。**

- 逐段經 Centrifugo 推播(`feature/esg_report_ingestion` 已有此機制),
  HTTP 呼叫立即回 202 + 任務 id,結果走推播通道。
- 或把長工作移出請求生命週期:背景 worker + 輪詢/推播。
- 前端已能辨識 502/504/524(無 errorCode)為閘道逾時而非匯入失敗 —— 這部分保留。

## 處置

- `a7395844d` 誤把此改動一併提交進 `feature/carbon_sankey_three_layer`,
  **已於 2026-08-04 退回**(revert commit `2de0b84c2`,`nginx.conf | 8 --------`)。
- 2026-08-06 查證:`dockerfiles/gateway/nginx.conf` 全檔只剩 `keepalive_timeout 65;`,
  **沒有** `proxy_read_timeout` / `proxy_send_timeout` —— 否決確實生效了。
- `chore/gateway_proxy_timeout` 仍在 local 與 origin。**現在可以刪除**
  (local 與 `origin/chore/gateway_proxy_timeout` 兩邊都刪;commit 內容已由 revert 記錄在主線)。

## 那個「仍然成立的觀察」已於 2026-08-06 解決

原文寫:

> `LLM_DIAGRAM_TIMEOUT_MS = 90_000` 大於 nginx 預設的 60s,
> 所以在不改閘道的前提下,任何設計成可能跑超過 60 秒的前端呼叫都是錯的。
> 該調整的是那些呼叫的形狀(改推播、切小、非同步),不是閘道的忍耐度。

方向是對的,但當時漏了一個更便宜的形狀:**那 60 秒是「閒置」逾時。**
nginx 文件寫「只計算兩次連續讀取之間的間隔」—— 所以除了改推播/切小/非同步之外,
還有第四種:**讓連線不閒置**。

作法(`@/lib/utils/streaming_response` 的 `streamingJson`):
立即送 200 表頭,等 LLM 期間每 20 秒寫一個換行,結束才寫完整信封。
連線一直是活的,閘道對「閒置多久算死」的判斷維持原樣,**nginx 一行都不動**。
客戶端零改動 —— `JSON.parse` 依規範忽略前導空白,而 `Response.json()` 走的就是它。

方向也與本票被否決的提案相反:那個是允許連線長時間空掛,這個是讓它不要空著。

已套用:
- `/api/v1/chat/carbon/diagram`(`LLM_DIAGRAM_TIMEOUT_MS = 90s`)
- `/api/v1/chat/carbon/import` 三個模式(`LLM_REPORT_IMPORT_TIMEOUT_MS = 240s`;
  切節仍保留以降低單次輸入量,但不再是「請求能不能活著回來」的唯一手段)

代價寫在 helper 檔頭:串流一開始 HTTP 狀態就鎖 200,失敗只能寫在信封裡,
因此**採用它的端點必須一併把前端改成判 `success`**(`unwrapEnvelope`)。
漏改的表現是「失敗被當成成功」,比 504 更難查 —— 所以那條反向情形有測試
(`src/__tests__/unwrap_envelope.test.ts`)。

尚未套用而仍可能超過 60 秒的:`/api/v1/chat/carbon` 主對話那支
(它已用「邊做邊推」讓結果不依賴連線存活,所以 504 不會遺失結果,
只是使用者會看到一次錯誤提示)。要不要一併換成心跳是另一張票的事。
