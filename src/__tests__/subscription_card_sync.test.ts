import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;
import { encodeEventTopics } from "viem";

import { syncPendingSubscriptionCards } from "@/services/subscription_nft.service";
import { teamSubscriptionRepo } from "@/repositories/team_subscription.repo";
import { teamRepo } from "@/repositories/team.repo";
import { publicClient } from "@/lib/viem";
import { getAdminWalletClient } from "@/lib/wallet/admin_wallet";
import { ABIS } from "@/config/contracts";
import { buildCardFingerprint } from "@/lib/subscription/subscription_card";
import {
  TEAM_PLAN,
  TEAM_SUBSCRIPTION_STATUS,
} from "@/constants/subscription_quota";

/**
 * Info: (20260819 - Luphia) 訂閱卡同步的**接線**（checklist §1.7）。
 *
 * 決策本身在 `subscription_card_decision.test.ts` 逐條測過；這一支測的是
 * 「決策真的被執行、結果真的被寫回、失敗真的被記下」——以及三件只有在這一層
 * 才看得見的事：
 *
 * 1. 鑄卡的 tokenId 來自**收據裡的 Transfer 事件**，不是模擬回傳值（會偏號，
 *    而偏號會讓續期覆寫到別人那張卡的 metadata）。
 * 2. 換 URI 時**不覆寫 tokenId**（傳 null 進去會把卡號洗掉，之後對不回那張卡）。
 * 3. 鏈上環境沒備妥時**整輪停手**，不是逐列記失敗（否則每個團隊的重試額度
 *    都會被一個與它們無關的原因燒完）。
 */

const CARD_ADDRESS = "0x00000000000000000000000000000000000000a1";
const OWNER_ADDRESS = "0x00000000000000000000000000000000000000b2";

jest.mock("@/config/contracts", () => {
  const actual =
    jest.requireActual<typeof import("@/config/contracts")>(
      "@/config/contracts",
    );
  return {
    ...actual,
    CONTRACT_ADDRESSES: {
      ...actual.CONTRACT_ADDRESSES,
      DYNAMIC_KYC_MEMBERSHIP: "0x00000000000000000000000000000000000000a1",
    },
  };
});

jest.mock("@/lib/viem", () => ({
  publicClient: {
    simulateContract: jest.fn(async () => ({ request: { mock: true } })),
    waitForTransactionReceipt: jest.fn(async () => ({
      status: "success",
      logs: [],
    })),
  },
}));

jest.mock("@/lib/wallet/admin_wallet", () => ({
  getAdminAccount: jest.fn(async () => ({ address: "0xadmin" })),
  getAdminWalletClient: jest.fn(async () => ({
    writeContract: jest.fn(async () => "0xhash"),
  })),
}));

jest.mock("@/repositories/team_subscription.repo", () => ({
  teamSubscriptionRepo: {
    listCardSyncCandidates: jest.fn(async () => []),
    countCardSyncGivenUp: jest.fn(async () => 0),
    countCardSyncPending: jest.fn(async () => 0),
    recordCardSynced: jest.fn(async () => undefined),
    recordCardSyncFailure: jest.fn(async () => undefined),
  },
}));

jest.mock("@/repositories/team.repo", () => ({
  teamRepo: {
    findTeamOwner: jest.fn(async () => ({
      userId: "user-1",
      address: "0x00000000000000000000000000000000000000b2",
    })),
  },
}));

const asMock = (fn: unknown) => fn as ReturnType<typeof jest.fn>;

const NOW_MS = 1_760_000_000_000;

function subscriptionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "sub-1",
    teamId: "team-1",
    planId: TEAM_PLAN.TEAM,
    status: TEAM_SUBSCRIPTION_STATUS.ACTIVE,
    currentPeriodStart: new Date(NOW_MS - 86_400_000),
    currentPeriodEnd: new Date(NOW_MS + 86_400_000),
    autoRenew: true,
    latestOrderId: "order-1",
    seats: 3,
    unitPrice: 840,
    nftTokenId: null,
    nftOwnerAddress: null,
    nftFingerprint: null,
    nftSyncedAt: null,
    nftSyncAttempts: 0,
    nftSyncError: null,
    createdAt: new Date(NOW_MS),
    updatedAt: new Date(NOW_MS),
    team: { name: "團隊一", deletedAt: null },
    ...overrides,
  };
}

