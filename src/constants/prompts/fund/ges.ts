export const FUND = `
Task: Try to find information about the fund and execute the [GES] Growth & Labeling audit.

Objective:
1. Audit based on "IRSC-GES Advanced Edition (Fund Focus)".
2. Search for **Asset Growth**, **Strategy Execution**, and **Label Alignment**.
3. **Auto-Labeling**: Assign specific tags to the fund based on its holdings and strategy.
4. Calculate the score.

Scoring Algorithm:
Base Score: 50
True (Pass): +0.5
False (Fail): -0.5
N/A (No Data): 0
Range: 0 to 100

Checklist (IRSC-GES Fund Focus)
## I. 規模成長與銷售 (Growth & Sales)
1. 資產成長: Has fund AUM grown > 10% CAGR over the last 3 years?
2. 淨流入: Is Net New Money (Flows) positive YTD?
3. 市場份額: Is the fund gaining market share in its Morningstar Category?
4. 通路擴張: Is the fund recently added to new major bank/platform approved lists?
5. 行銷資源: Is the fund actively marketed with new materials/webinars?
6. 客戶廣度: Is the shareholder base diversified (Retail + Institutional)?
7. 留存率: Is the investor retention rate high (low redemption)?
8. 新級別: Has the fund launched new share classes (e.g., ESG, Currency Hedged) to capture growth?
9. 軟閉鎖: Has the fund avoided Soft Close (limiting growth)?
10. 全球銷售: Is the fund registered for sale in multiple jurisdictions (UCITS passport)?

## II. 產品標籤與定位 (Labeling & Positioning) - "Product Labeling Agent"
11. 標籤一致: Does the portfolio actual holdings match the "Growth" label? (e.g., High P/E, High Rev Growth)
12. 價值屬性: (If Value Fund) Is P/E and P/B lower than the benchmark?
13. 配息屬性: (If Income Fund) Is the Yield > 4%?
14. 科技屬性: (If Tech Fund) Is Tech sector weight > 40%?
15. 債券屬性: (If Bond Fund) Is the Duration consistent with the "Short/Inter/Long" label?
16. 信用屬性: (If IG Bond) Is BBB rating or higher > 80%?
17. 主題純度: (If Thematic) Is revenue exposure to theme > 50%?
18. 風格箱: Is the Morningstar Style Box consistent with the fund name?
19. 追蹤誤差: (If Index Fund) Is Tracking Error < 0.5%?
20. 活躍份額: (If Active Fund) Is Active Share > 60%?

## III. 創新與未來性 (Innovation & Future)
21. 另類數據: Does the fund use AI/Big Data in stock selection?
22. 新興市場: Is there strategic exposure to high-growth EMs (India, Vietnam)?
23. 私有資產: Does the fund allocate to Private Equity/Private Credit (Interval Funds)?
24. 加密資產: Does the fund explore Regulated Crypto/Blockchain exposure?
25. 費用創新: Does the fund use Fulcrum Fees (Performance-based fees)?
26. 內容行銷: Does the manager provide high-quality educational content?
27. 數位服務: Is the investor portal/app top-tier?
28. 自訂索引: Does the fund use a proprietary index ("Smart Beta")?
29. 解決方案: Is the fund part of a Model Portfolio or TDF solution?
30. 品牌溢價: Can the fund command a higher fee due to strong brand loyalty?

Response Template:
# 🚀 [Fund Name] - 成長與標籤 (GES)
**資料來源: ** Factsheet, Strategy Document

### 1. 詳細評分清單
(List items)
* **[簡短指標文字]:** [分析細節] **符合/不符/無數據** **分數**

### 2. 最終得分計算
* **起始基準分 (Base):** 50
* **符合 (+0.5):** [Count_True]
* **不符 (-0.5):** [Count_False]
* **無數據 (0):** [Count_NA]

# 🚀 總分: [Calculated_Score] / 100

### 3. 自動化標籤建議 ("Product Labeling Agent")
Based on the analysis, the following tags are suggested for this fund:
* **Asset Class:** [Equity/Fixed Income/Multi-Asset]
* **Region:** [Global/US/EM/Europe]
* **Style:** [Growth/Value/Blend]
* **Cap Size:** [Large/Mid/Small]
* **Theme:** [Tech/Healthcare/ESG/Dividend/...]
* **Risk Profile:** [Conservative/Moderate/Aggressive]

### 4. 指標小結
`;
