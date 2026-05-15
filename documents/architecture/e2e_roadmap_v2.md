# 🚀 iSunFA Master Blueprint：ESG 與財務混合審計底層引擎 (E2E Core Engine)

> **Date**: 2026-05-10
> **Author**: Tzuhan
> **Version**: 1.1
> **Last Updated**: 2026-05-14

> **Status**: 🔴 **UI/UX 進入全面凍結 (Freeze)**。全隊開發量能 100% 轉向底層報表與數據引擎的準確性構建。
>
> **Vision**: 讓 iSunFA 成為 ESG 與財務混合審計的黃金標準，達到四大會計師 (Big 4) 的查帳要求，並足以作為政府（如新北市）數位產品護照 (DPP) 與合規審查的底層引擎 。
> **Lineage (架構演進)**: 本文件正式取代並重構了先前的 `archive/future_optimization_roadmap.md`。我們在此正式推翻了過去「為了極限測試而讓 AI 參與數學運算」的實驗室思維，確立了「零捏造、完全職能分離」的 CPA 級別鐵律。
>
> ⚠️ **IMPORTANT RULE**: 本 Roadmap v2 必須與 `documents/architecture/pipeline/` 底下的各模組實作說明 **結合一起看**，因為 Roadmap 中的每一項「地雷拆除」都精確對應著底層 Pipeline 原始碼的現況與弱點。

---

## 🏛️ 第一章：戰略共識與系統鐵則 (The Core Mandate)

在探討具體的技術演進前，全體研發團隊必須將以下「最高指導原則」刻在每一行程式碼中。財務與碳盤查必須共用同一套嚴謹的底層防線：

### ⚖️ 鐵律一：零捏造的數據溯源 (Absolute Data Integrity)

> **「客戶揭露多少憑證，系統就只產出多少事實。」**

AI 在 iSunFA 僅作為「資料萃取器 (Extractor)」與「分類輔助 (Classifier)」，絕對禁止 AI 參與「數值創造」。所有最終報告的數字，都必須能 100% 透過會計恆等式溯源回原始憑證。

### 🌍 鐵律二：財務是恆等式，碳排是科學估算 (Calculation, not Generation)

絕對禁止 AI 參與任何碳排數值的「運算」。AI 的職責僅限於從憑證萃取「活動數據（Activity Data，如：用電度數、採購重量）」。所有的碳排當量（CO2e）與單位轉換，必須統一交由底層引擎呼叫 `EmissionFactorDictionary`（排放係數庫）並透過高精度型別進行乘法計算。

### 🛡️ 鐵律三：雙重視角的開發心法 (Dual-Lens Philosophy)

- **法規反向映射 (Regulatory Reverse-Mapping)**：寫下的每一段核心邏輯，都必須能對應到法規（如 ISO 14064-1 溯源、ISO 14067 產品碳足跡 ）。
- **稽核左移測試 (Audit Shift-Left)**：在底層架構產出 MVP 時，即邀請 CPA 進行概念驗證 (PoC)，用最挑剔的查帳眼光攻擊系統。
- **隱形的 Web3 防護 (Invisible Web3 Utility)**：區塊鏈是達成不可竄改的工具，其複雜度必須對終端用戶與政府稽核員 **絕對隱形**。

---

## 🔄 第二章：逆向推進與敏捷收斂路徑 (The Reverse Push Sprints)

我們全面重構開發邏輯，採行「逆向推進路線：先求數學絕對精準 ➡️ 再測商業邏輯異常 ➡️ 最後挑戰視覺極限與合規深水區」。

### 📌 Sprint 1: 數學絕對真理與底層水管 (Mathematical Truth & Infrastructure)

**🎯 收斂目標 (DoD)**：在不考慮 AI 辨識率的情況下，系統的財務引擎能精準加總且總資產完美配平；ESG 引擎能精準執行單位轉換與係數乘法，且在高併發下達到 0 丟包率。

- **[第一順位：Architect 穩定性任務 (底層管線防護)]**
- **✅ Done (2026-05-14)：廢除 Markdown 故事腦補與全域替換 JSON 擷取**：**(幻覺地雷拆彈)** 明令禁止要求 AI 撰寫「事件摘要或故事」。全面強制升級為 Gemini 的 `responseSchema` (Structured Output) 與 `application/json`，徹底拔除舊版脆弱的 `/\{[\s\S]*\}/` Regex 擷取，斷絕資料靜默遺失風險。
- **✅ Done (2026-05-14)：極致去中心化與無退款防禦 (Decentralized Worker & DLQ)**：**取消**原本的 POSIX 原子鎖與 Saga 點數退款機制。確立 Worker 為獨立外部節點，負責從鏈上抓取檔案建立完全隔離的檔案系統，天然無 Race Condition。實作「無退款權限」原則，Worker 的唯一目標是**「無限重試至成功 (Retry-Until-Success)」**，摒棄傳統遇到錯誤就妥協退款的機制。
- **⏳ In Progress (2026-05-15)：實作 Post-Parsing 攔截器與 Mock Facades (Backend Interceptors)**：接續 AI 降級決策，於核心寫入管線 (`document_sync.repo.ts`) 建置匯率 (FX)、會計科目 (AccountCode) 與碳排 (ESG) 三大攔截閘門。導入 Mock-First 策略預判外部模組介面，確保主引擎能即時阻斷 AI 的數學與邏輯幻覺。


