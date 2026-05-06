# 🚀 iSunFA Architecture - Future Optimization Roadmap (Phase 5)

> **Date**: May 2026
> **Context**: Optimization opportunities and technical debt discovered during the Q2 E2E Pipeline Hardening.
> **Info**: (20260505 - Tzuhan)

## 🛠️ 下一步架構優化清單 (Future Optimizations)

我們在 Q2 雖然消滅了致命的財報 Bugs 並穩固了 E2E 管線，但在這場高強度的開發中，我們也碰到了 iSunFA 系統目前的「天花板」。以下是排入 Phase 5 的 5 大架構優化項目：

### 1. 突破 32-bit 整數限制 (Database Schema Evolution)

- **痛點**：千億級營收數字（如台積電），會導致資料庫原生的 32-bit `Int` 發生溢位 (Overflow)，導致我們目前必須在產生假資料時「手動把單筆大額傳票切碎 (Application-level Sharding)」。
- **解法**：全面檢視 Prisma Schema，將核心財務加總欄位從 `Int` 升級為 `BigInt`，或是比照 ESG 欄位全面過渡到 `Prisma.Decimal`，徹底解除金額上限的封印。
- **關鍵挑戰**：升級 `BigInt` 時必須實作全域的 JSON Serializer (如引入 `superjson`)，以解決前端 API `TypeError: Do not know how to serialize a BigInt` 的崩潰問題。

### 2. ESG 報告引擎合規性重構 (ESG Compliance & Precision)

- **痛點**：目前 `esg_report_generator.ts` 使用原生 `number` 計算小數，存在 IEEE 754 精度遺失風險；活動名稱的 `Base64` Hash 機制存在碰撞風險；且未排除除零錯誤掩蓋。
- **解法**：
  1. 引入 `decimal.js` 或是嚴格使用 `Prisma.Decimal` 重構加總與除法。
  2. 替換 `Buffer.from(id)` Base64 邏輯，改用 `uuid` 避免 React 渲染 Key 碰撞。
  3. 修正排放係數除以零的邏輯，遇 `0` 時回傳 `null` 防止漂綠風險。
  4. 移除 `SCOPE_1` 字串硬編碼，建立對應字典以支援 ISO 14064-1 類別擴充。

### 3. 管線非同步與隊列化 (Batch Queue Integration)

- **痛點**：目前的 E2E 腳本 (`phase2_runner.ts`) 雖然導入了 `p-limit` 防止 API 被鎖，但本質上還是一個同步的 `for` 迴圈。83 張圖若在第 80 張斷線，就需要全部重來。
- **解法**：將 E2E 測試腳本與真實系統後端的 `MissionExecutor` (Message Queue) 整合。導入真正的「斷點續傳」與「非同步併發能力」，讓測試環境的行為 100% 貼近真實生產環境。

### 4. 模組化快取機制 (Component-Level Caching)

- **痛點**：目前的 `--skip-images` 開關粒度太粗，導致開發或重新驗證時常常需要浪費大量時間。
- **解法**：針對產出的 `ai_extracted_context_cache.json` 建立一套 Hash 檢查機制。如果原始 PDF 沒變，就不重跑 Phase 1；如果財務 JSON 沒變，就不重跑 SVG 渲染。這將極大化開發與自動化測試的效率。

### 5. 面額機制的彈性化解耦 (Decoupling Par Value)

- **痛點**：在重構 `balance_sheet_generator.ts` 時，發現計算流通在外股數的邏輯寫死了 `const parValue = 10;`。
- **解法**：因應未來的彈性面額制度（或美股等海外市場無面額股票），必須將 `parValue` 從公司基本檔 (Company Profile) 動態傳入，取代 Hardcode。若為無面額股票，應有對應的 Fallback 處理邏輯。

---

## 🛑 E2E 測試管線的隱藏盲點 (Testing Blind Spots)

作為系統的架構守門員，我們在檢視測試腳本時，發現了目前 E2E 盲測架構的「取巧」之處。這些盲點若不解決，將導致我們在面對真實客戶時遭遇意想不到的衝擊。強烈建議在下一階段將這些測試盲點轉化為真實的壓力測試目標：

### 1. 傳票日期的「開外掛」作弊 (Date Extraction Override)
*   **盲點**：在 `phase2_runner.ts` 寫入資料庫時，我們並未使用 AI 萃取出的日期，而是直接拿 Ground Truth 的標準答案 (`new Date(groundTruthVoucher.tradingDate)`)。
*   **風險**：完全迴避了「日期辨識失敗」的風險。若真實財報中 AI 讀錯年份，傳票將跨期，導致該年度損益表與現金流量表嚴重失真。目前的 96.39% 準確率，其實建立在「日期絕對正確」的保護傘下。
*   **解法**：強制 AI 輸出 `tradingDate`，並移除程式碼中的 Ground Truth 覆寫，將日期辨識成功率納入真實的 E2E 評分標準。

### 2. ESG 100% 神話與「過度理想化」的格式 (Idealized ESG Prompt)
*   **盲點**：目前圖片產生器中，直接將碳排資訊寫為 `<text>本單據碳排量: 90.123 公噸 CO2e</text>`。這對 AI 而言毫無難度。
*   **風險**：真實世界的單據（如台電、中油發票）只會顯示「經常度數」或「公升數」。目前的 100% 零誤差僅證明了 Gemini 的「OCR 找字能力」，而非「推理換算能力」。
*   **解法**：重構 `receipt_image_generator.ts`，要求 AI 讀取原始度數/公升數，並透過 Prompt 注入碳排係數字典，測試 AI 的乘法推算能力，以貼近真實世界的碳盤查情境。

### 3. 20% 容錯率的會計審計不合理性 (Unrealistic Tolerance)
*   **盲點**：`cross_validator.ts` 設定了 20% 的誤差容忍度。
*   **風險**：在軟體工程壓力測試中，容忍 15% 雜訊帶來 20% 誤差是合理的。但從 CPA (會計師) 角度，營收或營業費用差 20% 已達到「重大性不實表達 (Material Misstatement)」標準，會被直接退件。
*   **解法**：在對外展演或報告中，必須明確標示此 20% 的 Threshold 為「系統崩潰邊界壓力測試評估」，而非「日常上線的允當標準」。真實上線環境的容忍度應無限趨近於 0%。
