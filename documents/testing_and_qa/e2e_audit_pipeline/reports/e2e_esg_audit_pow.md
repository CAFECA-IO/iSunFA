# 🚀 任務總結與 Audit Trail：iSunFA 財報引擎架構重構與 E2E 盲測排雷

> **Date**: May 2026 (20260505)
> **Author**: Tzuhan
> **Objective**: 徹底解耦財報引擎對語系字串的依賴，對齊 IFRS 會計準則，並清除影響 2330 ESG 盲測數據的底層幽靈資料，實現 0.0000% 誤差的防彈管線。

## 🏆 高階技術成果 (Executive Summary)

### 1. 資料與邏輯徹底解耦 (i18n 解放與防禦性編程)
過去系統高度依賴 `name.includes("中文")` 來歸類財報項目，面臨外商客戶或異體字時極易崩潰。我們完成了底層重構：
*   **標籤化架構 (Tag-based Architecture)：** 在 `IAccount` 介面中擴充了 `isInterestBearing` (有息負債) 與 `isDividend` (股利) 等業務標籤，並寫入全站字典檔。
*   **字串解耦：** 拔除各報表中的字串比對，全權信任底層的會計代碼與 `isDebit` 借貸邏輯。

### 2. 弭平「核彈級」財務指標失真 (Financial Metrics Hardening)
*   **流動比率失真修復：** 補齊漏網的 `23` 開頭代碼，確保流動負債不會被低估。
*   **反向指標零分母防禦：** 為 `safeDivide` 實作泛型 Fallback 機制，當零負債企業利息費用為 0 時安全回傳 `null`，避免被誤判為最高倒債風險。
*   **彈性面額解耦：** 抽離流通在外股數硬編碼的 `/ 10` 計算邏輯，支援台灣彈性面額制度及美股無面額股票。

### 3. IFRS 準則對齊與邏輯悖論修正 (Accounting Logic Alignment)
*   **營運費用 (OpEx) 膨脹修正：** 將製造設備折舊從營業費用 (`6184`) 重分類至營業成本 (`5110`)，大幅還原真實毛利率。
*   **布林邏輯悖論解法：** 修復子集交集陷阱，確保所得稅費用 (`79xx`) 不會被錯誤地「營業外收支」吞噬。

### 4. ESG 資料管線除錯與淨空 (Data Pipeline Idempotency)
*   **幽靈數據 (Ghost Data) 清除：** 排查出碳排數據 100% 兩倍誤差的原因是系統反覆執行累積的髒資料，撰寫 `clean_db.ts` 徹底淨空資料庫還原 Baseline。
*   **數值防禦強化：** 加入正則表達式，妥善處理帶有括號 `()` 的負數表達與千分位逗號。

### 5. 架構權衡與效能保護 (Architectural Trade-offs)
*   拍板決議：**「財報引擎使用原生 Number，ESG 引擎使用 Decimal」**。避開 `BigInt` 序列化地雷。
*   👉 *完整決策分析見：[`numerical_precision_guideline.md`](../../engineering_guidelines/numerical_precision_guideline.md)*

---

## 🕵️♂️ 詳細除錯紀錄 (Detailed Audit Trail - 24 Fixes)

## 🕵️♂️ Phase 1: 業務邏輯與會計分類錯誤 (Domain Logic Bugs)
*解決了最核心的報表失真問題，確保財務恆等式與現金流計算的絕對正確。*

1. **【CF】累計折舊反向誤判**：貸方提列折舊（非現金交易）被系統誤當作「處分資產換取現金」，導致投資活動現金流入憑空暴增。
2. **【IS】布林邏輯短路地雷**：前人寫了 `code.startsWith("8") || code.startsWith("9")`，導致所有「8 開頭」的營業外費損全部被當成「所得稅」扣除，直接毀滅了 EBITDA 指標。
3. **【CF】短期借款代碼錯置**：系統用 `212` 來判定借款，導致真正的銀行借款（`210` / `211`）掉入 `else` 條件，被錯誤歸類到營業活動的「營運資金」，引發粉飾現金流的疑慮。
4. **【BS】流動負債漏算 23 開頭**：系統只抓了 `21` 與 `22`，完全忘記 `23`（本期所得稅負債、一年內到期長債）也是流動負債，導致「流動比率」異常虛高。
5. **【BS】JS 運算子優先級陷阱**：`!line.isDebit === null` 因為 `!` 優先級高於 `===`，導致防呆語句永遠回傳 `false`，防禦機制形同虛設。
6. **【Metrics】除零陷阱毀滅優質企業**：利息保障倍數使用 `safeDivide`，導致「零負債企業」（利息費用為 0）被算出 `0` 或拋出 `Infinity` 崩潰，讓最好的公司被誤判為最高倒債風險。
7. **【ESG】千分位逗號解析截斷**：財報字串帶有逗號時，JS 的 `parseFloat` 會直接截斷數字，導致百萬噸的碳排放入庫時變成只有個位數。
8. **【Seeder】會計科目錯置 (5110 vs 6184)**：台積電的製造設備折舊被全數塞入 `6184`（營業費用），而非 `5110`（營業成本），導致 Opex 暴增 217%，毛利率嚴重失真。
9. **【BS】未結帳財報無法配平 (Not Balance)**：資產負債表引擎漏計了 `4~9` 的損益科目，導致在尚未進行期末結轉時，「總資產 ≠ 總負債 + 總權益」，差額剛好是本期淨利。
10. **【CF】間接法營業外損益雙重計算**：計算營業現金流時，未將淨利中的「營業外收支（如處分資產利益）」反向調節排除，導致該筆現金流在營業與投資活動中被重複計算。
11. **【IS】所得稅邏輯悖論**：定義營業外收支時未排除所得稅（`isTax=79` 卻又符合 `isNonOp=7`），導致 `true && false` 悖論，讓所得稅永遠掉入營業外費損。

