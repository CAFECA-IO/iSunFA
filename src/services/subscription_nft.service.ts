import { decodeEventLog, getAddress, type Log } from "viem";

import { ABIS, CONTRACT_ADDRESSES } from "@/config/contracts";
import {
  SUBSCRIPTION_CARD_ACTION,
  SUBSCRIPTION_CARD_DELETED_FINGERPRINT,
  SUBSCRIPTION_CARD_MAX_SYNC_ATTEMPTS,
  SUBSCRIPTION_CARD_SYNC_BATCH_SIZE,
  SubscriptionCardAction,
} from "@/constants/subscription_nft";
import { confirmTransactionReceipt } from "@/lib/chain/confirm_transaction";
import {
  buildCardMetadata,
  buildCardTokenUri,
  decideCardAction,
  parseCardTokenUri,
  readCardTeamId,
  type ISubscriptionCardFacts,
  type ISubscriptionCardMetadata,
} from "@/lib/subscription/subscription_card";
import { publicClient } from "@/lib/viem";
import {
  getAdminAccount,
  getAdminWalletClient,
} from "@/lib/wallet/admin_wallet";
import { logger } from "@/lib/utils/logger";
import { teamRepo } from "@/repositories/team.repo";
import { teamSubscriptionRepo } from "@/repositories/team_subscription.repo";
import { resolveEffectivePlanId } from "@/lib/subscription/plan_rules";
import { TEAM_PLAN } from "@/constants/subscription_quota";

/**
 * Info: (20260819 - Luphia) 訂閱會員卡（鏈上 NFT）的同步。
 *
 * ## 為什麼是背景同步，而不是付款時當場鑄
 *
 * 履行訂閱是在付款交易裡完成的（`processOenPayment` 原子套用、checkout 路徑
 * `fulfillTeamSubscriptionOrder`）。把鏈上寫入放進那條路徑有兩個代價，而兩個都
 * 不能接受：
 *
 * - **失敗會污染付款結果**：RPC 逾時、nonce 撞號、gas 不足都是家常便飯。錢已經收了，
 *   而鑄卡失敗若讓履行拋錯，使用者會看到「付款失敗」卻已被扣款。
 * - **成功也要等**：確認一筆交易是數秒等級，那段時間掛在使用者的付款請求上。
 *
 * 因此訂閱一經變更就在 `TeamSubscription` 上留下待辦（`nftSyncedAt = null`），
 * 由 worker 每分鐘掃一次補上。**權益與顯示都不受影響**（兩路都只讀 DB，
 * 見 `plan.service`；產品裁定 20260821：付款完成即視為會員卡有效，
 * 不論鏈上是否已完成鑄造）——卡片是訂閱的鏈上鏡射憑證，鑄得慢或暫時
 * 鑄不出（錢包尚不能收 ERC-721，見下方探針）不影響使用者可見的任何東西。
 *
 * ## 冪等
 *
 * 兩層：DB 的指紋（`nftFingerprint`）決定「還需不需要動鏈」，而卡號
 * （`nftTokenId`）決定「是鑄新的還是換 URI」。少了前者，worker 每輪都會重鑄，
 * 而後果不是多花 gas——是同一個訂閱在鏈上留下兩張都看起來有效的卡。
 */

const CARD_ABI = ABIS.DYNAMIC_KYC_MEMBERSHIP;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

/**
 * Info: (20260819 - Luphia) 鑄造事件（`getLogs` 的過濾條件）。
 * 由 ABI 取出而不是自己寫一份簽章：兩份宣告遲早會分岔，而分岔的症狀是「掃不到任何卡」。
 */
const MINT_EVENT = CARD_ABI.find(
  (item): item is Extract<typeof item, { type: "event" }> =>
    item.type === "event" && item.name === "Transfer",
)!;

export interface ICardSyncOutcome {
  teamId: string;
  action: SubscriptionCardAction;
  reason: string;
  tokenId?: string;
  txHash?: string;
  error?: string;
}

