import { z } from "zod";
import { LabelType } from "@/constants/ledger";
import { LedgerSorting } from "@/constants/sort";

// Info: (20260727 - Julian) 可解析為有效日期的字串（避免 NaN 造成靜默期間誤判）
const validDateString = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date string");

// Info: (20260727 - Julian) 分類帳列表查詢參數驗證。日期為可選（未指定則比照傳票管理顯示全部）；科目區間與帳別為可選。
export const LedgerQuerySchema = z.object({
  startDate: validDateString.optional(),
  endDate: validDateString.optional(),
  startAccountNo: z.string().optional(),
  endAccountNo: z.string().optional(),
  keyword: z.string().optional(),
  labelType: z.nativeEnum(LabelType).default(LabelType.ALL),
  sorting: z.nativeEnum(LedgerSorting).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(1000).default(100),
});

export type ILedgerQuery = z.infer<typeof LedgerQuerySchema>;
