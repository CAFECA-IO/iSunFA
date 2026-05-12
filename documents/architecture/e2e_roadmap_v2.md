# 🚀 iSunFA Master Blueprint：ESG 與財務混合審計底層引擎 (E2E Core Engine)

> **Date**: 2026-05-10
> **Author**: Tzuhan
> **Version**: 1.1
> **Last Updated**: 2026-05-13

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

- **[CPA 財務合規任務]**
- **⏳ In Progress (2026-05-10)：包容不完美揭露的財報容錯 (Partial Disclosure Tolerance)**：為符合系統允許用戶「部分揭露憑證」的核心商業原則，系統必須容忍資產負債表不平的情形。**嚴禁在 API 閘道口阻擋不平的試算表寫入**。系統應動態將差額提列至「暫付款/暫收款 (Suspense Account)」等懸記科目，真實反映未決明細。
- **✅ Done (2026-05-10)：面額彈性解耦 (Decoupling Par Value)**：拔除系統內 `parValue = 10` 的 Hardcode，改為動態傳入（已於 `balance_sheet_generator` 與 `income_statement_generator` 實作完成，動態計算每股淨值與 EPS）。
- **⏳ In Progress (2026-05-13)：外幣匯率與後端運算解耦 (Exchange Rate Backend Math)**：拔除 AI 在 Prompt (如 `journal.ts`) 中「猜測歷史匯率」與「換算本位幣」的權限，改由後端串接 Exchange Rate API 獲取精準匯率並以 `Prisma.Decimal` 計算。(註：Prompt 權限已拔除，後端微服務待實作)。

- **[CPA 碳排合規任務 (DPP 基礎)]**
- **⚠️ Pending：數位 BOM 與產品關聯 Schema**：要求每一筆憑證或傳票，必須能選填關聯至 `ProductID`（產品線）。這是未來支援新北 DPP 銅級合規（ISO 14067 產品碳足跡）的底層骨架 。

- **✅ Done (2026-05-12)：高精度數據重構與單位枚舉 (Precision & Unit Enum)**：財務欄位升級為 `BigInt`；碳排引擎導入 `Prisma.Decimal` 並實作嚴格的 `Unit Enum`（如 `KWH`, `LITER`），徹底消滅浮點數誤差與單位轉換亂流。前端全面套用 `MoneyUtil` 防腐層。
- **✅ Done (2026-05-13)：實作「ESG 兩段式計算架構 (Two-Stage Calculation)」**：**(漂綠地雷拆彈)** 徹底廢除 Prompt 中的 `ALL_TRUE_COEFFICIENT_DATA` 暴力注入與乘法指令。AI 僅限萃取「活動類型 (activityType)」、「消耗量 (amount)」與「單位 (unit)」。後端 Node.js 必須接手，精準對應係數庫並使用 `Prisma.Decimal` 執行 `amount * factor` 運算，從物理層面消滅碳排數學幻覺。

- **[Architect 穩定性任務 (Anti-Overengineering)]**
- **⏳ In Progress：極簡化檔案死信佇列 (File-System DLQ)**：**禁止引入 Redis 或 BullMQ 等外部 Queue 依賴**。基於「零捏造與極簡依賴」原則，目前的 `mission.executor.service.ts` 檔案輪詢機制已具備極佳的解耦效果。引入 Redis 只會增加地端與主權雲部署的維運成本。
  - **防污染實作規範**：將 AI 請求全面改為嚴格的結構化輸出 (`responseMimeType: "application/json"`) 廢除脆弱的 Regex。當任務失敗時，Worker 不得讓任務蒸發，必須將原始 JSON 與 `.error.log` 移入 `MISSION_DIR/dlq/`，用最純粹的 File-System 滿足 CPA 對實體除錯軌跡的要求。
  - **點數退還機制 (Credit Refund Saga)**：當任務遭遇 API 限流失敗並被打入 DLQ (`giveup.md`) 時，必須實作採納原子操作的退還機制。
- **⚠️ Pending：報表快照與期初餘額 (Snapshots & Opening Balance)**：**(效能地雷拆彈，從 Sprint 3 提前)** 若不實作期初餘額，E2E 盲測在驗證台積電等千億級真實資料庫時，API 會因反覆重算數十萬筆傳票而觸發 OOM (Out of Memory) 崩潰。報表引擎從 Day 1 就必須基於 `本期報表 = 期初快照 + 當期變動明細` 打造。
- **✅ Done (2026-05-13)：廢除 Markdown 故事腦補與 Regex**：**(幻覺地雷拆彈)** 明令禁止在 Prompt (如 `journal.ts`) 中要求 AI 撰寫「事件摘要或故事」。全面強制升級為 Gemini 的 `responseSchema` (Structured Output)，僅允許 AI 回傳嚴格定義的 Key-Value 特徵，斷絕 AI 為了文句通順而捏造人事時地物的本能。
- **⚠️ Pending：分散式併發原子鎖 (Atomic Lock)**：為維持「零依賴」原則，必須在 `mission.executor.service.ts` 的檔案輪詢中實作 POSIX 標準的「原子操作（如 `fs.renameSync` 或建立 `.lock` 目錄）」。確保未來進入主權雲 K8s 多節點橫向擴展時，不會發生 Race Condition 導致傳票重複寫入。

### 📌 Sprint 2: 商業邏輯防禦與抗幻覺 (Business Logic & Anti-Hallucination)

**🎯 收斂目標 (DoD)**：數學引擎算得準之後，測試系統能否攔截人類或 AI 犯下的「業務邏輯錯誤與幻覺」。投入具備邏輯矛盾的 Payload，系統必須精準凍結。

