import { logger } from "@/lib/utils/logger";
import { CURRENCY_UNIT } from "@/constants/price";
import { ORDER_TYPE } from "@/constants/status";
import {
  BILLING_INTERVAL_DAYS,
  BillingInterval,
  TEAM_PLAN,
} from "@/constants/subscription_quota";
import { API_ERRORS, ApiError, IErrorDef } from "@/lib/utils/error_dictionary";
import { resolveSeatProration } from "@/lib/billing/seat_billing";
import { MoneyUtil } from "@/lib/utils/money";
import { generatePaymentOrder } from "@/services/order.service";
import { chargeOrderWithSavedCard } from "@/services/team_billing.service";
import { resolveEffectivePlanId } from "@/lib/subscription/plan_rules";
import { paymentRepo } from "@/repositories/payment.repo";
import { teamSubscriptionRepo } from "@/repositories/team_subscription.repo";
import { teamRepo } from "@/repositories/team.repo";
import { webAuthnRepo } from "@/repositories/webauthn.repo";

/**
 * Info: (20260814 - Luphia) 期中增加席次的補收（規範 §4「邀請即收費」、P3）。
 *
 * 訂閱是「席次 × 單價」的整期費用，因此期中加人若不補收，這一期就多出一個免費席次，
 * 而且下一次續訂才會被計入——中間的空窗沒有任何流程會回頭補。
 *
 * 收費時點是**發出邀請**而非對方接受：席次自邀請起就被佔用（別人不能用同一個名額），
 * 且「接受才收費」會讓收不收得到錢取決於受邀者何時點連結。
 *
 * 順序刻意是 fail-closed：先扣款，成功才建立邀請。反過來會出現「人已經加進來、
 * 錢沒收到」的狀態，而那需要人工追討。
 */

// Info: (20260814 - Luphia) 與其他團隊服務相同的錯誤包裝，錯誤碼統一走字典
function toApiError(def: IErrorDef): ApiError {
  return new ApiError(def.code, def.message, def.status);
}

/**
 * Info: (20260815 - Luphia) Prisma 的唯一鍵衝突（P2002）。
 * 在冪等的建單路徑上，這不是錯誤而是「另一個請求已經做過了」。
 */
function isUniqueKeyConflict(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: string }).code === "P2002"
  );
}

// Info: (20260818 - Luphia) 供「本期剩餘天數」的文案換算；比例計價本身走毫秒
const DAY_MS = 86_400_000;

/**
 * Info: (20260818 - Luphia) 試算會擋下加人的所有原因。
 *
 * 明列成一份清單，是為了讓「試算擋下的原因」與「真正送出時丟的錯誤」是同一組——
 * 試算回的是錯誤碼，執行端據此還原 `IErrorDef` 再丟。清單漏了一條，
 * `chargeSeatAddition` 就會把它降級成通用的 `TW_OPERATION_FAILED`，
 * 因此 `seat_quote_contract.test.ts` 釘住「每一條 BLOCKED 都還原得回原本的錯誤」。
 */
const SEAT_BLOCKING_ERRORS: readonly IErrorDef[] = [
  // Info: (20260819 - Luphia) TW_FREE_PLAN_MEMBER_LIMIT 已退役（免費版人數上限移除）
  API_ERRORS.TW_SEAT_PRICE_MISSING,
  /**
   * Info: (20260821 - Luphia) 新增擋下原因**一定要同步這份清單**（review #6687 三輪）：
   * `chargeSeatAddition` 照這裡把試算的原因轉成實扣的錯誤，漏掉就退回泛用的
   * `TW_OPERATION_FAILED`——試算說「週期沒回填」，實扣說「操作失敗」，
   * 而運維要查的是兩個不同方向。`seat_quote_contract.test.ts` 逐條比對兩側。
   */
  API_ERRORS.TW_SEAT_BILLING_INTERVAL_MISSING,
  API_ERRORS.TW_SEAT_CHARGE_CAP_EXCEEDED,
  API_ERRORS.TW_SEAT_PAYMENT_METHOD_MISSING,
  API_ERRORS.TW_OPERATION_FAILED,
];

