import { z } from "zod";
import { TrialBalanceSorting } from "@/constants/sort";

// Info: (20260724 - Julian) 試算表列表查詢參數驗證。日期為可選的 ISO 字串；未提供時由 Service 以 401 週期補預設。
export const TrialBalanceQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  sorting: z.nativeEnum(TrialBalanceSorting).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(1000).default(100),
});

export type ITrialBalanceQuery = z.infer<typeof TrialBalanceQuerySchema>;
