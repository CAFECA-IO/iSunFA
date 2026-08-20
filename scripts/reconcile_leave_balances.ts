import { prisma } from "@/lib/prisma";
import { leaveGrantRepo } from "@/repositories/leave_grant.repo";
import { DEMO_TIME_ZONE } from "@/constants/attendance";
import { toZonedParts } from "@/lib/utils/attendance_time";

/**
 * Info: (20260820 - Julian) 額度快取的每日勾稽（review 第 6 輪 M13／M14）。
 *
 * ## 為什麼非有這一支不可
 *
 * ADR 022 §2.3 的第二條規矩是「`LeaveBalance` 是快取，隨時可由帳本重建」，
 * 而在這支腳本之前，`rebuildBalance` **零產品呼叫端** —— 唯一的命中是
 * 測試裡一個 `return 0` 的替身。連帶兩件事從來沒有發生過：
 *
 * - `LeaveBalance.reconciledAt` 永遠是 null。畫面因此答不出
 *   「這個數字上一次被對過帳是什麼時候」。
 * - `expiringSoonMinutes` 零寫入者（M13）。L7 額度卡對**每一個人**都顯示
 *   「即將到期 0 分鐘」，前端會把它讀成「沒有東西快過期」，
 *   而真相是「沒有人算過」。特休屆期未休依 §38 IV 要折現。
 *
 * 一支寫得再好的重建函式，沒有人呼叫它就不是可重建性 ——
 * 那只是一段能通過測試的程式碼（checklist §1.7）。
 *
 * ## 為什麼「即將到期」一定要有排程，而不是寫入時算一次
 *
 * 它是相對於**今天**的量：今天沒有任何額度異動，明天仍然會有一批進入
 * 「即將到期」的窗。只在授予／扣減時算，就會有一批在無人動它的日子裡
 * 靜靜地過期，而畫面到最後一刻都顯示 0。
 *
 * ## 怎麼跑
 *
 * ```
 * npx tsx scripts/reconcile_leave_balances.ts               # 全部帳本
 * npx tsx scripts/reconcile_leave_balances.ts --book <id>   # 單一帳本
 * npx tsx scripts/reconcile_leave_balances.ts --dry-run     # 只報差異，不寫
 * ```
 *
 * 建議掛每日排程（時區內的凌晨）。它是**冪等**的：同一天跑兩次的結果相同。
 *
 * ToDo: (20260820 - Julian) 目前是手動／cron 腳本。專案的 Worker 框架
 * （`scripts/run_worker.ts`）就緒後改掛上去，並把差異數送進告警。
 */

interface IArgs {
  accountBookId: string | null;
  dryRun: boolean;
}

const parseArgs = (argv: readonly string[]): IArgs => {
  const bookIndex = argv.indexOf("--book");
  return {
    accountBookId:
      bookIndex >= 0 && argv[bookIndex + 1] ? argv[bookIndex + 1] : null,
    dryRun: argv.includes("--dry-run"),
  };
};

/**
 * Info: (20260820 - Julian) 掃描的是 `LeaveGrant` 而不是 `LeaveBalance`。
 *
 * 兩者的差別正是這支腳本要抓的東西之一：一個從來沒有被寫過的
 * `LeaveBalance` 列（授予寫入失敗、或那一列在 `writeBalance` 補上 upsert
 * 之前就存在）在 `LeaveBalance` 裡查不到，而它的帳本明明有分錄。
 * 從批次那一側掃，這種列會被建出來。
 */
const scopesOf = async (accountBookId: string | null) => {
  const grants = await prisma.leaveGrant.findMany({
    where: accountBookId === null ? {} : { accountBookId },
    select: {
      accountBookId: true,
      employeeId: true,
      leavePolicyId: true,
    },
    distinct: ["accountBookId", "employeeId", "leavePolicyId"],
  });
  return grants;
};

const main = async (): Promise<void> => {
  const args = parseArgs(process.argv.slice(2));
  const reconciledAt = new Date();
  const asOfDate = toZonedParts(reconciledAt, DEMO_TIME_ZONE).isoDate;

  const scopes = await scopesOf(args.accountBookId);
  process.stdout.write(
    `[reconcile] ${scopes.length} 組（帳本 × 員工 × 假別），基準日 ${asOfDate}${args.dryRun ? "，dry-run" : ""}\n`,
  );

  let mismatched = 0;
  let failed = 0;

  for (const scope of scopes) {
    /**
     * Info: (20260820 - Julian) 先讀快取原值，再重建 —— 差異要報得出來。
     * 只呼叫重建的話，這支腳本會安靜地修好每一件事，
     * 而「快取與帳本分岔過幾次」正是 ADR 022 §8.2 要的那個訊號。
     */
    const before = await prisma.leaveBalance.findUnique({
      where: {
        employeeId_leavePolicyId: {
          employeeId: scope.employeeId,
          leavePolicyId: scope.leavePolicyId,
        },
      },
      select: { remainingMinutes: true, expiringSoonMinutes: true },
    });

    try {
      if (args.dryRun) {
        continue;
      }
      const after = await leaveGrantRepo.rebuildBalance({
        accountBookId: scope.accountBookId,
        employeeId: scope.employeeId,
        leavePolicyId: scope.leavePolicyId,
        asOfDate,
        reconciledAt,
      });

      if (before === null || before.remainingMinutes !== after) {
        mismatched += 1;
        process.stdout.write(
          `[reconcile] MISMATCH employee=${scope.employeeId} policy=${scope.leavePolicyId} cache=${before?.remainingMinutes ?? "(none)"} ledger=${after}\n`,
        );
      }
    } catch (error) {
      /**
       * Info: (20260820 - Julian) 一組壞掉不該讓其餘的都不對帳。
       * 但**要數出來**：一支報告「0 筆不一致」而其實有 30 組沒跑成功的腳本，
       * 比沒有這支腳本更危險。
       */
      failed += 1;
      process.stdout.write(
        `[reconcile] FAILED employee=${scope.employeeId} policy=${scope.leavePolicyId}: ${(error as Error).message}\n`,
      );
    }
  }

  process.stdout.write(
    `[reconcile] 完成：${scopes.length} 組，${mismatched} 組與帳本不一致（已依帳本覆寫），${failed} 組失敗\n`,
  );
  if (failed > 0) process.exitCode = 1;
};

main()
  .catch((error: unknown) => {
    process.stderr.write(`[reconcile] ${(error as Error).stack}\n`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
