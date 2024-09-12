import { IZodValidator } from '@/interfaces/zod_validator';
import { z } from 'zod';
import { iLineItemValidator } from '@/lib/utils/zod_schema/lineItem';
import { zodStringToNumber } from '@/lib/utils/zod_schema/common';

const iVoucherValidator = z.object({
  journalId: z.number(),
  lineItems: z.array(iLineItemValidator),
});

const voucherCreateQueryValidator = z.object({});
const voucherCreateBodyValidator = z.object({
  voucher: iVoucherValidator,
});

export const voucherCreateValidator: IZodValidator<
  (typeof voucherCreateQueryValidator)['shape'],
  (typeof voucherCreateBodyValidator)['shape']
> = {
  query: voucherCreateQueryValidator,
  body: voucherCreateBodyValidator,
};

const voucherUpdateQueryValidator = z.object({
  voucherId: zodStringToNumber,
});

export const voucherUpdateValidator: IZodValidator<
  (typeof voucherUpdateQueryValidator)['shape'],
  (typeof voucherCreateBodyValidator)['shape']
> = {
  query: voucherUpdateQueryValidator,
  body: voucherCreateBodyValidator,
};
