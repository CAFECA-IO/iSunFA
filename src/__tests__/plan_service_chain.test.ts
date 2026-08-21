import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;

import {
  getPlanUnitPrice,
  getTeamEntitlement,
  getUserPlan,
  listPlans,
  PLAN_SOURCE,
} from "@/services/plan.service";
import { teamRepo } from "@/repositories/team.repo";
import { teamSubscriptionRepo } from "@/repositories/team_subscription.repo";
import { readOwnedChainCards } from "@/services/subscription_nft.service";
import {
  buildCardMetadata,
  type ISubscriptionCardFacts,
} from "@/lib/subscription/subscription_card";
import {
  BILLING_INTERVAL,
  TEAM_PLAN,
  TEAM_SUBSCRIPTION_STATUS,
} from "@/constants/subscription_quota";
import { SUBSCRIPTION_PLAN_PRICE } from "@/constants/price";

/**
 * Info: (20260819 - Luphia) 方案的單一入口，且**鏈上為準**（產品決定 20260819）。
 *
 * 這一支釘住三件會被「簡化」掉的事：
 *
 * 1. 鏈上說付費而 DB 說免費時，回**鏈上**那個（履行漏掉、DB 還原到舊備份時，
 *    使用者手上握著鏈上憑證，畫面不該把他打回免費版）。
 * 2. 鏈上**讀不到**（RPC 失敗、未部署）時退回 DB——「讀不到」與「讀到了但沒有卡」
 *    是兩件事。混為一談的話，一次 RPC 抖動就會讓所有付費戶顯示免費版。
 * 3. 不一致時**只回填卡號快取**，不改任何計費欄位。卡片可轉讓且 metadata 帶著
 *    team_id，若讓它回寫 `TeamSubscription`，拿到一張轉讓卡的人就能改別人的計費資料。
 */

jest.mock("@/repositories/team.repo", () => ({
  teamRepo: { listOwnedTeamsWithSubscription: jest.fn(async () => []) },
}));

jest.mock("@/repositories/team_subscription.repo", () => ({
  teamSubscriptionRepo: {
    getByTeamId: jest.fn(async () => null),
    listCardSyncState: jest.fn(async () => new Map()),
    cacheCardTokenId: jest.fn(async () => undefined),
  },
}));

jest.mock("@/repositories/subscription_plan_quota.repo", () => ({
  subscriptionPlanQuotaRepo: {
    resolveQuota: jest.fn(async () => ({ per5h: 10, perWeek: 100 })),
  },
}));

jest.mock("@/services/subscription_nft.service", () => ({
  readOwnedChainCards: jest.fn(async () => []),
}));

/**
 * Info: (20260821 - Luphia) 「不一致」不再以回傳欄位表達（簡化 20260820）——
 * 沒有呼叫端讀它。現在唯一會看到它的地方是 log，因此斷言改看 log。
 */
const logWarn = jest.fn();
const logError = jest.fn();
jest.mock("@/lib/utils/logger", () => ({
  logger: {
    child: () => ({
      warn: (...args: unknown[]) => logWarn(...args),
      error: (...args: unknown[]) => logError(...args),
      info: jest.fn(),
      debug: jest.fn(),
    }),
  },
}));

const asMock = (fn: unknown) => fn as ReturnType<typeof jest.fn>;

const NOW_SEC = 1_760_000_000;
const NOW_MS = NOW_SEC * 1000;

/**
 * Info: (20260820 - Luphia) 「已同步完成」的卡片狀態。
 * 預設狀態刻意是**已同步**：待同步是特例，而特例要在案例裡明寫出來，
 * 否則「鏈上為準」那幾條會在不知不覺間變成測「待同步走 DB」。
 */
function syncedState(teamId: string, tokenId: string | null) {
  return new Map([
    [
      teamId,
      {
        tokenId,
        syncedAt: new Date(NOW_MS - 60_000),
        attempts: 0,
        updatedAtMs: NOW_MS - 120_000,
      },
    ],
  ]);
}

