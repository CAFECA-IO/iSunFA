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

### 🚨 2.3 ✅ 已徹底修復：傳票金額重複加總問題 (Voucher Duplication Issue)

過去的 `Voucher` 統計邏輯中，針對「代繳」與「已繳費」的情境未有明確的防護分離，導致部分複雜憑證在總額結算時會產生重複計算（Double-counting）。
**現已拆彈**：我們已實作 `ReconciliationService`。為避免去中心化 Executor 產生時序悖論 (Race Condition)，系統透過背景批次池化 (Pool Matching)，拉出同供應商的單據依 `tradingDate` 重新排序並雙向扣合 (`clearedByVoucherId`)。完美達成會計應計基礎 (Accrual Basis) 的完整閉環。

## 3. Deloitte 級別重構目標 (Refactoring Towards Audit-Ready)

1. **全面導入混合決策管線 (Hybrid Deterministic Pipeline)**：
   - **Stage 1 (萃取特徵)**：AI 僅負責萃取發票廠商、日期、金額等客觀特徵。
   - **Stage 2 (本地向量檢索)**：完全廢除靜態廠商攔截器。改用純 TypeScript 的 `CoaVectorSearchService` 進行本地的 Bigram 向量檢索，從數百個科目中過濾出 Top 10 最適合當下交易情境的候選名單。
   - **Stage 3 (AI 強制選擇題)**：將 Top 10 候選清單交給 AI 進行「第二回合 (Turn 2)」推論。AI 失去自由創造會計科目的權力，必須強制從我們提供的選項中挑選一個最合理的科目，達成 100% 存在於系統字典中的保證。
   - **✅ 已實作：零信任審計軌跡標籤 (Zero-Trust Audit Defense)**：強制將所有 AI 產生的 JSON 賦予 `isVerified: false` 標籤，並標記 `generationSource: "AI_SPECULATIVE"` 或對應的來源，供會計師查帳時快速篩選高風險傳票。
2. **將匯率與數學運算抽回系統層 (Backend Math Offloading)** `(👉 交由 Julian 負責實作：外幣匯率自動化爬蟲與換算服務)`：
   - AI 僅被允許萃取「原始幣別 (如 USD)」與「原始金額 (如 100.50)」。
   - 後端透過專屬的匯率微服務 (Exchange Rate API) 取得精確的結匯日匯率，並使用精確的 `Decimal` 模組算出本位幣，從根源消滅數學幻覺。
3. **✅ 已完成：VoucherLine 資料庫 Schema 淨化**：
   - 徹底拔除了 `VoucherLine` 模型中的 `originalAmount` 與 `currency` 欄位。
   - 所有外幣細節全面回歸至 `Journal` 的文本 (`text`) 或備註中記錄，確保傳票明細層 (VoucherLine) 專注於本位幣的借貸平衡，大幅降低後端結算與對帳的複雜度。
4. **🛡️ 精度防護：財務金流強制 BigInt 鑄造 (Mandatory BigInt Casting)**：
   - 由於 Prisma Schema 將 `Order.amount` 與 `VoucherLine.amount` 等牽涉到財務的欄位定義為 64-bit `BigInt`，以防止千兆級法幣或 18 位數加密貨幣的溢位。
   - 在 AI 回傳或查表決策出正確的 `amount` 後，準備回寫至主系統前，必須透過 `BigInt(Math.round(amount))` 將數值強制轉型為原生 JavaScript `BigInt`。
   - 這同時滿足了 TypeScript 編譯器對 `BigInt` 欄位的嚴格型別要求，並順利通過主系統的 `Database Boundary Guard`，徹底防堵原始 `number` 進入資料庫造成的潛在精度流失。

## 4. 攔截器與業務邏輯防禦 (Interceptor Defenses)

為了貫徹「零捏造」與「無狀態」架構，系統在 `MissionRecorder` 寫入主系統資料庫前，建置了「決定論攔截器管線 (VoucherPipelineOrchestrator)」，確保所有業務邏輯與型別精度完美合規：

1. **TaxStrategyService (境外電商稅額推估)**：
   - 針對未具備 8 碼台灣統編的境外電商 (如 AWS、Adobe)，系統會透過 `UniversalAccountTag.INPUT_TAX` 與 `OUTPUT_TAX` 自動補齊 5% 逆向稅額。
   - 同時認列進項 (Debit) 與銷項 (Credit)，確保基礎傳票借貸平衡 (A = L + E)，並透過語意標籤避免科目硬編碼 (Hardcoding)。
2. **AccountingEngineService (跨期切斷 Cut-off)**：
   - 根據發票的服務起訖日與付款日，自動執行會計應計基礎 (Accrual Basis) 的判斷。
   - **後付制 (Post-paid)**：自動將傳票拆分為「費用估列 (Accrued Expense)」與「付款沖銷 (Payment Offset)」。
   - **預付制 (Pre-paid)**：自動轉入「預付資產 (Prepaid Asset)」並觸發後續的攤銷排程。
3. **FxInterceptorService (匯率與精度防護)**：
   - 全面配合 `MoneyUtil` (封裝 `Prisma.Decimal` / `BigInt`) 執行高精度外幣轉換。
   - 實作「尾差配平 (Plug to the largest line)」，確保匯率轉換後產生的微小四捨五入誤差不會導致傳票借貸不平。
