# 🚀 iSunFA Master Blueprint：ESG 與財務混合審計底層引擎 (E2E Core Engine)

> **Date**: 2026-05-10
> **Author**: Tzuhan
> **Version**: 1.1
> **Last Updated**: 2026-05-22

> **Status**: 🔴 **UI/UX 進入全面凍結 (Freeze)**。全隊開發量能 100% 轉向底層報表與數據引擎的準確性構建。
>
> **Vision**: 本 Roadmap 作為回應「5~7 月各縣市政府與外貿協會展示」之最高指導原則。旨在從底層架構徹底拔除 AI 幻覺，賦予 AI 生成報告絕對的「專業度與可信度」。我們將讓 iSunFA 成為 ESG 與財務混合審計的黃金標準，達到四大會計師 (Big 4) 查帳要求，並足以作為新北市數位產品護照 (DPP) 的底層引擎。
>
> **Lineage (架構演進)**: 本文件正式取代並重構了先前的 `archive/future_optimization_roadmap.md`。我們在此正式推翻了過去「為了極限測試而讓 AI 參與數學運算」的實驗室思維，確立了「零捏造、完全職能分離」的 CPA 級別鐵律。。
>
> ⚠️ **IMPORTANT RULE**: 本 Roadmap v2 必須與 `documents/architecture/pipeline/` 底下的各模組實作說明 **結合一起看**，因為 Roadmap 中的每一項「地雷拆除」都精確對應著底層 Pipeline 原始碼的現況與弱點。

---

## 🏛️ 第一章：戰略共識與系統鐵則 (The Core Mandate)

在探討具體的技術演進前，全體研發團隊必須將以下「最高指導原則」刻在每一行程式碼中。財務與碳盤查必須共用同一套嚴謹的底層防線：

### ⚖️ 鐵律一：零捏造的數據溯源 (Absolute Data Integrity)

> **「客戶揭露多少憑證，系統就只產出多少事實。」**

AI 在 iSunFA 僅作為「資料萃取器 (Extractor)」與「分類輔助 (Classifier)」，絕對禁止 AI 參與「數值創造」。所有最終報告的數字，都必須能 100% 透過會計恆等式溯源回原始憑證。

### 🌍 鐵律二：財務是恆等式，碳排是科學估算 (Calculation, not Generation)

絕對禁止 AI 參與任何碳排數值的「運算」。AI 的職責僅限於從憑證萃取「活動數據（Activity Data，如：用電度數、採購重量）」。所有的碳排當量（CO2e）與單位轉換，必須統一交由底層引擎呼叫 `EmissionFactorDictionary`（排放係數庫）並透過高精度型別進行乘法計算。

### 🛡️ 鐵律三：雙重視角的開發心法 (Dual-Lens Philosophy)

- **法規反向映射 (Regulatory Reverse-Mapping)**：寫下的每一段核心邏輯，都必須能對應到法規（如 ISO 14064-1 溯源、ISO 14067 產品碳足跡 ）。
- **稽核左移測試 (Audit Shift-Left)**：在底層架構產出 MVP 時，即邀請 CPA 進行概念驗證 (PoC)，用最挑剔的查帳眼光攻擊系統。
- **隱形的 Web3 防護 (Invisible Web3 Utility)**：區塊鏈是達成不可竄改的工具，其複雜度必須對終端用戶與政府稽核員 **絕對隱形**。

---

## 🔄 第二章：逆向推進與敏捷收斂路徑 (The Reverse Push Sprints)

我們全面重構開發邏輯，採行「逆向推進路線：先求數學絕對精準 ➡️ 再測商業邏輯異常 ➡️ 最後挑戰視覺極限與合規深水區」。

### 🚨 當前待辦與優先度總表 (Priority To-Do List)
為確保 2066 5.4萬筆 PoC 順利通關且系統不崩潰，全隊目前必須嚴格遵守以下執行優先度（包含 ADR 004, 005, 006, 007 的落地實作）：

**🔥 [Priority 1: Sprint 1 基礎防線補齊 (ADR 004)]**
- ✅ **Done: [Tzuhan] Voucher 財務防護 - 語意標籤與多國映射**: 實作 `UniversalAccountTag` 與後端 `SemanticAccountMatcher`。
- 🚫 **Canceled: [Tzuhan] 多維度廠商攔截器**: 廢棄 O(1) 攔截，以避免靜態規則造成的「看人下單」誤判。
- ✅ **Done: [Tzuhan] 單回合萃取與後端決定論懸記 (Single-Turn & Deterministic Suspense)**: 因 AI 幻覺嚴重，已拔除 Turn 2。由 AI 負責 Turn 1 客觀萃取，後端 `CoaVectorSearchService.matchWithScore` 進行 `>0.85` 閾值把關，不合者一律進入 BS/PL 隔離審核區 (`1471/6288`)。
- ✅ **Done: [Tzuhan] 雙軌懸記與虛擬科目隔離區 (Suspense & Quarantine)**: 取消 DB 硬體寫死，改由程式碼統一 4 向精準分流 (BS 1471/2330, PL 6288/7590)。
- ✅ **Done: [Tzuhan] 零信任會計稽核防線 (Zero-Trust Audit Defense)**: 於 Schema 實作 `isVerified` 與 `generationSource`，確保所有 AI 產生的憑證明細在人類覆核前皆保持未驗證狀態，建立 CPA 等級的資料血緣溯源 (ADR 007)。

