# 架構決策紀錄 (ADR) 004: Voucher & Account Code Hybrid Deterministic Parsing Pipeline (財務傳票與會計科目混合決定論解析管線)

> **Date**: 2026-05-20
> **Author**: Tzuhan
> **Status**: Accepted (Pending Implementation in Sprint 1)
> **核心目標**: 在拔除上萬筆全域會計科目暴力注入後，補齊 `Voucher` 解析管線的防護缺口。捨棄危險的「自然語言模糊比對 (Fuzzy Matching)」，全面導入 **會計科目 Vector RAG**、**多維度攔截器** 與 **財務懸記機制 (Suspense Fallback)**，確保系統達到四大會計師 (Big 4) 等級的零幻覺與絕對應計基礎 (Accrual Basis)。

---

## 🛑 1. 當前架構挑戰 (Architectural Challenges)

在 [ADR 001] (The Great Purge) 中，我們移除了會計科目字典的暴力注入以節省 Token。然而，當時提出的替代方案——「AI 輸出自然語言，後端 Fuzzy Matching」以及「字串比對的 `VENDOR_RULE_REGISTRY`」——在財務合規標準下存在巨大風險：

1. **Fuzzy Matching 的審計災難 (Audit Catastrophe via Fuzzy Matching)**
   會計科目極度要求精確。例如「預付設備款」(資產) 與「設備維護費」(當期費用) 語義相近，若依賴模糊比對猜測，高機率導致三大表失真。
2. **字串攔截的脆弱性 (Fragility of String Interception)**
   `VENDOR_RULE_REGISTRY` 僅依賴 `vendor.includes`。一旦 AI 將「中華電信」寫成「Chunghwa Telecom」，決定論攔截即刻失效。
3. **缺乏防呆退路 (No Deterministic Fallback)**
   ESG 管線在 [ADR 002] 中擁有黃燈懸記機制，但 Voucher 管線若配對失敗，系統會強行寫入錯誤的科目（例如硬塞進 `6288 其他費用`），導致企業淨利被不當低估，嚴重違反「零捏造」鐵律。

---

## 🎯 2. 架構決策：傳票三重混合防護網 (Triple-Layer Hybrid Protection)

為了徹底根絕傳票解析的不確定性，我們決議實作與 ESG 等級齊平、甚至更為嚴苛的三重防護管線。

### 🛡️ 第一重：多維度廠商攔截器 (Multi-Dimensional Vendor Registry) [⚠️ Pending]

廢除單純的字串 `.includes()`，將 `VENDOR_RULE_REGISTRY` 升級為 $O(1)$ 的高精度配對引擎，以對齊世界級 ERP（如 SAP, Oracle）處理供應商主檔 (Vendor Master Data) 的標準作法。

- **統編優先 (Tax ID First)**：強制 OCR / AI 優先提取憑證上的統一編號 (Tax ID)。統編是不會變的物理真理，後端直接透過統編查表（例如：`24979925` 必定對應「中華電信」與特定的電信費科目），達成 100% 決定論攔截。
- **別名陣列 (Aliases Array)**：將廠商註冊表擴充支援陣列。例如 `{ aliases: ["中華電信", "Chunghwa Telecom", "CHT"] }`，最大化防禦 AI 命名變體與錯字。

### 🧠 第二重：本機向量檢索與選擇題 (Local Vector RAG & Multiple-Choice) [⚠️ Pending]

針對無法在第一道防線攔截的陌生單據，採用與 ESG 一致的 Vector RAG 策略。

1. **COA 靜態向量化**：將各國別 (TW, US, JP) 的會計科目表 (Chart of Accounts, COA，如 `tw.ts` 的 1500 個科目) 連同其定義 (`description`)，於建置期打包為本機的 `coa_embeddings.json`。
2. **AI 降級與剝奪選擇權 (AI Degradation)**：在 `voucher_lines_parsing.ts` 中，徹底刪除 `accountingCode` 的 Schema 欄位。AI 的任務僅剩下從圖片中客觀萃取每行明細的：「摘要 (`particular`)」、「金額 (`amount`)」、「借貸 (`isDebit`)」。
3. **執行期後端逐行映射 (Per-Line Deterministic RAG)**：AI 完成萃取後，在後端 `document_sync.repo.ts` 階段，由系統針對每一行明細的 `particular`，呼叫 `CoaVectorSearchService` 進行純 TypeScript 餘弦相似度運算，直接算出唯一確定的 `accountCode`。
   **架構效益**：徹底解決了「單據包含多種分錄，無法在 AI 執行前進行全域 Top-3 注入」的邏輯悖論，並從物理上完全剝奪了 AI 推測或發明新會計科目的權力。

### 🚥 第三重：雙軌懸記與虛擬科目隔離區 (Dual-Track Suspense & Quarantine Zone) [⚠️ Pending]

