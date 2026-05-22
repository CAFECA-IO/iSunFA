# ⚙️ 核心管線：00. 非同步微服務守護行程總覽 (The 8-Daemon Orchestration)

> **Date**: 2026-05-15
> **Author**: Tzuhan
> **Target**: `src/services/mission.*.service.ts`, `order.*.service.ts`

本文件詳細拆解 iSunFA 最核心的非同步 AI 任務調度架構。我們捨棄了傳統 Web2 的單體式輪詢與重量級依賴 (如 Redis / BullMQ)，轉而設計了一套由 **8 大獨立守護行程 (Daemons)** 組成的微服務架構。這些 Daemons 圍繞著區塊鏈智能合約 (`mission_board.sol`) 與去中心化檔案系統 (`IPFS/Laria`)，透過極具巧思的 **「檔案系統佇列 (File-System Queue)」** 與 **「狀態機接力」**，實現了高可用、具備死信重試與防無窮迴圈的穩健架構。

---

## 🗺️ 八大守護行程接力圖 (The 8-Daemon Ballet Flowchart)

```mermaid
graph TD
    %% Define Node Styles
    classDef web2 fill:#4B5563,stroke:#9CA3AF,stroke-width:2px,color:#fff;
    classDef web3 fill:#1E3A8A,stroke:#60A5FA,stroke-width:2px,color:#fff;
    classDef local fill:#064E3B,stroke:#34D399,stroke-width:2px,color:#fff;
    classDef contract fill:#3E2723,stroke:#FF5252,stroke-width:2px,color:#fff,shape:cylinder;

    Web2DB[(PostgreSQL DB)]:::web2
    MissionBoard[(mission_board.sol)]:::contract
    IPFS[(Laria / IPFS)]:::contract
    MissionDir[/"本地 MISSION_DIR"/]:::local

    TxTracker["0. TxTracker (金流追蹤員)"]:::web3
    Issuer["1. MissionIssuer (發包員)"]:::web3
    Planner["2. MissionPlanner (調度員)"]:::web3
    Executor["3. MissionExecutor (AI引擎)"]:::local
    Commitor["4. MissionCommitor (上鏈員)"]:::web3
    Validator["5. IssueValidator (查帳員)"]:::web3
    Recorder["6. MissionRecorder (抄寫員)"]:::web3
    Fallbacker["7. MissionFallbacker (回收員)"]:::local

    %% Flow
    TxTracker -- "監聽區塊鏈交易 (Tx Success)" --> Web2DB
    Web2DB -- "標記 Order 為 PAID" --> TxTracker
    TxTracker -. "觸發" .-> Issuer
    Issuer -- "上傳 mission.json (透過 DocumentHelper 切塊編碼)" --> IPFS
    Issuer -- "createTask (鎖定資金)" --> MissionBoard
    Issuer -- "寫入 plan.validator.md (防作弊標準)" --> IssueDir[/"本地 ISSUE_DIR"/]:::local
    
    MissionBoard -- "偵測 Open 任務" --> Planner
    Planner -- "下載憑證 mission.json (透過 DocumentHelper 恢復切塊)" --> IPFS
    Planner -- "建立 plan.executor.json" --> MissionDir

    MissionDir -- "讀取待辦計畫" --> Executor
    Executor -- "產出 result.md" --> MissionDir

    MissionDir -- "讀取完成結果" --> Commitor
    Commitor -- "切塊上傳結果" --> IPFS
    Commitor -- "submitResult(resultCid)" --> MissionBoard

    MissionBoard -- "偵測 PendingReview" --> Validator
    Validator -- "驗證 AI 信心度" --> IPFS
    Validator -- "approveSubmission (撥款)" --> MissionBoard
    Validator -- "寫入 approved.md 與結果" --> IssueDir[/"本地 ISSUE_DIR"/]:::local

    IssueDir -- "讀取核准結果" --> Recorder
    Recorder -- "標記 COMPLETED 並寫回總帳" --> Web2DB

    MissionBoard -- "查詢 Approved / Rejected 狀態" --> Fallbacker
    Fallbacker -. "精算利潤寫入 close / 失敗寫入 giveup" .-> MissionDir
```

---

## 🎭 角色職責深度解析 (Daemon Roles)

系統的狀態流轉完全交由智能合約接管，Node.js 端的這 8 支微服務**互不認識、不直接呼叫彼此**，只透過聆聽區塊鏈與本機檔案目錄來決定下一步動作 (Event-Driven & Shared-Nothing Architecture)。

### 0. `TxTracker` (金流追蹤員)
- **職責**：Web3 到 Web2 的訂單狀態同步器。
- **動作**：不斷輪詢智能合約或區塊鏈節點，追蹤使用者的支付交易 (Tx)。一旦確認款項入帳 (`Success`)，立刻將 PostgreSQL 中的 Order 狀態更新為 `PAID`，正式啟動後續的發包流程。

### 1. `MissionIssuer` (發包員)
- **職責**：Web2 到 Web3 的實體橋樑。
- **動作**：不斷輪詢資料庫中狀態為 `PAID` 的訂單。找到後，向區塊鏈送出 `Approve` (授權扣款) 與 `createTask` (鑄造 NFT)，將使用者的原始憑證 `contentCid` 永久綁定，完成資金信託 (Escrow)。

### 2. `MissionPlanner` (調度員)
- **職責**：任務準備與在地化。
- **動作**：聆聽智能合約上狀態為 `Open (0)` 的任務。拿到任務後，從 IPFS 下載使用者的原始 `mission.json`，並在本地建立隔離的 `MISSION_DIR`，同時產出供 AI 讀取的 `plan.executor.json`。