**🔥 [Priority 2: 邊界壓力測試 (可與 P1 並行)]**
- 🚧 **WIP: [Julian] 2066 5.4萬筆大數據批次注入 (2066 Batch Seeding)**: 確保巨量資料進入 DB。注意：灌完即停手，嚴禁讀取報表。

**🔥 [Priority 3: Sprint 2 效能拆彈與總驗收 (OOM Defense)]**
- ⚠️ **Pending: [Tzuhan] 報表快照與期初餘額 (Snapshots & Opening Balance)**: 建立 Snapshot 表格避免重複計算。
- ⚠️ **Pending: [Tzuhan] 核心引擎 SQL 聚合重構 (Raw SQL Aggregation)**: 重寫四大報表產生器，利用 PostgreSQL 算力取代 Node.js 記憶體運算。
- ⚠️ **Pending: [Tzuhan & Julian] 聯合盲測與審計對比**: 待 SQL 引擎上線後，執行 `cross_validator.ts` 驗證絕對 0 誤差。

**🔥 [Priority 4: Sprint 2 ESG 架構升級 (ADR 006)]**
- ✅ **Done (2026-05-22): [Tzuhan] 動態兩回合檢索 (Two-Turn AI-RAG Pivot) (ADR 006)**: 拔除靜態攔截器，重構 `EsgParsingSkill`。改為兩回合對話，並在後端 TypeScript 內嚴格限制 `MoneyUtil` 運算，禁止 AI 執行數學邏輯。
- ⚠️ **Pending (Next Target): [Tzuhan] 質量守恆勾稽與動態容許耗損率**: 物理防呆機制，實作進銷存防護。
- 🚫 **Canceled: [Tzuhan] 本地唯讀對照庫隔離架構 (Vendor MDM SQLite) (ADR 005)**: (已由 ADR 007 動態 RAG 與零信任防線全面取代) 將 150 萬筆政府開放資料轉入 `tax_reference.sqlite` 的構想已捨棄。

---

### 📌 Sprint 1: 數學絕對真理與底層水管 (Mathematical Truth & Infrastructure)

**🎯 收斂目標 (DoD)**：在不考慮 AI 辨識率的情況下，系統的財務引擎能精準加總且總資產完美配平；ESG 引擎能精準執行單位轉換與係數乘法，且在高併發下達到 0 丟包率。

- **[第一順位：Architect 穩定性任務 (底層管線防護)]**
- **✅ Done (2026-05-14)：廢除 Markdown 故事腦補與全域替換 JSON 擷取**：**(幻覺地雷拆彈)** 明令禁止要求 AI 撰寫「事件摘要或故事」。全面強制升級為 Gemini 的 `responseSchema` (Structured Output) 與 `application/json`，徹底拔除舊版脆弱的 `/\{[\s\S]*\}/` Regex 擷取，斷絕資料靜默遺失風險。
- **✅ Done (2026-05-14)：極致去中心化與無退款防禦 (Decentralized Worker & DLQ)**：**取消**原本的 POSIX 原子鎖與 Saga 點數退款機制。確立 Worker 為獨立外部節點，負責從鏈上抓取檔案建立完全隔離的檔案系統，天然無 Race Condition。實作「無退款權限」原則，Worker 的唯一目標是**「無限重試至成功 (Retry-Until-Success)」**，摒棄傳統遇到錯誤就妥協退款的機制。
- **✅ Done (2026-05-15)：實作 Post-Parsing 攔截器與 Mock Facades (Backend Interceptors)**：接續 AI 降級決策，於核心寫入管線建置匯率 (FX)、會計科目 (AccountCode) 與碳排 (ESG) 三大攔截閘門。已完成 `VendorRegistry` Mock 與 `MoneyUtil` 防腐層，確保主引擎能即時阻斷 AI 的數學與邏輯幻覺。
- **✅ Done (2026-05-20)：高精度防禦死角大掃蕩 (Precision Blackhole Cleanup)**：全面掃描專案中殘存的 `Number()` 或 `parseFloat()` 強制轉型。所有涉及財務傳票與碳排數據的運算與轉型，必須全面升級使用 `MoneyUtil` 或 `BigInt`。
- **✅ Done (2026-05-20)：報表引擎的「無偽造」大盤查 (Report Engine Integrity Audit)**：全面審查 `cash_flow_statement_generator.ts`, `balance_sheet_generator.ts`, `esg_report_generator.ts`, `income_statement_generator.ts` 四大報表產生器，拔除所有「虛擬配平」、「懸記補數」或任何與原始憑證無法 100% 勾稽的錯誤妥協邏輯。
- **✅ Done (2026-05-20)：輕量級 E2E 核心防護網 (Minimalistic Core E2E Testing)**：規劃基於 Jest 的整合測試機制。測試情境限縮於「註冊登入 -> 建立單據 -> 檢驗財排報表平衡」的最短路徑，用極低的時間成本驗證 Sprint 1 數學恆等目標。此機制必須掛載環境隔離 (Environment Isolation) 防護，嚴格禁止在 Production 環境執行，以免污染真實金流與碳排帳本。
  - 👉 **實作要求**：建立 `src/__tests__/e2e/core_pipeline.e2e.test.ts`，必須使用 Jest 框架，且在頂端強制加入防呆鎖 `if (process.env.NODE_ENV === 'production') throw new Error('嚴禁在正式機執行 E2E 測試');`。

