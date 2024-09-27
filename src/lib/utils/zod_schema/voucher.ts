import { IZodValidator } from '@/interfaces/zod_validator';
import { z } from 'zod';
import { iLineItemBodyValidatorV2, iLineItemValidator } from '@/lib/utils/zod_schema/lineItem';
import { zodStringToNumber, zodStringToNumberWithDefault } from '@/lib/utils/zod_schema/common';
import { DEFAULT_PAGE_LIMIT, DEFAULT_PAGE_START_AT } from '@/constants/config';
import { EventType } from '@/constants/account';
import { SortOrder } from '@/constants/sort';
import { recurringEventForVoucherPostValidatorV2 } from '@/lib/utils/zod_schema/recurring_event';

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

/**
 * ************************************************
 * Info: (20240927 - Murky)
 * V2 validator below
 * ************************************************
 */

// Info: (20240927 - Murky) GET all v2 validator
const voucherGetAllQueryValidatorV2 = z.object({
  strategy: z.enum(['upcoming', 'uploaded', 'payment', 'receiving']),
  canBeEdit: z.boolean().optional(),
  page: zodStringToNumberWithDefault(DEFAULT_PAGE_START_AT),
  pageSize: zodStringToNumberWithDefault(DEFAULT_PAGE_LIMIT),
  type: z.nativeEnum(EventType).optional(),
  sortBy: z.enum(['voucherDate', 'period', 'credit', 'debit']).optional(),
  sortOrder: z.nativeEnum(SortOrder).optional(),
  startDate: zodStringToNumberWithDefault(0),
  endDate: zodStringToNumberWithDefault(Infinity),
  searchQuery: z.string().optional(),
});

const voucherGetAllBodyValidatorV2 = z.object({});

export const voucherGetAllValidatorV2: IZodValidator<
  (typeof voucherGetAllQueryValidatorV2)['shape'],
  (typeof voucherGetAllBodyValidatorV2)['shape']
> = {
  query: voucherGetAllQueryValidatorV2,
  body: voucherGetAllBodyValidatorV2,
};

// Info: (20240927 - Murky) POST voucher v2 validator
const voucherPostQueryValidatorV2 = z.object({});
const voucherPostBodyValidatorV2 = z.object({
  certificateIds: z.array(z.number().int()),
  voucherDate: z.number().int(),
  type: z.nativeEnum(EventType),
  note: z.string(),
  counterPartyId: z.number().int(),
  lineItems: z.array(iLineItemBodyValidatorV2),
  recurringInfo: recurringEventForVoucherPostValidatorV2.optional(),
  assetIds: z.array(z.number().int()),
  reverseVouchers: z.array(
    z.object({
      voucherId: z.number().int(),
      amount: z.number(),
    })
  ),
});

export const voucherPostValidatorV2: IZodValidator<
  (typeof voucherPostQueryValidatorV2)['shape'],
  (typeof voucherPostBodyValidatorV2)['shape']
> = {
  query: voucherPostQueryValidatorV2,
  body: voucherPostBodyValidatorV2,
};
