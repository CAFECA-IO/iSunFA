export const COMPANY = `
Task: Try to find information about the company and execute the [ERE] External Risk Resilience audit.

Objective:
1. Audit based on "IRSC-ERE Advanced Edition).
2. Search Risk Factors (10-K), Global News.
3. Calculate the score.

Scoring Algorithm:
Base Score: 50
True (Pass): +0.5
False (Fail): -0.5
N/A (No Data): 0
Range: 0 to 100

Checklist (IRSC-ERE Advanced Edition)
## I. 地緣政治與宏觀經濟 (Geopolitics & Macroeconomics)
1. 無戰爭衝突: Is the company's primary revenue-generating country currently not in a state of war or armed conflict?
2. 無制裁風險: Does the company's supply chain avoid reliance on heavily sanctioned countries (e.g., Russia, Iran)?
3. 無出口管制: Are the company's products free from export controls or entity lists of major powers (e.g., US, China)?
4. 匯率穩定: Has the currency fluctuation in the company's primary markets been less than 20% over the past 12 months?
5. 匯損避險: Has the company hedged against its primary operating currencies to avoid exchange losses?
6. 分散新興市場: Does the company avoid over-reliance on politically unstable emerging markets (<30% of revenue)?
7. 稅務穩定: Is the corporate tax policy in the company's headquarters expected to remain stable for the next 3 years?
8. 全球稅改: Has the company avoided major negative impacts from global minimum tax regulations?
9. 貿易戰避險: Is the company's industry currently outside the core list of tariff retaliation in the US-China trade war?
10. 能源抗性: Is the company free from direct major impacts of recent drastic fluctuations in oil or gas prices?
11. 通膨轉嫁: Does the company possess pricing power to pass costs to customers in a high-inflation environment?
12. 資產安全: Does the company face no risk of nationalization or asset expropriation in key factory locations?
13. 政治中立: Does the company maintain a neutral relationship with the local government, avoiding liquidation risks from regime changes?
14. 升息抗性: Is the company's interest coverage ratio (>3) sufficient to withstand Fed rate hikes?
15. 資金匯回: Are there no major capital control barriers for repatriating overseas funds?
16. 勞力分散: Does the company avoid over-reliance on the labor supply of a single country?
17. 非敏感技術: Does the company avoid sensitive military or national security technologies to prevent foreign government scrutiny?
18. 貿易合規: Has the company completed compliance adjustments following Brexit or other regional trade agreement changes?
19. 非歧視待遇: Is the company free from discriminatory policies against foreign enterprises in its major markets?
20. 剛性需求: Are the company's products considered essential (non-cyclical luxury) during a global economic recession?

## II. 供應鏈與外部依賴 (Supply Chain & Dependencies)
21. 無單一貨源: Do key raw material suppliers avoid "Single Source" risks?
22. 物流多元: Does the company avoid reliance on a single logistics channel (e.g., specific ports or canals)?
23. 勞權合規: Have upstream suppliers avoided major labor rights scandals (e.g., forced labor) in the past 3 years?
24. 安全庫存: Does the company maintain a safety stock of critical components for more than 3 months?
25. 晶片無虞: Is the company free from direct shutdown threats due to global chip or semiconductor shortages?
26. 電力備援: Do major production bases have backup power systems to cope with power rationing crises?
27. 客戶分散: Does the company avoid over-reliance on specific customers (single customer revenue <15%)?
28. 異地備援: Do cloud services or data centers have off-site backup mechanisms?
29. 專利穩固: Is the company free from external risks of critical patent licensing expiration or revocation?
30. 不可抗力: Do contracts with major suppliers include "Force Majeure" protection clauses?
31. 產線彈性: Does the company have the ability to quickly switch production lines to meet external demand changes?
32. 運價抗性: Is the company's profit not severely eroded by soaring international shipping prices?
33. 反壟斷: Is the company free from the risk of upstream raw materials being monopolized by cartels?
34. 通路自主: Is the distribution network diversified and not squeezed by a single large channel (e.g., Amazon/Walmart)?
35. 資源替代: Does the company avoid reliance on specific scarce natural resources (e.g., rare earths) without alternatives?
36. 供應多元: Has the company established a supplier diversity program to spread geopolitical risks?
37. 違約防範: Has the company avoided major default damages caused by supplier bankruptcy?
38. 物流工會: Do logistics partners have good union relations with no strike risks?
39. 庫存跌價: Is inventory turnover healthy, avoiding write-down losses due to sudden drops in external demand?
40. 製造獨立: Can the company manufacture core products independently without relying on competitors for OEM?

## III. 法律、合規與監管 (Legal, Regulatory & Compliance)
41. 無巨額訴訟: Is the company currently free from class-action lawsuits with claims exceeding 5% of net worth?
42. 反壟斷調查: Is the company free from investigations by antitrust authorities?
43. 高管清白: Have senior management avoided securities fraud or insider trading allegations in the past 5 years?
44. 隱私合規: Do products comply with EU GDPR or the strictest data privacy regulations in various countries?
45. 環保合規: Has the company avoided major fines or shutdown orders from environmental agencies due to pollution?
46. 專利無憂: Is the company free from legal disputes involving infringement of others' core patents?
47. 產品召回: Has the company avoided product recall orders from the FDA or relevant health authorities?
48. 財報無保留: Have financial statements received an "Unqualified Opinion" from auditors for 5 consecutive years?
49. 勞動合規: Is the company not listed on "sweatshop" or major violation lists by labor authorities?
50. 反賄賂: Is the company free from transnational bribery cases (e.g., FCPA violations)?
51. 碳稅準備: Is the company financially prepared for upcoming Carbon Tax implementation?
52. 廣告誠信: Has the company avoided huge fines from consumer protection agencies for false advertising?
53. 新興合規: Is the company free from compliance hits related to cryptocurrency or emerging financial regulations?
54. 併購過關: Have the company's M&A deals avoided rejection by regulators?
55. 無歧視訴訟: Is the company free from major lawsuits regarding discriminatory hiring or workplace harassment?
56. 工資工時: Does the company fully comply with local minimum wage and working hour regulations?
57. 反洗錢: Is the company free from investigations or sanctions related to Anti-Money Laundering (AML)?
58. 執照穩固: Is there no risk of franchise rights or licenses being revoked in the next 3 years?
59. 版權合規: Is the company free from lawsuits regarding software piracy or licensing violations?
60. 法遵獨立: Does the company have an independent compliance department reporting directly to the Board?

## IV. 突發事件與災難韌性 (Black Swan & Disaster Resilience)
61. BCP 演練: Has the company developed and rehearsed a complete Business Continuity Plan (BCP)?
62. 資安防禦: Has the company avoided cyberattacks causing service interruptions >24 hours in the past 12 months?
63. 保險足額: Are major assets fully insured against fire, flood, and business interruption?
64. 選址安全: Are headquarters and core factories located in non-earthquake or low-flood risk zones?
65. 遠距能力: Did the company demonstrate remote operation capabilities during pandemics like COVID-19?
66. 個資安全: Has the company never experienced a large-scale customer data breach?
67. 勒索防護: Does the company have backup and restore mechanisms to counter Ransomware?
68. 氣候適應: Has the company avoided forced capacity reduction due to climate change (e.g., extreme heat)?
69. 關鍵人保險: Does the company have "Key Man Risk" insurance or succession plans for critical technical staff?
70. 工安零災: Has the company avoided industrial accidents causing fatalities or major shutdowns?
71. 機密防護: Does the R&D center have physical and digital protection against trade secret theft?
72. 假新聞應對: Does the company have a crisis management team to deal with social media fake news attacks?
73. 技術更新: Does the company avoid relying on a single obsolete tech platform facing collapse risks?
74. 社會安定: Has the company avoided asset damage due to local riots or social unrest?
75. 現金緩衝: Does the company have a Cash Buffer sufficient for 6 months of zero revenue?
76. 無漂綠: Has the company avoided "Greenwashing" scandals due to falsified supply chain carbon footprint data?
77. 能源衝擊: Does the company have the cost absorption capacity to handle a 50% spike in energy prices?
78. 股權穩定: Is the company free from proxy fights initiated by Activist Investors?
79. 高層穩定: Has the company avoided abnormal events like executives resigning without warning or disappearing?
80. 災難指引: Does the company have basic protection guidelines for nuclear disasters or regional biochemical crises?

## V. 市場情緒與聲譽風險 (Market Sentiment & Reputation)
81. 無做空報告: Has the company not been targeted by short-seller reports in the past 12 months?
82. 員工滿意: Is employee satisfaction on Glassdoor or similar sites higher than 3.5 stars?
83. 無抵制活動: Has the company avoided large-scale online Boycott events?
84. 政治中立: Is the brand free from involvement in highly controversial social or political issues?
85. 言論合宜: Have executives avoided making racist or sexist remarks in public?
86. 股價穩定: Is the stock price volatility (Beta) not abnormally higher than the industry average?
87. ESG 評級: Has the company avoided downgrades by major ESG rating agencies (e.g., MSCI)?
88. 無拋售潮: Is there an absence of significant insider stock selling signals?
89. 產品安全: Has the company avoided major PR crises due to product design flaws causing injuries?
90. 勞資和諧: Is the relationship with unions or labor groups harmonious?
91. 文化健康: Has the company not been exposed by media for having a "Toxic Workplace Culture"?
92. 溝通透明: Does the company hold regular earnings calls and maintain transparent communication with investors?
93. 分析師看好: Is the proportion of "Sell" recommendations in analyst ratings lower than 10%?
94. 財測誠信: Has the company avoided misleading revisions of financial guidance?
95. 社群聲量: Does the company have positive brand sentiment on mainstream social media?
96. 無掏空傳聞: Is the company free from rumors of embezzlement or asset tunneling?
97. 創辦人風險: Is the company not overly reliant on the founder's personal halo (Key Man Risk)?
98. 暗網監控: Is there no intelligence of massive corporate credential sales on the Dark Web?
99. 採購白名單: Is the company not listed on government procurement blacklists?
100. 客戶口碑: Does the company maintain a positive score in customer satisfaction surveys (e.g., NPS)?

Response Template:
# 🛡️ [Company Name] - 外部韌性 (ERE)
**資料來源: ** [Year] Annual Report (Risk Factors)

### 1. 詳細評分清單
(List 1-100 items)
* **[簡短指標文字]:** [分析細節] **符合/不符/無數據** **分數**

### 2. 最終得分計算
* **起始基準分 (Base):** 50
* **符合 (+0.5):** [Count_True]
* **不符 (-0.5):** [Count_False]
* **無數據 (0):** [Count_NA]

# 🛡️ 總分: [Calculated_Score] / 100

### 3. 指標小結
`;
