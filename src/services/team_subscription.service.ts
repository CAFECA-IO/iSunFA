import { Order } from "@/generated";
import { CURRENCY_UNIT } from "@/constants/price";
import { ORDER_TYPE } from "@/constants/status";
import { TeamRole, isTeamManagerRole } from "@/constants/team";
import {
  BILLING_INTERVAL,
  BillingInterval,
  isPlanDowngrade,
  TEAM_PLAN,
  TEAM_SUBSCRIPTION_STATUS,
  TeamPlanId,
  TeamSubscriptionStatus,
} from "@/constants/subscription_quota";
import {
  getResetAt5h,
  getResetAtWeek,
  getWindowKey5h,
  getWindowKeyWeek,
} from "@/lib/quota/window";
import { API_ERRORS, ApiError, IErrorDef } from "@/lib/utils/error_dictionary";
import type {
  IAccountBookQuotaView,
  IQuotaStatus,
  ITeamQuotaTotals,
  ITeamSubscriptionView,
} from "@/interfaces/team_wallet";
import {
  resolveEffectivePlanId,
  resolvePlanId,
} from "@/lib/subscription/plan_rules";
import { generatePaymentOrder } from "@/services/order.service";
import { assertTeamMember } from "@/services/team_wallet_access.guard";
import {
  assertAccountBookMember,
  mapServiceError,
} from "@/services/account_book_access.guard";
import { teamSubscriptionRepo } from "@/repositories/team_subscription.repo";
import { teamRepo } from "@/repositories/team.repo";
import { resolveSubscriptionAmount } from "@/lib/billing/seat_billing";
import { getPlanUnitPrice, getTeamEntitlement } from "@/services/plan.service";
import { teamQuotaUsageRepo } from "@/repositories/team_quota_usage.repo";
import { subscriptionPlanQuotaRepo } from "@/repositories/subscription_plan_quota.repo";
import { faithBillingSettingRepo } from "@/repositories/faith_billing_setting.repo";
import { paymentRepo } from "@/repositories/payment.repo";
import { logger } from "@/lib/utils/logger";
import { teamWalletRepo } from "@/repositories/team_wallet.repo";

/**
 * Info: (20260807 - Luphia) 團隊訂閱 Service（設計書 §7 GET/PUT /subscription）。
 * GET 回傳方案、計費週期、雙視窗剩餘額度與 resetAt，以及費思費率
 * （定價揭露 §5.3：數字與 env 同源，前端插值渲染、嚴禁寫死）。
 */

function toApiError(def: IErrorDef): ApiError {
  return new ApiError(def.code, def.message, def.status);
}

async function guarded<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw toApiError(API_ERRORS.TW_OPERATION_FAILED);
  }
}

/**
 * Info: (20260814 - Luphia) 額度狀態是**該成員自己的**（一人一池，產品拍板 20260814）：
 * 畫面顯示的剩餘量必須與扣費側同一套算法，否則用戶會看到別人用掉的量算在自己頭上。
 */
async function buildQuotaStatus(
  teamId: string,
  userId: string,
  planId: TeamPlanId,
  nowSec: number,
): Promise<IQuotaStatus> {
  // Info: (20260809 - Luphia) 額度為系統設定，自 DB 取得
  const quota = await subscriptionPlanQuotaRepo.resolveQuota(planId);
  /**
   * Info: (20260819 - Luphia) 免費方案的額度是**全隊共用一份**（產品決定 20260819），
   * 因此「我的額度」顯示的用量必須是全隊的——否則畫面會說「你還有 40 點」，
   * 而送出訊息時被同事已經用掉的量擋下來。與扣費端（`spendCredits`）同一個判準。
   */
  const { used5h, usedWeek } =
    planId === TEAM_PLAN.FREE
      ? await teamQuotaUsageRepo.sumTeamWindowUsage(
          teamId,
          getWindowKey5h(nowSec),
          getWindowKeyWeek(nowSec),
        )
      : await teamQuotaUsageRepo.sumWindowUsage(
          teamId,
          userId,
          getWindowKey5h(nowSec),
          getWindowKeyWeek(nowSec),
        );
  return {
    quota5h: {
      limit: String(quota.per5h),
      used: used5h.toString(),
      resetAt: getResetAt5h(nowSec),
    },
    quotaWeek: {
      limit: String(quota.perWeek),
      used: usedWeek.toString(),
      resetAt: getResetAtWeek(nowSec),
    },
  };
}

