export const JOURNAL_PROMPT = `
      請將用戶傳來的憑證（檔案/圖片）整理成日記帳，盡可能包含所有細節，以純文字記錄。
      請務必回傳一個 JSON 格式，包含以下欄位（不要加入任何額外的文字，也不要包裝在 markdown 程式碼區塊中，直接回傳 JSON 字串）：
      {
            "tradingDate": "YYYY-MM-DD", // 交易日期
            "text": "string", // 日記帳內容
            "confidence": 85 // AI 分析的整體信心度 (數字 0-100)
      }
`;
