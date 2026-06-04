# 🏭 CBAM (Carbon Border Adjustment Mechanism) 碳追溯全端生成架構解析

> **Date**: 2026-06-04
> **Author**: Tzuhan
> **Version**: 1.0
> **Scope**: `src/scripts/e2e-seeder/cbam/*`
> **Context**: 指引開發者理解 iSunFA 如何生成符合歐盟碳邊境調整機制 (CBAM) 的進階碳排履歷、生產耗能與海關報單資料。
> **Target Scenario**: 目前針對「2066 世德工業」進行高度產業特化開發，**戰略目標為以此作為 PoC，攻打並拿下「5007 三星科技」的 ESG 報告書及 DDP (Due Diligence Process, 供應鏈盡職調查) 專案。**

## 🎯 什麼是 CBAM Seeder？

為了支援歐盟 CBAM 的嚴苛規範，系統不能只有簡單的「年度碳排總量」。我們必須能夠追溯到具體產品的**前驅物 (Precursors)**、**工廠機台耗電 (MES Energy)**、**委外加工碳排 (Outsourced Processing)**，最終彙整至**海關出口報單 (Customs Declaration)**。

此模組透過對抗式 AI (Adversarial Generator) 動態生成極度擬真的供應鏈碳流動數據，為前端 CBAM 申報模組與盡職調查 (DDP) 提供深度的壓力測試資料庫。

---

## 📦 核心腳本與用途說明

### 1. `generate_bom_precursors.ts`
- **用途**：產生產品的物料清單 (BOM) 與 CBAM 定義的前驅物碳排。
- **機制**：針對金屬扣件 (如 SCM440 合金鋼) 自動產生化學元素佔比 (Fe, C, Cr)，並推算廢鋼回收比例。這不僅涵蓋了 CBAM 的直接排放，更深入上游原料供應鏈的範疇三 (Scope 3) 數據擬真。

### 2. `generate_mes_energy.ts`
- **用途**：模擬工廠 MES (製造執行系統) 的機台耗電與能耗分攤。
- **機制**：將總體電費與溫室氣體盤查量，精準分攤到特定產線與機台上（例如：熱處理爐、成型機），產出具備時間序列與產量關聯的製造能耗 (Scope 2) 數據，應付嚴格的產品碳足跡 (PCF) 稽核。

### 3. `generate_outsourced_processing.ts`
- **用途**：模擬委外加工廠的 Scope 3 碳排流轉。
- **機制**：金屬扣件常有委外表面處理（如電鍍、熱處理）。本腳本會結合 `company_persona.json` 中的供應商，生成委外加工的運送與製程碳排，補齊 CBAM 申報中最難追蹤的「間接排放」缺口。

### 4. `generate_export_customs.ts`
- **用途**：產生海關出口報單 (Export Customs Declaration)，對接 CBAM 申報量。
- **機制**：將上述所有產品碳排、重量、HS Code (海關稅則號別) 打包，生成可用於歐盟 CBAM 申報系統的擬真報單。這是驗證「申報量」與「底層盤查量」勾稽正確性的最終防線。

---

## ⚔️ 商業戰略與產業特化 (Domain-Specific Tuning)

### 攻打 5007 (三星科技) 的 DDP 戰略武器
本模組目前已針對 **2066 世德工業** (金屬扣件/車用零組件) 完成了深度產業特化：
- **行話注入**：AI 腳本內嵌了金屬表面處理的行話 (如：鍍鋅、達可銹 Dacromet、三價鉻鈍化)。
- **製程對齊**：針對扣件業特有的「成型 -> 輾牙 -> 熱處理 -> 表面處理」流程，完美模擬 MES 能耗與委外加工的碳排節點。

透過這套以 2066 為基底訓練出來的**「深度擬真金屬扣件供應鏈」**，iSunFA 具備了極具說服力的展示 (Demo) 能力。我們的戰略目標是拿著這套系統向 **5007 三星科技 (鋼鐵/扣件大廠)** 展示：我們不僅能做基本的 ESG 盤查，更能**一鍵打通從廠房機台 (MES) 到歐盟海關 (CBAM) 甚至供應鏈盡職調查 (DDP)** 的全數據鏈路，藉此強勢拿下其未來的 ESG 與 DDP 專案！

---

## 🚀 完整管線執行指令 (E2E Pipeline Execution)

如果要一次性生成針對特定企業 (如 2066 世德工業) 的完整 CBAM 與 DPP 模擬測試資料，請在專案根目錄執行以下串聯指令：

```bash
npx tsx src/scripts/e2e-seeder/cbam/generate_bom_precursors.ts 2066 && npx tsx src/scripts/e2e-seeder/dpp/generate_product_specs.ts 2066 && npx tsx src/scripts/e2e-seeder/cbam/generate_mes_energy.ts 2066 && npx tsx src/scripts/e2e-seeder/cbam/generate_outsourced_processing.ts 2066 && npx tsx src/scripts/e2e-seeder/cbam/generate_export_customs.ts 2066 && npx tsx src/scripts/e2e-seeder/dpp/generate_dpp_compliance.ts 2066 && npx tsx src/scripts/e2e-seeder/dpp/generate_dpp_ground_truth.ts 2066 && npx tsx src/scripts/e2e-seeder/dpp/render_dpp_pdf.ts 2066
```