/**
 * Info: (20260817 - Luphia) 全隊用量合計（PR #6652 第二輪 C-1）。
 *
 * `limit` 是「每人上限 × 目前人數」：額度一人一池，團隊買到的總量就是這個乘積。
 * 用當下人數而非 `subscription.seats`——後者是唯寫欄位（第二輪 C-7），對不了帳。
 *
 * 只回合計，不回逐人明細（產品決定 20260817）。
 */
async function buildTeamQuotaTotals(
  teamId: string,
  planId: TeamPlanId,
  nowSec: number,
): Promise<ITeamQuotaTotals> {
  const [quota, memberCount, usage] = await Promise.all([
    subscriptionPlanQuotaRepo.resolveQuota(planId),
    teamRepo.countMembers(teamId),
    teamQuotaUsageRepo.sumTeamWindowUsage(
      teamId,
      getWindowKey5h(nowSec),
      getWindowKeyWeek(nowSec),
    ),
  ]);

  /**
   * Info: (20260817 - Luphia) 至少 1：人數為 0 時分母不能是 0，否則進度條會變成 NaN。
   *
   * Info: (20260819 - Luphia) 免費方案**不乘人數**（產品決定 20260819）：
   * 那一份額度是全隊共用的，乘上人數就會憑空放大成 N 倍，
   * 而扣費端只認一份——畫面上會出現「還有 80%」卻已經 402 的矛盾。
   */
  const seats = planId === TEAM_PLAN.FREE ? 1 : Math.max(1, memberCount);

  return {
    memberCount,
    quota5h: {
      limit: String(BigInt(quota.per5h) * BigInt(seats)),
      used: usage.used5h.toString(),
      resetAt: getResetAt5h(nowSec),
    },
    quotaWeek: {
      limit: String(BigInt(quota.perWeek) * BigInt(seats)),
      used: usage.usedWeek.toString(),
      resetAt: getResetAtWeek(nowSec),
    },
  };
}

export async function getTeamSubscriptionView(params: {
  userId: string;
  teamId: string;
  nowSec: number;
}): Promise<ITeamSubscriptionView> {
  const { userId, teamId, nowSec } = params;

  return guarded(async () => {
    const member = await assertTeamMember(userId, teamId);

    const subscription = await teamSubscriptionRepo.getByTeamId(teamId);
    // Info: (20260807 - Luphia) 顯示「有效」方案：過期或非 ACTIVE 一律呈現 free，與扣費側一致
    const planId = resolveEffectivePlanId(subscription, nowSec);
    const quota = await buildQuotaStatus(teamId, userId, planId, nowSec);

    /**
     * Info: (20260818 - Luphia) 全隊合計**限管理職**（OWNER / ADMIN，產品決定 20260818）。
     *
     * 這個數字回答的是「團隊買的額度被用掉多少」，而動用團隊錢包的是管理職——
     * ADMIN 花得到團隊的錢，就該看得到團隊消耗了多少。
     *
     * 一般成員看不到：對他們沒有對應的問題，卻會透露團隊整體的使用強度——
     * 額度是一人一池，總和加上人數就能推估同事的平均用量。
     *
     * 非管理職直接**不查**而不是查了再丟掉：查了再丟掉的版本，
     * 下一個人在別處重用這個函式時就會把它一起回出去。
     */
    const isManager = isTeamManagerRole(member.role);
    const teamTotals = isManager
      ? await buildTeamQuotaTotals(teamId, planId, nowSec)
      : undefined;
    // Info: (20260809 - Luphia) 費率為系統設定，自 DB 取得
    const billing = await faithBillingSettingRepo.resolveSetting();

    return {
      teamId,
      planId,
      status: (subscription?.status ??
        TEAM_SUBSCRIPTION_STATUS.ACTIVE) as TeamSubscriptionStatus,
      currentPeriodStart: subscription
        ? Math.floor(subscription.currentPeriodStart.getTime() / 1000)
        : 0,
      currentPeriodEnd: subscription
        ? Math.floor(subscription.currentPeriodEnd.getTime() / 1000)
        : 0,
      autoRenew: subscription?.autoRenew ?? false,
      /**
       * Info: (20260820 - Luphia) 排程中的降級一併揭露（見 interface 的說明）。
       * 認不出來的代號當成沒有排程——回一個畫面翻不出名字的方案代號更糟。
       */
      pendingPlanId:
        subscription?.pendingPlanId &&
        (Object.values(TEAM_PLAN) as string[]).includes(
          subscription.pendingPlanId,
        )
          ? (subscription.pendingPlanId as TeamPlanId)
          : null,
      pendingEffectiveAt:
        subscription?.pendingPlanId && subscription.currentPeriodEnd
          ? Math.floor(subscription.currentPeriodEnd.getTime() / 1000)
          : null,
      /**
       * Info: (20260820 - Luphia) `nftSyncedAt` 為 null＝鏈上那份還沒寫上去。
       * 沒有訂閱列時為 false：沒有訂閱就沒有卡要同步。
       */
      cardSyncPending: subscription ? subscription.nftSyncedAt === null : false,
      quota,
      teamTotals,
      faithTokensPerCredit: billing.tokensPerCredit,
    };
  });
}

