# 實作與技術債：02. 日記帳至會計傳票 (Journal to Voucher)

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
Prompt 中指示：`「本位幣: {currency}。請將憑證上的幣值轉換為本位幣。」`
這讓 AI 承擔了「取得歷史匯率」與「浮點數乘法」的雙重責任。AI 極可能因為缺乏即時金融數據而「編造匯率」，或在小數點計算時產生截斷誤差。在 CPA 審計標準下，一元之差即代表內控失敗。

## 3. Deloitte 級別重構目標 (Refactoring Towards Audit-Ready)

1. **實作兩段式 RAG 科目檢索 (Two-Stage RAG Mapping)**：
   - AI 先判斷科目大類 (Asset, Liability, Expense 等)。
   - 後端利用向量檢索 (Vector Search) 或關鍵字過濾，挑出最符合的 5~10 個精確子科目傳給 AI 做最終選擇，徹底解決 Token 爆炸問題。
2. **將匯率與數學運算抽回系統層 (Backend Math Offloading)**：
   - AI 僅被允許萃取「原始幣別 (如 USD)」與「原始金額 (如 100.50)」。
   - 後端透過專屬的匯率微服務 (Exchange Rate API) 取得精確的結匯日匯率，並使用精確的 `Decimal` 模組算出本位幣，從根源消滅數學幻覺。
