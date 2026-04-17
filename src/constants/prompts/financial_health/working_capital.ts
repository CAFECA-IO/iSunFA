export const WORKING_CAPITAL_PROMPT = `
任務：分析【{Target_Company}】在 {Period} (Year: {Year}) 的企業財務健康度「營運資金與現金循環 (CCC)」。
{Data_Source_Instruction}
1. 應收帳款週轉天數 (DSO)、存貨週轉天數 (DSI)、應付帳款週轉天數 (DPO) 的表現。
2. 現金循環週期 (Cash Conversion Cycle) 是縮短還是拉長？這對公司的流動性產生了什麼實質壓力或優勢？
3. 健康度評分草稿：請綜合現金流轉效率，給出單項【健康度評分 (1-100分)】(其中 50 分為產業均標，具備資金斷鏈風險低於 40，流轉極快高於 80)，附上理由。
請以專業的財報分析師口吻撰寫，提供具體的數據佐證，並給出短評。
`.trim();
