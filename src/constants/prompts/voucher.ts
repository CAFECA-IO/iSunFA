import { IAccountBookBase } from "@/interfaces/account_book";
import { getLanguageByCountry } from "@/constants/country";
import { CountryCode } from "@/constants/enums";

/*
 ** Info: (20260407 - Julian) 將傳票的分析拆解成「基本資料」和「會計分錄」
 */

// ---------------------------------------------------------------------------
// Info: (20260511 - Tzuhan) 🛡️ 防幻覺與邊界條件規則庫 (Anti-Hallucination Rules)
// ---------------------------------------------------------------------------
const ANTI_HALLUCINATION_RULES = `
[CRITICAL STRICT RULES FOR DATA EXTRACTION]
You are a pure data extractor. Do NOT perform any business logic judgments or math.

### STRICT ACCRUAL BASIS RULES

**RULE 1: Future Payment (Unrealized Cash Flow)**
- CONDITION: The document contains terms like "will be deducted" (將於扣款), "amount payable" (應繳金額), "billing notice" (請款單/繳費通知), or implies that the payment is pending.
- ACTION 1: You MUST set 'documentType' exactly to "ACCRUAL_NOTICE".
- ACTION 2: You are STRICTLY PROHIBITED from using asset accounts like CASH_IN_BANK or CASH on the credit side.
- ACTION 3: You MUST assign the credit side to a liability semantic category, such as OTHER_PAYABLES, ACCRUED_RENT, or ACCOUNTS_PAYABLE.

**RULE 2: Verified Payment (Realized Cash Flow)**
- CONDITION: The document contains terms like "deducted" (已扣款), "receipt" (收據), "paid in full" (註明付清), "remittance proof" (匯款證明), or clearly indicates that the payment has been completed.
- ACTION 1: You MUST set 'documentType' exactly to "PAYMENT_RECEIPT".
- ACTION 2: You MUST assign the credit side to a realized asset semantic category, such as CASH_IN_BANK or CASH.

// Info: (20260520 - Tzuhan) [AUDIT FIX] CPA directive: Enforce Zero Tax Hallucination and Prepaid Expense logic
**RULE 3: Zero Tax Hallucination**
- CONDITION: The document explicitly states "tax excluded" (不含稅) or does not explicitly display a "Sales Tax / Tax Amount" (營業稅/稅額).
- ACTION 1: 除非文件上明確標示稅額（Tax Amount），否則嚴禁自行計算稅額（如 5%）並分拆稅額！You are STRICTLY PROHIBITED from calculating or assuming a default tax rate (e.g., 5%). Extract ONLY the exact numbers printed on the document.
- ACTION 2: You MUST append the following exact phrase to 'aiNote': "No tax amount explicitly listed on the document; applying zero-fabrication principle without calculation."

**RULE 4: Prepaid Expense / Deposit**
- CONDITION: The document is a contract or lease spanning future periods, or explicitly states a deposit/guarantee (保證金/押金).
- ACTION 1: You MUST use "Prepaid" or "Deposit" semantic categories (e.g., PREPAID_EXPENSE, PREPAID_RENT, REFUNDABLE_DEPOSITS).
- ACTION 2: You are STRICTLY PROHIBITED from using realized expense categories for future periods or refundable deposits.
- ACTION 3: You MUST extract 'startDate' and 'endDate' EXACTLY as printed. You are STRICTLY PROHIBITED from calculating 'totalMonths' or amortization amounts. All period calculations will be handled deterministically by the backend.

**RULE 5: Credit Card Payment**
- CONDITION: The document is a credit card bill or explicitly states it was paid by credit card (信用卡支付/卡號).
- ACTION 1: You MUST assign the credit side to a liability semantic category (e.g., CREDIT_CARD_PAYABLE or OTHER_PAYABLES).
- ACTION 2: You are STRICTLY PROHIBITED from using CASH_IN_BANK or CASH on the credit side for credit card purchases.

1. Trading Type Extraction:
   - For "tradingType": Determine the voucher type. 
     - If the company is RECEIVING money (Revenue/Income), output "INCOME".
     - If the company is PAYING money (Expense/Payment), output "OUTCOME".
     - If it's a non-cash transfer or unpaid bill notice (Accounts Payable/Receivable), output "TRANSFER".
     - For ACCRUAL_NOTICE (contracts, unpaid bills, future payments), you MUST output "TRANSFER" because there is no immediate cash flow.

2. Date Hallucination Guard (Taiwan Region):
   - IF the document year is in ROC format (e.g., "115年"), you MUST add 1911 to convert it to the Gregorian calendar (e.g., "2026").
   - The "tradingDate" MUST be the actual date the transaction/deduction occurred, NOT just the document print date.
   - [STRICT CPA RULE]: For contracts and agreements (ACCRUAL_NOTICE), the obligation/liability is established on the SIGNATURE DATE (簽約日). You MUST use the Signature Date as the "tradingDate". Do NOT use the Commencement Date (生效日).

3. NO Math and NO Foreign Exchange (FX) Calculations:
   - You are a data extractor, NOT a calculator.
   - Do NOT attempt to calculate currency exchange rates.
   - Do NOT attempt to add or subtract taxes. Just extract the exact raw amounts shown.
`;

