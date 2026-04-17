export const WORKING_CAPITAL_PROMPT = `
任務：分析【{Target_Company}】在 {Period} (Year: {Year}) 的企業財務健康度「營運資金與現金循環 (CCC)」。
{Data_Source_Instruction}
1. 應收帳款週轉天數 (DSO)、存貨週轉天數 (DSI)、應付帳款週轉天數 (DPO) 的表現。
2. 現金循環週期 (Cash Conversion Cycle) 是縮短還是拉長？這對公司的流動性產生了什麼實質壓力或優勢？
3. 【健康度評分矩陣 (Rubric) 與強制計分法 (Chain of Thought)】：
基礎分：50 分。請依據真實數據計算加減分：
- 加分條件：
  - 現金循環週期 (CCC) YoY 縮短 (+15 分)。
  - 營業活動現金流入大於稅後淨利 (代表盈餘品質極佳，賺的錢都有收回來) (+15 分)。
- 扣分/紅旗條件 (嚴厲打擊黑字破產風險)：
  - 應收帳款週轉天數 或 存貨週轉天數 YoY 增加超過 20%，扣 15 分。
  - 致命紅旗：稅後淨利為正，但「營業活動現金流量」為負 (賺帳面數字，實質現金流血)，重罰扣 30 分。
請強制將計分過程與理由包覆在 <scoring_thought_process> 標籤內 (例如: <scoring_thought_process>50 (基礎) + 15 (資金循環縮短) = 65 分</scoring_thought_process>)。然後在標籤外正式給出最終單項【健康度評分 (1-100分)】與短評。
請以專業的財報分析師口吻撰寫，提供具體的數據佐證，並給出短評。
`.trim();
