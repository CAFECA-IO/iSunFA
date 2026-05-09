# 實作與技術債：04. 報表生成與 AI 健檢 (Report Generation & Analysis)

> **CPA 查核視角 (Audit Lens)**：
> 此階段是系統的心臟。無論是對外產出的即時財報，還是交由 AI 生成的分析報告，其數據來源都必須建立在「絕對真理」之上，也就是資料庫中 `isVerified: true` 的不可竄改憑證。

## 1. 模組實作現況 (Current Implementation)

此階段實作架構完整定義於 `documents/architecture/report_and_analysis_architecture.md`，可分為兩條並行的資料流：

### 1.1 即時財報與儀表板 (內部報表引擎)
- **定位**：這就是系統的「骨幹」。這裡完全沒有 AI 的介入，只有 0 誤差的數學恆等式。
- **處理邏輯**：當使用者檢視財報時，Next.js API 直接向資料庫請求 `isVerified: true` 且 `deletedAt: null` 的明細資料，交由 `src/lib/report/*` 核心引擎根據「借貸法則」動態加總抵銷，產出結構化的 JSON (如 `IIncomeStatement`) 供前端渲染。

### 1.2 AI 深度分析與碳健檢模組 (靜態快照報表)
- **定位**：將 AI 限制為「分析師與閱讀者 (Analyst)」。
- **處理邏輯**：當使用者選擇生成分析時，系統後端微服務 (`analysis.service.ts`) 會呼叫核心報表引擎算出總和。接著，將這些**已經結算完畢且 100% 正確**的財報與碳排總表，作為 Context 餵給 Gemini 2.5，要求 AI 根據數據撰寫「健檢報告」。

## 2. 存在之技術債與架構地雷 (Technical Debts & Gotchas)

目前在核心報表層 (`src/lib/report/*`) 的設計非常穩固，完美遵守了我們 Roadmap v2 中「零捏造」的雙軌防禦思維。沒有明顯的底層架構瑕疵，這是一道非常漂亮的防火牆！

唯一的潛在風險與技術債在於**效能瓶頸 (Performance Bottleneck)**：
- 目前所有的加總與抵銷都是「動態 (On-the-fly)」由 Node.js 執行。當一間企業有十年、數十萬筆以上的傳票時，即使資料庫有下 Index，在記憶體中反覆還原科目餘額會非常吃重。

## 3. Deloitte 級別重構目標 (Refactoring Towards Audit-Ready)

為了扛住大企業的千億級帳務：
1. **日結餘 / 月結餘 快照機制 (Daily/Monthly Snapshot Rollups)**：
   - 不應該每次都從歷史第一筆開始算起。必須實作結帳機制，每個月底固定結算出「期末餘額表 (Trial Balance)」，將其雜湊上鏈或鎖定。
   - 當使用者查詢今年財報時，系統只需要拿「去年底的快照」加上「今年的變動明細」來計算即可，這也是大型 ERP 系統的標準作法。
