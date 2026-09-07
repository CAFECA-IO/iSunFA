/**
 * Info: (20260821 - Luphia) 回填 `TeamSubscription.billingInterval`（review #6687 二輪高-1）。
 *
 * 欄位是這次加的且**刻意可為 NULL、無預設值**（review #6687 三輪）：`db push`
 * 之後既有列一律是 NULL，而 NULL 會被 `quoteSeatAddition` 的守門擋下
 *（`TW_SEAT_BILLING_INTERVAL_MISSING`）——那些團隊在回填之前**加不了人**。
 * 這是刻意選的失敗方向：若給預設值 `"month"`，年繳列會拿到一個完全合法、
 * 只是錯的值，守門看不見它，期中加人的補收分母變成 30 天而不是 365
 *（多收約 12 倍）。寧可擋下，不要對綁定的卡多收。
 *
 * 正確值只存在每一列最後一張訂單的 `data` 裡，這支從那裡讀回來。
 *
 * 判準：`latestOrderId` 指到的訂單 `data.billingInterval`。讀不到訂單或
 * data 裡沒有週期的列**跳過並列出**（不猜——猜錯就是把錢算錯），由人工核對。
 *
 * 預設 dry-run 只列出將要改的列；帶 `--apply` 才落地。
 *
 * 用法：
 *
 *     npx tsx scripts/backfill_billing_interval.ts          # 檢視
 *     npx tsx scripts/backfill_billing_interval.ts --apply  # 套用
 */
import { teamSubscriptionRepo } from "@/repositories/team_subscription.repo";
import { paymentRepo } from "@/repositories/payment.repo";
import {
  BILLING_INTERVAL,
  type BillingInterval,
} from "@/constants/subscription_quota";

const APPLY = process.argv.includes("--apply");

function readOrderInterval(data: unknown): BillingInterval | null {
  if (typeof data !== "object" || data === null) return null;
  const value = (data as { billingInterval?: unknown }).billingInterval;
  return value === BILLING_INTERVAL.MONTH || value === BILLING_INTERVAL.YEAR
    ? value
    : null;
}

async function main(): Promise<void> {
  const out = (line: string): void => {
    process.stdout.write(`${line}\n`);
  };

  /**
   * Info: (20260821 - Luphia) 免費列不參與席次補收（`unitPrice` 為 0 就先被擋），
   * 週期值無關緊要，不動它——留 NULL 也不會有人讀到。
   *
   * 查詢與寫入都走 Repo（CLAUDE.md §1：只有 Repository 碰得到 Prisma），
   * 那條規則有一支掃描測試在守（`transaction_layering.test.ts`）。
   */
  const rows = await teamSubscriptionRepo.listPaidForIntervalBackfill();

  let updated = 0;
  let unresolved = 0;
  for (const row of rows) {
    const order = row.latestOrderId
      ? await paymentRepo.getOrderById(row.latestOrderId)
      : null;
    const interval = readOrderInterval(order?.data);
    if (!interval) {
      unresolved += 1;
      out(
        `SKIP team ${row.teamId} plan=${row.planId}：訂單讀不到週期` +
          `（order=${row.latestOrderId ?? "無"}），請人工核對` +
          `——在補上之前這個團隊加不了人（守門擋著，不會算錯錢）`,
      );
      continue;
    }
    if (interval === row.billingInterval) continue;

    out(
      `${APPLY ? "FIX " : "PLAN"} team ${row.teamId} plan=${row.planId}：` +
        `${row.billingInterval ?? "(未設定)"} → ${interval}`,
    );
    if (APPLY) {
      await teamSubscriptionRepo.setBillingInterval(row.teamId, interval);
    }
    updated += 1;
  }

  out(
    `\n共 ${rows.length} 列付費訂閱；` +
      `${APPLY ? "已修正" : "待修正"} ${updated} 列、無法判定 ${unresolved} 列。` +
      (APPLY ? "" : "\n確認無誤後加 --apply 套用。"),
  );
}

main()
  .catch((error) => {
    process.stderr.write(
      `${error instanceof Error ? error.stack : String(error)}\n`,
    );
    process.exitCode = 1;
  })
  .finally(() => {
    // Info: (20260821 - Luphia) 連線由 `@/lib/prisma` 持有；這支已不碰 client
  });
