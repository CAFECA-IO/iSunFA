export const FUND = `
Task: Try to find information about the fund and execute the [TPM] Trend & Theme Fit audit.

Objective:
1. Audit based on "IRSC-TPM Advanced Edition (Fund Focus)".
2. Search for **Market Trends**, **Sector Themes**, and **Fund Positioning**.
3. Evaluate if the fund aligns with **Current Hot Trends** (e.g., AI, Green Energy) or Macro Themes.
4. Calculate the score.

Scoring Algorithm:
Base Score: 50
True (Pass): +0.5
False (Fail): -0.5
N/A (No Data): 0
Range: 0 to 100

Checklist (IRSC-TPM Fund Focus)
## I. 趨勢契合度 (Trend Alignment) - "Trend Analysis Agent"
1. AI/科技主題: Does the fund have significant exposure (> 20%) to AI, Semi, or Cloud Computing chains?
2. 綠色轉型: Does the fund align with Energy Transition / Clean Tech / EV themes?
3. 通膨對沖: Does the fund hold assets acting as inflation hedges (Commodities, Real Assets, Infrastructure)?
4. 利率敏感: (If Rates Falling) Is the fund Long Duration? / (If Rates Rising) Is it Short Duration?
5. 地緣政治: Does the fund benefit from Supply Chain Reshoring / Friend-shoring?
6. 人口結構: Does the fund tackle Aging Population / Healthcare Innovation themes?
7. 新興中產: Does the fund capture Emerging Market Consumption growth?
8. 數位金融: Are Fintech / Blockchain / Digital Payments represented?
9. 公用事業: Is there exposure to Grid Modernization / AI Power Demand?
10. 對抗衰退: Is the portfolio tilted towards Consumer Staples / Healthcare (Defensive) in late-cycle?

## II. 動能與資金流 (Momentum & Flows)
11. 價格動能: Is the fund price above its 200-day Moving Average?
12. 相對強弱: Is the fund outperforming the broad market (S&P 500 / MSCI World) over the last 6 months?
13. 資金熱度: Is the asset class (e.g., Tech Equity) seeing positive category inflows globally?
14. 創新高: Is the fund trading near its 52-week high?
15. 波動收斂: Is volatility declining while price is rising (healthy trend)?
16. 分析師調升: Are earnings estimates for top holdings being revised upward?
17. 話題聲量: Is the fund's theme currently a top search interest or news topic?
18. 機構加碼: Are institutional investors publicly increasing weight in this sector?
19. ETF效應: Are related ETFs seeing massive inflows (spillover effect)?
20. 反向指標: Is sentiment not yet at "Euphoria" levels (contrarian check)?

## III. 投資組合主題純度 (Theme Purity)
21. 營收純度: DO top 10 holdings derive > 50% of revenue from the stated theme?
22. 核心持股: Are the top 3 holdings considered "Pure Plays" of the theme?
23. 價值鏈覆蓋: Does the fund cover the entire value chain (e.g., Upstream/Midstream/Downstream)?
24. 新創佈局: Does it hold pre-IPO or small-cap innovators, not just mega-caps?
25. 風格飄移: Has the fund avoided drifting into unrelated sectors just to chase performance?
26. 集中火力: Is the top sector weight > 40% (High conviction thematic bet)?
27. 研發強度: Do portfolio companies spend highly on R&D (> 15% of Sales)?
28. 護城河擴大: Are top holdings growing their market share in the theme?
29. 監管順風: Is the theme supported by government policy (e.g., CHIPS Act, IRA)?
30. 市場空間: Is the SAM (Serviceable Addressable Market) calculated to grow > 10% CAGR?

Response Template:
# ⚡ [Fund Name] - 趨勢與主題 (TPM)
**資料來源: ** Market News, Sector Reports

### 1. 詳細評分清單
(List items)
* **[簡短指標文字]:** [分析細節] **符合/不符/無數據** **分數**

### 2. 最終得分計算
* **起始基準分 (Base):** 50
* **符合 (+0.5):** [Count_True]
* **不符 (-0.5):** [Count_False]
* **無數據 (0):** [Count_NA]

# ⚡ 總分: [Calculated_Score] / 100

### 3. 關鍵數據核對
* **Primary Theme:** [Theme]
* **Price vs MA200:** [Above/Below]
* **Tech Exposure:** [Value]%
* **YoY Growth:** [Value]%

### 4. 指標小結
`;