如果後端 Vector RAG 算出來的餘弦相似度過低（無法找到精確對應），**絕對禁止系統使用 Fuzzy Matching 強行猜測科目**。為了兼顧「四大會計師的查核鐵律」與「管理報表淨利的真實性（避免虛增淨利）」，我們將懸記防線升級為兩道分流：

1. **性質完全未知 -> 進入 BS 懸記 (資產/負債防線)**
   - **情境**：如銀行帳戶扣款但無憑證，連是否為「費用」都無法確定。
   - **處置**：必須強制掛載於資產負債表 (BS)。借方預設寫入 `1471 暫付款`；貸方預設寫入 `2330 暫收款` (已收) 或 `2204 暫估應付費用` (應計)。這確保了損益表不被垃圾數據污染。
2. **確認為損益性質，但分類未知 -> 進入 PL 虛擬隔離區 (費用防線)**
   - **情境**：收到廠商發票，確認為營運支出 (Expense)，但 Vector RAG 找不到精準對應。若此時硬塞入 1471，將導致費用低估、淨利虛增。
   - **處置 (虛擬配平)**：系統自動將其派發至專屬的「PL 虛擬科目隔離區」。依據 `tw.ts` 字典，預設對應 `6288 管理費用 - 其他費用`、`6400 其他費用` 或 `7590 什項支出`。

- **租戶動態設定 (Tenant Account Settings) [架構演進]**：
  如同 `COUNTRY_ALIASES`，在帳本設定 (`AccountBook` model) 中開出 `TenantAccountSettings` 介面，允許 CPA 指定其專屬的 BS Suspense 與 PL Quarantine 科目。若未設定，則退回系統預設。

- **核心防護鎖 (審計軌跡標記)**：
  任何進入上述 BS 或 PL 隔離區的分錄，必須強制打上：
  - `isVerified = false`
  - `generationSource = "SYSTEM_SUSPENSE_FALLBACK"`
  - `aiNote` 寫入：「RAG 未命中。基於保守原則，系統已自動派發至懸記/虛擬隔離區。需 CPA 於月底結帳 (Month-end Close) 進行人工重分類 (Reclassification)。」

- **架構師的合規效益 (Management & Audit View)**：
  - **管理層視角**：損益表上的費用總額是準確的，淨利沒有被虛增，支出已真實反映於 PL 虛擬科目。
  - **審計師視角**：CPA 只要過濾 `isVerified = false`，就能瞬間抓出所有「被虛擬配平」的分錄並要求人類重分類，完美符合「零捏造」的審計軌跡！

---

## 📊 3. 決策效益總結 (Consequences)

1. **消除 Fuzzy Matching 風險**：徹底棄用不可靠的字串模糊比對，改為精準的 Vector RAG + 統編決定論。
2. **財務底線的保全**：透過 Suspense Fallback，我們把未知的錯誤控制在「暫付/暫收」的隔離區，而非污染核心損益表。
3. **效能守恆**：本機 Vector RAG 確保了 Executor 依舊維持 Zero DB I/O 的無狀態設計，具備無限擴展性。

---

## 🪞 附錄：Sprint 1 實作現況與斷層分析 (Implementation Gap Analysis)

> **稽核時間**: 2026-05-20

### 1. 🔍 廠商攔截器：只有半套，最核心的「統編」還沒做
雖然 `src/services/rules/vendor_registry.ts` 和 `vendor_rules.ts` 已經存在，並且實作了「別名陣列 (Aliases Array)」，但它的 `match()` 方法目前**只接收 `vendorName` 並使用 `.includes` 進行模糊比對**。
AI 在 OCR 階段 (`VisionAccountingService`) 雖然有萃取出 `vendorTaxId`，但後端根本還沒有實作「Tax ID 優先的 $O(1)$ 決定論比對」。這在審計上依然有很高的漏網風險。

### 2. 💣 本機向量檢索 (Vector RAG)：根本還在「暴力注入」階段
我在 `src/services/vision.accounting.service.ts` 的第 147 行發現了這段程式碼：
`const availableAccounts = ACCOUNTS.TW.map(...)`
系統目前**依然在把台灣帳本一千多個會計科目全部塞進 Prompt 裡** (`[ACCOUNTING DICTIONARY REFERENCE (TAIWAN)]`)，逼迫 AI 在龐大的字典中大海撈針！這就是我們急需用 Vector RAG 替換掉的 Token 災難與幻覺根源。

### 3. 🚦 雙軌懸記與虛擬隔離區 (Suspense & Quarantine)：完全不存在
無論是核心寫入層 (`document_sync.repo.ts`) 還是解析層，目前程式碼中**完全沒有看到**任何關於 `1471 暫付款` (BS)、`2330 暫收款`，或者是我們剛剛決議的 `6288 管理費用-其他費用` (PL) 隔離區的防呆路由機制。一旦 AI 給出爛數字，系統沒有任何黃燈保護傘。
