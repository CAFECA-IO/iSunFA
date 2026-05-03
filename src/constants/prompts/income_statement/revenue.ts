export const REVENUE_PROMPT = `
任務：分析【{Target_Company}】在 {Period} (Year: {Year}) 的損益表「營收結構與本業佔比」。
{Data_Source_Instruction}
1. 依據當期損益表，拆解營業收入 (Operating Revenue) 與業外收入 (Non-Operating Revenue) 的比例結構。
2. 評估當期營收的集中度：公司是否過度依賴非核心業務收入？
3. 嚴禁對未揭露的「前期 YoY/QoQ 數據」進行猜測或捏造，請完全基於當期（Current Period）的絕對數值與比例進行事實陳述。
請以專業的簽證會計師口吻撰寫，提供具體的 JSON 數據佐證，並給出客觀短評。
`.trim();
