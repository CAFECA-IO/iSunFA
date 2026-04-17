export const COST_STRUCTURE_PROMPT = `
任務：分析【{Target_Company}】在 {Period} (Year: {Year}) 的損益表「成本與費用結構」。
{Data_Source_Instruction}
1. 營業成本 (COGS) 變動是否與營收變動幅度相符？是否存在原物料上漲或內部製造成本增加的壓力？
2. 「細項成本糾察隊」：利用日記帳與細項優勢，請嚴格抓出「哪個科目的費用這個月突然暴增」。例如：交際費是否異常過高？行銷費是否激增但未能帶來對應營收？
3. 內部資料顯示是否具備營業槓桿 (Operating Leverage) 規模經濟效益？即營收成長的同時，費用率逐漸下降？
請以專業的財報分析師口吻撰寫，提供具體的數據佐證，並給出短評。
`.trim();
