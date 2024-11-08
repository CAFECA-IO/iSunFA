import { z } from 'zod';
import { ExportType, ExportFileType } from '@/constants/export_file';

/**
 * Export API 空白 schema
 */
const exportNullSchema = z.union([z.object({}), z.string()]);

/**
 * Export API 請求驗證規則
 */
const exportListQuerySchema = exportNullSchema; // 假設不需要 query 參數

const exportListBodySchema = z.object({
  exportType: z.enum([ExportType.ASSETS]),
  fileType: z.enum([ExportFileType.CSV]),
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
        by: z.string(),
        order: z.enum(['asc', 'desc']),
      })
    )
    .optional(),
  options: z
    .object({
      fields: z.array(z.string()).optional(),
      timezone: z.string().optional(),
    })
    .optional(),
});

/**
 * Export API 響應驗證規則
 * 根據實際需求定義輸出 schema
 */
const exportListResponseSchema = z.object({
  fileUrl: z.string().url(),
  status: z.string(),
});

/**
 * Export API 請求驗證器
 */
export const exportListValidator = {
  query: exportListQuerySchema,
  body: exportListBodySchema,
};

/**
 * Export API schema
 */
export const fileExportSchema = {
  input: {
    querySchema: exportListQuerySchema,
    bodySchema: exportListBodySchema,
  },
  outputSchema: exportListResponseSchema,
  frontend: exportNullSchema,
};
