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

### 🐛 已知缺陷 (Known Issues)

_尚未修復、但會影響開發判斷的系統性缺陷；動到相關區域前請先閱讀：_

- ⚠️ **[API 錯誤碼對 HTTP 狀態碼雙套對照表](engineering_guidelines/known_issues/api_http_status_dual_mapping.md)**（已解決 2026-08-07）
  > `httpStatusOf()` 已收斂為讀 `HTTP_MAP`（`Record<ApiCode, number>`），新增 `ApiCode` 成員漏補對照會直接編譯失敗，無需再人工同步。
- ⚠️ **[龍捲風圖「編輯數列分組」缺少 UI 層驗證](engineering_guidelines/known_issues/tornado_edit_group_missing_ui_validation.md)**
  > 數列名含配對分隔符（`<->` / `↔`）時，動作照常送出但標頭改寫被靜默略過（顏色仍生效）。資料層防護正確，缺的是 UI 層前置驗證與提示。
- ⚠️ **[路網資料只有臺灣，境外陸運段全數為推估](engineering_guidelines/known_issues/osrm_taiwan_only_coverage.md)**
  > `dockerfiles/osrm/Dockerfile` 只載入 `taiwan-latest.osm.pbf`，非臺灣的陸運段一律落到 `直線距離 × 1.2` 並標記 `est.`。報告已揭露推估段數與其排放占比（實測 R02 為 2/3 段、占 0.07%），**但若業務要處理境外陸運為主的路線，推估誤差會直接進入申報數值**，屆時需擴充覆蓋或改用外部路徑服務。
- ⚠️ **[`/admin/settings` 的輪替與撤銷對 MissionExecutor 無效](engineering_guidelines/known_issues/executor_settings_isolation.md)**：無主資料庫權限的節點認的是部署環境裡的金鑰，撤銷後背景任務仍可能繼續呼叫 LLM —— 設計取捨（隔離是防提示詞注入的基礎），但與管理員的預期相反。

- 🔴 **[簽到模組仍是 Demo，但它已經是上游](engineering_guidelines/known_issues/attendance_demo_as_upstream.md)**
  > 簽到模組是有意識地做成 demo 的（三張判定結果表不建、無權限矩陣、政策參數是常數而非表），**但假勤已接了上去，薪資與工程計價之後也會接**，而「它是 demo」沒有寫在任何一支 API 的簽名上。文件列出十項不可依賴的東西與各自的處置、七項可放心依賴的東西，以及依「不補會怎樣」分級的待辦。**任何模組接簽到之前必讀。**
  > 其中 §3.5 的 `Employee` 角色缺口成因不同——它是整個 HR 模組共用的地基，簽到只是第一個繞過它的模組。

- 🔴 **[整合測試指南所描述的 harness 已不在 repo 中](engineering_guidelines/known_issues/integration_test_harness_missing.md)**
  > `integration_test_guide.md` 描述的 `APITestHelper` / `TestClient` / `test_data_factory` / 整個 `src/tests/` 目錄在 `3b40b6ae1`（歷史重寫）被一次移除，`supertest` 也不在依賴裡。`npm test` 帶著 `--passWithNoTests`，所以「一支整合測試都沒有」不會讓 CI 變紅——**缺口是無聲的**。復原 / 改寫成 App Router 版 / 併入 bot 腳本三案未決。

- ⚠️ **[列印環境缺少中文字型導致 PDF 中文變空心方框](engineering_guidelines/known_issues/pdf_cjk_font_missing.md)**（已解決，但維運前置條件持續有效）
  > 主機未安裝 CJK 字型時，Chrome 對所有中文字使用 `.notdef`，報告地點名稱全數變方框而流程回報成功。程式碼側有 `IS000022` fail fast，**但每台產出 PDF 的主機仍須 `apt install fonts-noto-cjk` 並重啟**，否則匯出會失敗而非產出破圖。文件內另更正了「中文是 Type 3 點陣字」這個既有的錯誤陳述（實測為向量），並記錄 Type 3 造成的約 128 KB 體積成本。

---

## 🏛️ 第二階段：系統架構與藍圖 (Architecture & Blueprint)

### 💡 2. 數位審計知識庫 (Digital Audit Knowledge Base)

_聚焦於四大會計師級別的底層財報與內控實務：_

