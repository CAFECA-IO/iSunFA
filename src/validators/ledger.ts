import { z } from "zod";
import { LabelType } from "@/constants/ledger";
import { LedgerSorting } from "@/constants/sort";

// Info: (20260724 - Julian) 可解析為有效日期的字串（避免 NaN 造成靜默期間誤判）
const validDateString = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date string");

// Info: (20260724 - Julian) 分類帳列表查詢參數驗證。日期為必填 ISO 字串；科目區間與帳別為可選。
export const LedgerQuerySchema = z.object({
  startDate: validDateString,
  endDate: validDateString,
  startAccountNo: z.string().optional(),
  endAccountNo: z.string().optional(),
  labelType: z.nativeEnum(LabelType).default(LabelType.ALL),
  sorting: z.nativeEnum(LedgerSorting).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(1000).default(100),
});

export type ILedgerQuery = z.infer<typeof LedgerQuerySchema>;
