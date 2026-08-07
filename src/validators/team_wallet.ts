import { z } from "zod";
import { ALLOCATION_DIRECTION } from "@/constants/subscription_quota";
import { bigIntStringSchema } from "@/validators/common";

/**
 * Info: (20260807 - Luphia) 團隊錢包 API 驗證（設計書 §7）。
 * 金額一律 BigInt 字串傳輸；Zod schema 集中於此，route.ts 只呼叫 safeParse。
 */

export const teamWalletPurchaseSchema = z.object({
  creditPlanId: z.string().min(1),
  paymentMethodId: z.string().min(1),
});

export const teamWalletAllocationSchema = z.object({
  userId: z.string().min(1),
  amount: bigIntStringSchema,
  direction: z.enum([
    ALLOCATION_DIRECTION.ALLOCATE,
    ALLOCATION_DIRECTION.REVOKE,
  ]),
  idempotencyKey: z.string().min(1).max(255).optional(),
});

export const teamWalletLedgerQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
