# ADR 011: Agentic Reflection and Deterministic Validation (AI 反思與確定性驗證機制)

> **Date**: 2026-05-27
> **Author**: Tzuhan & Agent Antigravity
> **Status**: Accepted
> **Context**: 在導入多模態大模型 (Multimodal LLMs) 解析手寫憑證與模糊單據時，AI 極易產生「數字整容 (主動微調數字以達成平衡)」與「信心度造假」的幻覺。如何建立一套具備第三方稽核等級 (如 BSI/SGS) 信任度的防護網，確保異常數據在寫入總帳前被即時攔截，並具備自我修復的能力？

---

## 1. 決策一：捨棄 AI 自我評估，導入確定性硬核驗證 (Hard Validation)

在傳統的 AI Agent 設計中，常依賴 AI 給予解析結果 0%~100% 的信心度自評 (Confidence Score)。然而在嚴謹的財稅領域，「讓 AI 批改自己的考卷」會帶來極大風險。

**決策：**
我們徹底剝奪了 AI 進行數學運算與自我評分的權限。
在 Zero-Trust Washing Pipeline 中，我們設立了 `IssueValidator` 作為確定性驗證層 (Validation Layer)：
- **100% 物理加總核對**：利用 `MoneyUtil` (封裝高精度 Decimal 引擎) 進行雙重勾稽：`TotalAmount === Sum(Item.amount) + TaxAmount`。
- **二元邏輯取代模糊機率**：只要算式存在 0.01 元的誤差，系統不會「降低信心分數」，而是祭出「直接阻斷 (100% 封殺)」，強制將狀態標記為 `isVerified = false`。
我們不信任 AI 的自我感覺良好，只信任由後端 TypeScript 推導出的確定性數學守恆。

---

## 2. 決策二：自評重做與反思引擎 (Self-Correction Loop & Agentic Reflection)

當 `IssueValidator` 攔截到錯誤時，系統不應只是死板地報錯，而應發揮 Agent 的自主修正能力。我們設計了雙層防護網：

### Layer 1: Agentic Reflection (提示注入與重試)
當加總失敗時，系統會啟動重做機制 (Retry Loop)：
- 系統將攔截到的明確錯誤（例如：「數學加總錯誤：差額 5 元，請重新檢查單價與數量」）作為回饋提示 (Feedback Prompt)，再次拋給 `MissionExecutor`。
- 強迫多模態 AI 帶著這個「錯誤上下文」重新凝視原始憑證圖檔，進行自我反思 (Reflection) 並嘗試修正錯位的欄位或看錯的數字。

### Layer 2: Suspense Account (懸記帳與人類回圈)
若 AI 在限制次數內 (如重試 3 次) 依然無法達成數學平衡（可能是因為發票本身油污破損太嚴重），系統會：
- 自動拋棄本次產生的幻覺數據 (`dbSyncPayload`)，中止向資料庫的盲推作業。
- 將該憑證亮起紅燈，送入「懸記區 (Suspense Account)」。
- 觸發 **Human-in-the-Loop (人類迴圈)**，交由人類會計師進行最終的人工覆核與補件，確保系統的絕對合規。

---

## 3. 總結與影響 (Consequences)

透過這項決策，我們將 iSunFA 從「單向盲目的 AI 萃取工具」，升級為具備「感知、反思與防禦」能力的企業級 AI Agent。

1. **防堵「完美的假帳」**：徹底根除 AI 為了達成平衡指令而擅自微調明細單價的「數字整容」風險。
2. **具備第三方確信機構認可的嚴謹度**：所有的決策與錯誤攔截都基於確定的數學邏輯與程式碼，而非黑盒子般的 AI 機率。這提供了符合 BSI、SGS 等機構要求的防篡改審計軌跡 (Audit Trail)。
