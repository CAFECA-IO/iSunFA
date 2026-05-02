export const OPERATING_PROMPT = `
任務：分析【{Target_Company}】在 {Period} (Year: {Year}) 的現金流量表「營業活動現金流」。
{Data_Source_Instruction}
1. 檢視當期營業活動淨現金流入 (Net Cash from Operating Activities) 的絕對數值。
2. 比較當期營業現金淨流入與當期稅後淨利 (Net Income) 的差異，評估當期的盈餘品質 (Earnings Quality)。
3. 嚴禁進行無根據的「資金斷裂」或「存活期 (Runway)」預測。請完全基於當期揭露的現金流入/流出結構進行客觀陳述。
請以專業的簽證會計師口吻撰寫，提供具體的 JSON 數據佐證，並給出客觀短評。
`.trim();
