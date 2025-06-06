import { z } from 'zod';
import { ExportAssetFileType, AssetSortBy, AssetFieldsMap } from '@/constants/export_asset';
import { SortOrder } from '@/constants/sort';

/**
 * Info: (20241108 - Shirley) Empty schema for Export API
 */
const assetExportNullSchema = z.union([z.object({}), z.string()]);

/**
 * Info: (20241108 - Shirley) Query schema for Export API
 */
const assetExportQuerySchema = z.object({
  accountBookId: z.string(),
});

const assetExportBodySchema = z.object({
  fileType: z.enum([ExportAssetFileType.CSV]),
  filters: z
    .object({
      type: z.string().optional(),
      status: z.string().optional(),
      startDate: z.number().optional(),
      endDate: z.number().optional(),
      searchQuery: z.string().optional(),
    })
    .optional(),
  sort: z
    .array(
      z.object({
        by: z.enum([
          AssetSortBy.ACQUISITION_DATE,
          AssetSortBy.PURCHASE_PRICE,
          AssetSortBy.REMAINING_LIFE,
          AssetSortBy.ACCUMULATED_DEPRECIATION,
          AssetSortBy.RESIDUAL_VALUE,
        ]),
        order: z.enum([SortOrder.ASC, SortOrder.DESC]),
      })
    )
    .optional(),
  options: z
    .object({
      language: z.enum(['zh-TW', 'en-US']).optional().default('zh-TW'),
      timezone: z.string().optional().default('+0800'),
      fields: z.array(z.enum(Object.keys(AssetFieldsMap) as [string, ...string[]])).optional(),
    })
    .optional(),
});

/**
 * Info: (20241108 - Shirley) Response schema for Export API
 * Define the output schema based on actual needs
 * 成功回應會是檔案，使用 any 類型
 */
const assetExportResponseSchema = z.any();

/**
 * Info: (20241108 - Shirley) Request validator for Export API
 */
export const assetExportValidator = {
  query: assetExportQuerySchema,
  body: assetExportBodySchema,
};

/**
 * Info: (20241108 - Shirley) Schema for Export API
 */
export const assetExportSchema = {
  input: {
    querySchema: assetExportQuerySchema,
    bodySchema: assetExportBodySchema,
  },
  outputSchema: assetExportResponseSchema,
  frontend: assetExportNullSchema,
};
