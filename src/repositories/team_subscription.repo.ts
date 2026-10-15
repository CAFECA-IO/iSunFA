import { prisma } from "@/lib/prisma";
import { Prisma, TeamSubscription } from "@/generated";
import {
  BILLING_INTERVAL_DAYS,
  BillingInterval,
  TEAM_PLAN,
  TEAM_SUBSCRIPTION_STATUS,
} from "@/constants/subscription_quota";
import { resolveNextPeriod } from "@/lib/billing/subscription_period";

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
  const periodDays = BILLING_INTERVAL_DAYS[billingInterval];

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
   * 當期已結束（續訂、過期後重新訂閱）則從現在起算：中間那段沒有權益的空窗
   * 不該追認為已付費期間（fail-closed 的一致做法）。
   *
   * Info: (20260821 - Luphia) **換方案時改為「折抵剩餘價值」**（產品裁定 20260821，
   * review #6687 二輪阻擋-1 / 三輪）。期間三條規則已收斂到純函式
   * `resolveNextPeriod`，決策與理由寫在那裡；這一支只負責把結果寫進去。
   *
   * 一句話版本：同方案續購維持展延（期初不動）；換方案則自現在起算一期、
   * 再加上舊期剩餘價值折抵的天數——使用者付過的錢一分不作廢
   *（**禁止造成用戶損失的設計**），平台也不再把剩餘天數 1:1 當高階方案免費送。
   */
  const existing = await tx.teamSubscription.findUnique({
    where: { teamId },
    select: {
      planId: true,
      currentPeriodStart: true,
      currentPeriodEnd: true,
      unitPrice: true,
      billingInterval: true,
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
  /**
   * Info: (20260821 - Luphia) 新單價缺省時沿用舊值（`unitPrice` 是選填：
   * 期中加人只動 seats）。折抵要用**新方案的**日單價，缺了它就換算不出來——
   * 沿用舊值在「同方案續購」上永遠正確，而換方案的路徑一律帶單價
   *（三個履行點都從訂單的 data 取，我逐一查過）。
   */
  const nextUnitPrice = unitPrice ?? existing?.unitPrice ?? 0;
  const period = resolveNextPeriod({
    nowMs,
    existing: existing
      ? {
          planId: existing.planId,
          periodStartMs: existing.currentPeriodStart.getTime(),
          periodEndMs: existing.currentPeriodEnd.getTime(),
          unitPrice: existing.unitPrice,
          periodDays: existing.billingInterval
            ? BILLING_INTERVAL_DAYS[existing.billingInterval as BillingInterval]
            : null,
        }
      : null,
    next: { planId, unitPrice: nextUnitPrice, periodDays },
  });
  const currentPeriodStart = new Date(period.periodStartMs);
  const currentPeriodEnd = new Date(period.periodEndMs);

  return tx.teamSubscription.upsert({
    where: { teamId },
    update: {
      planId,
      status: TEAM_SUBSCRIPTION_STATUS.ACTIVE,
      currentPeriodStart,
      currentPeriodEnd,
      autoRenew: true,
      latestOrderId: orderId,
      // Info: (20260821 - Luphia) 週期快照：期中加人的補收分母按這一期買的週期算
      billingInterval,
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
      billingInterval,
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
      data: { seats: { increment: seats } },
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
      data: { status: TEAM_SUBSCRIPTION_STATUS.PAST_DUE },
    });
    return result.count;
  }

  /**
   * Info: (20260821 - Luphia) 待回填計費週期的付費訂閱（`scripts/backfill_billing_interval.ts`）。
   *
   * 免費列不參與席次補收，週期值無關緊要，因此不撈。帶 `latestOrderId`：
   * 正確的週期只存在那張訂單的 `data` 裡（欄位是這次才加的）。
   */
  async listPaidForIntervalBackfill(): Promise<
    Pick<
      TeamSubscription,
      "teamId" | "planId" | "billingInterval" | "latestOrderId"
    >[]
  > {
    return prisma.teamSubscription.findMany({
      where: { planId: { not: TEAM_PLAN.FREE } },
      select: {
        teamId: true,
        planId: true,
        billingInterval: true,
        latestOrderId: true,
      },
    });
  }

  // Info: (20260821 - Luphia) 回填腳本用：只寫週期快照，其他欄位一個都不動
  async setBillingInterval(
    teamId: string,
    billingInterval: BillingInterval,
  ): Promise<void> {
    await prisma.teamSubscription.update({
      where: { teamId },
      data: { billingInterval },
    });
  }

  /**
   * Info: (20260820 - Luphia) 排程一個**期末生效**的方案變更（降轉到較低的付費方案）。
   *
   * 只動 `pendingPlanId`，**不碰 `planId`／`currentPeriodEnd`／`unitPrice`／`autoRenew`**
   * ——當期權益必須維持原方案（退款政策 §2.1：降級於當期結束後生效，且不按比例退費），
   * 而期末仍要續訂（用新方案計價，見 `subscription_renewal.cron` 讀 `pendingPlanId`）。
   *
   * Info: (20260821 - Luphia) `autoRenew` 參數已移除（產品裁定 20260821）：
   * 這一支現在**只**服務「期末降轉到較低付費方案」，那條路必然維持自動續訂。
   * 「不要再付錢了」不再走排程——那是 `cancelAutoRenew`，見下。
   */
  async schedulePlanChange(params: {
    teamId: string;
    pendingPlanId: string;
  }): Promise<void> {
    await prisma.teamSubscription.update({
      where: { teamId: params.teamId },
      data: { pendingPlanId: params.pendingPlanId, autoRenew: true },
    });
  }

  /**
   * Info: (20260821 - Luphia) 關閉自動續訂（產品裁定 20260821：**降級是時間到不付錢
   * 的自然結果**）。
   *
   * 「降到免費版」不需要排程：關掉自動續訂之後，`markOverdueForRenewal` 不會撈它
   *（那一支只撈 `autoRenew = true`），期末由 `expireOverdue` 落地為 free。
   * 先前這條路會寫 `pendingPlanId = free`，而那個值除了讓續訂 cron 多一道
   * 「排程 free 卻仍自動續訂」的早退之外，沒有任何地方真的需要它——
   * 兩個欄位表達同一件事，就是多一個會不一致的地方。
   *
   * 當期權益完全不動（`planId`／`currentPeriodEnd`／`unitPrice` 一個都不碰）：
   * 使用者已經付到期末（退款政策 §2.1）。
   *
   * Info: (20260821 - Luphia) **一併清掉降轉排程**（四輪 self-review 寫測試時發現）：
   * 已排定「期末降轉到團隊版」的人又改成「不再付錢」時，留著那個 `pendingPlanId`
   * 會讓面板顯示「將改為團隊版」——而他選的是免費版。`expireOverdue` 雖然會在
   * **期末**把它清掉，但那之前的整段期間畫面都在說一件使用者沒有選的事。
   */
  async cancelAutoRenew(teamId: string): Promise<void> {
    await prisma.teamSubscription.update({
      where: { teamId },
      data: { pendingPlanId: null, autoRenew: false },
    });
  }

  /**
   * Info: (20260820 - Luphia) 恢復訂閱（使用者改變主意，維持目前的方案）。
   *
   * 一併清掉 `pendingPlanId` 並打開 `autoRenew`——兩種「將要離開目前方案」的狀態
   * 都由這一支收回：
   *
   * - 已關閉自動續訂（期末會轉為免費版）→ 重新開啟。
   * - 已排定期末降轉到較低方案 → 清掉排程。
   *
   * 只清一半會留下「方案沒變，但期末會停掉」——那是使用者按下「維持目前方案」後
   * 最不預期的結果（服務條款 §3.6 承諾生效前可隨時改回原方案）。
   */
  async resumeSubscription(teamId: string): Promise<void> {
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
