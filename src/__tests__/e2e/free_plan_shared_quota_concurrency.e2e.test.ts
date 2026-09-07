import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { prisma } from "@/lib/prisma";
import { spendCredits } from "@/services/spend.service";
import { BILLABLE_FEATURE_CODE } from "@/constants/subscription_quota";
import { TeamRole } from "@/constants/team";

/**
 * Info: (20260819 - Luphia) 共用額度的併發防線（真資料庫）。
 *
 * 免費方案改為全隊共用一份額度之後，鎖的粒度必須跟著換成**團隊**。若聚合換成全隊
 * 而鎖還是 (團隊, 成員)，兩位成員的併發請求會各持自己的鎖、同時讀到同一個 used、
 * 各自放行——超額幅度變成併發數 × 單筆，而設計書 §5.1 容許的是一筆。
 *
 * 這條性質**只有真資料庫測得出來**：序列化來自 Postgres 的 advisory lock，
 * mock 的替身直接執行 operation，證明不了任何事。
 */

// Info: (20260819 - Luphia) 🛑 正式機實體隔離（與同層 e2e 一致）
if (process.env.NODE_ENV === "production") {
  throw new Error(
    "🚨 [FATAL] 嚴禁在正式機 (Production) 環境執行 E2E 測試，以免污染真實額度資料！",
  );
}

const STAMP = Date.now();
const FREE_LIMIT_5H = BigInt(10);
let teamId = "";
let memberA = "";
let memberB = "";

beforeAll(async () => {
  const [a, b] = await Promise.all([
    prisma.user.create({
      data: { address: `e2e_conc_a_${STAMP}`, name: "E2E A" },
    }),
    prisma.user.create({
      data: { address: `e2e_conc_b_${STAMP}`, name: "E2E B" },
    }),
  ]);
  memberA = a.id;
  memberB = b.id;

  // Info: (20260819 - Luphia) 免費團隊：刻意不建 TeamSubscription
  const team = await prisma.team.create({
    data: { name: `e2e-shared-conc-${STAMP}` },
  });
  teamId = team.id;

  await prisma.teamMember.createMany({
    data: [
      { teamId, userId: memberA, role: TeamRole.OWNER },
      { teamId, userId: memberB, role: TeamRole.VIEWER },
    ],
  });
});

afterAll(async () => {
  await prisma.teamQuotaUsage.deleteMany({ where: { teamId } });
  await prisma.teamMember.deleteMany({ where: { teamId } });
  await prisma.team.deleteMany({ where: { id: teamId } });
  await prisma.user.deleteMany({ where: { id: { in: [memberA, memberB] } } });
  await prisma.$disconnect();
});

describe("免費方案共用額度的併發防線（真資料庫）", () => {
  /**
   * Info: (20260819 - Luphia) 兩位成員同時各求 8 點，共用池只有 10 點。
   *
   * 正確行為：兩者被 advisory lock 序列化，總扣款 ≤ 10（先到的拿 8、後到的封頂 2）。
   * 鎖若還是逐成員，兩者都會讀到 used = 0 並各扣 8 → 總計 16，超額 60%。
   */
  it("兩位成員同時消費，總扣款不超過共用上限", async () => {
    const nowSec = Math.floor(Date.now() / 1000);

    const results = await Promise.all([
      spendCredits({
        teamId,
        userId: memberA,
        featureCode: BILLABLE_FEATURE_CODE.FAITH_CHAT,
        cost: BigInt(8),
        idempotencyKey: `e2e-conc-a-${STAMP}`,
        nowSec,
        allowPartial: true,
      }),
      spendCredits({
        teamId,
        userId: memberB,
        featureCode: BILLABLE_FEATURE_CODE.FAITH_CHAT,
        cost: BigInt(8),
        idempotencyKey: `e2e-conc-b-${STAMP}`,
        nowSec,
        allowPartial: true,
      }),
    ]);

    const total = results.reduce(
      (sum, result) => sum + BigInt(result.quotaAmount),
      BigInt(0),
    );

    expect(total).toBeLessThanOrEqual(FREE_LIMIT_5H);

    // Info: (20260819 - Luphia) 資料庫端的總和要與回傳一致（沒有漏寫的用量列）
    const persisted = await prisma.teamQuotaUsage.aggregate({
      where: { teamId },
      _sum: { amount: true },
    });
    expect(persisted._sum.amount).toBe(total);
  });
});
