/**
 * Info: (20261015 - Luphia) 補派團隊額度付款後卡住、從未派發任務的分析訂單。
 *
 * 判定規則見 `src/services/team_quota_redispatch.service.ts`。補派＝把訂單送回 PAID，
 * 由 worker 的 IssueService 迴圈照常派成任務；worker 必須在跑，訂單才會真的開始執行。
 *
 * 安全性：
 * - 預設**預演**，不寫任何東西；加 `--commit` 才寫入。
 * - 條件更新只動「仍是 COMPLETED 且 mission 仍為空」的訂單，重跑不會重複派發。
 *
 * 用法：
 *
 *     npm run redispatch_team_quota                      # 預演，列出會補派的訂單
 *     npm run redispatch_team_quota -- --order <orderId> # 預演，單一訂單
 *     npm run redispatch_team_quota -- --commit          # 實際送回 PAID
 */
import {
  loadRedispatchSelection,
  requeueOrders,
} from "@/services/team_quota_redispatch.service";

function readFlagValue(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index === -1) return undefined;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

async function main(): Promise<number> {
  const args = process.argv.slice(2);
  const commit = args.includes("--commit");
  const orderId = readFlagValue(args, "--order");

  const { toRedispatch, skipped } = await loadRedispatchSelection({ orderId });

  console.log(
    `[redispatch-team-quota] ${commit ? "COMMIT" : "dry-run"}${orderId ? ` order=${orderId}` : ""}`,
  );
  console.log(`  orders to re-dispatch: ${toRedispatch.length}`);
  for (const order of toRedispatch) {
    console.log(
      `    ${order.id} user=${order.userId} created=${order.createdAt.toISOString()}`,
    );
  }
  console.log(`  skipped: ${skipped.length}`);
  for (const skip of skipped) {
    console.log(`    ${skip.orderId}: ${skip.reason}`);
  }

  if (!commit) {
    console.log(
      "[redispatch-team-quota] dry-run only; re-run with --commit to write.",
    );
    return 0;
  }

  const { requeued, unchanged } = await requeueOrders(toRedispatch);
  console.log(
    `[redispatch-team-quota] requeued=${requeued.length} unchanged=${unchanged.length}`,
  );
  for (const id of unchanged) {
    console.log(`  unchanged (status or mission changed meanwhile): ${id}`);
  }
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((error) => {
    console.error("[redispatch-team-quota] aborted:", error);
    process.exit(1);
  });
