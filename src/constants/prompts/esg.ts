export const ESG_PROMPT = `
  請將用戶上傳的憑證（檔案/圖片）解析出碳盤查（Carbon Footprint Verification）相關資訊。
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
      "intensity": "HIGH", // 排放強度 ("HIGH" | "MEDIUM" | "LOW")
      "confidence": 85, // AI 分析的整體信心度 (數字 0-100)
      "aiNote": "string", // AI 分析的備註
  }
`;
