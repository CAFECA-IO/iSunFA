export const FUND = `
Task: Try to find information about the fund and execute the [GDI] Governance & Data Verification audit.

Objective:
1. Audit based on "IRSC-GDI Advanced Edition (Fund Focus)".
2. Search for **Prospectus**, **Auditor Reports**, and **Regulatory Filings**.
3. Verify **Data Consistency** and **Stewardship**.
4. Calculate the score.

Scoring Algorithm:
Base Score: 50
True (Pass): +0.5
False (Fail): -0.5
N/A (No Data): 0
Range: 0 to 100

Checklist (IRSC-GDI Fund Focus)
## I. 治理結構與合規 (Governance & Compliance)
1. 審計機構: Is the fund audited by a "Big 4" accounting firm (PwC, Deloitte, EY, KPMG)?
2. 保管銀行: Is the Custodian a Global Systemically Important Bank (G-SIB)?
3. 獨立董事: Does the Fund Board have a majority of Independent Directors?
4. 監管紀錄: Is the fund/manager free from SEC/FCA regulatory fines in the last 3 years?
5. 註冊地: Is the fund domiciled in a well-regulated jurisdiction (e.g., Luxembourg UCITS, Ireland, US 40 Act)?
6. 利益衝突: Is there a clear policy managing conflicts between the manager and fund shareholders?
7. 關聯交易: Are transactions with affiliates (e.g., trading desk) disclosed and fair?
8. 費用揭露: Are all fees (including hidden costs like 12b-1) clearly disclosed?
9. 估值政策: Is there an independent valuation committee for hard-to-value assets?
10. 流動性管理: Is there a Liquidity Risk Management Program in place (Swing Pricing support)?

## II. 數據一致性與透明度 (Data Consistency & Transparency) - "Data Review Agent"
11. 公開說明書對齊: Does the 3rd party data (Bloomberg/Morningstar) match the official Prospectus (Investment Objective)?
12. 持股揭露: Is the full portfolio holding list published at least quarterly?
13. 基準一致性: Is the benchmark used for reporting appropriate for the strategy (not "Gaming the benchmark")?
14. 風險揭露: Are key risks (e.g., EM risk, Derivatives) clearly flagged in the KIID/Factsheet?
15. 績效歸因: Does the manager provide attribution analysis explaining sources of return?
16. 經理人異動: Are manager changes announced promptly with clear succession context?
17. 錯誤修正: Has the fund successfully avoided any "NAV Correction" events (Pricing Errors) recently?
18. 網站資訊: Is the official website data up-to-date (daily NAV, monthly factsheet)?
19. 股東報告: Are Annual Reports comprehensive and reader-friendly?
20. 數據完整性: Are historical NAVs available without gaps since inception?

## III. 盡職治理 (Stewardship)
21. 投票政策: Does the fund have a clear Proxy Voting Policy?
22. 投票紀錄: Does the fund publish its voting record annually?
23. 積極參與: Does the manager engage with portfolio companies on ESG/Strategy issues?
24. 首簽署人: Is the manager a signatory of the UN PRI (Principles for Responsible Investment)?
25. 盡職治理守則: Is the manager a signatory of the local Stewardship Code (e.g., UK Stewardship Code)?
26. 氣候承諾: Has the manager made Net Zero commitments?
27. 爭議排除: Does the fund strictly enforce its exclusion list (e.g., no Tobacco/Weapons)?
28. 軟性美元: Does the manager limit the use of "Soft Dollars" (paying for research with commissions)?
29. 個資保護: Is there a robust data privacy policy for investor data?
30. 網路安全: Has the firm avoided major cybersecurity breaches?

Response Template:
# 🏛️ [Fund Name] - 治理與數據核對 (GDI)
**資料來源: ** Prospectus, Annual Report

### 1. 詳細評分清單
(List items)
* **[簡短指標文字]:** [分析細節] **符合/不符/無數據** **分數**

### 2. 最終得分計算
* **起始基準分 (Base):** 50
* **符合 (+0.5):** [Count_True]
* **不符 (-0.5):** [Count_False]
* **無數據 (0):** [Count_NA]

# 🏛️ 總分: [Calculated_Score] / 100

### 3. 關鍵數據核對
* **Auditor:** [Firm Name]
* **Custodian:** [Bank Name]
* **Domicile:** [Country]
* **UN PRI Signatory:** [Yes/No]

### 4. 指標小結
`;
