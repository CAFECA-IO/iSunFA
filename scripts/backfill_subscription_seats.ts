import { prisma } from "@/lib/prisma";
import { SUBSCRIPTION_PLAN_PRICE } from "@/constants/price";
import {
  BILLING_INTERVAL,
  TEAM_PLAN,
  type TeamPlanId,
} from "@/constants/subscription_quota";

/**
 * Info: (20260814 - Luphia) 回填既有訂閱的 `seats` 與 `unit_price`（PR #6652 第二輪 A-3）。
 *
 * 為什麼需要：這兩個欄位是席次計費的新欄位，預設分別為 1 與 0，而本專案沒有 migrations
 * 目錄（schema 由部署流程套用）——部署當下所有既有訂閱的 `unit_price` 都是 0。
 * 服務端現在會擋下「付費方案卻沒有單價」的加席請求（TW000015），所以不回填的後果是
 * **既有付費團隊完全不能加人**，直到下次續訂才自動寫入真值。
 *
 * 單價從哪來：方案 + 計費週期。`TeamSubscription` 沒有週期欄位，因此由最後一張訂單的
 * `data.billingInterval` 取得；取不到時以「期間長度是否接近一年」推定，並在輸出中標明推定值。
 *
 * 執行方式：
 *   npx tsx scripts/backfill_subscription_seats.ts          # 預演，只印出將要寫入什麼
 *   npx tsx scripts/backfill_subscription_seats.ts --commit # 實際寫入
 *
 * 冪等：只處理 `unit_price = 0` 或 `seats` 與實際人數不符的列；重跑不會改動已正確的資料。
 */

const YEAR_THRESHOLD_MS = 300 * 86_400_000;

interface IBackfillRow {
  teamId: string;
  planId: string;
  seats: number;
  unitPrice: number;
  intervalSource: "order" | "inferred";
}

function resolveUnitPrice(planId: string, yearly: boolean): number {
  const plan = planId as TeamPlanId;
  if (plan === TEAM_PLAN.FREE) return 0;
  const price = SUBSCRIPTION_PLAN_PRICE[plan];
  if (!price) return 0;
  return yearly ? price.yearly : price.monthly;
}

async function collectRows(): Promise<IBackfillRow[]> {
  const subscriptions = await prisma.teamSubscription.findMany();
  const rows: IBackfillRow[] = [];

  for (const subscription of subscriptions) {
    // Info: (20260814 - Luphia) 免費方案本來就沒有單價，不需要回填
    if (subscription.planId === TEAM_PLAN.FREE) continue;

    const memberCount = await prisma.teamMember.count({
      where: { teamId: subscription.teamId },
    });
    const seats = Math.max(1, memberCount);

    const lastOrder = subscription.latestOrderId
      ? await prisma.order.findUnique({
          where: { id: subscription.latestOrderId },
        })
      : null;
    const orderInterval = (
      lastOrder?.data as { billingInterval?: string } | null
    )?.billingInterval;

    /**
     * Info: (20260814 - Luphia) 訂單沒帶週期時以期間長度推定：
     * 年繳的週期是 365 天，月繳是 30 天，兩者差距夠大，不會誤判。
     */
    const periodMs =
      subscription.currentPeriodEnd.getTime() -
      subscription.currentPeriodStart.getTime();
    const yearly = orderInterval
      ? orderInterval === BILLING_INTERVAL.YEAR
      : periodMs > YEAR_THRESHOLD_MS;

    const unitPrice = resolveUnitPrice(subscription.planId, yearly);
    const needsUnitPrice = subscription.unitPrice <= 0 && unitPrice > 0;
    const needsSeats = subscription.seats !== seats;
    if (!needsUnitPrice && !needsSeats) continue;

    rows.push({
      teamId: subscription.teamId,
      planId: subscription.planId,
      seats,
      unitPrice: needsUnitPrice ? unitPrice : subscription.unitPrice,
      intervalSource: orderInterval ? "order" : "inferred",
    });
  }

  return rows;
}

async function main() {
  const commit = process.argv.includes("--commit");
  const rows = await collectRows();

  for (const row of rows) {
    console.info(
      `[backfill-seats] ${commit ? "writing" : "would write"} team=${row.teamId} ` +
        `plan=${row.planId} seats=${row.seats} unitPrice=${row.unitPrice} ` +
        `(interval from ${row.intervalSource})`,
    );
    if (!commit) continue;
    await prisma.teamSubscription.update({
      where: { teamId: row.teamId },
      data: { seats: row.seats, unitPrice: row.unitPrice },
    });
  }

  const inferred = rows.filter((row) => row.intervalSource === "inferred");
  console.info(
    `[backfill-seats] ${commit ? "committed" : "dry-run"}: ${rows.length} subscription(s), ` +
      `${inferred.length} with an inferred billing interval`,
  );
  /**
   * Info: (20260814 - Luphia) 推定值單獨列出：金額推錯會讓整個週期的補收都是錯的，
   * 這幾筆值得人工看一眼，而不是淹沒在成功訊息裡。
   */
  for (const row of inferred) {
    console.warn(
      `[backfill-seats] REVIEW team=${row.teamId}: billing interval inferred from period length`,
    );
  }
}

main()
  .catch((error) => {
    console.error("[backfill-seats] aborted:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
