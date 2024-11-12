import { z } from 'zod';
import { zodStringToNumber, zodStringToNumberWithDefault } from '@/lib/utils/zod_schema/common';
import { DEFAULT_PAGE_NUMBER } from '@/constants/display';
import { DEFAULT_PAGE_LIMIT } from '@/constants/config';
import { LabelType } from '@/constants/ledger';
import { SortOrder } from '@/constants/sort';
import { EventType, VoucherType } from '@/constants/account';

const ledgerNullSchema = z.union([z.object({}), z.string()]);

// Info: (20241112 - Shirley) 定義 Ledger 列表查詢參數的驗證器
const ledgerListQuerySchema = z.object({
  companyId: zodStringToNumber,
  startDate: zodStringToNumber,
  endDate: zodStringToNumber,
  startAccountNo: z.string().optional(),
  endAccountNo: z.string().optional(),
  labelType: z
    .enum([LabelType.GENERAL, LabelType.DETAILED, LabelType.ALL])
    .optional()
    .default(LabelType.GENERAL),
  page: zodStringToNumberWithDefault(DEFAULT_PAGE_NUMBER),
  pageSize: zodStringToNumberWithDefault(DEFAULT_PAGE_LIMIT),
});

// Info: (20241112 - Shirley) 定義 Ledger 列表回應的驗證器
const ledgerListResponseSchema = z.object({
  currencyAlias: z.string(),
  items: z.object({
    data: z.array(
      z.object({
        id: z.number(),
        voucherDate: z.number(),
        no: z.string(),
        accountingTitle: z.string(),
        voucherNumber: z.string(),
        voucherType: z.enum([
          // TODO: (20241112 - Shirley) Voucher type 要改成 Event type ？
          VoucherType.EXPENSE,
          VoucherType.RECEIVE,
          VoucherType.TRANSFER,

          EventType.INCOME,
          EventType.PAYMENT,
          EventType.TRANSFER,
        ]),
        particulars: z.string(),
        debitAmount: z.number(),
        creditAmount: z.number(),
        balance: z.number(),
        createdAt: z.number(),
        updatedAt: z.number(),
      })
    ),
    page: z.number(),
    totalPages: z.number(),
    totalCount: z.number(),
    pageSize: z.number(),
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

// Info: (20241112 - Shirley) 定義 Ledger 列表的輸入及輸出類型
export const ledgerListSchema = {
  input: {
    querySchema: ledgerListQuerySchema,
    bodySchema: ledgerNullSchema,
  },
  outputSchema: ledgerListResponseSchema,
  frontend: ledgerNullSchema,
};