/**
 * Info: (20260813 - Luphia) 帳本情境下的額度檢視（費思常駐儀表用）。
 *
 * 與 getTeamSubscriptionView 的差別只在入口：這裡以 accountBookId 推導團隊
 * （沿用 assertAccountBookMember 授權收斂點，與費思扣費同一條推導），
 * 並附上成員自己的分配點數餘額——拆帳上線後（§5.4）額度見底會自動接續扣錢包，
 * 只顯示訂閱額度會讓用戶以為 0% 就等於不能用。
 */
export async function getAccountBookQuotaView(params: {
  userId: string;
  accountBookId: string;
  nowSec: number;
}): Promise<IAccountBookQuotaView> {
  const { userId, accountBookId, nowSec } = params;

  const accountBook = await (async () => {
    try {
      return await assertAccountBookMember(accountBookId, userId);
    } catch (error) {
      throw toApiError(mapServiceError(error));
    }
  })();

  return guarded(async () => {
    const teamId = accountBook.teamId;
    // Info: (20260819 - Luphia) 只需要方案本身：走 `plan.service` 的權益入口（集中化 20260819）
    const planId = await getTeamEntitlement({ teamId, nowSec });
    const quota = await buildQuotaStatus(teamId, userId, planId, nowSec);
    const allocation = await teamWalletRepo.getAllocation(teamId, userId);

    return {
      teamId,
      planId,
      quota,
      allocationBalance: (allocation?.balance ?? BigInt(0)).toString(),
    };
  });
}

/**
 * Info: (20260807 - Luphia) 變更方案（設計書 §7 PUT /subscription，OWNER 專屬）。
 * 付費方案建立 BILLING_SUBSCRIBE 訂單（data 帶 teamId），付款成功後由
 * processOenPayment / checkout 履行路徑套用訂閱。
 *
 * Info: (20260820 - Luphia) **降級不會期中生效**（修正 20260820）。
 *
 * 這一支原本對 free 是「免付款直接降級」——當場把 `planId` 改成 free，額度立刻
 * 掉到免費版。而《退款政策》§2.1 寫的是「一旦取消或降級，您的變更將於當前結算
 * 週期結束後自動生效」，且明言不按比例退費：**收了整期的錢、當場收回權益**，
 * 程式與對外承諾相反，而承諾的那一側才是對的。
 *
 * 付費→付費的降級更糟：走建單路徑會**再收一次錢**，並把週期從當下重新起算。
 *
 * 現在的規則：
 *
 * | 變更 | 生效時點 | 收費 |
 * |---|---|---|
 * | 升級（含同方案續購／改計費週期） | 立即 | 立即建單 |
 * | 降級（含降到 free） | **當期屆滿** | 不收費；期末由續訂／到期流程處理 |
 * | 降級後改回原方案 | 立即取消排程 | 不收費 |
 *
 * 附帶效果（不是巧合）：鏈上的訂閱憑證因此不會多報。卡片的 `period_end` 與方案
 * 只在週期邊界改變，而那正是離鏈資料也改變的時點——期中降級曾是唯一會讓
 * 「鏈上說付費、實際已降級」出現的路徑（見設計書 §6.5）。
 */

export interface IChangeSubscriptionResult {
  // Info: (20260820 - Luphia) 需要付款時才有（升級／續購）；降級與取消排程一律 null
  orderId: string | null;
  challenge?: string;
  cost?: number;
  // Info: (20260820 - Luphia) **當期**方案：降級排程後這裡仍是原方案（權益沒有變）
  planId: TeamPlanId;
  // Info: (20260820 - Luphia) 排程中的降級；null＝沒有排程（含剛剛取消）
  pendingPlanId?: TeamPlanId | null;
  // Info: (20260820 - Luphia) 排程生效時點（epoch 秒）＝當期屆滿
  effectiveAt?: number;
}

