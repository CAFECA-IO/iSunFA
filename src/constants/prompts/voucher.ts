import { IAccountBookBase } from "@/interfaces/account_book";

/*
 ** Info: (20260407 - Julian) 將傳票的分析拆解成「基本資料」和「會計分錄」
 */

// ---------------------------------------------------------------------------
// Info: (20260511 - Tzuhan) 🛡️ 防幻覺與邊界條件規則庫 (Anti-Hallucination Rules)
// ---------------------------------------------------------------------------
const ANTI_HALLUCINATION_RULES = `
[CRITICAL STRICT RULES FOR DATA EXTRACTION]
You are a pure data extractor. Do NOT perform any business logic judgments or math.

1. Document Type Extraction:
   - Identify if the document is a "BILL_NOTICE" (Unpaid, e.g., "繳費通知", "請於 XX 日前繳納").
   - Or a "PAYMENT_RECEIPT" (Paid, e.g., "收據", "已扣款", "繳費結果通知").
   - Output "OTHER" if it doesn't clearly match either.

2. Date Hallucination Guard (Taiwan Region):
   - IF the document year is in ROC format (e.g., "115年"), you MUST add 1911 to convert it to the Gregorian calendar (e.g., "2026").
   - The "tradingDate" MUST be the actual date the transaction/deduction occurred, NOT just the document print date.

3. NO Math and NO Foreign Exchange (FX) Calculations:
   - You are a data extractor, NOT a calculator.
   - Do NOT attempt to calculate currency exchange rates.
   - Do NOT attempt to add or subtract taxes. Just extract the exact raw amounts shown.
`;

//  Info: (20260407 - Julian) 分析傳票「基本資料」的 Prompt
export const getBaseVoucherPrompt = (accountBook?: IAccountBookBase | null) => {
  const country = accountBook?.country || "TW";
  const accountBookInfo = accountBook
    ? `\nThis voucher will be recorded in the "${accountBook.name}" account book. Accounting Principle Country: ${country}, Base Currency: ${accountBook.currency}.`
    : "";
  const rulesInstruction = accountBook?.rule
    ? `\nYou MUST strictly adhere to the following special accounting rules and preferences for this account book:\n${accountBook.rule}`
    : "";

  return `
Extract structured data from the user-uploaded document (file/image) to create an accounting voucher. ${accountBookInfo}${rulesInstruction}
${ANTI_HALLUCINATION_RULES}

Write down your analysis logic in the "aiNote" field without any markdown formatting.
IMPORTANT: Your output MUST be in the language of the uploaded document (e.g., Traditional Chinese).
`;
};

//  Info: (20260407 - Julian) 分析傳票「會計分錄」的 Prompt
export const getVoucherLinesPrompt = (
  accountBook?: IAccountBookBase | null,
) => {
  // Info: (20260512 - Tzuhan) 廢除全域會計科目表暴力注入，改由後端 Hybrid Pipeline 處理
  const country = accountBook?.country || "TW";

  const accountBookInfo = accountBook
    ? `\nAccounting Principle Country: ${country}, Base Currency: ${accountBook.currency}.`
    : "";
  const rulesInstruction = accountBook?.rule
    ? `\nYou MUST strictly adhere to the following special accounting rules and preferences for this account book:\n${accountBook.rule}`
    : "";

  return `
Extract precise accounting journal entries from the user-uploaded document (file/image). ${accountBookInfo}${rulesInstruction}
${ANTI_HALLUCINATION_RULES}

Write down your logic for determining the debit and credit accounts in the "aiNote" field.
IMPORTANT: Your output (particular, aiNote) MUST be in the language of the uploaded document (e.g., Traditional Chinese).

[IMPORTANT]
Do NOT invent exact numerical accounting codes if you don't know them. 
Simply provide the most standard and descriptive account name (e.g., "Cash", "Accounts Payable", "Office Supplies") in the "accountingCode" field. 
The backend system will map this to the exact local accounting code via Vector Search.
`;
};
