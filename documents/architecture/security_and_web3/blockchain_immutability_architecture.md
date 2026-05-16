# 🔗 iSunFA 零信任財報稽核架構 (Zero-Trust Audit & Immutability Architecture)

> **Date**: 2026-05-15
> **Author**: Tzuhan
> **Context**: 針對各國政府與監管機構對於「AI 自動化產出財報」的防弊疑慮，本文件定義 iSunFA 如何透過 `mission_board.sol` 與密碼學底層技術，實現「自動化全鏈上稽核」與「密碼學級別的不可篡改性 (Cryptographic Immutability)」。

## 🏛️ 核心技術宣示 (The Web3 Manifesto)

傳統 Web2 資料庫 (如 PostgreSQL) 在最高級別的合規審查中，始終存在「DBA 惡意竄改」的單點故障風險。
為了達到政府與 Big 4 級別的信任，iSunFA 完全捨棄了依賴 Node.js API 層的傳統 Web2 RBAC 防禦，直接將系統架構提升為**「區塊鏈智能合約作為單一真相來源 (SSOT)」**的零信任模式。

---

## 🔍 單一真相來源：mission_board.sol (Single Source of Truth)

系統的不可篡改性並非建立在事後的補救或備份上，而是深深嵌入在業務執行的第一線：

### 1. 一鍵發動與資金信託 (One-Click Initiation & Escrow)
- **實作位置**：`mission_board.sol` 的 `createTask`。
- **防護機制**：使用者（客戶）發起憑證解析任務時，必須透過 AA Wallet 進行一次性的密碼學簽章，並鎖定代幣。這個動作在鏈上鑄造了一個 ERC-721 NFT，將使用者的輸入憑證 (`contentCid`) 永久錨定為該任務的 `tokenURI`。
- **審計意義**：達到「不可否認性 (Non-repudiation)」。任何人包含發起方與系統，都具有區塊鏈級別的簽章效力，且輸入的原始證據絕對無法被靜默替換。

### 2. 自動化軌跡錨定 (Automated Result Anchoring)
- **實作位置**：`mission_board.sol` 的 `submitResult` 與 Event Sourcing。
- **防護機制**：Executor (AI 引擎) 解析完成後，並非僅將結果寫入資料庫，而是由系統自動呼叫智能合約，將最終產出結果的 IPFS 位址 (`resultCid`) 與消耗紀錄寫入區塊鏈。
- **審計意義**：這直接消滅了「內部員工私下竄改報表」的可能性。因為 Input (`contentCid`) 與 Output (`resultCid`) 的對應關係已經被智能合約的執行履歷完美鎖死。

### 3. 去中心化爭議仲裁 (Decentralized Dispute Resolution)
- **實作位置**：`mission_board.sol` 的 `rejectSubmission` 與 `raiseDispute`。
- **防護機制**：取代傳統 Web2 系統的「主管人工解凍」或 Saga 退款，若 AI 產出錯誤，系統將進入鏈上的仲裁賽局。所有對異常資料的人為介入與判決，皆會成為不可竄改的鏈上交易。

---

## 🌊 Web3 稽核深水區：會計實務與區塊鏈的碰撞 (The Deep Waters)

在將會計實務搬上區塊鏈的過程中，我們必須在智能合約與資料庫設計中預防以下問題：

### 1. 拒絕「垃圾的不可篡改性」與排放係數快照 (Emission Factor Snapshots)
- **盲點**：區塊鏈只能保證資料沒被竄改，無法保證一開始寫入的資料是正確的。如果 AI 產生了充滿幻覺的碳排數據並寫上鏈，那只是把錯誤永久刻在區塊鏈上。此外，碳排放係數每年都會更新。
- **架構實作**：在上傳至 IPFS (`resultCid`) 的 `EsgRecord` 中，**絕對不能**只包含活動數據 (如用電度數)。我們必須將「當下系統使用的碳排放係數數值」一起 Hash 進檔案中。這確保了即便明年政府更新了係數表，區塊鏈上的帳本依然能夠透過去年的歷史係數進行完美驗證。

### 2. 狀態根版本控制與追溯重編 (Versioned State Roots for Restatements)
- **盲點**：區塊鏈的核心是「不可逆」，但會計實務中允許「前期損益調整 (Retrospective Restatements)」。一旦企業合法地追溯重編財報，底層的 Voucher 就會變動。
- **架構實作**：透過 `mission_board.sol` 任務發包的特性，每一次的追溯調整本質上就是發起一次「新的 Task」。新舊版本的財報各自擁有獨立的 `taskId` 與 `resultCid`。系統（或後端資料庫）只需維護這兩個任務間的「繼承或修正關係」，即可完美融合 Web3 的不可篡改性與會計的彈性。

---

## 總結 (Conclusion)

iSunFA 透過 `mission_board.sol` 達成了**「自動化全鏈上稽核」**。我們不需再像過去那樣依賴資料庫層面的 Hash-Chained Logs 或是人工的匯出二次簽章。系統的每一次運轉，天生就是一筆密碼學級別絕對信任 (Cryptographic Absolute Trust) 的公證紀錄。