/**
 * Info: (20260820 - Luphia) 當期的計費週期存在最後一張訂單的 data 裡，不在訂閱列上。
 *
 * 讀不到時回月繳（與 `applyTeamSubscriptionInTx` 的預設一致）：那是保守的一側，
 * 猜錯只會讓「改成年繳」多走一次建單，而不會把排程默默清掉。
 */
async function resolveCurrentBillingInterval(
  subscription: { latestOrderId: string | null } | null,
): Promise<BillingInterval> {
  if (!subscription?.latestOrderId) return BILLING_INTERVAL.MONTH;
  const order = await paymentRepo.getOrderById(subscription.latestOrderId);
  const data = order?.data as { billingInterval?: BillingInterval } | null;
  return data?.billingInterval ?? BILLING_INTERVAL.MONTH;
}

export async function changeTeamSubscription(params: {
  userId: string;
  teamId: string;
  planId: TeamPlanId;
  billingInterval: BillingInterval;
  paymentMethodId?: string;
  nowMs: number;
}): Promise<IChangeSubscriptionResult> {
  const { userId, teamId, planId, billingInterval, paymentMethodId, nowMs } =
    params;

  return guarded(async () => {
    const member = await assertTeamMember(userId, teamId);
    if (member.role !== TeamRole.OWNER) {
      throw toApiError(API_ERRORS.TW_WALLET_FORBIDDEN);
    }

    const subscription = await teamSubscriptionRepo.getByTeamId(teamId);
    const nowSec = Math.floor(nowMs / 1000);
    const currentPlanId = resolveEffectivePlanId(subscription, nowSec);

    /**
     * Info: (20260820 - Luphia) 已排程降級後又送出「目前方案」＝取消降級。
     *
     * 沒有這一條，使用者就沒有回頭路：畫面上他的方案還是團隊版（正確），
     * 於是再按一次團隊版會走升級路徑——建一張新單、再收一整期的錢。
     *
     * Info: (20260820 - Luphia) **但要先分辨他改的是不是計費週期**（self-review 小項）。
     *
     * `TeamSubscription` 沒有 `billingInterval` 欄位，當期的週期只存在於最後一張
     * 訂單的 data 裡。原本只比方案代號，於是「排程降級中的月繳戶想改成年繳」
     * 會被當成取消降級——排程清掉了、年繳沒生效，而畫面沒有任何訊息。
     *
     * 週期相同 → 取消排程（他就是要留在原方案）；
     * 週期不同 → 也取消排程，但**繼續往下走建單**（他要的是換週期，那是續購）。
     */
    const currentInterval = await resolveCurrentBillingInterval(subscription);
    const cancelsPendingOnly =
      Boolean(subscription?.pendingPlanId) &&
      planId === currentPlanId &&
      billingInterval === currentInterval;

    if (subscription?.pendingPlanId && planId === currentPlanId) {
      await teamSubscriptionRepo.cancelPendingPlanChange(teamId);
      if (cancelsPendingOnly) {
        return {
          orderId: null,
          planId: currentPlanId,
          pendingPlanId: null,
          effectiveAt: nowSec,
        };
      }
    }

    if (isPlanDowngrade(currentPlanId, planId)) {
      /**
       * Info: (20260820 - Luphia) 沒有訂閱列就沒有「當期」可以等到期末——
       * 而 `resolveEffectivePlanId(null)` 回 free，因此這條路徑只有在
       * 「有效方案是付費」時才走得到，也就是訂閱列必然存在。留這道 fail-fast
       * 讓型別窄化有依據，而不是用 `!` 假裝它一定存在。
       */
      if (!subscription) {
        throw toApiError(API_ERRORS.TW_OPERATION_FAILED);
      }
      await teamSubscriptionRepo.schedulePlanChange({
        teamId,
        pendingPlanId: planId,
        // Info: (20260820 - Luphia) 降到 free＝期末終止（關閉續訂）；降到較低付費方案仍要續訂
        autoRenew: planId !== TEAM_PLAN.FREE,
      });
      return {
        orderId: null,
        // Info: (20260820 - Luphia) 回**當期**方案：當期權益沒有變，畫面不該顯示新方案
        planId: currentPlanId,
        pendingPlanId: planId,
        effectiveAt: Math.floor(subscription.currentPeriodEnd.getTime() / 1000),
      };
    }

    if (planId === TEAM_PLAN.FREE) {
      /**
       * Info: (20260820 - Luphia) 走到這裡表示當期已經是 free（不是降級）。
       * 免費方案不需要訂單，也沒有東西要排程。
       */
      return { orderId: null, planId: TEAM_PLAN.FREE };
    }

    if (!paymentMethodId) {
      throw toApiError(API_ERRORS.VL_SCHEMA_ERROR);
    }

    /**
     * Info: (20260814 - Luphia) 席次計價（規範 P2）：金額 = 單價 × 團隊人數，**由 server 計算**。
     * 前端只負責顯示；採信前端送來的總額等於把價格交給呼叫端決定。
     */
    // Info: (20260819 - Luphia) 單價經 `plan.service` 的單一出口（集中化 20260819）
    const unitPrice = getPlanUnitPrice(planId, billingInterval);
    const seats = await teamRepo.countMembers(teamId);
    const amount = resolveSubscriptionAmount(unitPrice, seats);

    /**
     * Info: (20260820 - Luphia) 同方案同週期已經有一張**未付**的訂單就沿用它
     *（self-review B-4）。
     *
     * 訂閱建單原本沒有任何冪等保護：雙擊或開兩個分頁就是兩張都能付的訂單，
     * 而兩張單就是兩筆扣款。沿用而不是拒絕——使用者要的就是那張單，
     * 回同一個 `orderId` / `challenge` 讓他把它付掉。
     *
     * 只認未付的（PENDING / PAYING）。已付的代表他是**再買一期**，
     * 那要建新單並展延（見 `applyTeamSubscriptionInTx`）。
     */
    const inFlight = await paymentRepo.findInFlightSubscriptionOrder({
      userId,
      teamId,
      planId,
      billingInterval,
    });
    if (inFlight) {
      logger.info("subscription order reused", {
        teamId,
        orderId: inFlight.id,
        planId,
        billingInterval,
      });
      return {
        orderId: inFlight.id,
        challenge: inFlight.challenge,
        cost: Number(inFlight.amount),
        planId: currentPlanId,
      };
    }

    /**
     * Info: (20260820 - Luphia) 一併回**當期**方案：升級要等付款完成才生效，
     * 在那之前使用者的方案沒有變，畫面不該提前改。
     */
    const order = await generatePaymentOrder(userId, {
      type: ORDER_TYPE.BILLING_SUBSCRIBE,
      amount,
      unit: CURRENCY_UNIT.TWD,
      /**
       * Info: (20260814 - Luphia) 訂閱**不發點數**：履行路徑只寫 TeamSubscription，
       * 不 mint 鏈上點數、也不入團隊池（設計書 §7）。原本帶 SUBSCRIPTION_PLAN_CREDITS
       * 進來，付款畫面與收據就會承諾一筆從未發放的點數（「獲得 1,500 點」）。
       * 訂閱買到的是額度視窗，額度不是點數。
       */
      credits: 0,
      paymentMethodId,
      title: `iSunFA Team Subscription - ${planId} (${billingInterval}) x${Math.max(1, seats)}`,
      planId,
      billingInterval,
      teamId,
      seats: Math.max(1, seats),
      unitPrice,
    });
    return { ...order, planId: currentPlanId };
  });
}

/**
 * Info: (20260807 - Luphia) 綁卡直扣（checkout）路徑的訂閱履行：
 * 套用方案後標記訂單 COMPLETED。webhook 路徑由 processOenPayment 於交易內原子處理。
 */
export async function fulfillTeamSubscriptionOrder(
  order: Order,
  nowMs: number,
): Promise<void> {
  return guarded(async () => {
    if (order.type !== ORDER_TYPE.BILLING_SUBSCRIBE) {
      throw toApiError(API_ERRORS.TW_OPERATION_FAILED);
    }
    const data = order.data as {
      teamId?: string;
      planId?: string;
      billingInterval?: BillingInterval;
      seats?: number;
      unitPrice?: number;
    } | null;
    if (!data?.teamId || !data.planId) {
      throw toApiError(API_ERRORS.TW_OPERATION_FAILED);
    }

    await teamSubscriptionRepo.applyTeamSubscription({
      teamId: data.teamId,
      planId: resolvePlanId(data.planId),
      billingInterval: data.billingInterval ?? BILLING_INTERVAL.MONTH,
      orderId: order.id,
      nowMs,
      seats: data.seats,
      unitPrice: data.unitPrice,
    });
    await paymentRepo.updateOrderCompleted(order.id);
  });
}
