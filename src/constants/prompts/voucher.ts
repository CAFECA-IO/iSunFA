import { ACCOUNTS } from "@/constants/accounts";
import { AccountBook } from "@/generated/client";

/*
** Info: (20260407 - Julian) 將傳票的分析拆解成「基本資料」和「會計分錄」
*/

//  Info: (20260407 - Julian) 分析傳票「基本資料」的 Prompt
export const getBaseVoucherPrompt = (accountBook?: Partial<AccountBook> | null) => {
  // Info: (20260326 - Julian) 會計科目代碼
  const country = accountBook?.country || "TW";

  // Info: (20260326 - Julian) 帳本資訊
  const accountBookInfo = accountBook
    ? `\n  這筆傳票預計寫入「${accountBook.name}」帳本中，會計原則國家: ${country}，本位幣: ${accountBook.currency}。請將傳票上的幣值轉換為本位幣。`
    : "";

  // Info: (20260326 - Julian) 帳本規則
  const rulesInstruction = accountBook?.rule
    ? `\n  請嚴格遵守以下帳本的特殊會計規則與偏好：\n  ${accountBook.rule}\n`
    : "";

  return `
  請將用戶上傳的憑證（檔案/圖片）解析出可以寫入會計傳票的資料。${accountBookInfo}${rulesInstruction}
  並請在 aiNote 欄位寫下 AI 分析傳票的邏輯，不需要任何標題，直接寫下分析邏輯或列點描述即可。
  請務必回傳一個 JSON 格式，包含以下欄位（不要加入任何額外的文字，也不要包裝在 markdown 程式碼區塊中，直接回傳 JSON 字串）：
  {
    "tradingDate": "YYYY-MM-DD", // 交易日期
    "tradingType": "INCOME" | "OUTCOME" | "TRANSFER", // 收入、支出或轉帳
    "note": "string", // 備註摘要
    "confidence": 85, // AI 分析的整體信心度 (數字 0-100)
    "aiNote": "string", // AI 分析的備註
  }
`;
};

//  Info: (20260407 - Julian) 分析傳票「會計分錄」的 Prompt
export const getVoucherLinesPrompt = (accountBook?: Partial<AccountBook> | null) => {
  // Info: (20260407 - Julian) 會計科目代碼
  const country = accountBook?.country || "TW";
  const accountsStr = JSON.stringify(
    ACCOUNTS[country as keyof typeof ACCOUNTS] || ACCOUNTS["TW"],
  );

  // Info: (20260407 - Julian) 帳本資訊
  const accountBookInfo = accountBook
    ? `\n  會計原則國家: ${country}，本位幣: ${accountBook.currency}。請將傳票上的幣值轉換為本位幣。`
    : "";

  // Info: (20260407 - Julian) 帳本規則
  const rulesInstruction = accountBook?.rule
    ? `\n  請嚴格遵守以下帳本的特殊會計規則與偏好：\n  ${accountBook.rule}\n`
    : "";

  return `
  請將用戶上傳的憑證（檔案/圖片）解析出會計分錄。${accountBookInfo}${rulesInstruction}
  並請在 aiNote 欄位寫下 AI 分析傳票的邏輯，不需要任何標題，直接寫下分析邏輯或列點描述即可。
  請務必回傳一個 JSON 格式，包含以下欄位（不要加入任何額外的文字，也不要包裝在 markdown 程式碼區塊中，直接回傳 JSON 字串）：
  {
    // 會計分錄，必須剛好平衡（借方總和 = 貸方總和）或至少提供合理的拆解
    "lines": [ 
      {
        "accountingCode": "string", // 會計科目代碼 (盡量對應常見的會計代碼，例如：現金 1101)
        "particular": "string", // 分錄摘要
        "amount": 100, // 金額 (數字)
        "isDebit": true // 是否為借方 (true = 借方, false = 貸方)
      }
    ],
    "aiNote": "string", // AI 分析的備註
  }

  可以使用的會計科目如下（請優先使用這些會計科目的代碼與名稱，不要自己發明）：
  ${accountsStr}
  `
}