/**
 * Info: (20260819 - Luphia) 「我明明訂閱了，畫面還顯示免費版」的唯讀診斷。
 *
 * 這個症狀有**兩個**完全不同的成因，而畫面上長得一模一樣：
 *
 * 1. **顯示端**：`/auth/me` 沒回 plan（本 PR 修的那一條）。DB 是團隊版，畫面是免費版。
 * 2. **履行端**：訂單付了款但 `TeamSubscription` 沒被套用（或已過期／PAST_DUE）。
 *    DB 本身就是免費版——那時候修顯示是白費，該查的是付款履行。
 *
 * 這支把兩者分開：印出每個擁有的團隊的訂閱原值、折算後的有效方案、鏈上卡片狀態，
 * 以及最近的訂閱訂單。**只讀，不寫。**
 *
 * 用法：
 *
 *     npx tsx scripts/diagnose_subscription_state.ts --address 0x1234...
 *     npx tsx scripts/diagnose_subscription_state.ts --user <userId>
 */
import { prisma } from "@/lib/prisma";
import { ORDER_TYPE } from "@/constants/status";
import { TeamRole } from "@/constants/team";
import { resolveEffectivePlanId } from "@/services/spend.service";
import { SUBSCRIPTION_CARD_MAX_SYNC_ATTEMPTS } from "@/constants/subscription_nft";

function argValue(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index < 0) return undefined;
  return process.argv[index + 1];
}

async function main(): Promise<void> {
  const address = argValue("--address");
  const userId = argValue("--user");
  const out = (line: string): void => {
    process.stdout.write(`${line}\n`);
  };

  if (!address && !userId) {
    process.stderr.write("請提供 --address <錢包位址> 或 --user <userId>\n");
    process.exitCode = 1;
    return;
  }

  const user = address
    ? await prisma.user.findUnique({ where: { address } })
    : await prisma.user.findUnique({ where: { id: userId! } });

  if (!user) {
    out("找不到這個使用者。");
    return;
  }

  out(`使用者 ${user.id}  address ${user.address}`);

  const memberships = await prisma.teamMember.findMany({
    where: { userId: user.id },
    select: {
      role: true,
      teamId: true,
      team: {
        select: {
          name: true,
          deletedAt: true,
          teamSubscription: true,
        },
      },
    },
  });

  if (memberships.length === 0) {
    out("這個使用者不屬於任何團隊——沒有訂閱對象，畫面顯示免費版是正確的。");
    return;
  }

  const nowSec = Math.floor(Date.now() / 1000);

  for (const membership of memberships) {
    const subscription = membership.team.teamSubscription;
    const effective = resolveEffectivePlanId(subscription, nowSec);
    out("");
    out(
      `團隊 ${membership.teamId}（${membership.team.name}）role=${membership.role}${
        membership.team.deletedAt ? " [已解散]" : ""
      }`,
    );
    if (!subscription) {
      out("  沒有訂閱列 → 有效方案 free");
    } else {
      out(
        `  DB: planId=${subscription.planId} status=${subscription.status} ` +
          `period=${subscription.currentPeriodStart.toISOString()} ~ ${subscription.currentPeriodEnd.toISOString()} ` +
          `autoRenew=${subscription.autoRenew} seats=${subscription.seats} unitPrice=${subscription.unitPrice}`,
      );
      out(`  有效方案（與扣費側同判準）= ${effective}`);
      out(
        `  鏈上卡片: tokenId=${subscription.nftTokenId ?? "—"} ` +
          `owner=${subscription.nftOwnerAddress ?? "—"} ` +
          `fingerprint=${subscription.nftFingerprint ?? "—"} ` +
          `syncedAt=${subscription.nftSyncedAt?.toISOString() ?? "未同步（待辦）"} ` +
          `attempts=${subscription.nftSyncAttempts}/${SUBSCRIPTION_CARD_MAX_SYNC_ATTEMPTS}`,
      );
      if (subscription.nftSyncError) {
        out(`  最後一次同步錯誤: ${subscription.nftSyncError}`);
      }
    }

    /**
     * Info: (20260819 - Luphia) 訂閱訂單以 `data.teamId` 綁團隊（見 changeTeamSubscription）。
     * 印出最近五筆讓「付了款但沒履行」看得出來：有 COMPLETED 的訂單而訂閱仍是 free，
     * 問題就在履行路徑，不在顯示。
     */
    if (membership.role === TeamRole.OWNER) {
      const orders = await prisma.order.findMany({
        where: {
          userId: user.id,
          type: ORDER_TYPE.BILLING_SUBSCRIBE,
        },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          status: true,
          amount: true,
          createdAt: true,
          data: true,
        },
      });
      const mine = orders.filter((order) => {
        const data = order.data as { teamId?: string } | null;
        return data?.teamId === membership.teamId;
      });
      out(`  最近的訂閱訂單（本團隊）：${mine.length} 筆`);
      for (const order of mine) {
        out(
          `    ${order.createdAt.toISOString()}  ${order.id}  status=${order.status}  amount=${order.amount}`,
        );
      }
    }
  }
}

main()
  .catch((error) => {
    process.stderr.write(
      `${error instanceof Error ? error.stack : String(error)}\n`,
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