- **[第二順位：CPA 財務合規任務 (核心財務防禦)]**
- **✅ Done (2026-05-14/21)：外幣與全域字典解耦 (Backend Rule Registry)**：徹底剝奪 AI 計算匯率與小數點乘法的權力，並拔除所有全域會計字典注入（節省巨量 Token）。外幣匯率微服務與常數 Repo 已由 Julian 實作完成；廠商映射防護交由 Tzuhan 於防護網任務中升級。
- **✅ Done (2026-05-16)：強制財務憑證平衡防護 (Strict Accounting Integrity)**：**(錯誤邏輯拆彈)** 廢除過去「包容不完美揭露」與自動提列至懸記科目的錯誤設計。複式簿記不管資料是否完整都不會有差額。API 閘道與資料庫寫入層已全面導入「借貸平衡 (Debits = Credits)」的嚴格檢核。AI 解析若產生不平的傳票，系統將自動標記為 `FAILED` 狀態並加入警告，且任何不平的傳票更新也將被 API 直接阻擋，確保最終財報 (Balance Sheet) 絕對平衡，符合會計鐵律。
- **✅ Done (2026-05-10)：面額彈性解耦 (Decoupling Par Value)**：拔除系統內 `parValue = 10` 的 Hardcode，改為動態傳入（已實作完成，動態計算每股淨值與 EPS）。

- **[第三順位：CPA 碳排合規任務 (DPP 基礎)]**
- **✅ Done (2026-05-14)：數位 BOM 與產品關聯解耦 (DPP Handover)**：為了保持核心借貸引擎極簡，徹底移除了資料庫中對 `productId` 的強耦合。DPP 數位產品護照架構已切分出領域邊界，正式交由老闆 Luphia 親自負責統籌與設計。
- **✅ Done (2026-05-13/21)：實作「ESG 兩段式計算架構 (Two-Stage Calculation)」**：**(漂綠地雷拆彈)** 廢除 Prompt 中的 `ALL_TRUE_COEFFICIENT_DATA` 與乘法指令。AI 僅限萃取，後端 ESG 碳排係數洗轉與產業容損率基礎機制已由 Julian 實作 (包含 Seed 腳本與 Loss Ratio 函數)；後續由 Tzuhan 疊加實作了 `EmissionFactorRegistry` 4 軌降級攔截器 **(註：因業務相容性問題，已於 5/22 決議廢棄，全面轉向 Sprint 2 的動態 RAG 檢索)**。剩餘的官方標準 DB 轉移與爬蟲管線整合排入 Sprint 2。
- **✅ Done (2026-05-14)：高精度數據重構與單位枚舉 (Precision & Unit Enum)**：財務欄位升級為 `BigInt`；碳排引擎導入 `Prisma.Decimal` 並將 `MeasurementUnit` 從 DB 拔除轉為 TypeScript 端強型別，前端全面套用 `MoneyUtil` 防腐層。徹底消滅所有 `parseFloat` 的隱性精度流失漏洞，保障千兆級財報與極精密碳排係數安全寫入。

- **[第四順位：Sprint 1 殘餘除錯與前端同步 (Residual Fixes - Assigned to Julian)]**
- **✅ Done (2026-05-19)：多語系動態同步 (I18n Localization)**：確保日記帳、傳票與碳盤查係數的語系能根據 `account_book` 的設定動態調整，確保跨國查帳時無語系障礙。
- **✅ Done (2026-05-19)：ESG 碳排係數選擇介面升級 (Dropdown UI)**：升級前端介面，區分系統預設係數 (`true_esg_coefficients.ts`) 與自定義係數，提升填報者體驗。
- **✅ Done (2026-05-19)：修復 AI 備註的顯示 (AI Note Rendering)**：還原碳盤查介面中 `aiNote` 的顯示機制，確保 AI 解析時標註的「異常警告或推論邏輯」能如實呈現給終端使用者，完善稽核軌跡。
- **✅ Done (2026-05-26)：外幣攔截器擴充與尾差配平 (FX Interceptor Upgrade)**：修復了任務 93 中因匯率轉換四捨五入導致的借貸不平問題，導入「尾差配平 (Plug to the largest line)」機制。同時將 ESG 的活動數據與碳排量納入攔截範圍，精準解決了任務 113 中物理量綱與匯率脫鉤的碳排計算漏洞。
- **✅ Done (2026-05-26)：應計基礎與服務期間解綁 (Accrual Basis Period Extraction)**：修復了任務 87 中 AI 拒絕抓取後付制 (Post-paid) 電信費日期的問題。移除了 `certificate_analysis.generator.ts` 中「僅限預付/合約」的限制條件，確保攤銷引擎具備正確的起訖日期基礎。

