import { z } from "zod";
import { LabelType } from "@/constants/ledger";
import { LedgerSorting } from "@/constants/sort";

// Info: (20260724 - Julian) 分類帳列表查詢參數驗證。日期為必填 ISO 字串；科目區間與帳別為可選。
export const LedgerQuerySchema = z.object({
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  startAccountNo: z.string().optional(),
  endAccountNo: z.string().optional(),
  labelType: z.nativeEnum(LabelType).default(LabelType.ALL),
  sorting: z.nativeEnum(LedgerSorting).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(1000).default(100),
});

export type ILedgerQuery = z.infer<typeof LedgerQuerySchema>;
