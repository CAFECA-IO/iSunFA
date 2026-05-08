# 🚀 iSunFA Master Blueprint：ESG 與財務混合審計底層引擎 (E2E Core Engine)

> **Date**: May 2026
> **Status**: 🔴 **UI/UX 進入全面凍結 (Freeze)**。全隊開發量能 100% 轉向底層報表與數據引擎的準確性構建。
>
> **Vision**: 讓 iSunFA 成為 ESG 與財務混合審計的黃金標準，達到四大會計師 (Big 4) 的查帳要求，並足以作為政府（如新北市）數位產品護照 (DPP) 與合規審查的底層引擎 。
> **Lineage (架構演進)**: 本文件正式取代並重構了先前的 `archive/future_optimization_roadmap.md`。我們在此正式推翻了過去「為了極限測試而讓 AI 參與數學運算」的實驗室思維，確立了「零捏造、完全職能分離」的 CPA 級別鐵律。

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
- **期初餘額與試算表恆等式 (Opening Balances & Trial Balance Gatekeeper)**：擴充 `OpeningBalance` Schema。在 API 寫入層級加上嚴格斷言：寫入的期初資料必須完全符合 `Assets = Liabilities + Equity`。若客戶匯入的期初試算表不平，系統大門口直接 `Throw Error` 拒絕寫入。
- **面額彈性解耦 (Decoupling Par Value)**：拔除系統內 `parValue = 10` 的 Hardcode，改為動態傳入。

- **[CPA 碳排合規任務 (DPP 基礎)]**
- **數位 BOM 與產品關聯 Schema**：要求每一筆憑證或傳票，必須能選填關聯至 `ProductID`（產品線）。這是未來支援新北 DPP 銅級合規（ISO 14067 產品碳足跡）的底層骨架 。

- **高精度數據重構與單位枚舉 (Precision & Unit Enum)**：財務欄位升級為 `BigInt`；碳排引擎導入 `Prisma.Decimal` 並實作嚴格的 `Unit Enum`（如 `KWH`, `LITER`），徹底消滅浮點數誤差與單位轉換亂流。

- **[Architect 穩定性任務]**
- **非同步化與死信佇列 (Batch Queue & DLQ)**：全面導入非同步訊息佇列（如 BullMQ），429 錯誤必須進入 DLQ 重試，確保 0 丟包率。

### 📌 Sprint 2: 商業邏輯防禦與抗幻覺 (Business Logic & Anti-Hallucination)

**🎯 收斂目標 (DoD)**：數學引擎算得準之後，測試系統能否攔截人類或 AI 犯下的「業務邏輯錯誤與幻覺」。投入具備邏輯矛盾的 Payload，系統必須精準凍結。

- **[CPA 財務合規任務]**
- **廢除不合理允當標準 (Zero Tolerance)**：日常上線的報表驗證 Threshold 嚴格鎖死在 **0%**。
- **防堵日期幻覺 (Anti-Date Hallucination)**：強制依賴 AI 輸出的 `tradingDate`，若發生跨期，系統必須報錯並阻斷財報生成。
- **追溯重編的「關聯性鎖死」 (Adjustment Voucher Audit Trail)**：實作前期損益調整時，追加帶有標籤 (`isRestatement=true`) 的當期調整傳票。**Schema 強制帶入 `targetVoucherId` (被更正的原始傳票 ID)**，形成雙向鏈結，杜絕幽靈調整傳票。

- **[CPA 碳排合規任務 (DPP 基礎)]**
- **建置碳排暫存區 (SuspenseEsgRecord)**：廢除 `SCOPE_3` 的無腦 Fallback。憑證資訊不明時，凍結資料於待釐清區，防堵漂綠風險。
- **阻斷 AI 碳排幻覺 (Anti-ESG Hallucination)**：內建 `EmissionFactorDictionary`。在測試管線中投入「假裝印有碳排噸數的發票」，驗證系統是否能成功無視該數值，堅持只抓取「活動數據」並交由底層重算。

### 📌 Sprint 3: 視覺極限與合規深水區 (Vision Extreme & ITGC Compliance)

**🎯 收斂目標 (DoD)**：底層邏輯完美無瑕後，正式挑戰真實世界憑證，並疊加符合 SOX 內控與 ISO 標準的防護網，產出具備綠色溢價的官方憑證。

- **[CPA 財排雙軌合規任務]**
- **排放係數時空快照 (Emission Factor Versioning)**：將「當下使用的碳排係數數值與標籤」硬拷貝寫入 `EsgRecord` 中，防範未來係數更新導致歷史報告查驗失敗。
- **無 UI 的 API 級 Maker-Checker 實作 (API-Level Segregation of Duties)**：配合 UI 凍結戰略，API 層級嚴格鎖死：當呼叫 `Verify_All` API 時，檢查 `SessionUser.ID` 是否等於該傳票的 `createdBy`。若為同一人，API 直接回傳 `403 Forbidden`。零 UI 開發成本滿足 100% SOX 職能分工。

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
