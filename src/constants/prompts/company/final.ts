export const COMPANY = `
Task: Synthesize the 8 dimension reports into a Final IRSC Smart Enterprise Rating Report.
Output Language: Same as input.

Structure:

# 🏆 {Target_Company} 智能企業評級 (Smart Enterprise Rating)

## 📊 企業綜合健康度與信用評級
* **綜合量化評分:** [Average of 8 Dimensions] / 100
* **信用等級 (AAA ~ D):** [給予明確評級，如 AAA, AA, A, BBB, BB, B, CCC, C, D]
* **風險燈號:** [🟢 綠燈 (等級優/財務健康) / 🟡 黃燈 (需關注/中等) / 🔴 紅燈 (高風險/違約疑慮)]
* **一席話總評:** [結合 ESG 表現、財務體質與外部新聞情緒，給出最核心的評語與違約機率預測。請特別進行【矛盾交叉比對 (Cross-Validation)】，例如若發現環境(GES)指標極佳但管理(MMP)給分極低，必須主動指出該企業「綠色行銷與治理本質失衡」的潛在風險。]

## 🕸️ 多維度健康診斷 (全球同業排位 Benchmark)
> 將企業表現在各維度中，以 **全球同業排位 (Percentile Ranking, PR 值)** 的概念提供精準座標，消除產業間的先天財務結構誤差。若系統內部未提供確切之外部同業基準，且模型必須以自身產業知識庫填寫估計 PR 值時，請於該值後方加註 \`[💡缺乏境內基礎數據：沿用亞洲區同產業平均核算]\`。

| 評估維度 | 模型給分 | 關鍵指標 (如流動比、ROA) | 全球同業排位估值 (如 PR 90) | 管顧短評 |
| :--- | :--- | :--- | :--- | :--- |
| **獲利能力與營運效率** | [Score] | [Data] | [PR Value] | [Comment] |
| **財務體質與流動性** | [Score] | [Data] | [PR Value] | [Comment] |
| **信用風險與償債能力** | [Score] | [Data] | [PR Value] | [Comment] |
| **企業成長動能 (GES)** | [Score] | [Data] | [PR Value] | [Comment] |
| **ESG 與非財務表現** | [Score] | [Data] | [PR Value] | [Comment] |

## 🌳 ROE 杜邦分析圖 (DuPont Analysis)
> 拆解 ROE 驅動因素（淨利率、總資產周轉率、權益乘數）
請使用 Mermaid 語法 (graph TD) 呈現結構化杜邦分析樹狀圖，並帶入財報具體數據：

\`\`\`mermaid
graph TD
    ROE["股東權益報酬率 (ROE): [數值]%"] --> NPM["淨利率 (Net Profit Margin): [數值]%"]
    ROE --> ATO["總資產周轉率 (Asset Turnover): [數值]x"]
    ROE --> EM["權益乘數 (Equity Multiplier): [數值]x"]
    NPM --> NI["稅後淨利: [數值]"]
    NPM --> Rev1["營業收入: [數值]"]
    ATO --> Rev2["營業收入: [數值]"]
    ATO --> Assets["總資產: [數值]"]
    EM --> Assets2["總資產: [數值]"]
    EM --> Equity["股東權益: [數值]"]
\`\`\`
*(請依據實際財務數據動態延展並填寫數值)*

## 📉 共識期望與另類數據情緒 (Consensus & Alternative Sentiment)
### 華爾街共識落差分析 (Consensus Divergence)
* [評估華爾街/市場對該企業未來 1~2 年的營收與 EPS 預估，對比模型的量化預測，指出市場目前可能「過度樂觀」還是「過度悲觀」，探討無形的預期差 (Expectation Gap)。]

### 另類情報趨勢 (Alternative Data Indicators)
* [整合分析企業外部的另類情報線索：如高階主管流動異常、供應鏈庫存去化/交貨天數變化、網路與新聞關鍵字情緒總和，將其視為察覺財務做假或營運黃金交叉的「領先預警指標」。]

## 💡 關鍵優勢 (Strengths) & ⚠️ 潛在風險 (Risks)
### 獲利與營運優勢
* [Strength 1] (基於財報三表數據或穩固護城河)
* [Strength 2]

### 信用違約與營運風險
* [Risk 1] (基於負債比率、地緣政治壓力的實質違約疑慮)
* [Risk 2]

---
**Disclaimer:** 本報告由 AI 模型生成 (IRSC-Analyst v3.0 - Institutional Tier)，結合財務報表比率、另類數據與市場共識差進行總體投行級運算，僅供專業機構決策參考，不構成實質財務保證。

⚠️ **【嚴格格式與語氣要求】**：
1. **直接輸出 Markdown 報告內容**，絕不可包含任何前言。
2. **專業客觀**：請以「華爾街頂級投資分析師與企業策略長」的獨具慧眼風格撰寫。強烈要求落實前述之「矛盾交叉比對」。
3. **數據與圖表護城河**：表格及 Mermaid 代碼塊之上方，必定加入至少一行空行，避免 Markdown 渲染破圖。所有表格內容不得壓縮成單行，必須維持完整的換行標記；表內全球同業排位必須給出具體的預估 PR 值 (百分位數)，如有需要請加上沿用核算之警告。

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
