# 🏆 Sprint 1: 企業級混合審計防護網與精度極限重構 (Proof of Work)

> **Date**: 2026-05-20
> **Author**: Tzuhan
> **Scope**: `feature/zero-tolerance-report-integrity`

本分支完成了 iSunFA 系統從「MVP 概念驗證」正式躍升為「四大會計師 (Big 4) 查驗級別」的關鍵重構。我們成功移除了系統底層的所有妥協機制，並實作了基於「資料驅動 (Metadata-Driven)」與「絕對確定性 (Determinism)」的會計與碳排防禦護城河。

## 🚀 核心技術成果 (Key Deliverables)

### 1. 🌲 報表引擎：樹狀溯源重構 (Metadata-Driven Tree Traversal)

* **拔除魔法字串**：徹底廢除了過去依賴 `code.startsWith("11")` 等容易引發邊界漏洞的字串判斷。
* **O(1) 效能與 O(h) 溯源**：實作了 `AccountUtil.isDescendantOf` 與靜態快取字典，以資料驅動的樹狀結構精準歸類 `1410(預付費用)`、`1510(非流動金融資產)`、`2310(預收貨款)` 等極易出錯的邊界科目。確保資產負債表 (BS) 與現金流量表 (CF) 在複雜帳務下仍能達成 $A = L + E$ 的絕對平衡。

### 2. 🧮 跨表勾稽與指標解耦 (Cross-Report Metrics Engine)

* **收攏職責邊界**：過去「現金流量表引擎」會試圖捏造「現金再投資比率」，「損益表引擎」會試圖計算 EPS，這違反了單一職責原則並導致除以零 (Division by Zero) 的崩潰。
* **實作解法**：建立獨立的 `calculateCrossReportMetrics` 引擎。單一報表只負責絕對的當期加總（無對應資料時回傳 `null`），由高階分析服務 (`AnalysisService`) 匯集三大報表後，再進行 EPS 與現金流量允當比率等「跨表指標」的精準計算。

### 3. 🛡️ 零捏造與會計法理實作 (Accrual Basis & Zero Invention)

* **自動沖銷機制 (Auto-Reconciliation)**：新增 `ReconciliationService`。當 AI 解析出 `PAYMENT_RECEIPT` (已付款收據) 時，後端會啟動 FIFO 機制，自動尋找前期未付款的 `ACCRUAL_NOTICE` (應付帳款) 傳票進行沖銷 (Cleared by Voucher ID)。
* **防呆 Prompt 憲法**：在 `journal.ts` 與 `voucher.ts` 中寫入極端嚴厲的 AI 護欄。嚴禁 AI 自行計算預設營業稅（Zero Tax Hallucination）；強制跨期合約採用「預付費用/租金 (Prepaid)」邏輯。

### 4. 🌍 碳會計：量綱護欄與降級推測 (Dimensional Guard & Semantic Fallback)

* **廢除 AI 數學與假係數**：徹底拔除 AI 瞎編 `newCoefficient` 的權力。
* **決定論最高係數防漂綠**：AI 僅能推測 `fallbackCategory`（大類標籤）。後端系統在資料庫尋找匹配時，套用 `MAX(factor)` 以符合審計的保守原則。
* **跨量綱相乘阻斷 (Dimensional Consistency)**：在匹配係數時，若單據單位 (如 `LITER` 體積) 與係數單位 (如 `KWH` 能量) 量綱不符，系統將直接攔截並強行列入懸記 (Suspense)，並標記 `isVerified: false`，杜絕荒謬的碳排數字入庫。

### 5. 🧹 精度死角大掃蕩 (The Great Precision Purge)

* 全面清查前端儀表板 (Dashboard)、定價頁面 (Pricing)、活動點數 (Campaign) 與後端金流 API。將殘留的 `Number()` 或 `parseFloat` 全數替換為 `MoneyUtil` (基於 `Decimal.js`) 或 `BigInt`。
* 在第三方外部 API (如 OEN 金流) 邊界實作 `Number.isSafeInteger` 溢位攔截，防止千兆級法幣轉換時的截斷災難。

### 6. 🌐 語系解耦與真實審計軌跡 (Multi-Region & Audit Trail)

* 導入 `UniversalAccountTag` 搭配 `SemanticAccountMatcher`，支援 TW, US, JP, CN 等多國會計科目字典的模糊與精確映射。
* **刪除 `ai_note_translator`**：不再讓前端去修飾或翻譯 AI 的推理紀錄。將原汁原味的 AI 思維鏈 (Chain of Thought) 與「系統稽核警告」直接寫入資料庫並於 UI 呈現，確保最真實的審計追蹤軌跡 (Audit Trail)。