// Info: (20260814 - Luphia) 席次補收為 merchant-initiated 交易，無 FIDO 簽章；此標記寫入訂單供稽核
const SEAT_AUTH_MARKER = JSON.stringify({ verifiedVia: "seat_addition" });

export interface ISeatChargeResult {
  // Info: (20260814 - Luphia) 是否真的扣了款（免費方案、期末零頭都會是 false）
  charged: boolean;
  amount: number;
  orderId?: string;
  seats: number;
  /**
   * Info: (20260815 - Luphia) 這次是用了「已付費但空出來的席次」（產品拍板 20260815）：
   * 前一次邀請被拒或逾期，錢沒有退，但位置可以再用。前端據此顯示
   * 「使用既有席次，未再收費」而不是靜靜地不說。
   */
  reusedPaidSeat?: boolean;
}

export interface ISeatChargeParams {
  teamId: string;
  // Info: (20260814 - Luphia) 一次增加的席次數，預設 1
  seats?: number;
  nowMs: number;
  /**
   * Info: (20260814 - Luphia) 發起這次加席的操作者（PR #6652 第二輪 B-2）。
   * 扣的是訂閱那張卡（持卡人是 OWNER），因此每一筆都要記得下是誰發動的。
   */
  operatorUserId?: string;
  /**
   * Info: (20260814 - Luphia) 冪等鍵：同一次邀請重試不重複扣款。
   * 沒有它時，建立邀請失敗後客戶端重試就會再扣一次（第二輪 B-3）。
   */
  idempotencyKey?: string;
  /**
   * Info: (20260819 - Luphia) 呼叫端**在畫面上顯示過**的金額（review #6682 高）。
   *
   * 試算與送出之間隔著填表與 FIDO2 簽章，而試算的兩個輸入在那段時間都會變
   * （席次佔用、計費週期）。給了這個值就會在扣款前比對一次，不符即擋下
   * （`TW_SEAT_QUOTE_STALE`）並要求重新試算——「畫面說 0、卡被刷 840」
   * 不能是可能發生的事。
   *
   * 型別上**選填**：直接加人（`members` 端點）目前沒有試算畫面，那條路徑維持原狀。
   * 但兩支邀請端點的 validator 要求必填，所以使用者走得到的路徑一定會比對。
   */
  expectedAmount?: number;
}

/**
 * Info: (20260814 - Luphia) 單一計費週期內的補收總額上限（PR #6652 第二輪 B-2）。
 *
 * 邀請開放 OWNER / ADMIN，但補收扣的是訂閱那張卡（持卡人是 OWNER），
 * 且屬 merchant-initiated、沒有持卡人當下的授權。沒有上限的話，一位 ADMIN
 * 連續邀請 50 個位址就是替 OWNER 的卡刷 50 筆——那不該是系統允許發生的事。
 *
 * 上限取「當期訂閱費的 2 倍」：正常的期中擴編（加幾席）遠低於它，
 * 而異常的批次邀請會撞上。撞到上限不是拒絕擴編，是要求改由續訂時一次計費
 * （或先聯繫客服），把異常拉回人的視線內。
 *
 * Info: (20260821 - Luphia) 倍數綁的是**一期**（unitPrice 是一期的價格）。
 * 展延讓當期跨距可能超過一期，但展延閘門（剩餘 30 天內才能續購）保證跨距
 * 不超過「一期 + 30 天」，單席補收最多約 1.97 期——合法的擴編仍在 2 倍內。
 */
const SEAT_CHARGE_PERIOD_MULTIPLIER = 2;

interface ISubscriptionOrderData {
  paymentMethodId?: string;
}

