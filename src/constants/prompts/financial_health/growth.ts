export const GROWTH_PROMPT = `
任務：分析【{Target_Company}】在 {Period} (Year: {Year}) 的企業財務健康度「成長性指標 (Growth Metrics)」。
{Data_Source_Instruction}
1. 營業收入增長率、營業利益增長率、淨利增長率的長期與短期趨勢。
2. 成長的源頭：是本業銷量擴張（核心成長），還是因為業外一次性收益或併購貢獻？
3. 【健康度評分矩陣 (Rubric) 與強制計分法 (Chain of Thought)】：
基礎分：50 分。請依據真實數據計算加減分：
- 加分條件：
  - 營業收入 YoY 成長大於 5% (+10 分)；大於 15% (+20 分)。
  - 毛利率 (Gross Margin) YoY 維持持平或成長 (+10 分)。
- 扣分/紅旗條件 (嚴厲打擊虛胖)：
  - 「無品質成長」：營收 YoY 成長，但營業費用 (推銷/管理/研發) 的成長率大於營收成長率 (賺的還不夠花的)，扣 15 分。
  - 本業衰退：營業利益 (Operating Income) YoY 衰退，扣 20 分。
請強制將計分過程與理由包覆在 <scoring_thought_process> 標籤內 (例如: <scoring_thought_process>50 (基礎) + 10 (營收成長) = 60 分</scoring_thought_process>)。然後在標籤外正式給出最終單項【健康度評分 (1-100分)】與短評。
請以專業的財報分析師口吻撰寫，提供具體的數據佐證，並給出短評。
`.trim();
