# mission.md
撰寫以下智能合約，並設置 npm run init 即可自動部署，
使用 NEXT_PUBLIC_RPC_URL 作為 RPC URL
ISUNCOIN_PRIVATE_KEY 作為私鑰

## A. 任務版智能合約需求規格

**整合 WETH10 模式與 ERC-3643 自動部署架構**

### 1. 系統架構與初始化

* **1.1 自動部署機制**：
* `TaskBoard` 合約部署時，須在 `constructor` 內同步完成 **ERC-3643 協議套件** 的部署。
* 套件包含：`Token`、`Identity Registry`、`Identity Registry Storage`、`Claim Topics Registry` 及 `Trusted Issuers Registry`。


* **1.2 貨幣機制 (WETH10 模式)**：
* 採用 **1:1 鑄造機制**。使用者發送 **ISC (或 ETH)** 至合約觸發 `deposit()`，合約將 1:1 鑄造合規代幣給使用者。
* 使用者可隨時銷毀代幣並觸發 `withdraw()`，合約將退回等額資產。


* **1.3 身份權限管理**：
* `Identity Registry` 的管理權限 (Agent/Owner) 歸屬於 `TaskBoard` 的部署者。
* 部署者負責將合格的使用者（發佈者與開發者）加入白名單，確保所有鏈上操作皆符合合規性檢查。



### 2. 資料結構定義

* **2.1 Task (任務) 結構** (Key: `taskId` / IPFS CID):
* `publisher`: 任務發佈者地址。
* `rewardAmount`: 總獎金金額（代幣單位）。
* `deadline`: 截止 Unix Timestamp。
* `status`: `Open` (進行中), `Evaluating` (驗收中), `Settled` (已結算)。
* `submissions`: 提交者地址陣列。
* `approvedSubmitters`: 驗收通過之地址清單。


* **2.2 Submission (成果) 結構** (Key: `workCid` / IPFS CID):
* `workCid`: 成果內容之 IPFS CID。
* `submitter`: 提交者地址。
* `isApproved`: 是否通過驗收（預設 `false`）。



### 3. 核心功能規格

* **3.1 代幣轉換 (Wrap/Unwrap)**:
* `deposit()`: 驗證身份後存入底層資產，鑄造 ERC-3643 代幣。
* `withdraw(uint256 amount)`: 銷毀代幣，取回底層資產。


* **3.2 createTask(string _cid, uint256 _reward, uint256 _duration)**:
* **邏輯**：檢查餘額 -> 計算 `deadline` -> 執行代幣託管 (Escrow) -> 以 `_cid` 為 Key 初始化任務。


* **3.3 listTask() (View)**:
* **邏輯**：回傳所有任務 ID 列表及狀態資訊，供前端銜接 IPFS 讀取 Markdown。


* **3.4 submitWork(string _taskId, string _workCid)**:
* **前置條件**：任務為 `Open` 且未過期；提交者必須位於 `Identity Registry` 白名單中。
* **邏輯**：記錄 `workCid` 並更新 `submissions` 陣列。


* **3.5 approveWork(string _taskId, address[] _winners)**:
* **前置條件**：僅限該任務的 `publisher` 呼叫。
* **邏輯**：標記 `_winners` 為 `isApproved = true` 並轉入 `Evaluating` 狀態。


* **3.6 settlement(string _taskId)**:
* **平分機制**：`rewardAmount / approvedSubmitters.length`。
* **流標處理**：若截止後無勝出者，獎金全額退回 `publisher`。
* **餘額處理**：除法餘數 (Dust) 退還 `publisher`。



### 4. 特殊機制與安全性

* **4.1 身份連動**：所有代幣轉帳與任務操作均會觸發 ERC-3643 的 `isVerified` 檢查。
* **4.2 資金隔離**：合約底層資產僅能透過 `withdraw` 流程流出。
* **4.3 事件追蹤**：須實作 `TaskCreated`, `WorkSubmitted`, `TaskSettled`, `EthWrapped`, `EthUnwrapped` 等 Event。