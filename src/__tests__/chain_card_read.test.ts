import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;

import { readOwnedChainCards } from "@/services/subscription_nft.service";
import { publicClient } from "@/lib/viem";
import {
  buildCardMetadata,
  buildCardTokenUri,
  type ISubscriptionCardFacts,
} from "@/lib/subscription/subscription_card";
import { TEAM_PLAN } from "@/constants/subscription_quota";

/**
 * Info: (20260819 - Luphia) 讀鏈上會員卡。
 *
 * Info: (20260821 - Luphia) 唯一的呼叫端是 worker 鑄卡前的認養（高-1）：
 * 「鏈上成功、DB 沒寫成」的中斷會留下一張 DB 不知道的卡，鑄之前要找得到它。
 * 原本這一支還服務 `/auth/me` 的顯示路徑，帶著卡號快取（hint）與掃描開關
 * ——那條路徑已依產品裁定 20260821 移除（方案一律讀 DB），這裡跟著瘦身。
 *
 * 三件只有在這一層才看得見的事：
 *
 * 1. `balanceOf` 是閘門：回 0 就一次 RPC 結束，不掃任何事件。
 * 2. `ownerOf` 一定要再確認：卡片可被持有人自行轉走，
 *    而 `Transfer` 事件只說「曾經鑄給他」。
 * 3. 讀不到的單張卡不能污染整個結果——認養找不到既有卡的後果是多鑄一張
 *    收不回的孤兒卡。
 */

const OWNER = "0x00000000000000000000000000000000000000b2";
const OTHER = "0x00000000000000000000000000000000000000c3";

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
    readContract: jest.fn(async () => BigInt(0)),
    getLogs: jest.fn(async () => []),
    simulateContract: jest.fn(async () => ({ request: {} })),
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

