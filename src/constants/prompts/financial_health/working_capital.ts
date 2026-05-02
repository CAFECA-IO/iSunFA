export const WORKING_CAPITAL_PROMPT = `
任務：分析【{Target_Company}】在 {Period} (Year: {Year}) 的企業財務健康度「營運資金與流動性 (Working Capital & Liquidity)」。
{Data_Source_Instruction}
1. 檢視當期的流動比率 (Current Ratio) 與速動比率 (Quick Ratio)。
2. 現金部位與營運資金是否充足？這對公司的短期償債能力產生了什麼實質壓力或優勢？
3. 【健康度評分矩陣 (Rubric) 與強制計分法 (Chain of Thought)】：
基礎分：50 分。請依據「當期真實數據」計算加減分（若無前期資料，絕對禁止腦補 YoY 趨勢）：
- 加分條件：
  - 流動比率 (Current Ratio) 大於 150% (+10 分)；大於 200% (+15 分)。
  - 當期營業活動現金淨流入為正，且大於稅後淨利 (代表盈餘品質極佳，賺的錢都有收成現金) (+15 分)。
- 扣分/紅旗條件 (嚴厲打擊黑字破產風險)：
  - 流動比率低於 100% (短期資產無法覆蓋短期負債)，扣 15 分。
  - 致命紅旗：稅後淨利為正，但「營業活動現金流量」為負 (賺帳面數字，實質現金流血)，重罰扣 30 分。
請強制將計分過程與理由包覆在 <scoring_thought_process> 標籤內 (例如: <scoring_thought_process>50 (基礎) + 15 (營業現金流為正) = 65 分</scoring_thought_process>)。然後在標籤外正式給出最終單項【健康度評分 (1-100分)】與短評。
請以專業的簽證會計師口吻撰寫，提供具體的 JSON 數據佐證，並給出客觀短評。
`.trim();
