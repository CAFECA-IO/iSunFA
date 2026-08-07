import { z } from "zod";
import {
  ALLOCATION_DIRECTION,
  BILLING_INTERVAL,
  TEAM_PLAN,
} from "@/constants/subscription_quota";
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

// Info: (20260807 - Luphia) 團隊額度付款（POST /order/[order_id]/team_quota_payment）
export const teamQuotaPaymentSchema = z.object({
  teamId: z.string().min(1),
});

// Info: (20260807 - Luphia) PUT /subscription（OWNER 專屬）：free 免付款直接降級，付費方案需綁卡
export const teamSubscriptionUpdateSchema = z.object({
  planId: z.enum([TEAM_PLAN.FREE, TEAM_PLAN.TEAM, TEAM_PLAN.BUSINESS]),
  billingInterval: z
    .enum([BILLING_INTERVAL.MONTH, BILLING_INTERVAL.YEAR])
    .default(BILLING_INTERVAL.MONTH),
  paymentMethodId: z.string().min(1).optional(),
});