- **[第五順位：Prompt 提示詞微調 (Prompt Calibration)]**
- **✅ Done (2026-05-18)：恢復 Markdown 優美排版 (Restore Rich Markdown Parsing)**：針對 `journal.ts` 的指令進行「權限分流」。放寬排版與摘要權限（允許 H2/H3 與條列式），但繼續鎖死數學與推斷權限，解決因「零幻覺」鐵律矯枉過正導致日記帳喪失易讀性的問題。

- **[Tzuhan 任務 (取代 Prompt 暴力注入的決定論防護網)]**
- **✅ Done (2026-05-20)：Voucher 財務防護 - 語意標籤與多國映射 (Semantic Account Matching)**：
  - **痛點拆彈**：過去將 1 萬多筆會計科目塞入 Prompt，導致 Token 爆炸且 AI 經常選錯相近科目。
  - **實作架構**：徹底拔除 Prompt 字典注入。實作 `UniversalAccountTag` (如 `TELECOM_EXPENSE`) 作為通用語意標籤，並於後端建立 `SemanticAccountMatcher`。
  - **防護機制**：AI 只需輸出自然語言（如「郵電費」），後端透過 `COUNTRY_ALIASES` 進行 O(1) 複雜度映射，精準對應至該租戶國家 (TW, US, JP 等) 絕對合規的底層代碼（如台灣的 `6215`），徹底阻絕 AI 瞎編會計代碼的幻覺。

- **✅ Done (2026-05-21)：Voucher 解析防護升級 - 多維度廠商攔截器 (Multi-Dimensional Vendor Registry)**：於 `VendorRegistry` 與後端同步層實作統編 (Tax ID) 優先與別名陣列，建立 O(1) 靜態記憶體倒排索引與決定論攔截引擎，強制覆寫 AI 推論，確保盲測 0 誤差 (參閱 ADR 007)。
- **✅ Done (2026-05-22)：Voucher 解析防護升級 - 本機向量檢索與逐行映射 (COA Vector RAG & Per-Line Mapping)**：徹底剝奪 AI 推論會計科目的權限。實作純 TypeScript 的 Bigram 餘弦相似度演算法，精準比對會計科目描述。
- **✅ Done (2026-05-22)：Voucher 解析防護升級 - 雙軌懸記與虛擬科目隔離區 (Dual-Track Suspense & Quarantine Zone)**：於 `document_sync.repo.ts` 實作防線。實作完美的 4 向精準分流，BS 未知款進入 (1471/2330)，PL 未知款進入 (6288/7590)，徹底解決借貸顛倒之嚴重會計漏洞。

- **✅ Done / ⚠️ Deprecated (2026-05-22)：ESG 解析防護升級 - 決定論攔截器 (EmissionFactorRegistry)**：原先新增了 `EmissionFactorRegistry` 作為 ESG 專屬攔截器（實作台電、中油等高頻項目的 O(1) Tax ID 攔截）。但因大型集團業務多元，單一統編攔截會導致分類錯誤，**已決議廢棄此靜態攔截器**，由動態 RAG 徹底取代。
- **✅ Done (2026-05-22)：保留 vendorTaxId 以符合稅法與 ESG 溯源 (Tax & Scope 3 Defense)**：廢除 Vendor MDM 後，原本考慮徹底刪除 `vendorTaxId`，但經過架構仲裁 (ADR 007)，決議保留該欄位以應對台灣 401/403 報稅媒體檔、自動沖銷 (Reconciliation) 以及精確的供應商碳足跡追蹤。
- **✅ Done (2026-05-21)：ESG 解析防護升級 - 修復單次語意降級斷鏈 (Fix Single-Pass Semantic Fallback)**：
  - 在 `EsgParsingSchema` 中補上強型別 Enum 的 `fallbackCategory`。
  - 將後端標籤升級為強型別 `EsgGenerationSource.AI_GENERATED`，完美銜接 Max-Factor Guard 與黃燈懸記機制（過渡期方案）。
  - **量綱一致性防護 (Dimensional Guard)**：(✅ 已實作) 實作跨量綱阻斷，若 AI 萃取的單位 (如 LITER) 與係數庫單位 (如 KWH) 物理量綱不符，直接退回懸記。

