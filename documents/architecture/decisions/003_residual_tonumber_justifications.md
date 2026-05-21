# ADR 003: 剩餘 `.toNumber()`, `Number()`, `Math.round()` 與 `parseFloat()` 合規決策與數值精準度防護

**Date**: 2026-05-19
**Status**: Accepted (已接受)
**Author**: Tzuhan

## 背景脈絡 (Context)

為了符合四大會計師 (Big 4) 嚴苛的查帳標準，iSunFA 系統必須維持 100% 絕對精確的決定論式 (Deterministic) 財務架構。在 Sprint 1 的重構中，我們已經成功地從核心的財務與碳排計算邏輯中，徹底拔除了不安全的浮點數運算 (請參考 [ADR 001](001_precision_refactor_removals.md))。而在近期的全系統最終稽核中，我們進一步清除了前端與 API 邊界層殘存的 `.toNumber()`，並全面升級為嚴格的字串 (`string`) 序列化來保護資料。

儘管完成了全域的精準度重構，系統庫中仍刻意保留了極少數受到嚴格管控的浮點數轉型與計算操作，包含 `.toNumber()`, `Number()`, `Math.round()` 以及 `parseFloat()`。

## 架構決策 (Decision)

我們決議在程式碼庫中**刻意保留**這些剩餘的 `.toNumber()`, `Number()`, `Math.round()` 與 `parseFloat()` 用法，因為它們明確屬於以下八大「絕對安全」的架構分類，不會引發 IEEE 754 的精準度飄移，亦不會對財務審計造成威脅。

未來任何 Pull Request (PR) 若要使用 `.toNumber()`, `Number()`, `Math.round()` 或 `parseFloat()`，**必須**符合這八大例外分類之一。若不符合，該 PR 必須被直接退回 (Reject)。

### 八大被允許的例外分類

1. **時間戳、年份與座標轉換 (Timestamps, Dates & Coordinates)**
   - _出現位置_: `member.service.ts`, `period.ts`, `route.ts`, `dashboard_header.tsx`
   - _合規原因_: 將日期轉為 Unix Timestamp (`Number(new Date().getTime())`)，或是解析 `Number(year)` / `Number(month)` 是純整數操作，遠低於 JS 的整數上限。另外，地理座標 (`Number(origin.lat)`) 雖是小數，但由於經緯度的精度本身就有限度，且不參與財務的累加遞迴計算，因此安全無虞。

2. **相對比率與百分比 (Relative Ratios & Percentages)**
   - _出現位置_: `esg_benchmark.service.ts`, `income_statement_generator.ts`, `balance_sheet_generator.ts`, `esg.repo.ts` 等等。
   - _合規原因_: 這些數值 (例如毛利率、月增率 YoY/MoM、負債比、碳排佔比等) 屬於分析用的相對比率。
   - 🚨 **[架構師強制但書]**: **後端 API 絕對禁止輸出浮點數比率**。所有百分比與比率在後端必須以 `Decimal` 計算後轉為 `String` 輸出。若前端圖表 (如 Recharts) 需要 `Number`，只能在前端組件的「最後一哩路渲染層」進行轉型，確保 JSON Payload 的絕對精確與加總 100% 恆等。

3. **第三方 API 與資料庫型別的強制約束 (Strict External API & DB Schema Constraints)**
   - _出現位置_: `payment_helpers.ts` (OEN 藍新金流), `admin/campaign/route.ts` (Prisma Schema)。
   - _合規原因_: Prisma 資料庫的 Schema 嚴格規定了某些欄位 (如活動點數 `bonusPoints`、任務 ID) 必須為整數 `Int`。同時，第三方外部服務 (如 OEN 金流) 的 API 嚴格限制欄位必須是 `Number`。在這種最終序列化的邊界 (Boundary) 上，使用轉型來滿足介面合約是必須的。
   - 🚨 **[架構師強制但書]**: **強制溢位阻斷**：在將金額轉換為 `Number` 傳遞給外部金流 API (如 OEN) 之前，必須強制使用 `Number.isSafeInteger(amount)` 進行檢驗。若超過安全整數範圍，必須拋出 `[External API Overflow]` 錯誤並中斷交易，嚴禁無聲截斷。另外，Prisma 的 `Int` 最大值僅為 21.4 億，在轉型寫入 DB 前亦必須加上防呆校驗（如 `if (amount > 2147483647) throw Error`）。若為未來新增之財務點數欄位，Schema 必須直接定義為 `BigInt` 或 `Decimal`。

