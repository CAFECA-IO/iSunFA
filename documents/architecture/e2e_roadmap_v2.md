# 🚀 iSunFA Master Blueprint：ESG 與財務混合審計底層引擎 (E2E Core Engine)

> **Date**: May 2026
> **Status**: 🔴 **UI/UX 進入全面凍結 (Freeze)**。全隊開發量能 100% 轉向底層報表與數據引擎的準確性構建。
> **Vision**: 讓 iSunFA 成為 ESG 與財務混合審計的黃金標準，達到四大會計師 (Big 4) 的查帳要求，並足以作為政府合規審查的底層引擎。

---

## 🏛️ 第一章：戰略共識與系統鐵則 (The Core Mandate)

在探討具體的技術演進前，全體研發團隊必須將以下「最高指導原則」刻在每一行程式碼中。這也是我們建立「抗 AI 幻覺架構 (Anti-Hallucination Architecture)」的根本：

### ⚖️ 鐵律一：零捏造的數據溯源 (Absolute Data Integrity)

> **「客戶揭露多少憑證，系統就只產出多少事實。」**

AI 在 iSunFA 僅作為「資料萃取器 (Extractor)」與「分類輔助 (Classifier)」，絕對禁止 AI 參與「數值創造」。所有最終報告的數字，都必須能 100% 透過會計恆等式溯源回原始憑證。我們絕不為了報表的「完整性」或「配平」去捏造、猜測或插補任何一筆不存在的數據。

### 🛡️ 鐵律二：雙重視角的開發心法 (Dual-Lens Philosophy)

- **法規反向映射 (Regulatory Reverse-Mapping)**：寫下的每一段核心邏輯，都必須能對應到法規。技術取捨的唯一裁決標準是「能否滿足法規查驗」。
- **稽核左移測試 (Audit Shift-Left)**：在底層架構（如 Merkle Root 或期初餘額）產出 MVP 時，即邀請 CPA 進行概念驗證 (PoC)，用最挑剔的查帳眼光攻擊系統，確保架構不偏航。
- **隱形的 Web3 防護 (Invisible Web3 Utility)**：區塊鏈是達成「WORM (Write Once, Read Many) 級別不可竄改」的工具，其複雜度（Gas、多簽、私鑰）必須對終端用戶與政府稽核員 **絕對隱形**。

---

## 🔄 第二章：逆向推進與敏捷收斂路徑 (The Reverse Push Sprints)

為確保開發能階段性快速收斂，我們全面重構測試與開發邏輯，採行「逆向推進路線：先求數學絕對精準 ➡️ 再測商業邏輯異常 ➡️ 最後挑戰視覺極限與合規深水區」。

### 📌 Sprint 1: 數學絕對真理與底層水管 (Mathematical Truth & Infrastructure)

**🎯 收斂目標 (DoD)**：在不考慮 AI 辨識率的情況下，系統財報引擎能精準加總，總資產完美配平，且在高併發下達到 0 丟包率。

- **[CPA 合規任務] 確立財務查帳基準**
- **期初餘額與試算表恆等式 (Opening Balances & Trial Balance Gatekeeper)**：擴充 `OpeningBalance` Schema。期初餘額絕不能只是單純塞入「總資產」。必須在 API 寫入層級加上嚴格斷言：**寫入的期初資料必須完全符合 `Assets = Liabilities + Equity**`。若客戶匯入的期初試算表本身就不平，系統必須在大門口直接 `Throw Error` 拒絕寫入，絕對不允許髒資料污染底層引擎。
- **面額彈性解耦 (Decoupling Par Value)**：拔除系統內 `parValue = 10` 的 Hardcode，改為動態傳入，以支援海內外彈性面額新制。
- **高精度數據重構 (Precision Engineering)**：財務加總欄位升級為 `BigInt` 以應付兆級營收；碳排引擎導入 `Prisma.Decimal`，徹底消滅 JS 浮點數誤差，遇零除錯必須精準回傳 `null`。

- **[Architect 穩定性任務] 打造不漏接的資料管線**
- **非同步化與死信佇列 (Batch Queue & DLQ)**：廢除脆弱的 `setTimeout`，全面導入非同步訊息佇列（如 BullMQ）。任何 API 429 或網路壅塞錯誤必須進入 DLQ 重試，系統完整性 (Completeness) 不可妥協。

### 📌 Sprint 2: 商業邏輯防禦與抗幻覺 (Business Logic & Anti-Hallucination)

**🎯 收斂目標 (DoD)**：數學引擎算得準之後，測試系統能否聰明地攔截人類或 AI 犯下的「業務邏輯錯誤與幻覺」。投入具備邏輯矛盾的 Payload，系統必須精準凍結。

