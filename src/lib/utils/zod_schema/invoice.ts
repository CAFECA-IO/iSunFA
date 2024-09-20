import { EventType } from '@/constants/account';
import { IZodValidator } from '@/interfaces/zod_validator';
import { z } from 'zod';
import { iPaymentValidator } from '@/lib/utils/zod_schema/payment';
import { zodStringToNumber } from '@/lib/utils/zod_schema/common';

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
  invoice: iInvoiceValidator,
});

export const invoiceUpdateValidator: IZodValidator<
  (typeof invoiceUpdateQueryValidator)['shape'],
  (typeof invoiceUpdateBodyValidator)['shape']
> = {
  query: invoiceUpdateQueryValidator,
  body: invoiceUpdateBodyValidator,
};

const invoiceGetByIdQueryValidator = z.object({
  invoiceId: zodStringToNumber,
});

const invoiceGetByIdBodyValidator = z.object({});

export const invoiceGetByIdValidator: IZodValidator<
  (typeof invoiceGetByIdQueryValidator)['shape'],
  (typeof invoiceGetByIdBodyValidator)['shape']
> = {
  query: invoiceGetByIdQueryValidator,
  body: invoiceGetByIdBodyValidator,
};
