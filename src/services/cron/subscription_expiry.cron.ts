import { logger } from "@/lib/utils/logger";
import { teamSubscriptionRepo } from "@/repositories/team_subscription.repo";

/**
 * Info: (20260807 - Luphia) 訂閱到期守護行程（設計書 §9 P4）。
 * - autoRenew = false：到期直接降級 free（status PAST_DUE 留稽核線索）。
 * - autoRenew = true：標記 PAST_DUE，額度即刻 fail-closed 到 free
 *   （resolveEffectivePlanId 防線）；自動扣款續訂為後續 issue。
 * Worker 未跑到的間隙不會多放額度——扣費側以 currentPeriodEnd 即時判定。
 */
export async function expireOverdueTeamSubscriptions(
  nowMs: number = Date.now(),
): Promise<{ downgraded: number; markedForRenewal: number }> {
  const downgraded = await teamSubscriptionRepo.expireOverdue(nowMs);
  const markedForRenewal =
    await teamSubscriptionRepo.markOverdueForRenewal(nowMs);

  if (downgraded > 0 || markedForRenewal > 0) {
    logger.info("team subscriptions expired", {
      downgraded,
      markedForRenewal,
    });
  }
  return { downgraded, markedForRenewal };
}
