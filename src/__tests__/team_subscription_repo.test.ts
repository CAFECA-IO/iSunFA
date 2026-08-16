import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;
import { teamSubscriptionRepo } from "@/repositories/team_subscription.repo";
import { prisma } from "@/lib/prisma";
import { TEAM_PLAN } from "@/constants/subscription_quota";

/**
 * Info: (20260815 - Luphia) 降級為免費方案時要把單價歸零（PR #6652 第二輪 D）。
 *
 * 不歸零的話，降級後 `unitPrice` 仍是 840，而「免費方案不補收席次費用」全靠
 * `resolveEffectivePlanId` 那一層擋著——防線只剩一道，且是遠處的一道。
 * 資料本身就該說實話：免費方案沒有單價。
 */

jest.mock("@/lib/prisma", () => ({
  prisma: {
    teamSubscription: {
      upsert: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}));

const asMock = (fn: unknown) => fn as ReturnType<typeof jest.fn>;

describe("teamSubscriptionRepo.downgradeToFree", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    asMock(prisma.teamSubscription.upsert).mockResolvedValue({});
  });

  it("clears the unit price on an existing subscription", async () => {
    await teamSubscriptionRepo.downgradeToFree("team-1", 1_760_000_000_000);

    expect(prisma.teamSubscription.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          planId: TEAM_PLAN.FREE,
          unitPrice: 0,
        }),
      }),
    );
  });

  // Info: (20260815 - Luphia) 新建的免費訂閱同樣不該帶著單價
  it("creates a free subscription without a unit price", async () => {
    await teamSubscriptionRepo.downgradeToFree("team-1", 1_760_000_000_000);

    expect(prisma.teamSubscription.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          planId: TEAM_PLAN.FREE,
          unitPrice: 0,
        }),
      }),
    );
  });

  /**
   * Info: (20260815 - Luphia) `seats` 刻意保留：那是團隊實際人數的快照，
   * 與收不收費無關，而免費版的人數上限另有把關（FREE_PLAN_MAX_MEMBERS）。
   */
  it("keeps the seat count as a snapshot of the team size", async () => {
    await teamSubscriptionRepo.downgradeToFree("team-1", 1_760_000_000_000);

    const call = asMock(prisma.teamSubscription.upsert).mock
      .calls[0][0] as unknown as {
      update: Record<string, unknown>;
    };
    expect(call.update).not.toHaveProperty("seats");
  });
});
