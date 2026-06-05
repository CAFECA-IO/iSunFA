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

```bash
# 1. 讀取 PDF 進行視覺萃取 (快取至 ai_extracted_context_cache.json)
npx tsx src/scripts/e2e-seeder/ai_vision_extractor.ts 2066 2025

# 2. 根據萃取結果，產出完整的企業畫像 (company_persona.json)
npx tsx src/scripts/e2e-seeder/persona_generator.ts 2066 2025
```

---

## 步驟三：生成底層模擬數據 (Mock Sources)
這是系統的核心部分。系統會根據前一步的「企業畫像」，推算出符合歐盟法規的微觀數據（BOM表、產品規格、工廠耗能等）。這些推算結果都會儲存為結構化的 JSON，放在 `mock_sources` 資料夾中，供後續系統使用。

請依序執行以下指令：
```bash
# 生成 BOM 表與前驅物成分
npx tsx src/scripts/e2e-seeder/cbam/generate_bom_precursors.ts 2066 2025

# 生成產品規格與壽命
npx tsx src/scripts/e2e-seeder/dpp/generate_product_specs.ts 2066 2025

# 生成 MES 廠房耗能數據
npx tsx src/scripts/e2e-seeder/cbam/generate_mes_energy.ts 2066 2025

# 生成出貨物流資訊
npx tsx src/scripts/e2e-seeder/cbam/generate_outbound_logistics.ts 2066 2025

# 生成委外加工資訊 (視需求可選)
npx tsx src/scripts/e2e-seeder/cbam/generate_outsourced_processing.ts 2066 2025
```

---

## 步驟四：匯聚並渲染 Golden Data (System Ingestion)
最後一步，我們要讓 AI (Carbon Actuary / Auditor) 將剛才產生的所有 Mock Sources 匯聚起來，進行最後的 CBAM 碳排精算，並將最終的「標準答案 (Ground Truth)」渲染成能直接發布給終端客戶的 Battery Pass 風格 PDF。

```bash
# 1. 執行聚合運算，產出單一 SKU 的 Ground Truth JSON
npx tsx src/scripts/e2e-seeder/dpp/generate_dpp_ground_truth.ts 2066 2025

# 2. 將 Ground Truth JSON 無縫套版，渲染出最終的視覺化 PDF
npx tsx src/scripts/e2e-seeder/dpp/render_dpp_pdf.ts 2066 2025
```

🎉 **大功告成！**
完成以上步驟後，您就可以在 `data/2066/2025/outputs/e2e_roadmap-sprint1/` 裡面的各產品 `system_ingestion/` 資料夾中，找到隨時能拿去進行 PoC 展演的精美 PDF 數位產品護照與對應的合規資料了！