// Info: (20260820 - Luphia) 待同步（鏈上那份已知過期）且在寬限內
function pendingState(teamId: string, tokenId: string | null = null) {
  return new Map([
    [
      teamId,
      {
        tokenId,
        syncedAt: null,
        attempts: 0,
        updatedAtMs: NOW_MS - 30_000,
      },
    ],
  ]);
}
const ADDRESS = "0x00000000000000000000000000000000000000b2";

function ownedTeam(teamId: string, planId: string, overrides = {}) {
  return {
    teamId,
    subscription: {
      planId,
      status: TEAM_SUBSCRIPTION_STATUS.ACTIVE,
      currentPeriodEnd: new Date((NOW_SEC + 86_400) * 1000),
      ...overrides,
    },
  };
}

function chainCard(
  teamId: string,
  plan: string,
  tokenId: string,
  periodEndSec = NOW_SEC + 86_400,
) {
  const facts: ISubscriptionCardFacts = {
    teamId,
    teamName: teamId,
    effectivePlanId: plan as ISubscriptionCardFacts["effectivePlanId"],
    periodStartSec: NOW_SEC - 86_400,
    periodEndSec,
    seats: 3,
  };
  return { tokenId, metadata: buildCardMetadata(facts), teamId };
}

beforeEach(() => {
  jest.clearAllMocks();
  asMock(teamRepo.listOwnedTeamsWithSubscription).mockResolvedValue([]);
  asMock(teamSubscriptionRepo.listCardSyncState).mockResolvedValue(new Map());
  asMock(teamSubscriptionRepo.cacheCardTokenId).mockResolvedValue(undefined);
  asMock(teamSubscriptionRepo.getByTeamId).mockResolvedValue(null);
  asMock(readOwnedChainCards).mockResolvedValue([]);
});