/**
 * Info: (20260814 - Luphia) 為團隊增加席次並補收費用。
 * 免付費訂閱（free / 已過期 / 非 ACTIVE）一律不收費也不記席次——
 * 那些團隊的人數本來就不影響帳單。

/**
 * Info: (20260818 - Luphia) 席次補收的**試算**結果（產品回報 20260818）。
 *
 * 在此之前，補收金額只有扣款**之後**才存在：管理員按下「邀請」的那一刻，
 * 系統就以 merchant-initiated 交易刷了訂閱那張卡，而畫面事前沒有揭露任何金額，
 * 事後也只讀 `reusedPaidSeat`（連金額都沒顯示）。
 * 使用者的原話是「我在邀請時完全不知道會被加收多少錢」。
 *
 * 因此把「要不要收、收多少、收不了的原因」抽成這支唯讀的試算，
 * 讓 UI 在送出前就能講清楚，而 `chargeSeatAddition` **也走同一支**——
 * 另寫一份試算等於讓「顯示的金額」與「實際扣的金額」是兩支實作，
 * 而它們分岔的那天，畫面會很有說服力地報一個錯的價格（review checklist §1.10）。
 */
export const SEAT_QUOTE_KIND = {
  // Info: (20260818 - Luphia) 免費方案：不收費（人數超上限則為 BLOCKED）
  FREE_PLAN: "FREE_PLAN",
  // Info: (20260818 - Luphia) 已付費席次還有空位，本次不收費（2026-08-15 拍板）
  REUSE_PAID_SEAT: "REUSE_PAID_SEAT",
  // Info: (20260818 - Luphia) 期末剩餘時間的零頭，比例計價後為 0：席次照加、不建單
  NO_CHARGE_PERIOD_END: "NO_CHARGE_PERIOD_END",
  // Info: (20260818 - Luphia) 會扣款，金額為 `amount`
  CHARGE: "CHARGE",
  // Info: (20260818 - Luphia) 現在不能加人，原因在 `blocked`
  BLOCKED: "BLOCKED",
} as const;

export type SeatQuoteKind =
  (typeof SEAT_QUOTE_KIND)[keyof typeof SEAT_QUOTE_KIND];

export interface ISeatQuote {
  kind: SeatQuoteKind;
  /** Info: (20260818 - Luphia) 將立即收取的金額（`CHARGE` 以外一律為 0） */
  amount: number;
  currency: string;
  /** Info: (20260818 - Luphia) 這次要求的席次數 */
  seats: number;
  /** Info: (20260818 - Luphia) 其中真正超出已付費席次、需要收費的席次數 */
  seatsToCharge: number;
  planId?: string;
  unitPrice?: number;
  /** Info: (20260818 - Luphia) 目前佔用（成員 + 未失效的 PENDING 邀請）與已付費席次 */
  occupied?: number;
  paidSeats?: number;
  periodEndMs?: number;
  /**
   * Info: (20260818 - Luphia) 本期剩餘天數（向上取整，最少 1）。
   * 只供文案用——比例計價的分母是毫秒，不是天（見 `resolveSeatProration`）。
   */
  remainingDays?: number;
  blocked?: { code: string; message: string };
}

function blockedQuote(
  def: IErrorDef,
  base: { seats: number; planId?: string },
): ISeatQuote {
  return {
    kind: SEAT_QUOTE_KIND.BLOCKED,
    amount: 0,
    currency: CURRENCY_UNIT.TWD,
    seats: base.seats,
    seatsToCharge: 0,
    planId: base.planId,
    blocked: { code: def.code, message: def.message },
  };
}

/**
 * Info: (20260818 - Luphia) 試算加席要收多少錢。**完全唯讀**：不建單、不扣款、不改席次。
 *
 * 判斷順序與 `chargeSeatAddition` 完全一致（本來就是同一段程式），因此畫面上顯示的
 * 原因與真正送出時會遇到的原因是同一個。
 */
