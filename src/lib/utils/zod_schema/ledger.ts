import { z } from 'zod';
import { IZodValidator } from '@/interfaces/zod_validator';
import {
  zodStringToNumberWithDefault,
  zodTimestampInSecondsNoDefault,
} from '@/lib/utils/zod_schema/common';
import { DEFAULT_PAGE_NUMBER } from '@/constants/display';
import { DEFAULT_PAGE_LIMIT } from '@/constants/config';
import { LabelType } from '@/constants/ledger';
import { VoucherType } from '@/constants/account';
import { SortOrder } from '@/constants/sort';

const ledgerNullSchema = z.union([z.object({}), z.string()]);

// Info: (20241112 - Shirley) 定義 Ledger 列表查詢參數的驗證器
const ledgerListQueryValidator = z.object({
  startDate: zodTimestampInSecondsNoDefault(),
  endDate: zodTimestampInSecondsNoDefault(),
  startAccountNo: z.string().optional(),
  endAccountNo: z.string().optional(),
  labelType: z
    .enum([LabelType.GENERAL, LabelType.DETAILED, LabelType.ALL])
    .optional()
    .default(LabelType.GENERAL),
  page: zodStringToNumberWithDefault(DEFAULT_PAGE_NUMBER),
  pageSize: zodStringToNumberWithDefault(DEFAULT_PAGE_LIMIT).or(z.literal('infinity')),
});

// Info: (20241112 - Shirley) 定義 Ledger 列表請求體的驗證器（目前無需驗證）
const ledgerListBodyValidator = z.object({});

// Info: (20241112 - Shirley) 定義 Ledger 列表回應的驗證器
const ledgerListResponseValidator = z.object({
  currencyAlias: z.string(),
  items: z.object({
    data: z.array(
      z.object({
        id: z.number(),
        accountId: z.number(),
        voucherDate: z.number(),
        no: z.string(),
        accountingTitle: z.string(),
        voucherNumber: z.string(),
        particulars: z.string(),
        debitAmount: z.number(),
        creditAmount: z.number(),
        balance: z.number(),
        voucherType: z.enum([VoucherType.EXPENSE, VoucherType.RECEIVE, VoucherType.TRANSFER]), // Info: (20241112 - Shirley) 請根據實際的 VoucherType 更新
        createdAt: z.number(),
        updatedAt: z.number(),
      })
    ),
    page: z.number(),
    totalPages: z.number(),
    totalCount: z.number(),
    pageSize: z.union([z.number(), z.literal('infinity')]),
    hasNextPage: z.boolean(),
    hasPreviousPage: z.boolean(),
    sort: z.array(
      z.object({
        sortBy: z.string(),
        sortOrder: z.enum([SortOrder.ASC, SortOrder.DESC]),
      })
    ),
  }),
  total: z.object({
    totalDebitAmount: z.number(),
    totalCreditAmount: z.number(),
    createdAt: z.number(),
    updatedAt: z.number(),
  }),
});

// Info: (20241112 - Shirley) 定義 Ledger 列表的 Zod 驗證器
export const ledgerListValidator: IZodValidator<
  (typeof ledgerListQueryValidator)['shape'],
  (typeof ledgerListBodyValidator)['shape']
> = {
  query: ledgerListQueryValidator,
  body: ledgerListBodyValidator,
};

// Info: (20241112 - Shirley) 定義 Ledger 列表的輸入及輸出類型
export const ledgerListSchema = {
  input: {
    querySchema: ledgerListQueryValidator,
    bodySchema: ledgerListBodyValidator,
  },
  outputSchema: ledgerListResponseValidator,
  frontend: ledgerNullSchema,
};
