import { prisma } from "@/lib/prisma";
import { leaveGrantRepo } from "@/repositories/leave_grant.repo";
import {
  sumExpiringSoonMinutes,
  sumLedgerMinutes,
} from "@/repositories/leave_ledger";
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
 * 它是**冪等**的：同一天跑兩次的結果相同。
 *
 * ## 這一支與排程的分工（review 第 10 輪第 2 條）
 *
 * 固定的勾稽已經掛在 Worker 上了（`services/cron/leave_balance_reconcile.cron.ts`，
 * 由 `scripts/run_worker.ts` 每小時叫一次）—— 手動跑一支腳本不是排程，
 * 而「沒有人會固定去按的動作」與「沒有呼叫端」在效果上是同一件事。
 *
 * 這一支留著是因為它多了兩件排程不做的事：
 *
 * - `--dry-run`：**只比對不寫入**，供上線前驗收（見下方它為什麼必須真的比對）。
 * - `--book`：限定單一帳本，供事故排查。
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
 *
 * Info: (20260824 - Julian) 查詢本體改走 `leaveGrantRepo.listReconcileScopes`
 * （review 阻擋 2 的同一支）。
 *
 * 這支腳本與那支排程掃的必須是**同一組**：兩邊各寫一次 distinct，
 * 就會出現「試跑掃到 300 組、排程掃到 280 組」而沒有人看得出差別。
 * `--book` 的過濾因此下推到那支方法的參數裡。
 */
const scopesOf = async (accountBookId: string | null) =>
  leaveGrantRepo.listReconcileScopes(
    accountBookId === null ? undefined : { accountBookId },
  );

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
    const before = await leaveGrantRepo.findBalanceSnapshot({
      employeeId: scope.employeeId,
      leavePolicyId: scope.leavePolicyId,
    });

    try {
      /**
       * Info: (20260820 - Julian) `--dry-run` 也要**真的比對**（review 第 10 輪第 2 條）。
       *
       * 第一版是 `if (args.dryRun) continue;` —— `before` 查了卻沒用、
       * `mismatched` 永不遞增，於是結尾一律印「0 組不一致」。
       * 而部署檢查表把它寫成「先看規模」：**一支在缺陷存在時照樣回報 0 的
       * 驗收**，會被當成「上線前確認過沒有分岔」的憑據（checklist §1.9）。
       * 那比沒有這個選項危險得多。
       *
       * 現在兩條路徑算的是**同一組數字**，差別只在寫不寫：
       * `rebuildBalanceWithin` 的本體就是 `sumLedgerMinutes` ＋
       * `sumExpiringSoonMinutes`，dry-run 直接呼叫那兩支，不經過 upsert。
       * 各自抄一份會讓「試跑說沒事、真跑改了一堆」變成可能。
       */
      const after = args.dryRun
        ? await prisma.$transaction(async (tx) => ({
            remainingMinutes: await sumLedgerMinutes(tx, scope),
            expiringSoonMinutes: await sumExpiringSoonMinutes(tx, {
              ...scope,
              asOfDate,
            }),
          }))
        : /**
           * Info: (20260821 - Julian) 重建直接回兩欄，不再讀回快取
           * （review 第 16 輪）。
           *
           * 先前是重建之後再 `findUnique` 把 `expiringSoonMinutes` 撈回來。
           * 那個值是「剛剛寫進去的東西」而不是「算出來的東西」——
           * 拿它去驗 `writeBalance` 寫得對不對，等於用被測物當 oracle
           * （checklist §1.8）。現在兩條路徑拿到的都是計算的產物。
           */
          await leaveGrantRepo.rebuildBalance({
            accountBookId: scope.accountBookId,
            employeeId: scope.employeeId,
            leavePolicyId: scope.leavePolicyId,
            asOfDate,
            reconciledAt,
          });

      /**
       * Info: (20260820 - Julian) 兩欄都比。只比 `remainingMinutes` 的話，
       * 「即將到期從來沒有人算過」（M13 的症狀）在報告上是看不見的 ——
       * 而那正是這支腳本存在的一半理由。
       */
      const cacheRemaining = before?.remainingMinutes ?? null;
      const cacheExpiring = before?.expiringSoonMinutes ?? null;
      const differs =
        before === null ||
        cacheRemaining !== after.remainingMinutes ||
        cacheExpiring !== after.expiringSoonMinutes;

      if (differs) {
        mismatched += 1;
        process.stdout.write(
          `[reconcile] MISMATCH employee=${scope.employeeId} policy=${scope.leavePolicyId}` +
            ` remaining: cache=${cacheRemaining ?? "(none)"} ledger=${after.remainingMinutes}` +
            ` expiringSoon: cache=${cacheExpiring ?? "(none)"} ledger=${after.expiringSoonMinutes}\n`,
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
    `[reconcile] 完成：${scopes.length} 組，${mismatched} 組與帳本不一致` +
      `（${args.dryRun ? "dry-run，未寫入" : "已依帳本覆寫"}），${failed} 組失敗\n`,
  );
  /**
   * Info: (20260820 - Julian) dry-run 有不一致時也以非零結束
   * （review 第 10 輪第 2 條）。
   *
   * 它的用途是上線前的驗收，而一個永遠 exit 0 的驗收在 CI 裡等於沒有跑。
   * 真跑時不算失敗：那時候不一致已經被修好了，那是它的工作。
   */
  if (failed > 0 || (args.dryRun && mismatched > 0)) process.exitCode = 1;
};

main()
  .catch((error: unknown) => {
    process.stderr.write(`[reconcile] ${(error as Error).stack}\n`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
