import { IZodValidator } from '@/interfaces/zod_validator';
import { z } from 'zod';

const lineItemZod = z.object({
  lineItemIndex: z.string(),
  account: z.string(),
  description: z.string(),
  debit: z.boolean(),
  amount: z.number(),
  accountId: z.number(),
});

const voucherZod = z.object({
  journalId: z.number(),
  lineItems: z.array(lineItemZod),
});

const voucherCreateQueryValidator = z.object({});
const voucherCreateBodyValidator = z.object({
  voucher: voucherZod,
});

export const voucherCreateValidator: IZodValidator<
  (typeof voucherCreateQueryValidator)['shape'],
  (typeof voucherCreateBodyValidator)['shape']
> = {
  query: voucherCreateQueryValidator,
  body: voucherCreateBodyValidator,
};

const voucherUpdateQueryValidator = z.object({
  voucherId: z.string().regex(/^\d+$/).transform(Number),
});

export const voucherUpdateValidator: IZodValidator<
  (typeof voucherUpdateQueryValidator)['shape'],
  (typeof voucherCreateBodyValidator)['shape']
> = {
  query: voucherUpdateQueryValidator,
  body: voucherCreateBodyValidator,
};