- **✅ Done (2026-05-20)：混合決策管線與 Schema 實體約束 (Hybrid Deterministic Pipeline & Schema Enum Binding)**：
  - 全面導入 Gemini JSON Schema `enum` 與 `format: "enum"`，在物理 API 層面封鎖 AI 發明自創字串。例如：強制約束 `DocumentType` 只能是 `ACCRUAL_NOTICE` 或 `PAYMENT_RECEIPT`，單位只能是 `MeasurementUnit` 枚舉，將萃取資料 100% 標準化。

- **✅ Done (2026-05-20)：強制修復傳票重複加總漏洞與自動沖銷 (Auto-Reconciliation)**：
  - 實作 `ReconciliationService`。為避免去中心化 Executor 的 Race Condition (時序悖論)，放棄同步沖銷，改採「延遲綁定與最終一致性 (Late Binding & Eventual Consistency)」。系統透過背景批次池化 (Pool Matching)，拉出同供應商的單據依 `tradingDate` 重新排序並雙向扣合 (`clearedByVoucherId`)。完美解決了代墊款與實際支付重複加總的破網漏洞，達成會計應計基礎 (Accrual Basis) 的完整閉環。

- **✅ Done (2026-05-20)：跨表指標引擎解耦 (Cross-Report Metrics Engine)**：
  - 建立獨立的 `calculateCrossReportMetrics` 引擎。單一報表 (如現金流量表) 只負責絕對的當期變動，將 EPS (需總股本) 與 現金流量允當比率 (需存貨變動) 等「跨表指標」抽離至最高編排層處理，消滅了為求指標數字而在單一引擎內虛擬補數的造假行徑。

### 📌 Sprint 2: 商業邏輯防禦與抗幻覺 (Business Logic & Anti-Hallucination)

**🎯 收斂目標 (DoD)**：數學引擎算得準之後，測試系統能否攔截人類或 AI 犯下的「業務邏輯錯誤與幻覺」。投入具備邏輯矛盾的 Payload，系統必須精準凍結。

- **[CPA 財務合規任務]**
- **⚠️ Pending：報表快照與期初餘額 (Snapshots & Opening Balance)**：**(效能地雷拆彈)** 若不實作期初餘額，E2E 盲測驗證龐大真實資料庫時，API 會因反覆重算數十萬筆傳票而觸發 OOM (Out of Memory) 崩潰。報表引擎必須基於 `本期報表 = 期初快照 + 當期變動明細` 打造。_(TODO: [20260518 - Tzuhan] Roadmap V2 Opening Balance，預計實作時間：Sprint 2)_
- **⚠️ Pending：廢除不合理允當標準 (Zero Tolerance)**：日常上線的報表驗證 Threshold 嚴格鎖死在 **0%**。
- **⚠️ Pending：防堵日期幻覺 (Anti-Date Hallucination)**：強制依賴 AI 輸出的 `tradingDate`，若發生跨期，系統必須報錯並阻斷財報生成。
- **⚠️ Pending：追溯重編的「關聯性鎖死」 (Adjustment Voucher Audit Trail)**：實作前期損益調整時，追加帶有標籤 (`isRestatement=true`) 的當期調整傳票。**Schema 強制帶入 `targetVoucherId` (被更正的原始傳票 ID)**，形成雙向鏈結，杜絕幽靈調整傳票。
- **✅ Done (2026-05-27) [Workaround]：歐洲區 (EU) 稅務逆向課稅 (VAT Directive Strategy)**：已導入稅務策略模式 (`TaxStrategyService`)。因歐盟各國稅率 (17%~27%) 及 B2B/B2C 判定極度複雜，目前實作「防呆警告機制」，若偵測到境外發票將強制附加 `aiNote` 提醒人工覆核，阻斷自動放行，避免跨國稅務裁罰地雷。自動化稅率 API 串接列入未來 Tech Debt。
- **✅ Done (2026-05-27)：台灣稅務逆向課稅防線 (Taiwan Reverse Charge Deductibility Pattern Matching)**：針對境外電商開立之發票，實作精準的進項稅額扣抵資格檢查。利用 RegExp 語意模式匹配 (Pattern Matching) 取代窮舉，自動攔截交際費與職工福利等不可扣抵之費用，並依據稅法強制轉為「費用資本化 (Capitalized Expense)」，達成 CPA 級別的稅務內控防禦。
- **⚠️ Pending (Tech Debt)：資料庫 Schema 升級 (FX Tracing)**：目前的重評價是基於數學反推。為了避免四捨五入的匯差並追蹤外幣債權真實水位，未來仍須於 `VoucherLine` 擴充 `foreign_amount` 與 `foreign_currency` 欄位。
- **✅ Done (2026-05-27) [Workaround]：外幣期末重評價引擎 (Month-end FX Revaluation)**：為遵守 IAS 21 公報，系統已實作月底自動計算 AP/AR 未實現兌換損益。因無法更動 Schema 紀錄原幣金額，採「歷史匯率反推外幣原額」之無痕決定論作法。詳見 [05_cpa_audit_findings](../compliance_and_audit/05_cpa_audit_findings_eu_vat_fx_revaluation.md)。
- **⚠️ Pending (Tech Debt)：國內自然人勞務扣繳盲點 (Domestic Individual Fallback Risk)**：因移除了 `DOMESTIC_VENDOR_KEYWORDS`，目前無統編的國內自然人勞務可能會被誤判為境外電商發動 5% 逆向課稅（應為各類所得扣繳）。由於 B2B 情境少見自然人軟體服務，目前列為已知限制，待未來擴充 Vendor 註冊機制時修復。
- **⚠️ Pending (Tech Debt)：AI 科目分類幻覺無法被數學防禦 (Semantic Classification Hallucination)**：雖然數學運算已完美防禦，但若 AI 從源頭將「員工旅遊」誤判為「軟體網路費」，系統將依賴此分類發動逆向課稅。目前對此類語意分類錯誤處於零防禦狀態，需仰賴人工查帳 (`isVerified = false`)。
- **⚠️ Pending (Tech Debt)：全局金額異常熔斷機制 (Circuit Breaker)**：目前若 AI 發狂在發票金額多加三個零，高精度系統將會精準算出天價營業稅並過帳。未來須在 `VoucherPipelineOrchestrator` 實作全局熔斷機制 (如：單筆金額 > 10 億 TWD 即拋出 `AnomalyDetectionError` 並強制阻斷寫入)。

