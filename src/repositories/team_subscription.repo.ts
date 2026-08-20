import { prisma } from "@/lib/prisma";
import { Prisma, TeamSubscription } from "@/generated";
import {
  BILLING_INTERVAL,
  BillingInterval,
  TEAM_PLAN,
  TEAM_SUBSCRIPTION_STATUS,
} from "@/constants/subscription_quota";

/**
 * Info: (20260807 - Luphia) 團隊訂閱 Repository（設計書 §3.1）。
 * 只做資料存取，方案額度解析與計費邏輯在 Service 層。
 */

export interface IApplyTeamSubscriptionInput {
  teamId: string;
  planId: string;
  billingInterval: BillingInterval;
  orderId: string | null;
  nowMs: number;
  // Info: (20260814 - Luphia) 本期付費席次與單價快照（規範 P2）；缺省維持既有值不動
  seats?: number;
  unitPrice?: number;
}

const DAY_MS = 86_400_000;

/**
 * Info: (20260819 - Luphia) 「這一列的鏈上會員卡需要重新同步」的標記。
 *
 * `nftSyncedAt = null` 就是待辦：worker 只撈 null 的列（見 `listCardSyncCandidates`），
 * 因此它同時是「上次同步時間」與工作佇列。用同一個欄位而不是多加一個布林，
 * 是因為兩者永遠同時改變——分成兩欄只是多一個會不一致的地方。
 *
 * 失敗次數一併歸零：方案改了之後是一件**新的**工作，不該繼承上一份工作的重試額度
 * （否則舊的永久性失敗會讓新訂閱一次都不嘗試）。
 */
const CARD_DIRTY = {
  nftSyncedAt: null,
  nftSyncAttempts: 0,
  nftSyncError: null,
} as const;

/**
 * Info: (20260807 - Luphia) 付款成功後套用訂閱（設計書 §7 PUT /subscription 的履行）。
 * 以 TransactionClient 形式導出，供 processOenPayment 在同一筆付款交易內原子套用；
 * 計費週期：月繳 30 天、年繳 365 天，自付款當下起算。
 */
export async function applyTeamSubscriptionInTx(
  tx: Prisma.TransactionClient,
  input: IApplyTeamSubscriptionInput,
): Promise<TeamSubscription> {
  const { teamId, planId, billingInterval, orderId, nowMs, seats, unitPrice } =
    input;
  const periodDays = billingInterval === BILLING_INTERVAL.YEAR ? 365 : 30;
  const currentPeriodStart = new Date(nowMs);
  const currentPeriodEnd = new Date(nowMs + periodDays * DAY_MS);

  return tx.teamSubscription.upsert({
    where: { teamId },
    update: {
      planId,
      status: TEAM_SUBSCRIPTION_STATUS.ACTIVE,
      currentPeriodStart,
      currentPeriodEnd,
      autoRenew: true,
      latestOrderId: orderId,
      // Info: (20260819 - Luphia) 方案／期間變了，鏈上那張卡就過期了：標記待同步
      ...CARD_DIRTY,
      /**
       * Info: (20260814 - Luphia) 席次與單價缺省時不覆寫：期中加人只動 seats，
       * 續訂或改方案才會連同單價一起換新。用 undefined 讓 Prisma 略過該欄位。
       */
      seats,
      unitPrice,
    },
    create: {
      teamId,
      planId,
      status: TEAM_SUBSCRIPTION_STATUS.ACTIVE,
      currentPeriodStart,
      currentPeriodEnd,
      autoRenew: true,
      latestOrderId: orderId,
      seats: seats ?? 1,
      unitPrice: unitPrice ?? 0,
    },
  });
}

export class TeamSubscriptionRepository {
  async getByTeamId(teamId: string): Promise<TeamSubscription | null> {
    return prisma.teamSubscription.findUnique({ where: { teamId } });
  }