// Info: (20260819 - Luphia) 真的 ERC721 Transfer log（三個參數都 indexed，data 為空）
function transferLog(tokenId: bigint, to: string = OWNER_ADDRESS) {
  return {
    address: CARD_ADDRESS,
    data: "0x",
    topics: encodeEventTopics({
      abi: ABIS.DYNAMIC_KYC_MEMBERSHIP,
      eventName: "Transfer",
      args: {
        from: "0x0000000000000000000000000000000000000000",
        to: to as `0x${string}`,
        tokenId,
      },
    }),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  asMock(teamSubscriptionRepo.listCardSyncCandidates).mockResolvedValue([]);
  asMock(teamSubscriptionRepo.countCardSyncGivenUp).mockResolvedValue(0);
  asMock(teamSubscriptionRepo.countCardSyncPending).mockResolvedValue(0);
  asMock(teamSubscriptionRepo.recordCardSynced).mockResolvedValue(undefined);
  asMock(teamSubscriptionRepo.recordCardSyncFailure).mockResolvedValue(
    undefined,
  );
  asMock(teamRepo.findTeamOwner).mockResolvedValue({
    userId: "user-1",
    address: OWNER_ADDRESS,
  });
  asMock(publicClient.simulateContract).mockResolvedValue({
    request: { mock: true },
  });
  asMock(publicClient.waitForTransactionReceipt).mockResolvedValue({
    status: "success",
    logs: [transferLog(42n)],
  });
  asMock(getAdminWalletClient).mockResolvedValue({
    writeContract: jest.fn(async () => "0xhash"),
  });
});

describe("付費訂閱尚未發卡", () => {
  it("鑄卡並把收據裡的 tokenId 寫回", async () => {
    asMock(teamSubscriptionRepo.listCardSyncCandidates).mockResolvedValue([
      subscriptionRow(),
    ]);

    const summary = await syncPendingSubscriptionCards(NOW_MS);

    expect(summary.minted).toBe(1);
    const simulate = asMock(publicClient.simulateContract).mock
      .calls[0][0] as Record<string, unknown>;
    expect(simulate.functionName).toBe("mintCard");
    expect(asMock(teamSubscriptionRepo.recordCardSynced)).toHaveBeenCalledWith(
      expect.objectContaining({
        teamId: "team-1",
        // Info: (20260819 - Luphia) 42 來自 Transfer 事件，不是任何模擬回傳值
        tokenId: "42",
        ownerAddress: OWNER_ADDRESS,
      }),
    );
  });

  // Info: (20260819 - Luphia) 卡片鑄給 OWNER（付訂閱費的那個人），不是任意成員
  it("鑄給團隊 OWNER 的地址", async () => {
    asMock(teamSubscriptionRepo.listCardSyncCandidates).mockResolvedValue([
      subscriptionRow(),
    ]);

    await syncPendingSubscriptionCards(NOW_MS);

    const simulate = asMock(publicClient.simulateContract).mock.calls[0][0] as {
      args: unknown[];
    };
    expect(String(simulate.args[0]).toLowerCase()).toBe(
      OWNER_ADDRESS.toLowerCase(),
    );
  });

  /**
   * Info: (20260819 - Luphia) 收據裡找不到 Transfer → 當失敗，**不寫猜的卡號**。
   *
   * 寫一個猜的卡號進去，續期時 `setTokenURI` 會覆寫到那個號碼真正的持有者
   * ——而那是另一個團隊的卡。寧可重試。
   */
  it("收據沒有 Transfer 事件時記失敗，不寫 tokenId", async () => {
    asMock(teamSubscriptionRepo.listCardSyncCandidates).mockResolvedValue([
      subscriptionRow(),
    ]);
    asMock(publicClient.waitForTransactionReceipt).mockResolvedValue({
      status: "success",
      logs: [],
    });

    const summary = await syncPendingSubscriptionCards(NOW_MS);

    expect(summary.failed).toBe(1);
    expect(
      asMock(teamSubscriptionRepo.recordCardSynced),
    ).not.toHaveBeenCalled();
    expect(
      asMock(teamSubscriptionRepo.recordCardSyncFailure),
    ).toHaveBeenCalledWith("team-1", expect.stringContaining("Transfer"));
  });

  // Info: (20260819 - Luphia) 別人的地址收到的卡不算這一筆（同一筆交易可能有多個事件）
  it("Transfer 的收受人不是 OWNER 時不採用那個 tokenId", async () => {
    asMock(teamSubscriptionRepo.listCardSyncCandidates).mockResolvedValue([
      subscriptionRow(),
    ]);
    asMock(publicClient.waitForTransactionReceipt).mockResolvedValue({
      status: "success",
      logs: [transferLog(99n, "0x00000000000000000000000000000000000000c3")],
    });

    const summary = await syncPendingSubscriptionCards(NOW_MS);

    expect(summary.failed).toBe(1);
    expect(
      asMock(teamSubscriptionRepo.recordCardSynced),
    ).not.toHaveBeenCalled();
  });
});

