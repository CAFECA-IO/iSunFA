import { logger } from "@/lib/utils/logger";
import { CURRENCY_UNIT } from "@/constants/price";
import { ORDER_TYPE } from "@/constants/status";
import { TEAM_PLAN } from "@/constants/subscription_quota";
import { API_ERRORS, ApiError, IErrorDef } from "@/lib/utils/error_dictionary";
import { resolveSeatProration } from "@/lib/billing/seat_billing";
import { generatePaymentOrder } from "@/services/order.service";
import { chargeOrderWithSavedCard } from "@/services/team_billing.service";
import { resolveEffectivePlanId } from "@/services/spend.service";
import { paymentRepo } from "@/repositories/payment.repo";
import { teamSubscriptionRepo } from "@/repositories/team_subscription.repo";
import { teamRepo } from "@/repositories/team.repo";
import { resolveFreePlanMaxMembers } from "@/services/team_subscription.service";
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
 */
const SEAT_CHARGE_PERIOD_MULTIPLIER = 2;

interface ISubscriptionOrderData {
  paymentMethodId?: string;
}

/**
 * Info: (20260814 - Luphia) 為團隊增加席次並補收費用。
 * 免付費訂閱（free / 已過期 / 非 ACTIVE）一律不收費也不記席次——
 * 那些團隊的人數本來就不影響帳單。
 */
