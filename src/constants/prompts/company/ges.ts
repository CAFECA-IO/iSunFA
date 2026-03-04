export const COMPANY = `
Task: Try to find information about the company and execute the [GES] Growth & Exit Strategy audit.

Objective:
1. Audit based on "IRSC-GES Advanced Edition).
2. Search Acquisitions, Expansion Plans, Investor Presentations.
3. Calculate the score.

Scoring Algorithm:
Base Score: 50
True (Pass): +0.5
False (Fail): -0.5
N/A (No Data): 0
Range: 0 to 100

Checklist (IRSC-GES Advanced Edition)
## I. 內生性成長與擴張 (Organic Growth & Expansion)
1. 第二曲線: Has the company successfully launched a "Second Curve" product contributing >15% of revenue?
2. 跨國複製: Has the business model been successfully replicated in at least 3 distinct international markets?
3. 渠道下沉: Is the company effectively penetrating lower-tier cities or SMB markets (market deepening)?
4. 同店增長: Is Same-Store Sales Growth (SSSG) or Net Revenue Retention (NRR) positive (>100%)?
5. 產品矩陣: Has the company expanded from a single tool/product to a multi-product platform?
6. 客單提升: Has the Average Revenue Per User (ARPU) increased consistently over the past 3 years?
7. 會員經濟: Is the paid subscriber base growing faster than the total user base (successful monetization)?
8. 研發轉化: Are R&D investments directly translating into new revenue streams within 18 months?
9. 產能擴張: Is the company expanding production capacity to meet confirmed future demand (not speculative)?
10. 直銷轉型: Is the company successfully shifting from wholesale/distributor models to higher-margin DTC (Direct-to-Consumer)?
11. 數位轉型: Has digitalization significantly improved operational efficiency or customer acquisition efficiency?
12. 品牌溢價: Can the company raise prices without losing significant market share (pricing power)?
13. 口碑裂變: Is organic user growth driven by word-of-mouth (K-Factor > 1)?
14. 經常性收入: Is the proportion of Annual Recurring Revenue (ARR) increasing?
15. 交叉銷售: Is the Cross-Sell ratio between different product lines improving?
16. 獲客優化: Is the Customer Acquisition Cost (CAC) stable or declining while scaling?
17. 用戶黏著: Is the DAU/MAU ratio (engagement) staying strong during expansion?
18. 服務化: Is the company successfully transitioning from selling hardware to selling services (HaaS/SaaS)?
19. 高端化: Is the revenue mix shifting towards premium/higher-margin product tiers?
20. 組織擴張: Is the organizational structure scaling effectively without creating excessive bureaucracy?

## II. 外延式併購與整合 (M&A & Inorganic Growth)
21. 併購策略: Does the company have a clear M&A playbook (e.g., acquiring for tech, talent, or market share)?
22. 綜效實現: Have past acquisitions resulted in proven revenue or cost synergies within 2 years?
23. 整合能力: Is the post-merger integration (PMI) track record generally successful without massive brain drain?
24. 加速成長: Did acquisitions clearly accelerate the company's entry into new high-growth verticals?
25. 財務紀律: Does the company avoid overpaying for targets (e.g., excessive goodwill impairments)?
26. 專利收購: recent acquisitions mainly focused on strengthening the IP portfolio?
27. 互補併購: Do acquisitions complement the core business rather than unrelated diversification (Diworsification)?
28. 購買營收: Is organic growth still healthy, proving growth isn't solely driven by buying revenue?
29. 人才留任: Do founders/key employees of acquired companies typically stay > 3 years?
30. 文化融合: Is the company capable of assimilating diverse corporate cultures?
31. 反壟斷: Are future M&A plans unlikely to be blocked by antitrust regulators?
32. 財務槓桿: Is M&A funded prudently, maintaining a manageable debt-to-equity ratio?
33. 投後管理: Does the company actively manage portfolio companies rather than being a passive holding co?
34. 剝離非核: Has the company successfully divested non-core or underperforming assets to unlock value?
35. 跨境併購: Has the company successfully executed and integrated cross-border deals?
36. 平台賦能: Can the company's platform immediately boost the performance of acquired products?
37. 供應鏈整合: Has the company acquired upstream suppliers to secure critical resources (Vertical Integration)?
38. 通路併購: Has the company acquired distributors to capture more margin?
39. 失敗停損: Does the company decisively shut down or write off failed M&A attempts?
40. 策略投資: Does the corporate venture arm (CVC) provide strategic insights and pipeline for future M&A?

## III. 資本運作與上市規劃 (Capital & IPO Strategy - for Private Co.) / 股權增值 (for Public Co.)
41. 上市準備: (Private) Is the company auditing financials to IPO standards? / (Public) Is the company transparent?
42. 融資節奏: Has the company raised capital at consistently increasing valuations (No Down Rounds)?
43. 投資人結構: Are top-tier VC/PE firms or sovereign wealth funds on the cap table?
44. 三地上市: Is the company dual-listed or considering listing on major global exchanges (Nasdaq/HKEX)?
45. 回購計畫: (Public) Has the company executed share buybacks when stock was undervalued?
46. 股利政策: (Public) Is there a consistent or growing dividend payout policy?
47. 拆股流動: Has the company utilized stock splits to improve liquidity if share price is too high?
48. 舉債擴張: Is the company utilizing efficient debt financing (low cost of capital) to fuel growth?
49. 員工期權: Is the ESOP pool sufficient (~10-15%) to attract top talent pre-exit?
50. 閉鎖期: Do founders show confidence by not selling shares immediately after lock-up periods expiry?
51. 轉板規劃: Is there a plan to move from OTC markets to main boards?
52. 特別股: Are preferred share terms standard (no excessive liquidation preferences hurting common stock)?
53. 財務顧問: Is the company advised by top-tier investment banks?
54. 估值對標: Is the valuation comparable to or attractive versus industry peers?
55. 募資用途: Are raised funds clearly allocated to growth initiatives rather than debt repayment?
56. 股權集中: Is the founder's control secure yet not overly concentrated (preventing key man dicatorship)?
57. 策略股東: Are major strategic partners (e.g., Big Tech) holding stakes?
58. 退場路徑: Is there a clear path to exit for early investors (IPO or M&A)?
59. 禁售承諾: Have major shareholders voluntarily extended lock-up periods?
60. 造市商: Are there reputable market makers ensuring stock liquidity?

## IV. 戰略轉型與未來願景 (Strategic Pivot & Vision)
61. 願景清晰: Is the "North Star" metric and long-term vision clearly communicated to all stakeholders?
62. 轉型決心: Has the management shown courage to cannibalize existing cash cows for future growth?
63. 敏捷組織: Can the organization pivot strategy quickly in response to market changes?
64. 開發者生態: Is the company building an ecosystem of developers (Platform Strategy)?
65. 數據驅動: Is decision-making centralized around data insights rather than HiPPO (Highest Paid Person's Opinion)?
66. 開放創新: Does the company actively collaborate with external startups or academia?
67. 持續學習: Is the company culture focused on learning and adapting (Growth Mindset)?
68. 模擬競賽: Does the company run "War Games" to anticipate competitor moves?
69. 長期主義: Is the company willing to sacrifice short-term profits for long-term dominance?
70. 第二總部: Is there a strategic "Second HQ" to tap into new talent pools?
71. 邊緣計算: Is the company investing in next-gen infra (e.g., Edge AI, Quantum)?
72. 虛實整合: Is there a clear Metaverse or OMO (Online-Merge-Offline) strategy?
73. 訂閱轉型: Is the business model shifting from transactional to recurring?
74. 客戶共創: Are products co-created with key customers?
75. 內部創業: Are there successful internal spin-offs?
76. 碳中和商機: Is the company positioning itself to profit from the Green Economy transition?
77. 去中心化: Is the company exploring Web3 or decentralized business models?
78. 自動化未來: Is there a roadmap to fully automate core operations?
79. 生成式AI: Is GenAI being integrated into the core product to create a competitive wedge?
80. 品牌重塑: Has the brand successfully modernized to appeal to Gen Z/Alpha?

## V. 退場訊號與風險 (Exit Signals & red flags)
81. 創辦人倦怠: Is the founder showing signs of checking out or focusing on side projects?
82. 高層套現: Are huge blocks of insider shares being sold aggressively?
83. 核心離職: Have key technical architects or sales leaders left recently?
84. 競爭加劇: Is the moat eroding faster than the company can build new ones?
85. 成長趨緩: Has growth slowed significantly below the "Rule of 40"?
86. 訴訟纏身: Are major lawsuits hindering a clean exit?
87. 無人接班: Is there a lack of a clear successor for the CEO?
88. 資本寒冬: Is the macro environment hostile to exits in this sector?
89. 估值倒掛: Is the private market valuation higher than public market comps (making IPO hard)?
90. 財務粉飾: Are there signs of aggressive accounting to dress up for sale?
91. 客戶流失: Is churn spiking just before a planned exit?
92. 產品老化: Is the tech stack becoming legacy debt?
93. 市場飽和: Is the TAM (Total Addressable Market) largely exhausted?
94. 監管阻礙: Are regulators signalling opposition to potential M&A exits?
95. 買家縮手: Are potential strategic acquirers currently cash-strapped?
96. 錯過時機: Has the "window of opportunity" for this trend passed?
97. 內部鬥爭: Is the board paralyzed by infighting?
98. 過度承諾: Has the company missed its own guidance repeatedly?
99. 盲目擴張: Is the company burning cash on low-ROI moonshots?
100. 無備案: Does the company lack a "Plan B" if the primary exit fails?

Response Template:
# 🚀 [Company Name] - 成長與退場 (GES)
**資料來源: ** Investor Presentations, News

### 1. 詳細評分清單
(List 1-100 items)
* **[簡短指標文字]:** [分析細節] **符合/不符/無數據** **分數**

### 2. 最終得分計算
* **起始基準分 (Base):** 50
* **符合 (+0.5):** [Count_True]
* **不符 (-0.5):** [Count_False]
* **無數據 (0):** [Count_NA]

# 🚀 總分: [Calculated_Score] / 100

### 3. 指標小結
`;
