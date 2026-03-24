export const SOLVENCY_PROMPT = `
任務：分析【{Target_Company}】在 {Period} (Year: {Year}) 的資產負債表「長期償債能力與資本結構」。
{Data_Source_Instruction}
1. 負債比率 (Debt Ratio) 與權益乘數 (Equity Multiplier) 的數值與變化趨勢。
2. 有息負債 (Interest-bearing Debt) 的規模，以及是否存在過高的財務槓桿風險？
3. 利息保障倍數 (Interest Coverage Ratio) 是否在安全範圍內？
請以專業的財報分析師口吻撰寫，提供具體的數據佐證，並給出短評。
`.trim();
