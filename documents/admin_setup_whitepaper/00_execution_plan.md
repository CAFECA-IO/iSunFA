# iSunFA 系統初始化架構白皮書 (Admin Setup Whitepaper) - 執行計劃

## 1. 專案背景與目標
本計劃旨在將 iSunFA 系統中 `/admin/setup` 所實作之「八階段自動化初始化流程」轉化為一份國家級架構與區塊鏈專業水準的白皮書。
透過詳盡且精簡的技術分析與流程圖（Mermaid），闡述系統如何以「零信任 (Zero-Trust)」、「密碼學驗證」及「去中心化節點」等核心原則，自動化建構符合大型企業/國家級審計標準的基礎設施。

## 2. 文件結構與分類 (位於 `documents/admin_setup_whitepaper/`)
為確保分析精簡且詳細，白皮書將切分為多份文件，每份文件聚焦特定的架構與流程：

*   **`00_execution_plan.md`**：本執行計劃書（當前文件）。
*   **`01_architecture_overview.md`**：架構總覽與設計哲學
    *   探討初始化架構的「防篡改」、「狀態鎖定」及「環境動態驗證 (Environment Signature)」機制。
    *   附帶：高階系統初始化總流程圖 (End-to-End Setup Flow)。
*   **`02_infrastructure_and_nodes.md`**：底層設施與節點驗證 (Step 1 & 2)
    *   Step 1: Verify Engine (環境相依性與引擎驗證)
    *   Step 2: Start Verify Nodes (區塊鏈 RPC 及驗證節點啟動)
*   **`03_onchain_deployment.md`**：鏈上資產與智能合約部署 (Step 3 & 4)
    *   Step 3: Fund Wallet (Gas 費用與錢包注資機制)
    *   Step 4: Deploy Contracts (動態合約部署，包含 KYC、信用點數、會員系統與 SCW 工廠)
*   **`04_data_and_identity.md`**：資料錨定與超級管理員核發 (Step 5 & 6)
    *   Step 5: Init Database (資料庫配置與 Prisma 結構初始化)
    *   Step 6: Super Admin (非對稱加密與超級管理員密碼學身份簽發)
*   **`05_environment_finalization.md`**：網域配置與狀態封裝 (Step 7 & 8)
    *   Step 7: Domain Config (應用服務及外部 API 金鑰配置)
    *   Step 8: Finalize Env (最終環境簽章封裝與不可逆鎖定)

## 3. 執行階段 (Milestones)

### 階段一：底層代碼盤點與流程梳理 (目前階段)
*   [x] 分析 `src/app/admin/setup/page.tsx` 狀態機邏輯。
*   [ ] 深入檢視 `_api/` 下的配置 (如 `config.api.ts`, `identity.api.ts`) 及 8 個步驟之實作細節。
*   [ ] 完成此 `00_execution_plan.md`。

### 階段二：核心架構與區塊鏈機制撰寫
*   [ ] 產出 `01_architecture_overview.md`，使用 Mermaid 繪製總體流程。
*   [ ] 產出 `02_infrastructure_and_nodes.md` 與 `03_onchain_deployment.md`。重點分析從鏈下節點啟動到鏈上合約部署的自動化銜接。

### 階段三：資料與身分安全機制撰寫
*   [ ] 產出 `04_data_and_identity.md`，解析 Super Admin 的 ECC 金鑰生成與資料庫鎖定設計。
*   [ ] 產出 `05_environment_finalization.md`，說明防篡改（Environment Signature）之實作。

### 階段四：審閱與修潤
*   [ ] 確保所有文件之間的連結與邏輯一致。
*   [ ] 加入各環節的「容錯與恢復機制 (Fallback & Error Handling)」分析。

## 4. 下一步行動
若您同意此執行計劃，我將立即展開**階段二**，先行調閱並分析相關步驟的底層代碼 (如 `verify_engine_step.tsx` 等)，然後為您撰寫 `01_architecture_overview.md` 及後續文件。
