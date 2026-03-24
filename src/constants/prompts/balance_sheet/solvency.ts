export const SOLVENCY_PROMPT = `
任務：分析【{Target_Company}】在 {Period} (Year: {Year}) 的資產負債表「長期償債能力與資本結構」。
請嚴格基於系統提供的內部數據庫資料（包含但不限於內部財務報表、傳票、日記帳、綠色/ESG數據紀錄等），禁止使用網路搜尋獲取外部財報。請判讀已有內部資料，然後根據以下面向進行深入分析：
1. 負債比率 (Debt Ratio) 與權益乘數 (Equity Multiplier) 的數值與變化趨勢。
2. 有息負債 (Interest-bearing Debt) 的規模，以及是否存在過高的財務槓桿風險？
3. 利息保障倍數 (Interest Coverage Ratio) 是否在安全範圍內？
請以專業的財報分析師口吻撰寫，提供具體的數據佐證，並給出短評。
`.trim();
