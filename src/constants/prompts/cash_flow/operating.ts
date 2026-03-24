export const OPERATING_PROMPT = `
任務：分析【{Target_Company}】在 {Period} (Year: {Year}) 的現金流量表「營業活動現金流」。
{Data_Source_Instruction}
1. 營業活動淨現金流入 (Net Cash from Operating Activities) 與淨利 (Net Income) 的比較，盈餘品質如何？
2. 營運資金變動對現金流的影響 (例如：應收帳款與存貨的增減)。
3. 本業核心獲利能力是否能確實轉換為現金？
請以專業的財報分析師口吻撰寫，提供具體的數據佐證，並給出短評。
`.trim();