describe("getUserPlan：鏈上為準", () => {
  it("鏈上有有效卡而 DB 是免費版 → 回鏈上的方案並記為不一致", async () => {
    asMock(teamRepo.listOwnedTeamsWithSubscription).mockResolvedValue([
      ownedTeam("team-1", TEAM_PLAN.FREE),
    ]);
    asMock(readOwnedChainCards).mockResolvedValue([
      chainCard("team-1", TEAM_PLAN.TEAM, "42"),
    ]);

    const snapshot = await getUserPlan({
      userId: "user-1",
      address: ADDRESS,
      nowSec: NOW_SEC,
    });

    expect(snapshot.plan).toBe(TEAM_PLAN.TEAM);
    expect(snapshot.ownedPlans).toEqual([TEAM_PLAN.TEAM]);
    expect(snapshot.source).toBe(PLAN_SOURCE.CHAIN);
    expect(logWarn).toHaveBeenCalledWith(
      expect.stringContaining("不一致"),
      expect.objectContaining({
        dbPlan: TEAM_PLAN.FREE,
        chainPlan: TEAM_PLAN.TEAM,
      }),
    );
  });

  it("鏈上與 DB 一致時不記為不一致", async () => {
    asMock(teamRepo.listOwnedTeamsWithSubscription).mockResolvedValue([
      ownedTeam("team-1", TEAM_PLAN.BUSINESS),
    ]);
    asMock(readOwnedChainCards).mockResolvedValue([
      chainCard("team-1", TEAM_PLAN.BUSINESS, "7"),
    ]);

    const snapshot = await getUserPlan({
      userId: "user-1",
      address: ADDRESS,
      nowSec: NOW_SEC,
    });

    expect(snapshot.plan).toBe(TEAM_PLAN.BUSINESS);
    // Info: (20260821 - Luphia) 一致時不該留下任何「不一致」的紀錄
    expect(logWarn).not.toHaveBeenCalled();
  });

  /**
   * Info: (20260819 - Luphia) 「鏈上為準」的代價，寫成測試而不是留在註解裡：
   * 卡片還沒鑄出（worker 落後一分鐘）時，徽章會顯示免費版。
   * 這是刻意接受的行為——哪天有人想改成 max(DB, 鏈上)，這一條會紅，
   * 而那應該引發一次討論，不是默默改掉。
   */
  it("鏈上讀到了但沒有卡 → 以鏈上為準（免費版），即使 DB 是付費", async () => {
    asMock(teamRepo.listOwnedTeamsWithSubscription).mockResolvedValue([
      ownedTeam("team-1", TEAM_PLAN.TEAM),
    ]);
    asMock(readOwnedChainCards).mockResolvedValue([]);

    const snapshot = await getUserPlan({
      userId: "user-1",
      address: ADDRESS,
      nowSec: NOW_SEC,
    });

    expect(snapshot.plan).toBe(TEAM_PLAN.FREE);
    expect(snapshot.source).toBe(PLAN_SOURCE.CHAIN);
    expect(logWarn).toHaveBeenCalledWith(
      expect.stringContaining("不一致"),
      expect.objectContaining({ dbPlan: TEAM_PLAN.TEAM }),
    );
  });

  it("鏈上讀取失敗 → 退回 DB，且不算不一致", async () => {
    asMock(teamRepo.listOwnedTeamsWithSubscription).mockResolvedValue([
      ownedTeam("team-1", TEAM_PLAN.TEAM),
    ]);
    asMock(readOwnedChainCards).mockRejectedValue(new Error("rpc down"));

    const snapshot = await getUserPlan({
      userId: "user-1",
      address: ADDRESS,
      nowSec: NOW_SEC,
    });

    expect(snapshot.plan).toBe(TEAM_PLAN.TEAM);
    expect(snapshot.source).toBe(PLAN_SOURCE.DB);
    /**
     * Info: (20260821 - Luphia) 讀不到會留一筆「讀取失敗」的 warn（那是要看見的），
     * 但**不該**留「不一致」——讀不到不是不一致。
     */
    expect(logWarn).toHaveBeenCalledWith(
      expect.stringContaining("讀取失敗"),
      expect.objectContaining({ reason: "rpc down" }),
    );
    expect(logWarn).not.toHaveBeenCalledWith(
      expect.stringContaining("不一致"),
      expect.anything(),
    );
  });

  // Info: (20260819 - Luphia) 沒有地址（尚未建錢包）就沒有鏈上事實可讀，退回 DB
  it("沒有地址 → 退回 DB，不呼叫鏈上讀取", async () => {
    asMock(teamRepo.listOwnedTeamsWithSubscription).mockResolvedValue([
      ownedTeam("team-1", TEAM_PLAN.TEAM),
    ]);

    const snapshot = await getUserPlan({
      userId: "user-1",
      address: null,
      nowSec: NOW_SEC,
    });

    expect(snapshot.plan).toBe(TEAM_PLAN.TEAM);
    expect(snapshot.source).toBe(PLAN_SOURCE.DB);
    expect(asMock(readOwnedChainCards)).not.toHaveBeenCalled();
  });

  it("期間已過的卡不算有效", async () => {
    asMock(teamRepo.listOwnedTeamsWithSubscription).mockResolvedValue([
      ownedTeam("team-1", TEAM_PLAN.TEAM),
    ]);
    asMock(readOwnedChainCards).mockResolvedValue([
      chainCard("team-1", TEAM_PLAN.TEAM, "42", NOW_SEC - 1),
    ]);

    const snapshot = await getUserPlan({
      userId: "user-1",
      address: ADDRESS,
      nowSec: NOW_SEC,
    });

    expect(snapshot.plan).toBe(TEAM_PLAN.FREE);
  });

  // Info: (20260819 - Luphia) 別的團隊的卡不影響這個團隊（metadata 帶 team_id）
  it("其他團隊的卡不算進來", async () => {
    asMock(teamRepo.listOwnedTeamsWithSubscription).mockResolvedValue([
      ownedTeam("team-1", TEAM_PLAN.FREE),
    ]);
    asMock(readOwnedChainCards).mockResolvedValue([
      chainCard("team-9", TEAM_PLAN.BUSINESS, "99"),
    ]);

    const snapshot = await getUserPlan({
      userId: "user-1",
      address: ADDRESS,
      nowSec: NOW_SEC,
    });

    expect(snapshot.plan).toBe(TEAM_PLAN.FREE);
  });

  it("多個團隊：徽章取最高，逐團事實各自保留", async () => {
    asMock(teamRepo.listOwnedTeamsWithSubscription).mockResolvedValue([
      ownedTeam("team-1", TEAM_PLAN.FREE),
      ownedTeam("team-2", TEAM_PLAN.TEAM),
    ]);
    asMock(readOwnedChainCards).mockResolvedValue([
      chainCard("team-2", TEAM_PLAN.TEAM, "7"),
    ]);

    const snapshot = await getUserPlan({
      userId: "user-1",
      address: ADDRESS,
      nowSec: NOW_SEC,
    });

    expect(snapshot.plan).toBe(TEAM_PLAN.TEAM);
    expect(snapshot.ownedPlans).toEqual([TEAM_PLAN.FREE, TEAM_PLAN.TEAM]);
  });
});