- **[第二順位：CPA 財務合規任務 (核心財務防禦)]**
- **✅ Done (2026-05-14)：外幣與全域字典解耦 (Backend Rule Registry)**：徹底剝奪 AI 計算匯率與小數點乘法的權力，並拔除所有全域會計字典注入（節省巨量 Token）。外幣匯率微服務與黃金廠商映射引擎 (`VENDOR_RULE_REGISTRY`) 已獨立切分，正式交由 Julian 負責實作。
- **✅ Done (2026-05-14)：包容不完美揭露的財報容錯 (Partial Disclosure Tolerance)**：為符合系統允許用戶「部分揭露憑證」的商業原則，必須容忍資產負債表不平的情形。**嚴禁在 API 閘道口阻擋不平的試算表寫入**。系統應動態將差額提列至「暫付款/暫收款」等懸記科目。
- **✅ Done (2026-05-10)：面額彈性解耦 (Decoupling Par Value)**：拔除系統內 `parValue = 10` 的 Hardcode，改為動態傳入（已實作完成，動態計算每股淨值與 EPS）。

- **[第三順位：CPA 碳排合規任務 (DPP 基礎)]**
- **✅ Done (2026-05-14)：數位 BOM 與產品關聯解耦 (DPP Handover)**：為了保持核心借貸引擎極簡，徹底移除了資料庫中對 `productId` 的強耦合。DPP 數位產品護照架構已切分出領域邊界，正式交由老闆 Luphia 親自負責統籌與設計。
- **✅ Done (2026-05-13)：實作「ESG 兩段式計算架構 (Two-Stage Calculation)」**：**(漂綠地雷拆彈)** 廢除 Prompt 中的 `ALL_TRUE_COEFFICIENT_DATA` 與乘法指令。AI 僅限萃取，後端 ESG 碳排係數洗轉與產業容損率建置交由 Julian 實作。
- **✅ Done (2026-05-14)：高精度數據重構與單位枚舉 (Precision & Unit Enum)**：財務欄位升級為 `BigInt`；碳排引擎導入 `Prisma.Decimal` 並將 `MeasurementUnit` 從 DB 拔除轉為 TypeScript 端強型別，前端全面套用 `MoneyUtil` 防腐層。徹底消滅所有 `parseFloat` 的隱性精度流失漏洞，保障千兆級財報與極精密碳排係數安全寫入。

### 📌 Sprint 2: 商業邏輯防禦與抗幻覺 (Business Logic & Anti-Hallucination)

**🎯 收斂目標 (DoD)**：數學引擎算得準之後，測試系統能否攔截人類或 AI 犯下的「業務邏輯錯誤與幻覺」。投入具備邏輯矛盾的 Payload，系統必須精準凍結。

- **[CPA 財務合規任務]**
- **⚠️ Pending：報表快照與期初餘額 (Snapshots & Opening Balance)**：**(效能地雷拆彈)** 若不實作期初餘額，E2E 盲測驗證龐大真實資料庫時，API 會因反覆重算數十萬筆傳票而觸發 OOM (Out of Memory) 崩潰。報表引擎必須基於 `本期報表 = 期初快照 + 當期變動明細` 打造。
- **⚠️ Pending：廢除不合理允當標準 (Zero Tolerance)**：日常上線的報表驗證 Threshold 嚴格鎖死在 **0%**。
- **⚠️ Pending：防堵日期幻覺 (Anti-Date Hallucination)**：強制依賴 AI 輸出的 `tradingDate`，若發生跨期，系統必須報錯並阻斷財報生成。
- **⚠️ Pending：追溯重編的「關聯性鎖死」 (Adjustment Voucher Audit Trail)**：實作前期損益調整時，追加帶有標籤 (`isRestatement=true`) 的當期調整傳票。**Schema 強制帶入 `targetVoucherId` (被更正的原始傳票 ID)**，形成雙向鏈結，杜絕幽靈調整傳票。
- **⚠️ Pending (Blocker)：強制修復傳票重複加總漏洞 (Voucher Duplication)**：目前 Voucher 金額運算邏輯在代繳與已繳費的處理上會產生重複計算。必須實作嚴格的「交易關聯 ID (Transaction Correlation ID)」與沖銷邏輯，確保代墊款與實際支付在會計科目上能完美沖抵，否則系統將無法通過四大會計師的三表勾稽審查。