- **[CPA 財務合規任務]**
- **⚠️ Pending：廢除不合理允當標準 (Zero Tolerance)**：日常上線的報表驗證 Threshold 嚴格鎖死在 **0%**。
- **⚠️ Pending：防堵日期幻覺 (Anti-Date Hallucination)**：強制依賴 AI 輸出的 `tradingDate`，若發生跨期，系統必須報錯並阻斷財報生成。
- **⚠️ Pending：追溯重編的「關聯性鎖死」 (Adjustment Voucher Audit Trail)**：實作前期損益調整時，追加帶有標籤 (`isRestatement=true`) 的當期調整傳票。**Schema 強制帶入 `targetVoucherId` (被更正的原始傳票 ID)**，形成雙向鏈結，杜絕幽靈調整傳票。
- **⚠️ Pending (Blocker)：強制修復傳票重複加總漏洞 (Voucher Duplication)**：目前 Voucher 金額運算邏輯在代繳與已繳費的處理上會產生重複計算。必須實作嚴格的「交易關聯 ID (Transaction Correlation ID)」與沖銷邏輯，確保代墊款與實際支付在會計科目上能完美沖抵，否則系統將無法通過四大會計師的三表勾稽審查。

- **[CPA 碳排合規任務 (DPP 基礎)]**
- **⚠️ Pending：建置碳排暫存區 (SuspenseEsgRecord)**：廢除 `SCOPE_3` 的無腦 Fallback。憑證資訊不明時，凍結資料於待釐清區，防堵漂綠風險。
- **✅ Done (2026-05-13)：阻斷 AI 碳排幻覺 (Anti-ESG Hallucination)**：內建 `EmissionFactorDictionary`。在測試管線中投入「假裝印有碳排噸數的發票」，驗證系統是否能成功無視該數值，堅持只抓取「活動數據」並交由底層重算。
- **⚠️ Pending：質量守恆勾稽與動態容許耗損率 (Mass Conservation & Loss Ratio Threshold)**：將「進銷存與原物料物理防護」實作於管線中。猶如財務的 A=L+E，系統將強制核對：`期初庫存重量 + 本期採購重量 = 消耗重量 + 期末庫存重量`。**(物理防呆地雷拆彈)** 避免過度剛性的物理防護導致系統死鎖，現實中絕對守恆不存在，必須在 Schema 為不同原物料引入動態的「容許耗損率 (Loss Ratio Threshold)」。若 AI 萃取出的消耗量與 ERP 盤盈虧落在合理閥值內，系統應自動生成「盤盈虧/耗損調整分錄」並繼續放行，以貼近真實製造業的運作樣貌。
  * **⚠️ Pending (2026-05-13)：進階防護實作**：必須在寫入 DB 前掛載 ERP 庫存比對微服務，若 `amount > MAX_INVENTORY_LIMIT` 則直接拋出 Error 並將憑證標記為 `FRAUD_SUSPECTED` 阻斷寫入，達到 100% 物理防漂綠。

- **[Architect & CPA 聯手任務 (Self-Healing & Deterministic AI)]**
- **⏳ In Progress (2026-05-13)：混合決策管線與字典解耦 (Hybrid Deterministic Pipeline & Dictionary Decoupling)**：徹底解決 LLM 機率不穩定性的終極架構。將憑證解析任務拆分為三階：Stage 1 (單純讓 AI 萃取特徵，如廠商名稱與文件類型)、Stage 2 (依賴 TypeScript 查表作絕對穩定分流)、Stage 3 (查無規則時才讓 AI 進行推論 Fallback)。在實作 Stage 2 時，必須嚴格禁止將數千筆的國家級會計科目表 (`ACCOUNTS`) 透過 `JSON.stringify` 暴力塞入 Prompt。Stage 1 僅萃取特徵，Stage 2 由後端程式決定科目，藉此極小化 Token 消耗並避免 LLM 注意力渙散。(註：目前 Stage 2 以 includes 實作，已解除暴力注入)。
  * **⚠️ Pending (2026-05-13)：進階對應實作**：字典映射目前使用字串 `includes` 作為 Stage 2 的過渡防護。下一個 Sprint 必須在 Node.js 引入輕量級 Embeddings (如 OpenAI `text-embedding-3-small` 搭配 Postgres `pgvector`)，將其升級為具備語意理解能力的向量檢索 (Vector Search)。
- **⚠️ Pending：AI 封閉迴圈校正管線 (Closed-Loop Prompt Calibration)**：針對高度相似的憑證建立自動盲測機制。若 AI 解析錯誤，將「錯誤輸出」與「正確答案」交由高階模型自動產出優化版的解析 Prompt。**(資安防線地雷拆彈)** 禁止 AI 直接覆寫生產環境的 Prompt，以防惡意供應商發動「提示詞注入 (Prompt Injection)」攻擊導致模型崩潰。優化 Prompt 必須進入「人工覆核 (HITL)」，由具備 CPA 權限的超級管理員審核並簽章後，才能部署更新。

### 📌 Sprint 3: 視覺極限與合規深水區 (Vision Extreme & ITGC Compliance)

**🎯 收斂目標 (DoD)**：底層邏輯完美無瑕後，正式挑戰真實世界憑證，並疊加符合 SOX 內控與 ISO 標準的防護網，產出具備綠色溢價的官方憑證。

- **[CPA 財排雙軌合規任務]**
- **排放係數時空快照 (Emission Factor Versioning)**：將「當下使用的碳排係數數值與標籤」硬拷貝寫入 `EsgRecord` 中，防範未來係數更新導致歷史報告查驗失敗。
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