- 🌳 **[報表引擎溯源](architecture/compliance_and_audit/01_tree_traversal_reporting_engine.md)**：告別 startsWith，擁抱樹狀溯源。
- 🔄 **[自動沖銷架構](architecture/compliance_and_audit/02_auto_reconciliation_accrual_basis.md)**：從「應計基礎」到「現金流」的完整閉環。
- 🚧 **[雙軌懸記分流](architecture/compliance_and_audit/03_suspense_and_quarantine_guardrails.md)**：財務與 ESG 保守型推估的 ITAC 實務。
- 🔗 **[跨表指標引擎](architecture/compliance_and_audit/04_cross_report_metrics_engine.md)**：破除微服務時代的「財務指標孤島」。
- 🔐 **[內部控制與 ITAC](architecture/compliance_and_audit/internal_control_and_audit_framework.md)**：COSO 框架對應與去中心化仲裁規範。
- 🌍 **[溫室氣體核算方法論](architecture/compliance_and_audit/esg_methodology_mapping.md)**：GHG Protocol/IFRS S2 對齊與質量守恆查核。
- 📖 **[碳會計師實務手冊](domain/carbon_accounting_methodology.md)**：記載碳盤查的三大範疇與「黃金決策邏輯」，碳排管線工程師必讀。

### 🌐 3. 區塊鏈與資安 (Security & Web3)

- ⛓️ **[區塊鏈防篡改架構](architecture/security_and_web3/blockchain_immutability_architecture.md)**：AA Wallet 與智能合約 SSOT 設計。
- ⚖️ **[Mission Board 信託與仲裁](architecture/security_and_web3/mission_board_architecture.md)**：資金信託、爭議仲裁與動態 KYC 整合。
- ☁️ **[主權雲端與災難復原](architecture/security_and_web3/sovereign_cloud_security_drp.md)**：HA/DR 與 ISO 標準對齊。
- 🔒 **[機密隔離與 FHE 加密](architecture/security_and_web3/zkp_privacy_preserving.md)**：全同態加密 (FHE) 與金鑰管理 (計畫中)。

### 🧩 3.5 功能整合計畫 (Feature Integration Plans)

- **[分類帳與試算表整合施行計劃 (Ledger & Trial Balance Integration Plan)](architecture/ledger_and_trial_balance_integration_plan.md)**：於既有報表引擎慣例上新增兩支唯讀報表（樹狀溯源 + MoneyUtil + 懸記納入）。
- **[團隊錢包與訂閱額度消耗系統 (Team Wallet & Subscription Quota)](architecture/team_wallet_and_subscription_quota.md)**：團隊為計費主體、5 小時 / 週雙視窗訂閱額度、免簽章扣費管線與管理者點數分配。
- **[出勤模組開發計畫書 (Time & Attendance Module Plan)](architecture/time_attendance_module_plan.md)**：打卡不可變、地理圍欄、班別統一模型與單日出勤判定引擎（純函數）。
- **[假勤模組開發計畫書 (Leave & Overtime Module Plan)](architecture/leave_and_overtime_module_plan.md)**：假別規則資料化、額度異動帳本、多級簽核鏈快照、加班分段與補休、假勤行事曆。**§3 附已查證的勞基法／性平法法源對照表與 8 項待核對清單，法務複核前不得標記 Production Ready。**

### 📌 4. 架構決策紀錄 (Architecture Decision Records, ADRs)

