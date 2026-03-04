export const STOCK = `
Task: Try to find information about the company and execute the [TPM] Technology & Product Momentum audit.

Objective:
1. Audit based on "IRSC-TPM Checklist".
2. Search R&D expenses, Patents, TechCrunch, Blogs, Glassdoor.
3. Calculate the score.

Scoring Algorithm:
Base Score: 50
True (Pass): +0.5
False (Fail): -0.5
N/A (No Data): 0
Range: 0 to 100

Checklist (IRSC-TPM Advanced Edition)

## I. 企業技術研發實力 (Company Tech R&D & Hard Power)
(評估企業是否有足夠的「內功」來打造護城河)
1. 研發增長: Has the company's absolute R&D expenditure increased continuously over the past 3 years?
2. 研發強度: Is the R&D-to-Revenue ratio significantly higher than the industry average (indicating aggressive tech investment)?
3. 核心專利: Does the company hold "Invention Patents" (not just utility models) that cover core technologies?
4. 技術壁壘: Does the company possess proprietary technology or trade secrets that take competitors >12 months to replicate?
5. 人才密度: Do R&D personnel account for a high percentage (>30%) of the total workforce?
6. 技術長穩: Has the CTO or core technical leadership remained stable for the last 3 years?
7. 頂級論文: Has the team published papers in top-tier journals (e.g., Nature, IEEE) or presented at major tech conferences?
8. 數據資產: Does the company own exclusive, massive datasets that create a data moat (Data Network Effect)?
9. 底層架構: Does the company control the underlying infrastructure (e.g., own chips, OS, or core algorithms) rather than relying on APIs?
10. 產學合作: Is there an active joint lab with top-tier research universities?
11. 創新轉化: Is the revenue contribution from technologies developed in the last 2 years > 20%?
12. 開源主導: Is the company a primary maintainer or major contributor to critical open-source projects?
13. 製程領先: (Manufacturing) Is the company's yield rate or production efficiency significantly better than peers?
14. 實驗室: Does the company operate a dedicated "Future Lab" or "X-Lab" for moonshot projects?
15. 技術併購: Has the company acquired niche startups specifically to absorb their technical talent (Acqui-hire)?
16. 自動化: Is the internal software delivery pipeline (CI/CD) or manufacturing process highly automated?
17. 標準制定: Is the company a member of committees setting the next-generation industry standards?
18. 技術債: Does the company have a clear, executed plan to manage and reduce technical debt?
19. 獨家授權: Does the company hold exclusive IP licenses that block competitors from entering?
20. 技術文化: Is the company widely recognized by engineers as a "Tech-First" culture?

## II. 產業風口與趨勢紅利 (Industry Windfall & Macro Trends)
(評估該產業是否為「風口」，即外部環境是否在推著公司飛)
21. 高速成長: Is the projected CAGR (Compound Annual Growth Rate) of the industry > 15% for the next 5 years?
22. 政策順風: Is the industry currently receiving massive government subsidies or favorable policy support (e.g., Green Deal, AI Chips)?
23. 剛性轉型: Is the industry undergoing a mandatory structural shift (e.g., Fuel to EV, On-prem to Cloud)?
24. 資本湧入: Has the total Venture Capital (VC) investment in this sector increased significantly in the last 4 quarters?
25. 滲透早期: Is the market penetration rate currently in the "S-Curve" rapid adoption phase (typically 10% - 40%)?
26. 巨頭進場: Have global tech giants (Google, Apple, Tesla, etc.) recently announced entry into this specific sector?
27. 技術突破: Did a recent technological breakthrough (e.g., Generative AI, Solid-state Battery) unlock new market possibilities?
28. 藍海市場: Is the market relatively uncontested, allowing for high margins without fierce price wars?
29. 基礎設施: Is the necessary infrastructure (e.g., 5G, Charging Stations) ready to support mass adoption?
30. 人才流向: Is there a noticeable trend of top talent migrating from traditional industries to this sector?
31. 媒體熱度: Is the industry a frequent topic of discussion in mainstream financial and tech news?
32. 法規鬆綁: Are regulators actively removing barriers to entry or operation for this industry?
33. 社會共識: Does the trend align with global consensus values (e.g., Sustainability, Aging Society, Digitalization)?
34. 成本拐點: Has the cost of the core technology dropped to a point where mass commercialization is viable (e.g., cost per kWh)?
35. 併購熱潮: Is the industry experiencing a wave of M&A, indicating consolidation and valuation growth?
36. 分析師看好: Do major investment banks universally rate the sector as "Overweight" or "Outperform"?
37. 獨角獸: Are new "Unicorns" (startups valued >$1B) frequently emerging in this sector?
38. 供應鏈緊缺: Is there a shortage of supply relative to demand, giving suppliers pricing power?
39. 國際競賽: Is this industry considered a strategic battleground between major geopolitical powers?
40. 抗週期性: Does this trend persist even during economic downturns (Secular Growth Trend)?

## III. 產品競爭力與轉化 (Product Competitiveness & PMF)
(評估公司能否打造出符合風口需求的產品)

41. 痛點解決: Does the product solve a "Must-have" problem rather than a "Nice-to-have" one?
42. PMF 驗證: Has the product achieved clear Product-Market Fit (PMF) evidenced by explosive organic growth?
43. 體驗領先: Is the User Experience (UX) or performance significantly superior to incumbent solutions?
44. 產品迭代: Is the product release cycle faster than the industry average?
45. 擴展性: Can the product scale to millions of users without a complete architectural overhaul?
46. 定價權: Can the product command a premium price due to the high demand in the windfall sector?
47. 生態系: Does the product connect with other services to form a sticky ecosystem?
48. 獲客成本: Is the CAC (Customer Acquisition Cost) decreasing due to the "Windfall" hype (organic traffic)?
49. 病毒效應: Does the product have built-in mechanisms that encourage users to invite others?
50. 跨界整合: Does the product successfully combine the new tech trend with traditional industry needs?
51. 進入門檻: Is the product difficult for a generic competitor to copy within 6 months?
52. 全球化: Is the product designed for the global market from day one?
53. 客戶留存: Is the retention rate higher than industry peers?
54. 平台屬性: Does the product enable third-party developers to build upon it?
55. 關鍵認證: Has the product obtained necessary industry certifications to enter the market?
56. 供應鏈掌握: (Hardware) Does the company have secured supply of critical components in a shortage market?
57. 服務支援: Is the customer success/support team rated highly by early adopters?
58. 品牌定位: Is the brand perceived as a "Native" player in this new trend?
59. 轉換障礙: Once adopted, is it costly or difficult for the customer to switch away?
60. 單位經濟: Is the LTV/CAC ratio healthy (>3x) even in the early growth phase?

## IV. 市場動能與爆發力 (Market Momentum & Traction)
(評估市場對公司產品的實際反應與熱度)

61. 營收爆發: Is the quarter-over-quarter revenue growth accelerating?
62. 搜尋量: Are Google Trends searches for the brand name hitting all-time highs?
63. 用戶激增: Are user registration or active user numbers growing exponentially?
64. 社群聲量: Is the brand viral on platforms like Twitter, Reddit, or TikTok?
65. 機構建倉: Are institutional investors (Smart Money) aggressively buying the stock?
66. 訂單積壓: Is the Backlog of orders growing faster than the company can fulfill them?
67. 招聘擴張: Is the company aggressively hiring, especially for sales and tech roles?
68. 網站流量: Is website traffic or App downloads ranking improving week over week?
69. 合作宣傳: Are major partners or clients publicly announcing their collaboration with the company?
70. 媒體霸榜: Is the company frequently featured on "Top Innovation" or "Fastest Growing" lists?
71. 股價強度: Is the stock price performance outperforming the sector index (Relative Strength)?
72. 空單回補: Is the short interest ratio decreasing (bears giving up)?
73. 預期上修: Have analysts raised their earnings or revenue targets recently?
74. 客戶推薦: Is a large portion of new growth coming from referrals (High K-factor)?
75. 活動爆滿: Are company events or webinars oversubscribed?
76. 超級用戶: Is there a cult-like following of users who defend and promote the brand?
77. 通路搶貨: Are distributors or channels competing to carry the product?
78. 新品售罄: Do new product batches sell out immediately upon release?
79. 意見領袖: Are top industry KOLs endorsing the product without paid sponsorship?
80. 競對反應: Are competitors changing their strategy specifically to counter this company?

## V. 技術風險與持續性 (Tech Risk & Sustainability)
(評估是否只是曇花一現或存在致命弱點)

81. 技術過時: Is there a risk of a newer technology rendering the company's tech obsolete overnight?
82. 專利訴訟: Is the company free from major IP infringement lawsuits?
83. 資安韌性: Has the company avoided catastrophic data breaches or hacks?
84. 供應依賴: Is the company not overly dependent on a single supplier for critical tech components?
85. 人才流失: Is the turnover rate of key R&D staff low?
86. 監管打壓: Is the "Windfall" sector at risk of sudden regulatory crackdowns (e.g., Crypto, Fintech)?
87. 產能瓶頸: Can the company scale production fast enough to meet "Windfall" demand without breaking?
88. 燒錢速度: Is the Burn Rate sustainable given the current cash reserves?
89. 估值泡沫: Is the valuation reasonable relative to growth (PEG < 2), or is it purely hype-driven?
90. 漂綠風險: (If ESG related) Is the technology genuinely sustainable and not "Greenwashing"?
91. 地緣政治: Is the technology subject to export controls or geopolitical sanctions?
92. 單一客戶: Is revenue not concentrated on just one or two major clients?
93. 技術詐欺: Has the technology been independently verified (e.g., not another Theranos)?
94. 標準落敗: Is the company betting on a technology standard that is winning the war (e.g., VHS vs. Beta)?
95. 獲利路徑: Is there a clear path to profitability once the initial hype settles?
96. 規模不經濟: Does the business model avoid costs that scale faster than revenue?
97. 隱私合規: Is the technology compliant with GDPR/CCPA to avoid massive fines?
98. 創辦人誠信: Does the founding team have a clean track record without history of fraud?
99. 災難復原: Does the company have a robust plan for system failures?
100. 長期願景: Does the management focus on 5-10 year horizons rather than just short-term stock pumping?

Response Template:
# 🚀 [Company Name] - 技術動能 (TPM)
**資料來源: ** Annual Reports, Tech Blogs

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
