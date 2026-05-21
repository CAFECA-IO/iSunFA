import { z } from "zod";
import { DocumentType, EsgFallbackCategory } from "@/constants/enums";

// Info: (20260514 - Tzuhan) Phase 1.1 Zod Schemas for structured AI output validation

export const DocumentPreCheckSchema = z.object({
  invoiceNumber: z
    .string()
    .nullable()
    .describe("發票/收據字軌號碼，完全找不到則回傳 null"),
  vendorTaxId: z.string().nullable().describe("賣方統編，完全沒寫則回傳 null"),
  tradingDate: z
    .string()
    .nullable()
    .describe("交易日期，完全找不到則回傳 null"),
  totalAmount: z
    .number()
    .nullable()
    .describe("總金額 (數字)，完全找不到則回傳 null"),
});
export type DocumentPreCheckResponse = z.infer<typeof DocumentPreCheckSchema>;

export const JournalParsingSchema = z.object({
  tradingDate: z.string().describe("Date of transaction"),
  text: z
    .string()
    .describe(
      "A factual, literal description of what the user spent money on or received money for based ONLY on the document.",
    ),
  confidence: z
    .number()
    .int()
    .min(0)
    .max(100)
    .describe("Overall confidence score (0-100)"),
  aiNote: z
    .string()
    .describe(
      "[Chain of Thought] ALWAYS write your step-by-step reasoning HERE FIRST.",
    ),
});
export type JournalParsingResponse = z.infer<typeof JournalParsingSchema>;

export const VoucherBaseParsingSchema = z.object({
  aiNote: z
    .string()
    .describe(
      "[Chain of Thought] ALWAYS write your step-by-step reasoning HERE FIRST before filling other fields. (Output in Traditional Chinese)",
    ),
  vendorName: z
    .string()
    .describe("Extracted name of the vendor (e.g. 中華電信)"),
  vendorTaxId: z.string().nullable().describe("廠商統一編號，若無則填 null"),
  // Info: (20260520 - Tzuhan) [AUDIT FIX] CPA directive: Refactor magic strings to Enum
  documentType: z
    .nativeEnum(DocumentType)
    .describe("Identify the document type based on the rules"),
  totalAmount: z
    .number()
    .describe("The exact numeric total amount written on the document"),
  tradingDate: z
    .string()
    .describe("Date of transaction (Apply ROC year conversion if needed)"),
  tradingType: z.enum(["INCOME", "OUTCOME", "TRANSFER"]),
  note: z.string().describe("Brief summary/note of the transaction"),
  confidence: z
    .number()
    .int()
    .min(0)
    .max(100)
    .describe("Overall confidence score (0-100)"),
});
export type VoucherBaseParsingResponse = z.infer<
  typeof VoucherBaseParsingSchema
>;

export const VoucherLinesParsingSchema = z.object({
  aiNote: z
    .string()
    .describe(
      "[Chain of Thought] ALWAYS write your reasoning HERE FIRST. Especially verify if it's an UNPAID Notice or PAID Receipt. (Output in Traditional Chinese)",
    ),
  lines: z
    .array(
      z.object({
        // Info: (20260520 - Tzuhan) [AUDIT FIX] 強制約束為帳本當地語系以阻止英文 AI 幻覺
        accountingCode: z
          .string()
          // Info: (20260520 - Tzuhan) [AUDIT FIX] CPA directive: Strict enforcement of no numeric codes
          .describe(
            "會計科目名稱。必須強制輸出為『帳本當地語系』（若為台灣帳本，請絕對輸出繁體中文，例如：『預付租金』、『存出保證金』）。嚴禁輸出英文！絕對禁止輸出數字代碼！只能輸出中文科目名稱（或國家字典支援之字串）。違者將導致系統崩潰！",
          ),
        particular: z
          .string()
          .describe(
            "請強制以『交易項目 - 廠商簡稱』的格式輸出摘要，例如：『市內電話上網費 - 中華電信』 (Output in Traditional Chinese)",
          ),
        amount: z.number().describe("Numeric amount"),
        isDebit: z.boolean().describe("true = Debit, false = Credit"),
      }),
    )
    .describe(
      "Journal entries. The sum of debit amounts MUST equal the sum of credit amounts (A = L + E).",
    ),
});
export type VoucherLinesParsingResponse = z.infer<
  typeof VoucherLinesParsingSchema
>;

export const EsgParsingSchema = z.object({
  aiNote: z
    .string()
    .describe(
      "[Chain of Thought] ALWAYS write your reasoning HERE FIRST. (Output in Traditional Chinese)",
    ),
  isTarget: z
    .boolean()
    .describe("Does this transaction represent an ESG-related activity?"),
  activityType: z
    .string()
    .nullable()
    .describe(
      "Extracted specific activity type (e.g. Electricity, Water, Gasoline)",
    ),
  amount: z
    .number()
    .nullable()
    .describe("The raw consumption amount (e.g. 100 for 100 kWh)"),
  unit: z
    .string()
    .nullable()
    .describe("The unit of consumption (e.g. kWh, L, kg)"),
  fallbackCategory: z
    .nativeEnum(EsgFallbackCategory)
    .nullable()
    .describe(
      "最接近的官方標準大類標籤。必須嚴格從清單中挑選最符合的一項，用以推估碳排。",
    ),
  confidence: z
    .number()
    .int()
    .min(0)
    .max(100)
    .describe("Overall confidence score (0-100)"),
});
export type EsgParsingResponse = z.infer<typeof EsgParsingSchema>;

export const AiConsultingSchema = z.object({
  answer: z.string().describe("The consultation answer"),
  tags: z.array(z.string()).describe("Tags derived from the consultation"),
});
export type AiConsultingResponse = z.infer<typeof AiConsultingSchema>;