describe("快取回填", () => {
  it("DB 沒有卡號時，用鏈上發現的卡號回填", async () => {
    asMock(teamRepo.listOwnedTeamsWithSubscription).mockResolvedValue([
      ownedTeam("team-1", TEAM_PLAN.TEAM),
    ]);
    asMock(readOwnedChainCards).mockResolvedValue([
      chainCard("team-1", TEAM_PLAN.TEAM, "42"),
    ]);

    await getUserPlan({ userId: "user-1", address: ADDRESS, nowSec: NOW_SEC });

    expect(asMock(teamSubscriptionRepo.cacheCardTokenId)).toHaveBeenCalledWith(
      "team-1",
      "42",
    );
  });

  it("DB 已有卡號就不再回填", async () => {
    asMock(teamRepo.listOwnedTeamsWithSubscription).mockResolvedValue([
      ownedTeam("team-1", TEAM_PLAN.TEAM),
    ]);
    asMock(teamSubscriptionRepo.listCardSyncState).mockResolvedValue(
      syncedState("team-1", "42"),
    );
    asMock(readOwnedChainCards).mockResolvedValue([
      chainCard("team-1", TEAM_PLAN.TEAM, "42"),
    ]);

    await getUserPlan({ userId: "user-1", address: ADDRESS, nowSec: NOW_SEC });

    expect(
      asMock(teamSubscriptionRepo.cacheCardTokenId),
    ).not.toHaveBeenCalled();
  });

  /**
   * Info: (20260819 - Luphia) 回填失敗不能讓讀取失敗：那是快取，
   * 而使用者要的是方案。
   */
  it("回填失敗仍回得出方案", async () => {
    asMock(teamRepo.listOwnedTeamsWithSubscription).mockResolvedValue([
      ownedTeam("team-1", TEAM_PLAN.TEAM),
    ]);
    asMock(readOwnedChainCards).mockResolvedValue([
      chainCard("team-1", TEAM_PLAN.TEAM, "42"),
    ]);
    asMock(teamSubscriptionRepo.cacheCardTokenId).mockRejectedValue(
      new Error("db down"),
    );

    const snapshot = await getUserPlan({
      userId: "user-1",
      address: ADDRESS,
      nowSec: NOW_SEC,
    });

    expect(snapshot.plan).toBe(TEAM_PLAN.TEAM);
  });

  // Info: (20260819 - Luphia) 快取的卡號要當 hint 傳下去（省掉掃事件那一趟）
  it("已知卡號會作為 hint 傳給鏈上讀取", async () => {
    asMock(teamRepo.listOwnedTeamsWithSubscription).mockResolvedValue([
      ownedTeam("team-1", TEAM_PLAN.TEAM),
    ]);
    asMock(teamSubscriptionRepo.listCardSyncState).mockResolvedValue(
      syncedState("team-1", "42"),
    );

    await getUserPlan({ userId: "user-1", address: ADDRESS, nowSec: NOW_SEC });

    expect(asMock(readOwnedChainCards)).toHaveBeenCalledWith(ADDRESS, {
      hintTokenIds: ["42"],
      // Info: (20260820 - Luphia) 卡號已知 → 不必掃事件（見下方「掃描的觸發條件」）
      discoverMissing: false,
    });
  });
});

