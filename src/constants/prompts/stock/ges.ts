export const STOCK = `
Task: Try to find information about the company and execute the [GES] Growth & Exit Strategy audit, specifically focusing on **Stock Valuation** and **Growth Metrics**.

Objective:
1. Audit based on "IRSC-GES Advanced Edition (Stock Focus)".
2. Search for **Valuation Ratios** (P/E, PEG, P/S, EV/EBITDA) and **Future Growth Estimates**.
3. Calculate the score.

Scoring Algorithm:
Base Score: 50
True (Pass): +0.5
False (Fail): -0.5
N/A (No Data): 0
Range: 0 to 100

Checklist (IRSC-GES Stock Focus)
## I. 內生性成長與擴張 (Organic Growth)
1. 第二曲線: Has the company successfully launched a "Second Curve" product contributing >15% of revenue?
2. 跨國複製: Has the business model been successfully replicated in at least 3 distinct international markets?
3. 渠道下沉: Is the company effectively penetrating lower-tier cities or SMB markets?
4. 同店增長: Is Same-Store Sales Growth (SSSG) or Net Revenue Retention (NRR) positive (>100%)?
5. 產品矩陣: Has the company expanded from a single tool/product to a multi-product platform?
6. 客單提升: Has the Average Revenue Per User (ARPU) increased consistently over the past 3 years?
7. 會員經濟: Is the paid subscriber base growing faster than the total user base?
8. 研發轉化: Are R&D investments directly translating into new revenue streams within 18 months?
9. 產能擴張: Is the company expanding production capacity to meet confirmed future demand?
10. 直銷轉型: Is the company successfully shifting from wholesale/distributor models to higher-margin DTC?
11. 數位轉型: Has digitalization significantly improved operational efficiency?
12. 品牌溢價: Can the company raise prices without losing significant market share?
13. 口碑裂變: Is organic user growth driven by word-of-mouth (K-Factor > 1)?
14. 經常性收入: Is the proportion of Annual Recurring Revenue (ARR) increasing?
15. 交叉銷售: Is the Cross-Sell ratio between different product lines improving?
16. 獲客優化: Is the Customer Acquisition Cost (CAC) stable or declining while scaling?
17. 用戶黏著: Is the DAU/MAU ratio staying strong during expansion?
18. 服務化: Is the company successfully transitioning from hardware to services (HaaS/SaaS)?
19. 高端化: Is the revenue mix shifting towards premium/higher-margin product tiers?
20. 組織擴張: Is the organizational structure scaling effectively?

## II. 估值與財務指標 (Valuation & Financial Metrics)
21. 本益比 (P/E): Is the P/E ratio below the industry average or historical median?
22. PEG Ratio: Is the PEG ratio < 1.0 (indicating undervalued relative to growth)?
23. 股價營收比 (P/S): Is the P/S ratio reasonable compared to peers/margins?
24. 自由現金流收益率: Is FCF Yield > Risk-Free Rate (e.g., > 4-5%)?
25. ROE 趨勢: Is Return on Equity (ROE) consistently > 15%?
26. ROIC 趨勢: Is Return on Invested Capital (ROIC) > WACC (Value Creation)?
27. 獲利成長: Is EPS growth > 10% CAGR over the last 3 years?
28. 毛利率擴張: Is Gross Margin expanding year-over-year?
29. 營益率改善: Is Operating Margin expanding (operating leverage)?
30. 負債比率: Is Net Debt / EBITDA < 3x?
31. 利息覆蓋: Is Interest Coverage Ratio > 5x?
32. 流動性: Is Current Ratio > 1.5?
33. 庫存週轉: Is Inventory Turnover improving (or Days Inventory Outstanding decreasing)?
34. 應收帳款: Is Days Sales Outstanding (DSO) stable?
35. 股息殖利率: Is Dividend Yield attractive and sustainable (Payout Ratio < 60%)?
36. 股息成長: Has the company raised dividends for > 5 consecutive years?
37. 股票回購: Is the company actively buying back shares (reducing share count)?
38. 內部人持股: Is high insider ownership aligned with shareholders?
39. 機構持股: Is institutional ownership increasing?
40. 做空比率: Is Short Interest low (< 5%)?

## III. 資本運作與市場 (Capital Market Strategy)
41. 上市準備: (N/A for Public Stock) -> Is the company transparent in investor communications?
42. 融資節奏: Does the company raise capital efficiently without excessive dilution?
43. 投資人結構: Are top-tier funds holding the stock?
44. 三地上市: Is the stock dual-listed to maximize liquidity?
45. 納入指數: Is the stock recently added (or likely to be added) to major indices (S&P 500, MSCI)?
46. 分析師評級: average analyst rating "Buy" or "Strong Buy"?
47. 目標價空間: Is the consensus target price significantly higher than current price?
48. 舉債擴張: Is debt used efficiently for accretive growth?
49. 員工期權: Is ESOP dilution manageable?
50. 閉鎖期: (Recent IPO) Are lock-up periods expiring soon (Risk)?
51. 轉板規劃: (Small Cap) Is there a plan to uplist to a major exchange?
52. 特別股: Are preferred shares structure standard?
53. 財務顧問: reputable auditors/bankers?
54. 估值對標: Is the valuation attractive versus direct competitors?
55. 募資用途: Are raised funds used for growth, not just debt repayment?
56. 股權集中: Is control stable?
57. 策略股東: Are there strategic partners holding stakes?
58. 退場路徑: (N/A) -> Is the stock liquid (high daily volume)?
59. 禁售承諾: Major shareholders holding?
60. 造市商: Good liquidity provider?

## IV. 戰略轉型與未來願景 (Strategic Vision)
61. 願景清晰: Is the long-term vision clear?
62. 轉型決心: Courage to cannibalize for future growth?
63. 敏捷組織: Quick response to market changes?
64. 開發者生態: Platform Strategy?
65. 數據驅動: Data-driven decisions?
66. 開放創新: External collaboration?
67. 持續學習: Growth Mindset?
68. 模擬競賽: Anticipating competitors?
69. 長期主義: Long-term focus?
70. 第二總部: Talent access?
71. 邊緣計算: Tech investment?
72. 虛實整合: Metaverse/OMO strategy?
73. 訂閱轉型: Recurring revenue shift?
74. 客戶共創: Co-creation?
75. 內部創業: Internal spin-offs?
76. 碳中和商機: Green Economy alignment?
77. 去中心化: Web3 exploration?
78. 自動化未來: Automation roadmap?
79. 生成式AI: GenAI integration?
80. 品牌重塑: Gen Z appeal?

## V. 退場訊號與風險 (Exit Signals & red flags)
81. 創辦人倦怠: Founder checking out?
82. 高層套現: Insider selling?
83. 核心離職: Key talent leaving?
84. 競爭加劇: Moat eroding?
85. 成長趨緩: Growth slowing?
86. 訴訟纏身: Major lawsuits?
87. 無人接班: Succession risk?
88. 資本寒冬: Macro headwinds?
89. 估值倒掛: Valuation too high?
90. 財務粉飾: Accounting irregularities?
91. 客戶流失: Churn spiking?
92. 產品老化: Tech debt?
93. 市場飽和: TAM exhausted?
94. 監管阻礙: Regulatory risk?
95. 買家縮手: (N/A)
96. 錯過時機: Trend passed?
97. 內部鬥爭: Board infighting?
98. 過度承諾: Missed guidance?
99. 盲目擴張: Low ROI capex?
100. 無備案: No Plan B?

Response Template:
# 🚀 [Company Name] - 成長與估值 (GES)
**資料來源: ** Investor Presentations, News, Financial Reports

### 1. 詳細評分清單
(List 1-100 items)
* **[簡短指標文字]:** [分析細節] **符合/不符/無數據** **分數**

### 2. 最終得分計算
* **起始基準分 (Base):** 50
* **符合 (+0.5):** [Count_True]
* **不符 (-0.5):** [Count_False]
* **無數據 (0):** [Count_NA]

# 🚀 總分: [Calculated_Score] / 100

### 3. Yahoo Finance / Google Finance 關鍵數據核對 (如有)
* **P/E:** [Value]
* **Market Cap:** [Value]
* **Dividend Yield:** [Value]

### 4. 指標小結
`;
