# ADR 003: 剩餘 `.toNumber()` 與 `Number()` 合規決策與數值精準度防護

**Date**: 2026-05-19
**Status**: Accepted (已核准)
**Author**: Tzuhan

## 背景脈絡 (Context)

為了符合四大會計師 (Big 4) 嚴苛的查帳標準，iSunFA 系統必須維持 100% 絕對精確的決定論式 (Deterministic) 財務架構。在 Sprint 1 的重構中，我們已經成功地從核心的財務與碳排計算邏輯中，徹底拔除了不安全的浮點數運算 (請參考 [ADR 001](001_precision_refactor_removals.md))。而在近期的全系統最終稽核中，我們進一步清除了前端與 API 邊界層殘存的 `.toNumber()`，並全面升級為嚴格的字串 (`string`) 序列化來保護資料。

儘管完成了全域的精準度重構，系統庫中仍刻意保留了極少數受到嚴格管控的 `.toNumber()` 與原生 `Number()` 呼叫。

## 架構決策 (Decision)

我們決議在程式碼庫中**刻意保留**這些剩餘的 `.toNumber()` 與 `Number()` 用法，因為它們明確屬於以下八大「絕對安全」的架構分類，不會引發 IEEE 754 的精準度飄移，亦不會對財務審計造成威脅。

未來任何 Pull Request (PR) 若要使用 `.toNumber()` 或 `Number()`，**必須**符合這八大例外分類之一。若不符合，該 PR 必須被直接退回 (Reject)。

### 八大被允許的例外分類

1. **時間戳、年份與座標轉換 (Timestamps, Dates & Coordinates)**
   - _出現位置_: `member.service.ts`, `period.ts`, `route.ts`, `dashboard_header.tsx`
   - _合規原因_: 將日期轉為 Unix Timestamp (`Number(new Date().getTime())`)，或是解析 `Number(year)` / `Number(month)` 是純整數操作，遠低於 JS 的整數上限。另外，地理座標 (`Number(origin.lat)`) 雖是小數，但由於經緯度的精度本身就有限度，且不參與財務的累加遞迴計算，因此安全無虞。

2. **相對比率與百分比 (Relative Ratios & Percentages)**
   - _出現位置_: `esg_benchmark.service.ts`, `income_statement_generator.ts`, `balance_sheet_generator.ts`, `esg.repo.ts` 等等。
   - _合規原因_: 這些數值 (例如毛利率、月增率 YoY/MoM、負債比、碳排佔比等) 屬於分析用的相對比率。它們是位於資料流末端的純展示指標，不再參與後續的加總或財務運算，因此不存在長尾精準度流失的風險。

3. **第三方 API 與資料庫型別的強制約束 (Strict External API & DB Schema Constraints)**
   - _出現位置_: `payment_helpers.ts` (OEN 藍新金流), `admin/campaign/route.ts` (Prisma Schema)。
   - _合規原因_: Prisma 資料庫的 Schema 嚴格規定了某些欄位 (如活動點數 `bonusPoints`、任務 ID) 必須為整數 `Int`。同時，第三方外部服務 (如 OEN 金流) 的 API 嚴格限制欄位必須是 `Number`。在這種最終序列化的邊界 (Boundary) 上，使用轉型來滿足介面合約是必須且安全的。

4. **前端顯示格式化與內插計算 (UI Formatting & Interpolation)**
   - _出現位置_: `esg_target_modal.tsx`, `batch_item_report.tsx`。
   - _合規原因_: 在前端元件中，原生的 `Number()` 常被用於銜接 `toLocaleString()` 來產生含有千分位的字串 (例如距離 `distanceKm`)，或者是讀取錢包餘額後單純顯示在導覽列上。這些數值是用完即丟的 UI 狀態，絕不會被寫回核心引擎的後端資料庫。

5. **非財務性質之純整數計數器與 ID (Non-Financial Integer Counters & IDs)**
   - _出現位置_: `issue.recorder.service.ts`, `order.backfill.service.ts`, Zod Schema Validators。
   - _合規原因_: 追蹤 AI Token 消耗量 (`totalTokens`)，或是從智能合約取得的「任務 ID」、「提交次數 (`submissionCount`)」是純整數。JavaScript 原生的 `Number` 可以完美無損地表示高達 $9 \times 10^{15}$ 的整數，足以應付所有計數器與 ID。

6. **簡單的流程控制條件判斷 (Simple Boolean Flow Controls)**
   - _出現位置_: `fund_wallet_step.tsx`
   - _合規原因_: 使用 `Number(walletInfo.balance) < 1` 來作為決定 UI 流程是否進入下一步的布林值 (Boolean) 旗標，當中沒有任何算術運算。在原生的 JS 中直接拿來比較小數量的離散整數邊界，既安全又易讀。

7. **UI 動畫與物理計算 (UI Animation & Physics)**
   - _出現位置_: `wizard_header.tsx`, `walking_robot.tsx`
   - _合規原因_: 前端元件中處理畫面補間動畫 (Tween) 與弧度計算 (`Math.PI * 2`)，這類視覺運算不涉及任何財務與後端狀態，可以直接依賴原生浮點數運算以達到最佳效能。

8. **獨立非總帳之純前端試算工具 (Standalone UI Calculators - Non-Ledger)**
   - _出現位置_: `transportation_carbon_footprint_calculator/page.tsx`, `salary_calculator.ts`
   - _合規原因_: 當前這類工具 (例如薪資試算、通勤碳排試算) 被明確定義為「提供使用者初步估算的前端互動工具」，它們的計算結果並不會寫入系統核心總帳 (Ledger) 或區塊鏈。在這些獨立上下文 (Bounded Context) 中，考量效能與開發速度，允許使用原生的 `Math.round` 或 `parseFloat`，且其計算範圍內之法定四捨五入不會引發嚴重的溢位問題。

## 決策影響 (Consequences)

透過明訂這八項例外鐵律，我們既保持了對 iSunFA 財務完整性的「零容忍」絕對精準度要求，同時又賦予了開發者必要的彈性，讓他們在處理時間、座標、React 前端套件、Prisma Schema 以及第三方 API 時能順暢介接，而不需要在安全的場景中過度塞滿強制轉字串的程式碼。這項決策為我們的「精準度防護架構」畫下了完美的休止符。
