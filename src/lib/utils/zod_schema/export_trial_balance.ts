import { z } from 'zod';
import { nullSchema, zodStringToNumber } from '@/lib/utils/zod_schema/common';

// 查詢參數驗證器
const IExportTrialBalancePostQueryValidator = z.object({
  companyId: zodStringToNumber,
});

// 排序欄位驗證器
const sortFieldSchema = z.enum([
  'beginningCreditAmount',
  'beginningDebitAmount',
  'midtermCreditAmount',
  'midtermDebitAmount',
  'endingCreditAmount',
  'endingDebitAmount',
]);

// 排序物件驗證器
const sortSchema = z.object({
  by: sortFieldSchema,
  order: z.enum(['asc', 'desc']),
});

// 匯出欄位驗證器
export const exportTrialBalanceFieldsSchema = z.enum([
  'accountingTitle',
  'beginningCreditAmount',
  'beginningDebitAmount',
  'midtermCreditAmount',
  'midtermDebitAmount',
  'endingCreditAmount',
  'endingDebitAmount',
]);

// 過濾條件驗證器
const exportTrialBalanceFiltersSchema = z.object({
  startDate: z.number(),
  endDate: z.number(),
});

// 匯出選項驗證器
const exportTrialBalanceOptionsSchema = z.object({
  language: z.enum(['zh-TW', 'en-US']).optional().default('zh-TW'),
  timezone: z.string().optional().default('+0800'),
  fields: z.array(exportTrialBalanceFieldsSchema).optional().default([]),
});

// Post body schema
const IExportTrialBalancePostBodySchema = z.object({
  fileType: z.literal('csv'),
  filters: exportTrialBalanceFiltersSchema,
  sort: z.array(sortSchema).optional(),
  options: exportTrialBalanceOptionsSchema.optional(),
});

// 匯出 schema
export const exportTrialBalancePostSchema = {
  input: {
    querySchema: IExportTrialBalancePostQueryValidator,
    bodySchema: IExportTrialBalancePostBodySchema,
  },
  outputSchema: z.string(),
  frontend: nullSchema,
};

export type IExportTrialBalanceQueryParams = z.infer<typeof IExportTrialBalancePostQueryValidator>;
export type IExportTrialBalanceBody = z.infer<typeof IExportTrialBalancePostBodySchema>;
