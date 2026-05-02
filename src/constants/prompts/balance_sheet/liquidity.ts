export const LIQUIDITY_PROMPT = `
任務：分析【{Target_Company}】在 {Period} (Year: {Year}) 的資產負債表「流動性與短期償債能力」。
{Data_Source_Instruction}
1. 根據當期數據計算流動比率 (Current Ratio) 與速動比率 (Quick Ratio)。
2. 評估當期營運資金 (Working Capital) 與現金部位是否充足？能否覆蓋一年內的流動負債？
3. 嚴禁猜測前期變化趨勢，僅就「當下的流動性水位是否安全」進行事實分析。
請以專業的簽證會計師口吻撰寫，提供具體的 JSON 數據佐證，並給出客觀短評。
`.trim();