describe("getTeamEntitlement：權益只看 DB", () => {
  /**
   * Info: (20260819 - Luphia) 權益**不讀鏈**，而且這一條要能單獨紅。
   *
   * 卡片是可轉讓的：若權益採信鏈上憑證，收到一張轉讓卡的人就能動用那個團隊的額度。
   * 另一半理由是 RPC——扣費路徑不能因為節點抖動而放行或擋下。
   */
  it("不呼叫任何鏈上讀取", async () => {
    asMock(teamSubscriptionRepo.getByTeamId).mockResolvedValue({
      planId: TEAM_PLAN.BUSINESS,
      status: TEAM_SUBSCRIPTION_STATUS.ACTIVE,
      currentPeriodEnd: new Date((NOW_SEC + 10) * 1000),
    });

    const plan = await getTeamEntitlement({
      teamId: "team-1",
      nowSec: NOW_SEC,
    });

    expect(plan).toBe(TEAM_PLAN.BUSINESS);
    expect(asMock(readOwnedChainCards)).not.toHaveBeenCalled();
  });

  it("查無訂閱列 → free（fail-closed）", async () => {
    asMock(teamSubscriptionRepo.getByTeamId).mockResolvedValue(null);

    expect(
      await getTeamEntitlement({ teamId: "team-1", nowSec: NOW_SEC }),
    ).toBe(TEAM_PLAN.FREE);
  });

  it("過期的付費訂閱 → free", async () => {
    asMock(teamSubscriptionRepo.getByTeamId).mockResolvedValue({
      planId: TEAM_PLAN.TEAM,
      status: TEAM_SUBSCRIPTION_STATUS.ACTIVE,
      currentPeriodEnd: new Date((NOW_SEC - 1) * 1000),
    });

    expect(
      await getTeamEntitlement({ teamId: "team-1", nowSec: NOW_SEC }),
    ).toBe(TEAM_PLAN.FREE);
  });
});

describe("方案目錄", () => {
  it("列出三個方案，含價格、月配點、儲存與額度", async () => {
    const plans = await listPlans();

    expect(plans.map((plan) => plan.id)).toEqual([
      TEAM_PLAN.FREE,
      TEAM_PLAN.TEAM,
      TEAM_PLAN.BUSINESS,
    ]);
    const team = plans.find((plan) => plan.id === TEAM_PLAN.TEAM);
    expect(team).toEqual(
      expect.objectContaining({
        isPaid: true,
        monthlyPrice: SUBSCRIPTION_PLAN_PRICE.team.monthly,
        yearlyPrice: SUBSCRIPTION_PLAN_PRICE.team.yearly,
        quota: { per5h: 10, perWeek: 100 },
      }),
    );
    expect(plans.find((plan) => plan.id === TEAM_PLAN.FREE)?.isPaid).toBe(
      false,
    );
  });

  /**
   * Info: (20260819 - Luphia) 收費金額與揭露金額同一個出口。
   * 四處各自 index 價格常數的時代，「改價漏掉一處」不會有任何測試發現。
   */
  it("單價出口與價格表一致（月/年）", () => {
    expect(getPlanUnitPrice(TEAM_PLAN.TEAM, BILLING_INTERVAL.MONTH)).toBe(
      SUBSCRIPTION_PLAN_PRICE.team.monthly,
    );
    expect(getPlanUnitPrice(TEAM_PLAN.TEAM, BILLING_INTERVAL.YEAR)).toBe(
      SUBSCRIPTION_PLAN_PRICE.team.yearly,
    );
    expect(getPlanUnitPrice(TEAM_PLAN.FREE, BILLING_INTERVAL.MONTH)).toBe(0);
  });
});