export interface ICardSyncSummary {
  scanned: number;
  minted: number;
  updated: number;
  skipped: number;
  failed: number;
  // Info: (20260819 - Luphia) 已放棄（達重試上限）的總數：需要人介入，必須看得見
  givenUp: number;
  /**
   * Info: (20260821 - Luphia) 錢包尚不能收 ERC-721（探針 false）而跳過的數量。
   * 不算失敗、不燒重試——錢包升級（ADR 021）完成的下一輪自動開始鑄造。
   */
  walletNotReady: number;
  // Info: (20260819 - Luphia) 本輪沒處理完的剩餘量（下一輪會接手）；不靜默截斷
  remaining: number;
}

async function getClients() {
  const account = await getAdminAccount();
  const walletClient = await getAdminWalletClient();
  const cardAddress = CONTRACT_ADDRESSES.DYNAMIC_KYC_MEMBERSHIP;

  if (!account || !walletClient || !publicClient) {
    throw new Error("Blockchain clients not properly initialized");
  }
  if (!cardAddress) {
    throw new Error(
      "Server Config Error: DynamicKYCMembership address is missing",
    );
  }

  return { account, walletClient, cardAddress: getAddress(cardAddress) };
}

/**
 * Info: (20260819 - Luphia) 從收據裡找出剛鑄出的 tokenId。
 *
 * 為什麼不用 `simulateContract` 的回傳值：那是**模擬當下**的 `_nextTokenId`，
 * 中間只要有人鑄一張（含平台自己的另一筆同步）就會偏移一號。而偏一號的後果很重：
 * `setTokenURI` 是管理員權限且只檢查 `_requireOwned`，於是續期時會把
 * **別人那張卡**的 metadata 覆寫掉。
 *
 * 因此只認 `Transfer(from = 0x0, to = 持卡人)` 這一筆事件；找不到就當失敗，
 * 寧可重試也不寫一個猜的卡號進資料庫。
 */
export function extractMintedTokenId(
  logs: readonly Log[],
  cardAddress: string,
  to: string,
): string | null {
  const contract = cardAddress.toLowerCase();
  const recipient = to.toLowerCase();

  for (const log of logs) {
    if (log.address?.toLowerCase() !== contract) continue;
    try {
      const decoded = decodeEventLog({
        abi: CARD_ABI,
        data: log.data,
        topics: log.topics,
      });
      if (decoded.eventName !== "Transfer") continue;
      const args = decoded.args as unknown as {
        from: string;
        to: string;
        tokenId: bigint;
      };
      if (args.from.toLowerCase() !== ZERO_ADDRESS) continue;
      if (args.to.toLowerCase() !== recipient) continue;
      return args.tokenId.toString();
    } catch {
      // Info: (20260819 - Luphia) 同一個合約還有其他事件（KYCUpdated…），解不開就跳過
      continue;
    }
  }
  return null;
}

export interface IChainCard {
  tokenId: string;
  // Info: (20260819 - Luphia) metadata 解不開時為 null（外部鑄的卡、或格式已改）
  metadata: ISubscriptionCardMetadata | null;
  // Info: (20260819 - Luphia) metadata 裡的團隊；認不出來時為 null
  teamId: string | null;
}

/**
 * Info: (20260819 - Luphia) 讀出一個地址**現在**持有的訂閱會員卡。
 *
 * Info: (20260821 - Luphia) 唯一的呼叫端是 worker 鑄卡前的認養
 * （`findExistingCardForTeam`）。原本這一支服務 `/auth/me` 的「顯示以鏈上為準」，
 * 帶著 DB 卡號快取（hint）與「要不要掃事件」的開關——那條顯示路徑已依
 * 產品裁定 20260821 整層移除（方案一律讀 DB），hint 機制隨之只剩死碼，一併清掉。
 *
 * 兩段，順序是為了少打 RPC：
 *
 * 1. `balanceOf` 一次讀。回 0 就結束——「這個地址沒有任何卡」是權威答案，
 *    不需要再掃任何東西。
 * 2. 掃 `Transfer` 鑄造事件找出 token：合約沒有 ERC721Enumerable，
 *    問不到某個地址持有哪些 token，事件是唯一的辦法。
 *
 * `ownerOf` 一律再確認一次：卡片可被持有人自行轉走（合約只擋黑名單），
 * 而 `Transfer` 事件只說「曾經鑄給他」。
 */
