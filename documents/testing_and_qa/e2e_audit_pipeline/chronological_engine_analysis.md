# Chronological Reverse Engineer 核心引擎分析

> **Date**: 2026-06-08
> **Author**: Tzuhan
> **Version**: 1.0
> **Scope**: `src/scripts/e2e-seeder/chronological_reverse_engineer.ts`
> **Context**: 指引開發者理解 iSunFA 的 E2E 管線心臟：時序性逆推引擎，以及它如何將宏觀財報轉化為微觀傳票。

## 1. 腳本定位與文件對應

根據 `e2e_testing_architecture.md` 的記載，`chronological_reverse_engineer.ts` 被定義為 **E2E 管線的心臟** (時序性逆推引擎)。
它的核心職責是將「宏觀的真實財報數字 (Ground Truth)」，結合「微觀的工廠生產紀錄 (MES / Outsourced Logs)」，透過演算法逆推並打碎成「具備極高商業擬真度、且完美符合會計恆等式」的數萬張傳票，平均撒佈於 365 天中。

## 2. 核心架構與實作亮點 (Deep Dive)

### 2.1 跨年度推估與動態參數 (Cross-Year Extrapolation)
系統支援傳入動態的 CLI `year` 參數 (`process.argv[3]`)。這使得系統能夠完美配合「2066 世德工業」等專案進行特定年份（如 2025 年）的 PoC 展演。AI 會根據年份動態計算出精準的 `dayIndex`，讓產出的傳票具備正確的時序與推估邏輯。

### 2.2 物理與財務的深度綁定 (Physical-Financial Binding)
系統的生成邏輯具備極強的防漂綠能力。它不只是隨機產生財務數字，而是會精準讀取前一個步驟產生的 `mes_work_orders.csv` 與 `outsourced_processing_logs.csv`：
- **製造費用分攤**：系統會根據每天工廠實際耗用的 `EnergyConsumed_kWh` 推算電費，產生 `1310 在製品` 與 `2170 應付帳款 - 台電` 傳票。
- **原物料採購**：根據工廠每天投入的鋼材重量 (`InputWeight_kg`)，精準反推 `1301 進項原料` 採購，並且會從 BOM 表中抓取對應的供應商。
這實現了真正的「Bottom-Up 約束滿足」，所有的財務金流都是因為背後有實體的物理活動而產生。

### 2.3 ERP 級別單位與量綱 (Dimensional & Unit Mapping)
系統內建了 `getUnitForAccount` 字典，針對不同會計科目動態賦予 ERP 系統中常見的物理單位。例如：
- 電費與水費配上 `度`
- 鋼材原料配上 `KG`
- 銷貨配上 `PCS`
這極大程度增加了生成傳票的真實度，讓後續的 AI 視覺判讀與稽核面臨更刁鑽的量綱挑戰。

### 2.4 進階稅務與應計基礎結算 (Advanced VAT & Settlement)
- **加值型營業稅 (VAT)**：在 `pushToBuckets` 的核心分配中支援 `applyVat` 參數。系統會自動計算 5% 營業稅，拆分出 `1423 進項稅額` 或 `2214 銷項稅額`，並將含稅總額正確計入應收與應付帳款。
- **雙月營業稅結算**：在 365 天的分配迴圈末段，實作了每單數月 15 日 (`month % 2 !== 0 && dayOfMonth === 14`) 自動結清銷項與進項稅額，並透過 `1101 繳納營業稅` 或 `1424 留抵稅額` 完美配平的邏輯。
- **自動沖銷延遲 (Settlement Days)**：支援 30 天或 60 天的自動付款與收款傳票生成，完美還原了製造業「應計基礎 (Accrual Basis)」的金流閉環。

### 2.5 精確分配與漸進式配平斷言 (Exact Sum & Progressive Assertion)
這是維持黃金數據不崩潰的終極防線：
- 透過 `Prisma.Decimal` 的 `allocateExactAmounts` 演算法，確保無論千億級的財報被切碎成幾萬筆，最終加總絕對「毫無尾差」。
- 透過 `assertReportIntegrity` 每日嚴格檢驗 `A = L + E`，並且確保現金流量表期末餘額與資產負債表的現金科目 (`1101`等) 必須完美吻合。一旦配平失敗，系統會立即 Fail Fast，阻斷錯誤資料庫的生成。

## 3. 商業戰略價值

這份腳本是一個「高逼真度的 ERP 時光機」。
透過與 2066 世德工業的真實財報、以及金屬扣件業的專屬科目（如：內銷扣件批發、模具開發）相結合，這套管線產出的數據將是我們向四大會計師事務所 (Big 4) 或特斯拉核心供應鏈展示「AI 混合審計實力」的最強武器。
