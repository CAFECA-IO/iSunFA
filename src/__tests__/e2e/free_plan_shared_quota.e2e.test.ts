import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { prisma } from "@/lib/prisma";
import { chargeSeatAddition } from "@/services/team_seat.service";
import { spendCredits, QuotaExceededError } from "@/services/spend.service";
import { getTeamSubscriptionView } from "@/services/team_subscription.service";
import { BILLABLE_FEATURE_CODE } from "@/constants/subscription_quota";
import { TeamRole } from "@/constants/team";

/**
 * Info: (20260819 - Luphia) 免費方案的額度是**全隊共用一份**（產品決定 20260819）。
 *
 * 這一支取代了 `free_plan_invite_cap.e2e.test.ts`：人數上限已經移除，而讓移除
 * 站得住腳的性質是「加人不再產生額度」——那條性質**只有真資料庫測得出來**。
 *
 * 為什麼不是單元測試就夠：共用與否取決於 `sumTeamWindowUsageInTx` 的聚合範圍
 * （`where` 有沒有 `userId`）與 advisory lock 的粒度。mock 裡那個 `where` 是我寫的，
 * 而真正要驗的正是它——同一個形狀在本 repo 犯過（checklist §1.2 / §1.8）。
 *
 * 刻意不呼叫任何寄信路徑：SMTP 在這個環境是設定好的。
 */

// Info: (20260819 - Luphia) 🛑 正式機實體隔離（與同層 e2e 一致）
if (process.env.NODE_ENV === "production") {
  throw new Error(
    "🚨 [FATAL] 嚴禁在正式機 (Production) 環境執行 E2E 測試，以免污染真實團隊與額度資料！",
  );
}

const STAMP = Date.now();
let teamId = "";
let ownerId = "";
let memberId = "";

beforeAll(async () => {
  const owner = await prisma.user.create({
    data: { address: `e2e_shared_owner_${STAMP}`, name: "E2E owner" },
  });
  const member = await prisma.user.create({
    data: { address: `e2e_shared_member_${STAMP}`, name: "E2E member" },
  });
  ownerId = owner.id;
  memberId = member.id;

  // Info: (20260819 - Luphia) 刻意不建 TeamSubscription：真實的免費團隊就是沒有那一列
  const team = await prisma.team.create({
    data: { name: `e2e-shared-quota-${STAMP}` },
  });
  teamId = team.id;

  await prisma.teamMember.createMany({
    data: [
      { teamId, userId: ownerId, role: TeamRole.OWNER },
      { teamId, userId: memberId, role: TeamRole.VIEWER },
    ],
  });
});

afterAll(async () => {
  await prisma.teamQuotaUsage.deleteMany({ where: { teamId } });
  await prisma.teamMember.deleteMany({ where: { teamId } });
  await prisma.team.deleteMany({ where: { id: teamId } });
  await prisma.user.deleteMany({ where: { id: { in: [ownerId, memberId] } } });
  await prisma.$disconnect();
});

describe("免費方案的額度全隊共用（真資料庫）", () => {
  /**
   * Info: (20260819 - Luphia) 人數上限已移除：兩位成員的免費團隊還能繼續邀請，
   * 而且不產生任何金流。舊行為是丟 `TW000017`（上限 1，僅擁有者）。
   */
  it("免費團隊不再因人數被擋，也不收費", async () => {
    const result = await chargeSeatAddition({
      teamId,
      nowMs: Date.now(),
      operatorUserId: ownerId,
    });

    expect(result).toMatchObject({ charged: false, amount: 0, seats: 0 });
  });

  /**
   * Info: (20260819 - Luphia) 本檔最重要的一條：**一個人用掉的量會算在另一個人頭上**。
   *
   * 免費方案每 5 小時 10 點。擁有者先用 9 點，另一位成員就只剩 1 點——
   * 若額度仍是一人一池，他會拿到完整的 10 點，而那正是「加人就多一份額度」的洞。
   */
  it("一位成員用掉的額度會佔用另一位成員的可用量", async () => {
    const nowSec = Math.floor(Date.now() / 1000);

    const first = await spendCredits({
      teamId,
      userId: ownerId,
      featureCode: BILLABLE_FEATURE_CODE.FAITH_CHAT,
      cost: BigInt(9),
      idempotencyKey: `e2e-shared-owner-${STAMP}`,
      nowSec,
      allowPartial: true,
    });
    expect(first.quotaAmount).toBe("9");

    // Info: (20260819 - Luphia) 另一位成員求 5 點，共用池只剩 1 點 → 封頂為 1
    const second = await spendCredits({
      teamId,
      userId: memberId,
      featureCode: BILLABLE_FEATURE_CODE.FAITH_CHAT,
      cost: BigInt(5),
      idempotencyKey: `e2e-shared-member-${STAMP}`,
      nowSec,
      allowPartial: true,
    });

    expect(second.quotaAmount).toBe("1");
  });

  // Info: (20260819 - Luphia) 共用池見底之後，第三個請求（任何成員）一律 402
  it("共用額度用完後任何成員都拿到 402", async () => {
    const nowSec = Math.floor(Date.now() / 1000);

    await expect(
      spendCredits({
        teamId,
        userId: memberId,
        featureCode: BILLABLE_FEATURE_CODE.FAITH_CHAT,
        cost: BigInt(1),
        idempotencyKey: `e2e-shared-exhausted-${STAMP}`,
        nowSec,
        allowPartial: true,
      }),
    ).rejects.toBeInstanceOf(QuotaExceededError);
  });

  /**
   * Info: (20260819 - Luphia) 畫面與扣費端必須是同一個判準。
   *
   * 免費方案的「我的額度」用量要顯示**全隊**的（10 已用滿），否則畫面會說
   * 「你還有額度」而送出訊息時被同事用掉的量擋下來。全隊合計也不得乘人數。
   */
  it("畫面顯示的用量與共用池一致，且合計不乘人數", async () => {
    const view = await getTeamSubscriptionView({
      userId: ownerId,
      teamId,
      nowSec: Math.floor(Date.now() / 1000),
    });

    expect(view.quota.quota5h).toMatchObject({ limit: "10", used: "10" });
    // Info: (20260819 - Luphia) 兩位成員，但共用一份 10 點——不是 20
    expect(view.teamTotals?.memberCount).toBe(2);
    expect(view.teamTotals?.quota5h.limit).toBe("10");
  });
});
