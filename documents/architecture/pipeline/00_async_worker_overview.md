# 實作與技術債：00. 非同步任務架構與速度的錯覺 (Async Worker Architecture)

> **CPA 查核視角 (Audit Lens)**：
> 系統的「非同步架構 (Asynchronous Architecture)」極好地隱藏了 AI 處理的延遲 (Latency)，為使用者帶來極佳的流暢體驗。但這也意味著「錯誤的發生是靜默的 (Silent Failure)」。我們必須意識到，即使前端不卡頓，後端的 API Token 消耗與幻覺風險依然在背景真實發生，這在營運成本與審計合規上是巨大的隱患。

## 1. 模組實作現況 (Current Implementation)

當前系統能夠「流暢運作且不卡頓」的真正核心，在於優秀的非同步解耦設計：

1. **極速的 API 請求 (Foreground)**：
   當上傳憑證觸發 `/api/v1/user/account_book/{id}/ai_analysis` 時，系統並沒有在當下等待 AI 的生成。它僅僅是**將任務需求寫入檔案系統 (`MISSION_DIR`) 或資料庫**，便立刻回傳 `HTTP 200 SUCCESS` 給前端。這也是為何使用者完全感受不到上萬個 Token 傳輸的卡頓。

2. **默默吃苦的背景勞工 (Background)**：
   在系統背後，`src/services/mission.executor.service.ts` 是一支常駐的輪詢 Worker。它會不斷掃描 `MISSION_DIR`，一旦發現有待辦的任務，就會依序呼叫 `JOURNAL_PARSING`、`VOUCHER_LINES_PARSING`、`ESG_PARSING`。
   **真正的 Token 消耗與浮點數數學運算，全部發生在這裡。**

## 2. 存在之技術債與架構地雷 (Technical Debts & Gotchas)

除了先前提到「AI 算數學」與「暴力注入字典」的技術債被這層架構隱藏之外，進一步深挖 `mission.executor.service.ts` 程式碼，還發現了另一個容易被忽略的系統級地雷：

### 🚨 脆弱的 JSON 正規表達式擷取 (Fragile Regex JSON Extraction)
在 `mission.executor.service.ts` 的第 196 行左右，處理 AI 回傳結果時，若 `JSON.parse` 失敗，系統設計了一個 Fallback 救援機制：
```typescript
const globalMatch = taskResultStr.match(/\{[\s\S]*\}/);
```
**【技術債風險】**：
這是一個非常危險的 Regex！如果在 AI 的 Markdown 輸出中，出現了**多個**獨立的 JSON 區塊（例如 AI 解釋邏輯時附帶了另一個 JSON 範例），這段語法會直接「從第一個 `{` 一路截斷到最後一個 `}`」，把中間所有的純文字也一併包進去，產生一個絕對無法 Parse 的超級無效字串。
**【審計風險】**：
這會導致該筆憑證的解析結果直接變成 fallback 的純文字，而無法結構化寫入資料庫。對於要求 100% 準確對應的會計系統而言，這會引發無聲的資料遺失 (Silent Data Loss)。

## 3. Deloitte 級別重構目標 (Refactoring Towards Audit-Ready)

1. **改用結構化輸出 (Structured Outputs)**：
   既然 Gemini 已經支援嚴格的 JSON Schema 設定，應全面廢除這種脆弱的 Regex 擷取，直接依賴 `responseMimeType: "application/json"`，要求模型原生輸出 JSON。
2. **背景任務的死信佇列 (Dead-Letter Queue, DLQ)**：
   因為錯誤發生在背景，如果 AI 解析失敗，必須有明確的機制將失敗任務丟入 DLQ，並在前端 UI 顯示「憑證需要人工介入 (Requires Human Review)」，確保沒有任何一筆異常憑證被系統「靜默吞沒」。
