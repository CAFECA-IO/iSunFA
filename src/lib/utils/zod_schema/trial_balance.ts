import { z } from 'zod';
import { zodStringToNumber, zodStringToNumberWithDefault } from '@/lib/utils/zod_schema/common';
import { DEFAULT_PAGE_NUMBER } from '@/constants/display';
import { DEFAULT_PAGE_LIMIT } from '@/constants/config';

const trialBalanceNullSchema = z.union([z.object({}), z.string()]);

// Info: (20241022 - Shirley) Trial balance list validator
const trialBalanceListQueryValidator = z.object({
  companyId: zodStringToNumber,
  startDate: zodStringToNumber,
  endDate: zodStringToNumber,
  sortOption: z.string().optional(),
  page: zodStringToNumberWithDefault(DEFAULT_PAGE_NUMBER),
  pageSize: zodStringToNumberWithDefault(DEFAULT_PAGE_LIMIT),
});

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

export const trialBalanceItemSchema: z.ZodType<subAccounts> = basicTrialBalanceItemSchema.extend({
  subAccounts: z.lazy(() => trialBalanceItemSchema.array()),
});

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
    bodySchema: trialBalanceNullSchema,
  },
  outputSchema: trialBalanceListResponseValidator,
  frontend: trialBalanceNullSchema,
};
