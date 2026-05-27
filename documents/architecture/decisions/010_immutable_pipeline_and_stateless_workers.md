# ADR 010: Immutable Pipeline, File-System Queue, and Stateless Workers

> **Date**: 2026-05-27
> **Author**: Tzuhan & Agent Antigravity
> **Status**: Accepted
> **Context**: iSunFA 的核心設計包含極端要求防重 (Idempotency) 與高可用性的自動化攤銷 (Amortization) 引擎。在跨國時區與多節點部署下，如何確保排程絕不重複扣款 (Double Booking)，同時又避免被 IPFS 節點的上傳延遲給拖慢速度？

本決策紀錄詳述了系統如何巧妙結合 Web3 區塊鏈的唯一性共識 (Unique Constraint) 與 Web2 本地檔案系統的高效能，實作出一套無狀態 (Stateless)、無資料庫負擔的排程工作佇列。

---

## 1. 自動攤銷工作者 (AmortizationWorker) 的困境

在傳統 Web2 架構中，我們通常使用 BullMQ、Redis 或關聯式資料庫的 row-level lock 來確保定時任務不會被重複執行。
然而，在去中心化的金融系統中，我們希望任務的發佈與執行狀態能綁定在不可篡改的智能合約 (`MissionBoard`) 上。

標準的 `MissionBoard.createTask(cid)` 流程需要：
1. 產生任務 `mission.json`。
2. 上傳至 IPFS 網路 (Helia / Pinata)。
3. 取得 CID。
4. 將 CID 送上區塊鏈。

這帶來了兩個問題：
1. **延遲極高**：IPFS 的廣播與 Pinning 需要時間。
2. **潛在重複**：如果排程因為伺服器時區錯亂或異常重啟而被連續觸發兩次，兩次產生的檔案因為 Timestamp 不同，會產生兩個不同的 CID，進而導致區塊鏈收下兩個任務，造成客戶被攤銷兩次。

---

## 2. 決策：偽裝 CID 與 Web3 全局冪等性 (Global Idempotency)

為了解決這個問題，`AmortizationWorker` 實作了一個非常巧妙的「Hack (偷吃步)」機制：完全拔除 IPFS，並利用業務屬性產生決定性雜湊 (Deterministic Hash)。

### 2.1 決定性雜湊 (Deterministic Hash) 取代 CID
系統不再上傳任何檔案到 IPFS，而是擷取排程的絕對不變特徵：
```typescript
// 帳本ID + 執行年月 + 科目代碼 + 排程ID
const hashInput = `${schedule.accountBookId}_${yearMonth}_${schedule.assetAccountCode}_${schedule.id}`;

// 產生 keccak256 決定性雜湊
const hashHex = keccak256(toUtf8Bytes(hashInput));
```
這意味著，無論今天這台伺服器當機重啟幾次，只要是同一個月 (`yearMonth`) 針對同一筆排程，算出來的 `hashHex` 永遠一樣。

### 2.2 偷渡雜湊至智能合約
接著，Worker 直接把這個 `hashHex` 當作 `cid` 參數傳給智能合約：
```typescript
functionName: "createTask",
args: [hashHex, 0n],
```
因為智能合約層面必定設有 `cid` 的 Unique Constraint（或是我們依賴它不可篡改的事件紀錄追蹤），如果同一個月有人試圖再次發送相同的 `hashHex`，交易就會被 Revert 或在後續驗證被捨棄。這賦予了系統 **「全球級距的絕對防重 (Idempotency)」**。

---

## 3. Web2 檔案系統佇列 (File-System Queue) 落地

既然任務已經成功在鏈上建立 (`TaskCreated` 事件發出並取得 sequential `taskId`)，但沒有 IPFS，後續的 Executor 該怎麼取得任務內容？

答案是：**直接寫入本地的 Shared-Nothing 檔案系統。**

Worker 拿到 `taskId` 後，直接在本地伺服器的硬碟建立任務夾：
```typescript
const taskDir = path.join(missionDirPath, taskIdStr); // 例如: missions/123
await fs.writeFile(path.join(taskDir, "result.md"), resultMd, "utf8");
```

### 3.1 零延遲 (Zero IPFS Latency)
由於直接將洗淨好的 `dbSyncPayload` 封裝為 `result.md` 寫入本地，後面的流程只需要依靠 File System Polling，速度飛快，完全不需要等待網路 I/O。

### 3.2 無狀態運算 (Stateless Workers)
這種架構也宣告了 Worker 的無狀態化。它唯讀資料庫、利用數學引擎 (`calculateStatelessAmortizationForMonth`) 推導當月應攤銷額，透過 Web3 鎖定冪等性，最後將結果丟給本地 File-System Queue，交由 `IssueRecorder` 盲推寫回資料庫。
Worker 自身**不修改任何 DB 狀態 (如累積已攤銷金額)**，徹底消除了分散式系統中常見的 State Sync 夢魘。

---

## 4. 總結 (Consequences)

透過這項決策，我們達成了：
1. **零成本的高可用防重機制**：不需架設 Redis 或依賴複雜的 DB Transaction，純靠 Keccak256 與區塊鏈解決 Double Booking。
2. **極速的 Pipeline**：捨棄 IPFS，擁抱 File-System I/O。
3. **無狀態化**：為未來 Worker 節點的橫向擴展 (Horizontal Scaling) 鋪平了道路。

### ⚠️ 代價與風險 (Risks & Trade-offs)
- **破壞了去中心化的橫向擴展性 (Breaks Decentralized Scaling)**：這是最致命的代價。原本 IPFS 的架構下，A 節點發包，全世界任何一台 B 節點都可以透過 CID 下載任務來接力執行。現在寫入「本地硬碟 (MissionDir)」，這意味著接手的 `MissionCommitor` 或 `IssueRecorder` 必須跟 `AmortizationWorker` 跑在同一台實體伺服器（或掛載同一個 NFS 共享硬碟）上，否則後續節點會找不到檔案而卡死。

---

## 5. 緩解措施：被動式幽靈任務自我修復 (Mitigation: Lazy Self-Healing)

由於拔除 IPFS 後，任務的 Payload (如 `result.md`) 僅存在於發起者的本地硬碟中。若該伺服器發生硬碟損壞或被強行重啟 (OOMKilled)，原本已上鏈的任務將會因為找不到本地檔案而變成「幽靈任務 (Ghost Task)」。而下個月 Worker 再次執行時，又會因為區塊鏈的唯一性限制 (Unique Constraint) 被 Revert，導致客戶永遠漏掉該期攤銷。

為了不破壞這套極簡高效的架構，且不增加額外的 Cron Job 負擔，我們在 `AmortizationWorker` 實作了 **「被動式自我修復 (Lazy Healing)」** 機制：

1. **攔截與打撈 (Event Log Extraction)**：當 `createTask` 因為重複的 `hashHex` 而 Revert 時，Worker 會立即啟動 Healing Mode。它會往前掃描最近 30 天的區塊鏈 `TaskCreated` 事件日誌 (Event Logs)，找出與 `hashHex` 匹配的歷史 `taskId`。
2. **決定論重建 (Deterministic Reconstruction)**：打撈到 `taskId` 後，若發現本地 `missions/${taskId}` 目錄不存在，系統會再次利用「無狀態攤銷引擎」重新算一次當月應攤銷額，並當場把遺失的 `result.md` 補回硬碟中。
3. **優勢**：完美遵循了 **"Don't pay for it until you need it"** 的架構哲學。平常不耗費任何額外算力，只有在碰撞發生且檔案遺失的災難情境下，才精準發動修復，達成 100% 的災難復原 (Disaster Recovery)。
