import { z } from 'zod';
import { IZodValidator } from '@/interfaces/zod_validator';
import { SortOrder } from '@/constants/sort';
import {
  zodStringToNumberWithDefault,
  zodTimestampInSecondsNoDefault,
} from '@/lib/utils/zod_schema/common';
import { DEFAULT_PAGE_NUMBER } from '@/constants/display';
import { DEFAULT_PAGE_LIMIT } from '@/constants/config';
import { TrialBalanceSortBy } from '@/constants/trial_balance';

const trialBalanceNullSchema = z.union([z.object({}), z.string()]);

// Info: (20241022 - Shirley) Trial balance list validator
const trialBalanceListQueryValidator = z.object({
  startDate: zodTimestampInSecondsNoDefault(),
  endDate: zodTimestampInSecondsNoDefault(),
  sortBy: z.nativeEnum(TrialBalanceSortBy).optional().default(TrialBalanceSortBy.CREATED_AT),
  sortOrder: z.nativeEnum(SortOrder).optional().default(SortOrder.DESC),
  page: zodStringToNumberWithDefault(DEFAULT_PAGE_NUMBER),
  pageSize: zodStringToNumberWithDefault(DEFAULT_PAGE_LIMIT),
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

type subAccounts = z.infer<typeof basicTrialBalanceItemSchema> & {
  subAccounts: subAccounts[];
};

// const trialBalanceSchema1: z.ZodType<subAccounts> = basicTrialBalanceItemSchema.extend({
//   subAccounts: z.lazy(() => trialBalanceSchema1.array()),
// });

// const trialBalanceItemSchema2 = z.lazy(() =>
//   z.object({
//     id: z.number(),
//     no: z.string(),
//     accountingTitle: z.string(),
//     beginningCreditAmount: z.number(),
//     beginningDebitAmount: z.number(),
//     midtermCreditAmount: z.number(),
//     midtermDebitAmount: z.number(),
//     endingCreditAmount: z.number(),
//     endingDebitAmount: z.number(),
//     createAt: z.number(),
//     updateAt: z.number(),
//     deletedAt: z.number().optional(),
//     subAccounts: z.lazy(() => basicTrialBalanceItemSchema.array()),
//   })
// );

export const trialBalanceItemSchema: z.ZodType<subAccounts> = basicTrialBalanceItemSchema.extend({
  subAccounts: z.lazy(() => trialBalanceItemSchema.array()),
});

// const trialBalanceItemSchema = z.lazy(() =>
//   z.object({
//     id: z.number(),
//     no: z.string(),
//     accountingTitle: z.string(),
//     beginningCreditAmount: z.number(),
//     beginningDebitAmount: z.number(),
//     midtermCreditAmount: z.number(),
//     midtermDebitAmount: z.number(),
//     endingCreditAmount: z.number(),
//     endingDebitAmount: z.number(),
//     createAt: z.number(),
//     updateAt: z.number(),
//     deletedAt: z.number().optional(),
//     // subAccounts: z.array(basicTrialBalanceItemSchema),
//     subAccounts: z.lazy(() => basicTrialBalanceItemSchema.array()),
//   })
// );

// Info: (20241022 - Shirley) Trial balance total schema
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

// Info: (20241022 - Shirley) Trial balance list response validator
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

export const trialBalanceListSchema = {
  input: {
    querySchema: trialBalanceListQueryValidator,
    bodySchema: trialBalanceListBodyValidator,
  },
  outputSchema: trialBalanceListResponseValidator,
  frontend: trialBalanceNullSchema,
};
