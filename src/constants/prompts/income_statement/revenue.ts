export const REVENUE_PROMPT = `
任務：分析【{Target_Company}】在 {Period} (Year: {Year}) 的損益表「營收趨勢與成長性」。
{Data_Source_Instruction}
1. 營業收入 (Revenue) 的成長規模與年增率 (YoY)、季增率 (QoQ)。
2. 若有產品線或地區營收分佈資訊，請分析主要成長動能來自何處？
3. 營收表現是否受到季節性因素或內部營運環境影響？
請以專業的財報分析師口吻撰寫，提供具體的數據佐證，並給出短評。
`.trim();
