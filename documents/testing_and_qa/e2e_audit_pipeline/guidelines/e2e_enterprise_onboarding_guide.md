# 🚀 iSunFA E2E 系統企業導入指南 (Enterprise Onboarding & CLI Flags)

> **Date**: May 2026
> **Scope**: `src/scripts/e2e-seeder/*`
> **Info**: (20260505 - Tzuhan)

要為一家新公司（例如 `2454` 聯發科）啟用我們的 E2E 盲測系統，流程非常簡單，我們實作了高度自動化的約定優於配置 (Convention over Configuration) 架構。只需要在專案根目錄下建立 `data/[stock_id]/` 資料夾，並放入以下 **4 個核心基底檔案** 即可啟動整個巨獸：

## 📂 目錄結構與所需檔案

```text
data/[stock_id]/
├── 2024_FIN_REPORT.pdf    (1) 真實財務報告書 PDF
├── 2024_ESG_REPORT.pdf    (2) 真實永續報告書 PDF
├── 2024_FIN_DATA.json     (3) 真實財務結構化數據 (Ground Truth)
└── 2024_ESG_METRICS.json  (4) 真實 ESG 結構化數據 (Ground Truth)
```

### 🔍 檔案用途說明：
1. **(1) & (2) 雙 PDF 報告**：
   - 這是餵給 `ai_vision_extractor.ts` (Phase 1) 的原料。系統會把這兩份幾百頁的 PDF 送進 Gemini 2.5 Flash 進行精準閱讀，讓 AI 萃取出這家公司真實的「主要供應商、水電比例、差旅比例、折舊攤銷策略」。
2. **(3) `2024_FIN_DATA.json`**：
   - 包含該公司當年度公布的精確「營業收入」、「營業費用」、「折舊」等數字。`financial_reverse_engineer.ts` (Phase 2) 會以這些數字為天花板，融合 AI 讀出的供應商比例，**逆向推導切碎成幾十張完美的模擬傳票 (Voucher)**。
3. **(4) `2024_ESG_METRICS.json`**：
   - 包含官方公布的 Scope 1、Scope 2 等碳排總量。`esg_reverse_engineer.ts` (Phase 3) 會拿它來逆向推導每一張水電或公務車發票「應該帶有多少碳排與碳係數」。

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