describe("待同步期間以 DB 顯示（self-review 嚴重項）", () => {
  /**
   * Info: (20260820 - Luphia) 續訂後的空窗：DB 已是新週期，而鏈上那張卡的
   * `period_end` 仍是舊的（折算為 free）。照鏈上顯示會把剛續訂成功的付費戶
   * 打回免費版，而且**每期都會發生一次**。
   */
  it("卡片待同步且鏈上讀到過期的卡 → 顯示 DB 的付費方案", async () => {
    asMock(teamRepo.listOwnedTeamsWithSubscription).mockResolvedValue([
      ownedTeam("team-1", TEAM_PLAN.TEAM),
    ]);
    asMock(teamSubscriptionRepo.listCardSyncState).mockResolvedValue(
      pendingState("team-1", "42"),
    );
    asMock(readOwnedChainCards).mockResolvedValue([
      chainCard("team-1", TEAM_PLAN.TEAM, "42", NOW_SEC - 1),
    ]);

    const snapshot = await getUserPlan({
      userId: "user-1",
      address: ADDRESS,
      nowSec: NOW_SEC,
    });

    expect(snapshot.plan).toBe(TEAM_PLAN.TEAM);
    expect(snapshot.source).toBe(PLAN_SOURCE.PENDING_CHAIN);
    // Info: (20260820 - Luphia) 待同步不算不一致，否則每期續訂都會產生假告警
    expect(logWarn).not.toHaveBeenCalled();
  });

  it("首次訂閱、卡片還沒鑄出 → 顯示 DB 的付費方案", async () => {
    asMock(teamRepo.listOwnedTeamsWithSubscription).mockResolvedValue([
      ownedTeam("team-1", TEAM_PLAN.BUSINESS),
    ]);
    asMock(teamSubscriptionRepo.listCardSyncState).mockResolvedValue(
      pendingState("team-1", null),
    );
    asMock(readOwnedChainCards).mockResolvedValue([]);

    const snapshot = await getUserPlan({
      userId: "user-1",
      address: ADDRESS,
      nowSec: NOW_SEC,
    });

    expect(snapshot.plan).toBe(TEAM_PLAN.BUSINESS);
    expect(snapshot.source).toBe(PLAN_SOURCE.PENDING_CHAIN);
  });

  /**
   * Info: (20260820 - Luphia) 界：卡住的同步不該讓「顯示付費」永久靠 DB 撐著。
   * 超過寬限就回到鏈上為準（使用者會看到免費版），而那是要修 worker 的訊號。
   */
  it("待同步超過寬限 → 回到鏈上為準", async () => {
    asMock(teamRepo.listOwnedTeamsWithSubscription).mockResolvedValue([
      ownedTeam("team-1", TEAM_PLAN.TEAM),
    ]);
    asMock(teamSubscriptionRepo.listCardSyncState).mockResolvedValue(
      new Map([
        [
          "team-1",
          {
            tokenId: "42",
            syncedAt: null,
            attempts: 0,
            // Info: (20260820 - Luphia) 16 分鐘前更新，寬限為 15 分鐘
            updatedAtMs: NOW_MS - 16 * 60_000,
          },
        ],
      ]),
    );
    asMock(readOwnedChainCards).mockResolvedValue([
      chainCard("team-1", TEAM_PLAN.TEAM, "42", NOW_SEC - 1),
    ]);

    const snapshot = await getUserPlan({
      userId: "user-1",
      address: ADDRESS,
      nowSec: NOW_SEC,
    });

    expect(snapshot.plan).toBe(TEAM_PLAN.FREE);
    expect(snapshot.source).toBe(PLAN_SOURCE.CHAIN);
  });

  // Info: (20260820 - Luphia) 已同步完成的列不受影響：這條防止「一律走 DB」的退化
  it("已同步完成時仍以鏈上為準", async () => {
    asMock(teamRepo.listOwnedTeamsWithSubscription).mockResolvedValue([
      ownedTeam("team-1", TEAM_PLAN.TEAM),
    ]);
    asMock(teamSubscriptionRepo.listCardSyncState).mockResolvedValue(
      syncedState("team-1", "42"),
    );
    asMock(readOwnedChainCards).mockResolvedValue([]);

    const snapshot = await getUserPlan({
      userId: "user-1",
      address: ADDRESS,
      nowSec: NOW_SEC,
    });

    expect(snapshot.plan).toBe(TEAM_PLAN.FREE);
    expect(snapshot.source).toBe(PLAN_SOURCE.CHAIN);
  });
});

