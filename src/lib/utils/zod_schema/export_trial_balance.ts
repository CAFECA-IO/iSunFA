import { z } from 'zod';
import { nullSchema, zodStringToNumber } from '@/lib/utils/zod_schema/common';

// Info: (20241213 - Shirley) 查詢參數驗證器
const IExportTrialBalancePostQueryValidator = z.object({
  companyId: zodStringToNumber,
  // TODO: (20250115 - Shirley) 現在在 middleware 驗證用 z.string().optional()、進到 API 再用 `parseSortOption` 去 parse 或給予預設 sort option；之後要改成用 zodFilterSectionSortingOptions 去 parse
  sortOption: z.string().optional(),
});

// Info: (20241213 - Shirley) 匯出欄位驗證器
export const exportTrialBalanceFieldsSchema = z.enum([
  'no',
  'accountingTitle',
  'beginningDebitAmount',
  'beginningCreditAmount',
  'midtermDebitAmount',
  'midtermCreditAmount',
  'endingDebitAmount',
  'endingCreditAmount',
]);

// Info: (20241213 - Shirley) 過濾條件驗證器
const exportTrialBalanceFiltersSchema = z.object({
  startDate: z.number(),
  endDate: z.number(),
});

// Info: (20241213 - Shirley) 匯出選項驗證器
const exportTrialBalanceOptionsSchema = z.object({
  language: z.enum(['zh-TW', 'en-US']).optional().default('zh-TW'),
  timezone: z.string().optional().default('+0800'),
  fields: z.array(exportTrialBalanceFieldsSchema).optional().default([]),
});

// Info: (20241213 - Shirley) Post body schema
const IExportTrialBalancePostBodySchema = z.object({
  fileType: z.literal('csv'),
  filters: exportTrialBalanceFiltersSchema,
  options: exportTrialBalanceOptionsSchema.optional(),
});

// Info: (20241213 - Shirley) 匯出 schema
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
