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

  /**
   * Info: (20260820 - Luphia) 當期還沒結束就**展延**，不從現在重算（產品決定 20260820）。
   *
   * 原本一律 `now → now + 週期`，而 `upsert` 讓第二次付款覆寫第一次：
   *
   * - 第 20 天再買一期 → 期末變成「今天 +30 天」，**前 10 天付過的錢消失**。
   * - 雙擊付兩次 → 兩筆扣款、一期權益。
   *
   * 而退款政策原則不退（§2.2），所以那些天數沒有任何補救路徑。展延之後
   * 「付兩次＝兩期」，提早續購也不再吃虧——與「不退費」搭起來才站得住。
   *
   * 期初**不動**（維持原本的期初）：期中加席次的比例計價讀的是 `periodStart`/
   * `periodEnd`（`resolveSeatProration`），把期初改成今天會讓那個分母縮水，
   * 於是同一天加人要付更多。展延只該讓分母變大。
   *
   * 當期已結束（續訂、過期後重新訂閱）則從現在起算：中間那段沒有權益的空窗
   * 不該追認為已付費期間（fail-closed 的一致做法）。
   */
  const existing = await tx.teamSubscription.findUnique({
    where: { teamId },
    select: {
      currentPeriodStart: true,
      currentPeriodEnd: true,
      latestOrderId: true,
    },
  });

  /**
   * Info: (20260820 - Luphia) 同一張訂單只履行一次（self-review 第三輪）。
   *
   * 展延之前，重複履行是**無害**的：兩次都算成 `now → now + 週期`，結果一樣。
   * 改成展延之後同一件事變成「多送一期」，因此在最靠近資料的地方也擋一次。
   *
   * **上游目前擋得住**（我查過，所以這裡不假裝它是唯一防線）：webhook 的履行段
   * 整段掛在 `order.status === PENDING` 之下，checkout 進來就先要求 PENDING，
   * 續訂則由冪等鍵的唯一約束把兩個 worker 序列化。這道守門的價值是「往後也擋得住」
   * ——`applyTeamSubscription` 是公開方法，而重複履行的代價已經不再是零。
   *
   * `latestOrderId` 就是「這一列上次被哪張訂單套用」，足以認出重放；訂單 id 每次
   * 付款都不同，正常的「再買一期」不會被誤擋。
   */
  if (orderId && existing?.latestOrderId === orderId) {
    return tx.teamSubscription.findUniqueOrThrow({ where: { teamId } });
  }
  const stillActive =
    existing !== null && existing.currentPeriodEnd.getTime() > nowMs;
  const currentPeriodStart = stillActive
    ? existing.currentPeriodStart
    : new Date(nowMs);
  const currentPeriodEnd = new Date(
    (stillActive ? existing.currentPeriodEnd.getTime() : nowMs) +
      periodDays * DAY_MS,
  );

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
       * Info: (20260820 - Luphia) 套用新週期＝排程已經兌現（或被升級取代），清掉它。
       * 留著的話，下一次期末會再降一次——而使用者早就改變主意了。
       */
      pendingPlanId: null,
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
        /**
         * Info: (20260820 - Luphia) 這一支就是「降級為 free」的**實現**（排程於此兌現），
         * 因此連同排程一起清掉，並讓單價說實話——免費方案沒有單價。
         * 不歸零的話，降級後 `unitPrice` 仍是 840，而「免費方案不補收」只剩
         * `resolveEffectivePlanId` 一道遠處的防線（見 downgradeToFree 的同一段說明）。
         */
        pendingPlanId: null,
        unitPrice: 0,
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
   * Info: (20260820 - Luphia) 這些團隊的**卡片同步狀態**（方案讀取用）。
   *
   * 一次查回來而不是逐團問：`/auth/me` 每次頁面載入都會呼叫。
   *
   * 四個欄位各有用途，缺一個就會回到某個已經修過的缺陷：
   *
   * - `tokenId`：讀鏈的 hint（命中就不必掃事件）。null 本身也是資訊。
   * - `syncedAt`：null＝**鏈上那份已知過期**（我們還沒寫上去）→ 顯示改讀 DB。
   *   少了它，剛續訂成功的付費戶會看到免費版（舊 `period_end` 折算為 free）。
   * - `attempts` / `updatedAt`：那個「讀 DB」必須有界——卡住的同步不該讓
   *   「顯示付費」永久靠 DB 撐著（見 `isChainCopyStale`）。
   */
  async listCardSyncState(teamIds: string[]): Promise<
    Map<
      string,
      {
        tokenId: string | null;
        syncedAt: Date | null;
        attempts: number;
        updatedAtMs: number;
      }
    >
  > {
    if (teamIds.length === 0) return new Map();
    const rows = await prisma.teamSubscription.findMany({
      where: { teamId: { in: teamIds } },
      select: {
        teamId: true,
        nftTokenId: true,
        nftSyncedAt: true,
        nftSyncAttempts: true,
        updatedAt: true,
      },
    });
    return new Map(
      rows.map((row) => [
        row.teamId,
        {
          tokenId: row.nftTokenId,
          syncedAt: row.nftSyncedAt,
          attempts: row.nftSyncAttempts,
          updatedAtMs: row.updatedAt.getTime(),
        },
      ]),
    );
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

  /**
   * Info: (20260820 - Luphia) 排程一個**期末生效**的方案變更（降級）。
   *
   * 只動 `pendingPlanId` 與 `autoRenew`，**不碰 `planId`／`currentPeriodEnd`／`unitPrice`**
   * ——當期權益必須維持原方案（退款政策 §2.1：降級於當期結束後生效，且不按比例退費）。
   *
   * `autoRenew` 的兩種情形不同：
   *
   * - 降到 free：期末就是終止，關掉自動續訂，由 `expireOverdue` 在期末落地。
   * - 降到較低的**付費**方案：期末仍要續訂（用新方案計價），因此維持自動續訂。
   *
   * 刻意**不**標記卡片待同步（`CARD_DIRTY`）：當期的方案與期限一個都沒變，
   * 鏈上那張卡仍然是對的。要到期末落地時才需要換 URI。
   */
  async schedulePlanChange(params: {
    teamId: string;
    pendingPlanId: string;
    autoRenew: boolean;
  }): Promise<void> {
    await prisma.teamSubscription.update({
      where: { teamId: params.teamId },
      data: {
        pendingPlanId: params.pendingPlanId,
        autoRenew: params.autoRenew,
      },
    });
  }

  /**
   * Info: (20260820 - Luphia) 取消排程（使用者改變主意，改回目前的方案）。
   *
   * 一併把自動續訂打開：排程降到 free 時關掉了它，只清 `pendingPlanId` 會留下
   * 「方案沒變，但期末會停掉」——那是使用者按下「取消降級」後最不預期的結果。
   */
  async cancelPendingPlanChange(teamId: string): Promise<void> {
    await prisma.teamSubscription.update({
      where: { teamId },
      data: { pendingPlanId: null, autoRenew: true },
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
        // Info: (20260820 - Luphia) 已經降到底了，排程沒有意義
        pendingPlanId: null,
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
