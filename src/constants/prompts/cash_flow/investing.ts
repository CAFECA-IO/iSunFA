export const INVESTING_PROMPT = `
任務：分析【{Target_Company}】在 {Period} (Year: {Year}) 的現金流量表「投資活動現金流」。
{Data_Source_Instruction}
1. 資本支出 (Capital Expenditures, CapEx) 的規模與趨勢，公司是否處於擴張期？
2. 自由現金流 (Free Cash Flow, FCF) 的健康度，營業現金流是否足以涵蓋資本支出？
3. 其他重大投資活動 (如併購、處分資產或金融商品投資) 對現金流的影響。
請以專業的財報分析師口吻撰寫，提供具體的數據佐證，並給出短評。
`.trim();
