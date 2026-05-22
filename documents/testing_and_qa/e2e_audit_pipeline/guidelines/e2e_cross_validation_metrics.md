# E2E 交叉驗證與審計指標指南 (Cross Validation Metrics Guide)

> **Date**: 2026-05-22
> **Author**: Tzuhan
> **Category**: 數位審計知識庫 (Digital Audit Knowledge Base)
> **Context**: 本指南詳述 iSunFA 系統在處理海量與極端資料時，如何透過四大審計維度確保財報與 ESG 數據的絕對正確性。本文件亦作為系統正確性與防禦能力的 Presales 展示基準。

---

## 1. 什麼是 Cross Validator？

`cross_validator.ts` 是 iSunFA E2E 測試管線的最終防線與驗收工具。

它並非簡單的單元測試，而是直接**調用系統最核心的報表引擎 (`src/lib/report/*`)**。在經過高強度的對抗式視覺干擾 (Adversarial Visual Red-Teaming) 與資料庫寫入後，Cross Validator 會將 DB 中的千萬筆明細動態聚合，並將產出的報表與原始真實財報 (Ground Truth) 進行「零誤差盲測對比」。

只有當系統成功抗住雜訊、正確隔離錯誤，並產出合規的財報時，該次壓力測試才算真正通過 (`PASSED`)。

---

## 2. 四大審計指標維度 (The 4 Audit Dimensions)

在每次執行 E2E 盲測後，終端機與 `audit_variance_report.json` 會印出四大維度的驗證結果。這是四大會計師 (Big 4) 查核等級的黃金防線：

### Dimension 1: 財務總量對齊 (Financial Variance)
此維度驗證 AI 萃取與後端運算後的財務數字，是否與原始財報相符。
- **驗證項目與合規標準**：
  - **營業收入 (Revenue) & 營業費用 (Operating Expenses)**：系統已實施 **零容忍 (Zero Tolerance)** 政策，要求 **絕對的 0 誤差**。過去為了包容 OCR 視覺雜訊所設定的 20% 容差率已廢除，無論測試規模多大，系統的加總必須與真實財報一毛不差。
  - **折舊 (Depreciation)**：由於是非現金調整分錄，系統要求 **絕對的 0 誤差** (`isPassed: systemDepreciation.equals(goldenDepreciation)`)，確保後端攤銷引擎不受前端雜訊影響。

### Dimension 2: 碳排總量對齊 (ESG Variance)
此維度驗證企業最關心的永續報告書數據，確保沒有發生漂綠 (Greenwashing) 或計算錯誤。
- **驗證項目**：Scope 1 (直接排放)、Scope 2 (間接能源排放)、Scope 3 (其他間接排放) 總噸數。
- **合規標準**：同步實施 **零容忍 (Zero Tolerance)** 政策。要求 AI 與後端雙軌攔截引擎精準對位，確保碳排引擎能在海量數據下 100% 精準對齊真實的碳盤查總量，不允許任何小數點流失。

### Dimension 3: 三表勾稽恆等式 (Internal Articulation)
> [!IMPORTANT]
> **這是財務系統不可妥協的鐵律。** 即使遭遇漏單或資料缺失，會計的複式簿記平衡也絕不能被打破。此維度要求 **絕對的 0 誤差**。

- **AccountingEquation (會計恆等式)**：要求資產負債表的 `資產 (Asset) = 負債 (Liability) + 權益 (Equity)`。
- **NetIncomeArticulation (淨利連動性)**：要求 `損益表 (IS) 的淨利` = `資產負債表 (BS) 的保留盈餘增加` = `現金流量表 (CF) 的營業活動淨利起點` 必須三方一致。
- **CashArticulation (現金連動性)**：要求 `現金流量表 (CF) 的期末現金` = `資產負債表 (BS) 的期末現金`。

### Dimension 4: 系統防禦與覆蓋率 (System Defense & Coverage) [🚧 開發中 WIP]
此維度驗證系統是否具備處理未知或異常資料的「防禦力」 (目前由 Julian 實作中)。
- **COA Coverage Rate (科目覆蓋率)**：驗證測試資料集是否涵蓋 `>= 50` 種不同的會計科目。防堵只測 Happy Path 的自欺欺人測試，確保邊界科目 (如 1410 預付費用、2310 預收貨款) 皆被嚴格檢驗。
- **Suspense Guard (懸記防護)**：驗證當系統遭遇「無法辨識之極端憑證」或「量綱不符之碳排數據」時，是否確實觸發黃燈警告，並將其打入 `1471(暫付款)` 或 `6288(虛擬隔離區)`，徹底防止淨利虛增或漂綠入庫。

---

## 3. 如何獨立執行與閱讀報告？

您可以隨時針對特定企業（如台積電 2330）獨立執行此審計工具：

```bash
npx tsx src/scripts/e2e-seeder/cross_validator.ts 2330
```

**報告判讀**：
執行完畢後，詳細的 JSON 報告會儲存於該企業的專屬目錄下：
`data/2330/outputs/phase5_articulation_test/audit_variance_report.json`

您可以透過檢查報告中的 `overallStatus` 來判定系統是否合規：
- `"PASSED"`：代表所有勾稽恆等式皆完美配平，且財務與 ESG 誤差落在容忍閥值內。
- `"FAILED"`：代表系統發生了會計法則破壞或過度嚴重的資料流失，需立即由架構師介入排查。
