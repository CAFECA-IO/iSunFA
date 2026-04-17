export const DUPONT_PROMPT = `
任務：分析【{Target_Company}】在 {Period} (Year: {Year}) 的企業財務健康度「杜邦分析 (DuPont Analysis)」。
{Data_Source_Instruction}
1. 將股東權益報酬率 (ROE) 拆解為三大要素：淨利率、總資產週轉率、權益乘數。
2. 評估驅動 ROE 成長或衰退的核心因素是什麼？是本業獲利提升、資產運用變高效率，還是單純依賴舉債？
3. 【健康度評分矩陣 (Rubric) 與強制計分法 (Chain of Thought)】：
基礎分：50 分 (假設 ROE 維持與去年持平)。請依據真實數據計算加減分：
- 加分條件：
  - 淨利率 (Net Margin) YoY 上升 (+10 分)。
  - 總資產週轉率 (Asset Turnover) YoY 上升 (+10 分)。
- 扣分/紅旗條件 (嚴厲打擊過度槓桿)：
  - 若 ROE 上升純粹是因為權益乘數 (Equity Multiplier / 負債比) 飆高而來，淨利率與週轉率皆衰退（代表靠借錢膨脹報酬率），重罰扣 20 分。
  - ROE 為負值，直接降至 20 分以下 (扣 30+ 分)。
請強制將計分過程與理由包覆在 <scoring_thought_process> 標籤內 (例如: <scoring_thought_process>50 (基礎) + 10 (淨利率上升) = 60 分</scoring_thought_process>)。然後在標籤外正式給出最終單項【健康度評分 (1-100分)】與短評。
請以專業的財報分析師口吻撰寫，提供具體的數據佐證，並給出短評。
`.trim();
