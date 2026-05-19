# 📚 iSunFA 文件索引與 AI 協作者導讀指南 (Document Index & AI Onboarding)

> **Date**: May 2026
> **Author**: Tzuhan
> **Version**: 1.0
> **Status**: Active
> **Last Updated**: 2026-05-11

> **致所有新加入的工程師與 AI 協作 Agent**：
> 歡迎加入 iSunFA 開發團隊！iSunFA 是一個挑戰**四大會計師 (Big 4) 查帳標準**的企業級財務與 ESG 混合審計系統。我們對精準度、型別安全、防禦性編程與代碼品味有極高的要求。
>
> 在您撰寫或修改任何一行程式碼之前，**強烈建議您優先閱讀以下【必讀鐵律】區塊的文件**，這將大幅降低您的程式碼被退回或遭到系統 Reject 的機率。

---

## 🌟 第一階段：必讀鐵律 (Must Read for AI & Humans)

若您是第一次接觸本專案，請務必按照順序閱讀以下三份文件，它們定義了我們如何寫 Code 以及如何限制 AI：

1. **[團隊協作與程式碼最佳實踐](engineering_guidelines/coding_guidelines.md)**
   👉 定義了架構分層 (API-Service-Repo)、禁用 `any`、以及如何優雅地隔離資料庫錯誤。
2. **[註解與標籤規範指南](engineering_guidelines/work_guidelines/annotation.md)**
   👉 **極度重要**！本專案強制要求所有註解必須具備時間戳與作者 (例如 `// Info: (20260511 - Tzuhan)`)。未遵守此規範的註解將被視為違規。
3. **[LLM 實作規範與邊界防護指南](architecture/ai_and_analytics/llm_implementation_guideline.md)**
   👉 說明了 AI 在系統中的定位。絕對禁止讓 AI 算數學、做業務邏輯判斷，並規範了「混合決策管線 (Hybrid Pipeline)」與「English-First Prompting」的防幻覺實作方式。
4. **[數值精度處理規範](engineering_guidelines/numerical_precision_guideline.md)**
   👉 說明為何我們在財務與碳排計算中全面棄用原生 `number`，並強制使用 `Prisma.Decimal` 與 `BigInt`。

---

## 🏛️ 第二階段：系統架構與藍圖 (Architecture & Blueprint)

了解系統的宏觀架構與演進路線：

- **[iSunFA E2E Core Engine 路線圖 (Roadmap v2)](architecture/e2e_roadmap_v2.md)**
  - 本專案的最高戰略指導文件。包含了「零捏造」、「財務三表勾稽」、「ESG 質量守恆勾稽」等核心系統防線。

### 👑 國家級與會計師 (Big 4) 合規白皮書

- **[iSunFA 內部控制與系統自動控制說明書 (ITAC)](architecture/compliance_and_audit/internal_control_and_audit_framework.md)**：COSO 框架對應與去中心化仲裁 (Arbitration) 規範。
- **[企業機密隔離與加密計算架構 (FHE & Privacy-Preserving)](architecture/security_and_web3/zkp_privacy_preserving.md)**：全同態加密 (FHE) 與 AA 錢包金鑰管理。
- **[國家級主權雲端安全性白皮書與災難復原計畫 (DRP)](architecture/security_and_web3/sovereign_cloud_security_drp.md)**：HA/DR 與 ISO 標準對齊。
- **[溫室氣體核算方法論與國際準則對照表](architecture/compliance_and_audit/esg_methodology_mapping.md)**：GHG Protocol/IFRS S2 對齊與質量守恆查核。
- **[溫室氣體盤查與碳會計師實務手冊 (Carbon Accounting Methodology)](domain/carbon_accounting_methodology.md)**
  - 記載碳盤查的核心計算架構、三大範疇，以及最重要的「黃金決策邏輯」，是所有開發碳排管線工程師的必讀領域知識。
- **[區塊鏈防篡改與零信任架構](architecture/security_and_web3/blockchain_immutability_architecture.md)**
  - 說明系統如何利用 AA Wallet (ERC-4337) 與 `mission_board.sol` 智能合約來實現 Web3 級別的單一真相來源 (SSOT)，捨棄過度依賴 Node.js API 層的傳統 Web2 RBAC 防禦。
- **[Mission Board 去中心化任務信託與仲裁架構](architecture/security_and_web3/mission_board_architecture.md)**
  - 詳細剖析 `mission_board.sol` 底層設計，包含任務 NFT 化、資金信託 (Escrow)、爭議仲裁機制與動態 KYC 整合。
- **[商業藍圖與 GTM 戰略](business_and_product/gtm_business_blueprint.md)**
  - 了解 iSunFA 系統的商業願景與推廣目標。

### 🏛️ 架構決策紀錄 (Architecture Decision Records, ADRs)

為了追蹤重大架構變更背後的歷史脈絡與取捨，我們將核心的「減法工程」與重構決策收斂於此：