describe("已有卡片", () => {
  it("內容一致時不動鏈，但清掉待辦", async () => {
    const periodEnd = new Date(NOW_MS + 86_400_000);
    const row = subscriptionRow({
      nftTokenId: "42",
      currentPeriodEnd: periodEnd,
      nftFingerprint: buildCardFingerprint({
        effectivePlanId: TEAM_PLAN.TEAM,
        periodEndSec: Math.floor(periodEnd.getTime() / 1000),
        seats: 3,
      }),
    });
    asMock(teamSubscriptionRepo.listCardSyncCandidates).mockResolvedValue([
      row,
    ]);

    const summary = await syncPendingSubscriptionCards(NOW_MS);

    expect(asMock(publicClient.simulateContract)).not.toHaveBeenCalled();
    expect(summary.minted).toBe(0);
    expect(summary.updated).toBe(0);
    // Info: (20260819 - Luphia) 不清掉的話這一列每輪都會被撈出來，永久佔用批次額度
    expect(asMock(teamSubscriptionRepo.recordCardSynced)).toHaveBeenCalledTimes(
      1,
    );
  });

  it("內容變了就換 URI，且不覆寫 tokenId", async () => {
    asMock(teamSubscriptionRepo.listCardSyncCandidates).mockResolvedValue([
      subscriptionRow({ nftTokenId: "42", nftFingerprint: "team:1:1" }),
    ]);

    const summary = await syncPendingSubscriptionCards(NOW_MS);

    expect(summary.updated).toBe(1);
    const simulate = asMock(publicClient.simulateContract).mock.calls[0][0] as {
      functionName: string;
      args: unknown[];
    };
    expect(simulate.functionName).toBe("setTokenURI");
    expect(simulate.args[0]).toBe(BigInt(42));
    const recorded = asMock(teamSubscriptionRepo.recordCardSynced).mock
      .calls[0][0] as Record<string, unknown>;
    expect(recorded.tokenId).toBeUndefined();
  });
});

