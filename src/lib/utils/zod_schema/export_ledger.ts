import { z } from 'zod';
import { nullSchema, zodStringToNumber } from '@/lib/utils/zod_schema/common';
import { LabelType } from '@/constants/ledger';

// 查詢參數驗證器
const IExportLedgerPostQueryValidator = z.object({
  companyId: zodStringToNumber,
});

// 過濾條件驗證器
const exportLedgerFiltersSchema = z.object({
  startDate: z.number().optional(),
  endDate: z.number().optional(),
  startAccountNo: z.string().optional(),
  endAccountNo: z.string().optional(),
  labelType: z
    .enum([LabelType.GENERAL, LabelType.DETAILED, LabelType.ALL])
    .optional()
    .default(LabelType.GENERAL),
});

// 匯出選項驗證器
const exportLedgerOptionsSchema = z.object({
  language: z.enum(['zh-TW', 'en-US']).optional().default('zh-TW'),
  timezone: z.string().optional().default('+0800'),
  fields: z
    .array(
      z.enum([
        'voucherDate',
        'accountTitle',
        'debitAmount',
        'creditAmount',
        'balance',
        'particulars',
      ])
    )
    .optional(),
});

// 請求體驗證器
const IExportLedgerPostBodySchema = z.object({
  fileType: z.literal('csv'),
  filters: exportLedgerFiltersSchema.optional(),
  options: exportLedgerOptionsSchema.optional(),
});

// 因為是直接下載，output 使用 string
export const exportLedgerPostSchema = {
  input: {
    querySchema: IExportLedgerPostQueryValidator,
    bodySchema: IExportLedgerPostBodySchema,
  },
  // 直接下載的情況，實際上不會有 JSON 響應
  outputSchema: z.string(),
  frontend: nullSchema,
};

export type IExportLedgerQueryParams = z.infer<typeof IExportLedgerPostQueryValidator>;
export type IExportLedgerBody = z.infer<typeof IExportLedgerPostBodySchema>;
