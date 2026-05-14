# 實作與技術債：04. 報表生成與 AI 健檢 (Report Generation & Analysis)

> **Date**: 2026-05-10
> **Author**: Tzuhan

> **CPA 查核視角 (Audit Lens)**：
> 此階段是系統的心臟。無論是對外產出的即時財報，還是交由 AI 生成的分析報告，其數據來源都必須建立在「絕對真理」之上，也就是資料庫中 `isVerified: true` 的不可竄改憑證。

## 1. 模組實作現況 (Current Implementation)

此階段實作架構完整定義於 `documents/architecture/report_and_analysis_architecture.md`，可分為兩條並行的資料流：

### 1.1 即時財報與儀表板 (內部報表引擎)
- **定位**：這就是系統的「骨幹」。這裡完全沒有 AI 的介入，只有 0 誤差的數學恆等式。
- **處理邏輯**：當使用者檢視財報時，Next.js API 直接向資料庫請求 `isVerified: true` 且 `deletedAt: null` 的明細資料，交由 `src/lib/report/*` 核心引擎根據「借貸法則」動態加總抵銷，產出結構化的 JSON (如 `IIncomeStatement`) 供前端渲染。
- **✅ 高精度計算防護 (Precision Engine)**：底層全數改採 `BigInt` 與 `MoneyUtil` (Anti-Corruption Layer) 計算。徹底消滅了 JavaScript `Number` 運算時的浮點數漂移誤差，並實作了動態面額解耦 (Dynamic Par Value) 以及高精度 `safeRatio`，達成 0 誤差的報表產出。

### 1.2 AI 深度分析與碳健檢模組 (靜態快照報表)
- **定位**：將 AI 限制為「分析師與閱讀者 (Analyst)」。
- **處理邏輯**：當使用者選擇生成分析時，系統後端微服務 (`analysis.service.ts`) 會呼叫核心報表引擎算出總和。接著，將這些**已經結算完畢且 100% 正確**的財報與碳排總表，作為 Context 餵給 Gemini 2.5，要求 AI 根據數據撰寫「健檢報告」。

## 2. 存在之技術債與架構地雷 (Technical Debts & Gotchas)

目前在核心報表層 (`src/lib/report/*`) 的設計非常穩固，完美遵守了我們 Roadmap v2 中「零捏造」的雙軌防禦思維。沒有明顯的底層架構瑕疵，這是一道非常漂亮的防火牆！

唯一的潛在風險與技術債在於**大數據量下的記憶體耗盡 (OOM) 地雷**：
- 目前所有的加總與抵銷都是「動態 (On-the-fly)」由 Node.js 執行。當一間企業（如台積電）有數十萬筆以上的傳票時，如果每次開網頁都要把 50 萬筆 `BigInt` 撈進 Node.js 的記憶體重算一遍，系統會立刻因為 Out Of Memory (OOM) 或運算超時而崩潰。

## 3. Deloitte 級別重構目標 (Refactoring Towards Audit-Ready)

為扛住政府級與千億級企業的帳務，必須將 Roadmap V2 規劃的快照機制提前至 Sprint 1 作為核心基礎設施：
1. **日結餘 / 月結餘 快照機制 (Daily/Monthly Snapshot Rollups)**：
   - 不應該每次都從歷史第一筆開始算起。必須實作結帳機制，每個月底固定結算出「期末餘額表 (Trial Balance)」，將其雜湊上鏈或鎖定。
   - 報表計算公式必須徹底改為：`本期報表 = 上期快照 (Opening Balance) + 本期變動明細 (Period Delta)`。
2. **🛡️ 精度防護：全面導入防腐層 (MoneyUtil Anti-Corruption Layer)**：
   - 當從資料庫讀出百萬筆以 `BigInt` 儲存的傳票進行聚合計算，或處理包含 `Decimal` 的複雜比率（如 `safeRatio`、稅率計算）時，嚴禁依賴原生 JavaScript `Number` 或純粹的 `BigInt`。
   - 所有報表引擎的底層聚合運算，必須無條件交由基於 `Decimal.js` 的 `MoneyUtil` 來處理。
   - 這層防腐層（Anti-Corruption Layer）不僅能安全地處理不同型別的跨界計算，還能在最終透過 API 拋轉給前端時，確保數值被安全地處理，徹底阻絕浮點數截斷，並確保前端畫面渲染的 100% 精準。