- **⏸️ Paused：WACSO 實作與 EPS 計算 (IAS 33 Compliance)**：為避免人為稀釋，期末股數相除法已阻斷。待高精度加權平均演算法就緒後重啟。詳見 [IAS 33 合規架構](../compliance_and_audit/06_ias33_wacso_and_eps_engine.md)。
- **✅ Done (2026-05-27)：無資料庫狀態的攤銷折舊引擎 (Stateless Amortization Engine)**：基礎排程已升級為純粹的數學決定論推導 (`calculateStatelessAmortizationForMonth`)。系統能根據起訖日期動態推算過去累積的攤銷額與本期應攤銷額，在不依賴資料庫 `amortizedAmount` 狀態的情況下完美處理尾差配平，達成 Zero-DB State 境界，為橫向擴展鋪平道路。詳見 [Stateless Worker 架構](../async_workers/06_stateless_amortization_engine.md)。
- **✅ Done (2026-05-27)：應計基礎跨期切斷與已實現兌換損益 (Accrual Cut-off & Realized FX Gain/Loss)**：會計引擎全面升級，提早將發票憑證依據服務期間切割為獨立事件，並為每個事件綁定歷史匯率 (`targetFxDate`)。搭配 `FXInterceptor` 自動偵測多重匯率並轉化尾差為 `FOREIGN_EXCHANGE_GAIN_OR_LOSS`，完美補齊 IAS 21 外幣財報合規要求。詳見 [IAS 21 合規架構](../compliance_and_audit/07_accrual_cutoff_and_fx_realization.md)。
- **[CPA 碳排合規任務 (DPP 產品護照架構交由 Luphia 負責)]**
- **✅ Done (Architectural Decision: Immutable IDs)：排放係數時空快照 (Emission Factor Versioning)**：經過重新設計，不再將數值硬拷貝至 EsgRecord 造成 Schema 污染。改為全面採用「Immutable Coefficient IDs (如 epa-2025-t1-004)」，天然實現時空快照。
  - **🔒 Immutable Coefficient 兩大鐵律**：未來維護係數庫必須嚴格遵守：1. **禁止 UPDATE 數值** (避免污染歷史帳本)；2. **永遠只用 INSERT (Append-Only)**。
- **🚫 Canceled (Superseded by ADR 007)：Vendor MDM 本地唯讀對照庫架構升級 (Local SQLite Reference)**：(本項目已廢棄) 原擬將 150 萬筆台灣廠商登記資料打包為 `tax_reference.sqlite` 本地唯讀檔案，但因違背動態 RAG 精神，已被 ADR 007 全面取代。
- **⚠️ Pending [Critical/Audit Requirement]：官方標準係數資料庫轉移與自動化管線 (Standard Coefficients DB Migration & Scraper)**：
  - 目前為求開發便利，將大量係數混寫於常數檔中 (`TRUE_COEFFICIENT_DATA_*`)，並已建立過渡期的 `mock_eeio_coefficients.ts` 作為花費基礎估算防線 (Spend-based Proxy)。
  - 未來必須開發專屬排程指令，將數萬筆標準係數全數整併至資料庫（以 `accountBookId = null` 作為官方辨識錨定）。
  - **三大資料來源同步**：
    1. **US EPA** (美國環保署資料庫)
    2. **UK DEFRA** (英國環境食品與鄉村事務部資料庫)
    3. **Taiwan MOENV** (台灣環境部事業溫室氣體排放量資訊平台)
  - 建立定期自動下載 Pipeline，確保系統具備最新 Master Data 且強制遵守 Append-Only 不可竄改規則。
