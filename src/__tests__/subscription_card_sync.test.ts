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
import {
  buildCardFingerprint,
  buildCardMetadata,
  buildCardTokenUri,
} from "@/lib/subscription/subscription_card";
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
    /**
     * Info: (20260821 - Luphia) 鑄前有兩道讀取：探針（supportsInterface）與
     * 認養（balanceOf → 可能再掃事件）。預設「錢包可收、鏈上沒有既有卡」，
     * 讓既有的鑄卡案例走得到鑄造那一步。
     */
    readContract: jest.fn(async (args: { functionName: string }) => {
      if (args.functionName === "supportsInterface") return true;
      if (args.functionName === "balanceOf") return BigInt(0);
      throw new Error(`unexpected read: ${args.functionName}`);
    }),
    getLogs: jest.fn(async () => []),
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
    // Info: (20260821 - Luphia) 鑄前認領（樂觀鎖）：預設搶得到
    claimCardSync: jest.fn(async () => true),
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
    team: { deletedAt: null },
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
  asMock(publicClient.readContract).mockImplementation(
    async (args: { functionName: string }) => {
      if (args.functionName === "supportsInterface") return true;
      if (args.functionName === "balanceOf") return BigInt(0);
      throw new Error(`unexpected read: ${args.functionName}`);
    },
  );
  asMock(publicClient.getLogs).mockResolvedValue([]);
  asMock(teamSubscriptionRepo.claimCardSync).mockResolvedValue(true);
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
    /**
     * Info: (20260821 - Luphia) 這個失敗發生在**認領之後**（attempts 已 +1），
     * 因此不再另計——否則一輪失敗燒兩次重試，上限 5 實際只剩 2~3 次。
     */
    expect(
      asMock(teamSubscriptionRepo.recordCardSyncFailure),
    ).toHaveBeenCalledWith("team-1", expect.stringContaining("Transfer"), {
      countAttempt: false,
    });
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
    /**
     * Info: (20260821 - Luphia) 這個失敗發生在**認領之前**（attempts 還沒動），
     * 由失敗記錄計數——每一輪失敗恰好燒 1 次重試，不多不少。
     */
    expect(
      asMock(teamSubscriptionRepo.recordCardSyncFailure),
    ).toHaveBeenCalledWith("team-1", expect.stringContaining("OWNER"), {
      countAttempt: true,
    });
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

  /**
   * Info: (20260821 - Luphia) 已放棄的列**留在佇列裡**，不清待辦（review #6687
   * 測試背書：這個分支原本沒有任何測試，把它改成 `recordCardSynced` 全套仍然綠）。
   * 清掉的後果是 `countCardSyncGivenUp` 永遠回 0——中-1 那個唯一的告警訊號消失，
   * giveups 腳本也再列不出任何東西。正常情況 Repo 的 `lt maxAttempts` 過濾
   * 讓這種列根本不會被撈出來；這一條測的是過濾漂移時的第二道防線。
   */
  it("已達重試上限的列 → 不動鏈也不清待辦", async () => {
    asMock(teamSubscriptionRepo.listCardSyncCandidates).mockResolvedValue([
      subscriptionRow({ nftSyncAttempts: 5 }),
    ]);

    const summary = await syncPendingSubscriptionCards(NOW_MS);

    expect(summary.skipped).toBe(1);
    expect(asMock(publicClient.simulateContract)).not.toHaveBeenCalled();
    expect(
      asMock(teamSubscriptionRepo.recordCardSynced),
    ).not.toHaveBeenCalled();
  });
});