- **[ADR 001: The Great Purge (精準度架構重構與拔除)](architecture/decisions/001_precision_refactor_removals.md)**
  - 記錄 Sprint 1 期間為達 Big 4 確定性標準，對 AI 數學幻覺、Regex 擷取、Prompt 冗餘結構與硬編碼面額進行的「史詩級拔除」決策。
- **[ADR 002: ESG Vector RAG & Hybrid Pipeline (ESG 向量檢索與混合決定論管線)](architecture/decisions/002_esg_vector_rag_hybrid_pipeline.md)**
  - 記錄解決 15,000+ 筆碳排係數比對時的架構躍升。詳述了從「暴力字典注入」轉向「本機 RAG + AI 保守型預估 (黃燈懸記)」的決策脈絡，並收錄了 Sprint 1 消除漂綠地雷的深度復盤。
- **[ADR 003: Residual `.toNumber()` Justifications & Precision Hardening (剩餘 toNumber 合規決策)](architecture/decisions/003_residual_tonumber_justifications.md)**
  - 記錄全面精準度重構後，剩餘的 5 大類安全 `.toNumber()` 使用場景（相對比率、API 約束、純整數等），並建立未來的 PR 審核鐵律。

---

### 🚀 系統部署與管理員維運白皮書 (System Deployment & Admin Setup)

- **[00\_執行計畫 (Execution Plan)](admin_setup_whitepaper/00_execution_plan.md)**
- **[01\_架構總覽 (Architecture Overview)](admin_setup_whitepaper/01_architecture_overview.md)**
- **[02\_基礎設施與節點架構 (Infrastructure and Nodes)](admin_setup_whitepaper/02_infrastructure_and_nodes.md)**
- **[03\_鏈上合約部署 (Onchain Deployment)](admin_setup_whitepaper/03_onchain_deployment.md)**
- **[04\_資料庫錨定與身分設計 (Data and Identity)](admin_setup_whitepaper/04_data_and_identity.md)**
- **[05\_環境交付與封鎖 (Environment Finalization)](admin_setup_whitepaper/05_environment_finalization.md)**

---

## ⚙️ 第三階段：核心非同步管線 (Async Worker Pipelines)

系統最複雜的憑證處理流程皆位於 `mission.executor.service.ts` 的非同步管線中，詳細實作見 `async_workers` 目錄：

- **[00\_非同步微服務守護行程總覽 (The 7-Daemon Orchestration)](architecture/async_workers/00_async_worker_overview.md)**：系統層級架構，涵蓋 7 大守護行程與 mission_board.sol 之間的 Web3 狀態機接力。
- **[00.1\_非同步任務執行器深潛 (Mission Executor Architecture)](architecture/async_workers/00.1_mission_executor_architecture.md)**：元件層級架構，詳細剖析 Executor 內部的混合決定論管線、檔案狀態機與數值防腐層。
- **[01\_憑證至分錄 (Receipt to Journal)](architecture/async_workers/01_receipt_to_journal_implementation.md)**：AI OCR 特徵萃取與初階轉換。
- **[02\_分錄至傳票 (Journal to Voucher)](architecture/async_workers/02_journal_to_voucher_implementation.md)**：TypeScript 決定論查表、會計科目 mapping。
- **[03\_傳票至 ESG 紀錄 (Voucher to ESG)](architecture/async_workers/03_voucher_to_esg_record_implementation.md)**：碳排活動數據抓取、防護欄檢核。_(註：ESG 核心配對與 RAG 混合管線的架構決策，請參閱 [ADR 002](../decisions/002_esg_vector_rag_hybrid_pipeline.md))_
- **[04\_報表生成流程 (Report Generation)](architecture/async_workers/04_report_generation_implementation.md)**：產生財務與碳排最終報表。
- **[05\_顧問分析與區塊鏈付款流轉 (Consultant Payment & Onchain Saga)](architecture/async_workers/05_consultant_payment_and_onchain_flow.md)**：從前端發起解析到 `mission_board.sol` 的非同步任務與去中心化資金流轉。

---

## 🧪 第四階段：測試與驗證 (Testing & Validation)

任何核心模組的修改，都必須確保測試通過：

- **[端到端測試架構設計](testing_and_qa/e2e_audit_pipeline/e2e_testing_architecture.md)**：了解系統如何進行 E2E 驗證。
- **[整合測試撰寫指南](testing_and_qa/integration_test/01_integration_test_guide.md)**：教導如何撰寫符合標準的整合測試。
- **[整合測試 Cookie/Session 說明](testing_and_qa/integration_test/00_integration_test_cookie_session_explanation.md)**：測試環境中的授權機制實作細節。

---

## 🔌 其他系統模組與政策文件

- **外部整合**：[外部使用者綁定機制 (External User Binding)](business_and_product/external_user_binding.md)
- **特定業務邏輯**：[薪資計算機運作機制 (Salary Calculator)](business_and_product/salary_calculator_operating_mechanism/v1_0_0.md)
- **法律與合規政策**：
  - [服務條款 (Terms of Service)](legal/terms_of_service.md)
  - [隱私權政策 (Privacy Policy)](legal/privacy_policy.md)
  - [退款政策 (Refund Policy)](legal/refund_policy.md)