- **✅ Done (2026-05-22)：阻斷 AI 碳排幻覺與導入動態檢索 (Anti-ESG Hallucination & Two-Turn RAG)**：已廢棄靜態的 `EmissionFactorRegistry`，改為在 `EsgParsingSkill` 中實作兩回合動態檢索。第一回合由 AI 推論活動大類與關鍵字，第二回合由 AI 從系統過濾出的 Top 20 係數中做選擇題 (精準萃取係數 ID 與數量)，交由 TS 核心引擎進行 `MoneyUtil` 高位元乘法，徹底消滅碳排數值編造幻覺。
- **⚠️ Pending (急迫)：質量守恆勾稽與動態容許耗損率 (Mass Conservation & Loss Ratio Threshold)**：將「進銷存與原物料物理防護」實作於管線中。猶如財務的 A=L+E，系統將強制核對：`期初庫存重量 + 本期採購重量 = 消耗重量 + 期末庫存重量`。**(物理防呆地雷拆彈)** 避免過度剛性的物理防護導致系統死鎖，現實中絕對守恆不存在，必須在 Schema 為不同原物料引入動態的「容許耗損率 (Loss Ratio Threshold)」。若 AI 萃取出的消耗量與 ERP 盤盈虧落在合理閥值內，系統應自動生成「盤盈虧/耗損調整分錄」並繼續放行，以貼近真實製造業的運作樣貌。
  - **⚠️ Pending (2026-05-13)：進階防護實作**：必須在寫入 DB 前掛載 ERP 庫存比對微服務，若 `amount > MAX_INVENTORY_LIMIT` 則直接拋出 Error 並將憑證標記為 `FRAUD_SUSPECTED` 阻斷寫入，達到 100% 物理防漂綠。

- **⚠️ Pending：AI 封閉迴圈校正管線 (Closed-Loop Prompt Calibration)**：針對高度相似的憑證建立自動盲測機制。若 AI 解析錯誤，將「錯誤輸出」與「正確答案」交由高階模型自動產出優化版的解析 Prompt。**(資安防線地雷拆彈)** 禁止 AI 直接覆寫生產環境的 Prompt，以防惡意供應商發動「提示詞注入 (Prompt Injection)」攻擊導致模型崩潰。優化 Prompt 必須進入「人工覆核 (HITL)」，由具備 CPA 權限的超級管理員審核並簽章後，才能部署更新。

### 📌 Sprint 3: 視覺極限與合規深水區 (Vision Extreme & ITGC Compliance)

**🎯 收斂目標 (DoD)**：底層邏輯完美無瑕後，正式挑戰真實世界憑證，並疊加符合 SOX 內控與 ISO 標準的防護網，產出具備綠色溢價的官方憑證。

- **[CPA 財排雙軌合規任務]**
- **⚠️ Pending：是非題自我對抗防護 (Self-Consistency / Self-Reflection)**：針對高風險的 Stage 3 任務（如 ESG 排放係數或罕見分錄盲猜），在背景 Worker 引入自我詰問機制。讓模型產出初步結果後，由另一組 Prompt 進行是非題覆核，雙重確保沒有數學或邏輯幻覺。
- **✅ Done (Architectural Decision): API 權限層簡化與 Web3 原生授權 (API RBAC Simplification)**：捨棄在 Node.js API 層實作複雜的傳統 Web2 權限中介軟體（如 `SessionUser.ID !== createdBy` 等 Maker-Checker 邏輯）。
  - **Single Source of Truth (SSOT)**：因 `mission_board.sol` 智能合約已將所有任務指派與執行結果不可篡改地記錄於區塊鏈上，系統的「零信任」直接由底層合約保障。API 層僅作為輕量級傳輸通道，不需要過度防禦所謂的「權限污染」，這大幅降低了開發與維護的複雜度。

- **[Architect 穩定性與區塊鏈任務]**
- **⚠️ Pending：AI 服務解耦與統一路由 (AI Hub Service Orchestration)**：將 `@google/generative-ai` 等底層依賴全部限制於單一的 `ai_hub.service` 門面 (Facade) 中操作。系統的技能模組 (Skills) 或其他服務僅能透過此 Service 進行溝通，藉此集中實作動態的「模型選擇 (Model Selection)」與「多重 AI 服務來源切換 (Multi-Provider Routing)」。此架構確保了未來能平滑切換至不同供應商（如 Claude, OpenAI）或在國家級主權雲中部署地端開源模型，徹底消除 Vendor Lock-in 的資安風險。
- **✅ Done (Architectural Decision): 全鏈上自動稽核軌跡 (Event Sourcing Logs)**：捨棄傳統的資料庫雜湊鏈，全面依賴 mission_board.sol 的鏈上事件，防禦 DBA 竄改與截斷攻擊。
- **⚠️ Pending (Postponed): 全同態加密 (FHE) 與儲存隔離**：企業機密保護的終極型態。計畫於 `laria.ts` (寫入 IPFS 前後) 實作 FHE (Fully Homomorphic Encryption)，確保儲存節點無法窺探明文。
  - **架構決策 (延後實作)**：因 FHE 會導致 Payload 變為完全不可讀的密文，這將使現階段底層引擎（如財務與碳排計算）的除錯難度呈現指數級上升。為確保核心功能開發順利，此功能將嚴格推遲至「系統功能 100% 穩定」後再行整合。
