export const FUND = `
Task: Try to find information about the fund and execute the [ERE] External Risk Resilience audit.

Objective:
1. Audit based on "IRSC-ERE Advanced Edition (Fund Focus)".
2. Search for **Downside Risk Metrics**, **Macro Sensitivity**, and **Stress Tests**.
3. Calculate the score.

Scoring Algorithm:
Base Score: 50
True (Pass): +0.5
False (Fail): -0.5
N/A (No Data): 0
Range: 0 to 100

Checklist (IRSC-ERE Fund Focus)
## I. 市場風險與壓力測試 on (Market Risk & Stress Test)
1. Beta高低: (Equity) Is Beta < 1.2? / (Bond) Is Duration < Benchmark + 2 years?
2. 升息敏感度: Has the fund shown resilience during the last rate hike cycle (e.g., 2022)?
3. 匯率風險: Is the fund fully hedged (or is currency risk explicitly managed)?
4. 歷史股災: Did the fund outperform the category during the 2020 Covid Crash?
5. 2008金融海嘯: Did the fund survive the 2008 crisis (if applicable) with < 50% drawdown?
6. 科技泡沫: Did the fund survive 2000 bubble (if applicable)?
7. 相關性: Is the Correlation to the broad market < 0.9 (offering diversification)?
8. 集中度風險: Is the Top 10 Holdings % < 50% (diversified idiosyncratic risk)?
9. 產業集中度: Is the Top Sector < 30% (unless Sector Fund)?
10. 國家集中度: Is the Top Country < 60% (unless Single Country Fund)?

## II. 流動性與對手方風險 (Liquidity & Counterparty Risk)
11. 每日流動性: Can the fund assets be liquidated > 90% within 7 days?
12. 暫停贖回: Has the fund never suspended redemptions (Gates)?
13. 非流動資產: Is the % of "Level 3" assets (hard to value) < 5%?
14. 衍生性商品: Is the leverage ratio (Gross Exposure) < 200%?
15. 交易對手: Are derivatives traded with Tier-1 Investment Banks only?
16. 規模縮減: Has the fund size (AUM) NOT shrunk by > 50% in the last 2 years?
17. 大型贖回: Has the fund avoided massive single-day outflows (> 10%)?
18. 價差風險: Is the Bid-Ask spread of the fund ETF (if applicable) < 0.1%?
19. 借券風險: Is securities lending restricted or fully collateralized (> 102%)?
20. 託管安全: Is the Custodian bank independent from the Asset Manager?

## III. 宏觀與地緣政治韌性 (Macro & Geopolitical)
21. 通膨避險: Does the fund hold inflation-resistant assets (TIPS, Real Estate, Commodities)?
22. 衰退防禦: Does the fund typically outperform in "Late Cycle" or "Recession" phases?
23. 地緣避險: Is exposure to sanction-risk countries (e.g., Russia/China sensitivity) managed?
24. 油價衝擊: Is the fund resilient to oil price shocks?
25. 貿易戰: Is the fund resilient to supply chain decoupling?
26. 黑天鵝: Does the manager have a "Tail Risk" hedging program?
27. 政策風險: Is the strategy immune to sudden regulatory shifts (e.g., tech crackdowns)?
28. 貨幣戰: Is the fund resilient to sudden USD spikes?
29. 主權風險: Is the exposure to low-rated sovereign debt (B- or below) < 10%?
30. 危機管理: Does the manager have a documented Business Continuity Plan (BCP)?

Response Template:
# 🛡️ [Fund Name] - 外部風險 (ERE)
**資料來源: ** Morningstar Risk, Prospectus

### 1. 詳細評分清單
(List items)
* **[簡短指標文字]:** [分析細節] **符合/不符/無數據** **分數**

### 2. 最終得分計算
* **起始基準分 (Base):** 50
* **符合 (+0.5):** [Count_True]
* **不符 (-0.5):** [Count_False]
* **無數據 (0):** [Count_NA]

# 🛡️ 總分: [Calculated_Score] / 100

### 3. 關鍵數據核對
* **Beta:** [Value]
* **Max Drawdown (3Y):** [Value]%
* **Correlation:** [Value]
* **Liquidity Tier:** [High/Med/Low]

### 4. 指標小結
`;
