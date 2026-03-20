export const ESG_PROMPT = `
  請將用戶上傳的憑證（檔案/圖片）解析出碳盤查（Carbon Footprint Verification）相關資訊。
  請務必回傳一個 JSON 格式，包含以下欄位（不要加入任何額外的文字，也不要包裝在 markdown 程式碼區塊中，直接回傳 JSON 字串）：
  {
      dateTimestamp: 1700000000; // 交易日期，unix timestamp 格式，以「秒」為單位
      scope: "SCOPE_1" | "SCOPE_2" | "SCOPE_3"; // 溫室氣體範疇
      activityType: "電力使用"; // 活動類型
      vendor: "心心小舖"; // 供應商
      rawActivityData: "123456789"; // 原始活動數據
      unit: "度"; // 單位
      emissions: "123456789"; // 排放量
      intensity: "HIGH" | "MEDIUM" | "LOW"; // 排放強度
      confidence: 85; // AI 分析的信心度 (數字)
  }
  若無法解析，請回傳 null
`;