4. **非財務數據之前端顯示格式化 (Non-Financial UI Formatting)**
   - _出現位置_: `batch_item_report.tsx` 等非總帳元件。
   - _合規原因_: 在前端元件中，原生的 `Number()` 可被用於銜接 `toLocaleString()` 來產生含有千分位的字串（僅限於物理距離如 `distanceKm` 等非財務指標）。
   - 🚨 **[架構師強制但書]**: **絕對禁止**將法幣金額、碳排度數或 Web3 錢包餘額等高精度字串降級為 `Number` 只為了加逗號。超過 9千兆的安全上限將導致前端「顯示層失真」與財務揭露不實。所有財務與代幣數據的格式化，必須統一強制使用 `MoneyUtil.formatDynamic()` 或 `BigInt.toLocaleString()`。

5. **非財務性質之純整數計數器與 ID (Non-Financial Integer Counters & IDs)**
   - _出現位置_: `issue.recorder.service.ts`, `order.backfill.service.ts`, Zod Schema Validators。
   - _合規原因_: 追蹤 AI Token 消耗量 (`totalTokens`)，或是系統內部提交次數 (`submissionCount`) 是純整數。JavaScript 原生的 `Number` 可以完美無損地表示高達 $9 \times 10^{15}$ 的整數，足以應付內部計數器。
   - 🚨 **[架構師強制但書]**: **Web3 / EVM 絕對禁區**：嚴禁將任何來自區塊鏈的數據（如 Task ID、Token ID、Block Number、Transaction Hash）使用 `Number()` 解析！這些 Web3 原生的 `uint256` 數據必須 100% 作為 `String` 或原生 `BigInt` 處理，避免精度失真導致合約呼叫失敗。

6. **非財務狀態之簡單流程控制 (Non-Financial Boolean Flow Controls)**
   - _出現位置_: 純狀態碼判斷。
   - _合規原因_: 使用 `Number(statusCode) < 3` 來作為決定 UI 流程是否進入下一步的布林值旗標。
   - 🚨 **[架構師強制但書]**: **嚴禁將此豁免套用於任何財務與錢包變數**。無論是否僅為了布林值判斷，只要變數涉及「法幣金額、碳排度數、Web3 代幣（如 `balance`）」，就必須強制使用 `MoneyUtil.toDecimal(balance).lt(1)` 等高精度比對，徹底阻斷開發者的破窗效應。

7. **UI 動畫與物理計算 (UI Animation & Physics)**
   - _出現位置_: `wizard_header.tsx`, `walking_robot.tsx`
   - _合規原因_: 前端元件中處理畫面補間動畫 (Tween) 與弧度計算 (`Math.PI * 2`)，這類視覺運算不涉及任何財務與後端狀態，可以直接依賴原生浮點數運算以達到最佳效能。

8. **獨立非總帳之純前端試算工具 (Standalone UI Calculators - Non-Ledger)**
   - _出現位置_: `transportation_carbon_footprint_calculator/page.tsx`, `salary_calculator.ts`
   - _合規原因_: 當前這類工具 (例如薪資試算、通勤碳排試算) 被明確定義為「提供使用者初步估算的前端互動工具」，它們的計算結果並不會寫入系統核心總帳 (Ledger) 或區塊鏈。在這些獨立上下文中，考量效能與開發速度，允許使用原生的 `Math.round` 或 `parseFloat`。
   - 🚨 **[架構師強制但書]**: 為避免與正式引擎產生小數點落差而摧毀客戶信任，此類工具的運算結果，在 UI 上必須明確標註 **「僅供概算參考 (Estimation Only)」**，且**嚴禁**將其數據流接入任何可供下載的 PDF 報表或查核路徑中，以免成為審計死角。

## 決策影響 (Consequences)

透過明訂這八項例外鐵律，我們既保持了對 iSunFA 財務完整性的「零容忍」絕對精準度要求，同時又賦予了開發者必要的彈性，讓他們在處理時間、座標、React 前端套件、Prisma Schema 以及第三方 API 時能順暢介接，而不需要在安全的場景中過度塞滿強制轉字串的程式碼。這項決策為我們的「精準度防護架構」畫下了完美的休止符。
