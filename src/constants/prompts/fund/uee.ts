export const FUND = `
Task: Try to find information about the fund and execute the [UEE] Cost & Efficiency audit.

Objective:
1. Audit based on "IRSC-UEE Advanced Edition (Fund Focus)".
2. Search for **Expense Ratios**, **Trading Costs**, and **Operational Efficiency**.
3. Calculate the score.

Scoring Algorithm:
Base Score: 50
True (Pass): +0.5
False (Fail): -0.5
N/A (No Data): 0
Range: 0 to 100

Checklist (IRSC-UEE Fund Focus)
## I. 總持有成本 (Total Cost of Ownership)
1. 總開支率 (TER): Is the Expense Ratio lower than the Category Median?
2. 隱藏費用: Are "Other Expenses" (admin, legal, audit) kept minimal (< 0.1%)?
3. 交易成本: Is the estimated Trading Cost (Turnover * Spread) low?
4. 銷售費 (Front-load): Is the fund No-Load (0% sales charge)?
5. 贖回費 (Back-load): Is there no Deferred Sales Charge (CDSC)?
6. 分銷費 (12b-1): Is the 12b-1 fee 0% or waived?
7. 經理費: Is the Management Fee declining significantly as AUM scales (Breakpoints)?
8. 績效費: Is Performance Fee only charged over a High-water Mark?
9. 稅務成本: Is the Tax-Cost Ratio low (efficient for taxable accounts)?
10. 最便宜級別: Does the platform offer the lowest cost share class available (e.g., I-share)?

## II. 營運與交易效率 (Operational Efficiency)
11. 規模經濟: Has the Expense Ratio trended down over the last 3 years?
12. 現金拖累: Is cash drag minimized (using Futures/ETFs to equitize cash)?
13. 交易執行: Does the desk use Algo Trading to minimize market impact?
14. 軟性美元: Is Soft Dollar usage strictly limited to research benefit?
15. 證券借出: Does 100% of Securities Lending revenue go back to the fund?
16. 可容納規模: Is the Strategy Capacity sufficient (not close to capacity constraints)?
17. 錯誤率: Are NAV pricing errors zero?
18. 結算週期: Is the settlement T+1 or T+2 (Standard)?
19. 匯率對沖成本: Is the cost of hedging (currency forward points) optimized?
20. 數位化: Are paper-based processes eliminated to save costs?

## III. 投資性價比 (Value for Money)
21. 費用績效比: Is 5-Year Return / Expense Ratio > 10x?
22. 活躍回報成本: Is Active Return (Alpha) / Active Fee positive?
23. 資訊比率效率: Is IR > 0.5 (Justifying the active risk taken)?
24. 費用四分位: Is the fee in the Cheapest Quintile?
25. 規模優勢: Is the fund large enough (> $1B) to negotiate lower brokerage commissions?
26. 被動替代: Is the fund significantly different from a cheap Index Fund (Active Share > 60%)?
27. 負費率: (Rare) Are there fee waivers currently in place?
28. 轉換成本: Is it easy to switch between share classes without tax events?
29. 最低門檻: Is the Minimum Investment accessible (< $3000)?
30. 自動扣款: Are AIP (Automatic Investment Plan) fees waived?

Response Template:
# ⚙️ [Fund Name] - 成本與效率 (UEE)
**資料來源: ** Prospectus, Morningstar

### 1. 詳細評分清單
(List items)
* **[簡短指標文字]:** [分析細節] **符合/不符/無數據** **分數**

### 2. 最終得分計算
* **起始基準分 (Base):** 50
* **符合 (+0.5):** [Count_True]
* **不符 (-0.5):** [Count_False]
* **無數據 (0):** [Count_NA]

# ⚙️ 總分: [Calculated_Score] / 100

### 3. 關鍵數據核對
* **Expense Ratio:** [Value]%
* **Turnover Rate:** [Value]%
* **Tax Cost Ratio:** [Value]%

### 4. 指標小結
`;