### 3. `MissionExecutor` (AI 運算引擎)
- **職責**：系統的算力心臟，執行純粹的 AI 推論與決定論管線。
- **動作**：掃描 `MISSION_DIR` 執行混合決策管線，將結果寫成 `result.md`。若發生錯誤，除了寫入 `failed_*.md` 外，**會刻意輸出帶有錯誤標記的 `result.md` 以推進狀態機至後續的退回流程**。若偵測到 `giveup.md` 則會直接跳過。

### 4. `MissionCommitor` (上鏈員)
- **職責**：產出保護與提交。
- **動作**：掃描本地 `MISSION_DIR` 找出執行完畢的 `result.md`，並將其切塊加密上傳至 Laria 取得 `resultCid`。**同時，讀取 `execution_log.json` 總結 AI Token 消耗量**，將兩者一併透過 `submitResult` 送交合約，將任務推至 `PendingReview (1)`。

### 5. `IssueValidator` (自動化查帳員)
- **職責**：取代傳統的人工覆核 (HITL)。
- **動作**：聆聽合約上 `PendingReview` 的任務。將 IPFS 上的結果下載後進行規則驗證（例如確認 AI 信心度是否為滿分）。若驗證無誤，發送 `approveSubmission` 交易解鎖資金並放行任務。

### 6. `MissionRecorder` (總帳抄寫員)
- **職責**：將 Web3 的真相寫回 Web2 供使用者檢視。
- **動作**：掃描本地 `ISSUE_DIR` 尋找 Validator 留下的 `approved.*.md`。讀取本地最終確定版的產出，安全地寫回 PostgreSQL 總帳本，並將原本的訂單標記為 `COMPLETED`。

### 7. `MissionFallbacker` (結算與回收員)
- **職責**：任務最終狀態的結算與死信佇列 (DLQ) 處理。
- **動作**：定期巡視任務最終狀態。若任務已在鏈上核准 (Approved)，則精算 Token 耗損與利潤率並寫入 `close.md` 結案；若任務被拒絕達 3 次，則寫入 `giveup.md` 打入死信佇列。(TODO: 未來實作合約的 `raiseDispute` 爭議仲裁機制)

---

## 🏆 架構師評價與防禦機制實作 (Architectural Defenses)

### 🔐 零資料庫存取與安全隔離 (Zero DB Access & Security Boundary)
系統劃下了一道不可踰越的安全鴻溝：**`MissionExecutor` (與其他所有負責 Web3 / AI 運算的外部節點) 絕對沒有存取主系統 PostgreSQL 資料庫的權限。**
- **物理隔離**：它們無法連線 DB，更無法直接寫入、修改或刪除任何帳本資料。
- **單向提議**：它們的輸出 (`result.md`) 僅是一份「提議載荷 (Payload)」，必須經過上鏈 (`MissionCommitor`)、查帳核准 (`IssueValidator`)，最終由具備寫庫權限的內部節點 `MissionRecorder` 負責抄寫回資料庫。
- **防禦提示詞注入 (Prompt Injection Guard)**：這種極端的隔離確保了即使 AI 遭到惡意使用者的「提示詞注入攻擊」，攻擊者也絕對無法穿越實體網路邊界去污染或竊取核心財務資料庫。

### 🛡️ 徹底隔離的檔案系統 (Shared-Nothing Architecture)
由於 Planner 與 Executor 依賴的是本地的檔案系統狀態機，這意味著多個 Worker 之間**完全不需要共用掛載硬碟 (Shared Volume)**。
因為沒有共用硬碟，自然就從物理層面徹底消滅了分散式擴展時最難解的「競爭條件 (Race Condition)」。系統不需要實作任何 Redis Lock，K8s 的橫向擴展變得極度輕量、純粹且具備無限擴展性。

### 🏗️ 混合決定論管線 (Hybrid Deterministic Pipeline)
Executor 的內部實作了「不確定的機率推論」與「絕對的數學真理」拆分。
1. **廠商查表防禦 (`VendorRegistry`)**：最優先攔截，走決定論查表，100% 杜絕 LLM 猜測會計科目。
2. **任務層級分流 (`skillRegistry`)**：若未被攔截，判斷是否為預先寫死的 TypeScript 技能。
3. **AI 推論 Fallback**：若皆無命中，才會退回到純粹的 Gemini API 請求。

### 🧮 數值型別防腐層 (Type Flow & Anti-Corruption)
整個管線嚴格管制數值型別：
1. **AI 萃取期 (Volatile JSON)**：視為原生 `number`，未受信任。
2. **型別鑄造 (Type Casting)**：強制轉為 `BigInt` (財務金額) 或 `Decimal` (碳排係數)。
3. **資料庫與聚合防禦**：全面透過基於 `Decimal.js` 的 `MoneyUtil` 防腐層進行後續運算，並受到 Prisma Boundary Guard 的嚴密保護，徹底阻絕浮點數漂移。

### 📦 隱藏的底層英雄：DocumentHelper 與 Laria 儲存層
在架構圖中未被獨立列出為 Daemon，但扮演關鍵角色的 `DocumentHelper`，是我們去中心化檔案儲存的基石：
- **切塊編碼 (Sharding)**：當 `MissionIssuer` 準備將任務上傳時，`DocumentHelper` 會在背景將實體檔案切碎（如將 593 bytes 切割為 8 個 119 bytes 的 shards），以符合分散式網路的傳輸標準。
- **組裝恢復 (Recovery)**：當 `MissionPlanner` 接到任務時，`DocumentHelper` 會在背景將這 8 個切片自動找齊並無縫還原回實體檔案 (`Recovered file successfully`)。這使得上層的 Daemons 完全不需要處理複雜的 IPFS/Laria 下載與解碼邏輯。
