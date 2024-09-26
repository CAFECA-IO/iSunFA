import { IZodValidator } from '@/interfaces/zod_validator';
import { z } from 'zod';
import { zodStringToNumberWithDefault, zodTimestampInSeconds } from '@/lib/utils/zod_schema/common';
import { DEFAULT_PAGE_NUMBER } from '@/constants/display';
import { DEFAULT_PAGE_LIMIT } from '@/constants/config';
import { SortOrder } from '@/constants/sort';

const trialBalanceListQueryValidator = z.object({
  page: zodStringToNumberWithDefault(DEFAULT_PAGE_NUMBER),
  pageSize: zodStringToNumberWithDefault(DEFAULT_PAGE_LIMIT),
  sortOrder: z.nativeEnum(SortOrder).optional(),
  startDate: zodTimestampInSeconds(true, 0),
  endDate: zodTimestampInSeconds(true, Infinity),
});

const basicTrialBalanceReturnValidator = z.object({
  id: z.number(),
  no: z.string(),
  accountingTitle: z.string(),
  beginningCreditAmount: z.number(),
  beginningDebitAmount: z.number(),
  midtermCreditAmount: z.number(),
  midtermDebitAmount: z.number(),
  endingCreditAmount: z.number(),
  endingDebitAmount: z.number(),
  createAt: z.number(),
  updateAt: z.number(),
});

export const trialBalanceReturnValidator = z.object({
  id: z.number(),
  no: z.string(),
  accountingTitle: z.string(),
  beginningCreditAmount: z.number(),
  beginningDebitAmount: z.number(),
  midtermCreditAmount: z.number(),
  midtermDebitAmount: z.number(),
  endingCreditAmount: z.number(),
  endingDebitAmount: z.number(),
  createAt: z.number(),
  updateAt: z.number(),
  subAccounts: z.array(basicTrialBalanceReturnValidator),
});

export const trialBalanceListReturnValidator = z.array(trialBalanceReturnValidator);

export const trialBalanceListValidator: IZodValidator<
  (typeof trialBalanceListQueryValidator)['shape'],
  z.ZodOptional<z.ZodNullable<z.ZodString>>
> = {
  query: trialBalanceListQueryValidator,
  body: z.string().nullable().optional(),
};
