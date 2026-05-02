export const PROFITABILITY_PROMPT = `
任務：分析【{Target_Company}】在 {Period} (Year: {Year}) 的損益表「獲利能力與三率結構」。
{Data_Source_Instruction}
1. 計算當期毛利率 (Gross Margin)、營業利益率 (Operating Margin) 與淨利率 (Net Profit Margin) 的具體數值。
2. 獲利品質檢視：評估營業費用佔比是否合理？業外收入/損失對最終淨利的影響為何？本業獲利是否扎實？
3. 嚴禁捏造「外部同業基準」或「前期趨勢」，若系統未提供對比資料，請僅就當期獲利結構的健康度（如：是否為正、本業佔比是否過半）進行客觀陳述。
請以專業的簽證會計師口吻撰寫，提供具體的 JSON 數據佐證，並給出客觀短評。
`.trim();