export async function chargeSeatAddition(
  params: ISeatChargeParams,
): Promise<ISeatChargeResult> {
  const { teamId, seats = 1, nowMs, operatorUserId, idempotencyKey } = params;
  const subscription = await teamSubscriptionRepo.getByTeamId(teamId);

  if (!subscription) return { charged: false, amount: 0, seats: 0 };

  const nowSec = Math.floor(nowMs / 1000);
  const effectivePlanId = resolveEffectivePlanId(
    {
      planId: subscription.planId,
      status: subscription.status,
      currentPeriodEnd: subscription.currentPeriodEnd,
    },
    nowSec,
  );
  if (effectivePlanId === TEAM_PLAN.FREE) {
    /**
     * Info: (20260814 - Luphia) 免費版不收費，但要擋人數（PR #6652 第二輪 B-4）。
     *
     * 額度改為逐成員計算後，付費方案以「席次 × 單價」自然封頂，免費版沒有這個機制：
     * 席次單價是 0，人數再多帳單都是 0，而每個人各自享有一份額度——
     * 20 人的免費團隊就是每週 800 點的模型用量、月費零。
     * 上限為系統設定（可後台調整），對應服務條款 §3.1「以方案頁標示為準」。
     */
    const maxMembers = await resolveFreePlanMaxMembers();
    const memberCount = await teamRepo.countMembers(teamId);
    if (memberCount + seats > maxMembers) {
      logger.info("free plan member cap reached", {
        teamId,
        memberCount,
        maxMembers,
      });
      throw toApiError(API_ERRORS.TW_FREE_PLAN_MEMBER_LIMIT);
    }
    return { charged: false, amount: 0, seats: 0 };
  }

  /**
   * Info: (20260815 - Luphia) 已付費席次若還有空位，就不再收費（產品拍板 20260815）。
   *
   * 席次的佔用者是「成員 + 尚未失效的 PENDING 邀請」。邀請被拒絕、撤回或逾期時
   * **不退費**，但那個位置會空出來——下一次邀請直接用它，不必再付一次。
   * 這是「未成功的席次不退費、但多出來的席次可以用於邀請其他人」的實作方式：
   * 團隊付的是「同時可以有幾個人」，不是「按了幾次邀請」。
   *
   * 也因此這個檢查必須在補收之前：先看有沒有空位，沒有才談錢。
   */
  const occupied =
    (await teamRepo.countMembers(teamId)) +
    (await teamRepo.countPendingInvitations(teamId, nowMs));
  const paidSeats = Math.max(1, subscription.seats);
  if (occupied + seats <= paidSeats) {
    logger.info("seat addition covered by an already-paid seat", {
      teamId,
      occupied,
      paidSeats,
    });
    return { charged: false, amount: 0, seats, reusedPaidSeat: true };
  }

  /**
   * Info: (20260815 - Luphia) 只為「超出已付費席次的部分」補收。
   * 例：已付 5 席、目前佔用 5、一次邀 2 人 → 只補收 2 席中的 2 席（5+2 > 5，差額 2）。
   */
  const seatsToCharge = occupied + seats - paidSeats;

  /**
   * Info: (20260814 - Luphia) 付費方案卻沒有單價＝資料異常，必須拒絕（PR #6652 第二輪 A-3）。
   *
   * `unit_price` 是新欄位、預設 0，而本專案沒有 migrations 目錄——部署後既有訂閱一律是 0，
   * 要等下次續訂才寫入真值。若照零元路徑放行，接下來整個計費週期內加人全部免費：
   * 不建單、不寫 log、`charged: false` 前端也不顯示異常，而年繳戶的曝險窗口接近一年。
   * 「沒卡不准加人」那道防線在零元分支之後才檢查，也會一併失效。
   *
   * 零元的**正當**情形只有期末剩餘時間的零頭（見下方 amount <= 0 分支），
   * 那時單價本身是正的。兩者必須分開。
   */
  if (subscription.unitPrice <= 0) {
    logger.error("seat addition blocked: paid subscription has no unit price", {
      teamId,
      planId: subscription.planId,
      seats,
    });
    throw toApiError(API_ERRORS.TW_SEAT_PRICE_MISSING);
  }

  const amount = resolveSeatProration({
    unitPrice: subscription.unitPrice,
    nowMs,
    periodStartMs: subscription.currentPeriodStart.getTime(),
    periodEndMs: subscription.currentPeriodEnd.getTime(),
    // Info: (20260815 - Luphia) 只算超出已付費席次的部分（見上方說明）
    seats: seatsToCharge,
  });

  /**
   * Info: (20260814 - Luphia) 補收金額為 0＝期末剩餘時間的零頭（單價已確認為正）：
   * 席次照加、不建單。為了幾塊錢去打一次金流，失敗率與雜訊都比收到的錢多。
   */
  if (amount <= 0) {
    await teamSubscriptionRepo.addSeats(teamId, seatsToCharge);
    return { charged: false, amount: 0, seats };
  }

  /**
   * Info: (20260814 - Luphia) 當期補收總額的上限檢查（PR #6652 第二輪 B-2）。
   * 以本期已補收的席次訂單合計判斷，超過即拒絕並記錄——這是防「替他人的卡連刷」的護欄。
   */
  const chargedThisPeriod = await paymentRepo.sumSeatAdditionAmount(
    teamId,
    subscription.currentPeriodStart,
  );
  const periodCap =
    BigInt(subscription.unitPrice) *
    BigInt(Math.max(1, subscription.seats)) *
    BigInt(SEAT_CHARGE_PERIOD_MULTIPLIER);
  if (chargedThisPeriod + BigInt(amount) > periodCap) {
    logger.error("seat addition blocked: period charge cap exceeded", {
      teamId,
      operatorUserId: operatorUserId ?? "(unknown)",
      chargedThisPeriod: chargedThisPeriod.toString(),
      attempted: amount,
      cap: periodCap.toString(),
    });
    throw toApiError(API_ERRORS.TW_SEAT_CHARGE_CAP_EXCEEDED);
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
   * Info: (20260815 - Luphia) 只判斷 `paymentMethod?.token`（PR #6652 第二輪 D）。
   *
   * `lastOrder` 為 null 時 `paymentMethodId` 必為 undefined，`paymentMethod` 也必為 null——
   * 原本的 `!lastOrder ||` 永遠不會是那個為真的一半，而對應測試也只 mock 了後者，
   * 刪掉前半段不會有任何測試變紅。留著會讓讀者以為存在一條需要它的路徑。
   */
  if (!paymentMethod?.token || !lastOrder) {
    /**
     * Info: (20260814 - Luphia) 沒有可扣款的卡就不能加人：放行等於送出一個免費席次，
     * 而且沒有任何後續流程會回頭補收。請團隊先更新付款方式。
     */
    throw toApiError(API_ERRORS.TW_SEAT_PAYMENT_METHOD_MISSING);
  }

  /**
   * Info: (20260814 - Luphia) 冪等：同一把鍵已經扣過就不再扣第二次（第二輪 B-3）。
   * 建立邀請失敗後客戶端重試時，這道檢查是唯一擋得住重複扣款的東西。
   *
   * Info: (20260818 - Luphia) **鍵要綁計費週期**（第三輪 A-2）。
   *
   * 呼叫端給的是「團隊 + 對象」這種業務鍵，不含時間。於是每一個
   * 「曾經被收過費的信箱／位址」都成了一張**永久免費席次券**：成員離職移出、
   * 半年後再邀請回來，會找到當初那張 COMPLETED 訂單而跳過扣款。
   *
   * 由這裡補上週期而不是要求呼叫端自己帶：週期只有這裡知道
   * （呼叫端沒有 subscription），而「忘記帶」的後果是安靜地不收錢。
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
        /**
         * Info: (20260818 - Luphia) 回原本的金額（第三輪 D）。
         * 先前寫 `Number(-existing.amount)`，回的是負數——前端只讀
         * `reusedPaidSeat` 所以看不出來，但值是錯的。
         */
        amount: Number(existing.amount),
        orderId: existing.id,
        seats,
      };
    }
  }

  const user = await webAuthnRepo.findUserById(lastOrder.userId);
  /**
   * Info: (20260815 - Luphia) 建單失敗且是唯一鍵衝突＝另一個並發請求已經扣過（第二輪 B-3）。
   *
   * 上方的「先查有沒有」擋得住循序重試，擋不住同時抵達的兩個請求——
   * 兩邊都查不到就都會往下走。真正的防線是資料庫的唯一約束，這裡把它翻譯成「重放」。
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
