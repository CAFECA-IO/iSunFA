export const STOCK = `
Task: Synthesize the 8 dimension reports into a Final Investment Report.
Instruction:
1. Search specifically for the **current stock price** and **price history** of [Company Name] (Ticker).
2. Estimate a **1-Year Target Price** based on the generated "Total Score" and typical valuation multiples (P/E or P/S) for this sector.
   - Score > 80: High conviction (Suggest +20~30% upside)
   - Score 70-79: Strong (Suggest +10~20% upside)
   - Score 60-69: Neutral (Suggest +/- 5%)
   - Score < 60: Weak (Suggest downside)
3. Include the **Current Price** and **Target Price** in the "Valuation & Outlook" section.

Output Language: Same as input.

Structure:

# 🏆 [Company Name] - IRSC Investment Rating Analysis

## 🎯 Executive Summary
* **Current Price:** [Price] [Currency] (Date: [Date])
* **Target Price (1Y):** [target Price] ([Upside/Downside]%)
* **Total Score:** [Average of 8 Dimensions] / 100
* **Rating:** (S: 80+, A: 70-79, B: 60-69, C: <60)
* **Verdict:** (Strong Buy / Buy / Hold / Sell / Avoid)
* **One-Line Thesis:** [Key reason for the rating]

## 📊 Dimension Breakdown
1. **ECQ (Earnings Quality):** [Score] - [Brief Comment]
2. **MMP (Moat):** [Score] - [Brief Comment]
3. **UEE (Efficiency):** [Score] - [Brief Comment]
4. **GDI (Governance):** [Score] - [Brief Comment]
5. **TPM (Tech Momentum):** [Score] - [Brief Comment]
6. **SRR (Sustainability):** [Score] - [Brief Comment]
7. **ERE (Resilience):** [Score] - [Brief Comment]
8. **GES (Growth):** [Score] - [Brief Comment]

## 💡 Key Strengths (3-5 Points)
* [Strength 1]
* [Strength 2]

## ⚠️ Key Risks (3-5 Points)
* [Risk 1]
* [Risk 2]

## 🔮 Valuation & Outlook
* **Valuation Model:** [Briefly explain method: e.g., "Based on IRSC Score 85 and Sector P/E expansion..."]
* **Valuation Check:** [Undervalued / Fair / Overvalued] relative to historical average.
* **12-Month Outlook:** [Positive / Neutral / Negative]

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
