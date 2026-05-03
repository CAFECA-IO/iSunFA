export const SOLVENCY_PROMPT = `
任務：分析【{Target_Company}】在 {Period} (Year: {Year}) 的資產負債表「長期償債能力與資本結構」。
{Data_Source_Instruction}
1. 根據當期數據計算負債比率 (Debt Ratio) 與權益乘數 (Equity Multiplier)。
2. 檢視負債結構中，長短期有息負債的佔比，評估整體的財務槓桿風險是否過高。
3. 嚴禁捏造變化趨勢，請專注陳述「當下負債規模是否健康」與「自有資本是否充足」。
請以專業的簽證會計師口吻撰寫，提供具體的 JSON 數據佐證，並給出客觀短評。
`.trim();
