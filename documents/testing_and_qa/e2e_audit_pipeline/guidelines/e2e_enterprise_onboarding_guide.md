# 🚀 iSunFA E2E 系統企業導入指南 (Enterprise Onboarding & CLI Flags)

> **Date**: May 2026
> **Scope**: `src/scripts/e2e-seeder/*`
> **Info**: (20260505 - Tzuhan)

要為一家新公司（例如 `2454` 聯發科）啟用我們的 E2E 盲測系統，流程非常簡單，我們實作了高度自動化的約定優於配置 (Convention over Configuration) 架構。只需要在專案根目錄下建立 `data/[stock_id]/` 資料夾，並放入以下 **4 個核心基底檔案** 即可啟動整個巨獸：

## 📂 目錄結構與所需檔案

```text
data/[stock_id]/[year]/
├── inputs/
│   ├── golden_data/
│   │   ├── [year]_FIN_DATA.json     (1) 真實財務結構化數據 (Ground Truth)
│   │   └── [year]_ESG_METRICS.json  (2) 真實 ESG 結構化數據 (Ground Truth)
│   ├── raw_reports/
│   │   ├── [year]_FIN_REPORT.pdf    (3) 真實財務報告書 PDF
│   │   └── [year]_ESG_REPORT.pdf    (4) 真實永續報告書 PDF
│   └── simulated_data/
│       └── e2e_roadmap-sprint1/
│           ├── simulated_vouchers.json (5) 逆推產出的標準答案憑證
│           └── receipts/               (6) 依據憑證畫出的實體 SVG/PNG 圖檔
└── outputs/
    └── phase4_vision_test/
        ├── ai_extracted_context_cache.json (7) AI PDF 萃取出的供應商與比例快取
        └── audit_variance_report.json      (8) 最終配平驗證報告
```

### 🔍 檔案用途說明：

#### Inputs (輸入來源)
1. **(1) `[year]_FIN_DATA.json`**：
   - 包含該公司當年度公布的精確「營業收入」、「營業費用」、「折舊」等數字。`financial_reverse_engineer.ts` (Phase 2) 會以這些數字為天花板，融合 AI 讀出的供應商比例，**逆向推導切碎成數千至數萬張完美的模擬傳票 (Voucher)**。
2. **(2) `[year]_ESG_METRICS.json`**：
   - 包含官方公布的 Scope 1、Scope 2 等碳排總量。`esg_reverse_engineer.ts` (Phase 3) 會拿它來逆向推導每一張水電或公務車發票「應該帶有多少碳排與碳係數」。
3. **(3) & (4) 雙 PDF 報告**：
   - 這是餵給 `ai_vision_extractor.ts` (Phase 1) 的原料。系統會把這兩份幾百頁的 PDF 送進 Gemini 進行閱讀，萃取出這家公司真實的「主要供應商、水電比例、差旅比例、折舊攤銷策略」。
4. **(5) & (6) `simulated_data/`**：
   - 依據 Golden Data 逆推出來的模擬傳票 JSON 與對應的實體憑證影像。

#### Outputs (歷史紀錄與開發成果)
*   **`outputs/` 目錄**：裡面不同的資料夾代表的是我們**不同階段開發的結果與歷史紀錄**（例如：`phase4_vision_test/`、`e2e_roadmap-sprint1/` 等）。如果有些公司尚未進行到特定階段，不用刻意加入或補齊這些歷史資料夾。
*   **(7) `ai_extracted_context_cache.json`**：AI 模型從 PDF 抽取的供應商、客戶比例與關鍵資訊快取。
*   **(8) `audit_variance_report.json`**：最終端到端跑完後，系統產出的財報對齊度分析與差異報表。

---

## 🛠️ 管線執行與 CLI 開關 (Pipeline & Flags)

只要備齊這四個檔案，剩下的事情全部交給自動化腳本。

### 1. 完整測試管線 (The Full E2E Orchestrator)
```bash
npx tsx src/scripts/e2e-seeder/run_pipeline.ts [stock_id] [--clean] [--skip-images]
```
腳本就會自動完成：AI PDF 萃取 -> 財務逆向推導 -> ESG 逆向推導 -> 實體發票 SVG 繪製 -> AI OCR 辨識 -> JSON 報表結算與 AI 盲測。

**附加指令參數 (CLI Flags)**：
- `--clean`: **極度重要**。執行前會先清空該公司在 DB 裡的舊傳票與 ESG 紀錄。這確保了系統具備「冪等性 (Idempotency)」，防止反覆測試導致資料量越疊越高，造成財務數據成倍數虛增的「幽靈數據」現象。
- `--skip-images`: **開發加速器**。跳過第四階段的 `receipt_image_generator.ts`。因為產生上百張雜訊 SVG 圖片與寫入硬碟非常耗時，如果你只是修改了某些財務逆推邏輯，且確定圖片長相不需要更新，加上這個 Flag 可以省下大量時間。

---

## ⚡ 秒速核心引擎測試 (Fast Verify)

除了完整的 `run_pipeline.ts`，我們還設計了一支獨立的專用腳本：`fast_verify.ts`。

```bash
npx tsx src/scripts/e2e-seeder/fast_verify.ts [stock_id]
```

這支腳本是我們的**「核心運算引擎測試工具」**。它與 `run_pipeline.ts` 有著明確的分工：
- **使用時機**：當你只修改了**「核心運算引擎」**（例如：`balance_sheet_generator.ts`, `income_statement_generator.ts` 裡的加減乘除邏輯或會計科目歸類）。
- **優勢**：它完全跳過耗時 10 多分鐘且極其耗費 API Token 的「AI 圖片辨識階段 (Phase 2)」。它會直接拿 `simulated_vouchers.json` 這個標準答案，在 **0.1 秒內**強行寫入 Database 中，並立刻觸發 `cross_validator.ts` 計算最後誤差。

### 💡 開發黃金守則：
*   改了 **AI Prompts** 或 **發票圖片長相** ➡️ 跑 `run_pipeline.ts` (測試 AI 眼力)。
*   改了 **財報計算公式** 或 **會計科目邏輯** ➡️ 跑 `fast_verify.ts` (測試數學引擎的精準度)。

---

## 📈 漸進式財報配平壓力測試 (Progressive Verifier)

當需要跨年份、跨公司進行「極限壓力測試與絕對配平稽核」，或者模擬公司日復一日不斷湧入資料的情境，可以使用 `progressive_verifier.ts` 腳本：

```bash
npx tsx src/scripts/e2e-seeder/progressive_verifier.ts [days] [year] [stock_id]
```

- **[days]**: 模擬的天數（如 `365` 代表一整年，會自動產生 5 萬多筆虛擬資料）。
- **[year]**: 財報年份（預設 `2024`）。資料將輸出至 `data/[stock_id]/[year]/...`。
- **[stock_id]**: 股票代號（預設 `6642`）。

這支腳本會在每一筆憑證寫入時，嚴格斷言當下的三大表（BS, IS, CF）恆等式 (A = L + E)。搭配 `data/` 資料夾的水平擴充設計，您可以在不污染現有測試庫的情況下，自由生成各年度的測試資料。