export async function readOwnedChainCards(
  address: string,
): Promise<IChainCard[]> {
  const { cardAddress } = await getClients();
  const owner = getAddress(address);

  const balance = (await publicClient.readContract({
    address: cardAddress,
    abi: CARD_ABI,
    functionName: "balanceOf",
    args: [owner],
  })) as bigint;

  if (balance === BigInt(0)) return [];

  const confirmed: IChainCard[] = [];
  const seen = new Set<string>();

  const consider = async (tokenId: string): Promise<void> => {
    if (seen.has(tokenId)) return;
    seen.add(tokenId);
    try {
      const holder = (await publicClient.readContract({
        address: cardAddress,
        abi: CARD_ABI,
        functionName: "ownerOf",
        args: [BigInt(tokenId)],
      })) as string;
      if (holder.toLowerCase() !== owner.toLowerCase()) return;

      const uri = (await publicClient.readContract({
        address: cardAddress,
        abi: CARD_ABI,
        functionName: "tokenURI",
        args: [BigInt(tokenId)],
      })) as string;
      const metadata = parseCardTokenUri(uri);
      confirmed.push({
        tokenId,
        metadata,
        teamId: readCardTeamId(metadata),
      });
    } catch {
      /**
       * Info: (20260819 - Luphia) 單一 token 讀不到就跳過（可能已被銷毀、或 id 是舊的）。
       * 不讓一張讀不到的卡把整個地址的結果變成「沒有卡」——那會把付費戶顯示成免費版。
       */
    }
  };

  for (const tokenId of await discoverMintedTokenIds(cardAddress, owner)) {
    await consider(tokenId);
  }

  return confirmed;
}

/**
 * Info: (20260819 - Luphia) 掃 `Transfer(from = 0x0, to = 持卡人)` 找出鑄給這個地址的卡。
 *
 * 只掃鑄造（`from` 是零地址）：轉入的卡不是這個系統發的憑證，方案判斷不該採信
 * ——否則在二級市場拿到一張卡就能讓徽章顯示企業版。
 *
 * 掃全鏈（`fromBlock: 0`）是刻意的：本專案跑的是自有鏈，卡片合約的事件量很小，
 * 而「從某個區塊開始掃」需要一個會過期的假設（部署區塊），錯了就是安靜地漏卡。
 */
async function discoverMintedTokenIds(
  cardAddress: `0x${string}`,
  owner: string,
): Promise<string[]> {
  const logs = await publicClient.getLogs({
    address: cardAddress,
    event: MINT_EVENT,
    args: { from: ZERO_ADDRESS as `0x${string}`, to: owner as `0x${string}` },
    fromBlock: BigInt(0),
    toBlock: "latest",
  });

  return logs
    .map((log) => {
      const args = log.args as { tokenId?: bigint };
      return args.tokenId?.toString();
    })
    .filter((tokenId): tokenId is string => Boolean(tokenId));
}

/**
 * Info: (20260821 - Luphia) 錢包能不能收 ERC-721：`supportsInterface(0x150b7a02)`。
 *
 * V1 錢包沒有這個函式 → 呼叫 revert → 視為 false。與升級待辦腳本
 * （`scripts/request_wallet_upgrades.ts`）同一條判準；Fido2AccountV2（ADR 021）
 * 回 true——探針的兩側語意在 forge 測試裡各有一條釘住。
 */
async function walletCanReceive(address: string): Promise<boolean> {
  try {
    const result = (await publicClient.readContract({
      address: getAddress(address),
      abi: [
        {
          type: "function",
          name: "supportsInterface",
          stateMutability: "view",
          inputs: [{ name: "interfaceId", type: "bytes4" }],
          outputs: [{ name: "", type: "bool" }],
        },
      ] as const,
      functionName: "supportsInterface",
      args: ["0x150b7a02"],
    })) as boolean;
    return result === true;
  } catch {
    return false;
  }
}

