# iSunFA 終極資料工廠：端到端 (E2E) 執行指南

這份文件將引導您完成從 **下載真實財報與 ESG 報告**，到利用 AI 生成 **Mock Sources (模擬數據)**，最終產出 **System Ingestion (黃金標準資料與精美 PDF 護照)** 的完整流程。

---

## 步驟零：環境準備 (啟動資料庫)
因為我們的腳本會需要連接資料庫來核對公司代號是否建檔，並建立下載任務 (Task Queue)，所以在執行任何指令前，**請務必確認您的 Docker 已經開啟，並且資料庫正在運行中**。

```bash
# 啟動包含 Postgres 在內的開發環境容器
docker compose up -d
```

---

## 步驟一：下載真實世界報告 (Raw Reports)
請使用 `auto_download.ts` 腳本。它會自動幫指定年份與公司建立排程，並在背景喚醒 Worker 去「公開資訊觀測站 (TWSE)」下載真實的財報與 ESG 報告 PDF 檔。

> [!IMPORTANT]
> 請使用具名的參數 flag，**不要直接將數字寫在後方**。

```bash
# 以 2066 世德工業、2025 年份為例：
npx tsx scripts/auto_download.ts --stockId=2066 --year=2025
```
*(執行完畢後，您會在 `data/2066/2025/inputs/raw_reports/` 中看到下載下來的 PDF 檔案。)*

---

## 步驟二：萃取企業真實特徵 (Context & Persona)
有了真實的 PDF 報告後，我們需要喚醒 Gemini Vision API 去閱讀這些萬字報告，並精煉出該企業的「真實營運特徵 (如碳排源、供應鏈)」，最終建立專屬的企業畫像。

> [!NOTE]
> **跨年度推估機制 (Cross-Year Extrapolation)**：如果當年度 (例如 2025) 的 ESG 報告尚未出爐，系統會自動向前回溯尋找 2024 年的報告，並透過總體經濟專家 (Macroeconomic Forecaster) 結合通膨與電價漲幅，自動為您「推估出」2025 年極度擬真的企業畫像！

```bash
# 1. 讀取 PDF 進行視覺萃取 (快取至 ai_extracted_context_cache.json)
npx tsx src/scripts/e2e-seeder/ai_vision_extractor.ts 2066 2025

# 2. 根據萃取結果，產出完整的企業畫像 (company_persona.json)
npx tsx src/scripts/e2e-seeder/persona_generator.ts 2066 2025
```

---

## 步驟三：生成微觀實體數據與數位產品護照 (DPP)
這是系統的核心部分。系統會根據前一步的「企業畫像」，推算出符合歐盟法規的微觀數據（BOM表、產品規格、工廠耗能等），並且為三大核心產品生成數位產品護照 (DPP)。

請依序執行以下指令：
```bash
# 1. 生成 BOM 表與前驅物成分
npx tsx src/scripts/e2e-seeder/cbam/generate_bom_precursors.ts 2066 2024

# 2. 生成產品規格與壽命 (DPP 核心屬性)
npx tsx src/scripts/e2e-seeder/dpp/generate_product_specs.ts 2066 2024

# 3. 執行聚合運算，產出三大核心產品的 DPP Ground Truth JSON
npx tsx src/scripts/e2e-seeder/dpp/generate_dpp_ground_truth.ts 2066 2024

# 生成委外加工資訊 (視需求可選)
npx tsx src/scripts/e2e-seeder/cbam/generate_outsourced_processing.ts 2066 2025

# 生成出口海關報單與物流資訊
npx tsx src/scripts/e2e-seeder/cbam/generate_export_customs.ts 2066 2025

# 生成 DPP 合規宣告信
npx tsx src/scripts/e2e-seeder/dpp/generate_dpp_compliance.ts 2066 2025
# 4. 將 Ground Truth JSON 無縫套版，渲染出最終的視覺化 PDF (DPP 證書)
npx tsx src/scripts/e2e-seeder/dpp/render_dpp_pdf.ts 2066 2024
```

---

## 步驟四：生成工廠活動日誌與出貨紀錄
為了進行最終的碳盤查勾稽，我們需要模擬工廠內的實體生產活動與用電紀錄。

```bash
# 1. 生成 MES 廠房耗能與生產紀錄 (控制產量與財報營收匹配)
npx tsx src/scripts/e2e-seeder/cbam/generate_mes_energy.ts 2066 2024

# 2. 生成委外加工資訊 (電鍍、熱處理等 Scope 3 紀錄)
npx tsx src/scripts/e2e-seeder/cbam/generate_outsourced_processing.ts 2066 2024

# 3. 生成出貨報關與物流資訊 (海關提單)
npx tsx src/scripts/e2e-seeder/cbam/generate_outbound_logistics.ts 2066 2024
```

---

## 步驟五：生成一整年的總帳傳票 (Vouchers)
在所有的物理與生產紀錄都就緒後，我們要讓 AI (Carbon Actuary / Auditor) 進行「Bottom-Up 約束滿足」運算，生成一整年完美的財務傳票。這些傳票的總額會 100% 貼合公開財報，且明確指向前述的物理用電與採購。

```bash
# 產出一整年 (365天) 完美配平的財務傳票
npx tsx src/scripts/e2e-seeder/chronological_reverse_engineer.ts 2066 2024 365
```

---

## 步驟六：CBAM 實體與財務勾稽報告
最後一步，系統會以「傳票 (Vouchers) 作為唯一的信任基礎 (Single Source of Truth)」，讀取剛才生成的傳票，反推回去計算物理活動量與碳排放，並生成最終的 CBAM 碳盤查與財務勾稽報告。

```bash
# 執行勾稽，產出防漂綠的 CBAM 報告
npx tsx src/scripts/e2e-seeder/cbam/cbam_generator.ts 2066 2024
```

---

🎉 **大功告成！**
完成以上步驟後，您就可以在 `data/2066/2024/outputs/e2e_roadmap-sprint1/` 中找到：
1. 三大核心產品的精美 PDF 數位產品護照 (DPP)
2. 數萬筆與實體綁定的完美總帳傳票 (`simulated_vouchers.json`)
3. 基於傳票金額反推而成的防漂綠 CBAM 勾稽報告