describe("不該發卡的情況", () => {
  it("免費方案沒有卡時不動鏈，只清待辦", async () => {
    asMock(teamSubscriptionRepo.listCardSyncCandidates).mockResolvedValue([
      subscriptionRow({ planId: TEAM_PLAN.FREE }),
    ]);

    const summary = await syncPendingSubscriptionCards(NOW_MS);

    expect(asMock(publicClient.simulateContract)).not.toHaveBeenCalled();
    expect(summary.skipped).toBe(1);
    expect(asMock(teamSubscriptionRepo.recordCardSynced)).toHaveBeenCalledTimes(
      1,
    );
  });

  /**
   * Info: (20260819 - Luphia) 過期的付費訂閱**不發卡**。
   *
   * 有效方案經 `resolveEffectivePlanId` 折算，與扣費側同一個判準——
   * 這裡若自己判 `planId !== free`，就會為一個已經沒有額度的訂閱鑄一張卡。
   */
  it("付費方案但已過期時不鑄卡", async () => {
    asMock(teamSubscriptionRepo.listCardSyncCandidates).mockResolvedValue([
      subscriptionRow({
        currentPeriodEnd: new Date(NOW_MS - 1000),
      }),
    ]);

    const summary = await syncPendingSubscriptionCards(NOW_MS);

    expect(asMock(publicClient.simulateContract)).not.toHaveBeenCalled();
    expect(summary.minted).toBe(0);
  });

  it("已解散的團隊不發卡，且清掉待辦", async () => {
    asMock(teamSubscriptionRepo.listCardSyncCandidates).mockResolvedValue([
      subscriptionRow({
        team: { name: "已解散", deletedAt: new Date(NOW_MS) },
      }),
    ]);

    const summary = await syncPendingSubscriptionCards(NOW_MS);

    expect(asMock(publicClient.simulateContract)).not.toHaveBeenCalled();
    expect(summary.skipped).toBe(1);
    expect(asMock(teamSubscriptionRepo.recordCardSynced)).toHaveBeenCalledTimes(
      1,
    );
  });

  it("找不到 OWNER 時記失敗", async () => {
    asMock(teamSubscriptionRepo.listCardSyncCandidates).mockResolvedValue([
      subscriptionRow(),
    ]);
    asMock(teamRepo.findTeamOwner).mockResolvedValue(null);

    const summary = await syncPendingSubscriptionCards(NOW_MS);

    expect(summary.failed).toBe(1);
    expect(
      asMock(teamSubscriptionRepo.recordCardSyncFailure),
    ).toHaveBeenCalledWith("team-1", expect.stringContaining("OWNER"));
  });
});

describe("鏈上環境未備妥", () => {
  /**
   * Info: (20260819 - Luphia) 整輪停手，**不動任何一列的重試次數**。
   *
   * 本機開發、尚未部署合約的環境都會走到這裡。逐列記失敗的話，
   * 五輪之後每個團隊都會被判為「已放棄」，而原因與那些團隊完全無關——
   * 環境修好之後還要有人手動把 `nftSyncAttempts` 歸零。
   */
  it("管理員錢包沒備妥時整輪跳過，不記失敗", async () => {
    asMock(teamSubscriptionRepo.listCardSyncCandidates).mockResolvedValue([
      subscriptionRow(),
      subscriptionRow({ teamId: "team-2" }),
    ]);
    asMock(getAdminWalletClient).mockResolvedValue(null);

    const summary = await syncPendingSubscriptionCards(NOW_MS);

    expect(summary.skipped).toBe(2);
    expect(summary.failed).toBe(0);
    expect(
      asMock(teamSubscriptionRepo.recordCardSyncFailure),
    ).not.toHaveBeenCalled();
    expect(asMock(publicClient.simulateContract)).not.toHaveBeenCalled();
  });
});

describe("批次與積壓", () => {
  // Info: (20260819 - Luphia) 被批次上限截掉的量要說出來（不靜默截斷）
  it("回報剩餘待同步數量", async () => {
    asMock(teamSubscriptionRepo.listCardSyncCandidates).mockResolvedValue([
      subscriptionRow(),
    ]);
    asMock(teamSubscriptionRepo.countCardSyncPending).mockResolvedValue(31);

    const summary = await syncPendingSubscriptionCards(NOW_MS, 1);

    expect(summary.remaining).toBe(30);
  });

  it("回報已放棄的數量", async () => {
    asMock(teamSubscriptionRepo.countCardSyncGivenUp).mockResolvedValue(2);

    const summary = await syncPendingSubscriptionCards(NOW_MS);

    expect(summary.givenUp).toBe(2);
  });
});
