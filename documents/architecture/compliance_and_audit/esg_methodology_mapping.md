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
| `esgActivityType` | **[現有實作]** | 透過 AI 萃取並由決定論規則引擎驗證，最終由 `mission_board.sol` 智能合約錨定。 |
| `amount` * `factor` | **[現有實作]** | 由 TypeScript 管線執行精確計算，徹底廢除 AI 數學運算，並以 `Prisma.Decimal` 確保零誤差。 |

## 2. 係數庫維護政策 (Emission Factor Governance)

**[系統自動化實作]**：
`true_esg_coefficients.ts` 的管理是 ESG 審計的核心：
*   **歷史快照上鏈 (Snapshot Anchoring)**：不只在資料庫綁定 `coefficientId`，Worker 必須將「當下使用的碳排放係數數值」與計算結果一併寫入 IPFS (`resultCid`)。即使未來政府係數更新，鏈上的帳本依然具備完美溯及既往的密碼學驗證能力。

## 3. 物理質量守恆勾稽細則 (Mass Conservation Articulation)

**[系統自動化實作]**：
為防堵 AI 捏造與企業漂綠 (Greenwashing)，iSunFA 實施工業級的質量守恆審計：

*   **基本等式**：`期初庫存量 + 本期採購量 (依據憑證) = 本期投入製程量 (碳排消耗) + 期末庫存量`
*   **例外處理 (副產品/製程耗損)**：系統允許設定 `Loss Ratio`。若消耗量超出 `採購量 * (1 + Loss Ratio)`，Worker 的產出將無法獲得 `approveSubmission`，系統會直接阻斷結算並強制觸發 `mission_board.sol` 的**去中心化爭議仲裁 (Dispute Arbitration)**。
