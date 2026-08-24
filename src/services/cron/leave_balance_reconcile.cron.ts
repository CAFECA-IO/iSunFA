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

/**
 * Info: (20260820 - Julian) 一次勾稽的結果，供 log 與測試斷言。
 *
 * Info: (20260821 - Julian) **逐欄拆開**（review 第 16 輪）。
 *
 * 先前只有一個 `mismatched`，而比對只看 `remainingMinutes` ——
 * ADR 022 §8.1 對這條紅線的要求是「重建結果與快取**逐欄**相同」，
 * 那一版做不到。更糟的是漏掉的正是 `expiringSoonMinutes`：
 * 它是 M13 的那一欄，「畫面對每個人都顯示即將到期 0 分鐘」的症狀
 * 與「真的沒有即將到期」一模一樣，而這支排程本來就該是唯一看得出
 * 差別的地方（§38 IV 未休折現的前置提醒）。
 *
 * 兩欄分開數而不是只給一個總數：兩者的處置不同 —— 餘額漂掉是帳務問題
 * （有人繞過帳本改了快取），到期分鐘漂掉多半是這支排程自己漏跑。
 */
export interface ILeaveBalanceReconcileResult {
  scanned: number;
  /** Info: (20260821 - Julian) 任一派生欄位與帳本不符的組數（不是兩欄相加） */
  mismatched: number;
  mismatchedRemaining: number;
  mismatchedExpiringSoon: number;
  /**
   * Info: (20260821 - Julian) 這一次之前從來沒有被勾稽過的組數。
   *
   * `reconciledAt` 為 null 表示這一列從授予那一刻起就沒有人對過帳。
   * 它不算「不一致」（帳可能剛好是對的），但**它是這支排程沒在跑的證據** ——
   * 一個穩定運行的系統裡，第二次之後這個數字該是 0。
   */
  neverReconciled: number;
  failed: number;
}

export const runLeaveBalanceReconcile =
  async (): Promise<ILeaveBalanceReconcileResult> => {
    const reconciledAt = new Date();
    const asOfDate = toZonedParts(reconciledAt, DEMO_TIME_ZONE).isoDate;

    /**
     * Info: (20260824 - Julian) 掃描與讀快取都經由 repository（review 阻擋 2）。
     *
     * 這兩個查詢先前直接 `import { prisma }` 寫在這個檔案裡，而
     * CLAUDE.md §1 的規則是「Repository 是唯一能碰 Prisma/DB 的層級」——
     * 同一個檔案本來就已經在用 `leaveGrantRepo.rebuildBalance`，
     * 所以不是沒有路可走，是那兩支繞過去了。
     *
     * 掃的是 `LeaveGrant` 而不是 `LeaveBalance`：一個從來沒有被寫過的
     * 快取列在 `LeaveBalance` 裡查不到，而它的帳本明明有分錄。
     */
    const scopes = await leaveGrantRepo.listReconcileScopes();
    let mismatched = 0;
    let mismatchedRemaining = 0;
    let mismatchedExpiringSoon = 0;
    let neverReconciled = 0;
    let failed = 0;

    for (const scope of scopes) {
      /**
       * Info: (20260820 - Julian) 先讀快取原值再重建 —— 差異要數得出來。
       * 只呼叫重建的話，這支排程會安靜地修好每一件事，
       * 而「快取與帳本分岔過幾次」正是 ADR 022 §8.2 要的那個訊號。
       */
      const before = await leaveGrantRepo.findBalanceSnapshot({
        employeeId: scope.employeeId,
        leavePolicyId: scope.leavePolicyId,
      });

      try {
        const after = await leaveGrantRepo.rebuildBalance({
          ...scope,
          asOfDate,
          reconciledAt,
        });

        if (before === null) {
          /**
           * Info: (20260821 - Julian) 快取根本不存在 —— 兩欄都算漂。
           *
           * 這一列的帳本有分錄卻沒有快取列，畫面上那個假別會整個消失。
           * 從 `LeaveGrant` 那一側掃就是為了看見它（見 `scopesOf`）。
           */
          mismatched += 1;
          mismatchedRemaining += 1;
          mismatchedExpiringSoon += 1;
          neverReconciled += 1;
          logger.warn(
            `[leave] balance missing employee=${scope.employeeId} policy=${scope.leavePolicyId} ledger.remaining=${after.remainingMinutes} ledger.expiringSoon=${after.expiringSoonMinutes}`,
          );
        } else {
          if (before.reconciledAt === null) neverReconciled += 1;

          const remainingDrifted =
            before.remainingMinutes !== after.remainingMinutes;
          const expiringDrifted =
            before.expiringSoonMinutes !== after.expiringSoonMinutes;

          if (remainingDrifted) mismatchedRemaining += 1;
          if (expiringDrifted) mismatchedExpiringSoon += 1;

          if (remainingDrifted || expiringDrifted) {
            mismatched += 1;
            /**
             * Info: (20260821 - Julian) 兩欄都印出來，含**沒有漂的那一欄**。
             *
             * 只印漂掉的那一欄，事後看 log 的人分不出「另一欄是對的」
             * 與「另一欄沒有被檢查」—— 而後者正是這一輪要修掉的東西。
             */
            logger.warn(
              `[leave] balance mismatch employee=${scope.employeeId} policy=${scope.leavePolicyId}` +
                ` remaining: cache=${before.remainingMinutes} ledger=${after.remainingMinutes}${remainingDrifted ? " DRIFT" : ""}` +
                ` expiringSoon: cache=${before.expiringSoonMinutes} ledger=${after.expiringSoonMinutes}${expiringDrifted ? " DRIFT" : ""}`,
            );
          }
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

    if (mismatched > 0 || failed > 0 || neverReconciled > 0) {
      logger.warn(
        `[leave] balance reconcile: scanned=${scopes.length} mismatched=${mismatched}` +
          ` (remaining=${mismatchedRemaining} expiringSoon=${mismatchedExpiringSoon})` +
          ` neverReconciled=${neverReconciled} failed=${failed}`,
      );
    }

    return {
      scanned: scopes.length,
      mismatched,
      mismatchedRemaining,
      mismatchedExpiringSoon,
      neverReconciled,
      failed,
    };
  };
