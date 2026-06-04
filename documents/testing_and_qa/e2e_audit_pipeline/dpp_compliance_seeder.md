# 🌍 DPP (Digital Product Passport) 全端生成架構解析

> **Date**: 2026-06-04
> **Author**: Tzuhan
> **Version**: 1.0
> **Scope**: `src/scripts/e2e-seeder/dpp/*`
> **Context**: 指引開發者理解 iSunFA 如何生成符合歐盟數位產品護照 (DPP) 要求的結構化與非結構化合規資料。
> **Target Scenario**: 目前針對「2066 世德工業」進行高度產業特化開發，**戰略目標為以此作為 PoC，攻打並拿下「5007 三星科技」的 ESG 報告書及 DDP (Due Diligence Process, 供應鏈盡職調查) 專案。**

## 🎯 什麼是 DPP Seeder？

歐盟的 DPP (Digital Product Passport) 規範遠遠超出了單純的碳排，它要求企業揭露高達 9 大面向的產品履歷，包含：循環經濟、耐用性、維修手冊、化學品合規等。同時，許多國際大廠也要求其供應鏈提供詳盡的 DDP (Due Diligence Process) 盡職調查報告。

為了解決系統在展示或壓力測試時缺乏此類資料的問題，我們擴充了 E2E Seeder，新增了多支強大的生成腳本，能從企業畫像 (`persona_generator.ts`) 出發，自動幻覺出 100% 符合 DPP 規範與供應鏈盡職調查要求的擬真合規文件。

---

## 📦 核心腳本與用途說明

### 1. `generate_dpp_ground_truth.ts` (新增)
- **用途**：負責產生 DPP 的真實標竿數據 (Ground Truth)。
- **機制**：建立一份基礎的黃金數據 (Golden Data)，定義產品的標準生命週期與各項基礎參數，作為後續生成詳細規格與宣告信的基石。這保證了在進行 AI 驗證盲測時有一致的正確答案。

### 2. `generate_product_specs.ts`
- **用途**：產生結構化的產品規格與生命週期指南 (`product_specs.json`)。
- **DPP 對應燈號**：`5. 耐用性與處置 (Durability)` 與 `6. 技術手冊 (Repair & Teardown)`。
- **機制**：AI 會針對每一款 SKU，推算其物理壽命 (Physical Lifespan)、操作限制，並寫明報廢時的回收指引（如：100% 廢鋼熔煉回收）與維修建議。

### 3. `generate_dpp_compliance.ts`
- **用途**：產生具有法律效力的正式宣告信 (Markdown 格式)。
- **DPP 對應燈號**：`6.1 維修拆解` 與 `9.3 有害化學物質 (PFAS/REACH/RoHS)`。
- **機制**：讀取企業畫像，填入真實公司名稱與地址。強制要求 AI 產出純淨的企業聲明（無對話、無佔位符），並透過**精確的 Markdown 標題設計 (如 `## 9.3 Hazardous Chemicals`)** 確保系統端的 AI 萃取引擎能 100% 準確抓取。

### 4. `render_dpp_pdf.ts` (新增)
- **用途**：將宣告信 Markdown 渲染為高質感的實體 PDF (`dpp_compliance_declaration.pdf`)。
- **機制**：為了進行對抗式視覺盲測 (Visual Red-Teaming)，系統不直接提供乾淨的 JSON 給驗證引擎，而是將文字渲染成逼真的 PDF 檔，藉此考驗底層 OCR 與語義理解引擎的能耐。

*(註：與 CBAM 相關的碳追溯腳本，如前驅物 BOM、MES 能耗等，已獨立移至 `cbam_compliance_seeder.md`)*

---

## ⚔️ 商業戰略：攻打 5007 (三星科技)

### 為什麼這套系統能贏下 DDP 專案？
目前的 Prompt 已經針對 **2066 (世德工業)** 的金屬扣件特性進行了高度的**「產業特化 (Domain-Specific Tuning)」**。例如：
- 腳本特別聲明「純機械金屬件，**不含電路圖與主機板**」。
- 要求 AI 使用金屬表面處理的行話（例如：**鍍鋅、達可銹 Dacromet、三價鉻鈍化**）。
- 產品維修策略被設定為「不可修復，牙紋損壞需直接替換」。

這使得產出的 PDF 看起來極度真實。透過這套以 2066 訓練出來的擬真引擎，我們能夠向同樣身為鋼鐵與扣件大廠的 **5007 三星科技** 證明：我們深諳該產業的供應鏈語言。我們不只能處理標準 ESG 報表，更擁有自動化梳理與生成繁瑣的 DDP (供應鏈盡職調查) 及 DPP 文件的頂級能力。

---

## 🔮 未來展望 (Future Work)：動態多模態生圖 (Text-to-Image)

目前的 `generate_dpp_compliance.ts` 雖然採用了「對抗式視覺注入」，但設計藍圖可能是靜態預先放入庫中的。未來若要在 E2E 管線中達到 **100% 動態全端生成**，我們計畫採取以下架構升級：
1. 讓腳本在執行時，動態讀取 `company_persona`（例如判斷是「金屬扣件」還是「電子主機板」）。
2. 即時呼叫 **DALL-E 3** 或 **Imagen 3** 等 Image Generation API。
3. 當場畫出一張與該產業完美吻合的工程藍圖/電路圖，並即時嵌入到 PDF 中。

這樣的多模態結合，將能讓 iSunFA 的 E2E 系統具備軟體測試界罕見的「視覺對抗自動化 (Automated Visual Red-Teaming)」能力。

---

## 🚀 完整管線執行指令 (E2E Pipeline Execution)

如果要一次性生成針對特定企業 (如 2066 世德工業) 的完整 CBAM 與 DPP 模擬測試資料，請在專案根目錄執行以下串聯指令：

```bash
npx tsx src/scripts/e2e-seeder/cbam/generate_bom_precursors.ts 2066 && npx tsx src/scripts/e2e-seeder/dpp/generate_product_specs.ts 2066 && npx tsx src/scripts/e2e-seeder/cbam/generate_mes_energy.ts 2066 && npx tsx src/scripts/e2e-seeder/cbam/generate_outsourced_processing.ts 2066 && npx tsx src/scripts/e2e-seeder/cbam/generate_export_customs.ts 2066 && npx tsx src/scripts/e2e-seeder/dpp/generate_dpp_compliance.ts 2066 && npx tsx src/scripts/e2e-seeder/dpp/generate_dpp_ground_truth.ts 2066 && npx tsx src/scripts/e2e-seeder/dpp/render_dpp_pdf.ts 2066
```