  /**
   * Info: (20260818 - Luphia) 一次取多個團隊的訂閱（第三輪 C-10）。
   *
   * 保留期守護行程原本每個團隊打一趟 `getByTeamId`，而且完全序列——
   * 一萬個有記憶的團隊就是一萬趟往返。對帳本身是每 6 小時一次的背景工作，
   * 但那個形狀會隨團隊數線性惡化，而它跑得越久，落後的刪除就越多。
   */
  async listByTeamIds(teamIds: string[]): Promise<TeamSubscription[]> {
    if (teamIds.length === 0) return [];
    return prisma.teamSubscription.findMany({
      where: { teamId: { in: teamIds } },
    });
  }

  async create(
    data: Prisma.TeamSubscriptionUncheckedCreateInput,
  ): Promise<TeamSubscription> {
    return prisma.teamSubscription.create({ data });
  }

  /**
   * Info: (20260814 - Luphia) 期中增加席次（規範 P3）：只動 seats，不碰週期與單價。
   * 用 increment 而非讀後寫，兩個管理者同時邀請時才不會有人的席次被蓋掉。
   */
  async addSeats(teamId: string, seats: number): Promise<void> {
    if (seats <= 0) return;
    await prisma.teamSubscription.update({
      where: { teamId },
      // Info: (20260819 - Luphia) 席次寫在卡片 metadata 裡，加人之後那張卡要換 URI
      data: { seats: { increment: seats }, ...CARD_DIRTY },
    });
  }

  async update(
    id: string,
    data: Prisma.TeamSubscriptionUpdateInput,
  ): Promise<TeamSubscription> {
    return prisma.teamSubscription.update({ where: { id }, data });
  }

  // Info: (20260807 - Luphia) 綁卡直扣（checkout）履行路徑用的獨立交易版本
  async applyTeamSubscription(
    input: IApplyTeamSubscriptionInput,
  ): Promise<TeamSubscription> {
    return prisma.$transaction(async (tx) =>
      applyTeamSubscriptionInTx(tx, input),
    );
  }

  /**
   * Info: (20260807 - Luphia) 續訂 Worker 用：到期未續約的付費方案降級 free（設計書 §9 P4）。
   * status 記 PAST_DUE 保留「曾為付費戶」的稽核線索；扣費側另有 fail-closed 防線
   * （resolveEffectivePlanId），Worker 未跑到期間也不會多放額度。
   */
  async expireOverdue(nowMs: number): Promise<number> {
    const result = await prisma.teamSubscription.updateMany({
      where: {
        status: TEAM_SUBSCRIPTION_STATUS.ACTIVE,
        planId: { not: TEAM_PLAN.FREE },
        currentPeriodEnd: { lt: new Date(nowMs) },
        autoRenew: false,
      },
      data: {
        planId: TEAM_PLAN.FREE,
        status: TEAM_SUBSCRIPTION_STATUS.PAST_DUE,
        // Info: (20260819 - Luphia) 降級了，鏈上那張卡不能繼續聲稱有效訂閱
        ...CARD_DIRTY,
      },
    });
    return result.count;
  }

  /**
   * Info: (20260807 - Luphia) autoRenew=true 的到期戶不直接降級：標 PAST_DUE 由續訂流程
   * 嘗試扣款（自動扣款續訂為後續 issue；標記後 fail-closed 防線即刻生效，不多放額度）。
   */
  async markOverdueForRenewal(nowMs: number): Promise<number> {
    const result = await prisma.teamSubscription.updateMany({
      where: {
        status: TEAM_SUBSCRIPTION_STATUS.ACTIVE,
        planId: { not: TEAM_PLAN.FREE },
        currentPeriodEnd: { lt: new Date(nowMs) },
        autoRenew: true,
      },
      // Info: (20260819 - Luphia) 進入寬限期（PAST_DUE）同樣要讓卡片重新對帳一次
      data: { status: TEAM_SUBSCRIPTION_STATUS.PAST_DUE, ...CARD_DIRTY },
    });
    return result.count;
  }

