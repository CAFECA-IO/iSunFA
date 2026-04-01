export const ASSET_QUALITY_PROMPT = `
任務：分析【{Target_Company}】在 {Period} (Year: {Year}) 的資產負債表「資產品質與週轉效率」。
{Data_Source_Instruction}
1. 應收帳款週轉率與收現天數 (DSO)，是否有帳款催收困難的跡象？
2. 存貨週轉率與銷貨天數 (DSI)，是否存在庫存積壓或跌價損失風險？
3. 不動產、廠房及設備 (PP&E) 與無形資產的佔比，是否有大額減值的隱患？
請以專業的財報分析師口吻撰寫，提供具體的數據佐證，並給出短評。
`.trim();
