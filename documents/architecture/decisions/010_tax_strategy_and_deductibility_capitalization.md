# ADR 010: 稅務策略與不可扣抵進項稅額資本化 (Tax Strategy & Non-Deductible Input Tax Capitalization)

> **Date**: 2026-05-27
> **Author**: Tzuhan (CPA Audit Review)
> **Status**: Accepted
> **核心目標**: 解決「境外電商逆向課稅 (Reverse Charge)」盲目認列進項稅額導致的逃漏稅風險，並實作基於費用語意的稅金資本化 (Tax Capitalization) 機制。

---

## 1. 當前架構挑戰與 CPA 盲點 (Context & Audit Findings)

在原本的 `TaxStrategyService` 實作中，系統只要偵測到 AWS、Adobe、Google 等境外 IT 服務，且廠商無台灣統編，即自動依據台灣稅法提列 5% 的「進項稅額 (Input Tax)」與「銷項稅額 (Output Tax)」以滿足逆向課稅 (Reverse Charge) 機制。

**致命的查帳盲點**：
根據台灣稅法規定，並非所有的進項稅額都具備「可扣抵 (Deductible)」資格。
如果該筆費用被認定為：
- **交際費 (Entertainment Expense)** (如：購買送客戶的數位訂閱)
- **職工福利 (Employee Benefits)** (如：提供給員工的娛樂軟體)
- 或是公司本身屬於「兼營免稅項目」之營業人 (如：投資公司)

依法，該 5% 的進項稅額是**不得扣抵**的。若系統無腦將其記入 `UniversalAccountTag.INPUT_TAX`（可扣抵），財報產出後將導致公司「虛報進項、逃漏稅」，面臨國稅局的高額罰鍰與補稅。

---

## 2. 決策與實作 (Decision & Implementation)

**決策：實作「語意感知的稅務策略 (Semantic-Aware Tax Strategy)」，針對不可扣抵費用強制執行稅金資本化 (Tax Capitalization)。**

在 `TaxStrategyService` 產生分錄前，必須執行以下驗證：
1. **抓取主費用語意**：過濾出傳票中金額最大的借方明細 (`primaryExpenseLine`)。
2. **判斷扣抵資格 (Deductibility)**：檢驗主費用的 `semanticCategory`。若其屬於法定的不可扣抵項目（例如 `ENTERTAINMENT_EXPENSE` 或 `EMPLOYEE_BENEFITS`），則 `isDeductible` 設為 `false`。
3. **資本化分錄 (Capitalization Entry)**：若不可扣抵，該 5% 稅金不得進入 `INPUT_TAX`，而是**直接資本化（Capitalize）或認列為當期費用**，其 `semanticCategory` 強制繼承主費用（例如：交際費）。
   - **分錄範例** (交際費 1000 元)：
     - `Dr. 交際費 (ENTERTAINMENT_EXPENSE) 1000` (主費用)
     - `Dr. 交際費 (ENTERTAINMENT_EXPENSE) 50` (不可扣抵之進項稅額，併入當期費用)
     - `Cr. 應付帳款 (ACCOUNTS_PAYABLE) 1000`
     - `Cr. 銷項稅額 (OUTPUT_TAX) 50`

---

## 3. 未來擴展路徑 (Upgrade Paths)

1. **兼營營業人 (Partially Exempt Entities)**：
   未來需於 `AccountBook` (帳本層級) 新增 `isPartiallyExempt` 的設定。對於兼營投資等免稅項目的公司，應依據當期「不得扣抵比例 (Non-deductible Ratio)」自動按比例將進項稅額拆分為「可扣抵」與「不可扣抵並資本化」兩筆明細。
2. **多國稅率策略擴充 (EU VAT Directive)**：
   目前歐洲區 (EU) 稅率高達 17%~27% 且極度複雜，已透過 `TaxStrategyService` 將其分流至 `applyEuStrategy` 並標記為需人工覆核 (Warning)。未來應串接歐洲 VAT Number Validation API，動態判斷 B2B (買方逆向課稅) 或 B2C (賣方代扣繳) 的正確稅務分錄。
