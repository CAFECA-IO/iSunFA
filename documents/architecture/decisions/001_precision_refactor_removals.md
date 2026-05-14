# 架構決策紀錄 (ADR) 001: The Great Purge (精準度架構重構與拔除)

> **Date**: 2026-05-14
> **Author**: Tzuhan
> **Replaced**: `documents/architecture/epics/precision_frontend_refactor.md`
> **Status**: Active (進行中)
> **Branch**: `epic/precision-frontend-refactor`
> **Context**: 在 V2 藍圖的推進中，為了確保系統具備 Big 4 (四大會計師事務所) 級別的確定性 (Determinism) 與防禦深度，工程團隊與 AI 協作執行了史詩級的「減法工程 (The Great Purge)」。本文件記錄了在這個分支中被徹底拔除的歷史包袱，以及其背後的架構決策脈絡。

---

## 📊 重點拔除項目總覽表 (Summary of Removals)

| 拔除項目 (Purged Target)          | 原始架構痛點與風險 (Pain Points & Risks)                                    | 替代升級方案 (Architectural Upgrade)                                                    |
| :-------------------------------- | :-------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------- |
| **1. AI 數學與邏輯權限**          | AI 執行匯率轉換與碳排計算極易產生「計算幻覺」，導致報表失真。               | 全面移交由 TypeScript + `Prisma.Decimal` 與後端匯率表進行絕對確定性運算。               |
| **2. 全域會計科目暴力注入**       | 將數千筆會計科目塞入 Prompt 會導致嚴重的 Token 浪費與 Context Window 溢出。 | 實作後端 `mapAccountingCode` 模糊比對，AI 僅需輸出自然語言科目名稱。                    |
| **3. 全域碳排係數暴力注入**       | 把整個 ESG 係數資料庫餵給 AI 會嚴重拖慢推論速度且命中率低下。               | 廢除全域暴力注入，改由外部依據企業情境 (Context) 傳入縮減版係數清單。                   |
| **4. JSON Regex 容錯擷取**        | 使用 `/\{[\s\S]*\}/` 容易因為 Markdown 標籤變動導致 Parse 失敗或靜默遺失。  | 強制啟用 Gemini `responseSchema` 與 `application/json`，由 API 守護回傳結構。           |
| **5. Prompt 冗餘 JSON 範例**      | 將範例寫在 Prompt 會消耗海量 Token 且引發「範例偏誤」照抄幻覺。             | 抽離至 `src/validators/ai_responses.ts` (Zod Schema)，單張憑證大幅節省約 1,500 Tokens。 |
| **6. 寫死的每股面額 (Par Value)** | 全域硬編碼面額 `10` 無法支援多元企業股權與海外新創的財報計算。              | 實作動態面額 (Dynamic Par Value) 關聯至帳本設定，動態生成高精準度的 EPS。               |
| **7. 前端 Base64 肥大傳輸**       | AI 諮詢直接上傳 Base64 會導致 API Payload 暴增、阻塞頻寬且易遭 WAF 攔截。   | 前端僅傳遞 Laria IPFS `cid`，由後端非同步 Worker 自行取回真實影像。                     |

---

## 🔍 詳細決策脈絡與實作細節

### 1. 拔除 AI 數學計算權 (Removed AI Arithmetic & Logic)

- **歷史包袱**：早期為了快速驗證，依賴 AI 在 Prompt 內直接計算總金額、外幣匯兌，以及溫室氣體活動數據乘以排放係數。
- **決策考量**：大型語言模型本質為機率預測，無算術邏輯單元 (ALU)。面對大量浮點數，高機率出現細微尾數誤差。這在 Big 4 等級的審計標準中是絕對零容忍的。
- **實作結果**：
  - 在 `journal.ts`、`esg.ts` 中明文加入指令 `[CRITICAL STRICT RULES] 絕對禁止計算`。
  - 資料庫 Schema 擴充了 `originalAmount`, `currency` 與 `exchangeRate`。
  - 將核心計算邏輯完全下放給高精度數值層 (`Prisma.Decimal`) 處理。

### 2. 拔除全域會計科目暴力注入 (Removed Global Account Code Injection)

- **歷史包袱**：過去為了讓 AI 填寫正確的會計科目，會在 Prompt 中塞入一整份多達數百上千筆的會計科目對照表 (Chart of Accounts)。
- **決策考量**：
  - 超巨大的 Context 會迅速吃乾 Token 上限並導致延遲飆高。
  - AI 的注意力機制無法有效在大海撈針，經常發生「張冠李戴」的幻覺。
- **實作結果**：
  - 廢除 Prompt 內的科目總表注入。
  - 後端實作 `mapAccountingCode`，採用自然語言與字串模糊比對 (Fuzzy Matching)。AI 僅需輸出它理解的自然語言摘要 (Particulars) 或粗略科目，再由後端映射回精準的代碼。
  - **節省效益**：單張憑證省下約 **~5,500 Tokens** 的無效傳輸，大幅提升分析速度與降低 Attention Dilution。

### 3. 拔除全域碳排係數暴力注入 (Removed Global Coefficients Injection)

- **歷史包袱**：與會計科目類似，早期直接將系統內所有的 ESG 排放係數 (Coefficients) 整個 JSON 灌給 AI 讓它挑選。
- **決策考量**：碳排係數資料庫極其龐大，將其餵給 AI 除了浪費成本，也會讓 AI 無法準確判定 `Scope` 與係數的對應關係。
- **實作結果**：
  - 將全域係數注入改為完全交由後端去查表配對 (Deterministic Logic)。
  - **節省效益**：單張憑證暴減 **~100,000 Tokens**！這兩項暴力注入的拔除，在規模化運算下 (每月一萬張憑證) 可為企業省下**突破 10 億 Tokens** 的 API 成本，是降本增效最關鍵的架構升級。