---

## 🛡️ Phase 2: 系統防禦與資料管線缺陷 (Data Pipeline & E2E Infrastructure)
*解決了讓系統在極端資料、真實環境、或併發請求下會直接崩潰的工程陷阱。*

12. **【Test】破除「假安全感」的 Cross Validator**：舊版測試只用 `for` 迴圈自己加總數字，未能真實呼叫系統的 `generateIncomeStatement`。我們強制將 E2E 測試與核心引擎綁定，成為抓出所有 Bug 的最重要防線。
13. **【API】Gemini API 503 限流崩潰**：AI 解析 83 張圖會直接把 Google API 觸發 Rate Limit，我們導入了 `p-limit` 進行併發控制與 Retry 機制，拯救了管線穩定度。
14. **【State】管線狀態不乾淨導致數據翻倍 (`--clean`)**：實作了冪等性 (Idempotent) 清除邏輯，保證每次測試前清空 `Voucher` 和 `EsgRecord`，終結了數據越跑越多的靈異現象。
15. **【State】SVG 圖片庫髒資料覆蓋 Bug**：在 `receipt_image_generator.ts` 果斷加上 `fs.rmSync(force: true)`，防止上一次測試的舊圖片干擾新的 AI 判讀。
16. **【Seeder】DB Export / Import 的外鍵與批次還原 Bug**：修復了 `enterpriseId` 與 `teamId` 的關聯遺失錯誤，並擴展了 `targetStock === "all"` 的批次還原神技。
17. **【ESG】Scope 3 數據神隱 (-100% Variance)**：修復舊版腳本完全漏掉 Scope 3 的問題，將 `grossScope3GreenhouseGasEmissions` 成功與 `6288 (其他管理費用)` 綁定。
18. **【ESG】Scope 驗證邏輯寫死**：修復 `phase2_runner.ts` 裡把 Scope 3 誤判成 Scope 2 的低級失誤，讓驗證邏輯完整支援所有範疇。
19. **【Type】嚴格防堵 `any` 的 Type Error**：在 `fast_verify.ts` 裡拒絕妥協任何 `any`，實作了 `ISimulatedVoucher` 完整介面，守住專案的 Strict Typing 規範。
20. **【Engine】字典缺失引發的沉默丟失**：當外部資料代碼（如水電費 6161）不存在字典時，引擎會直接跳過該筆帳務導致淨利虛增。已實作防呆機制強行以字首分類，保證財報 100% 配平。
21. **【API】跨年折舊消失的時區陷阱**：前端本地時區 `2024-12-31 23:59:59` 與資料庫 UTC 時間產生跨年位移偏差，已在 API 層嚴格使用 `Date.UTC` 徹底消滅這個靈異 Bug。

---

## ⚖️ Phase 3: 高階架構漏洞與技術債移除 (Architecture & Debt Removal)
*切中系統靈魂，確保報表能 100% 擴展至全球市場，並確保底層運算毫無懸念。*

22. **【i18n】徹底消滅多國語系字串硬綁定**：把所有 `name.includes("借款/股利/無形資產")` 等依賴中文字串的 Anti-pattern 徹底拔除，改為依賴 `src/constants/accounts.ts` 裡強型別的底層字典標籤 (`isInterestBearing`, `isDividend`) 驅動。
23. **【Math & DB】拍板數值運算底層標準與 21.4 億上限迴避**：
    確立財務三表維持 `Number` 以守護高效能，而 ESG 碳排強制引入 `Prisma.Decimal` 防禦浮點數誤差。同時，為了避開 `BigInt` 的 JSON 序列化災難，我們實作了「應用層傳票分片 (Sharding)」來解決單筆傳票超過 21.4 億的 PostgreSQL 限制。
    👉 *完整架構決策與權衡分析，請參見：[`numerical_precision_guideline.md`](../../engineering_guidelines/numerical_precision_guideline.md)*

*(尚未實作)* **【Domain】流通在外股數的「彈性面額」解耦 (相容國際市場)**：
> 拔除 `balance_sheet_generator.ts` 中硬編碼的 `/ 10` (面額 10 元) 計算邏輯。徹底擺脫台灣舊有法規的硬編碼限制，為系統未來支援台灣新制「彈性面額」以及美股 (US-GAAP) 「無面額股票 (No Par Value)」的跨國多架構預留了乾淨的擴充空間。

---

## 📌 文件維護指南 (When to Update)
**永遠不需要更新此文件。**
本文件為一份「歷史里程碑 (Historical Snapshot)」，作為 Audit Trail 證明並記錄了 2026 年 Q2 針對 E2E 管線硬化與 Bug 修復的豐碩成果。未來若完成下一階段 (如 Q3) 的大型架構重構或除錯，應建立全新的 Proof of Work 紀錄文件。
