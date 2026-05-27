# 07. 應計基礎跨期切斷與已實現兌換損益 (Accrual Cut-off & Realized FX Gain/Loss)

> **Date**: 2026-05-27
> **Author**: Tzuhan
> **Status**: Done
> **Category**: Compliance & Audit (IAS 21 & Accrual Basis)

## 背景與問題 (Background)
在企業會計中，當一張跨越多個月分的憑證（如預付年度主機費、或季繳電信費）被 AI 萃取出來時，根據「應計基礎 (Accrual Basis)」，這筆費用必須被合理地切分到各個受益月份。
然而，在多幣別 (Multi-Currency) 的場景下，這會帶來嚴重的**匯率時空悖論**：
若系統僅使用憑證開立當日的單一匯率，將導致未來幾個月分攤的費用，未反映當時真實的匯率波動。當月底結帳或實際付款沖銷時，這會造成借貸不平，進而產生巨大的尾差 (Plug)。

## 決議與架構突破 (Resolution & Architecture Breakthrough)
為徹底解決此問題並符合 **IAS 21 (The Effects of Changes in Foreign Exchange Rates)**，我們對會計引擎進行了重大的架構翻新，核心實作包含三大突破：

### 1. 執行順序反轉 (Pipeline Inversion)
將 `AccountingEngineService.processCutoffEvents` 提早執行，先依據 `startDate` 與 `endDate` 將原始發票「切斷」成多個獨立的應計/預付事件後，再各自將這些**子事件**送入 `VoucherPipelineOrchestrator`。
這確保了每一個跨期事件都擁有自己獨立的生命週期與後續處理管線。

### 2. 鎖定前期匯率 (Historical FX Lock)
在切斷出「應付/預付」分錄時，引擎會動態地為該分錄綁定 `targetFxDate`（例如該服務所屬月份的月底）。
這讓 `fx.interceptor.service.ts` 不再盲目使用單一匯率，而是針對有 `targetFxDate` 的分錄，呼叫 `getCrossExchangeRateStatic` 重新獲取該歷史時間點的精確匯率。

### 3. 尾差轉化為已實現兌換損益 (Realized FX Gain/Loss)
在同一張跨期沖銷傳票中，必然會同時出現「歷史匯率 (應計)」與「當期匯率 (付款)」的碰撞。
此時，`fx.interceptor.service.ts` 會偵測到 `hasMultipleFxRates = true`。
一旦確認這是一張多重匯率的傳票，系統就不再將借貸不平的尾差（Plug）強塞給金額最大的分錄，而是**自動生成一筆全新的 `FOREIGN_EXCHANGE_GAIN_OR_LOSS` (已實現兌換損益) 分錄**，完美配平傳票 (A = L + E)！

## 影響與防線價值 (Impact & Audit Defense)
這套機制是 Big 4 審計等級的架構設計。它讓 iSunFA 能夠全自動、無痛地處理最複雜的跨國 SaaS 訂閱、境外電商逆向課稅，以及長時間跨度合約的外幣沖銷。我們不僅做到了零捏造，還讓匯兌損益的認列完全決定論化。
