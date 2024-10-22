// import { IZodValidator } from '@/interfaces/zod_validator';
// import { z } from 'zod';
// import { zodStringToNumberWithDefault, zodTimestampInSeconds } from '@/lib/utils/zod_schema/common';
// import { DEFAULT_PAGE_NUMBER } from '@/constants/display';
// import { DEFAULT_PAGE_LIMIT } from '@/constants/config';
// import { SortOrder } from '@/constants/sort';

// const trialBalanceListQueryValidator = z.object({
//   page: zodStringToNumberWithDefault(DEFAULT_PAGE_NUMBER),
//   pageSize: zodStringToNumberWithDefault(DEFAULT_PAGE_LIMIT),
//   sortOrder: z.nativeEnum(SortOrder).optional(),
//   startDate: zodTimestampInSeconds(true, 0),
//   endDate: zodTimestampInSeconds(true, Infinity),
// });

// const basicTrialBalanceReturnValidator = z.object({
//   id: z.number(),
//   no: z.string(),
//   accountingTitle: z.string(),
//   beginningCreditAmount: z.number(),
//   beginningDebitAmount: z.number(),
//   midtermCreditAmount: z.number(),
//   midtermDebitAmount: z.number(),
//   endingCreditAmount: z.number(),
//   endingDebitAmount: z.number(),
//   createAt: z.number(),
//   updateAt: z.number(),
// });

// export const trialBalanceReturnValidator = z.object({
//   id: z.number(),
//   no: z.string(),
//   accountingTitle: z.string(),
//   beginningCreditAmount: z.number(),
//   beginningDebitAmount: z.number(),
//   midtermCreditAmount: z.number(),
//   midtermDebitAmount: z.number(),
//   endingCreditAmount: z.number(),
//   endingDebitAmount: z.number(),
//   createAt: z.number(),
//   updateAt: z.number(),
//   subAccounts: z.array(basicTrialBalanceReturnValidator),
// });

// export const trialBalanceListReturnValidator = z.array(trialBalanceReturnValidator);

// // export const trialBalanceListValidator: IZodValidator<
// //   (typeof trialBalanceListQueryValidator)['shape'],
// //   z.ZodOptional<z.ZodNullable<z.ZodString>>
// // > = {
// //   query: trialBalanceListQueryValidator,
// //   body: z.string().nullable().optional(),
// // };

// export const trialBalanceListValidator: IZodValidator<
//   (typeof trialBalanceListQueryValidator)['shape'],
//   { body?: string | null }
// > = {
//   query: trialBalanceListQueryValidator,
//   body: z.string().nullable().optional(),
// };

import { z } from 'zod';
import { IZodValidator } from '@/interfaces/zod_validator';
import { SortOrder } from '@/constants/sort';

// Info: (20240101 - AI) Trial balance list validator
const trialBalanceListQueryValidator = z.object({
  startDate: z.number().int(),
  endDate: z.number().int(),
  sortBy: z.string().optional().default('createAt'),
  sortOrder: z.nativeEnum(SortOrder).optional().default(SortOrder.DESC),
  page: z.number().int().optional().default(1),
  pageSize: z.number().int().optional().default(Infinity),
});

const trialBalanceListBodyValidator = z.object({});

export const trialBalanceListValidator: IZodValidator<
  (typeof trialBalanceListQueryValidator)['shape'],
  (typeof trialBalanceListBodyValidator)['shape']
> = {
  query: trialBalanceListQueryValidator,
  body: trialBalanceListBodyValidator,
};

const basicTrialBalanceItemSchema = z.object({
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

const trialBalanceItemSchema = z.lazy(() =>
  z.object({
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
    deletedAt: z.number().optional(),
    subAccounts: z.array(basicTrialBalanceItemSchema),
  })
);

// Info: (20240101 - AI) Trial balance total schema
const trialBalanceTotalSchema = z.object({
  beginningCreditAmount: z.number(),
  beginningDebitAmount: z.number(),
  midtermCreditAmount: z.number(),
  midtermDebitAmount: z.number(),
  endingCreditAmount: z.number(),
  endingDebitAmount: z.number(),
  createAt: z.number(),
  updateAt: z.number(),
});

// Info: (20240101 - AI) Trial balance list response validator
export const trialBalanceListResponseValidator = z.object({
  currencyAlias: z.string(),
  items: z.object({
    data: z.array(trialBalanceItemSchema),
    page: z.number(),
    totalPages: z.number(),
    totalCount: z.number(),
    pageSize: z.number(),
    hasNextPage: z.boolean(),
    hasPreviousPage: z.boolean(),
    sort: z.array(
      z.object({
        sortBy: z.string(),
        sortOrder: z.string(),
      })
    ),
  }),
  total: trialBalanceTotalSchema,
});
