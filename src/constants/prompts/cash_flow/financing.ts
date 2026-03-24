export const FINANCING_PROMPT = `
任務：分析【{Target_Company}】在 {Period} (Year: {Year}) 的現金流量表「籌資活動現金流」。
{Data_Source_Instruction}
1. 債務融資狀況：借款與還款的淨流量，公司是正在舉債還是降槓桿？
2. 股權融資與分配：股票發行/回購，以及現金股利的發放情況。
3. 籌資政策是否合理？股利發放是否具備持續性？
請以專業的財報分析師口吻撰寫，提供具體的數據佐證，並給出短評。
`.trim();