//  Info: (20260407 - Julian) 分析傳票「基本資料」的 Prompt
export const getBaseVoucherPrompt = (accountBook?: IAccountBookBase | null) => {
  const country = accountBook?.country || CountryCode.TW;

  // Info: (20260326 - Julian) 帳本資訊
  const accountBookInfo = accountBook
    ? `\nThis voucher will be recorded in the "${accountBook.name}" account book. Accounting Principle Country: ${country}, Base Currency: ${accountBook.currency}.`
    : "";

  // Info: (20260326 - Julian) 帳本規則
  const rulesInstruction = accountBook?.rule
    ? `\nYou MUST strictly adhere to the following special accounting rules and preferences for this account book:\n${accountBook.rule}`
    : "";

  // Info: (20260518 - Julian) 帳本語系
  const languageInstruction = accountBook?.country
    ? `\n  Please use "${getLanguageByCountry(accountBook.country as CountryCode).english}" as the primary language for the aiNote field. For all other fields, you MUST strictly preserve the original text without any translation.`
    : "";

  return `
Extract structured data from the user-uploaded document (file/image) to create an accounting voucher. ${accountBookInfo}${rulesInstruction}
${ANTI_HALLUCINATION_RULES}
${languageInstruction}

Write down your analysis logic in the "aiNote" field without any markdown formatting.
`;
};

//  Info: (20260407 - Julian) 分析傳票「會計分錄」的 Prompt
export const getVoucherLinesPrompt = (
  accountBook?: IAccountBookBase | null,
) => {
  // Info: (20260512 - Tzuhan) 廢除全域會計科目表暴力注入，改由後端 Hybrid Pipeline 處理
  const country = accountBook?.country || CountryCode.TW;

  // Info: (20260326 - Julian) 帳本資訊
  const accountBookInfo = accountBook
    ? `\nAccounting Principle Country: ${country}, Base Currency: ${accountBook.currency}.`
    : "";

  // Info: (20260326 - Julian) 帳本規則
  const rulesInstruction = accountBook?.rule
    ? `\nYou MUST strictly adhere to the following special accounting rules and preferences for this account book:\n${accountBook.rule}`
    : "";

  return `
Extract precise accounting journal entries from the user-uploaded document (file/image). ${accountBookInfo}${rulesInstruction}
${ANTI_HALLUCINATION_RULES}

Write down your logic for determining the debit and credit accounts in the "aiNote" field.

[IMPORTANT]
Do NOT invent exact numerical accounting codes if you don't know them. 
Instead, you MUST select the most appropriate semantic category from the provided schema's 'semanticCategory' enum.
If no suitable category exists, choose "UNKNOWN".
For all other fields like "particular", you MUST strictly preserve the original text without any translation.
The backend system will map this 'semanticCategory' to the exact local accounting code.
`;
};