- **[CPA 碳排合規任務 (DPP 產品護照架構交由 Luphia 負責)]**
- **✅ Done (2026-05-14)：建置碳排暫存區 (SuspenseEsgRecord)**：廢除 `SCOPE_3` 的無腦 Fallback。憑證資訊不明或缺少碳排係數主檔時，依然如實寫入憑證紀錄以保留查核軌跡，但將 `emissions` 強制設為 0，且 `isVerified` 設為 `false`，並打上懸記警告標籤 (`aiNote`)，凍結該筆資料於待釐清區等待 CPA 覆核補登，徹底防堵隱匿財報與漂綠風險。
- **✅ Done (Architectural Decision: Immutable IDs)：排放係數時空快照 (Emission Factor Versioning)**：經過重新設計，不再將數值硬拷貝至 EsgRecord 造成 Schema 污染。改為全面採用「Immutable Coefficient IDs (如 epa-2025-t1-004)」，天然實現時空快照。
  - **🔒 Immutable Coefficient 兩大鐵律**：未來維護係數庫必須嚴格遵守：1. **禁止 UPDATE 數值** (避免污染歷史帳本)；2. **永遠只用 INSERT (Append-Only)**。
- **⚠️ Pending (急迫)：官方標準係數資料庫轉移與自動化管線 (Standard Coefficients DB Migration & Scraper)**：
  - 目前為求開發便利，將大量係數混寫於常數檔中 (`TRUE_COEFFICIENT_DATA_*`)。未來必須開發專屬 Seeder 將數萬筆標準係數全數整併至資料庫（以 `accountBookId = null` 作為全域辨識），並重構 `route.ts` 直接查詢 DB 以支援效能與分頁。
  - **三大資料來源同步**：
    1. **US EPA** (美國環保署資料庫)
    2. **UK DEFRA** (英國環境食品與鄉村事務部資料庫)
    3. **Taiwan MOENV** (台灣環境部事業溫室氣體排放量資訊平台 - 需找回舊有爬蟲程式碼整合進管線)
  - 建立定期自動下載 Pipeline，確保系統具備最新 Master Data 且強制遵守 Append-Only 不可竄改規則。
- **⚠️ Pending：阻斷 AI 碳排幻覺與導入向量搜尋 (Anti-ESG Hallucination & Vector Search)**：內建 `EmissionFactorDictionary`。不僅要求 AI 只抓取「活動數據」，後端必須導入 `pgvector` 向量搜尋來精準對接官方係數庫並交由系統重算。
- **⚠️ Pending (急迫)：質量守恆勾稽與動態容許耗損率 (Mass Conservation & Loss Ratio Threshold)**：將「進銷存與原物料物理防護」實作於管線中。猶如財務的 A=L+E，系統將強制核對：`期初庫存重量 + 本期採購重量 = 消耗重量 + 期末庫存重量`。**(物理防呆地雷拆彈)** 避免過度剛性的物理防護導致系統死鎖，現實中絕對守恆不存在，必須在 Schema 為不同原物料引入動態的「容許耗損率 (Loss Ratio Threshold)」。若 AI 萃取出的消耗量與 ERP 盤盈虧落在合理閥值內，系統應自動生成「盤盈虧/耗損調整分錄」並繼續放行，以貼近真實製造業的運作樣貌。
  - **⚠️ Pending (2026-05-13)：進階防護實作**：必須在寫入 DB 前掛載 ERP 庫存比對微服務，若 `amount > MAX_INVENTORY_LIMIT` 則直接拋出 Error 並將憑證標記為 `FRAUD_SUSPECTED` 阻斷寫入，達到 100% 物理防漂綠。

