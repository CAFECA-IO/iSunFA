# 第 2 章：基礎設施與節點驗證 (Infrastructure & Nodes)

## 1. 基礎設施設計原則

在 iSunFA 的零信任（Zero-Trust）架構中，所有底層依賴模組——包含資料庫、去中心化儲存節點（IPFS）、私有區塊鏈節點（Hardhat/Ganache）以及 API 網關（Nginx）——皆由後端程式動態編排與啟動。

開發團隊或系統管理員**不需要**手動下達 `docker-compose up` 或填寫 `.env` 中的連線密碼，此舉旨在避免人為配置錯誤並阻絕密碼外洩的風險。這一切都收斂在 `/admin/setup` 的 Stage 1 (Verify Engine) 與 Stage 2 (Start Verify Nodes)。

## 2. Stage 1: 引擎與硬體相依性驗證 (Verify Engine)

在系統啟動任何容器或寫入配置之前，系統會先對宿主機 (Host Machine) 進行嚴格的硬體與依賴環境檢查。實作位於 `src/components/admin/setup/verify_engine_step.tsx` 與底層的 `getSystemHardwareInfo()`：

### 2.1 硬體驗證
*   **系統層級**：取得 OS 類型 (Type)、發行版本 (Release) 以及系統架構 (Arch，例如 `arm64` 或 `x64`)。
*   **運算層級**：擷取 CPU 型號與核心數 (Cores)，確保系統具備處理平行加密運算與 AI 萃取管線的算力。
*   **記憶體分配**：計算系統總記憶體 (Total Memory GB)，這是確保 Docker 容器（特別是包含 EVM 節點與資料庫時）不會發生 OOM (Out Of Memory) 的關鍵指標。

### 2.2 Docker 引擎狀態檢測
系統會依序呼叫 `checkDockerInstalled()` 與 `checkDockerRunning()`。只有當 Docker 守護進程 (Daemon) 處於 Active 且版本符合要求時，介面才會顯示綠色的 `SUCCESS` 並允許進入下一階段。

## 3. Stage 2: 節點自動化編排 (Start Verify Nodes)

當硬體驗證通過後，系統便會透過 `startDockerCompose()` (位於 `src/services/setup.service.ts`) 動態生成密碼並喚醒底層節點。

### 3.1 動態密碼學注資機制 (Dynamic Credential Injection)

這是 iSunFA 防篡改架構的核心特徵之一。系統**不會**依賴任何預設密碼：
1.  **亂數生成**：系統透過 Node.js 原生的 `crypto.randomInt`，從安全字元集中生成一組 24 位元的隨機密碼 (`POSTGRES_PASSWORD`)。
2.  **變數注入**：將此隨機密碼連同 `POSTGRES_USER` (`isunfa`)、`POSTGRES_DB` (`isunfa`) 寫入 `.env`。
3.  **URL 編碼與封裝**：將密碼進行 `encodeURIComponent` 後，組裝成符合 Prisma 規範的 `DATABASE_URL`。

### 3.2 網路與節點映射 (Network Routing)

在同一時間，後端會為多個子系統指派固定的 Localhost Port，並寫入 `# PART 1: Core Infrastructure` 環境變數區塊：
*   **Postgres Database** (`POSTGRES_PORT`): `20021`
*   **IPFS/Storage Node** (`STORAGE_DOMAIN`): `http://127.0.0.1:20022`
*   **EVM RPC Node** (`NEXT_PUBLIC_RPC_URL`): `http://127.0.0.1:20024` (用以支撐後續的智能合約部署)
*   **OSRM Router Node** (`OSRM_ROUTER_URL`): `http://127.0.0.1:20025`

### 3.3 容器啟動與心跳檢測

完成 `.env` 配置後，系統會透過 `dockerService.composeUp()` 喚醒所有服務，並進入輪詢狀態（Polling）。

在 `start_verify_nodes_step.tsx` 中，前端會呼叫 `getRunningContainers()`，過濾出以下核心容器：
*   `gateway` (Nginx/Proxy)
*   `database` (PostgreSQL)
*   `storage` (IPFS 節點)
*   `blockchain` (EVM 私有鏈節點)

只有當這些容器的狀態欄位 (Status) 全數顯示為 `Up` 時，系統才會認定底層區塊鏈與資料庫設施已就緒，自動解鎖進入 Stage 3 進行智能合約的鏈上資產部署。這保證了上層邏輯絕不會在下層基礎設施未準備好時產生 Race Condition。
