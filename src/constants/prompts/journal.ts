import { IAccountBookBase } from "@/interfaces/account_book";
import { getLanguageByCountry } from "@/constants/country";
import { CountryCode } from "@/constants/enums";

export const getJournalPrompt = (accountBook?: IAccountBookBase | null) => {
  // Info: (20260518 - Tzuhan) 今日日期
  const today = new Date().toISOString().split("T")[0];

  // Info: (20260326 - Julian) 帳本資訊 (轉為全英文以增強指令遵循)
  const accountBookInfo = accountBook
    ? `\n  This journal entry is for the account book "${accountBook.name}". Accounting standard country: ${accountBook.country || CountryCode.TW}. Base currency: ${accountBook.currency}.`
    : "";

  // Info: (20260326 - Julian) 帳本規則
  const rulesInstruction = accountBook?.rule
    ? `\n  Strictly follow these accounting rules and preferences:\n  ${accountBook.rule}\n`
    : "";

  // Info: (20260518 - Julian) 產出語言 (轉為全英文以增強指令遵循)
  const languageInstruction = accountBook?.country
    ? `\n  Please use "${getLanguageByCountry(accountBook.country as CountryCode).english}" as the primary language for the aiNote and text fields. For all other fields, you MUST strictly preserve the original text without any translation.`
    : "";

  return `
      Current Date: ${today}.
      Analyze the provided receipt/document and extract the information into a highly structured, objective format.${accountBookInfo}${rulesInstruction}${languageInstruction}

      [CRITICAL RULES - PERMISSION SEPARATION & ZERO INVENTION]
      1. FORMATTING PERMISSION (GRANTED): You MUST use Markdown headers (e.g., ### 憑證資訊) and bullet points to structure the extracted data for high readability.
      2. INVENTION PERMISSION (DENIED): DO NOT write a subjective "story" or invent any context. You must ONLY extract and list the exact, objective facts (Who, What, When, Where, How much) visibly printed on the document.
      3. MATH PERMISSION (DENIED): You are strictly prohibited from calculating foreign exchange conversions. Do NOT attempt to convert the currency on the receipt to the base currency. You must extract and retain the original currency and amount exactly as printed.

      REQUIRED MARKDOWN STRUCTURE FOR "text" FIELD:
      ### 交易摘要
      (A 1-2 sentence objective summary of the transaction based ONLY on visible facts. Do not guess the business intent.)

      ### 憑證資訊
      (Use bullet points to list all extracted key-value pairs visibly printed that are critical for financial accounting and ESG carbon footprint tracking, such as Vendor, Date, Items, Amounts, Contract Terms, etc.)

      ### 異常與備註
      (List any logical errors, formatting issues, or anomalies. If none, state "無異常".)

      Output your response strictly matching the provided JSON schema.`;
};
