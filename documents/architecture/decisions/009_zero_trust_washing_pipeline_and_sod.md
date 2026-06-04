# ADR 009: Zero-Trust Washing Pipeline and Separation of Duties (SoD)

> **Date**: 2026-05-27
> **Author**: Tzuhan & Agent Antigravity
> **Status**: Accepted
> **Context**: iSunFA 系統在處理跨國憑證、逆向課稅 (Reverse Charge) 與長天期預付攤銷 (Amortization) 時，需要確保 AI 推論的非決定論結果不會污染核心會計總帳，同時解決雙重認列 (Double Booking) 與匯率精度問題。

本文件紀錄了 iSunFA 在處理憑證解析與財務入帳時，如何嚴守「職責分離 (SoD)」與「零信任資料流 (Zero-Trust Data Flow)」，將系統職責進行乾淨俐落的切割。

---

## 1. 核心設計理念：資料流的單向黃金法則

為了解決「神仙打架」(例如 AI 亂改稅額、Recorder 亂跑業務邏輯) 的架構隱患，系統中的角色被嚴格劃分為三大類：

### 1.1 生產者 (Producers)
包含 `MissionExecutor` (負責 AI 萃取與解析) 與 `AmortizationWorker` (負責系統性定時攤銷)。
- **職責**：運算、解析、洗淨資料。它們有權限讀取必要資料，但**絕對沒有資料庫寫入權限**。
- **終點**：將運算結果統一輸出為 `result.md` (包含 `dbSyncPayload`)，供後續流程盲推。

### 1.2 區塊鏈公證人 (Notary)
負責將 Producers 產生的狀態上傳至 Web3 Smart Contract (MissionBoard) 作為不可篡改的證據。

### 1.3 消費者 (Consumer / Dumb Writer)
全系統唯一的 DB 寫入入口 `IssueRecorderService`。
- **職責**：不包含任何商業邏輯、會計切斷或換匯計算。它只負責讀取 `result.md`，並將裡面的 `dbSyncPayload` 安全、完整地寫入 PostgreSQL 關聯式資料庫。

---

## 2. 決定論管線 (Deterministic Pipeline) 與洗淨 (Washing)

由於 AI 是非決定論的，且外幣匯率與稅額策略隨時在變動，我們在 `MissionExecutor` 產出最終 `result.md` 之前，加入了**決定論管線 (Washing Logic)**。

這確保了 AI 猜測的原始資料 (Raw Extraction) 在落地 (寫入 `result.md` 供盲推) 前，會被強制校正為符合法規與會計準則的正確格式。

### 2.1 會計切斷 (Accounting Engine Cut-off)
實作於：`AccountingEngineService.processCutoffEvents`
- 針對跨期付款 (Prepaid/Accrual)，將單一發票的事件切分為多個時間點的分錄。
- 確保入帳日期與匯率鎖定日符合權責發生制 (Accrual Basis)。

### 2.2 管線攔截器 (Voucher Pipeline Orchestrator)
實作於：`VoucherPipelineOrchestrator.executePipeline`
- **匯率轉換 (FX Interceptor)**：依據憑證日期與系統常數表，將外幣準確轉換回本位幣 (TWD)。
- **稅務策略 (Tax Strategy)**：
  - 若判斷為外國廠商數位勞務，且系統檢查到憑證尚未含稅 (沒有 `INPUT_TAX` 且無 `taxAmount`)，則自動依據「數位勞務費用加總」作為稅基，提列 5% 逆向課稅 (Reverse Charge) 分錄。
  - 防堵了過去依賴 AI 誤判 `totalAmount` 造成的計算誤差。

---

## 3. 自動化攤銷 (Amortization) 處理機制

針對長天期的合約費用，我們揚棄了不穩定的 BullMQ Delayed Jobs，改採系統排程與資料庫驅動。

### 3.1 運作原理
實作於：`AmortizationWorker` (`scripts/run_worker.ts` 每小時喚醒)
1. **唯讀掃描**：`AmortizationWorker` 唯讀掃描 DB 中的 `AmortizationSchedule`，找出狀態為 ACTIVE 且本月尚未攤銷的紀錄。
2. **計算與上鏈**：計算本月應攤銷比例與金額，產生上鏈任務 (Task ID)。透過基於 `(assetNo, currentMonth)` 的 `hashHex` 機制確保跨國時區下的冪等性 (Idempotency)，絕對不重複產出。
3. **丟出 payload**：將攤銷分錄包裝為 `result.md`。
4. **結束**：工作者結束任務，絕不自行寫入 DB。後續依舊交由 `IssueRecorderService` 將攤銷分錄寫入總帳。

---

## 4. 決策總結 (Consequences)

透過這項架構決策，我們達成了：
1. **拔除 God Class**：`IssueRecorderService` 不再包山包海，徹底回歸 Dumb Writer。
2. **消滅雙重認列 (Double Booking)**：在 `AccountingEngine` 中透過 `MoneyUtil` 修正了 `INPUT_TAX` 的重複計算問題。
3. **防堵 AI 運算誤差**：所有牽涉稅率 (5%)、匯率與金額加總的數學運算，全數改由高精度的決定論程式 (`MoneyUtil`) 接手。

iSunFA 的資料管線現在就像是一座設計精良的水質淨化廠：AI 負責從源頭抽水 (Extraction)，Executor 內的管線負責加氯消毒與過濾 (Washing Logic)，最後由 Recorder 負責安全地把純淨水灌入水庫 (DB)。

---

## 5. 盲點與已知風險 (Risks & Blind Spots)

### 全局金額異常熔斷機制缺口 (Circuit Breaker Gap)
- **問題**：系統目前已經實作了高精度的決定論加總 (`MoneyUtil`)，能保證稅基與明細加總完美吻合。然而，如果前端 AI 發生嚴重幻覺，在原始發票金額上「多加了三個零」（例如 1,000 元變成 1,000,000 元），高精度系統會「非常精準地」幫這 100 萬算出 5 萬元的稅金，並順利通過所有內部數學勾稽，最終寫入總帳。
- **影響**：這會導致財報上出現天價的異常費用與負債。
- **未來解法**：應在 `VoucherPipelineOrchestrator` 進入 DB 盲推前，實作一組「全局異常阻斷機制 (Global Circuit Breaker)」。例如：當單筆發票總額大於 1,000 萬台幣（可依據公司資本額設定重要性閾值），應直接拋出 `AnomalyDetectionError` 強制阻斷寫入，並將狀態標記為 `Status: NEEDS_HUMAN_INTERVENTION`。
