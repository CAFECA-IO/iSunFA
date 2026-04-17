export const OPERATING_PROMPT = `
任務：分析【{Target_Company}】在 {Period} (Year: {Year}) 的現金流量表「營業活動現金流」。
{Data_Source_Instruction}
1. 營業活動淨現金流入 (Net Cash from Operating Activities) 與淨利 (Net Income) 的比較，盈餘含金量如何？
2. 營運資金變動對現金流的影響 (應收帳款與存貨的增減)。
3. 建構「現金燃燒率 (Cash Burn Rate)」與「存活期 (Runway)」指標：若每個月都在虧損現金，請根據目前的現金儲備量推估並警告：「以當前燃燒率，公司幾個月後會面臨資金斷裂」。
請以專業的財報分析師口吻撰寫，提供具體的數據佐證，並給出短評。
`.trim();
