# 🛡️ Mission Board：去中心化任務信託與仲裁架構 (Decentralized Escrow & Arbitration)

> **Date**: 2026-05-15
> **Author**: Tzuhan
> **Document Status**: Active (Architectural Blueprint)
> **Core Tech**: ERC-721, Escrow, Event-Sourcing, Dynamic KYC

本文件詳細剖析 `contracts/mission_board.sol` 的底層架構。該合約不僅僅是一個「任務發佈看板」，而是 iSunFA 實現「自動化全鏈上稽核」與「未來去中心化 AI 算力網路」的最核心基礎設施。

---

## 1. 架構核心：任務即資產 (Task as ERC-721 NFT)

在傳統系統中，一次運算任務通常只是一筆資料庫紀錄；但在 iSunFA 中，每一次發起的憑證解析任務，都是一個不可竄改的數位資產。

- **運作機制**：當客戶（發起方）呼叫 `createTask(cid, reward)` 時，智能合約會將使用者傳入的 `cid` (儲存於 IPFS/Laria 上的任務計畫與原始憑證位址) 綁定為 `tokenURI`，並當場鑄造一枚 ERC-721 NFT 給發起方。
- **審計價值**：這個設計讓每一份任務（以及最終產出的財報）都具備了唯一的區塊鏈資產證明。政府或會計師查驗時，這枚 NFT 就是「原始憑證未經竄改」的終極防護罩。

---

## 2. 三位一體流轉：資金、資料與仲裁 (Escrow & Arbitration)

為了解決傳統 Web2 系統容易出現的「賴帳」與「退款地獄」，本合約實作了完整的 Web3 資金信託與爭議解決機制：

### 2.1 資金信託 (Escrow First)
發起任務時，系統強制將使用者的 `rewardToken` (ISC 代幣) 鎖定在合約金庫內。這保障了後續執行任務的 Worker 一定能拿到報酬，消除了交易對手風險 (Counterparty Risk)。

### 2.2 非同步資料錨定 (Asynchronous Data Anchoring)
Worker 節點在鏈下完成複雜的 AI 萃取與數學計算後，呼叫 `submitResult`，將產出結果的 IPFS 位址 (`resultCid`) 以及消耗的 Token 數量寫回智能合約。
- **防弊機制**：這確保了 Input (`contentCid`) 與 Output (`resultCid`) 產生了無法被任何資料庫管理員 (DBA) 解開的密碼學綁定。

### 2.3 防呆與爭議仲裁 (Quality Guard & Dispute)
這套合約為「去中心化運算網路」預留了極大的擴展性：
1. **Pending Review**：Worker 提交結果後，資金不會立刻釋放。發起方 (或系統自動驗證節點) 需呼叫 `approveSubmission`，資金才會真正轉入 Worker 錢包。
2. **Dispute Resolution**：若 Worker 產出垃圾資料或遭遇 AI 嚴重幻覺，發起方可呼叫 `rejectSubmission`。此時 Worker 擁有 3 天的爭議期 (`DISPUTE_PERIOD`) 來呼叫 `raiseDispute`，最後由系統官方 (`DEFAULT_ADMIN_ROLE`) 透過 `resolveDispute` 進行終局裁決，決定資金的歸屬。

---

## 3. 微服務解耦：動態身分防護 (Decoupled Governance)

合約本身**不維護**黑名單與會員狀態，而是貫徹了極致的微服務解耦：

- **動態 KYC 攔截**：所有寫入操作（如 `createTask`, `submitResult`, `reportTaskParticipant`）皆掛載了 `onlyNotBlacklisted` 修飾子。該修飾子會向獨立部署的 `Dynamic KYC Membership` 合約進行查詢，確保只有合規的 ONCHAINID 持有者能參與生態系。
- **事件驅動更新 (Event Sourcing)**：當合約管理員呼叫 `resolveReport` 確認某個 Worker 惡意作弊時，合約僅發出 `ReportResolved` 事件。這個事件會被 Node.js 系統的 Event Listener 捕捉，進而自動更新全局的黑名單 API 與鏈上 KYC 狀態，實現了「Web3 驅動 Web2」的現代化架構。

---

## 結論

`mission_board.sol` 用極簡的程式碼，同時解決了「審計軌跡防篡改」、「非同步運算資金結算」與「去中心化節點治理」三大難題。這是 iSunFA 系統最堅固的底層防線。
