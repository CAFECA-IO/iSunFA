# CPA 稽核盲點：歐洲區稅務 (EU VAT) 與外幣期末重評價 (Month-end FX Revaluation)

> **Date**: 2026-05-27
> **Author**: Tzuhan
> **Status**: Paused
> **Context**: 於 CPA 視角的系統架構全盤查核 (System-wide Code Review) 中，發現系統準備向歐洲 (EU) 語系與帳本規則跨足時，存在的兩大決定性財務風險。這兩項風險若未妥善處理，將導致嚴重的財報失真與跨國稅務裁罰。

---

## 1. 💶 歐洲區 (EU) 稅務逆向課稅的災難 (VAT Directive Blind Spot)

### 📌 背景與盲點
我們在 `country.ts` 擴充了 `EU` (歐洲) 的語系與 `EUR` 幣別，顯示系統的底層字典檔已經準備支援跨國歐洲節點。
然而，在 `TaxStrategyService` 中所實作的「境外電商逆向課稅 (Reverse Charge)」機制，目前是**完全基於台灣的 5% 稅法寫死的 (Hardcoded)**。

### 🚨 風險與影響
歐盟的 VAT (Value Added Tax) 稅法極度複雜，且具有以下特性：
1. **多重稅率**：歐盟各成員國 (Member States) 的標準稅率介於 17% 到 27% 之間（例如德國 19%，匈牙利 27%）。
2. **B2B 與 B2C 邏輯分歧**：在 B2B (企業對企業) 交易中，逆向課稅 (Reverse Charge) 的確由買方申報；但若是 B2C，則適用 OSS (One Stop Shop) 機制。
3. **免稅額與進項抵扣限制**：部分行業與支出可能不允許進項稅額全額抵扣。

**結論**：如果系統將台灣單純的 5% 逆向課稅邏輯直接套用於 `accountBook.country === CountryCode.EU` 的帳本，將會造成毀滅性的稅務申報錯誤。不僅會讓財務報表上的應交稅費嚴重失真，更會引發歐盟稅務機關 (Tax Authorities) 的鉅額逃漏稅罰金。

### 🛠️ 建議修正方向
- 將 `TaxStrategyService` 改寫為**策略模式 (Strategy Pattern)**，針對不同 `CountryCode` 載入不同的稅務計算引擎 (`TaiwanTaxStrategy`, `EuVatStrategy`)。
- 在實作 `EuVatStrategy` 前，暫停對 `EU` 帳本的自動稅額推估，改為「僅依賴憑證表面稅額，不進行額外推估」的防守策略。

---

## 2. 💱 期末匯率重評價 (Month-end Revaluation) 的缺失

### 📌 背景與盲點
在 iSunFA 的「決定論管線 (Deterministic Pipeline)」中，`FxInterceptorService` 已經能精準地將外幣憑證在「交易日」當天，依據歷史匯率 (Historical Rate) 轉換為本位幣 (Base Currency)。
這非常符合 IFRS 對於「交易日初始認列 (Initial Recognition)」的規範。

### 🚨 風險與影響
根據國際會計準則 **IAS 21 (匯率變動之影響)**，外幣貨幣性項目 (Monetary Items，例如應付帳款 Accounts Payable、應收帳款 Accounts Receivable) 在「每個資產負債表日 (即期末/月底)」必須使用**期末收盤匯率 (Closing Rate)** 進行重新評價。

如果一張外幣發票在月底前尚未付款 (尚未沖銷)：
1. 它的帳面價值仍停留在「歷史匯率」。
2. 但實際的負債義務已經隨著匯率波動而改變。
3. 若系統缺乏期末重評價引擎，將導致外幣應付帳款的「本位幣餘額」失真，且損益表上將漏報「未實現兌換損益 (Unrealized FX Gain/Loss)」。這在會計師查帳時，屬於「期末調整分錄缺失」的重大內部控制缺失。

### 🛠️ 建議修正方向與暫時性解法 (Workaround)
- **暫時性解法 (已於 2026-05-27 實作)**：實作 `FxRevaluationWorkerService` 月結排程，撈取月底最後一天的匯率，利用「月底匯率」與「歷史匯率」的差額反推。為保持資料庫單純未改 Schema，採數學反推機制（現有本位幣餘額 / 歷史匯率 = 外幣原額）。
- **終極架構技術債 (Schema 升級)**：數學反推機制會面臨「小數點四捨五入誤差 (Rounding Errors)」的致命傷。長遠來看，為了追蹤外幣債權與債務的真實水位，必須賦予每一筆分錄記錄原幣金額的能力。
  - 必須在 `VoucherLine` 模型中新增 `foreign_amount` 與 `foreign_currency` 欄位。
  - 這將使系統能透過 SQL 聚合算出單一供應商/客戶的純外幣餘額，徹底根絕反推所造成的匯差誤差。