### 4. 拔除 JSON Regex Fallback (Removed Regex Extraction)

- **歷史包袱**：在 `mission.executor.service.ts`、`document_pre_check.ts` 與 `ai_consulting.ts` 中，使用 `match(/\{[\s\S]*\}/)` 來強行從充滿雜訊的回覆中挖出 JSON 字串。
- **決策考量**：這是開發初期的妥協方案。這種做法等於是在縱容 AI 胡言亂語，而且當 AI 輸出多層巢狀或包裹多餘反引號時必定崩潰。
- **實作結果**：
  - 徹底移除 Regex Fallback 邏輯。
  - 將所有 Gemini API 呼叫點改為 `isJson: true` 並帶入強型別 Schema，失敗則直接觸發系統 Retry 機制進入 DLQ，保障入庫資料的絕對純淨。

### 5. 拔除 Prompt 冗餘指令 (Removed Prompt JSON Schema Boilerplate)

- **歷史包袱**：各個系統提示詞 (Prompt) 皆掛載了巨大的範例 JSON，例如 `esg.ts` 中長達 13 個欄位的深層 JSON 結構範例。
- **決策考量**：
  - **成本高昂**：龐大的 JSON 範例白白消耗數千個 Tokens。
  - **認知干擾**：AI 的 Attention 機制很容易過度關注範例中的數值（例如範例寫 `vendor: 中華電信`，AI 就容易憑空捏造中華電信）。
- **實作結果**：
  - 建立 `src/validators/ai_responses.ts` 集中管理 Zod Schemas。
  - 徹底將 Prompt 中的格式規定刪除，將 AI 的大腦專注於「理解語意」與「判讀影像」，將「格式排版」交給 API 底層協定處理。

### 6. 拔除寫死的票面金額 (Removed Hardcoded Par Value)

- **歷史包袱**：過往在 `balance_sheet_generator.ts` 中，EPS 計算皆將每股面額直接寫死為 `10`。
- **決策考量**：隨著 iSunFA 推向更廣泛的企業用戶，不同國家法規或特定新創公司可能採用 `1` 或無面額股制度，硬編碼將使得報表失真。
- **實作結果**：
  - 帳本基底介面導入了動態面額配置，報表引擎升級支援高精度動態 EPS 運算，確保會計原理與真實情況相符。

### 7. 拔除前端 Base64 肥大傳輸 (Removed Frontend Base64 Image Uploads)

- **歷史包袱**：AI 諮詢服務允許使用者提問並附帶圖片，早期前端將圖片轉為 Base64 直接隨附在 POST payload 中傳給後端 API。
- **決策考量**：此做法在大型高畫素圖檔下，將嚴重阻塞 API 閘道器，導致傳輸逾時。
- **實作結果**：
  - 前端僅將檔案的 Hash (`cid`) 傳送給後端。
  - 後端 `AiConsultingSkill` 被喚醒時，才非同步地透過 `storageService.recoverLaria(cid)` 向 IPFS 調用影像資源，極大化 API 響應速度。

---

## 💣 潛在架構地雷與後續防護指南 (Known Landmines & Mitigations)

在本次（The Great Purge）拔除大量寬鬆的妥協機制後，系統進入了「極度要求精準」的狀態。這無可避免地引入了新的系統脆弱性（Trade-offs），以下是團隊後續必須排入 Sprint 優先處理的四大防護缺口：

### 1. 極度嚴苛的資料庫防線 (Database Boundary Guard)
- **地雷風險**：`prisma.ts` 內的 Middleware 已強制鎖死 `amount` 等欄位，若新 API 或第三方串接傳入原生 `number`，將瞬間導致 DB 寫入崩潰 (Crash)。
- **拆彈指南**：強制要求所有開發者閱讀 `numerical_precision_guideline.md`，並規定任何數值運算必須使用 `MoneyUtil` 過水處理。

### 2. 拔除 Regex 帶來的「零容錯」AI 解析
- **地雷風險**：由於全面棄用 `/\{[\s\S]*\}/` Regex 備案並依賴 Gemini 的 `responseSchema`，若未來模型更新導致對 Structured Outputs 的支援度下降，或切換到非支援模型，系統將完全喪失容錯擷取能力。
- **拆彈指南**：嚴格鎖定具備原生 JSON Schema 支援的模型版本（如 Gemini 1.5 Pro/Flash），並透過 E2E 盲測腳本監控解析失敗率。

### 3. 確定性攔截 (Golden Vendor Mapping) 的字串脆弱性
- **地雷風險**：目前 `VENDOR_RULE_REGISTRY` 依賴單純的字串比對 (`includes`)。若 AI 將「中華電信股份有限公司」萃取為簡寫「中華電信」或英文「Chunghwa Telecom」，攔截將失效並落入 AI 幻覺手中。
- **拆彈指南**：在下一個 Sprint 應將註冊表升級為支援「別名陣列 (Aliases Array)」，或導入 `pgvector` 等輕量級 Embedding 進行語意相似度檢索。

### 4. Async Worker 報錯後的「殭屍狀態 (Zombie State)」
- **地雷風險**：為了避免 Worker Crash，我們現在遇到 AI 解析失敗會優雅地寫入 `failed_xxx.md`。但若負責同步的 `document_sync.repo.ts` 未實作對此失敗紀錄的偵測，這筆任務會在 UI 永遠卡在「處理中 (Processing)」。
- **拆彈指南**：必須在 `SyncRepo` 或監控 Cronjob 中實作「主動偵測 FAILED log」與「逾時 (Timeout) 機制」，一旦失敗即在前端亮紅燈並允許人工介入。