_追蹤重大架構變更背後的歷史脈絡與取捨：_

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
- **[ADR 015: Off-chain Team Wallet Ledger](architecture/decisions/015_offchain_team_wallet_ledger.md)**：團隊錢包與訂閱額度採 C 案混合制——離鏈決定論帳本營運（免逐次簽章、append-only Ledger + 守恆勾稽），每日 merkle root 鏈上錨定；1:1 backing 為金鑰治理到位後的 Phase 2。
- **[ADR 021: Leave Types as Configurable Data](architecture/decisions/021_leave_policy_as_data_and_accrual_cycle.md)**：假別規則資料化——「行為分類用 enum、參數用欄位」的切法、到職日制與曆年制雙軌並存及「不低於週年制」護欄，以及「半天不是 240 分鐘」的單位基準。
- **[ADR 022: Append-Only Ledger for Leave Entitlement](architecture/decisions/022_leave_entitlement_append_only_ledger.md)**：假勤額度採批次授予 + append-only 帳本（比照 ADR 015），餘額為可重建的派生快取；帳本單位為分鐘，「日」只出現在授予與折現兩個端點。
- **[ADR 023: Approval Chain Snapshots and SoD](architecture/decisions/023_leave_approval_chain_snapshot_and_sod.md)**：簽核鏈於送出當下固化成快照，組織異動不改寫歷史；空鏈拒絕送出而非自動核准；額度不預扣，扣減發生在最後一關通過的同一個交易內。
- **[ADR 024: Overtime Recognition and the Payroll Boundary](architecture/decisions/024_overtime_recognition_premium_tiers_and_module_boundary.md)**：加班認列為「核准 ∩ 打卡事實」取小者；§24 加成切成可稽核分段；補休 1:1 一段一批以保留級距；模組邊界劃在分鐘，不算金額（同 ADR 020）。

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

- 💥 **[端到端測試與稽核管線指南 (E2E Testing & Audit Pipeline Guide)](testing_and_qa/e2e_audit_pipeline_guide.md)**
  > 包含 E2E 測試架構、執行步驟、時序逆推分析、CBAM 碳追溯生成架構、選樣策略與交叉驗證指標。
- 🧪 **[整合測試與 Cookie/Session 管理指南 (Integration Test & Cookie Session Guide)](testing_and_qa/integration_test_guide.md)** 🔴 **描述的框架已不存在**
  > 指引如何使用 Supertest 對 API 進行整合測試，以及在測試環境中管理 Cookie 與 Session 的原理與最佳實踐。
  > ⚠️ **在處置方案決定之前不可當成可執行的指引** —— 它引用的每一個 helper 都已不在 repo 中，見[已知缺陷](engineering_guidelines/known_issues/integration_test_harness_missing.md)。

---

## 🔌 第五階段：維運與其他系統模組 (Ops & Compliance)

### 🚀 系統部署與管理員維運白皮書 (System Deployment & Admin Setup)

- **[系統部署與維運白皮書 (Admin Setup Whitepaper)](architecture/admin_setup_whitepaper.md)**
  > 包含架構總覽、基礎設施與節點驗證、鏈上資產與合約部署、資料與超級管理員身分簽發、環境封裝與鎖定。

### 💼 業務領域與法律政策

- **特定業務領域**：[薪資計算機運作機制 (Salary Calculator)](domain/salary_calculator_mechanism.md)
  > 薪資計算機採用的所得稅、勞健保與勞退公式及運作邏輯說明。
- **合規政策**：[服務條款 (Terms of Service)](legal/terms_of_service.md) | [隱私權政策 (Privacy Policy)](legal/privacy_policy.md) | [退款政策 (Refund Policy)](legal/refund_policy.md)

---

## 🗂️ 附錄：`issue_drafts/` 引用路徑對照 (Issue Draft References)

`src/` 與 `documents/` 共有 36 個檔案的註解引用 `issue_drafts/...` 形式的路徑，
例如 `src/lib/carbon_report_diagram.builder.ts` 的
「節點太少即不畫（issue_drafts/inventory_table_import/05）」。

**這些草稿已於 commit 902df4580 移出應用程式 repo，現位於開發者本機的 `data/issue_drafts/`
（`data/` 由 `.gitignore` 第 61 行整個排除）。** 完成的項目在 `data/issue_drafts/done/`，
過期的在 `data/issue_drafts/archive/`。

### 為什麼要在這裡記一行

那些註解的全部價值就是可追溯性。移走而不留下落點，剩下的只是一串死路徑 ——
**比沒有引用更糟，因為它看起來查得到。** 讀到那些註解的人（含 AI Agent）
需要一個地方能回答「這個編號現在在哪」。

### 為什麼草稿不放進 repo

草稿裡有 UAT 期間的客戶報告內容（完整的溫室氣體盤查數據）。
它們曾被誤commit 進 develop，於 e121c28e3 移除 —— 客戶資料不該存在於程式碼 repo 的歷史裡。

### 新的引用寫法

新寫的註解一律用 `data/issue_drafts/<主題>/<編號>` 的完整相對路徑
（例如 `data/issue_drafts/inventory_table_import/17`），
讓路徑本身就說明它不在 repo 內，不必回來查這一節。
