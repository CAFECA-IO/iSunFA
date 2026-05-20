# 知識庫文章 04: 跨表指標引擎：破除微服務時代的「財務指標孤島」

> **Date**: 2026-05-20
> **Author**: Tzuhan
> **Category**: 數位審計知識庫 (Digital Audit Knowledge Base)
> **Tags**: `Metrics Orchestration`, `Decoupling`, `Division by Zero Guard`

## 1. 財務單表「不僭越原則」

在分散式的報表生成架構中，開發者常犯的一個致命錯誤是：**讓單一報表引擎為了迎合 UI 需求，而在內部「憑空通靈」其他報表的數據。**

以現金流量表引擎 (`cash_flow_statement_generator.ts`) 為例。若 UI 需要顯示「現金流量允當比率」，該引擎就必須知道「存貨變動」與「資本支出」。若這些資料不屬於該引擎的守備範圍，過去的做法可能會去隨便找個預設值，這就是非合規的技術債。

**iSunFA 的鐵律**：
單一報表引擎在遇到無法計算的跨表指標時，必須強制回傳 `null`。這項「不僭越原則」確保了底層加總引擎的絕對純潔性。

## 2. 高級指標的編排與解耦 (Metrics Orchestration)

為了解決這個問題，我們實作了高階編排層 `cross_report_metrics.ts` (`AnalysisService`)。

當系統需要計算綜合財務指標時：
1. **聚合數據**：編排層會先去拿取已經獨立配平的 `Balance Sheet` (取得期末流動負債、發行股本等存量數據)，以及 `Cash Flow Statement` (取得當期現金流絕對變動數)。
2. **密碼學級別的交叉相除**：在擁有兩表確信數據的前提下，進行交叉運算，產出真實的 `operatingCashFlowRatio`、現金再投資比率與無失真的 `EPS`。

這種架構優雅地解耦了單表職責，將「加總」與「比率分析」明確切分。

## 3. 除零陷阱與防禦 (Generics Division Guard)

在進行跨表指標相除時，系統必須面對極端的邊界條件。

- **零負債優質企業**：在計算流動比率 ($Current Ratio = \frac{Current Assets}{Current Liabilities}$) 時，若企業完全沒有流動負債，分母為 0。
- **無面額股票或未發行**：在計算 EPS 時，若總股本為 0。

若不加防護，這些相除將導致系統拋出 `Infinity` 或 `NaN` 崩潰，進而污染資料庫與前端。
在我們的跨表指標引擎中，實作了嚴格的整流防禦。在執行除法前，系統會攔截分母為零的狀況，安全地回傳 `null` 或字串 `"0"`，確保系統在任何極端財報下依然堅如磐石。
