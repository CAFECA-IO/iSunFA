import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/utils/logger";
import { DEMO_TIME_ZONE } from "@/constants/attendance";
import { toZonedParts } from "@/lib/utils/attendance_time";
import { leaveGrantRepo } from "@/repositories/leave_grant.repo";

/**
 * Info: (20260820 - Julian) 額度快取的每日勾稽（ADR 022 §2.3 第二條規矩）。
 *
 * ## 為什麼是排程而不只是一支手動腳本
 *
 * `scripts/reconcile_leave_balances.ts` 先前是 `rebuildBalance` **唯一**的
 * 呼叫端，而它要人手動 `npx tsx` 去跑 —— 一個沒有人會固定去按的動作，
 * 與「沒有呼叫端」在效果上是同一件事（review 第 10 輪第 2 條）。
 * 兩件本來就不會發生的事因此一直沒發生：
 *
 * - `LeaveBalance.reconciledAt` 永遠 null，畫面答不出「上次對帳是什麼時候」。
 * - `expiringSoonMinutes` 沒有寫入者。L7 額度卡對每一個人都顯示
 *   「即將到期 0 分鐘」，而真相是「沒有人算過」。特休屆期未休依 §38 IV 要折現。
 *
 * ## 為什麼「即將到期」非得靠排程
 *
 * 它是相對於**今天**的量：今天沒有任何額度異動，明天仍然會有一批進入
 * 「即將到期」的窗。只在授予／扣減時算，就會有一批在無人動它的日子裡
 * 靜靜過期，而畫面到最後一刻都顯示 0。
 *
 * ## 冪等
 *
 * 重建是「依帳本重算並覆寫」，同一天跑幾次結果相同 —— 這也是它敢被排程
 * 每小時叫一次的理由（`run_worker` 的迴圈不保證恰好一天一次）。
 *
 * 手動腳本留著：它多了 `--dry-run` 與單一帳本，供上線前驗收與事故排查。
 */

/** Info: (20260820 - Julian) 一次勾稽的結果，供 log 與測試斷言 */
export interface ILeaveBalanceReconcileResult {
  scanned: number;
  mismatched: number;
  failed: number;
}

/**
 * Info: (20260820 - Julian) 掃 `LeaveGrant` 而不是 `LeaveBalance`。
 *
 * 兩者的差別正是要抓的東西之一：一個從來沒有被寫過的 `LeaveBalance` 列
 * 在 `LeaveBalance` 裡查不到，而它的帳本明明有分錄。從批次那一側掃，
 * 這種列會被建出來。
 */
const scopesOf = async (): Promise<
  { accountBookId: string; employeeId: string; leavePolicyId: string }[]
> =>
  prisma.leaveGrant.findMany({
    select: { accountBookId: true, employeeId: true, leavePolicyId: true },
    distinct: ["accountBookId", "employeeId", "leavePolicyId"],
  });

export const runLeaveBalanceReconcile =
  async (): Promise<ILeaveBalanceReconcileResult> => {
    const reconciledAt = new Date();
    const asOfDate = toZonedParts(reconciledAt, DEMO_TIME_ZONE).isoDate;

    const scopes = await scopesOf();
    let mismatched = 0;
    let failed = 0;

    for (const scope of scopes) {
      /**
       * Info: (20260820 - Julian) 先讀快取原值再重建 —— 差異要數得出來。
       * 只呼叫重建的話，這支排程會安靜地修好每一件事，
       * 而「快取與帳本分岔過幾次」正是 ADR 022 §8.2 要的那個訊號。
       */
      const before = await prisma.leaveBalance.findUnique({
        where: {
          employeeId_leavePolicyId: {
            employeeId: scope.employeeId,
            leavePolicyId: scope.leavePolicyId,
          },
        },
        select: { remainingMinutes: true },
      });

      try {
        const after = await leaveGrantRepo.rebuildBalance({
          ...scope,
          asOfDate,
          reconciledAt,
        });
        if (before === null || before.remainingMinutes !== after) {
          mismatched += 1;
          logger.warn(
            `[leave] balance mismatch employee=${scope.employeeId} policy=${scope.leavePolicyId} cache=${before?.remainingMinutes ?? "(none)"} ledger=${after}`,
          );
        }
      } catch (error) {
        /**
         * Info: (20260820 - Julian) 一組壞掉不該讓其餘的都不對帳 —— 但**要數出來**。
         * 一支回報「0 組不一致」而其實有 30 組沒跑成功的排程，
         * 比沒有這支排程更危險。
         */
        failed += 1;
        logger.error(
          `[leave] balance reconcile failed employee=${scope.employeeId} policy=${scope.leavePolicyId}: ${(error as Error).message}`,
        );
      }
    }

    if (mismatched > 0 || failed > 0) {
      logger.warn(
        `[leave] balance reconcile: scanned=${scopes.length} mismatched=${mismatched} failed=${failed}`,
      );
    }

    return { scanned: scopes.length, mismatched, failed };
  };
