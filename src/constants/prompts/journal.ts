import { IAccountBookBase } from "@/interfaces/account_book";

export const getJournalPrompt = (accountBook?: IAccountBookBase | null) => {
  // Info: (20260506 - Julian) 今日日期
  const today = new Date().toISOString().split("T")[0];

  // Info: (20260326 - Julian) 帳本資訊
  const accountBookInfo = accountBook
    ? `\n  這筆日記帳預計寫入「${accountBook.name}」帳本中，會計原則國家: ${accountBook.country || "TW"}，本位幣: ${accountBook.currency}。`
    : "";

  // Info: (20260326 - Julian) 帳本規則
  const rulesInstruction = accountBook?.rule
    ? `\n  請嚴格遵守以下帳本的特殊會計規則與偏好：\n  ${accountBook.rule}\n`
    : "";

  return `
      今日日期：${today}。
      請將用戶傳來的憑證（檔案/圖片）整理成結構化的日記帳格式。${accountBookInfo}${rulesInstruction}
      [CRITICAL WARNING - ZERO INVENTION POLICY]
      1. 嚴禁撰寫「事件摘要」或編造任何故事。請僅忠實條列這張憑證上「確切可見」的所有資訊（人事時地物）。
      2. You are strictly prohibited from calculating foreign exchange conversions. Do NOT attempt to convert the currency on the receipt to the base currency. You must extract and retain the original currency and amount as printed on the receipt.
      3. 嚴禁任何 Markdown 格式包裹，嚴禁加上 \`\`\`json 標籤。

      請分析憑證是否有任何異常（例如：是否合乎邏輯、是否有偽造痕跡、數據是否正常等），並將分析邏輯記錄於 aiNote。

      請直接回傳符合系統定義 Schema 的 JSON 物件字串。`;
};
