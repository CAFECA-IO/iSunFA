# DPP 模擬器 (Simulator) 架構與相依性整理

> **Date**: 2026-06-12
> **Version**: 1.0
> **Scope**: `src/app/(landing)/digital_product_passport_simulator` & `src/scripts/e2e_seeder`

這份文件為你整理了目前 `/digital_product_passport_simulator` 的運作邏輯，包含資料夾結構、產生的檔案對應的腳本、前端的互動機制，以及重複生成與刪除的處理方式。

---

## 1. 資料結構與產生器對應 (Data & Generators)

所有的模擬資料都會統一儲存在專案根目錄的 `data/{stockId}/{year}/` 之下。產生資料的腳本皆位於 `src/scripts/e2e_seeder/`。

### 🏢 企業基線資料 (Phase 1: Baseline)
這是整間公司共用的基礎資料，由真實世界的財報與永續報告書萃取而來。

| 檔案路徑 (相對於 `data/{stockId}/{year}/`) | 檔案說明 | 負責產生的腳本 | 觸發步驟 |
| :--- | :--- | :--- | :--- |
| `inputs/raw_reports/{year}_FIN_REPORT.pdf` | 真實世界的企業財務報告書 | `auto_download.ts` | Step 1 |
| `inputs/raw_reports/{year}_ESG_REPORT.pdf` | 真實世界的企業永續報告書 | `auto_download.ts` | Step 2 |
| `outputs/ai_extracted_context_cache.json` | AI 擷取的圖表與跨年推估快取 | `ai_vision_extractor.ts` | Step 3 |
| `outputs/{stockId}_company_persona.html` | 企業 AI 畫像與評估總結 | `persona_generator.ts` | Step 4 |

### 📦 產品專屬資料 (Phase 2 & 3: Product DPP)
這部分是針對單一產品 SKU 所生成的數位產品護照 (DPP) 資料。

| 檔案路徑 (相對於 `data/{stockId}/{year}/`) | 檔案說明 | 負責產生的腳本 | 觸發步驟 |
| :--- | :--- | :--- | :--- |
| `outputs/mock_sources/boms_and_precursors.json` | 企業產品目錄、BOM 表與供應鏈前驅物 | `cbam/generate_bom_precursors.ts` | Step 5 |
| `outputs/{productId}/mock_sources/{productId}_product_specs.json` | 單一產品的詳細規格與 LCA 參數 | `dpp/generate_product_specs.ts` | Step 6 |
| `outputs/{productId}/mock_sources/fastener_blueprint.png` | Imagen 4.0 生成的產品設計圖 | `dpp/generate_product_image.ts` | Step 7 |
| `outputs/{productId}/mock_sources/{productId}_dpp_ground_truth.json` | DPP 核心真實演算數據 | `dpp/generate_dpp_ground_truth.ts` | Step 8 |
| `outputs/{productId}/mock_sources/{productId}_dpp_compliance_declaration.md` | DPP 合規與驗證宣告書 | `dpp/generate_dpp_compliance.ts` | Step 9 |

---

## 2. UI 互動與相依性邏輯

前端 UI (`src/app/(landing)/digital_product_passport_simulator`) 扮演了「指揮中心」的角色：

- **/list (列表頁)**:
  - **狀態偵測**: 它透過 API 掃描 `data/` 資料夾，直接檢查上述的 PDF、JSON、HTML 檔案「是否存在」，來決定每個企業目前的進度標籤 (Progress Badges)。
- **/start (控制中心)**:
  - **執行流**: 透過 Server-Sent Events (SSE) 呼叫 `/api/v1/.../generate` API。
  - **解耦執行**: 透過 `spawn` 啟動上述的 `e2e_seeder` TypeScript 腳本。腳本之間透過讀寫 `data/` 裡的檔案來傳遞上下文 (Context)，彼此互不綁死。

---

## 3. 重複生成 (Duplication) 怎麼處理？

**不會產生重複的檔案 (例如 `file(1).json`)，而是採用「覆蓋寫入 (Overwrite)」機制。**

1. **固定命名規則**: 所有的檔案命名都是 Deterministic (確定性的)，例如 `${year}_FIN_REPORT.pdf` 或 `${productId}_product_specs.json`。
2. **精細的 `mode` 控制**: `/generate` API 支援 `mode` 參數（例如 `persona_only`, `product_image_only` 等）。
   - 如果你在 UI 上點擊特定區塊的「重新生成 (Regenerate)」，API 會跳過前面的下載與分析步驟，直接執行該步驟對應的腳本。
   - 腳本執行後，會直接**覆蓋**原有的同名檔案，保持系統乾淨。

---

## 4. 刪除機制 (Deletion)

**系統有提供完整的刪除功能。**

- **如何觸發**: 在 `/list` 頁面中，點擊某個企業卡片右上角的「三個點 (MoreVertical)」，下拉選單中會出現紅色的 **「刪除 (Delete)」** 按鈕。
- **後台處理**: 呼叫 `DELETE` API 後，後端會執行兩件事：
  1. **檔案刪除**: 使用 `fs.rmSync(targetDir, { recursive: true, force: true })`，將 `data/{stockId}/{year}` 整包資料夾無情且乾淨地刪除。
  2. **資料庫清理**: 清除資料庫 (`reportDownloadTaskRepo`) 中關於該次 PDF 下載的狀態紀錄，避免產生幽靈資料。
