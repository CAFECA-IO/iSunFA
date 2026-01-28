export const FUND = `
Task: Try to find information about the fund and execute the [SRR] Sustainability (ESG) audit.

Objective:
1. Audit based on "IRSC-SRR Advanced Edition (Fund Focus)".
2. Search for **ESG Ratings**, **Carbon Metrics**, and **SFDR Classification**.
3. Calculate the score.

Scoring Algorithm:
Base Score: 50
True (Pass): +0.5
False (Fail): -0.5
N/A (No Data): 0
Range: 0 to 100

Checklist (IRSC-SRR Fund Focus)
## I. ESG 評級與標籤 (Ratings & Labels)
1. 晨星地球儀: Does the fund have 4 or 5 Morningstar Sustainability Globes (High Rating)?
2. MSCI ESG: Is the fund rated AA or AAA by MSCI ESG Research?
3. SFDR 分類: Is the fund classified as Article 8 (Promotes ESG) or Article 9 (Impact) under EU SFDR?
4. 綠色標籤: Does the fund hold any official Green Labels (e.g., LuxFLAG, FNG Seal)?
5. 永續主題: Is "Sustainability", "ESG", or "Climate" explicitly in the fund name?
6. 負面排除: Does the fund explicitly exclude Controversial Weapons, Tobacco, and Thermal Coal?
7. 聯合國SDGs: Does the fund map its impact to specific UN Sustainable Development Goals?
8. Morningstar低碳: Does the fund have the "Low Carbon Designation"?
9. Fossil Free: Is the portfolio < 5% exposed to Fossil Fuel extractors?
10. 核能/天然氣: Is the exposure aligned with the EU Taxonomy (if applicable)?

## II. 碳足跡與氣候指標 (Carbon & Climate)
11. 碳強度: Is the Weighted Average Carbon Intensity (WACI) lower than the benchmark?
12. 絕對碳排: Are the financed emissions (Scope 1+2) declining YoY?
13. 升溫路徑: Is the portfolio aligned with a < 2°C or 1.5°C warning scenario?
14. 轉型風險: Is the exposure to "Stranded Assets" low?
15. 綠色營收: Is the % of Green Revenue in the portfolio > 20%?
16. 科學基礎目標: Do > 30% of portfolio companies have SBTi validated targets?
17. 氣候治理: Does the fund vote against management on weak climate plans?
18. 實體風險: Is the portfolio resilient to physical climate risks (e.g., floods, heat)?
19. TCFD報告: Does the fund publish a TCFD-aligned climate report?
20. 淨零承諾: Is the fund part of the Net Zero Asset Managers initiative?

## III. 社會與爭議管理 (Social & Controversies)
21. 爭議事件: Are there zero holdings with "Severe" controversies (Red Flags)?
22. 人權審查: Does the fund screen for UN Global Compact violators?
23. 性別多樣性: Is the weighted average Board Gender Diversity > 30%?
24. 勞工權益: Does the fund score high on Labor Management practices?
25. 供應鏈責任: Are portfolio companies audited for supply chain ethics?
26. 產品安全: Are holdings free from major product safety recalls?
27. 數據隱私: Do tech holdings score well on Digital Rights/Privacy?
28. 社區影響: Does the fund invest in underserved communities (Impact Investing)?
29. 健康福祉: Does the fund avoid predatory lending or gambling stocks?
30. 動物福利: Does the fund screen for animal testing severity?

Response Template:
# 🌱 [Fund Name] - 永續與 ESG (SRR)
**資料來源: ** Morningstar, MSCI, Fund ESG Report

### 1. 詳細評分清單
(List items)
* **[簡短指標文字]:** [分析細節] **符合/不符/無數據** **分數**

### 2. 最終得分計算
* **起始基準分 (Base):** 50
* **符合 (+0.5):** [Count_True]
* **不符 (-0.5):** [Count_False]
* **無數據 (0):** [Count_NA]

# 🌱 總分: [Calculated_Score] / 100

### 3. 關鍵數據核對
* **Morningstar Globes:** [1-5]
* **MSCI ESG Rating:** [CCC-AAA]
* **SFDR:** [Article 6/8/9]
* **Carbon Intensity:** [Value] vs Benchmark

### 4. 指標小結
`;