  /**
   * Info: (20260819 - Luphia) 這些團隊的卡號快取（方案讀取的 hint）。
   *
   * 一次查回來而不是逐團問：`/auth/me` 每次頁面載入都會呼叫，逐團往返會讓
   * 一位擁有多個團隊的使用者每次多打數趟。值可能是 null（尚未鑄卡），
   * 而 null 本身就是資訊——它讓方案讀取知道要去掃鏈上事件。
   */
  async listCardTokenIds(
    teamIds: string[],
  ): Promise<Map<string, string | null>> {
    if (teamIds.length === 0) return new Map();
    const rows = await prisma.teamSubscription.findMany({
      where: { teamId: { in: teamIds } },
      select: { teamId: true, nftTokenId: true },
    });
    return new Map(rows.map((row) => [row.teamId, row.nftTokenId]));
  }

  /**
   * Info: (20260819 - Luphia) 只補卡號快取，**不動任何計費欄位**（方案以鏈上為準時的回填）。
   *
   * `where` 帶 `nftTokenId: null`：只在「還沒有卡號」時寫得進去，
   * 因此不會蓋掉 worker 從鑄造收據取得的權威值。兩者衝突時不該由顯示路徑決定誰對。
   *
   * 刻意不碰 `nftSyncedAt`：那是 worker 的工作佇列。這裡補上卡號之後，
   * 那一列仍然待同步——worker 下一輪會確認 metadata 是不是最新的。
   */
  async cacheCardTokenId(teamId: string, tokenId: string): Promise<void> {
    await prisma.teamSubscription.updateMany({
      where: { teamId, nftTokenId: null },
      data: { nftTokenId: tokenId },
    });
  }

  /**
   * Info: (20260819 - Luphia) 待同步鏈上會員卡的訂閱（worker 用）。
   *
   * 條件只有兩個：**沒有同步時間**（= 待辦，見 `CARD_DIRTY`）且**還沒放棄**。
   * 不在這裡判斷「是不是付費方案」——那個判斷要先把 `status` 與
   * `currentPeriodEnd` 折算成有效方案（`resolveEffectivePlanId`），
   * 而那是 Service 的事；Repo 多判一次，兩邊遲早分岔。
   *
   * 帶團隊名稱（一次 join，不是逐團隊再查）：卡片 metadata 要寫團隊名。
   */
  async listCardSyncCandidates(
    limit: number,
    maxAttempts: number,
  ): Promise<
    (TeamSubscription & { team: { name: string; deletedAt: Date | null } })[]
  > {
    return prisma.teamSubscription.findMany({
      where: {
        nftSyncedAt: null,
        nftSyncAttempts: { lt: maxAttempts },
      },
      include: { team: { select: { name: true, deletedAt: true } } },
      // Info: (20260819 - Luphia) 先進先出：新付費的人不該被一批舊的免費團隊卡在後面
      orderBy: { updatedAt: "asc" },
      take: limit,
    });
  }

  // Info: (20260819 - Luphia) 待同步但已放棄（達重試上限）的列：給診斷與監控用
  async countCardSyncGivenUp(maxAttempts: number): Promise<number> {
    return prisma.teamSubscription.count({
      where: { nftSyncedAt: null, nftSyncAttempts: { gte: maxAttempts } },
    });
  }

  /**
   * Info: (20260819 - Luphia) 仍待同步（尚未放棄）的總數。
   *
   * 用來算「本輪沒處理完還剩幾個」。批次有上限，而**被截斷的量必須說出來**——
   * 只印處理了幾個，會讓「積壓一千個」與「剛好只有二十個」在 log 上長得一樣。
   */
  async countCardSyncPending(maxAttempts: number): Promise<number> {
    return prisma.teamSubscription.count({
      where: { nftSyncedAt: null, nftSyncAttempts: { lt: maxAttempts } },
    });
  }

