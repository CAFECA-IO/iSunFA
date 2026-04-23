import { AccountBook } from "@/generated/client";

export const getJournalPrompt = (accountBook?: Partial<AccountBook> | null) => {
  // Info: (20260326 - Julian) 帳本資訊
  const accountBookInfo = accountBook
    ? `\n  這筆日記帳預計寫入「${accountBook.name}」帳本中，會計原則國家: ${accountBook.country || "TW"}，本位幣: ${accountBook.currency}。請將憑證上的幣值轉換為本位幣。`
    : "";

  // Info: (20260326 - Julian) 帳本規則
  const rulesInstruction = accountBook?.rule
    ? `\n  請嚴格遵守以下帳本的特殊會計規則與偏好：\n  ${accountBook.rule}\n`
    : "";

  return `
      請將用戶傳來的憑證（檔案/圖片）整理成日記帳，盡可能包含所有細節，以 Markdown 格式記錄。${accountBookInfo}${rulesInstruction}
      需求格式如下：
      # 事件摘要 - 用一段文字描述這份憑證背後代表「${accountBook?.name || "帳本公司"}」的企業活動，描述中盡可能包含人事時地物。
      # 憑證資訊 - 盡可能條列這張憑證提供的所有資訊。
      # 其他備註 - 這張憑證有什麼其他需要注意的地方，包含且不限於是否合乎邏輯、是否有偽造痕跡、是否合乎格式、數據是否正常、是否合乎市場行情，或任何其他備註。

      並請在 aiNote 欄位寫下 AI 分析的邏輯，不需要任何標題，直接寫下分析邏輯或列點描述即可。
      請務必回傳一個 JSON 格式，包含以下欄位（不要加入任何額外的文字，也不要包裝在 markdown 程式碼區塊中，直接回傳 JSON 字串）：
      {
        "tradingDate": "YYYY-MM-DD", // 交易日期
        "text": "string", // 日記帳內容 (Markdown 格式)
        "confidence": 85, // AI 分析的整體信心度 (數字 0-100)
        "aiNote": "string" // AI 分析的備註
      }
`;
};
