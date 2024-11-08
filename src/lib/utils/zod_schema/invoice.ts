import { EventType } from '@/constants/account';
import { IZodValidator } from '@/interfaces/zod_validator';
import { z, ZodRawShape } from 'zod';
import { iPaymentValidator } from '@/lib/utils/zod_schema/payment';
import { zodStringToNumber } from '@/lib/utils/zod_schema/common';
import { InvoiceTaxType, InvoiceTransactionDirection, InvoiceType } from '@/constants/invoice';
import { CurrencyType } from '@/constants/currency';
import { ICounterpartyValidator } from '@/lib/utils/zod_schema/counterparty';

/**
 * Info: (20241105 - Murky)
 * @description 這個是給前端用的 IInvoiceBeta
 */
export const IInvoiceBetaValidator = z.object({
  id: z.number(),
  isComplete: z.boolean(),
  counterParty: ICounterpartyValidator,
  inputOrOutput: z.nativeEnum(InvoiceTransactionDirection),
  date: z.number(),
  no: z.string(),
  currencyAlias: z.nativeEnum(CurrencyType),
  priceBeforeTax: z.number(),
  taxType: z.nativeEnum(InvoiceTaxType),
  taxRatio: z.number(),
  taxPrice: z.number(),
  totalPrice: z.number(),
  type: z.nativeEnum(InvoiceType),
  deductible: z.boolean(),
  createdAt: z.number(),
  updatedAt: z.number(),
  name: z.string().describe('name of invoice, not in IInvoiceBeta right now'),
});

const iInvoiceValidator = z.object({
  journalId: z.number().nullable(),
  date: z.number(), // Info: (20240522 - Murky) timestamp
  eventType: z.nativeEnum(EventType),
  paymentReason: z.string(),
  description: z.string(),
  vendorOrSupplier: z.string(),
  projectId: z.number().nullable(),
  project: z.string().nullable(),
  contractId: z.number().nullable(),
  contract: z.string().nullable(),
  payment: iPaymentValidator,
});

const invoiceCreateQueryValidator = z.object({});

const invoiceCreateBodyValidator = z.object({
  ocrId: z.number().optional(),
  invoice: iInvoiceValidator,
});

const invoiceCreateValidator: IZodValidator<
  (typeof invoiceCreateQueryValidator)['shape'],
  (typeof invoiceCreateBodyValidator)['shape']
> = {
  // Info: (20240911 - Murky) GET /ocr
  query: invoiceCreateQueryValidator,
  body: invoiceCreateBodyValidator,
};

const invoiceUpdateQueryValidator = z.object({});
const invoiceUpdateBodyValidator = z.object({
  invoice: iInvoiceValidator,
});

const invoiceUpdateValidator: IZodValidator<
  (typeof invoiceUpdateQueryValidator)['shape'],
  (typeof invoiceUpdateBodyValidator)['shape']
> = {
  query: invoiceUpdateQueryValidator,
  body: invoiceUpdateBodyValidator,
};

const invoiceGetOneQueryValidator = z.object({
  invoiceId: zodStringToNumber,
});

const invoiceGetOneBodyValidator = z.object({});

const invoiceGetOneValidator: IZodValidator<
  (typeof invoiceGetOneQueryValidator)['shape'],
  (typeof invoiceGetOneBodyValidator)['shape']
> = {
  query: invoiceGetOneQueryValidator,
  body: invoiceGetOneBodyValidator,
};

/**
 * Info: (20241025 - Murky)
 * Use this to put in zod.schema to be used in middleware
 */
export const invoiceRequestValidators: {
  [method: string]: IZodValidator<ZodRawShape, ZodRawShape>;
} = {
  GET_ONE: invoiceGetOneValidator,
  PUT: invoiceUpdateValidator,
  POST: invoiceCreateValidator,
};

/**
 * Info: (20241025 - Murky)
 * @description schema for init invoice entity or parsed prisma invoice
 */
export const invoiceEntityValidator = z.object({
  id: z.number(),
  certificateId: z.number(),
  counterPartyId: z.number(),
  inputOrOutput: z.nativeEnum(InvoiceTransactionDirection),
  date: z.number(),
  no: z.string(),
  currencyAlias: z.nativeEnum(CurrencyType),
  priceBeforeTax: z.number(),
  taxType: z.nativeEnum(InvoiceTaxType),
  taxRatio: z.number(),
  taxPrice: z.number(),
  totalPrice: z.number(),
  type: z.nativeEnum(InvoiceType),
  deductible: z.boolean(),
  createdAt: z.number(),
  updatedAt: z.number(),
  deletedAt: z.number().nullable(),
  counterParty: z.any().optional(),
});
