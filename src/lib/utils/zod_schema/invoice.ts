import { EventType, PaymentPeriodType, PaymentStatusType } from '@/constants/account';
import { IZodValidator } from '@/interfaces/zod_validator';
import { z } from 'zod';

const invoiceZod = z.object({
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
  payment: z.object({
    isRevenue: z.boolean(),
    price: z.number(),
    hasTax: z.boolean(),
    taxPercentage: z.number(),
    hasFee: z.boolean(),
    fee: z.number(),
    method: z.string(),
    period: z.nativeEnum(PaymentPeriodType),
    installmentPeriod: z.number(),
    alreadyPaid: z.number(),
    status: z.nativeEnum(PaymentStatusType),
    progress: z.number(),
  }),
});

const invoiceCreateQueryValidator = z.object({});

const invoiceCreateBodyValidator = z.object({
  ocrId: z.number().optional(),
  invoice: invoiceZod,
});

export const invoiceCreateValidator: IZodValidator<
  (typeof invoiceCreateQueryValidator)['shape'],
  (typeof invoiceCreateBodyValidator)['shape']
> = {
  // Info: (20240911 - Murky) GET /ocr
  query: invoiceCreateQueryValidator,
  body: invoiceCreateBodyValidator,
};

const invoiceUpdateQueryValidator = z.object({});
const invoiceUpdateBodyValidator = z.object({
  invoice: invoiceZod,
});

export const invoiceUpdateValidator: IZodValidator<
  (typeof invoiceUpdateQueryValidator)['shape'],
  (typeof invoiceUpdateBodyValidator)['shape']
> = {
  query: invoiceUpdateQueryValidator,
  body: invoiceUpdateBodyValidator,
};

const invoiceGetByIdQueryValidator = z.object({
  invoiceId: z.string().regex(/^\d+$/).transform(Number),
});

const invoiceGetByIdBodyValidator = z.object({});

export const invoiceGetByIdValidator: IZodValidator<
  (typeof invoiceGetByIdQueryValidator)['shape'],
  (typeof invoiceGetByIdBodyValidator)['shape']
> = {
  query: invoiceGetByIdQueryValidator,
  body: invoiceGetByIdBodyValidator,
};
