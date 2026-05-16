# 🏢 國家級主權雲端安全性白皮書與災難復原計畫 (DRP)

> **Date**: 2026-05-15
> **Author**: Tzuhan
> **Document Status**: Active (Architectural Blueprint)
> **Compliance**: ISO 27001, ISO 27017, ISO 27701

為確保 iSunFA 具備承載國家級關鍵基礎設施 (CII) 與大型上市櫃公司的能耐，本文件定義系統的高可用性與安全性部署標準，並將**「區塊鏈智能合約」與「去中心化儲存」**作為系統容災與災難復原的終極防線。

## 1. 國際資安標準對應 (ISO Compliance Blueprint)

iSunFA 系統的基礎架構將嚴格遵循以下國際標準，滿足主權雲端 (如 TWSC) 的高規格資安要求：

- **ISO 27001 (資訊安全管理)**：
  - **資料靜態加密與金鑰管理**：所有關聯式資料庫 (PostgreSQL) 採用 AES-256 靜態加密。
  - **傳輸層加密**：系統內部微服務間通訊與對外 API 皆強制採用 TLS 1.3 協定。
- **ISO 27017 (雲端服務資安)**：
  - 核心系統預計部署於台灣主權雲端 (TWSC)，並透過 K8s 進行資源隔離與權限控管。
- **ISO 27701 (隱私資訊管理) 與 FHE (全同態加密)**：
  - 針對高度敏感的商業機密與憑證檔案，系統將於 `laria.ts` 寫入 IPFS 節點之前，導入全同態加密 (FHE)。這確保了即使儲存節點遭到駭客攻破，也無法解密或窺探資料內容，落實真正的「可用不可見」。

## 2. Web3 檔案系統之高可用性與異地備援 (HA/DR)

傳統 Web2 系統的災難復原計畫通常依賴「資料庫雙活備援」與「磁碟陣列」。而在 iSunFA 的 Web3 零信任架構中，我們將這層防禦提升至**去中心化網路級別**。

### 2.1 終極容災：區塊鏈即備份 (Blockchain as the Ultimate Backup)
- **傳統痛點**：若主機房遭遇毀滅性打擊（如地震、火災）導致 API 伺服器與主 PostgreSQL 資料庫雙雙損毀，傳統系統將面臨資料永久遺失的風險。
- **iSunFA 解決方案**：
  系統的所有的核心業務邏輯（包含憑證解析任務、處理進度、結果檔案 CID），都已經由 `mission_board.sol` 同步記錄在區塊鏈上。即使 Web2 基礎設施全毀，我們只需啟動全新的資料庫，並讓 Node.js 後端節點**「重新同步並回放區塊鏈上的所有合約事件 (Event Sourcing)」**，即可完美且 100% 重建整個系統的歷史狀態與業務資料，實現最極致的災難復原。

### 2.2 儲存層與運算層的物理隔離
- **IPFS 與 Laria 分散式儲存**：`MISSION_DIR` 內的財務憑證與產出結果，皆透過 Laria 進行切塊 (Chunking) 並分散至 IPFS 網路。單一節點的物理毀損完全不會影響檔案的完整性。
- **Shared-Nothing Worker 橫向擴展**：非同步任務的 Executor 節點是一個純粹聆聽區塊鏈的外部節點，在完全獨立的環境中執行。Worker 與主資料庫 (PostgreSQL) 之間**沒有任何直接連線與共用目錄 (No Shared Volume)**。這種設計先天免疫了競爭條件 (Race Condition)，並且讓 Worker 具備無限擴展能力。

## 3. 效能基準與無極限擴展性 (Performance Benchmarking)

- **API 斷路器與非同步降級 (Circuit Breaker)**：
  當外部服務（如 Gemini LLM 或外部資料源）中斷或遭到限流 (Rate Limit) 時，Worker 會將任務放入 DLQ (死信佇列) 並持續重試。由於任務的分派已完全交由 `mission_board.sol` 非同步接管，此時前端 API 仍可無感地「收單、發布區塊鏈事件」，系統完全不會被塞爆或引發連鎖崩潰 (Cascading Failure)，達成最完美的降級防禦模式。
