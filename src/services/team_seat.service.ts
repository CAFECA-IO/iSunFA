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

// Info: (20260814 - Luphia) 席次補收為 merchant-initiated 交易，無 FIDO 簽章；此標記寫入訂單供稽核
const SEAT_AUTH_MARKER = JSON.stringify({ verifiedVia: "seat_addition" });

export interface ISeatChargeResult {
  // Info: (20260814 - Luphia) 是否真的扣了款（免費方案、期末零頭都會是 false）
  charged: boolean;
  amount: number;
  orderId?: string;
  seats: number;
}

export interface ISeatChargeParams {
  teamId: string;
  // Info: (20260814 - Luphia) 一次增加的席次數，預設 1
  seats?: number;
  nowMs: number;
}

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
  const { teamId, seats = 1, nowMs } = params;
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
    return { charged: false, amount: 0, seats: 0 };
  }

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
    seats,
  });

  /**
   * Info: (20260814 - Luphia) 補收金額為 0＝期末剩餘時間的零頭（單價已確認為正）：
   * 席次照加、不建單。為了幾塊錢去打一次金流，失敗率與雜訊都比收到的錢多。
   */
  if (amount <= 0) {
    await teamSubscriptionRepo.addSeats(teamId, seats);
    return { charged: false, amount: 0, seats };
  }

  const lastOrder = subscription.latestOrderId
    ? await paymentRepo.getOrderById(subscription.latestOrderId)
    : null;
  const paymentMethodId = (lastOrder?.data as ISubscriptionOrderData | null)
    ?.paymentMethodId;
  const paymentMethod = paymentMethodId
    ? await paymentRepo.getPaymentMethodById(paymentMethodId)
    : null;

  if (!lastOrder || !paymentMethod?.token) {
    /**
     * Info: (20260814 - Luphia) 沒有可扣款的卡就不能加人：放行等於送出一個免費席次，
     * 而且沒有任何後續流程會回頭補收。請團隊先更新付款方式。
     */
    throw toApiError(API_ERRORS.TW_SEAT_PAYMENT_METHOD_MISSING);
  }

  const user = await webAuthnRepo.findUserById(lastOrder.userId);
  const order = await generatePaymentOrder(lastOrder.userId, {
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
    data: { seatAddition: true },
  });

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

  await teamSubscriptionRepo.addSeats(teamId, seats);
  await paymentRepo.updateOrderCompleted(order.orderId);

  logger.info("seat addition charged", {
    teamId,
    orderId: order.orderId,
    amount,
    seats,
  });

  return { charged: true, amount, orderId: order.orderId, seats };
}