describe("掃描的觸發條件（self-review 風險 2）", () => {
  /**
   * Info: (20260820 - Luphia) 掃事件只在「DB 說付費、卻沒有卡號」時才值得做。
   *
   * 原本的條件是 `已確認卡片數 < balanceOf`，而持有「已不屬於自己團隊」的卡時
   * 那個條件永遠成立——每次 `/auth/me` 都會做一次 fromBlock 0 的全鏈掃描。
   */
  it("付費團隊沒有卡號 → 要求掃描", async () => {
    asMock(teamRepo.listOwnedTeamsWithSubscription).mockResolvedValue([
      ownedTeam("team-1", TEAM_PLAN.TEAM),
    ]);
    asMock(teamSubscriptionRepo.listCardSyncState).mockResolvedValue(
      syncedState("team-1", null),
    );

    await getUserPlan({ userId: "user-1", address: ADDRESS, nowSec: NOW_SEC });

    expect(asMock(readOwnedChainCards)).toHaveBeenCalledWith(
      ADDRESS,
      expect.objectContaining({ discoverMissing: true }),
    );
  });

  it("免費團隊沒有卡號 → 不掃描（免費方案本來就沒有卡）", async () => {
    asMock(teamRepo.listOwnedTeamsWithSubscription).mockResolvedValue([
      ownedTeam("team-1", TEAM_PLAN.FREE),
    ]);
    asMock(teamSubscriptionRepo.listCardSyncState).mockResolvedValue(
      syncedState("team-1", null),
    );

    await getUserPlan({ userId: "user-1", address: ADDRESS, nowSec: NOW_SEC });

    expect(asMock(readOwnedChainCards)).toHaveBeenCalledWith(
      ADDRESS,
      expect.objectContaining({ discoverMissing: false }),
    );
  });
});

describe("鏈上讀取逾時（self-review 風險 1）", () => {
  /**
   * Info: (20260820 - Luphia) `catch` 擋得住失敗，擋不住**慢**。
   * `/auth/me` 是所有畫面的前置條件，逾時必須退回 DB 而不是一起掛住。
   */
  it("讀取遲遲不回時退回 DB，不會一直等", async () => {
    asMock(teamRepo.listOwnedTeamsWithSubscription).mockResolvedValue([
      ownedTeam("team-1", TEAM_PLAN.TEAM),
    ]);
    asMock(teamSubscriptionRepo.listCardSyncState).mockResolvedValue(
      syncedState("team-1", "42"),
    );
    // Info: (20260820 - Luphia) 永遠不 resolve：逾時是唯一的出路
    asMock(readOwnedChainCards).mockReturnValue(new Promise(() => {}));

    const snapshot = await getUserPlan({
      userId: "user-1",
      address: ADDRESS,
      nowSec: NOW_SEC,
    });

    expect(snapshot.source).toBe(PLAN_SOURCE.DB);
    expect(snapshot.plan).toBe(TEAM_PLAN.TEAM);
  }, 10_000);
});
