import { AccountBook } from "@/generated/client";
import { ICoefficient } from "@/interfaces/coefficient";
import { ESG_EMISSION_FACTORS_TEXT } from "@/constants/esg_emission_factors";

export const getEsgPrompt = (accountBook?: Partial<AccountBook> | null, coefficients?: Partial<ICoefficient>[]) => {
  const accountBookInfo = accountBook
    ? `\n  這筆碳盤查紀錄是為了「${accountBook.name}」所分析，請根據該企業情境與所在地（${accountBook.country || "TW"}）進行溫室氣體範疇的判斷。`
    : "";

  const rulesInstruction = accountBook?.rule
    ? `\n  請嚴格遵守以下帳本關於碳排或會計核算的特殊規則與偏好：\n  ${accountBook.rule}\n`
    : "";

    const coefficientsInstruction = coefficients && coefficients.length > 0 ?
    `\n  請從以下係數中，選擇最符合的係數，並填入 「coefficient」 欄位，並在 「emissions」 中，根據以下標準來計算碳排放量：
  1. 活動數據 (Activity Data)：用戶提供的數據（如：用電度數、天然氣用量等）。
  2. 排放係數 (Emission Factor)：用戶提供的係數（如：每度電的碳排放量）。
  3. 碳排放量 (Emissions)：活動數據 × 排放係數。
  如果沒有找到最符合的係數，請填入 null，並在 「emissions」 中填入 0：\n  ${coefficients.map((c) => {
      return{
        id: c.id,
        name: c.name,
        description: c.description,
        formula: `${c.unit} * ${c.emissionFactor}`
      }
    }).join(", ")}\n`
    : "";
    
  return `
  請將用戶上傳的憑證（檔案/圖片）解析出碳盤查（Carbon Footprint Verification）相關資訊。${accountBookInfo}${rulesInstruction}
  
  ${coefficientsInstruction}

  【溫室氣體排放係數參考資料】
  請一定要參考以下環境部公告的溫室氣體排放係數表來核對計算公式與數據：
  ${ESG_EMISSION_FACTORS_TEXT}

  請在「dqiScore」中，根據以下標準來計算數據品質分數（數字 1-5，1 為最優，5 為最差)：
  1. 技術相關性 (Te)：數據是否真實反映了產品所使用的技術、設備或製程。優質標準：數據來自實際生產線的特定技術（如：使用特定品牌、型號的電爐數據，而非產業平均值）。
  2. 地理相關性 (Ge)：數據的地理位置是否與排放源位置相符。優質標準：數據來自排放源所在地的特定地理位置（如：使用特定國家、地區的排放係數，而非全球平均值）。
  3. 時間相關性 (Ti)： 數據的時效性。優質標準：採用近 1–3 年內產生的數據。如果使用的是 10 年前的係數，評分會非常低。
  4. 數據完整性 (Co)：數據是否涵蓋了所有的碳排放來源。優質標準：數據包含所有必要的欄位（如：活動類型、排放量、排放係數等）。
  5. 數據可靠性 (Re)：數據來源是否可靠。優質標準：數據來源為政府機構、學術研究或國際組織等權威機構。
  請用以上五個分數，計算出平均 DQI 分數，並填入 dqiScore 欄位。

  並請在 aiNote 欄位寫下 AI 分析碳盤查的邏輯，不需要任何標題，直接寫下分析邏輯或列點描述即可。 
  請務必回傳一個 JSON 格式，包含以下欄位（不要加入任何額外的文字，也不要包裝在 markdown 程式碼區塊中，直接回傳 JSON 字串）：
  {
      "tradingDate": "YYYY-MM-DD", // 交易日期 
      "scope": "SCOPE_1", // 溫室氣體範疇 ("SCOPE_1" | "SCOPE_2" | "SCOPE_3")
      "activityType": "電力使用", // 活動類型
      "vendor": "心心小舖", // 供應商
      "amount": 2.01, // 活動數據 (數字)
      "unit": "度", // 單位
      "emissions": 123.45, // 排放量 (數字，單位為 kgCO2e)
      "intensity": "HIGH", // 排放強度 ("HIGH" | "MEDIUM" | "LOW")
      "dqiScore": 1.2, // 數據品質分數 (數字 1-5)
      "confidence": 85, // AI 分析的整體信心度 (數字 0-100)
      "coefficientId": "string", // 使用係數之 ID
      "aiNote": "string" // AI 分析的備註
  }
`;
};