export async function quoteSeatAddition(
  params: ISeatChargeParams,
): Promise<ISeatQuote> {
  const { teamId, seats = 1, nowMs } = params;
  const subscription = await teamSubscriptionRepo.getByTeamId(teamId);

  /**
   * Info: (20260818 - Luphia) **查無訂閱列＝免費版**，不是「跳過所有檢查」。
   *
   * 原本 `chargeSeatAddition` 是 `if (!subscription) return` 直接早退，而新建的團隊
   * 根本沒有 `TeamSubscription` 列（建團隊只寫 Team + TeamMember）——於是每一個免費
   * 團隊都走那條早退，底下的免費版人數上限一次都沒有執行過。
   * `resolveEffectivePlanId(null)` 已經回 FREE，把 null 交給它，讓「什麼是免費版」
   * 只有一個判斷點。
   */
  const nowSec = Math.floor(nowMs / 1000);
  const effectivePlanId = resolveEffectivePlanId(
    subscription && {
      planId: subscription.planId,
      status: subscription.status,
      currentPeriodEnd: subscription.currentPeriodEnd,
    },
    nowSec,
  );

  if (effectivePlanId === TEAM_PLAN.FREE) {
    /**
     * Info: (20260819 - Luphia) 免費方案不收席次費，**也不再限制人數**（產品決定 20260819）。
     *
     * 原本這裡有一道人數上限，理由不是人數而是**免費額度**：額度逐成員計算、
     * 每位成員各自一份，於是 20 人的免費團隊就是每週 800 點的模型用量、月費零。
     * 額度已改為**全隊共用一份**（見 `spendCredits`）——加人不再產生任何額度，
     * 上限失去存在的理由，連同接受端的第二道防線一併移除。
     *
     * 因此這個分支**不再需要數人數**：先前為了比對上限而查的成員數與待接受邀請數
     * 一起拿掉（兩次查詢），試算回的 `occupied` / `paidSeats` 也隨之省略——
     * 免費方案沒有「已付費席次」這個概念，回一個數字只會讓畫面以為有上限。
     *
     * 付費方案的人數仍由「席次 × 單價」自然封頂，那條路徑完全沒有變。
     */
    return {
      kind: SEAT_QUOTE_KIND.FREE_PLAN,
      amount: 0,
      currency: CURRENCY_UNIT.TWD,
      seats,
      seatsToCharge: 0,
      planId: effectivePlanId,
    };
  }

  /**
   * Info: (20260818 - Luphia) 到這裡必有訂閱列（`resolveEffectivePlanId(null)` 回 FREE，
   * 上面那個分支已經處理掉）。留這道 fail-fast 讓型別窄化有依據，而不是用 `!`
   * 假裝它一定存在——若哪天判定邏輯改了，這裡會明確地失敗。
   */
  if (!subscription) {
    return blockedQuote(API_ERRORS.TW_OPERATION_FAILED, { seats });
  }

  /**
   * Info: (20260815 - Luphia) 已付費席次若還有空位，就不再收費（產品拍板 20260815）。
   *
   * 席次的佔用者是「成員 + 尚未失效的 PENDING 邀請」。邀請被拒絕、撤回或逾期時
   * **不退費**，但那個位置會空出來——下一次邀請直接用它，不必再付一次。
   * 團隊付的是「同時可以有幾個人」，不是「按了幾次邀請」。
   * 因此這個檢查必須在補收之前：先看有沒有空位，沒有才談錢。
   */
  const occupied =
    (await teamRepo.countMembers(teamId)) +
    (await teamRepo.countPendingInvitations(teamId, nowMs));
  const paidSeats = Math.max(1, subscription.seats);
  const base = {
    seats,
    planId: subscription.planId,
    unitPrice: subscription.unitPrice,
    occupied,
    paidSeats,
    periodEndMs: subscription.currentPeriodEnd.getTime(),
    currency: CURRENCY_UNIT.TWD,
  };

  if (occupied + seats <= paidSeats) {
    return {
      ...base,
      kind: SEAT_QUOTE_KIND.REUSE_PAID_SEAT,
      amount: 0,
      seatsToCharge: 0,
    };
  }

  /**
   * Info: (20260815 - Luphia) 只為「超出已付費席次的部分」補收。
   * 例：已付 5 席、目前佔用 5、一次邀 2 人 → 差額 2 席。
   */
  const seatsToCharge = occupied + seats - paidSeats;

  /**
   * Info: (20260814 - Luphia) 付費方案卻沒有單價＝資料異常，必須拒絕（第二輪 A-3）。
   *
   * `unit_price` 是新欄位、預設 0，而本專案沒有 migrations 目錄——部署後既有訂閱
   * 一律是 0，要等下次續訂才寫入真值。若照零元路徑放行，接下來整個計費週期內加人
   * 全部免費，而年繳戶的曝險窗口接近一年。零元的**正當**情形只有期末零頭
   * （見下方 amount <= 0），那時單價本身是正的。兩者必須分開。
   */
  if (subscription.unitPrice <= 0) {
    logger.error("seat addition blocked: paid subscription has no unit price", {
      teamId,
      planId: subscription.planId,
      seats,
    });
    return {
      ...blockedQuote(API_ERRORS.TW_SEAT_PRICE_MISSING, {
        seats,
        planId: subscription.planId,
      }),
      occupied,
      paidSeats,
    };
  }

  const periodStartMs = subscription.currentPeriodStart.getTime();
  const periodEndMs = subscription.currentPeriodEnd.getTime();
  /**
   * Info: (20260821 - Luphia) 比例的分母是**一個計費週期**，不是
   * `periodEnd − periodStart`（review #6687 二輪高-1：展延後的跨距是好幾期，
   * 用跨距當分母會把補收除以期數）。週期讀訂閱列的快照欄位；
   * 認不得的值（含 NULL——`db push` 之後尚未回填的既有列）當資料異常擋下：
   * 分母猜錯的後果是把年繳戶的補收乘上十二倍，比擋下一次加人嚴重得多。
   * 欄位刻意可為 NULL 且無預設值（review #6687 三輪），這道守門才擋得到既有列。
   */
  const periodDays = subscription.billingInterval
    ? BILLING_INTERVAL_DAYS[subscription.billingInterval as BillingInterval]
    : undefined;
  if (!periodDays) {
    logger.error("seat addition blocked: billing interval missing or unknown", {
      teamId,
      billingInterval: subscription.billingInterval,
    });
    return {
      ...blockedQuote(API_ERRORS.TW_SEAT_BILLING_INTERVAL_MISSING, {
        seats,
        planId: subscription.planId,
      }),
      occupied,
      paidSeats,
    };
  }
  const amount = resolveSeatProration({
    unitPrice: subscription.unitPrice,
    nowMs,
    periodStartMs,
    periodEndMs,
    periodDays,
    seats: seatsToCharge,
  });
  const remainingDays = Math.max(1, Math.ceil((periodEndMs - nowMs) / DAY_MS));

  if (amount <= 0) {
    return {
      ...base,
      kind: SEAT_QUOTE_KIND.NO_CHARGE_PERIOD_END,
      amount: 0,
      seatsToCharge,
      remainingDays,
    };
  }

  /**
   * Info: (20260814 - Luphia) 當期補收總額的上限（第二輪 B-2）：防「替他人的卡連刷」。
   * 邀請開放 OWNER / ADMIN，而補收扣的是 OWNER 那張卡且沒有持卡人當下的授權。
   */
  const chargedThisPeriod = await paymentRepo.sumSeatAdditionAmount(
    teamId,
    subscription.currentPeriodStart,
  );
  /**
   * Info: (20260821 - Luphia) 上限按**當期實際跨距**縮放（review #6687 三輪）。
   *
   * `unitPrice` 是一期的價格，而當期跨距可以超過一期：同方案續購會展延，
   * 換方案會加上折抵的天數（`resolveNextPeriod`）。跨距 3.8 期的當期若沿用
   * 「2 × 一期」的上限，**合法的加人會被誤擋**——單席補收本身就可能是 3.8 倍
   * 單價，而使用者只會看到一個指向「連刷」的錯誤訊息。
   *
   * 縮放而不是取消：上限的用途是防「ADMIN 替 OWNER 的卡連刷」，而那個風險
   * 與期間長度成正比——覆蓋 4 期的當期，合法的擴編額度本來就該是 4 期的量。
   * 至少 1 期（跨距短於一期只會出現在髒資料上，不放大也不縮小）。
   */
  const spanPeriods = MoneyUtil.toDecimal(periodEndMs - periodStartMs)
    .dividedBy(periodDays * DAY_MS)
    .toNumber();
  const periodCap =
    (BigInt(subscription.unitPrice) *
      BigInt(paidSeats) *
      BigInt(SEAT_CHARGE_PERIOD_MULTIPLIER) *
      BigInt(Math.max(100, Math.floor(spanPeriods * 100)))) /
    BigInt(100);
  if (chargedThisPeriod + BigInt(amount) > periodCap) {
    logger.error("seat addition blocked: period charge cap exceeded", {
      teamId,
      operatorUserId: params.operatorUserId ?? "(unknown)",
      chargedThisPeriod: chargedThisPeriod.toString(),
      attempted: amount,
      cap: periodCap.toString(),
    });
    return {
      ...blockedQuote(API_ERRORS.TW_SEAT_CHARGE_CAP_EXCEEDED, {
        seats,
        planId: subscription.planId,
      }),
      occupied,
      paidSeats,
    };
  }

  const lastOrder = subscription.latestOrderId
    ? await paymentRepo.getOrderById(subscription.latestOrderId)
    : null;
  const paymentMethodId = (lastOrder?.data as ISubscriptionOrderData | null)
    ?.paymentMethodId;
  const paymentMethod = paymentMethodId
    ? await paymentRepo.getPaymentMethodById(paymentMethodId)
    : null;

  /**
   * Info: (20260815 - Luphia) 只判斷 `paymentMethod?.token`（第二輪 D）：
   * `lastOrder` 為 null 時 `paymentMethodId` 必為 undefined、`paymentMethod` 也必為 null，
   * 原本的 `!lastOrder ||` 永遠不會是那個為真的一半。
   *
   * Info: (20260814 - Luphia) 沒有可扣款的卡就不能加人：放行等於送出一個免費席次，
   * 而且沒有任何後續流程會回頭補收。請團隊先更新付款方式。
   */
  if (!paymentMethod?.token || !lastOrder) {
    return {
      ...blockedQuote(API_ERRORS.TW_SEAT_PAYMENT_METHOD_MISSING, {
        seats,
        planId: subscription.planId,
      }),
      occupied,
      paidSeats,
    };
  }

  return {
    ...base,
    kind: SEAT_QUOTE_KIND.CHARGE,
    amount,
    seatsToCharge,
    remainingDays,
  };
}

