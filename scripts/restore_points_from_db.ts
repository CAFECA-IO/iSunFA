/**
 * Info: (20261015 - Luphia) 依資料庫紀錄恢復用戶點數（區塊鏈損毀後）。
 *
 * 自建鏈損毀、CreditPoint 的鏈上餘額無法讀取。這支以 DB 裡每一筆曾讓點數進出的紀錄
 * （購點／後台發放／註冊獎勵／活動贈點／團隊分配／消費／退款）重建 `PointLedger`，
 * 並同步 `User.pointBalance`。規則全文見 `src/services/point_recovery.service.ts`。
 *
 * 安全性：
 * - 預設**預演**，不寫任何東西；加 `--commit` 才寫入。
 * - 每筆分錄的冪等鍵與線上流程相同，重跑不會重複入帳，上線後再跑也安全。
 * - 規則未涵蓋的紀錄只列在 anomalies，不入帳，交人工判斷。
 *
 * 用法：
 *
 *     npm run restore_points                              # 預演，全部使用者
 *     npm run restore_points -- --user <userId>           # 預演，單一使用者
 *     npm run restore_points -- --commit                  # 實際寫入
 *     npm run restore_points -- --verify                  # 只勾稽餘額快取與帳本
 *     npm run restore_points -- --verify --fix-cache      # 勾稽並以帳本覆寫快取
 *     npm run restore_points -- --report <path.csv>       # 另存每位使用者的明細
 */
import fs from "fs/promises";
import path from "path";
import {
  applyRecoveryPlan,
  loadRecoveryPlan,
  repairBalanceCache,
  summarizePlan,
  verifyBalances,
} from "@/services/point_recovery.service";

interface ICliOptions {
  commit: boolean;
  verifyOnly: boolean;
  fixCache: boolean;
  userId?: string;
  reportPath?: string;
}

function readFlagValue(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index === -1) return undefined;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

function parseArgs(args: string[]): ICliOptions {
  return {
    commit: args.includes("--commit"),
    verifyOnly: args.includes("--verify"),
    fixCache: args.includes("--fix-cache"),
    userId: readFlagValue(args, "--user"),
    reportPath: readFlagValue(args, "--report"),
  };
}

async function runVerify(options: ICliOptions): Promise<number> {
  const { checked, mismatches, negatives } = await verifyBalances(
    options.userId,
  );
  console.log(
    `[restore-points] verify: ${checked} users checked, ${mismatches.length} cache mismatches, ${negatives.length} negative balances`,
  );
  for (const row of mismatches) {
    console.log(
      `  mismatch user=${row.userId} cached=${row.cached} ledger=${row.ledger}`,
    );
  }
  for (const row of negatives) {
    console.log(`  negative user=${row.userId} ledger=${row.ledger}`);
  }
  if (mismatches.length > 0 && options.fixCache) {
    await repairBalanceCache(mismatches);
    console.log(
      `[restore-points] cache overwritten from ledger for ${mismatches.length} users`,
    );
    return 0;
  }
  return mismatches.length > 0 ? 1 : 0;
}

async function main(): Promise<number> {
  const options = parseArgs(process.argv.slice(2));

  if (options.verifyOnly) return runVerify(options);

  const plan = await loadRecoveryPlan(options.userId);
  const summary = summarizePlan(plan);
  const totalNet = summary.reduce((acc, row) => acc + row.net, BigInt(0));
  const negativeUsers = summary.filter((row) => row.net < 0);

  console.log(
    `[restore-points] ${options.commit ? "COMMIT" : "dry-run"}${options.userId ? ` user=${options.userId}` : ""}`,
  );
  console.log(
    `  ledger entries: ${plan.entries.length} across ${summary.length} users, net ${totalNet} points`,
  );
  console.log(
    `  purchases to settle (PAID/MINT_FAILED → COMPLETED): ${plan.purchasesToSettle.length}`,
  );
  console.log(
    `  legacy PAYING orders (not debited → PAYMENT_FAILED): ${plan.legacyPayingOrderIds.length}`,
  );
  console.log(`  users with negative net: ${negativeUsers.length}`);
  for (const row of negativeUsers) {
    console.log(
      `    user=${row.userId} credited=${row.credited} debited=${row.debited} net=${row.net}`,
    );
  }
  console.log(
    `  anomalies (not credited, review manually): ${plan.anomalies.length}`,
  );
  for (const line of plan.anomalies) console.log(`    ${line}`);

  if (options.reportPath) {
    const lines = ["user_id,credited,debited,net"].concat(
      summary.map((r) => `${r.userId},${r.credited},${r.debited},${r.net}`),
    );
    const target = path.resolve(options.reportPath);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, `${lines.join("\n")}\n`, "utf8");
    console.log(`  report written to ${target}`);
  }

  if (!options.commit) {
    console.log(
      "[restore-points] dry-run only; re-run with --commit to write.",
    );
    return 0;
  }

  const result = await applyRecoveryPlan(plan);
  console.log(
    `[restore-points] applied=${result.applied} duplicated=${result.duplicated} failed=${result.failed.length} settledPurchases=${result.settledPurchases} failedLegacyPaying=${result.failedLegacyPaying}`,
  );
  for (const failure of result.failed) {
    console.error(`  FAILED ${failure.idempotencyKey}: ${failure.reason}`);
  }

  const verifyCode = await runVerify(options);
  return result.failed.length > 0 ? 1 : verifyCode;
}

main()
  .then((code) => process.exit(code))
  .catch((error) => {
    console.error("[restore-points] aborted:", error);
    process.exit(1);
  });
