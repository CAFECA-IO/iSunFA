export const VOUCHER_PROMPT = `
  請將用戶上傳的憑證（檔案/圖片）解析出可以寫入會計傳票的資料。
  請務必回傳一個 JSON 格式，包含以下欄位（不要加入任何額外的文字，也不要包裝在 markdown 程式碼區塊中，直接回傳 JSON 字串）：
  {
    "tradingDate": "YYYY-MM-DD", // 交易日期
    "tradingType": "INCOME" | "OUTCOME" | "TRANSFER", // 收入、支出或轉帳
    "note": "string", // 備註摘要
    "lines": [ // 會計分錄，必須剛好平衡（借方總和 = 貸方總和）或至少提供合理的拆解
      {
        "accountingCode": "string", // 會計科目代碼 (盡量對應常見的會計代碼，例如：現金 1101)
        "particular": "string", // 分錄摘要
        "amount": 100, // 金額 (數字)
        "isDebit": true // 是否為借方 (true = 借方, false = 貸方)
      }
    ]
  }
`;
