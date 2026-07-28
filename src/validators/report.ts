import { z } from "zod";
import { ReportType, ReportPeriod } from "@/constants/financial_report";
import { TrialBalanceSorting } from "@/constants/sort";

// Info: (20260728 - Julian) 報表查詢參數驗證。集中於 validators/（禁止在 route.ts 直接以 as 斷言未驗證外部輸入，遵守 §2「零容忍未驗證外部輸入」）。
// Info: (20260728 - Julian) period 未帶時預設 ALL_YEAR；year 可選（未帶則由 route 取當年）；sorting 僅試算表使用，其餘報表忽略。
export const ReportQuerySchema = z.object({
  reportType: z.nativeEnum(ReportType),
  period: z.nativeEnum(ReportPeriod).default(ReportPeriod.ALL_YEAR),
  year: z.coerce.number().int().positive().optional(),
  sorting: z.nativeEnum(TrialBalanceSorting).optional(),
});

export type IReportQuery = z.infer<typeof ReportQuerySchema>;
