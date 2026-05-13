# 🌍 iSunFA 溫室氣體核算方法論與國際準則對照表

> **Date**: 2026-05-10
> **Author**: Tzuhan

> **Document Status**: Draft (For ESG Audit & ISSB Review)
> **Standards**: GHG Protocol, IFRS S2, GRI 305

本文件詳細闡述 iSunFA 從財務傳票萃取碳排數據後，如何對齊國際 ESG 揭露準則，確保碳排核算（Carbon Accounting）的審計防禦力。

## 1. 國際準則對應 (Standard Mapping)

iSunFA 的 `esgRecord` 資料結構直接對應國際準則之揭露要求：

| iSunFA 欄位 | 系統狀態 | 說明 |
| :--- | :--- | :--- |
| `tradingDate` | **[現有實作]** | 確保碳排歸屬於正確的財務年度。 |
| `esgActivityType` | **[現有實作]** | 透過 AI 萃取並由人力確認分類。 |
| `amount` * `factor` | **[即將實作 (Sprint 1)]** | 將由 Stage 2 管線執行精確計算 (配合 Vector Search)，徹底廢除 AI 數學運算。 |

## 2. 係數庫維護政策 (Emission Factor Governance)

**[即將實作 (Sprint 2)]**：
`true_esg_coefficients.ts` 的管理是 ESG 審計的核心：
*   **版本控制 (Versioning)**：系統資料庫必須綁定 `coefficientId` 與 `versionYear`，即使未來係數更新，過去的計算結果也絕對不可被覆蓋或溯及既往。

## 3. 物理質量守恆勾稽細則 (Mass Conservation Articulation)

**[即將實作 (Sprint 2)]**：
為防堵 AI 捏造與企業漂綠 (Greenwashing)，iSunFA 計畫實施工業級的質量守恆審計：

*   **基本等式**：`期初庫存量 + 本期採購量 (依據憑證) = 本期投入製程量 (碳排消耗) + 期末庫存量`
*   **例外處理 (副產品/製程耗損)**：系統允許設定 `Loss Ratio`。若消耗量超出 `採購量 * (1 + Loss Ratio)`，系統將觸發 ITAC 中的「重大異常凍結」。
