# 實作與技術債：02. 日記帳至會計傳票 (Journal to Voucher)

> **Date**: 2026-05-10
> **Author**: Tzuhan

> **CPA 查核視角 (Audit Lens)**：
> 會計傳票 (Voucher) 是財報的骨幹，決定了「借貸平衡 (Double-Entry)」與「會計科目分類 (Chart of Accounts Mapping)」。此階段不容許任何一毛錢的誤差，且所有會計科目都必須精確對應至企業的會計制度字典，不能有無中生有的科目。

## 1. 模組實作現況 (Current Implementation)

**觸發點**：完成日記帳解析後，Worker 進入 `VOUCHER_BASE_PARSING` 與 `VOUCHER_LINES_PARSING` 階段。
**處理邏輯**：
系統實作了「關注點分離 (Separation of Concerns)」，將分析拆為兩支 Prompt (`src/constants/prompts/voucher.ts`)：

1. **Base Parsing (`getBaseVoucherPrompt`)**：判斷交易的整體屬性（交易類型 `INCOME/OUTCOME/TRANSFER`、備註、日期）。
2. **Lines Parsing (`getVoucherLinesPrompt`)**：進行精密借貸平衡。系統會將整個國家的會計科目字典（例如 `ACCOUNTS.TW`）透過 `JSON.stringify` 寫死在 Prompt 底部，強制 AI 只能從這個池子挑選 `accountingCode`。同時也依據 `accountBook.currency` 要求 AI 將憑證外幣轉換為本位幣。

## 2. 存在之技術債與架構地雷 (Technical Debts & Gotchas)

### 🚨 2.1 暴力字典注入的 Token 崩潰危機 (Dictionary Injection Bottleneck)

目前直接 `JSON.stringify` 整個國家的標準科目表，對於初期開發尚可接受。但大型企業 (如我們的目標客戶) 通常有「數千甚至上萬筆」自定義的二級、三級子科目與專案代號。
將上千筆字典硬塞進 Prompt，不僅會導致 Token 爆炸、拖垮系統回應速度，還會讓 LLM 在龐大文字海中產生「注意力渙散 (Attention Dilution)」，選錯相近科目。

### 🚨 2.2 匯率轉換與數學誤差風險 (Foreign Exchange Math Risk)

過去 Prompt 中指示：`「本位幣: {currency}。請將憑證上的幣值轉換為本位幣。」`
這讓 AI 承擔了「取得歷史匯率」與「浮點數乘法」的雙重責任。AI 極可能因為缺乏即時金融數據而「編造匯率」，或在小數點計算時產生截斷誤差。在 CPA 審計標準下，一元之差即代表內控失敗。

**🛠️ 處理現況 (2026-05-13)**：

- **Prompt 端**：已拔除 AI 計算匯差的權力 (`journal.ts`)，強制要求保留原始幣別與金額。
- **Backend 端 (⚠️ Pending)**：雖然拔除了 AI 的權限，但我們尚未實作「匯率微服務 (Exchange Rate API)」。這意味著目前系統處理外幣憑證時，仍無法自動化結算回本位幣。此功能必須在 Sprint 2 優先實作，否則會影響跨國企業的試算表平衡。

### 🚨 2.3 傳票金額重複加總問題 (Voucher Duplication Issue)

目前的 `Voucher` 統計邏輯中，針對「代繳」與「已繳費」的情境未有明確的防護分離，導致部分複雜憑證在總額結算時會產生重複計算（Double-counting）。此商業邏輯錯誤目前標記為 Pending，將於接下來的 Sprint 中修復。

## 3. Deloitte 級別重構目標 (Refactoring Towards Audit-Ready)

1. **全面導入混合決策管線 (Hybrid Deterministic Pipeline)**：
   - **Stage 1 (萃取特徵)**：AI 僅負責萃取發票廠商、日期、金額等客觀特徵。
   - **Stage 2 (程式查表)**：完全廢除 Prompt 字典注入。依賴後端 TypeScript 建立「黃金廠商映射表」，看到如「中華電信繳費通知」，直接回傳確定的 CPA 認證分錄 (Deterministic Logic)。
   - **Stage 3 (AI 推論)**：若遇未知憑證，才啟動具備向量檢索 (Vector Search) 功能的高階 Prompt 進行猜測。
   - **策略模式註冊表 (Strategy Registry Pattern)** `(👉 交由 Julian 負責實作)`：將黃金映射表封裝至 `VENDOR_RULE_REGISTRY`，後端透過廠商名稱動態調用對應的查表函式，遵守 OCP 開閉原則。
   - **(未來擴充) 審計軌跡標籤 (Audit Trail Flag)**：強制要求輸出的 JSON 中帶有 `generationSource`（如 `RULE_ENGINE_STAGE_2` 或 `LLM_FALLBACK_STAGE_3`），供會計師查帳時快速篩選高風險傳票。
2. **將匯率與數學運算抽回系統層 (Backend Math Offloading)** `(👉 交由 Julian 負責實作：外幣匯率自動化爬蟲與換算服務)`：
   - AI 僅被允許萃取「原始幣別 (如 USD)」與「原始金額 (如 100.50)」。
   - 後端透過專屬的匯率微服務 (Exchange Rate API) 取得精確的結匯日匯率，並使用精確的 `Decimal` 模組算出本位幣，從根源消滅數學幻覺。
3. **✅ 已完成：VoucherLine 資料庫 Schema 淨化**：
   - 徹底拔除了 `VoucherLine` 模型中的 `originalAmount` 與 `currency` 欄位。
   - 所有外幣細節全面回歸至 `Journal` 的文本 (`text`) 或備註中記錄，確保傳票明細層 (VoucherLine) 專注於本位幣的借貸平衡，大幅降低後端結算與對帳的複雜度。