- **[CPA 合規任務] 零容忍與邊界防禦**
- **廢除不合理允當標準 (Zero Tolerance)**：將日常上線的報表驗證 Threshold 嚴格鎖死在 **0%**。在審計視角下，任何誤差皆構成「重大性不實表達」。
- **建置碳排暫存區 (SuspenseEsgRecord)**：廢除無腦的 `SCOPE_3` Fallback。當憑證資訊不明時，凍結資料於待釐清區，強制人類介入。
- **防堵日期幻覺 (Anti-Date Hallucination)**：徹底移除 Ground Truth 日期的測試輔助。強制依賴 AI 輸出的 `tradingDate`，若發生跨期，系統必須報錯並阻斷財報生成。

- **[Architect 穩定性任務] 務實的會計流程對齊**
- **ESG 測試管線去理想化 (Realistic ESG Mocking)**：內建 `EmissionFactorDictionary`，要求 AI 僅萃取單據上的「度數/公升數」，交由核心引擎執行乘法運算。
- **追溯重編的「關聯性鎖死」 (Adjustment Voucher Audit Trail)**：實作前期損益調整時，追加帶有標籤 (`isRestatement=true`) 的當期調整傳票。**Schema 必須強制帶入 `targetVoucherId` (被更正的原始傳票 ID)**。在資料庫層級形成「雙向鏈結」，讓審計員能一秒追溯因果，杜絕孤立無援的幽靈調整傳票。

### 📌 Sprint 3: 視覺極限與合規深水區 (Vision Extreme & ITGC Compliance)

**🎯 收斂目標 (DoD)**：在底層邏輯完美無瑕後，正式挑戰充滿雜訊的真實世界憑證，並疊加符合公開發行公司內控 (SOX/ITGC) 與 ISO 標準的防護網。

- **[CPA 合規任務] 權限管控與時空快照**
- **排放係數時空快照 (Emission Factor Versioning)**：為防後續修改係數導致 ISO 14064 查驗失敗，將「當下使用的碳排係數數值與標籤」硬拷貝寫入 `EsgRecord` 中。
- **無 UI 的 API 級 Maker-Checker 實作 (API-Level Segregation of Duties)**：配合 UI 凍結戰略，捨棄複雜的簽核介面開發。在 API 層級嚴格鎖死：當呼叫 `Verify_All` API 時，系統檢查 `SessionUser.ID` 是否等於該傳票的 `createdBy`。若為同一人，API 直接回傳 **`403 Forbidden: Maker and Checker cannot be the same person`**。零 UI 開發成本，100% 滿足 SOX 職能分工標準。

- **[Architect 穩定性任務] 區塊鏈與對抗測試**
- **WORM 級別查核軌跡與區塊鏈錨定 (Hash-Chained Logs & State Root Anchoring)**：在 Postgres 導入密碼學雜湊鏈 (`previousHash`) 進行「狀態壓縮」。定期將 `tailHash` (或 Merkle Root) 錨定上自建區塊鏈 (Smart Contract)，避免海量日誌造成的節點狀態膨脹 (State Bloat) 與 TPS 瓶頸，完美兼顧企業隱私與 100% 防竄改架構。
- **視覺與邏輯對抗測試 (Adversarial Testing)**：投入「異常清晰但金額極度不合理」的樣本，驗證「動態信賴區間」能否自動將其凍結並標記為 `Flagged for Review`。
- **模組化快取機制 (Component-Level Caching)**：針對 AI 萃取快取建立 Hash 檢查機制，極大化 E2E 壓測驗證效率。

---

## 🧭 第三章：防偏航與執行戰略 (Anti-Derailment Execution Strategy)

1. **顧問先行，精準打擊 (Advisory over Overhead)**

- 以外部「顧問諮詢」取代內部全職專家。由 AI 吞吐法規轉譯為初版 Spec，當高難度防禦完成 MVP 後，直接向四大會計師購買顧問服務進行攻擊與驗證，確保每一分開發資源都花在刀口上。

2. **合規混沌工程 (Compliance Chaos Engineering)**

- 開發後期定期舉辦破壞性演練。模擬 DBA 刪除資料，驗證 Hash Chain 斷裂警報；模擬業務邏輯攻擊，驗證 AI 內控的凍結機制。

3. **BD 戰力提早進場 (Design Partners Alignment)**

- 系統引擎一旦通過 Sprint 2 的驗證，工程與 BD 團隊即可帶著「具備三表勾稽與底層區塊鏈防護的 AI 財報引擎」願景，提早鎖定市場上的 Design Partners 進行溝通與封測。
