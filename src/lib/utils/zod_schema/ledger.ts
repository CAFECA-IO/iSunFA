import { z } from 'zod';
import { zodStringToNumber, zodStringToNumberWithDefault } from '@/lib/utils/zod_schema/common';
import { DEFAULT_PAGE_NUMBER } from '@/constants/display';
import { DEFAULT_PAGE_LIMIT } from '@/constants/config';
import { LabelType } from '@/constants/ledger';
import { VoucherType } from '@/constants/account';
import { paginatedDataSchema } from '@/lib/utils/zod_schema/pagination';

const ledgerNullSchema = z.union([z.object({}), z.string()]);

// Info: (20241112 - Shirley) 定義 Ledger 列表查詢參數的驗證器
const ledgerListQuerySchema = z.object({
  accountBookId: zodStringToNumber,
  startDate: zodStringToNumber,
  endDate: zodStringToNumber,
  startAccountNo: z.string().optional(),
  endAccountNo: z.string().optional(),
  labelType: z.nativeEnum(LabelType).optional().default(LabelType.GENERAL),
  page: zodStringToNumberWithDefault(DEFAULT_PAGE_NUMBER),
  pageSize: zodStringToNumberWithDefault(DEFAULT_PAGE_LIMIT),
});

// Info: (20241112 - Shirley) 定義 Ledger 項目的驗證器
const ledgerItemSchema = z.object({
  id: z.number(),
  accountId: z.number(),
  voucherId: z.number(),
  voucherDate: z.number(),
  no: z.string(),
  accountingTitle: z.string(),
  voucherNumber: z.string(),
  voucherType: z.nativeEnum(VoucherType),
  particulars: z.string(),
  debitAmount: z.string(),
  creditAmount: z.string(),
  balance: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

// Info: (20241112 - Shirley) 定義 Ledger 列表回應的驗證器
const ledgerListResponseSchema = paginatedDataSchema(ledgerItemSchema).extend({
  note: z.string(),
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

export { ledgerListQuerySchema, ledgerItemSchema, ledgerListResponseSchema };

export type ILedgerQueryParams = z.infer<typeof ledgerListQuerySchema>;
export type ILedgerResponse = z.infer<typeof ledgerListResponseSchema>;
