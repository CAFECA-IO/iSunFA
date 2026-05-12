# 05 Consultant Analysis & Payment On-Chain Saga

本文件詳細記錄了從使用者在前端發起「顧問分析 / 憑證解析 (Journal)」開始，經歷「簽章授權」、「訂單扣款」、「非同步任務執行」、「區塊鏈狀態錨定 (On-Chain Anchoring)」，到任務失敗時觸發的「點數退還機制 (Credit Refund Saga)」的完整生命週期序列圖 (Sequence Diagram)。

此流程完美體現了 iSunFA 系統的「零信任架構」與「分散式交易補償機制」。

## 🔄 核心交易序列圖 (Core Saga Sequence)

以下序列圖涵蓋了前端 (Client)、API 閘道 (Gateway)、資料庫 (DB)、非同步任務處理程序 (Async Worker) 以及區塊鏈智能合約 (Blockchain) 之間的完整交互。

```mermaid
sequenceDiagram
    autonumber
    actor User as 👤 User (AA Wallet)
    participant User as 👤 User (AA Wallet)
    participant Client as 🖥️ Web / UI
    participant API as ⚙️ Node.js API (blockchain_payment)
    participant Blockchain as 🔗 Smart Contract (EntryPoint & MissionBoard)
    participant Laria as 📦 Laria / IPFS (Decentralized Storage)
    participant Planner as 🕵️ Mission Planner (Service)
    participant Executor as 🤖 Mission Executor (AI Worker)
    participant DB as 🗄️ PostgreSQL

    %% Phase 1: User Signature
    rect rgb(230, 240, 255)
        Note over User, API: Phase 1: ERC-4337 簽章授權 (User Signature)
        User->>Client: 點擊「執行顧問分析」
        Client->>User: 請求 FIDO2 簽章 (針對 UserOp)
        User-->>Client: 簽署 Payload (產生 authentication)
        Client->>API: 傳送 userOp, signature, authentication
        API->>API: 透過 webAuthnService 驗證 FIDO2 簽章 ✅
    end

    %% Phase 2: On-chain Payment & Task Creation
    rect rgb(255, 245, 230)
        Note over API, Blockchain: Phase 2: 鏈上扣款與任務創建 (On-chain Payment & Task)
        API->>Blockchain: 透過 publicClient 檢查點數餘額 (balanceOf)
        API->>API: 呼叫 bundlerService.sendUserOpAsync
        API->>Blockchain: 1️⃣ 呼叫 simulateContract(handleOps) 預演合約執行，確保不會 Revert
        Blockchain-->>API: 預演成功 (Simulation Passed)
        API->>Blockchain: 2️⃣ 透過 relayerClient.writeContract(request) 發起真實交易
        Note right of Blockchain: EntryPoint 合約驗證並執行 UserOp<br/>呼叫 MissionBoard 扣除點數並寫入 CID
        Blockchain-->>API: 立即回傳 TxHash (不等待 receipt)
        API->>DB: 標記 Order 為 PAYING 並綁定 TxHash
        API-->>Client: ✅ 立即秒回 TxHash
    end

    %% Phase 3: Mission Planner (The Bridge)
    rect rgb(240, 248, 255)
        Note over Blockchain, Planner: Phase 3: Planner 橋接 (Blockchain -> File System)
        Planner->>Blockchain: 定期輪詢 MissionBoard 合約 (tasks)
        Blockchain-->>Planner: 發現新任務 (status: 0, 取得 CID)
        Planner->>Laria: 透過 storageService.recoverLaria(CID) 下載 mission.json
        Planner->>Planner: 透過 missionGenerator 轉換出執行計畫
        Planner->>Planner: 將 `plan.executor.json` 寫入本機 `MISSION_DIR`
    end

    %% Phase 4: Mission Executor (The AI Engine)
    rect rgb(240, 240, 240)
        Note over Planner, Executor: Phase 4: Executor 執行 (File System -> AI -> DB)
        Executor->>Executor: 掃描 `MISSION_DIR` 尋找待辦資料夾
        Executor->>Executor: 讀取 `plan.executor.json`
        Executor->>Executor: 執行 LLM 解析管線 (混合決策分流)
        alt 任務執行成功 (Success)
            Executor->>Executor: 寫入本地 `result.md` (狀態機轉移)
            Executor->>DB: 將解析結果寫入 PostgreSQL
            Executor->>Executor: ⚠️ (Pending) 計算 Merkle Root
            Executor->>Blockchain: ⚠️ (Pending) 呼叫合約進行狀態根上鏈 (Anchoring)
        else 任務執行失敗 (Failed)
            Executor->>Executor: 寫入 `giveup.md` (打入 DLQ)
            Executor->>Blockchain: ⚠️ (Pending) 發起 Saga 退款合約呼叫
        end
    end

    %% Phase 5: Credit Refund Saga & DLQ (Failure Path)
    rect rgb(255, 230, 230)
        Note over Worker, DLQ: Phase 5: 點數退還與死信佇列 (Credit Refund Saga & DLQ)
        Worker->>DLQ: 將失敗任務寫入 DLQ (`giveup.md` / `failed.json`)
        Worker->>DB: ⚠️ (Pending) 啟動點數退還補償機制 (Refund Saga Tx)
        DB->>DB: ⚠️ (Pending) 退還先前扣除的點數 (Refund Credit)
        DB->>DB: 更新 Order (Status: FAILED_REFUNDED)
        Worker->>DB: 將系統錯誤日誌寫入 AuditLog 供查核
        Client->>API: UI Polling 查詢任務狀態
        API-->>Client: 回傳狀態 FAILED_REFUNDED
        Client-->>User: 顯示「解析失敗，點數已全額退還」
    end
```

