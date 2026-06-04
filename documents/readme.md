# 📚 iSunFA 工程知識庫與 AI 導讀指南 (Engineering Knowledge Base & AI Onboarding)

> **Date**: May 2026
> **Author**: Tzuhan
> **Version**: 1.1
> **Status**: Active
> **Last Updated**: 2026-05-22

> **致所有新加入的工程師與 AI 協作 Agent**：
> 歡迎加入 iSunFA 開發團隊！iSunFA 是一個挑戰**四大會計師 (Big 4) 查帳標準**的企業級財務與 ESG 混合審計系統。我們對精準度、型別安全、防禦性編程與代碼品味有極高的要求。
>
> 在您撰寫或修改任何一行程式碼之前，**強烈建議您優先閱讀【第一階段：必讀鐵律】**，這將大幅降低您的程式碼被退回或遭到系統 Reject 的機率。

---

## 🌟 第一階段：必讀鐵律 (Must Read for AI & Humans)

本專案奉行「零捏造」與「決定論防護」的開發哲學，請務必按照順序閱讀以下規範：

1. 💻 **[團隊協作與程式碼最佳實踐](engineering_guidelines/coding_guidelines.md)**
   > 定義了架構分層 (API-Service-Repo)、禁用 `any`、以及如何優雅地隔離資料庫錯誤。
2. 📝 **[註解與標籤規範指南](engineering_guidelines/work_guidelines/annotation.md)**
   > **極度重要**！本專案強制要求所有註解必須具備時間戳與作者 (例如 `// Info: (20260511 - Tzuhan)`)。未遵守此規範的註解將被視為違規。
3. 🤖 **[LLM 實作規範與邊界防護指南](architecture/ai_and_analytics/llm_implementation_guideline.md)**
   > 說明 AI 在系統中的定位。絕對禁止讓 AI 算數學、做業務邏輯判斷，並規範了「混合決策管線 (Hybrid Pipeline)」與「English-First Prompting」。
4. 🎯 **[數值精度處理規範](engineering_guidelines/numerical_precision_guideline.md)**
   > 說明為何我們在財務與碳排計算中全面棄用原生 `number`，並強制使用 `Prisma.Decimal` 與 `BigInt`。
5. 🛡️ **[Sprint 1: 企業級混合審計防護網與精度極限重構 (Proof of Work)](engineering_guidelines/sprint1_zero_tolerance_pow.md)**
   > **Sprint 1 里程碑必讀**！詳述系統如何從概念驗證躍升為 Big 4 查驗級別，全面拔除妥協機制並實作決定論護城河。

---

## 🏛️ 第二階段：系統架構與藍圖 (Architecture & Blueprint)

### 👑 1. 最高戰略指導 (Master Blueprint)
- 🗺️ **[iSunFA E2E Core Engine 路線圖 (Roadmap v2)](architecture/e2e_roadmap_v2.md)**
  > 本專案的最高戰略指導文件。包含了「零捏造」、「財務三表勾稽」、「ESG 質量守恆勾稽」等核心系統防線。

### 💡 2. 數位審計知識庫 (Digital Audit Knowledge Base)
*聚焦於四大會計師級別的底層財報與內控實務：*
- 🌳 **[報表引擎溯源](compliance_and_audit/01_tree_traversal_reporting_engine.md)**：告別 startsWith，擁抱樹狀溯源。
- 🔄 **[自動沖銷架構](compliance_and_audit/02_auto_reconciliation_accrual_basis.md)**：從「應計基礎」到「現金流」的完整閉環。
- 🚧 **[雙軌懸記分流](compliance_and_audit/03_suspense_and_quarantine_guardrails.md)**：財務與 ESG 保守型推估的 ITAC 實務。
- 🔗 **[跨表指標引擎](compliance_and_audit/04_cross_report_metrics_engine.md)**：破除微服務時代的「財務指標孤島」。
- 🔐 **[內部控制與 ITAC](architecture/compliance_and_audit/internal_control_and_audit_framework.md)**：COSO 框架對應與去中心化仲裁規範。
- 🌍 **[溫室氣體核算方法論](architecture/compliance_and_audit/esg_methodology_mapping.md)**：GHG Protocol/IFRS S2 對齊與質量守恆查核。
- 📖 **[碳會計師實務手冊](domain/carbon_accounting_methodology.md)**：記載碳盤查的三大範疇與「黃金決策邏輯」，碳排管線工程師必讀。