/**
 * Info: (20260821 - Luphia) 鑄之前先找既有卡（review 高-1）。
 *
 * 「鏈上成功、DB 沒寫成」的中斷（等收據逾時、SIGTERM、DB 抖動）會留下一張
 * DB 不知道的卡；合約沒有 burn，再鑄一張就是一張永遠收不回的孤兒卡。
 * 用讀取端既有的 `readOwnedChainCards`（含事件掃描）找這個團隊的卡，
 * 找到就回卡號讓呼叫端認領。
 */
async function findExistingCardForTeam(
  owner: string,
  teamId: string,
): Promise<string | null> {
  try {
    const cards = await readOwnedChainCards(owner);
    const match = cards.find((card) => card.teamId === teamId);
    return match?.tokenId ?? null;
  } catch {
    /**
     * Info: (20260821 - Luphia) 查不到就當沒有，照常走鑄造：這一步是防重複的
     * 加強，不是鑄造的前提——讓它的失敗擋住鑄造，等於用一個讀取問題
     * 換一個功能停擺。
     */
    return null;
  }
}

async function mintCard(to: string, uri: string) {
  const { account, walletClient, cardAddress } = await getClients();
  const recipient = getAddress(to);

  /**
   * Info: (20260819 - Luphia) 先模擬再送：`mintCard` 有 `notBlacklisted(to)`，
   * 被列入黑名單的地址會 revert。模擬讓錯誤名稱（AddressBlacklisted）當場拿到，
   * 寫進 `nftSyncError` 才看得出「重試一百次也一樣」。
   */
  const { request } = await publicClient.simulateContract({
    account,
    address: cardAddress,
    abi: CARD_ABI,
    functionName: "mintCard",
    args: [recipient, uri],
  });

  const hash = await walletClient.writeContract(request);
  const receipt = await confirmTransactionReceipt(hash);
  const tokenId = extractMintedTokenId(receipt.logs, cardAddress, recipient);

  if (!tokenId) {
    throw new Error(
      `鑄卡交易成功但收據裡找不到 Transfer 事件，無法確認 tokenId: ${hash}`,
    );
  }

  return { tokenId, hash };
}

async function updateCardUri(tokenId: string, uri: string) {
  const { account, walletClient, cardAddress } = await getClients();

  const { request } = await publicClient.simulateContract({
    account,
    address: cardAddress,
    abi: CARD_ABI,
    functionName: "setTokenURI",
    args: [BigInt(tokenId), uri],
  });

  const hash = await walletClient.writeContract(request);
  await confirmTransactionReceipt(hash);
  return { hash };
}

/**
 * Info: (20260819 - Luphia) 掃一輪待同步的訂閱卡。
 *
 * 合約位址沒設定時**整輪停手**（回 skipped），不是逐列記失敗：後者會把每一個
 * 團隊的重試額度都燒完，而原因根本與那些團隊無關（本機開發、尚未部署合約的環境
 * 都會遇到）。同一個理由適用於管理員錢包沒備妥。
 */
