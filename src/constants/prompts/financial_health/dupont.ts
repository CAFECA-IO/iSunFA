export const DUPONT_PROMPT = `
任務：分析【{Target_Company}】在 {Period} (Year: {Year}) 的企業財務健康度「杜邦分析 (DuPont Analysis)」。
{Data_Source_Instruction}
1. 將股東權益報酬率 (ROE) 拆解為三大要素：淨利率、總資產週轉率、權益乘數。
2. 評估驅動當期 ROE 的核心結構是什麼？是本業獲利能力良好、資產運用高效率，還是過度依賴舉債？
3. 【健康度評分矩陣 (Rubric) 與強制計分法 (Chain of Thought)】：
基礎分：50 分。請依據「當期真實數據」計算加減分（若無前期資料，絕對禁止腦補 YoY 趨勢）：
- 加分條件：
  - 當期淨利率 (Net Margin) 大於 10% (+10 分)；大於 20% (+20 分)。
  - 當期總資產週轉率 (Asset Turnover) 大於 1.0 (+10 分)。
- 扣分/紅旗條件 (嚴厲打擊過度槓桿與虧損)：
  - 若 ROE 主要由極高的權益乘數 (負債比 > 70%) 撐起，且淨利率偏低（代表靠借錢膨脹報酬率），重罰扣 20 分。
  - 當期淨利為負值 (ROE 為負)，直接扣 30 分。
請強制將計分過程與理由包覆在 <scoring_thought_process> 標籤內 (例如: <scoring_thought_process>50 (基礎) + 10 (淨利率大於10%) = 60 分</scoring_thought_process>)。然後在標籤外正式給出最終單項【健康度評分 (1-100分)】與短評。
請以專業的簽證會計師口吻撰寫，提供具體的 JSON 數據佐證，並給出客觀短評。
`.trim();