### 🌐 3. 區塊鏈與資安 (Security & Web3)
- ⛓️ **[區塊鏈防篡改架構](architecture/security_and_web3/blockchain_immutability_architecture.md)**：AA Wallet 與智能合約 SSOT 設計。
- ⚖️ **[Mission Board 信託與仲裁](architecture/security_and_web3/mission_board_architecture.md)**：資金信託、爭議仲裁與動態 KYC 整合。
- ☁️ **[主權雲端與災難復原](architecture/security_and_web3/sovereign_cloud_security_drp.md)**：HA/DR 與 ISO 標準對齊。
- 🔒 **[機密隔離與 FHE 加密](architecture/security_and_web3/zkp_privacy_preserving.md)**：全同態加密 (FHE) 與金鑰管理 (計畫中)。

### 📌 4. 架構決策紀錄 (Architecture Decision Records, ADRs)
*追蹤重大架構變更背後的歷史脈絡與取捨：*
- **[ADR 001: The Great Purge](architecture/decisions/001_precision_refactor_removals.md)**：精準度重構，全面拔除幻覺。
- **[ADR 002: ESG Vector RAG Pivot](architecture/decisions/002_esg_vector_rag_hybrid_pipeline.md)**：從靜態字典注入轉向 RAG 與動態檢索。
- **[ADR 003: Residual `.toNumber()` Justifications](architecture/decisions/003_residual_tonumber_justifications.md)**：剩餘 `.toNumber()` 的 5 大安全情境與合規決策。
- **[ADR 004: Voucher Hybrid Deterministic Pipeline](architecture/decisions/004_voucher_account_code_hybrid_pipeline.md)**：多維度廠商攔截器與財務懸記黃燈機制。
- **[ADR 005: Master Data Governance and Isolation Strategy](architecture/decisions/005_master_data_governance_and_isolation.md)**：主檔資料治理與隔離策略。
- **[ADR 006: Dynamic Two-Turn RAG for ESG](architecture/decisions/006_dynamic_two_turn_rag_esg.md)**：廢棄靜態統編攔截器，全面啟用兩回合 AI 選擇題與動態檢索。
- **[ADR 007: AI Accounting Defenses, Two-Turn RAG Trade-offs & Upgrade Paths](architecture/decisions/007_ai_accounting_defenses_tradeoffs_and_upgrade_paths.md)**：AI 會計防線、兩回合檢索權衡與未來升級路徑。
- **[ADR 008: Tax Strategy & Non-Deductible Input Tax Capitalization](architecture/decisions/008_tax_strategy_and_deductibility_capitalization.md)**：稅務策略與不可扣抵進項稅額資本化。
- **[ADR 009: Zero-Trust Washing Pipeline and SoD](architecture/decisions/009_zero_trust_washing_pipeline_and_sod.md)**：決定論管線洗淨與 IssueRecorder 瘦身，嚴守資料流的單向黃金法則。
- **[ADR 010: Immutable Pipeline, File-System Queue, and Stateless Workers](architecture/decisions/010_immutable_pipeline_and_stateless_workers.md)**：採用無狀態攤銷、不可變資料管道與 Web3 檔案系統佇列的分散式高可用設計。
- **[ADR 011: Agentic Reflection and Deterministic Validation](architecture/decisions/011_agentic_reflection_and_deterministic_validation.md)**：AI 反思機制與確定性驗證層，建立 BSI 級別的自評重做與懸記防護網。

---

## ⚙️ 第三階段：核心非同步管線 (Async Worker Pipelines)

