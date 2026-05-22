# 架構決策紀錄 (ADR) 004: Voucher & Account Code Hybrid Deterministic Parsing Pipeline (財務傳票與會計科目混合決定論解析管線)

> ⚠️ **CRITICAL DEPRECATION WARNING (2026-05-22)**: 本文件提倡的「多維度廠商攔截器 (`VENDOR_RULE_REGISTRY` 靜態統編防線)」已被認定為架構地雷，且其相關原始碼已於 Sprint 1 中被**全數刪除**。目前的傳票解析全面改用 Two-Turn RAG 與零信任防線。請立即轉移至最終決策文件：**[ADR 007](./007_ai_accounting_defenses_tradeoffs_and_upgrade_paths.md)**。

> **Date**: 2026-05-20
> **Author**: Tzuhan
> **Status**: Accepted (✅ Implemented & Optimized in Sprint 1)
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

### 🛡️ 第一重：多維度廠商攔截器 (Multi-Dimensional Vendor Registry) [🚫 Canceled]

**廢棄原因 (2026-05-22 Update)**：原先我們依賴 O(1) 的倒排索引與統編比對來強迫配對會計科目。但實務上，「不能看人下單，要看交易本質 (Substance over Form)」。單一廠商（如中華電信）可能販售多種不同性質的商品（通訊費 vs 設備資產）。帶小抄上考場會引發嚴重的「靜態誤判」。

**解決方案**：此防線已徹底廢除。Voucher 解析管線全面降級為 **「單回合萃取與後端決定論懸記 (Single-Turn Extraction & Deterministic Suspense)」** 以防堵 AI 幻覺。
- **Turn 1 (客觀萃取)**：AI 僅負責客觀萃取明細摘要 (`particular`)、金額 (`amount`) 與借貸方 (`isDebit`)。徹底拔除 AI 決定會計科目的權力。
- **後端 Bigram 閥值懸記**：由 `CoaVectorSearchService.matchWithScore` 計算字面相似度。大於 0.85 採信；否則一律退回後端的 Dual-Track Suspense Fallback (BS / PL 隔離區)。

### 🧠 第二重：本機向量檢索與逐行映射 (Local Vector RAG & Per-Line Mapping) [✅ Done]

針對無法在第一道防線攔截的陌生單據，採用與 ESG 一致的 Vector RAG 策略。

1. **COA 靜態向量化**：將各國別 (TW, US, JP) 的會計科目表 (Chart of Accounts, COA，如 `tw.ts` 的 1500 個科目) 連同其定義 (`description`)，於建置期打包為本機的 `coa_embeddings.json`。
2. **AI 降級與剝奪選擇權 (AI Degradation)**：在 `voucher_lines_parsing.ts` 中，徹底刪除 `accountingCode` 的 Schema 欄位。AI 的任務僅剩下從圖片中客觀萃取每行明細的：「摘要 (`particular`)」、「金額 (`amount`)」、「借貸 (`isDebit`)」。
3. **執行期後端逐行映射 (Per-Line Deterministic RAG)**：AI 完成萃取後，在後端 `document_sync.repo.ts` 階段，由系統針對每一行明細的 `particular`，呼叫 `CoaVectorSearchService` 進行純 TypeScript 餘弦相似度運算，直接算出唯一確定的 `accountCode`。
   **架構效益**：徹底解決了「單據包含多種分錄，無法在 AI 執行前進行全域 Top-3 注入」的邏輯悖論，並從物理上完全剝奪了 AI 推測或發明新會計科目的權力。

### 🚥 第三重：雙軌懸記與虛擬科目隔離區 (Dual-Track Suspense & Quarantine Zone) [✅ Done]

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

> **稽核時間**: 2026-05-22 (✅ 註：以下架構優化已於 2026-05-22 全面修復並實作完成)

### 🚨 2026-05-22 已修復之技術負債 (Resolved Technical Debt)
1. **[防護升級] 懸記科目 4 向精準分流 (✅ Fixed)**: `document_sync.repo.ts` 已重構為嚴謹的 4 向精準分流 (BS 借貸 1471/2330，PL 借貸 6288/7590)，徹底解決了先前借貸顛倒的會計嚴重錯誤。
2. **[演算法升級] Vector RAG 替換計畫 (✅ Fixed)**: `coa_vector_search.service.ts` 已不再是 Fallback 框架。我們實作了純 TypeScript 的 Bigram 餘弦相似度 (Cosine Similarity) 演算法，直接將憑證摘要與會計科目的定義進行數學向量對比，達成純本機 RAG 檢索。作為 coa_embeddings.json 就緒前的真・演算法防護）。

### 1. 🔍 廠商攔截器：只有半套，最核心的「統編」還沒做 (🚫 已徹底廢除)
> **2026-05-22 Update**: 為了避免靜態誤判（如統一超商可能同時開出交際費與伙食費），我們已於 Sprint 1 正式刪除 `vendor_rules.ts` 與 `vendor_registry.ts`，不再依賴 O(1) 決定論比對。此技術債因架構升級而自動消滅。

### 2. 💣 本機向量檢索 (Vector RAG)：根本還在「暴力注入」階段 (✅ Fixed)
> **2026-05-22 Update**: 我們已從 `vision.accounting.service.ts` 中拔除暴力塞入的全域字典，改由 `voucher_lines_parsing.ts` (Turn 1) 僅進行摘要萃取，並在 `document_sync.repo.ts` 透過 `CoaVectorSearchService` 進行本機後端的 Bigram 數學運算，徹底根除了 Token 災難與 AI 幻覺。

### 3. 🚦 雙軌懸記與虛擬隔離區 (Suspense & Quarantine)：完全不存在 (✅ Fixed)
> **2026-05-22 Update**: 已於 `document_sync.repo.ts` 全面實裝！系統不再依賴 Fuzzy Matching，低信賴度的分錄將被強制打入 BS 防線 (`1471`/`2330`) 或 PL 隔離區 (`6288`/`7590`)，並標上 `isVerified = false` 與 `generationSource = JournalGenerationSource.SYSTEM_SUSPENSE`，完美落實了「零捏造」的四大查帳標準。