/**
 * Info: (20260814 - Luphia) 為團隊增加席次並補收費用。
 *
 * Info: (20260818 - Luphia) 判斷全部交給 `quoteSeatAddition`（唯讀），這支只負責
 * **執行**：擋下的原因翻成 ApiError、要收費的走建單與扣款。兩者共用同一份判斷，
 * 因此畫面事前顯示的金額與這裡真正扣的金額不可能分岔。
 */
export async function chargeSeatAddition(
  params: ISeatChargeParams,
): Promise<ISeatChargeResult> {
  // Info: (20260818 - Luphia) `nowMs` 由試算使用（比例計價的分子），這裡不需要
  const { teamId, seats = 1, operatorUserId, idempotencyKey } = params;
  const quote = await quoteSeatAddition(params);

  if (quote.kind === SEAT_QUOTE_KIND.BLOCKED) {
    /**
     * Info: (20260818 - Luphia) 試算已經把原因查清楚，這裡照著丟。
     * 免費版人數上限那條原本就是在這個時點丟錯的，行為不變。
     */
    const def = SEAT_BLOCKING_ERRORS.find(
      (candidate) => candidate.code === quote.blocked?.code,
    );
    throw toApiError(def ?? API_ERRORS.TW_OPERATION_FAILED);
  }

  /**
   * Info: (20260819 - Luphia) 「不收費」的三種結果也要比對（review #6682 高的另一半）。
   *
   * 最糟的情境不是金額變了，是**方向**變了：畫面顯示「使用已付費的空席，不會再收費」，
   * 而送出時另一位管理者剛好用掉那個空席 → 變成 CHARGE。使用者從頭到尾看到的是
   * 「不會收費」，卡卻被刷。因此 `expectedAmount = 0` 與實際要收費同樣視為過期。
   */
  if (quote.kind === SEAT_QUOTE_KIND.FREE_PLAN) {
    return { charged: false, amount: 0, seats: 0 };
  }

  if (quote.kind === SEAT_QUOTE_KIND.REUSE_PAID_SEAT) {
    logger.info("seat addition covered by an already-paid seat", {
      teamId,
      occupied: quote.occupied ?? -1,
      paidSeats: quote.paidSeats ?? -1,
    });
    return { charged: false, amount: 0, seats, reusedPaidSeat: true };
  }

  /**
   * Info: (20260814 - Luphia) 補收金額為 0＝期末剩餘時間的零頭（單價已確認為正）：
   * 席次照加、不建單。為了幾塊錢去打一次金流，失敗率與雜訊都比收到的錢多。
   */
  if (quote.kind === SEAT_QUOTE_KIND.NO_CHARGE_PERIOD_END) {
    await teamSubscriptionRepo.addSeats(teamId, quote.seatsToCharge);
    return { charged: false, amount: 0, seats };
  }

  /**
   * Info: (20260819 - Luphia) 到這裡是 CHARGE：先比對「畫面上顯示過的金額」（review #6682 高）。
   *
   * 比對放在**建單與扣款之前**：擋下來時不該產生任何金流，也不該留下待付訂單。
   * 不比對就照新價扣款的話，使用者看到的與被扣的可以是兩個數字，而事後提示
   * 也不顯示金額——分岔完全隱形，只會在下期帳單出現。
   */
  if (
    params.expectedAmount !== undefined &&
    params.expectedAmount !== quote.amount
  ) {
    logger.info("seat charge rejected: quote is stale", {
      teamId,
      expected: params.expectedAmount,
      actual: quote.amount,
    });
    throw toApiError(API_ERRORS.TW_SEAT_QUOTE_STALE);
  }

  // Info: (20260818 - Luphia) 以下必要的資料重讀一次（試算刻意不回傳卡）
  const subscription = await teamSubscriptionRepo.getByTeamId(teamId);
  if (!subscription) throw toApiError(API_ERRORS.TW_OPERATION_FAILED);
  const lastOrder = subscription.latestOrderId
    ? await paymentRepo.getOrderById(subscription.latestOrderId)
    : null;
  const paymentMethodId = (lastOrder?.data as ISubscriptionOrderData | null)
    ?.paymentMethodId;
  const paymentMethod = paymentMethodId
    ? await paymentRepo.getPaymentMethodById(paymentMethodId)
    : null;
  if (!paymentMethod?.token || !lastOrder) {
    throw toApiError(API_ERRORS.TW_SEAT_PAYMENT_METHOD_MISSING);
  }

  const amount = quote.amount;
  const seatsToCharge = quote.seatsToCharge;

  /**
   * Info: (20260814 - Luphia) 冪等：同一把鍵已經扣過就不再扣第二次（第二輪 B-3）。
   * 建立邀請失敗後客戶端重試時，這道檢查是唯一擋得住重複扣款的東西。
   *
   * Info: (20260818 - Luphia) **鍵要綁計費週期**（第三輪 A-2）。
   * 呼叫端給的是「團隊 + 對象」這種業務鍵，不含時間。於是每一個「曾經被收過費的
   * 信箱／位址」都成了一張永久免費席次券：成員離職移出、半年後再邀請回來，
   * 會找到當初那張 COMPLETED 訂單而跳過扣款。由這裡補上週期而不是要求呼叫端自己帶：
   * 週期只有這裡知道，而「忘記帶」的後果是安靜地不收錢。
   */
  const scopedKey = idempotencyKey
    ? `${idempotencyKey}#p${subscription.currentPeriodStart.getTime()}`
    : undefined;

  if (scopedKey) {
    const existing = await paymentRepo.findOrderByIdempotencyKey(
      lastOrder.userId,
      scopedKey,
    );
    if (existing) {
      logger.info("seat addition replayed; charge skipped", {
        teamId,
        orderId: existing.id,
      });
      return {
        charged: false,
        // Info: (20260818 - Luphia) 回原本的金額（第三輪 D）；先前回的是負數
        amount: Number(existing.amount),
        orderId: existing.id,
        seats,
      };
    }
  }

  const user = await webAuthnRepo.findUserById(lastOrder.userId);

  /**
   * Info: (20260815 - Luphia) 建單失敗且是唯一鍵衝突＝另一個並發請求已經扣過（第二輪 B-3）。
   * 上方的「先查有沒有」擋得住循序重試，擋不住同時抵達的兩個請求——
   * 真正的防線是資料庫的唯一約束，這裡把它翻譯成「重放」。
   */
  let order;
  try {
    order = await generatePaymentOrder(lastOrder.userId, {
      type: ORDER_TYPE.BILLING_SEAT_ADDITION,
      amount,
      unit: CURRENCY_UNIT.TWD,
      // Info: (20260814 - Luphia) 席次補收不發點數，只是把新席次的期中費用收齊
      credits: 0,
      paymentMethodId: paymentMethod.id,
      title: `iSunFA Team Seat Addition - ${subscription.planId} x${seats}`,
      teamId,
      seats,
      unitPrice: subscription.unitPrice,
      // Info: (20260815 - Luphia) 由 DB 的唯一約束擋下並發的重複建單（第二輪 B-3）
      idempotencyKey: scopedKey,
      data: {
        seatAddition: true,
        // Info: (20260814 - Luphia) 發起者寫進訂單：事後查得出是誰發動的
        idempotencyKey: scopedKey ?? null,
        operatorUserId: operatorUserId ?? null,
        teamId,
      },
    });
  } catch (error) {
    if (isUniqueKeyConflict(error)) {
      logger.info("seat addition raced; charge skipped", {
        teamId,
        idempotencyKey: scopedKey ?? "(none)",
      });
      return { charged: false, amount: 0, seats };
    }
    throw error;
  }

  const orderData = {
    teamId,
    planId: subscription.planId,
    seats,
    unitPrice: subscription.unitPrice,
    seatAddition: true,
    paymentMethodId: paymentMethod.id,
    // Info: (20260807 - Luphia) IOenOrderData.amount 為字串（金額以字串傳輸避免浮點誤差）
    amount: String(amount),
    credits: 0,
  };

  const charge = await chargeOrderWithSavedCard({
    userId: lastOrder.userId,
    userName: user?.name ?? null,
    orderId: order.orderId,
    amount,
    credits: 0,
    orderData,
    paymentMethod: {
      id: paymentMethod.id,
      token: paymentMethod.token,
      data: paymentMethod.data,
    },
    authMarker: SEAT_AUTH_MARKER,
  });

  if (!charge.ok) {
    /**
     * Info: (20260820 - Luphia) 扣款失敗要**放掉冪等鍵**（self-review 第二輪，中）。
     *
     * 那把鍵是唯一欄位，而失敗的訂單仍佔著它。下一次同一個對象、同一期的邀請
     * 會查不到（`findOrderByIdempotencyKey` 刻意不認失敗的訂單）而去建新單，
     * 然後撞 P2002——**而那個 P2002 被當成「重放」吞掉，回 `charged: false`，
     * 於是邀請照樣寄出。一張卡被拒之後，下一次邀請就是一個沒付錢的席次。**
     *
     * 放掉之後重試會真的再扣一次款；「同一期不重複扣款」仍然成立，
     * 因為成功的訂單還握著鍵。
     */
    await paymentRepo.releaseIdempotencyKey(order.orderId);
    logger.error("seat addition charge failed", {
      teamId,
      orderId: order.orderId,
      reason: charge.reason ?? "unknown",
    });
    throw toApiError(API_ERRORS.TW_SEAT_CHARGE_FAILED);
  }

  await teamSubscriptionRepo.addSeats(teamId, seatsToCharge);
  await paymentRepo.updateOrderCompleted(order.orderId);

  logger.info("seat addition charged", {
    teamId,
    orderId: order.orderId,
    amount,
    seats,
  });

  return { charged: true, amount, orderId: order.orderId, seats };
}