系統最複雜的憑證處理流程皆位於 `mission.executor.service.ts` 中，分為 7 大守護行程：

1. 🧭 **[The 7-Daemon Orchestration](architecture/async_workers/00_async_worker_overview.md)**：orchestrator 總覽。
2. 🔬 **[Mission Executor Architecture](architecture/async_workers/00.1_mission_executor_architecture.md)**：執行器深潛。
3. 📄 **[憑證至分錄 (Receipt to Journal)](architecture/async_workers/01_receipt_to_journal_implementation.md)**：流程一。
4. 🧾 **[分錄至傳票 (Journal to Voucher)](architecture/async_workers/02_journal_to_voucher_implementation.md)**：流程二。
5. 🌍 **[傳票至 ESG 紀錄 (Voucher to ESG)](architecture/async_workers/03_voucher_to_esg_record_implementation.md)**：流程三。
6. 📊 **[報表生成流程 (Report Generation)](architecture/async_workers/04_report_generation_implementation.md)**：流程四。
7. 💰 **[顧問分析與區塊鏈付款流轉 (Consultant Payment)](architecture/async_workers/05_consultant_payment_and_onchain_flow.md)**：流程五。

---

## 🧪 第四階段：測試與極限驗證 (Testing & Validation)

任何核心模組的修改，都必須確保能扛住最高級別的壓力測試與合規查核：

- 💥 **[端到端測試架構設計 (E2E Testing Architecture)](testing_and_qa/e2e_audit_pipeline/e2e_testing_architecture.md)**
  > 了解系統如何進行 E2E 驗證與對抗式視覺壓力測試。
- 🚀 **[6642 5.4 萬筆旗艦級 ESG 擬真數據 PoC 實作戰略 (6642 PoC Blueprint)](testing_and_qa/e2e_audit_pipeline/6642_poc_blueprint.md)**
  > 詳述捨棄巨量吞吐虛榮指標，改為專注「絕對防禦深度」的管線解耦與防禦演練戰略。
- 🎯 **[審計與稽核指標指南 (E2E Cross Validation Metrics)](testing_and_qa/e2e_audit_pipeline/guidelines/e2e_cross_validation_metrics.md)**
  > 紀載系統如何執行 0 誤差的四維度 (財務、碳排、三表勾稽、防禦覆蓋率) 交叉驗證。
- 🧪 **[整合測試撰寫指南 (Integration Test Guide)](testing_and_qa/integration_test/01_integration_test_guide.md)**
- 🍪 **[整合測試 Cookie/Session 說明](testing_and_qa/integration_test/00_integration_test_cookie_session_explanation.md)**

---

## 🔌 第五階段：維運與其他系統模組 (Ops & Compliance)

### 🚀 系統部署與管理員維運白皮書 (System Deployment & Admin Setup)
- [00_執行計畫](admin_setup_whitepaper/00_execution_plan.md) | [01_架構總覽](admin_setup_whitepaper/01_architecture_overview.md) | [02_基礎設施](admin_setup_whitepaper/02_infrastructure_and_nodes.md)
- [03_鏈上合約](admin_setup_whitepaper/03_onchain_deployment.md) | [04_資料與身分](admin_setup_whitepaper/04_data_and_identity.md) | [05_環境交付](admin_setup_whitepaper/05_environment_finalization.md)

### 💼 業務邏輯與法律政策
- **外部整合**：[外部使用者綁定機制 (External User Binding)](business_and_product/external_user_binding.md)
- **特定業務邏輯**：[薪資計算機運作機制 (Salary Calculator)](business_and_product/salary_calculator_operating_mechanism/v1_0_0.md)
- **商業戰略**：[商業藍圖與 GTM 戰略 (GTM Blueprint)](business_and_product/gtm_business_blueprint.md)
- **合規政策**：[服務條款 (Terms of Service)](legal/terms_of_service.md) | [隱私權政策 (Privacy Policy)](legal/privacy_policy.md) | [退款政策 (Refund Policy)](legal/refund_policy.md)