## 🏗️ 關鍵架構防禦點 (Architectural Gotchas & Defenses)

1. **極致解耦：Blockchain ↔ Planner ↔ Executor ↔ DB**：
   系統完全切斷了 API 直接呼叫 AI 的路徑。API 只負責把 UserOp 丟上鏈；`MissionPlanner` 只負責從鏈上抓 CID 下載檔案並寫入本地 `MISSION_DIR`；`MissionExecutor` 只負責掃描本地檔案系統執行 AI。這種「零耦合」的 File-System State Machine 架構，讓系統能抵禦極端流量峰值。
2. **不可否認性 (Non-repudiation) ✅ FIDO2 已實作**：
   所有的「發起解析 / 扣款」動作，都必須在前端使用 FIDO2 進行簽章。後端透過 `webAuthnService` 計算真實 `trueUserOpHash` 比對，確保四大會計師查核時無法被 DBA 竄改。
3. **區塊鏈智能合約扣款 (On-chain ERC-4337 UserOp) ✅ 已實作**：
   呼叫 `bundlerService.sendUserOpAsync` 將 UserOp 發送至 EntryPoint 智能合約前，會先透過 `publicClient.simulateContract` 進行鏈上預演，確保使用者簽章正確且點數足夠扣款，避免發送註定會 Revert 的垃圾交易。確認安全後才呼叫 `writeContract` 發射，並由 `MissionBoard` 合約進行原子扣款並紀錄 CID，達成 Web3 級別的分散式資金流動。
4. **⚠️ (Pending) 退款補償機制 (Saga Pattern)**：
   當 LLM 服務中斷被打入 DLQ (`giveup.md`) 時，Executor 必須具備「發起逆向智能合約退款」的 Saga 補償能力，確保使用者點數原機退還。目前僅實作寫入 DLQ。
5. **⚠️ (Pending) 狀態根上鏈 (State Root Anchoring)**：
   任務成功後，除了寫入 DB，Executor 需計算結果的 Merkle Root 寫回區塊鏈智能合約。政府稽核員未來只需比對鏈上 Hash 與本地資料庫 Hash 即可。
