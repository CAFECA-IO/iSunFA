export const COST_STRUCTURE_PROMPT = `
任務：分析【{Target_Company}】在 {Period} (Year: {Year}) 的損益表「成本與費用結構」。
{Data_Source_Instruction}
1. 檢視當期營業成本 (COGS) 與營業費用 (OPEX) 佔總營業收入的比例。
2. 從損益表所揭露的科目中，找出佔比最重的成本或費用項目（如：推銷費用、管理費用），並陳述其對營業利益的侵蝕程度。
3. 嚴禁猜測未揭露的「原物料漲跌」、「單月暴增原因」或「規模經濟效益趨勢」。請將分析嚴格限制在當期 JSON 報表呈現的數字結構上。
請以專業的簽證會計師口吻撰寫，提供具體的 JSON 數據佐證，並給出客觀短評。
`.trim();
