export const PROFITABILITY_PROMPT = `
任務：分析【{Target_Company}】在 {Period} (Year: {Year}) 的損益表「獲利能力與三率表現」。
{Data_Source_Instruction}
1. 毛利率 (Gross Margin)、營業利益率 (Operating Margin) 與淨利率 (Net Profit Margin) 的具體數值與變化趨勢。
2. 同業基準對比分析：毛利率等指標請積極引用外部數據進行「同業對比」(如：你的毛利15%，但同業平均25%)。並視情況加註 \`[💡外部基準推估]\`。
3. 獲利品質檢視：三率是「三率三升」還是下降？業外收入佔比是否過高，本業獲利是否扎實？
請以專業的財報分析師口吻撰寫，提供具體的數據佐證，並給出短評。
`.trim();
