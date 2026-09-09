import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { prisma } from "@/lib/prisma";
import { spendCredits } from "@/services/spend.service";
import {
  BILLABLE_FEATURE_CODE,
  TEAM_PLAN,
} from "@/constants/subscription_quota";
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
let teamId = "";
let memberA = "";
let memberB = "";

/**
 * Info: (20260909 - Julian) 這一支的前提條件（免費方案每 5 小時 10 點）**自己建立、自己還原**。
 *
 * ## 為什麼需要這一段
 *
 * 額度是**營運設定**：`subscriptionPlanQuotaRepo.resolveQuota()` 讀的是
 * `subscription_plan_quota` 那張表，查無設定列才回程式碼裡的預設值
 * （見該 repository 的檔頭：「額度是營運設定而非部署參數，故存 DB 不用 env」）。
 *
 * 也就是說這支測試原本的前提是「那個資料庫剛好沒有 FREE 那一列，或那一列剛好是 10」——
 * 而那不是測試控制得了的東西。20260909 CI 上撞到的正是這件事：那個資料庫的
 * FREE 被設成 `per5h: 1000`，於是「擁有者先用 9 點、成員只剩 1 點」這個情境
 * 根本沒有碰到上限，斷言全數落空。
 *
 * **併發那一支更嚴重**：兩人各求 8 點、池子只有 10 點，才問得出
 * 「鎖的粒度是不是團隊」。池子若是 1000，兩人都拿滿 8 點是**正確行為**——
 * 那條測試會在錯誤的理由下變紅，而它要抓的缺陷完全沒有被驗到。
 *
 * ## 為什麼是「改設定再還原」而不是「從設定推導期望值」
 *
 * 後者（讀出 per5h 再算出期望值）看起來更乾淨，但會讓情境自己消失：
 * 上限一大，那兩支測試就再也沒有踩到邊界，變成永遠會過卻什麼都沒守到的綠燈。
 * **前提條件屬於測試，就該由測試建立。**
 *
 * ## 為什麼兩個檔案各抄一份
 *
 * 抽成共用模組要放在 `src/__tests__/` 底下，而 jest 的預設 `testMatch` 會把
 * 那裡的**每一個** .ts 當成一個 suite（`jest.config.mjs` 只排除了
 * `.e2e.test.ts` 與 `.tz.test.ts` 兩種**檔名**，不是排除非測試檔），
 * 於是 `npm test` 會多出一個「這個 suite 沒有任何測試」的紅燈。
 * 十行的重複比那個代價小。改動時兩邊一起改。
 */
const FREE_QUOTA_FOR_TEST = { per5h: 10, perWeek: 40 };

// Info: (20260909 - Julian) 進來之前那一列長什麼樣；null = 本來就沒有那一列
let previousFreeQuota: { per5h: number; perWeek: number } | null = null;
let freeQuotaRowExisted = false;

const pinFreeQuota = async (): Promise<void> => {
  const existing = await prisma.subscriptionPlanQuota.findUnique({
    where: { planId: TEAM_PLAN.FREE },
  });
  freeQuotaRowExisted = existing !== null;
  previousFreeQuota = existing
    ? { per5h: existing.per5h, perWeek: existing.perWeek }
    : null;

  await prisma.subscriptionPlanQuota.upsert({
    where: { planId: TEAM_PLAN.FREE },
    update: FREE_QUOTA_FOR_TEST,
    create: { planId: TEAM_PLAN.FREE, ...FREE_QUOTA_FOR_TEST },
  });
};

/**
 * Info: (20260909 - Julian) 還原成進來之前的樣子 —— 包括「本來沒有那一列」。
 *
 * 無條件寫回程式碼預設值是錯的：那會把「這個環境刻意沒有設定列」變成
 * 「有一列剛好等於預設值」，而兩者在日後改預設值時的行為不同。
 */
const restoreFreeQuota = async (): Promise<void> => {
  if (freeQuotaRowExisted && previousFreeQuota) {
    await prisma.subscriptionPlanQuota.update({
      where: { planId: TEAM_PLAN.FREE },
      data: previousFreeQuota,
    });
    return;
  }
  await prisma.subscriptionPlanQuota.deleteMany({
    where: { planId: TEAM_PLAN.FREE },
  });
};

// Info: (20260909 - Julian) 上限由上面的 fixture 釘住，不再假設資料庫裡剛好是 10
const FREE_LIMIT_5H = BigInt(FREE_QUOTA_FOR_TEST.per5h);

beforeAll(async () => {
  await pinFreeQuota();

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
  await restoreFreeQuota();
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
