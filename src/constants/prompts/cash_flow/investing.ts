export const INVESTING_PROMPT = `
任務：分析【{Target_Company}】在 {Period} (Year: {Year}) 的現金流量表「投資活動現金流」。
{Data_Source_Instruction}
1. 檢視當期資本支出 (Capital Expenditures, CapEx) 的絕對規模。
2. 計算當期自由現金流 (Free Cash Flow, FCF) (營業現金流減去資本支出)，並評估其是否為正。
3. 嚴禁揣測「公司是否處於長期擴張期」等缺乏跨年度數據支持的結論，請專注陳述當期的實質投資支出去向。
請以專業的簽證會計師口吻撰寫，提供具體的 JSON 數據佐證，並給出客觀短評。
`.trim();
