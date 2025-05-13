import { z } from 'zod';
import { InvoiceTaxType, InvoiceTransactionDirection, InvoiceType } from '@/constants/invoice';
import { CurrencyType } from '@/constants/currency';
import { ICounterpartyValidator } from '@/lib/utils/zod_schema/counterparty';

/**
 * Info: (20241105 - Murky)
 * @description 這個是給前端用的 IInvoiceBeta
 */
export const IInvoiceBetaValidator = z.object({
  id: z.number(),
  counterParty: ICounterpartyValidator,
  inputOrOutput: z.nativeEnum(InvoiceTransactionDirection),
  date: z.number(),
  no: z.string(),
  currencyAlias: z.nativeEnum(CurrencyType),
  priceBeforeTax: z.number(),
  taxType: z.nativeEnum(InvoiceTaxType),
  taxRatio: z
    .number()
    .nullable()
    .optional()
    .transform((v) => v ?? 0),
  taxPrice: z.number(),
  totalPrice: z.number(),
  type: z.nativeEnum(InvoiceType),
  deductible: z.boolean(),
  createdAt: z.number(),
  updatedAt: z.number(),
  // name: z.string().describe('name of invoice, not in IInvoiceBeta right now'),
});

export const IInvoiceBetaValidatorOptional = IInvoiceBetaValidator.partial();

/**
 * Info: (20241025 - Murky)
 * @description schema for init invoice entity or parsed prisma invoice
 */
export const invoiceEntityValidator = z.object({
  id: z.number(),
  certificateId: z.number(),
  counterPartyId: z.number(), // TODO: (20250114 - Shirley) DB migration 為了讓功能可以使用的暫時解法，開發相關功能的時候需要檢查或重構
  counterPartyInfo: z.string(), // TODO: (20250114 - Shirley) DB migration 為了讓功能可以使用的暫時解法，開發相關功能的時候需要檢查或重構
  inputOrOutput: z.nativeEnum(InvoiceTransactionDirection),
  date: z.number(),
  no: z.string(),
  currencyAlias: z.nativeEnum(CurrencyType),
  priceBeforeTax: z.number(),
  taxType: z.nativeEnum(InvoiceTaxType),
  taxRatio: z
    .number()
    .nullable()
    .optional()
    .transform((v) => v ?? 0),
  taxPrice: z.number(),
  totalPrice: z.number(),
  type: z.nativeEnum(InvoiceType),
  deductible: z.boolean(),
  createdAt: z.number(),
  updatedAt: z.number(),
  deletedAt: z.number().nullable(),
  counterParty: z.any().optional(),
});
