export const FUND = `
Task: Try to find information about the fund and execute the [ECQ] Performance & Risk Quality audit.

Objective:
1. Audit based on "IRSC-ECQ Advanced Edition (Fund Focus)".
2. Search for **Performance Metrics** (Returns, Sharpe, Alpha) and **Risk Metrics** (Beta, Volatility).
3. Compare against **Category Average** or **Benchmark**.
4. Calculate the score.

Scoring Algorithm:
Base Score: 50
True (Pass): +0.5
False (Fail): -0.5
N/A (No Data): 0
Range: 0 to 100

Checklist (IRSC-ECQ Fund Focus)
## I. 績效表現 (Performance)
1. 短期績效: Is the 1-Year Return ranking in the top 25% (Top Quartile) of its category?
2. 中期績效: Is the 3-Year Annualized Return ranking in the top 25%?
3. 長期績效: Is the 5-Year Annualized Return ranking in the top 25%?
4. 超越並同: Is the 1-Year Return greater than the Category Average?
5. 超越基準: Is the 1-Year Return greater than the Primary Benchmark Index?
6. 3年勝率: Has the fund beaten the benchmark in > 60% of rolling 3-year periods?
7. 年度正報酬: Has the fund delivered positive returns in at least 4 of the last 5 calendar years?
8. 季度穩定性: Is the percentage of positive quarters > 60% over the last 3 years?
9. 成立以來: Is the Since Inception Annualized Return > 8% (Equity) / > 4% (Fixed Income)?
10. 近期動能: Is the 3-Month Momentum positive and stronger than the category average?

## II. 風險調整回報 (Risk-Adjusted Return)
11. 夏普比率 (Sharpe): Is the 3-Year Sharpe Ratio > 1.0 (or top 25% in category)?
12. 索提諾比率 (Sortino): Is the Sortino Ratio higher than the category average (better downside protection)?
13. 資訊比率 (Information Ratio): Is the Information Ratio > 0.5 (indicating skill in active management)?
14. Alpha (3Y): Is the 3-Year Alpha positive (> 0)?
15. Treynor Ratio: Is the Treynor Ratio higher than the benchmark?
16. Jensen's Alpha: Is Jensen's Alpha significant and positive?
17. 風險回報比: Is the Return/Risk ratio (e.g., Annualized Return / Std Dev) better than peers?
18. 費用後績效: Is the return after fees still competitive vs. low-cost ETFs?
19. 經理人貢獻: Is the manager's tenure correlated with the period of outperformance?
20. 風格一致性: Does the fund strictly adhere to its stated style (e.g., no style drift impacting risk profile)?

## III. 波動與風險控制 (Volatility & Risk Control)
21. 標準差 (Std Dev): Is the 3-Year Standard Deviation lower than the Category Average?
22. Beta (3Y): Is the Beta < 1.0 (indicating less volatile than the market) OR Beta consistent with strategy?
23. 下行風險: Is the Downside Capture Ratio < 100% (captures less falling market than benchmark)?
24. 上行參與: Is the Upside Capture Ratio > 90% (captures most rising market)?
25. 不對稱性: Is Upside Capture > Downside Capture?
26. R-Squared: Is R-Squared > 85% (indicating the benchmark is appropriate)?
27. 最大回撤 (MDD): Is the Max Drawdown in the last 3 years smaller than the benchmark's MDD?
28. 回撤恢復: Did the fund recover from the last major drawdown faster than peers?
29. 追蹤誤差 (TE): (Active Fund) Is Tracking Error reasonable (demonstrating active bets)?
30. VaR (Value at Risk): Is the VaR lower than peers?

## IV. 收益與分配 (Income & Distribution - For Bond/Income Funds)
31. 殖利率 (Yield): Is the TTM Yield competitive vs. peers (without taking excessive risk)?
32. 配息穩定性: Have dividend distributions been stable or growing over the last 3 years?
33. 本金配息: Is the "Return of Capital" (ROC) portion of distributions < 10% (not eroding NAV)?
34. 配息頻率: Is the distribution frequency aligned with investor needs (e.g., Monthly/Quarterly)?
35. 總回報觀點: Is the Total Return (Price + Yield) positive even if NAV declined?

Response Template:
# 📈 [Fund Name] - 績效與風險 (ECQ)
**資料來源: ** Morningstar, Bloomberg, FactSheet

### 1. 詳細評分清單
(List items)
* **[簡短指標文字]:** [分析細節] **符合/不符/無數據** **分數**

### 2. 最終得分計算
* **起始基準分 (Base):** 50
* **符合 (+0.5):** [Count_True]
* **不符 (-0.5):** [Count_False]
* **無數據 (0):** [Count_NA]

# 📈 總分: [Calculated_Score] / 100

### 3. 關鍵數據核對
* **1Y Return:** [Value]% (Rank: [Rank])
* **Sharpe (3Y):** [Value]
* **Alpha (3Y):** [Value]
* **Expense Ratio:** [Value]%

### 4. 指標小結
`;
