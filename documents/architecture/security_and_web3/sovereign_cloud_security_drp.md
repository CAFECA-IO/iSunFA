# 🏢 國家級主權雲端安全性白皮書與災難復原計畫 (DRP)

（Todo: 20260512 - 諮詢Luphia）

> **Date**: 2026-05-10
> **Author**: Tzuhan

> **Document Status**: Draft (For TWSC & Government Deployment)
> **Compliance**: ISO 27001, ISO 27017

為確保 iSunFA 具備承載國家級關鍵基礎設施 (CII) 與大型上市櫃公司（如台積電等級）的能耐，本文件定義系統的高可用性與安全性部署標準。

## 1. 國際資安標準對應 (ISO Compliance)

**[Antigravity 推薦基礎架構 (尚未實施)]**：

- **ISO 27001 (資訊安全管理)**：資料庫採用 AES-256 靜態加密，傳輸層採用 TLS 1.3。伺服器憑證受 HashiCorp Vault 控管。
- **ISO 27017 (雲端服務資安)**：計畫部署於台灣主權雲端 (TWSC)。

## 2. Web3 檔案系統之高可用性與異地備援 (HA/DR)

目前 `mission.executor.service.ts` 的非同步任務調度，其儲存底層已全面揚棄傳統的中心化雲端硬碟 (如 AWS EFS)，轉向具備抗毀損能力的 Web3 基礎設施。針對此架構的 DRP 策略：

**[現有實作與防禦架構]**：

- **IPFS 與 Laria 檔案切塊加密**：`MISSION_DIR` 內的敏感財務憑證與狀態，皆透過 Laria 進行檔案切塊 (Chunking) 與加密傳輸，並依賴 IPFS 網路，確保單點故障不會導致資料遺失或外洩。
- **Software RAID 備援**：節點底層搭配 Software RAID，確保實體磁區損壞時能自動無縫接管，滿足主權雲的高可用性要求。
- **資料庫雙活備援 (僅限主系統)**：API 主系統的 PostgreSQL 採用多可用區部署，但請注意：**Worker 節點本身與主資料庫完全物理隔離**，互不影響彼此的災難復原能力。

## 3. 效能基準測試與無極限擴展性 (Performance Benchmarking)

**[架構實作與擴展策略]**：

- **Worker 無狀態橫向擴展 (Shared-Nothing Scaling)**：因為 Worker 是一個純粹聆聽區塊鏈合約的外部節點，每個 Worker 拉取任務後，皆在自己**完全獨立隔離的 IPFS/Laria 儲存環境**中執行。由於不存在共用的掛載目錄 (No Shared Volume)，自然免疫了任務爭搶與競爭條件 (Race Condition)。K8s HPA 可以毫無顧忌地動態擴展出無限個 Pods，實現完美的 100% 無共享水平擴展。
- **API 斷路器與非同步降級 (Circuit Breaker)**：當 Gemini LLM 服務中斷或限流時，Worker 會將任務放入 DLQ 狀態不斷重試。此時前端 API 仍可無感地「只收單、寫入區塊鏈」，完全不會被塞爆，達成最完美的降級模式。
