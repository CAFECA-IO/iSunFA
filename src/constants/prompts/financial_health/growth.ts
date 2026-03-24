export const GROWTH_PROMPT = `
任務：分析【{Target_Company}】在 {Period} (Year: {Year}) 的企業財務健康度「成長性指標 (Growth Metrics)」。
{Data_Source_Instruction}
1. 營業收入增長率、營業利益增長率、淨利增長率的長期與短期趨勢。
2. 成長的源頭：是本業銷量擴張（核心成長），還是因為業外一次性收益或併購貢獻？
請以專業的財報分析師口吻撰寫，提供具體的數據佐證，並給出短評。
`.trim();