jest.mock("@/repositories/team.repo", () => ({
  teamRepo: { findTeamOwner: jest.fn(async () => null) },
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

const asMock = (fn: unknown) => fn as ReturnType<typeof jest.fn>;

const NOW_SEC = 1_760_000_000;

function tokenUri(teamId: string, plan: string) {
  const facts: ISubscriptionCardFacts = {
    teamId,
    effectivePlanId: plan as ISubscriptionCardFacts["effectivePlanId"],
    periodStartSec: NOW_SEC - 86_400,
    periodEndSec: NOW_SEC + 86_400,
    seats: 2,
  };
  return buildCardTokenUri(buildCardMetadata(facts));
}

/**
 * Info: (20260819 - Luphia) 一份會照 functionName 回答的假鏈。
 * 逐次 mockResolvedValueOnce 排隊的寫法在這裡行不通——呼叫次序取決於
 * 受測程式的分支，那正是要測的東西。
 */
function stubChain(options: {
  balance: bigint;
  owners?: Record<string, string>;
  uris?: Record<string, string>;
}) {
  asMock(publicClient.readContract).mockImplementation(
    async (args: unknown) => {
      const call = args as { functionName: string; args: unknown[] };
      if (call.functionName === "balanceOf") return options.balance;
      const tokenId = String(call.args[0]);
      if (call.functionName === "ownerOf") {
        const owner = options.owners?.[tokenId];
        if (!owner) throw new Error("nonexistent token");
        return owner;
      }
      if (call.functionName === "tokenURI") {
        const uri = options.uris?.[tokenId];
        if (!uri) throw new Error("nonexistent token");
        return uri;
      }
      throw new Error(`unexpected call: ${call.functionName}`);
    },
  );
}

function mintLogs(...tokenIds: bigint[]) {
  asMock(publicClient.getLogs).mockResolvedValue(
    tokenIds.map((tokenId) => ({ args: { tokenId } })),
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  asMock(publicClient.getLogs).mockResolvedValue([]);
});

describe("readOwnedChainCards", () => {
  it("沒有卡（balanceOf = 0）就只打一次 RPC，不掃事件", async () => {
    stubChain({ balance: BigInt(0) });

    const cards = await readOwnedChainCards(OWNER);

    expect(cards).toEqual([]);
    expect(asMock(publicClient.readContract)).toHaveBeenCalledTimes(1);
    expect(asMock(publicClient.getLogs)).not.toHaveBeenCalled();
  });

  it("掃鑄造事件找出持有中的卡片", async () => {
    stubChain({
      balance: BigInt(1),
      owners: { "9": OWNER },
      uris: { "9": tokenUri("team-3", TEAM_PLAN.BUSINESS) },
    });
    mintLogs(BigInt(9));

    const cards = await readOwnedChainCards(OWNER);

    expect(cards.map((card) => card.teamId)).toEqual(["team-3"]);
    expect(asMock(publicClient.getLogs)).toHaveBeenCalledTimes(1);
  });

  it("只掃鑄造（from 為零地址）的事件", async () => {
    stubChain({ balance: BigInt(1), owners: {}, uris: {} });

    await readOwnedChainCards(OWNER);

    const query = asMock(publicClient.getLogs).mock.calls[0][0] as {
      args: { from: string; to: string };
    };
    expect(query.args.from).toBe("0x0000000000000000000000000000000000000000");
    expect(query.args.to).toBe(OWNER);
  });

  /**
   * Info: (20260819 - Luphia) 卡片已被轉走時，那個卡號**不算**。
   * 少了 `ownerOf` 這一步，認養會把一張已不在手上的卡當成「既有卡」認領，
   * DB 從此指著一張別人的卡。
   */
  it("已轉給別人的卡不算持有", async () => {
    stubChain({
      balance: BigInt(1),
      owners: { "42": OTHER, "77": OWNER },
      uris: {
        "42": tokenUri("team-1", TEAM_PLAN.TEAM),
        "77": tokenUri("team-2", TEAM_PLAN.BUSINESS),
      },
    });
    mintLogs(BigInt(42), BigInt(77));

    const cards = await readOwnedChainCards(OWNER);

    expect(cards.map((card) => card.tokenId)).toEqual(["77"]);
  });

  /**
   * Info: (20260819 - Luphia) 一張讀不到的卡不該讓整個結果變成「沒有卡」——
   * 對認養而言那等於「找不到既有卡」，於是多鑄一張收不回的孤兒卡。
   */
  it("其中一張讀不到時，其他張仍然回得出來", async () => {
    stubChain({
      balance: BigInt(2),
      owners: { "5": OWNER, "6": OWNER },
      uris: { "6": tokenUri("team-1", TEAM_PLAN.TEAM) },
    });
    mintLogs(BigInt(5), BigInt(6));

    const cards = await readOwnedChainCards(OWNER);

    expect(cards.map((card) => card.tokenId)).toEqual(["6"]);
  });

  // Info: (20260819 - Luphia) 不是本系統格式的卡：留著 tokenId 但沒有團隊，認養比對 teamId 會忽略它
  it("metadata 解不開時 teamId 為 null", async () => {
    stubChain({
      balance: BigInt(1),
      owners: { "3": OWNER },
      uris: { "3": "ipfs://QmSomethingElse" },
    });
    mintLogs(BigInt(3));

    const cards = await readOwnedChainCards(OWNER);

    expect(cards).toEqual([{ tokenId: "3", metadata: null, teamId: null }]);
  });

  // Info: (20260819 - Luphia) 同一個 tokenId 在事件裡出現兩次（理論上不會，防禦性去重）
  it("同一個卡號不會被處理兩次", async () => {
    stubChain({
      balance: BigInt(2),
      owners: { "8": OWNER },
      uris: { "8": tokenUri("team-1", TEAM_PLAN.TEAM) },
    });
    mintLogs(BigInt(8), BigInt(8));

    const cards = await readOwnedChainCards(OWNER);

    expect(cards).toHaveLength(1);
    expect(asMock(publicClient.readContract)).toHaveBeenCalledTimes(3);
  });
});
