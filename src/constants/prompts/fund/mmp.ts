export const FUND = `
Task: Try to find information about the fund and execute the [MMP] Moat & Peer Comparison audit.

Objective:
1. Audit based on "IRSC-MMP Advanced Edition (Fund Focus)".
2. Search for **Peer Group Rankings**, **Competitor Comparison**, and **Manager Edge**.
3. Determine if the fund has a sustainable competitive advantage (Moat) against similar funds.
4. Calculate the score.

Scoring Algorithm:
Base Score: 50
True (Pass): +0.5
False (Fail): -0.5
N/A (No Data): 0
Range: 0 to 100

Checklist (IRSC-MMP Fund Focus)
## I. 同質性競品比對 (Peer Comparison)
1. 規模優勢: Is the AMU (Assets Under Management) > $500M (sufficient liquidity and resources)?
2. 規模適中: Is the AUM < $50B (avoiding "Asset Bloat" making it hard to trade / generate alpha)?
3. 費用優勢: Is the Expense Ratio in the lowest quartile (Cheapest 25%) of its category?
4. 經理費率: Is the Management Fee reasonable compared to active peers?
5. 週轉率: Is the Portfolio Turnover Rate reasonable (< 50% for L/T Hold, < 100% for active)?
6. 交易成本: severe drag on tracking diff?
7. 品牌信任: Is the fund family (Issuer) top-tier (e.g., Vanguard, BlackRock, Fidelity)?
8. 資金流向: Is the fund seeing net inflows over the last 12 months?
9. 市場份額: Is the fund one of the top 3 largest in its specific niche/sector?
10. 評級優勢: Is the Morningstar Rating 4 or 5 stars?
11. 分析師評級: Is the Morningstar Analyst Rating "Gold", "Silver", or "Bronze"?
12. 獲獎紀錄: Has the fund won any Lipper Fund Awards or similar recently?
13. 平台可及性: Is the fund available on major brokerage platforms?
14. 貨幣級別: Does it offer multiple currency hedged share classes (appealing to global investors)?
15. 累積級別: Does it offer Accumulating share classes (tax efficient)?

## II. 經理人與團隊優勢 (Manager & Team Edge)
16. 經理任期: Is the Lead Manager tenure > 5 years (proven track record)?
17. 團隊穩定: Is the management team stable (low turnover of key analysts)?
18. 團隊深度: Is there a large dedicated analyst team supporting the strategy?
19. 經理自持: Does the manager have > $1M invested in their own fund ("Eat their own cooking")?
20. 經驗豐富: Does the manager have > 15 years of industry experience (managed through cycles)?
21. 獨特策略: Does the fund have a proprietary model or unique strategy not easily copied?
22. 資訊優勢: Does the team have access to expert networks or alternative data?
23. 歷史公信: Has the manager avoided major scandals or regulatory fines?
24. 公開溝通: Are monthly/quarterly commentaries detailed and transparent?
25. 繼任計畫: Is there a clear succession plan for star managers?

## III. 投資組合護城河 (Portfolio Moat)
26. 持股集中度: (Active) Is Top 10 Holdings % > 30% (High conviction)? / (Passive) Is it well diversified?
27. 獨門持股: Does the active share > 70% (Distinctly different from the benchmark)?
28. 龍頭佈局: Are top holdings dominant industry leaders (Economic Moat)?
29. 防禦性: Is the portfolio overweight defensive sectors during downturns?
30. 現金拖累: Is the cash position < 5% (fully invested)?
31. 對沖保護: (Hedge Fund/Alt) Does it effectively use derivatives to hedge tail risk?
32. 流動性管理: Are > 80% of holdings in liquid Large/Mid-cap stocks (easy to exit)?
33. 風格純正: Is the fund managing specifically to its label/mandate?
34. 換股紀律: Is there a clear sell-discipline documented and followed?

Response Template:
# 🏰 [Fund Name] - 護城河與競品 (MMP)
**資料來源: ** Fund Factsheet, Morningstar

### 1. 詳細評分清單
(List items)
* **[簡短指標文字]:** [分析細節] **符合/不符/無數據** **分數**

### 2. 最終得分計算
* **起始基準分 (Base):** 50
* **符合 (+0.5):** [Count_True]
* **不符 (-0.5):** [Count_False]
* **無數據 (0):** [Count_NA]

# 🏰 總分: [Calculated_Score] / 100

### 3. 關鍵數據核對
* **AUM:** [Value]
* **Expense Ratio:** [Value]%
* **Morningstar Rating:** [Stars]
* **Manager Tenure:** [Years]

### 4. 指標小結
`;
