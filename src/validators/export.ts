// Info: (20260617 - Julian) 匯出功能專用的 Zod 驗證 Schema
import { z } from "zod";
import { dateParamSchema } from "@/validators/common";

export const ExportQuerySchema = z.object({
  startDate: dateParamSchema.optional(),
  endDate: dateParamSchema.optional(),
  includeUnverified: z
    .preprocess((val) => val === "true" || val === true, z.boolean())
    .optional(),
});
