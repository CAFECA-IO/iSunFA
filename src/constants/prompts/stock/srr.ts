export const STOCK = `
Task: Try to find information about the company and execute the [SRR] Sustainability & Regulatory Resilience audit.

Objective:
1. Audit based on "IRSC-SRR Advanced Edition.
2. Search Sustainability Reports and Annual Reports.
3. Calculate the score.

Scoring Algorithm:
Base Score: 50
True (Pass): +0.5
False (Fail): -0.5
N/A (No Data): 0
Range: 0 to 100

Checklist (IRSC-SRR Advanced Edition)
## I. 環境永續與氣候韌性 (Environmental Sustainability)
1. 脫碳路徑: Has the company validated its Net Zero targets with science-based standards (e.g., SBTi)?
2. 準則接軌: Does the company align its disclosures with global standards like TCFD or ISSB (IFRS S1/S2)?
3. 排放強度: Has the GHG emission intensity (Scope 1 & 2) consistently decreased over the past 3 years?
4. 範疇一轉型: Does the company have a concrete roadmap for electrification or fuel switching to phase out fossil fuel combustion?
5. 範疇二佈局: Has the company secured renewable energy capacity through long-term PPAs (Power Purchase Agreements)?
6. 範疇三管理: Does the company have a concrete roadmap to measure and reduce Scope 3 emissions (supply chain)?
7. 數據確信: Are ESG metrics assured by an independent third party (e.g., ISO 14064, ISAE 3000)?
8. 棕色營收: Is revenue exposure to "brown industries" (fossil fuels/high pollution) below 10% or declining?
9. 漂綠風險: Is the company free from accusations of "Greenwashing" by major NGOs or regulators?
10. 環保裁罰: Has the company avoided material environmental fines (>0.5% of revenue) in the last 3 years?
11. 水足跡: Does the company implement a water stewardship strategy in water-stressed regions?
12. 循環經濟: Are products designed for circularity (recyclability/reusability) at the end of their lifecycle?
13. 綠色認證: Do key facilities hold recognized certifications (e.g., LEED, ISO 14001)?
14. 永續薪酬: Is a portion of executive compensation explicitly linked to ESG KPIs?
15. 實體風險: Has the company conducted climate stress tests on physical assets against extreme weather?
16. 自然相關: Does the company disclose dependencies and impacts on biodiversity (TNFD framework)?
17. 永續融資: Has the company issued Green Bonds or utilized Sustainability-Linked Loans (SLLs)?
18. 內部碳價: Does the company use an Internal Carbon Price (ICP) to evaluate capital investments?
19. CDP 評級: Is the company's CDP Climate Change score at "Management Level" (B) or higher?
20. 減塑時程: Is there a committed timeline for phasing out single-use plastics in operations?

## II. 法律合規與反壟斷風險 (Regulatory & Legal Compliance)
21. 反壟斷: Is the company free from ongoing major antitrust/competition law investigations?
22. 法遵獨立: Does the Chief Compliance Officer (CCO) have a direct reporting line to the Board?
23. 反貪腐: Is the company free from violations of FCPA, UK Bribery Act, or local anti-corruption laws?
24. 遊說揭露: Are political contributions and lobbying activities fully disclosed and audited?
25. 制裁篩查: Is the company and its key partners free from US/EU/UN trade sanction lists?
26. 吹哨保護: Is there an anonymous, third-party managed whistleblower channel available globally?
27. 稅務治理: Does the company publish a tax transparency report and avoid aggressive tax avoidance schemes?
28. 法規雷達: Does the company have a system to monitor regulatory changes in all operating jurisdictions?
29. 出口管制: Is the company fully compliant with strategic trade and technology export controls (e.g., EAR)?
30. 專利防禦: Is the company free from material adverse judgments in intellectual property litigation?
31. 合規培訓: Do 100% of employees complete mandatory annual code of conduct training?
32. 訴訟撥備: Are potential liabilities from pending litigation adequately reserved for in financial statements?
33. 行銷合規: Is the company free from penalties regarding false advertising or consumer protection violations?
34. 金融監管: Does the company maintain a clean record with financial regulators (SEC, FCA, etc.)?
35. 反洗錢: Are robust AML/KYC (Know Your Customer) procedures in place (if applicable)?
36. 高管背景: Are all C-suite executives clear of any criminal or regulatory disqualifications?
37. 監管關係: Is the relationship with primary regulators constructive rather than adversarial?
38. 新法調適: Is there a strategy to address emerging regulations (e.g., Crypto, Carbon Border Taxes)?
39. 合約公平: Are standard consumer contracts reviewed to prevent "unfair terms" challenges?
40. 繳稅紀錄: Is the company current on all tax obligations with no significant arrears?

## III. 數據隱私與資安監管 (Data Privacy, Cyber & Tech Regs)
41. 隱私合規: Is the company fully compliant with GDPR, CCPA/CPRA, and PIPL where applicable?
42. 無重大外洩: Has the company avoided data breaches affecting >100k users in the past 3 years?
43. 資安框架: Is the infosec management system certified (e.g., ISO 27001, NIST, SOC 2 Type II)?
44. 資安治理: Does the CISO verify cybersecurity posture to the Board at least quarterly?
45. 紅隊演練: Are regular penetration tests and "Red Teaming" exercises conducted?
46. AI 治理: Is there an ethical AI framework addressing algorithmic bias and transparency?
47. 數據自主: Does the company offer users a clear "Right to be Forgotten" and data portability?
48. 監管調查: Is the company free from privacy-related consent orders or investigations (e.g., FTC)?
49. 營運韌性: Is the Disaster Recovery Plan (DRP) tested annually for critical systems?
50. 供應鏈資安: Are third-party vendors assessed for cybersecurity risks before onboarding?
51. 人為防禦: Are anti-phishing drills conducted regularly with remedial training for failers?
52. 存取控制: Is Multi-Factor Authentication (MFA) mandated for all internal and remote access?
53. 生物特徵: Is the collection of biometric data strictly compliant with sensitive data laws?
54. 數據倫理: Does the company strictly abstain from selling user data to unauthorized third parties?
55. 跨境傳輸: Are Standard Contractual Clauses (SCCs) in place for cross-border data flows?
56. 關鍵防護: Are "Crown Jewel" assets and critical infrastructure physically or logically air-gapped?
57. 政策透明: Are updates to privacy policies communicated clearly, avoiding "dark patterns"?
58. 軟體清白: Is the company free from allegations of embedding spyware or backdoors?
59. 安全開發: Is "Security by Design" (DevSecOps) integrated into the software development lifecycle?
60. 資安保險: Does the company carry adequate Cyber Liability Insurance coverage?

## IV. 社會責任與勞動力韌性 (Social Responsibility & Workforce)
61. 留才能力: Is the voluntary employee turnover rate lower than the industry peer average?
62. DEI 指標: Does the company publish quantitative metrics on Diversity, Equity, and Inclusion?
63. 勞資關係: Is the company free from significant strikes or labor disputes in the last 3 years?
64. 福利優越: Do employee benefits packages exceed statutory minimums in all key regions?
65. 職安衛: Is the Lost Time Injury Frequency Rate (LTIFR) below the industry average?
66. 反騷擾: Is there a zero-tolerance policy and robust handling process for workplace harassment?
67. 同酬機制: Does the company conduct and disclose annual gender/racial pay gap audits?
68. 結社自由: Does the company explicitly respect the right to collective bargaining?
69. 社區許可: Does the company allocate a percentage of profits to CSR or community impact programs?
70. 人權盡職: Are human rights impact assessments conducted on the supply chain (e.g., forced labor)?
71. 技能重塑: Is there a budget dedicated to upskilling/reskilling employees for automation trends?
72. 客戶口碑: Is the Net Promoter Score (NPS) consistently positive?
73. 產品責任: Is the company free from massive product recalls or safety class-action lawsuits?
74. 全球人權: Does the Human Rights Policy align with the UN Guiding Principles (UNGPs)?
75. 裁員關懷: Do severance packages include outplacement services and extend beyond legal minimums?
76. 敬業度: Are employee engagement survey results and action plans shared with staff?
77. 勞動聲譽: Is the company free from "sweatshop" allegations in media or NGO reports?
78. 心理健康: Are Employee Assistance Programs (EAP) available for mental health support?
79. 童工零容忍: Is there a strictly enforced ban on child labor across all tiers of the supply chain?
80. 鄰避效應: Is the company free from major "NIMBY" (Not In My Backyard) community protests?

## V. 供應鏈與地緣政治韌性 (Supply Chain & Geopolitical Resilience)
81. 產地多元: Has the company implemented a "China + 1" or regionalization strategy to de-risk production?
82. 雙源採購: Are all critical components sourced from at least two qualified suppliers (Dual Sourcing)?
83. 地緣曝險: Is revenue dependence on politically unstable regions capped at a manageable level?
84. 營運持續: Is the Business Continuity Plan (BCP) formalized and activated during disruptions?
85. 深層透視: Does the company map risks down to Tier 2 and Tier 3 suppliers?
86. 成本轉嫁: Does the company demonstrate the ability to pass on inflationary raw material costs?
87. 衝突韌性: Has the company avoided material write-downs due to recent geopolitical conflicts?
88. 匯率避險: Is there a formal hedging policy for significant FX exposures?
89. 戰略庫存: Are safety stock levels adjusted dynamically based on supply chain volatility?
90. 物流鎖定: Are long-term freight agreements in place to guarantee capacity during crunches?
91. 防疫韌性: Is the remote/hybrid work infrastructure robust enough to handle future pandemics?
92. 客戶分散: Is no single customer responsible for >10% of total revenue (Concentration Risk)?
93. 技術主權: Is the company resilient against potential technology sanctions or blockades?
94. 供應商體檢: Are suppliers' financial health and credit risks monitored in real-time?
95. 多模物流: Can the company switch between air, sea, and rail freight rapidly if needed?
96. 基礎設施: Are backup power/water systems in place for facilities in high-risk infrastructure zones?
97. 衝突礦產: Is the supply chain certified "Conflict-Free" (3TG) with transparent reporting?
98. 在地對策: Is there a localized manufacturing strategy to mitigate protectionist tariffs?
99. 數位供應鏈: Is a control tower or digital twin used for real-time supply chain visibility?
100. 地緣情蒐: Is there a dedicated function assessing geopolitical impact on global operations?

Response Template:
# 🏢 [Company Name] - 永續與法規 (SRR)
**資料來源: ** [Year] Sustainability Report

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
