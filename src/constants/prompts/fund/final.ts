export const FUND = `
Task: Synthesize the 8 dimension reports into a Final Fund Review Report.
Instruction:
1. **Competitor Comparison**: Summarize the "Peer Comparison" insights from MMP.
2. **Data Review**: Highlight any data discrepancies found in GDI.
3. **Auto-Labeling**: Display the suggested tags from GES.
4. **Verdict**: Provide a clear "Buy/Sell/Hold" recommendation for a Fund Selector/PM.

Output Language: Same as input.

Structure:

# 🏆 [Fund Name] - IRSC Product Review Analysis

## 🎯 Executive Summary (Review Agent)
* **Current Price:** [Price] [Currency] (Date: [Date])
* **Target Price (1Y):** [target Price] ([Upside/Downside]%)
* **Total Score:** [Average of 8 Dimensions] / 100
* **Rating:** (S: 80+, A: 70-79, B: 60-69, C: <60)
* **Verdict:** (Strong Buy / Buy / Hold / Sell / Avoid)
* **One-Line Thesis:** [Key reason for the rating]
* **Core components:** [Brief description of the fund's core components]

## 🏷️ AI Auto-Labeling (Labeling Agent)
* **Asset Class:** [Tag]
* **Style:** [Tag]
* **Theme:** [Tag]
* **Risk Profile:** [Tag]
* **Key Fit:** [Why this fits the current market trend]

## ⚔️ Competitor Analysis (Comparison Agent)
* **Rank in Category:** [e.g., Top 10%]
* **Performance vs Peer:** [Better/Worse]
* **Cost vs Peer:** [Cheaper/Expensive]
* **Key Differentiator:** [Unique selling point]

## 📊 Dimension Breakdown
1. **ECQ (Performance):** [Score] - [Sharpe/Alpha check]
2. **MMP (Peers):** [Score] - [Moat vs Competitors]
3. **UEE (Cost):** [Score] - [Expense analysis]
4. **GDI (Governance):** [Score] - [Data verification status]
5. **TPM (Trend):** [Score] - [Theme alignment]
6. **SRR (ESG):** [Score] - [Sustainability rating]
7. **ERE (Risk):** [Score] - [Drawdown resilience]
8. **GES (Growth):** [Score] - [Asset flows & Labeling]

## 💡 Key Strengths (3-5 Points)
* [Strength 1]
* [Strength 2]

## ⚠️ Key Risks (3-5 Points)
* [Risk 1]
* [Risk 2]

## 📝 Data Integrity Check (Review Agent)
* **Prospectus vs Data:** [Consistent / Discrepancies found]
* **Red Flags:** [Any severe governance or data issues]

---
**Disclaimer:** This report is AI-generated for informational purposes only (IRSC-Analyst v1.0.0). Not financial advice.

# Input Data for Analysis:

## 1. ECQ Report
[ECQ_CONTENT]

## 2. MMP Report
[MMP_CONTENT]

## 3. UEE Report
[UEE_CONTENT]

## 4. GDI Report
[GDI_CONTENT]

## 5. TPM Report
[TPM_CONTENT]

## 6. SRR Report
[SRR_CONTENT]

## 7. ERE Report
[ERE_CONTENT]

## 8. GES Report
[GES_CONTENT]
  `;
