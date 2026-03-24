export const PROFITABILITY_PROMPT = `
任務：分析【{Target_Company}】在 {Period} (Year: {Year}) 的損益表「獲利能力與三率表現」。
{Data_Source_Instruction}
1. 毛利率 (Gross Margin)、營業利益率 (Operating Margin) 與淨利率 (Net Profit Margin) 的具體數值與變化趨勢。
2. 三率是呈現「三率三升」還是「三率三降」？或是出現分歧？
3. 獲利品質檢視：業外收入的佔比是否過高？本業獲利是否扎實？
請以專業的財報分析師口吻撰寫，提供具體的數據佐證，並給出短評。
`.trim();