describe("鑄卡前的三道前置（review #6687 阻擋級 / 高-1 / 高-3）", () => {
  /**
   * Info: (20260821 - Luphia) 阻擋級的 worker 側對策：`_safeMint` 對沒有
   * `onERC721Received` 的錢包必定 revert（鏈上實測，每個現有 SCW 都是）。
   * 探針 false → 跳過、不算失敗、不燒重試——錢包升級（ADR 021）完成的
   * 下一輪自動開始鑄造，離鏈側不需要任何改動。
   */
  it("錢包不能收 ERC-721 → 跳過，不鑄、不記失敗、不燒重試", async () => {
    asMock(teamSubscriptionRepo.listCardSyncCandidates).mockResolvedValue([
      subscriptionRow(),
    ]);
    asMock(publicClient.readContract).mockImplementation(
      async (args: { functionName: string }) => {
        // Info: (20260821 - Luphia) V1 錢包沒有 supportsInterface：呼叫 revert
        if (args.functionName === "supportsInterface")
          throw new Error("execution reverted");
        if (args.functionName === "balanceOf") return BigInt(0);
        throw new Error(`unexpected read: ${args.functionName}`);
      },
    );

    const summary = await syncPendingSubscriptionCards(NOW_MS);

    expect(summary.walletNotReady).toBe(1);
    expect(summary.failed).toBe(0);
    expect(asMock(publicClient.simulateContract)).not.toHaveBeenCalled();
    expect(
      asMock(teamSubscriptionRepo.recordCardSyncFailure),
    ).not.toHaveBeenCalled();
  });

  /**
   * Info: (20260821 - Luphia) 認養（高-1 的一半）：「鏈上成功、DB 沒寫成」的
   * 中斷會留下一張 DB 不知道的卡。鑄之前先找，找到就認領——合約沒有 burn，
   * 多鑄的那張永遠收不回。
   */
  it("鏈上已有這個團隊的卡 → 認領，不再鑄造", async () => {
    asMock(teamSubscriptionRepo.listCardSyncCandidates).mockResolvedValue([
      subscriptionRow(),
    ]);
    const orphanUri = (() => {
      const facts = {
        teamId: "team-1",
        effectivePlanId: TEAM_PLAN.TEAM,
        periodStartSec: Math.floor(NOW_MS / 1000) - 86_400,
        periodEndSec: Math.floor(NOW_MS / 1000) + 86_400,
        seats: 3,
      };
      return buildCardTokenUri(buildCardMetadata(facts));
    })();
    asMock(publicClient.readContract).mockImplementation(
      async (args: { functionName: string; args?: unknown[] }) => {
        if (args.functionName === "supportsInterface") return true;
        if (args.functionName === "balanceOf") return BigInt(1);
        if (args.functionName === "ownerOf") return OWNER_ADDRESS;
        if (args.functionName === "tokenURI") return orphanUri;
        throw new Error(`unexpected read: ${args.functionName}`);
      },
    );
    asMock(publicClient.getLogs).mockResolvedValue([
      { args: { tokenId: BigInt(66) } },
    ]);

    const summary = await syncPendingSubscriptionCards(NOW_MS);

    expect(summary.minted).toBe(0);
    expect(asMock(publicClient.simulateContract)).not.toHaveBeenCalled();
    expect(asMock(teamSubscriptionRepo.recordCardSynced)).toHaveBeenCalledWith(
      expect.objectContaining({ teamId: "team-1", tokenId: "66" }),
    );
  });

  /**
   * Info: (20260821 - Luphia) 認領（高-1 的另一半）：兩個 worker 同時處理同一列，
   * 樂觀鎖讓後到的搶不到 → 跳過，不會鑄出第二張。
   */
  it("認領失敗（另一個 worker 搶到）→ 跳過，不鑄", async () => {
    asMock(teamSubscriptionRepo.listCardSyncCandidates).mockResolvedValue([
      subscriptionRow(),
    ]);
    asMock(teamSubscriptionRepo.claimCardSync).mockResolvedValue(false);

    const summary = await syncPendingSubscriptionCards(NOW_MS);

    expect(summary.minted).toBe(0);
    expect(asMock(publicClient.simulateContract)).not.toHaveBeenCalled();
  });

  /**
   * Info: (20260821 - Luphia) 付費優先（高-3）：首次上線的積壓幾乎都是免費團隊，
   * 剛付費的人的卡值得先鑄。
   */
  it("付費團隊排在免費團隊前面處理", async () => {
    const order: string[] = [];
    asMock(teamSubscriptionRepo.listCardSyncCandidates).mockResolvedValue([
      subscriptionRow({ teamId: "team-free", planId: TEAM_PLAN.FREE }),
      subscriptionRow({ teamId: "team-paid" }),
    ]);
    asMock(teamRepo.findTeamOwner).mockImplementation(async () => {
      return { userId: "user-1", address: OWNER_ADDRESS };
    });
    asMock(teamSubscriptionRepo.recordCardSynced).mockImplementation(
      async (params: { teamId: string }) => {
        order.push(params.teamId);
      },
    );

    await syncPendingSubscriptionCards(NOW_MS);

    expect(order[0]).toBe("team-paid");
  });
});
