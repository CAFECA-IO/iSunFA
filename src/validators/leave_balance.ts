import { z } from "zod";
import { isoDateSchema } from "@/validators/attendance";
import { MINUTES_PER_DAY } from "@/constants/attendance";

/**
 * Info: (20260817 - Julian) 額度查詢與人工調整的 Payload 驗證（L7 / L8 / L9 / L33）。
 *
 * 依 coding_guidelines §2.3，Zod schema **嚴禁寫在 `route.ts` 內**。
 */

export const leaveBalanceQuerySchema = z.object({
  employeeId: z.string().uuid().optional(),
  asOfDate: isoDateSchema.optional(),
});

export const leaveLedgerQuerySchema = z.object({
  leavePolicyId: z.string().uuid().optional(),
  // Info: (20260817 - Julian) 對帳畫面一次看不了幾百筆；上界避免無意間拉出整本帳
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

/**
 * Info: (20260817 - Julian) 人工調整（L9）。
 *
 * `deltaMinutes` 上下界取 ±366 天：一次調整超過一年的額度不是調整，
 * 是資料錯誤 —— 而它會安靜地生效（調整沒有任何後續檢查）。
 *
 * `reason` **必填且不可為空白**：一筆沒有理由的額度調整，
 * 事後沒有人能判斷它合不合理（同 `LeaveGrant.reason` 的欄位註解）。
 * `.trim().min(1)` 而不是 `.min(1)` —— 一個空格能通過後者。
 */
export const leaveBalanceAdjustSchema = z.object({
  leavePolicyId: z.string().uuid(),
  deltaMinutes: z
    .number()
    .int()
    .min(-366 * MINUTES_PER_DAY)
    .max(366 * MINUTES_PER_DAY),
  reason: z.string().trim().min(1).max(500),
});

// Info: (20260817 - Julian) L33：把額度補到某一天為止。省略 asOfDate 即今日
export const leaveAccrualRunSchema = z.object({
  employeeId: z.string().uuid().optional(),
  asOfDate: isoDateSchema.optional(),
});
