# 🏢 國家級主權雲端安全性白皮書與災難復原計畫 (DRP)

> **Date**: 2026-05-10
> **Author**: Tzuhan

> **Document Status**: Draft (For TWSC & Government Deployment)
> **Compliance**: ISO 27001, ISO 27017

為確保 iSunFA 具備承載國家級關鍵基礎設施 (CII) 與大型上市櫃公司（如台積電等級）的能耐，本文件定義系統的高可用性與安全性部署標準。

## 1. 國際資安標準對應 (ISO Compliance)

**[Antigravity 推薦基礎架構 (尚未實施)]**：
*   **ISO 27001 (資訊安全管理)**：資料庫採用 AES-256 靜態加密，傳輸層採用 TLS 1.3。伺服器憑證受 HashiCorp Vault 控管。
*   **ISO 27017 (雲端服務資安)**：計畫部署於台灣主權雲端 (TWSC)。

## 2. 檔案系統佇列之高可用性與異地備援 (HA/DR)

目前 `mission.executor.service.ts` 高度依賴本地端 `MISSION_DIR` 進行非同步任務調度。針對此架構的 DRP 策略：

**[現有實作]**：
*   本機檔案系統輪詢 (`fs.readdir`, `fs.readFile`)。

**[Antigravity 推薦基礎架構 (尚未實施)]**：
*   **分散式檔案系統 (DFS)**：`MISSION_DIR` 將掛載於 AWS EFS 或主權雲等效服務，確保無縫接管佇列。
*   **資料庫雙活備援 (Active-Active)**：PostgreSQL/Prisma 採用多可用區 (Multi-AZ) 部署。

## 3. 效能基準測試與擴展性 (Performance Benchmarking)

**[Antigravity 推薦基礎架構 (尚未實施)]**：
*   **Worker 橫向擴展 (Horizontal Pod Autoscaling)**：依據未處理資料夾數量自動動態擴展 Worker 節點。
*   **API 限流與斷路器 (Rate Limiting & Circuit Breaker)**：當 LLM 服務中斷時，自動轉入降級模式（只收單，不解析）。