  /**
   * Info: (20260819 - Luphia) 同步成功（含「檢查過、不需要動作」）。
   *
   * `nftSyncedAt` 一定要寫：它就是佇列，不寫的話這一列每輪都會被撈出來，
   * 而每輪都會再決策一次——免費方案那種「不需要動作」的列會永久佔著批次額度。
   *
   * `tokenId` 以 undefined 表示「不改」：換 URI 的路徑沒有新的 tokenId，
   * 傳 null 進來會把既有的卡號洗掉，之後就再也對不回那張卡。
   */
  async recordCardSynced(params: {
    teamId: string;
    tokenId?: string;
    ownerAddress?: string;
    fingerprint: string;
    syncedAt: Date;
  }): Promise<void> {
    await prisma.teamSubscription.update({
      where: { teamId: params.teamId },
      data: {
        nftTokenId: params.tokenId,
        nftOwnerAddress: params.ownerAddress,
        nftFingerprint: params.fingerprint,
        nftSyncedAt: params.syncedAt,
        nftSyncAttempts: 0,
        nftSyncError: null,
      },
    });
  }

  /**
   * Info: (20260819 - Luphia) 同步失敗：累加次數並留下原因。
   *
   * `nftSyncedAt` 保持 null（仍是待辦），因此下一輪會重試；累加到上限之後
   * `listCardSyncCandidates` 就不再撈它——那時需要人看 `nftSyncError`。
   * 訊息截斷到 500 字：鏈上錯誤動輒帶一整包 calldata，整包存進去對診斷沒有幫助。
   */
  async recordCardSyncFailure(teamId: string, message: string): Promise<void> {
    await prisma.teamSubscription.update({
      where: { teamId },
      data: {
        nftSyncAttempts: { increment: 1 },
        nftSyncError: message.slice(0, 500),
      },
    });
  }

  // Info: (20260807 - Luphia) 續訂 Worker 用：待自動扣款的過期付費訂閱
  async listPastDueAutoRenew(): Promise<TeamSubscription[]> {
    return prisma.teamSubscription.findMany({
      where: {
        status: TEAM_SUBSCRIPTION_STATUS.PAST_DUE,
        autoRenew: true,
        planId: { not: TEAM_PLAN.FREE },
      },
      orderBy: { currentPeriodEnd: "asc" },
    });
  }

  // Info: (20260807 - Luphia) 免付款的直接降級（PUT planId=free）
  async downgradeToFree(
    teamId: string,
    nowMs: number,
  ): Promise<TeamSubscription> {
    return prisma.teamSubscription.upsert({
      where: { teamId },
      update: {
        planId: TEAM_PLAN.FREE,
        status: TEAM_SUBSCRIPTION_STATUS.ACTIVE,
        autoRenew: false,
        /**
         * Info: (20260815 - Luphia) 降級時一併把單價歸零（PR #6652 第二輪 D）。
         *
         * 不歸零的話，降級後 `unitPrice` 仍是 840，而「免費方案不補收」全靠
         * `resolveEffectivePlanId` 那一層擋著——防線只剩一道，且是遠處的一道。
         * 資料本身就該說實話：免費方案沒有單價。
         *
         * `seats` 保留：那是團隊實際人數的快照，與收不收費無關，
         * 而免費版的人數上限另有把關（`FREE_PLAN_MAX_MEMBERS`）。
         */
        unitPrice: 0,
        ...CARD_DIRTY,
      },
      create: {
        teamId,
        planId: TEAM_PLAN.FREE,
        status: TEAM_SUBSCRIPTION_STATUS.ACTIVE,
        currentPeriodStart: new Date(nowMs),
        currentPeriodEnd: new Date(nowMs),
        autoRenew: false,
        unitPrice: 0,
      },
    });
  }
}

export const teamSubscriptionRepo = new TeamSubscriptionRepository();