- **[Architect & CPA 聯手任務 (Self-Healing & Deterministic AI)]**
- **⏳ In Progress (2026-05-13)：混合決策管線與字典解耦 (Hybrid Deterministic Pipeline & Dictionary Decoupling)**：徹底解決 LLM 機率不穩定性的終極架構。將憑證解析任務拆分為三階：Stage 1 (單純讓 AI 萃取特徵，如廠商名稱與文件類型)、Stage 2 (依賴 TypeScript 查表作絕對穩定分流)、Stage 3 (查無規則時才讓 AI 進行推論 Fallback)。在實作 Stage 2 時，必須嚴格禁止將數千筆的國家級會計科目表 (`ACCOUNTS`) 透過 `JSON.stringify` 暴力塞入 Prompt。Stage 1 僅萃取特徵，Stage 2 由後端程式決定科目，藉此極小化 Token 消耗並避免 LLM 注意力渙散。(註：目前 Stage 2 以 includes 實作，已解除暴力注入)。
  - **⚠️ Pending (2026-05-13)：進階對應實作**：字典映射目前使用字串 `includes` 作為 Stage 2 的過渡防護。下一個 Sprint 必須在 Node.js 引入輕量級 Embeddings (如 OpenAI `text-embedding-3-small` 搭配 Postgres `pgvector`)，將其升級為具備語意理解能力的向量檢索 (Vector Search)。
- **⚠️ Pending：AI 封閉迴圈校正管線 (Closed-Loop Prompt Calibration)**：針對高度相似的憑證建立自動盲測機制。若 AI 解析錯誤，將「錯誤輸出」與「正確答案」交由高階模型自動產出優化版的解析 Prompt。**(資安防線地雷拆彈)** 禁止 AI 直接覆寫生產環境的 Prompt，以防惡意供應商發動「提示詞注入 (Prompt Injection)」攻擊導致模型崩潰。優化 Prompt 必須進入「人工覆核 (HITL)」，由具備 CPA 權限的超級管理員審核並簽章後，才能部署更新。

### 📌 Sprint 3: 視覺極限與合規深水區 (Vision Extreme & ITGC Compliance)

**🎯 收斂目標 (DoD)**：底層邏輯完美無瑕後，正式挑戰真實世界憑證，並疊加符合 SOX 內控與 ISO 標準的防護網，產出具備綠色溢價的官方憑證。

- **[CPA 財排雙軌合規任務]**
- **⚠️ Pending：是非題自我對抗防護 (Self-Consistency / Self-Reflection)**：針對高風險的 Stage 3 任務（如 ESG 排放係數或罕見分錄盲猜），在背景 Worker 引入自我詰問機制。讓模型產出初步結果後，由另一組 Prompt 進行是非題覆核，雙重確保沒有數學或邏輯幻覺。
- **禁止 Web2 級別的權限中介軟體 (No Web2 RBAC Anti-Pattern)**：**絕對禁止**在 API 實作類似 `SessionUser.ID !== createdBy` 這種傳統的 Maker-Checker 邏輯。
  - **防污染實作規範**：本系統的「零信任」奠基於區塊鏈與密碼學。職能分離 (Segregation of Duties) 必須且只能透過驗證操作者的 AA Wallet (ERC-4337) 簽章與其綁定的 ONCHAINID (如：具備 CPA Claim) 來達成。任何試圖在 Node.js API 層做字串比對的權限控管，都是對 Web3 零信任架構的降級與污染。

- **[Architect 穩定性與區塊鏈任務]**
- **WORM 級別查核軌跡 (Hash-Chained Logs)**：導入密碼學雜湊鏈，防禦 DBA 竄改與截斷攻擊。
- **再生原料憑證上鏈 (DPP Green Certificate)**：對接城市採礦戰略。當系統確認具備戰略循環（如人造螢石、高純度矽粉等）的再生原料入荷時 ，觸發智能合約，發行專屬的「再生原料憑證 Hash」 ，並自動綁定至該批次的數位產品護照 (DPP) 中 。

- **視覺與邏輯對抗測試 (Adversarial Testing)**：投入異常清晰但金額極度不合理的樣本，驗證「動態信賴區間」能否自動將其凍結。

---

## 🧭 第三章：防偏航與執行戰略 (Anti-Derailment Execution Strategy)

1. **公私協力與國家級主權雲端 (Data Sovereignty)**
   在部署架構上，因應新北市 1.9 萬家工廠的機密數據要求，系統需確保 100% 落地臺灣的國家級主權雲端（如 TWSC） ，不外流至境外伺服器，配合金融級 AI 與零知識證明技術保障企業商業機密 。

2. **DPP 100 點驗證作為終極防弊 DoD (DPP Validation Rule)**
   將新北市的「DPP 100 點驗證規範」納入系統測試的 Acceptance Criteria：AI 必須自動驗證所有單據，**「無具體第三方報告與單據，系統不予給分」** ，實質防堵漂綠 (Greenwashing) 。

3. **合規混沌工程 (Compliance Chaos Engineering)**
   開發後期定期舉辦破壞性演練。模擬 DBA 刪除資料，驗證 Hash Chain 斷裂警報；模擬 AI 幻覺攻擊，驗證內控的凍結機制。
