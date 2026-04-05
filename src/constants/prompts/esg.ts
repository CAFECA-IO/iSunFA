import { AccountBook } from "@/generated/client";
import { ESG_EMISSION_FACTORS_TEXT } from "@/constants/esg_emission_factors";

export const getEsgPrompt = (accountBook?: Partial<AccountBook> | null) => {
  const accountBookInfo = accountBook
    ? `\n  這筆碳盤查紀錄是為了「${accountBook.name}」所分析，請根據該企業情境與所在地（${accountBook.country || "TW"}）進行溫室氣體範疇的判斷。`
    : "";

  const rulesInstruction = accountBook?.rule
    ? `\n  請嚴格遵守以下帳本關於碳排或會計核算的特殊規則與偏好：\n  ${accountBook.rule}\n`
    : "";

  return `
  請將用戶上傳的憑證（檔案/圖片）解析出碳盤查（Carbon Footprint Verification）相關資訊。${accountBookInfo}${rulesInstruction}
  
  【溫室氣體排放係數參考資料】
  請一定要參考以下環境部公告的溫室氣體排放係數表來核對計算公式與數據：
  ${ESG_EMISSION_FACTORS_TEXT}

  請務必在「coefficient」欄位中，確切填寫你套用的排放係數數值與單位（例如 "2.508 kgCO2e/度" 或 "0.123"）。
  請在「coefficientSource」欄位中，確切填寫你使用的係數資料來源（例如 "經濟部能源署發布" 或 "固定燃燒排放源排放係數"）。
  並請在 aiNote 欄位寫下 AI 分析碳盤查的邏輯，不需要任何標題，直接寫下分析邏輯或列點描述即可。
  請務必回傳一個 JSON 格式，包含以下欄位（不要加入任何額外的文字，也不要包裝在 markdown 程式碼區塊中，直接回傳 JSON 字串）：
  {
      "dateTimestamp": 1700000000, // 交易日期，unix timestamp 格式，以「秒」為單位
      "scope": "SCOPE_1", // 溫室氣體範疇 ("SCOPE_1" | "SCOPE_2" | "SCOPE_3")
      "activityType": "電力使用", // 活動類型
      "vendor": "心心小舖", // 供應商
      "rawActivityData": "123456789", // 原始活動數據 (字串)
      "unit": "度", // 單位
      "emissions": 123.45, // 排放量 (數字，單位為 kgCO2e)
      "coefficient": "2.508 kgCO2e/度", // 使用的碳排放係數標示 (字串)
      "coefficientSource": "環境部", // 使用的碳排放係數來源 (字串)
      "intensity": "HIGH", // 排放強度 ("HIGH" | "MEDIUM" | "LOW")
      "confidence": 85, // AI 分析的整體信心度 (數字 0-100)
      "aiNote": "string" // AI 分析的備註
  }
`;
};