---

## 📌 關鍵架構決策 (Architectural Decisions)

*(可作為後續開發團隊的 Guideline)*

1. **跨表指標計算的「不僭越原則」**：
單一報表引擎 (`src/lib/report/*`) 只能處理傳入的 `VoucherLine`，**絕對不允許**在內部引入其他報表的假設數值或歷史期初數據。所有涉及「跨表」或「期初餘額」的指標 (如 EPS、營運資金變動)，必須交由上層的 `AnalysisService` 或 `CrossReportMetrics` 處理。
2. **會計科目的樹狀繼承判定 (Tree Traversal Lookup)**：
未來新增任何商業邏輯（例如判斷某科目是否為「流動資產」），**嚴禁**使用 `code.startsWith("11")`。必須統一呼叫 `AccountUtil.isDescendantOf(code, SystemAccountNodes.CURRENT_ASSETS_ROOT)`，以確保系統相容所有自定義的多層級子科目。
3. **ESG 數據的黃燈懸記與大盤連續性 (Yellow Light Suspense)**：
當無法精確匹配碳排係數時，我們「不給 0」也「不給 null」（避免前端總覽圖表斷層與漂綠），而是透過 AI 的 `fallbackCategory` 給予「該類別最高係數」，並強制標記 `isVerified = false` 與 `generationSource = AI_SPECULATIVE_STAGE_3`。審計時只認綠燈，但營運時允許黃燈存在。
4. **外部系統邊界的型別強鑄造 (Boundary Guard)**：
資料庫撈出來的永遠是 `BigInt/Decimal`。只要準備傳給外部（如金流 API）或前端圖表需要原生 `number` 時，必須在「最後一哩路」進行轉型，並強制包裹 `Number.isSafeInteger` 防呆。

---

## 📚 建議沉澱之知識庫文章 (Knowledge Base Article Candidates)

檢視本次修改的複雜度與價值，我強烈建議技術寫手或架構團隊將以下三大主題撰寫成內部的 Engineering Wiki，因為這些防禦思維超出了普通軟體工程的範疇，屬於「數位審計」的深水區：

### 📝 知識文章 1: 《如何打造 Big 4 級別的財務報表引擎：告別 startsWith，擁抱樹狀溯源》

* **痛點**：解釋為何傳統用 `startsWith("14")` 抓資產會漏掉預收貨款、算錯預付費用，導致資產負債表不平。
* **解法**：介紹 `AccountUtil.isDescendantOf` 的實作原理，以及如何利用 `SystemAccountNodes` 與單例快取 (Memoization) 實現 O(1) 的高效查詢。

### 📝 知識文章 2: 《自動沖銷架構：從「應計基礎」到「現金流」的完整閉環》

* **痛點**：發布一張「繳費通知」跟一張「繳費收據」，如果不做關聯，系統會把費用跟負債重複計算兩次。
* **解法**：詳解 `ReconciliationService.findUnpaidVoucher` 的 FIFO 匹配邏輯，以及如何透過 `DocumentType.ACCRUAL_NOTICE` 鎖定負債科目，再藉由 `PAYMENT_RECEIPT` 產生 `clearedByVoucherId` 雙向鏈結，完美實現應付帳款的自動沖銷。

### 📝 知識文章 3: 《防堵漂綠 (Greenwashing)：ESG 混合決策管線與量綱防護網》

* **痛點**：AI 把「公升」乘上「每度電」的碳排係數；或是遇到不認識的活動直接填 0 碳排。
* **解法**：解析 `EsgGenerationSource` 的生命週期。介紹「量綱防護 (Dimensional Consistency)」的實作（確保 MASS 只能對齊 MASS），以及系統如何透過 `fallbackCategory` 結合資料庫 `orderBy: { emissionFactor: "desc" }` 取出最高保守係數的實務手法。

### 📝 知識文章 4: 《跨表指標引擎：破除微服務時代的「財務指標孤島」》

* **痛點**：單表報表引擎無法取得發行股數，導致無法計算 EPS；或者現金流引擎無法取得流動負債餘額，導致允當比率崩潰。
* **解法**：介紹 `cross_report_metrics.ts` 的設計哲學，探討為何報表引擎在遇到無法計算的指標時「必須回傳 null」，並由統一的編排層進行聚合防護。