- **再生原料憑證上鏈 (DPP Green Certificate)**：對接城市採礦戰略。當系統確認具備戰略循環（如人造螢石、高純度矽粉等）的再生原料入荷時 ，觸發智能合約，發行專屬的「再生原料憑證 Hash」 ，並自動綁定至該批次的數位產品護照 (DPP) 中 。

- **視覺與邏輯對抗測試 (Adversarial Testing)**：投入異常清晰但金額極度不合理的樣本，驗證「動態信賴區間」能否自動將其凍結。

---

## 🧭 第三章：防偏航與執行戰略 (Anti-Derailment Execution Strategy)

1. **公私協力與國家級主權雲端 (Data Sovereignty)**
   在部署架構上，因應新北市 1.9 萬家工廠的機密數據要求，系統需確保 100% 落地臺灣的國家級主權雲端（如 TWSC） ，不外流至境外伺服器，配合金融級 AI 與 FHE (全同態加密) 技術保障企業商業機密 。

2. **DPP 100 點驗證作為終極防弊 DoD (DPP Validation Rule)**
   將新北市的「DPP 100 點驗證規範」納入系統測試的 Acceptance Criteria：AI 必須自動驗證所有單據，**「無具體第三方報告與單據，系統不予給分」** ，實質防堵漂綠 (Greenwashing) 。

3. **合規混沌工程 (Compliance Chaos Engineering)**
   開發後期定期舉辦破壞性演練。模擬 DBA 刪除資料，驗證 Hash Chain 斷裂警報；模擬 AI 幻覺攻擊，驗證內控的凍結機制。

4. **2066 中小企業實兵演練 (2066 Enterprise PoC)**
   為證明系統能 100% 攔截漂綠與作假，並貼近 Big 4 查帳員對「業務邏輯多樣性」及「例外隔離機制」的絕對要求，我們正式捨棄單純追求巨量吞吐的虛榮指標 (台積電 780 萬筆專案)，改以 2066 為標竿，展開專注於「絕對防禦深度」的四階段精準打擊演練。
   [👉 詳見 2066 旗艦級 ESG 擬真數據 PoC 實作戰略](../testing_and_qa/e2e_audit_pipeline/2066_poc_blueprint.md)
   
   **[2066 PoC 演練四階段時序]**
   為了循序漸進驗證系統極限，我們嚴格定義以下實兵演練階段：
   - **階段一：微型契約與實質查核 (Task 1 & 2)**
     - **任務**：不追求量，只求「零捏造」的絕對真理。透過 3 張傳票建立 Ground Truth 逆推管線，徒手完成三表勾稽與 AI CPA 漏洞盲測。這決定了系統資料庫 Schema 的底線。
   - **階段二：單月全量度與業務矩陣 (放量至 4,500 筆)**
     - **任務**：建立中小型製造業的真實財務與碳排分佈。以 `createMany` 批次寫入單月 4,500 筆真實交易，確保 5xxx (營業成本)、62xx (管理費用)、63xx (研發費用) 均勻分佈，並涵蓋 Scope 1/2/3 完整的碳排活動。同步以 `cross_validator.ts` 進行財務、ESG、三表勾稽、防禦覆蓋率的四維度零誤差盲測。
   - **階段三：單年全量度與跨年時區防禦測試 (放量至 54,000 筆)**
     - **任務**：規模拉升至全年度 54,000 筆。刻意於 12/31 壓線邊界（`2024-12-31T23:59:59.000Z` UTC）模擬大額的期末折舊調整傳票 (`ADJ-DEP-2024`)，壓力測試報表引擎在邊界時間轉譯時，是否會發生折舊跨年位移的 Bug。
     - **DoD**：寫入期間無 OOM 記憶體耗盡；12/31 折舊費用 100% 精準鎖在 2024 年度；全年度數據與官方天花板達絕對 0 誤差。
   - **階段四：對抗式紅隊演練與視覺抽驗 (Adversarial Testing)**
     - **任務**：驗證系統遭遇「髒資料」時的精準報錯能力。刻意注入毒藥資料 (如：汽油配上度數的「量綱不符」碳排、未知會計科目)，並從 54,000 筆中隨機抽樣 10 筆生成含 15% 雜訊的 SVG 圖片。
     - **DoD**：人工確認 10 張 SVG 與 JSON 100% 一致。證明 ITAC 隔離生效：未知費用強行打入 `6288/7590` 虛擬隔離區並亮黃燈；量綱不符碳排遭無情阻斷。