export async function syncPendingSubscriptionCards(
  nowMs: number,
  batchSize: number = SUBSCRIPTION_CARD_SYNC_BATCH_SIZE,
): Promise<ICardSyncSummary> {
  const log = logger.child({ service: "SubscriptionCardSync" });
  const summary: ICardSyncSummary = {
    scanned: 0,
    minted: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    givenUp: 0,
    walletNotReady: 0,
    remaining: 0,
  };

  const candidates = await teamSubscriptionRepo.listCardSyncCandidates(
    batchSize,
    SUBSCRIPTION_CARD_MAX_SYNC_ATTEMPTS,
  );
  summary.scanned = candidates.length;
  summary.givenUp = await teamSubscriptionRepo.countCardSyncGivenUp(
    SUBSCRIPTION_CARD_MAX_SYNC_ATTEMPTS,
  );
  // Info: (20260819 - Luphia) 被批次上限截掉的量要說出來，不靜默截斷
  const pending = await teamSubscriptionRepo.countCardSyncPending(
    SUBSCRIPTION_CARD_MAX_SYNC_ATTEMPTS,
  );
  summary.remaining = Math.max(0, pending - candidates.length);

  if (candidates.length === 0) {
    if (summary.givenUp > 0) {
      log.warn("有訂閱卡同步已達重試上限，需要人工檢查 nftSyncError", {
        givenUp: summary.givenUp,
      });
    }
    return summary;
  }

  try {
    await getClients();
  } catch (error) {
    log.warn("鏈上環境未備妥，本輪不同步訂閱卡", {
      reason: error instanceof Error ? error.message : String(error),
      pending: candidates.length,
    });
    summary.skipped = candidates.length;
    return summary;
  }

  const nowSec = Math.floor(nowMs / 1000);

  /**
   * Info: (20260821 - Luphia) 付費優先（review #6687 高-3 的另一半）。
   *
   * 首次上線的積壓幾乎都是免費團隊（不需要鑄卡、只是清佇列），而剛付費的人
   * 的卡值得先鑄。付費/免費要折算有效方案（status + 週期），Repo 的 orderBy
   * 排不了，在這裡排——同組內維持 Repo 給的新到舊。
   */
  candidates.sort((a, b) => {
    const aPaid = resolveEffectivePlanId(a, nowSec) !== TEAM_PLAN.FREE ? 0 : 1;
    const bPaid = resolveEffectivePlanId(b, nowSec) !== TEAM_PLAN.FREE ? 0 : 1;
    return aPaid - bPaid;
  });

  for (const subscription of candidates) {
    const { teamId } = subscription;
    /**
     * Info: (20260821 - Luphia) 這一輪是否已認領（attempts 已 +1）。失敗記錄
     * 據此決定要不要再計一次——認領與失敗各 +1 會讓每輪失敗燒兩次重試，
     * 上限 5 實際只剩 2~3 次（第四輪 self-review）。
     */
    let claimedAttempt = false;
    try {
      /**
       * Info: (20260819 - Luphia) 已解散的團隊不發卡，但要把待辦清掉：
       * 留著 null 會讓它每輪都被撈出來，永久佔用批次額度。
       */
      if (subscription.team.deletedAt) {
        await teamSubscriptionRepo.recordCardSynced({
          teamId,
          fingerprint: SUBSCRIPTION_CARD_DELETED_FINGERPRINT,
          syncedAt: new Date(nowMs),
        });
        summary.skipped += 1;
        continue;
      }

      const owner = await teamRepo.findTeamOwner(teamId);
      if (!owner) {
        throw new Error("團隊沒有 OWNER，無法決定卡片持有人");
      }

      const facts: ISubscriptionCardFacts = {
        teamId,
        // Info: (20260819 - Luphia) 有效方案與扣費側同一個判準（過期／PAST_DUE 折算為 free）
        effectivePlanId: resolveEffectivePlanId(subscription, nowSec),
        periodStartSec: Math.floor(
          subscription.currentPeriodStart.getTime() / 1000,
        ),
        periodEndSec: Math.floor(
          subscription.currentPeriodEnd.getTime() / 1000,
        ),
        seats: subscription.seats,
      };

      const decision = decideCardAction(
        facts,
        {
          tokenId: subscription.nftTokenId,
          syncedFingerprint: subscription.nftFingerprint,
          attempts: subscription.nftSyncAttempts,
        },
        SUBSCRIPTION_CARD_MAX_SYNC_ATTEMPTS,
      );

      const uri = buildCardTokenUri(buildCardMetadata(facts));

      if (decision.action === SUBSCRIPTION_CARD_ACTION.MINT) {
        /**
         * Info: (20260821 - Luphia) 鑄造前的三道前置，順序有意義：
         *
         * 1. **探針**（review #6687 阻擋級的 worker 側對策）：`mintCard` 用
         *    `_safeMint`，收受人沒有 `onERC721Received` 就必定 revert
         *    `ERC721InvalidReceiver`——鏈上實測對現有的每一個 SCW 都成立。
         *    探針 false 時**跳過、不算失敗、不燒重試**：那不是這個團隊的錯，
         *    是錢包版本的事（ADR 021）；升級完成的下一輪自動開始鑄造。
         * 2. **認養**（review 高-1 的一半）：鏈上寫入成功、DB 寫入失敗的中斷
         *    會留下一張 DB 不知道的卡。鑄之前先找，找到就認領而不是再鑄
         *    ——合約沒有 burn，多鑄的那張收不回來。
         * 3. **認領**（review 高-1 的另一半）：以 `nftSyncAttempts` 當樂觀鎖，
         *    兩個 worker 同時處理同一列時只有一個搶得到，另一個這輪跳過。
         */
        if (!(await walletCanReceive(owner.address))) {
          summary.walletNotReady += 1;
          continue;
        }

        const existing = await findExistingCardForTeam(owner.address, teamId);
        if (existing) {
          await teamSubscriptionRepo.recordCardSynced({
            teamId,
            tokenId: existing,
            ownerAddress: owner.address,
            fingerprint: decision.fingerprint,
            syncedAt: new Date(nowMs),
          });
          summary.skipped += 1;
          log.warn("鏈上已有這個團隊的卡，認領而不再鑄造", {
            teamId,
            tokenId: existing,
          });
          continue;
        }

        const claimed = await teamSubscriptionRepo.claimCardSync(
          teamId,
          subscription.nftSyncAttempts,
        );
        if (!claimed) {
          summary.skipped += 1;
          continue;
        }
        claimedAttempt = true;

        const { tokenId, hash } = await mintCard(owner.address, uri);
        await teamSubscriptionRepo.recordCardSynced({
          teamId,
          tokenId,
          ownerAddress: owner.address,
          fingerprint: decision.fingerprint,
          syncedAt: new Date(nowMs),
        });
        summary.minted += 1;
        log.info("訂閱卡已鑄造", {
          teamId,
          tokenId,
          txHash: hash,
          plan: facts.effectivePlanId,
        });
        continue;
      }

      if (decision.action === SUBSCRIPTION_CARD_ACTION.UPDATE_URI) {
        const { hash } = await updateCardUri(subscription.nftTokenId!, uri);
        await teamSubscriptionRepo.recordCardSynced({
          teamId,
          fingerprint: decision.fingerprint,
          syncedAt: new Date(nowMs),
        });
        summary.updated += 1;
        log.info("訂閱卡內容已更新", {
          teamId,
          tokenId: subscription.nftTokenId,
          txHash: hash,
          plan: facts.effectivePlanId,
        });
        continue;
      }

      /**
       * Info: (20260819 - Luphia) NONE / GIVE_UP：都不動鏈。
       *
       * NONE 要把待辦清掉（免費方案不發卡也算「處理完了」），
       * GIVE_UP 則**不清**——那一列必須留在待辦裡，只是被重試上限擋著不再嘗試，
       * 人修好原因（解黑名單、補角色）並把 `nftSyncAttempts` 歸零後就會自動接續。
       */
      if (decision.action === SUBSCRIPTION_CARD_ACTION.NONE) {
        await teamSubscriptionRepo.recordCardSynced({
          teamId,
          fingerprint: decision.fingerprint,
          syncedAt: new Date(nowMs),
        });
      }
      summary.skipped += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      summary.failed += 1;
      log.error("訂閱卡同步失敗", { teamId, reason: message });
      try {
        await teamSubscriptionRepo.recordCardSyncFailure(teamId, message, {
          countAttempt: !claimedAttempt,
        });
      } catch (recordError) {
        // Info: (20260819 - Luphia) 連失敗都記不下來（DB 掛了）：只能留 log，下一輪重試
        log.error("訂閱卡同步失敗且無法記錄", {
          teamId,
          reason:
            recordError instanceof Error
              ? recordError.message
              : String(recordError),
        });
      }
    }
  }

  log.info("訂閱卡同步完成", { ...summary });
  return summary;
}
