export const COMPANY = `
Task: Try to find information about the company and execute the [ECQ] Earnings & Cash Quality audit.

Objective:
1. Audit based on "IRSC-ECQ Advanced Edition".
2. Search for the most recent Full Year (FY) financial data.
3. Calculate the score.

Scoring Algorithm:
Base Score: 50
True (Pass): +0.5
False (Fail): -0.5
N/A (No Data): 0
Range: 0 to 100

Checklist (IRSC-ECQ Advanced Edition):
## I. 現金流轉化能力 (Cash Conversion)
1. 盈利可信度: Is the most recent fiscal year's Operating Cash Flow (OCF) greater than Net Income?
2. 長期含金量: Is the cumulative OCF over the past three years greater than cumulative Net Income?
3. FCF 正數: Is the most recent fiscal year's Free Cash Flow (FCF) positive?
4. 長期 FCF: Is the sum of FCF over the past three years positive?
5. 現金轉換率: Is the OCF/NI Ratio greater than 1.0?
6. 轉換率穩定性: Has the OCF/NI Ratio remained above 1.0 for three consecutive years?
7. OCF 成長: Did the most recent quarter's OCF grow year-over-year (YoY)?
8. 成長質量: Is the OCF growth rate higher than or equal to the Net Income growth rate?
9. 每股 FCF 趨勢: Is FCF per Share trending upward (over a 3-year period)?
10. 資本支出合理性: Is the ratio of Depreciation & Amortization to CapEx reasonable (e.g., CapEx not abnormally low)?
11. 本業依賴度: Is the company not overly reliant on non-operating income (Non-operating income < 10%)?
12. 盈餘品質: Is the Accruals Ratio at a low level (indicating fewer accruals and more cash)?
13. EBITDA 轉換率: Is the EBITDA to OCF conversion ratio greater than 70%?
14. 資產出售檢視: Does the company avoid frequently selling assets to beautify cash flow?
15. 應收帳款管控: Is the Accounts Receivable growth rate lower than or equal to the revenue growth rate?
16. 存貨管控: Is the Inventory growth rate lower than or equal to the revenue growth rate?
17. 銷貨速度 (DSI): Did Days Sales of Inventory (DSI) decrease or remain flat YoY?
18. 收現速度 (DSO): Did Days Sales Outstanding (DSO) decrease or remain flat YoY?
19. 付款週期 (DPO): Is Days Payable Outstanding (DPO) stable (not abnormally extended to squeeze suppliers)?
20. 現金循環 (CCC): Did the Cash Conversion Cycle (CCC) shorten YoY?
21. 稅務現金流: Is the gap between cash taxes paid and reported income tax expense within a reasonable range?
22. 費用資本化: Does the company avoid capitalizing normal operating expenses?
23. 利息覆蓋率: Is the Interest Coverage Ratio (EBIT/Interest Expense) greater than 5x?
24. 現金利息覆蓋: Is the Cash Interest Coverage Ratio (OCF/Interest Paid) greater than 5x?
25. FCF 收益率: Is the FCF Yield higher than the industry average?

## II. 獲利穩定性與結構 (Earnings Stability & Structure)
26. 毛利率趨勢: Has Gross Margin shown a stable or upward trend over the past five years?
27. 季度毛利: Is the most recent quarter's Gross Margin better than the same period last year?
28. 營益率趨勢: Has Operating Margin shown a stable or upward trend?
29. 淨利率趨勢: Has Net Profit Margin shown a stable or upward trend?
30. 獲利波動度: Is Gross Margin volatility (standard deviation) lower than the industry average?
31. 連續獲利: Has the company been profitable for five consecutive years (no loss-making years)?
32. 核心獲利佔比: Does core operating profit account for more than 80% of Pre-tax Income?
33. 資產減損: Does the company have no record of massive Asset Write-downs in the past 3 years?
34. 銷售管理費率: Is the SG&A to Revenue ratio decreasing or flat (demonstrating economies of scale)?
35. 研發投入: Is the R&D to Revenue ratio stable (not slashed to boost short-term profit)?
36. 有效稅率: Is the Effective Tax Rate close to the statutory rate (no reliance on unsustainable tax breaks)?
37. EPS 成長: Has EPS grown for three consecutive years?
38. 調整後 EPS: Has Adjusted EPS (excluding non-recurring items) grown?
39. 營收成長源: Is revenue growth driven by "volume" or "price" rather than just currency fluctuations?
40. 客戶分散度: Is the company free from over-reliance on a single customer (Largest customer < 10%)?
41. 供應商分散度: Is the company free from over-reliance on a single supplier (Largest supplier < 10%)?
42. 定價權: Is the company's pricing power sufficient to pass on inflation costs (Gross Margin unaffected)?
43. 常規收入: Does Recurring Revenue account for more than 50% of total revenue?
44. 訂單出貨比: Is the Book-to-Bill Ratio greater than 1.0?
45. 積壓訂單: Is the Backlog consistently increasing?

## III. 資產負債表健康度 (Balance Sheet Impact)
46. 流動比率: Is the Current Ratio greater than 1.5?
47. 速動比率: Is the Quick Ratio greater than 1.0?
48. 槓桿倍數: Is the Net Debt / EBITDA ratio less than 3.0?
49. 負債比率: Is the Debt to Equity ratio lower than the industry average or less than 1.0?
50. 現金緩衝: Are Cash and Cash Equivalents sufficient to cover short-term debt for the next 12 months?
51. 再融資風險: Does the company avoid having large amounts of debt maturing soon with refinancing difficulties?
52. 商譽佔比: Is Goodwill less than 30% of Total Assets (avoiding impairment risk)?
53. 無形資產: Is the proportion of Intangible Assets to Total Assets reasonable?
54. 退休金負債: Are Pension Obligations Fully Funded?
55. 表外負債: Is the company free from significant Off-balance sheet liabilities?
56. 回購資金源: Are share buybacks funded by Free Cash Flow rather than debt?
57. 異常項目: Does the company avoid abnormal increases in "Other Receivables" or "Prepayments"?
58. 投資透明度: Are Long-term Investment valuations transparent and liquid?
59. 信用評等: Is the company's Credit Rating Investment Grade?
60. 違約紀錄: Has the company had no defaults or delayed interest payments in the past three years?
61. 現金水位: Is the Cash to Total Assets ratio maintained at a healthy level (e.g., > 5%)?
62. 存貨跌價準備: Is the allowance for inventory write-downs sufficient?
63. 呆帳覆蓋率: Is the Allowance for doubtful accounts coverage sufficient?
64. 遞延稅資產: Is it likely that Deferred Tax Assets will be realized?
65. 金融避險: Are financial asset investments properly hedged (e.g., currency hedging)?

## IV. 資本配置效率 (Capital Allocation Efficiency)
66. 股東權益報酬: Is Return on Equity (ROE) greater than 15%?
67. 投入資本回報: Is Return on Invested Capital (ROIC) greater than the Weighted Average Cost of Capital (WACC)?
68. ROIC 趨勢: Has ROIC remained stable or increased over the past three years?
69. 資產報酬率: Is Return on Assets (ROA) greater than 5% or better than peers?
70. 股東回饋: Has the company paid dividends or bought back shares for three consecutive years?
71. 配息率: Is the Payout Ratio in a reasonable range (< 80%, ensuring retained earnings for reinvestment)?
72. 再投資效益: Is the Reinvestment Rate commensurate with profit growth?
73. 併購成效: Have major M&A deals in the past three years contributed positive cash flow?
74. 擴張紀律: Has the company avoided overcapacity caused by blind expansion?
75. 資產利用率: Is the proportion of idle assets extremely low?
76. 資產週轉: Is Asset Turnover trending upward?
77. 固定資產週轉: Is Fixed Asset Turnover better than the industry average?
78. 殖利率: Is the Dividend Yield better than the industry average?
79. 保留盈餘: Are Retained Earnings increasing year over year?
80. 盈餘價值創造: Does every dollar of retained earnings create more than one dollar of market value?

## V. 會計誠信與紅旗警示 (Accounting Integrity & Red Flags)
81. 審計品質: Is the external auditor a "Big 4" firm or one with a strong reputation?
82. 會計師更換: Has the company not changed its external auditor in the past three years?
83. 審計意見: Are the financial reports consistently given an "Unqualified Opinion"?
84. 會計政策: Does the report avoid frequent changes in accounting policies or estimates (e.g., depreciation life)?
85. 內部人賣股: Have insiders (major shareholders, management) avoided significant stock selling in the past six months?
86. 內部人持股: Is insider ownership greater than 10% (aligning interests with shareholders)?
87. 關係人交易: Are Related-party transactions minimal or zero?
88. 營收認列: Is the revenue recognition policy conservative (not aggressive)?
89. 塞貨檢測: Is the Q4 revenue proportion not abnormally high (checking for channel stuffing)?
90. 監管紀錄: Has the company been free from investigations or penalties by securities regulators (last 3 years)?
91. CFO 穩定度: Has the CFO tenure been stable (no resignation in the past 3 years)?
92. 獨董比例: Do Independent Directors make up more than half of the Board?
93. 審計委員會: Does the Audit Committee function normally and include members with financial expertise?
94. 架構透明度: Is the company's complex structure (e.g., VIE, SPV) transparent enough not to obscure financials?
95. 財報準時: Have financial reports never been delayed without cause?
96. 薪酬掛鉤: Is management compensation linked to long-term performance (e.g., ROIC, EPS)?
97. 商譽淨值比: Does the company avoid an excessively high Goodwill to Net Worth ratio?
98. 隱藏關係人: Is there no high proportion of Accounts Receivable from single undisclosed related parties?
99. 訴訟風險: Is the company free from major legal litigation risks?
100. 治理評價: Are negative reviews of corporate governance from media and analysts minimal?

Response Template:
# 🏢 [Company Name] - 獲利品質 (ECQ)
**資料來源: ** [Year] Annual Report

### 1. 詳細評分清單
(List 1-100 items)
* **[簡短指標文字]:** [分析細節] **符合/不符/無數據** **分數**

### 2. 最終得分計算
* **起始基準分 (Base):** 50
* **符合 (+0.5):** [Count_True]
* **不符 (-0.5):** [Count_False]
* **無數據 (0):** [Count_NA]

# 📈 總分: [Calculated_Score] / 100

### 3. 指標小結
`;
