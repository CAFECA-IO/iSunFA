# 實作與技術債：03. 傳票至 ESG 碳排紀錄 (Voucher to esgRecord)

> **Date**: 2026-05-10
> **Author**: Tzuhan

> **CPA 查核視角 (Audit Lens)**：
> 在混合審計架構中，碳盤查 (Carbon Accounting) 的嚴謹度必須與財務審計齊平。每一筆碳排紀錄 (esgRecord) 的「活動數據 (Activity Data)」與「排放係數 (Emission Factor)」都必須留下不可竄改的追溯軌跡。系統不能容許任何黑盒子式的碳排計算。

## 1. 模組實作現況 (Current Implementation)

**觸發點**：Worker 進入 `ESG_PARSING` 階段。
**處理邏輯**：
系統呼叫 `src/constants/prompts/esg.ts` 中的 `getEsgPrompt`。為了讓 AI 判斷該使用哪個碳排係數，開發者將 `true_esg_coefficients.ts` 中的各國官方係數（US EPA, DEFRA, 台灣環境部等，共計超過 1,200 多筆，佔用約 15,000 行程式碼）合併為 `ALL_TRUE_COEFFICIENT_DATA`，並全數轉為字串注入 Prompt 之中。

AI 被要求：
1. 找出合適的係數 ID (`coefficientId`)。
2. 萃取活動數據量 (`amount`)。
3. **自行計算總碳排**：Prompt 中明示 `「碳排放量 (Emissions)：活動數據 × 排放係數。請將最終計算出的碳排數字填入 emissions」`。

## 2. 存在之技術債與架構地雷 (Technical Debts & Gotchas)

### 🚨 2.1 最致命的「漂綠 (Greenwashing)」地雷：逼迫 AI 算數學 (Forcing AI into Arithmetic)
這是整個 codebase 內最大的架構地雷。大型語言模型 (LLM) 不具備穩定的浮點數運算能力。碳排係數通常包含多位小數（如 `0.054495`），讓 AI 去執行 `123.45 加侖 * 0.054495`，極其容易產生錯誤的 `emissions`。V2 的鐵律二已明文警告：「絕對禁止 AI 參與任何碳排數值的『運算』」。這種「數學幻覺」一旦進入資料庫，四大會計師查核時會直接認定系統造假（漂綠），在歐盟 CBAM 規範下將面臨天價罰款。

### 🚨 2.2 上萬行係數的暴力注入 (Massive Token Waste)
將高達 1,200 筆係數（字串化後極端龐大）每次塞給 Prompt，不僅消耗天量的 Token 預算，也可能造成 AI 解析器 Context 超載。這也是對整體系統效能與成本控制的雙重打擊。

## 3. Deloitte 級別重構目標 (Refactoring Towards Audit-Ready)

**【強烈建議：立即實作兩段式計算架構 (Two-Stage Calculation)】**

1. **第一段：AI 僅負責文字萃取 (Semantic Extraction)**
   - 移除 Prompt 中的 `ALL_TRUE_COEFFICIENT_DATA` 暴力注入。
   - 限制 AI 的職責：只准從憑證中萃取「活動名稱 (esgActivityType, 例：購買車用汽油)」、「消耗量 (esgAmount, 例：100)」與「單位 (esgUnit, 例：加侖)」。**嚴禁 AI 進行乘法計算**。
2. **第二段：系統層的精確匹配與數學運算 (System-Level Vector Matching & Math)**
   - 在 Node.js 後端，拿著 AI 解析出的 `esgActivityType` 去向量資料庫 (Vector Search) 尋找 `true_esg_coefficients.ts` 中最相關的係數。
   - 找出係數後，由系統使用 `Decimal` 模組執行嚴格的浮點數相乘 (`esgAmount * emissionFactor`)，確保盤查結果具備 **0.0000% 的數學誤差**。
3. **第三段：物理質量守恆護欄 (Mass Conservation Articulation)**
   - 這是阻絕 AI 漂綠的終極防呆機制。將 AI 萃取出的消耗量與企業 ERP 系統進行比對（`期初庫存 + 本期採購 = 消耗重量 + 期末庫存`）。若數量大於物理上限，立刻報錯凍結。
