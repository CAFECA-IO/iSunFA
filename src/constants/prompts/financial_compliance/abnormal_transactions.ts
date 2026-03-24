export const ABNORMAL_TRANSACTIONS_PROMPT = `
任務：分析【{Target_Company}】在 {Period} (Year: {Year}) 的財務合規與異常檢測「異常交易與資產變動檢測」。
{Data_Source_Instruction}
1. 關係人交易：內部資料是否顯示過多非營業常規的關係人進銷貨或資金往來？
2. 重大資產處分與取得：是否有異常在期末發生的大額資產處置，用以美化財報？
3. 其他應收款/預付款：此類非核心營業項目的金額是否異常膨脹？
請以專業的財報查核員口吻撰寫，提供具體的數據佐證，並給出短評。
`.trim();
