import { Order } from "@/generated";
import { CURRENCY_UNIT } from "@/constants/price";
import { ORDER_TYPE } from "@/constants/status";
import { TeamRole, isTeamManagerRole } from "@/constants/team";
import {
  BILLING_INTERVAL,
  BillingInterval,
  isPlanDowngrade,
  SUBSCRIPTION_EXTENSION_WINDOW_DAYS,
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
  isTeamPlanId,
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

/**
 * Info: (20260821 - Luphia) 變更方案的結果是**兩種**，型別要說得出來（簡化 20260821）。
 *
 * 先前是一個有六個選擇性欄位的物件，而「哪些欄位同時有值」只能靠讀程式推斷：
 * 降級回 `orderId: null` 且沒有 `challenge`，購買則反過來。前端因此得靠
 * 「`orderId` 是不是 null」來猜自己拿到的是哪一種——而那正是上一輪那條壞掉的
 * 流程的來源（付款畫面拿著 null 去簽章）。
 *
 * 收斂成聯集之後，`kind` 是唯一的判斷點，前端不必再猜，而「不需付款」變成一種
 * 必須被處理的結果。
 */
export const SUBSCRIPTION_CHANGE_KIND = {
  // Info: (20260821 - Luphia) 要付款：回訂單與 challenge
  ORDER: "order",
  // Info: (20260821 - Luphia) 不需付款：排程（降級）或取消排程
  SCHEDULED: "scheduled",
} as const;

export type SubscriptionChangeKind =
  (typeof SUBSCRIPTION_CHANGE_KIND)[keyof typeof SUBSCRIPTION_CHANGE_KIND];

export type IChangeSubscriptionResult =
  | {
      kind: typeof SUBSCRIPTION_CHANGE_KIND.ORDER;
      orderId: string;
      challenge: string;
      cost: number;
      // Info: (20260820 - Luphia) **當期**方案：升級要付款後才生效，畫面不該提前改
      planId: TeamPlanId;
      /**
       * Info: (20260820 - Luphia) 這次購買**將**取代的排程（現在式）。
       * 升級的排程是履行時才由 `applyTeamSubscriptionInTx` 清掉的，
       * 所以在付款完成之前它仍然存在。null＝沒有排程要取代。
       */
      supersedesPendingPlanId: TeamPlanId | null;
    }
  | {
      kind: typeof SUBSCRIPTION_CHANGE_KIND.SCHEDULED;
      // Info: (20260820 - Luphia) 當期方案（沒有變）
      planId: TeamPlanId;
      // Info: (20260820 - Luphia) 排程中的方案；null＝剛剛取消了排程
      pendingPlanId: TeamPlanId | null;
      // Info: (20260820 - Luphia) 生效時點（epoch 秒）＝當期屆滿；取消時為當下
      effectiveAt: number;
    };

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
     * Info: (20260821 - Luphia) 排程中的方案，算一次（簡化 20260821）。
     * 認不出來的代號視為沒有排程——回一個畫面翻不出名字的方案代號更糟。
     */
    const pendingTarget = isTeamPlanId(subscription?.pendingPlanId ?? "")
      ? (subscription?.pendingPlanId as TeamPlanId)
      : null;

    /**
     * Info: (20260820 - Luphia) 已排程降級後又送出「目前方案」且**沒帶付款方式**
     * ＝取消降級。沒有這一條，使用者就沒有回頭路：畫面上他的方案還是團隊版
     * （正確），再按一次團隊版會走升級路徑——建一張新單、再收一整期的錢。
     * 「取消降級」與「延長期間」送進來的方案完全一樣，判準是付款方式：
     * 帶了就是「我要買」（往下走建單），沒帶就是單純取消。
     *
     * Info: (20260821 - Luphia) 取消只在**沒帶付款方式**時就地執行（review #6687
     * 二輪阻擋-3）。原本取消寫在分辨之前，於是「延長」也先把排程取消了——
     * 而它接下來的建單、扣款可能不會成功（關掉付款畫面、卡被拒），沒有任何補償：
     * 排程消失、autoRenew 被重新打開，期末照原方案續扣一整期。
     *
     * 帶付款方式時**這裡什麼都不動**：排程由履行（`applyTeamSubscriptionInTx`
     * 的 `pendingPlanId: null`）在付款成功時清掉，與升級同一條規則；`pendingTarget`
     * 保留，回應才說得出「本次購買完成後，該降級將取消」（現在式，與付款前的
     * 揭露文案一致）。
     *
     * `planId !== FREE` 的守門（review 二輪高-2 的變化型）：寬限期內
     * `currentPlanId` 是**折算後**的 free，使用者送 free 是要**降級**，
     * 不是取消排程——沒有這道守門，他按「降級」的效果會是重新打開自動續訂。
     */
    if (
      subscription?.pendingPlanId &&
      planId === currentPlanId &&
      planId !== TEAM_PLAN.FREE &&
      !paymentMethodId
    ) {
      await teamSubscriptionRepo.cancelPendingPlanChange(teamId);
      return {
        kind: SUBSCRIPTION_CHANGE_KIND.SCHEDULED,
        planId: currentPlanId,
        pendingPlanId: null,
        effectiveAt: nowSec,
      };
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
        kind: SUBSCRIPTION_CHANGE_KIND.SCHEDULED,
        // Info: (20260820 - Luphia) 回**當期**方案：當期權益沒有變，畫面不該顯示新方案
        planId: currentPlanId,
        pendingPlanId: planId,
        effectiveAt: Math.floor(subscription.currentPeriodEnd.getTime() / 1000),
      };
    }

    if (planId === TEAM_PLAN.FREE) {
      /**
       * Info: (20260821 - Luphia) 走到這裡的「free」有兩種，必須用 **DB 的原值**
       * 分辨，不能用折算值（review #6687 二輪高-2）：
       *
       * - DB 也是 free：真的沒有東西要做。
       * - DB 是付費方案而折算成 free：**寬限期**（PAST_DUE，扣款失敗三天內）。
       *   原本這裡什麼都不做卻回報成功，而 `listPastDueAutoRenew` 的三個條件
       *   （PAST_DUE、autoRenew、planId ≠ free）全都還成立——使用者按了
       *   「降級為免費版」，續訂 worker 下一小時照樣拿他的卡去扣款。
       *
       * 寬限期的降級**立即生效**（產品裁定 20260821）：寬限期內本來就沒有
       * 付費權益（fail-closed 已折算成 free），立即落地最誠實；`downgradeToFree`
       * 一併關掉 autoRenew、清排程、歸零單價、標記卡片待同步。
       */
      if (subscription && subscription.planId !== TEAM_PLAN.FREE) {
        await teamSubscriptionRepo.downgradeToFree(teamId, nowMs);
      }
      return {
        kind: SUBSCRIPTION_CHANGE_KIND.SCHEDULED,
        planId: TEAM_PLAN.FREE,
        pendingPlanId: null,
        effectiveAt: nowSec,
      };
    }

    if (!paymentMethodId) {
      throw toApiError(API_ERRORS.VL_SCHEMA_ERROR);
    }

    /**
     * Info: (20260821 - Luphia) 展延閘門（產品裁定 20260821，review #6687 二輪
     * 阻擋-1）：**當期剩餘超過 30 天不得購買**——延長與換方案都是。
     *
     * 履行的展延語意（新期自當期屆滿日累加、`planId` 立即換新）維持原案；
     * 但沒有閘門時它對「換方案」是一個漏洞：年繳團隊版第 1 天買月繳企業版，
     * 剩餘 364 天全部免費升級成企業版再加一個月（約四折）。閘門把免費升級的
     * 剩餘天數壓到最多 30 天，也讓訂閱跨距任何時候不超過「一期 + 30 天」。
     *
     * 判斷用**折算後**的有效方案：過期或 PAST_DUE 的列（remaining 可能為負或
     * 折算為 free）不受閘門影響——那是重新訂閱，不是展延。
     */
    if (
      subscription &&
      currentPlanId !== TEAM_PLAN.FREE &&
      subscription.currentPeriodEnd.getTime() - nowMs >
        SUBSCRIPTION_EXTENSION_WINDOW_DAYS * 86_400_000
    ) {
      throw toApiError(API_ERRORS.TW_SUBSCRIPTION_EXTENSION_TOO_EARLY);
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
    if (inFlight && Number(inFlight.amount) === amount) {
      logger.info("subscription order reused", {
        teamId,
        orderId: inFlight.id,
        planId,
        billingInterval,
      });
      return {
        kind: SUBSCRIPTION_CHANGE_KIND.ORDER,
        orderId: inFlight.id,
        challenge: inFlight.challenge,
        cost: Number(inFlight.amount),
        planId: currentPlanId,
        supersedesPendingPlanId: pendingTarget,
      };
    }

    /**
     * Info: (20260820 - Luphia) 金額已經不同就**不沿用**（self-review 第二輪，小）。
     *
     * 那張未付的單是幾小時前建的，`amount` 是**當時**的席次數算的。中間有人加入
     * 就會少收一個席次期。付款畫面的金額守門會擋下並要求再確認，因此不會靜默扣錯，
     * 但使用者確認後沿用的仍是舊金額。
     *
     * 改建新單，並把舊那張標記取消——不取消的話它仍是可付的：從另一個分頁或
     * 訂單列表把它付掉，就以舊金額成交。
     */
    if (inFlight) {
      await paymentRepo.cancelOrder(
        inFlight.id,
        `superseded: amount ${Number(inFlight.amount)} → ${amount}`,
      );
      logger.info("subscription order superseded by a new amount", {
        teamId,
        orderId: inFlight.id,
        previousAmount: Number(inFlight.amount),
        amount,
      });
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
    /**
     * Info: (20260820 - Luphia) 一併回「這次購買會取代的排程」。
     *
     * 升級不會經過上面那個取消分支——排程是在**履行**時由
     * `applyTeamSubscriptionInTx` 清掉的。因此在付款完成之前它仍然存在，
     * 而使用者需要知道「付完這筆，原定期末的降級就不會發生」。
     * 用現在式的欄位名（`supersedesPendingPlanId`）而不是「已取消」：
     * 那一刻還沒取消。
     */
    return {
      kind: SUBSCRIPTION_CHANGE_KIND.ORDER,
      orderId: order.orderId,
      challenge: order.challenge,
      cost: order.cost ?? amount,
      planId: currentPlanId,
      supersedesPendingPlanId: pendingTarget,
    };
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
