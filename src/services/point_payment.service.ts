import type { AuthenticationJSON } from "@passwordless-id/webauthn/dist/esm/types";
import { Order } from "@/generated";
import { ORDER_STATUS, ORDER_TYPE } from "@/constants/status";
import { CURRENCY_UNIT } from "@/constants/price";
import { ChallengePurpose } from "@/constants/challenge_purpose";
import { WalletCustodyType } from "@/constants/auth_provider";
import {
  POINT_LEDGER_KEY,
  POINT_LEDGER_OUTCOME,
} from "@/constants/point_ledger";
import {
  PERSONAL_CREDIT_CHARGE_KIND,
  POINT_PAYMENT_SIGNATURE,
  isPostPaymentOrderStatus,
} from "@/constants/point_payment";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { AppError } from "@/lib/utils/error";
import { logger } from "@/lib/utils/logger";
import { verifyChallengeToken } from "@/lib/auth/challenge_token";
import { resolveCustodyType } from "@/lib/auth/user_approval";
import { paymentRepo } from "@/repositories/payment.repo";
import { pointLedgerRepo } from "@/repositories/point_ledger.repo";
import { webAuthnRepo } from "@/repositories/webauthn.repo";
import { webAuthnService } from "@/services/webauthn.service";
import { getPendingOrder } from "@/services/order.service";
import {
  debitPointsForOrder,
  refundPointsForOrder,
} from "@/services/point_ledger.service";
import { fulfillPaidAnalysisOrder } from "@/services/analysis_fulfillment.service";
import { releasePaymentBlockedJobs } from "@/services/resumable_job.service";

/**
 * Info: (20261015 - Luphia) 以個人點數支付訂單（區塊鏈退役，取代 blockchain_payment）。
 *
 * 原本的流程：前端組 UserOp → 託管代簽或 passkey 簽 → bundler 上鏈 → 訂單 PAYING →
 * TxTracker 輪詢收據後標 PAID。自建鏈損毀後個人點數以 DB 帳本為唯一真相，
 * 扣點與標記 PAID 在同一次請求內完成：
 *
 * 1. 訂單必須是本人的、PENDING 的、ICP 計價的消費（ANALYSIS）訂單；
 * 2. 授權：託管帳號原本就由伺服器代簽，直接扣；passkey 帳號仍須以帳戶憑證確認
 *    （條款 §3.3），沿用用優惠券的 USER_ACTION challengeToken 機制；
 * 3. 扣點（冪等鍵 `orderDebit(orderId)`），餘額不足回 402；
 * 4. 以條件更新把 PENDING 推進到 PAID——只有搶到這一筆的請求往下履行；
 * 5. 履行：分析訂單產生分析（與舊路由相同）；伺服器預建的個人扣款訂單
 *    放行等付款的可接續任務。履行失敗即退點並把訂單標成 FAILED。
 */

export interface IPointPaymentAuthorization {
  authentication: Record<string, unknown>;
  challengeToken: string;
}

export interface IPayOrderWithPointsParams {
  userId: string;
  orderId: string;
  fido2Signature?: IPointPaymentAuthorization;
}

export interface IPayOrderWithPointsResult {
  orderId: string;
  reportId?: string;
  // Info: (20261015 - Luphia) 併發的另一個請求已經付掉這張單時為 true（本次未重複履行）
  alreadyPaid: boolean;
}

/**
 * Info: (20261015 - Luphia) 是否為 `ensurePersonalCreditCharge` 預建的個人扣款訂單。
 *
 * 新訂單帶 `chargeKind` 標記；標記加入前建立的訂單以形狀判斷：
 * 頂層有 `idempotencyKey`、沒有巢狀 `data`（分析訂單的參數一律在 `data` 底下）。
 */
export function isPersonalCreditChargeOrderData(orderData: unknown): boolean {
  if (!orderData || typeof orderData !== "object") return false;
  const data = orderData as Record<string, unknown>;
  if (data.chargeKind === PERSONAL_CREDIT_CHARGE_KIND) return true;
  return typeof data.idempotencyKey === "string" && data.data === undefined;
}

function isPointPayableOrder(order: Order): boolean {
  return (
    order.type === ORDER_TYPE.ANALYSIS &&
    order.unit === CURRENCY_UNIT.ICP &&
    order.amount < BigInt(0)
  );
}

/**
 * Info: (20261015 - Luphia) 付款授權。
 *
 * 託管帳號（第三方登入）沒有 passkey，原本就由伺服器以託管金鑰代簽——
 * 簽章對它從來不是「本人確認」，而是伺服器替他按下去。鏈退役後那一步沒有東西可簽，
 * 直接扣，體感與原本相同。
 *
 * passkey 帳號的承諾不變：扣除需經帳戶憑證簽章確認（條款 §3.3）。challengeToken
 * 綁定用途（USER_ACTION）與對象（本人），一枚 token 不能拿去授權別的用途或別人的單。
 */
async function assertPaymentAuthorized(
  userId: string,
  fido2Signature: IPointPaymentAuthorization | undefined,
): Promise<void> {
  const custody = await resolveCustodyType(userId);
  if (custody === WalletCustodyType.CUSTODIAL) return;

  if (!fido2Signature) {
    throw new AppError(API_ERRORS.VL_MISSING_FIDO2);
  }

  const user = await webAuthnRepo.findUserById(userId);
  if (!user) throw new AppError(API_ERRORS.NF_USER);

  let verified = false;
  try {
    const expectedChallenge = await verifyChallengeToken(
      fido2Signature.challengeToken,
      ChallengePurpose.USER_ACTION,
      userId,
    );
    verified = await webAuthnService.verifySignature(
      user.address,
      fido2Signature.authentication as unknown as AuthenticationJSON,
      expectedChallenge,
    );
  } catch (error) {
    logger.warn("point payment authorization rejected", {
      userId,
      message: error instanceof Error ? error.message : String(error),
    });
    verified = false;
  }
  if (!verified) throw new AppError(API_ERRORS.UN_ERROR);
}

/**
 * Info: (20261015 - Luphia) 退回一張訂單已扣的點數；退不成時把欠款寫在訂單上。
 * `data.refundedAt` 是復原指令判斷「這張退過款」的依據，必須與帳本一致。
 */
async function refundOrderDebit(
  order: Order,
  reason: string,
): Promise<{ refunded: boolean; data: Record<string, unknown> }> {
  const data = (order.data ?? {}) as Record<string, unknown>;
  try {
    const refund = await refundPointsForOrder({
      userId: order.userId,
      orderId: order.id,
      amount: -order.amount,
      note: reason,
    });
    if (
      refund.outcome === POINT_LEDGER_OUTCOME.OK ||
      refund.outcome === POINT_LEDGER_OUTCOME.DUPLICATE
    ) {
      return {
        refunded: true,
        data: { ...data, refundedAt: new Date().toISOString() },
      };
    }
    logger.error("point payment refund rejected", {
      orderId: order.id,
      outcome: refund.outcome,
    });
  } catch (error) {
    logger.error("point payment refund failed", {
      orderId: order.id,
      message: error instanceof Error ? error.message : String(error),
    });
  }
  return { refunded: false, data: { ...data, refundOwed: true } };
}

export async function payOrderWithPoints(
  params: IPayOrderWithPointsParams,
): Promise<IPayOrderWithPointsResult> {
  const { userId, orderId, fido2Signature } = params;

  // Info: (20261015 - Luphia) 1. 本人的、PENDING 的訂單（不符即丟 AppError）
  const order = await getPendingOrder(orderId, userId);
  if (!isPointPayableOrder(order)) {
    throw new AppError(API_ERRORS.VA_INVALID_ORDER_TYPE);
  }

  // Info: (20261015 - Luphia) 2. 授權
  await assertPaymentAuthorized(userId, fido2Signature);

  // Info: (20261015 - Luphia) 3. 扣點（冪等：同一張單重送只扣一次）
  const debit = await debitPointsForOrder({
    userId,
    orderId,
    cost: -order.amount,
  });
  if (debit.outcome === POINT_LEDGER_OUTCOME.INSUFFICIENT) {
    throw new AppError(API_ERRORS.TW_PERSONAL_POINTS_INSUFFICIENT);
  }
  if (debit.outcome === POINT_LEDGER_OUTCOME.USER_NOT_FOUND) {
    throw new AppError(API_ERRORS.NF_USER);
  }

  // Info: (20261015 - Luphia) 4. 只有搶到 PENDING → PAID 的請求往下履行
  const won = await paymentRepo.markPendingOrderPaid(
    orderId,
    POINT_PAYMENT_SIGNATURE,
  );
  if (!won) {
    const current = await paymentRepo.getOrderById(orderId);
    if (
      current &&
      isPostPaymentOrderStatus(current.status) &&
      current.signature === POINT_PAYMENT_SIGNATURE
    ) {
      // Info: (20261015 - Luphia) 同一張單的另一個請求先付掉了：扣點是同一筆，不再履行一次
      return { orderId, alreadyPaid: true };
    }
    /**
     * Info: (20261015 - Luphia) 扣點之後訂單離開了 PENDING，而不是被這條路付掉的
     * （逾時取消、或被團隊額度付掉）。這次扣的點數沒有對價，退回去。
     */
    await refundOrderDebit(
      current ?? order,
      "order left PENDING during payment",
    );
    throw new AppError(API_ERRORS.VL_INVALID_ORDER_STATUS);
  }

  // Info: (20261015 - Luphia) 5. 履行；失敗即退點、訂單標 FAILED（與團隊額度路徑一致）
  let reportId: string | undefined;
  try {
    if (!isPersonalCreditChargeOrderData(order.data)) {
      const fulfilled = await fulfillPaidAnalysisOrder(
        userId,
        orderId,
        order.data,
      );
      reportId = fulfilled.reportId;
    }
  } catch (fulfillError) {
    const { data } = await refundOrderDebit(
      order,
      "analysis fulfillment failed",
    );
    await paymentRepo.updateOrderStatus(
      orderId,
      ORDER_STATUS.FAILED,
      undefined,
      {
        data: {
          ...data,
          failureReason:
            fulfillError instanceof Error
              ? fulfillError.message
              : String(fulfillError),
        },
      },
    );
    throw fulfillError;
  }

  /**
   * Info: (20260828 - Julian) 付款到帳 → 釋放卡在「等付款」的可接續任務。
   *
   * Info: (20261015 - Luphia) 原本接在 TxTracker 確認鏈上收據、標 PAID 之後；
   * 鏈退役後付款當下就是 PAID，接線搬到這裡。整包 `order.data` 交下去
   *（review #6732 的 1-A），判斷在服務層。**不擋主流程**：錢已經收了、
   * 訂單已經是 PAID，這一步失敗時使用者回到頁面仍然可以自己按繼續。
   */
  try {
    await releasePaymentBlockedJobs({
      userId,
      orderData: order.data,
    });
  } catch (error) {
    logger.error("releasePaymentBlockedJobs failed after point payment", {
      orderId,
      message: error instanceof Error ? error.message : String(error),
    });
  }

  return { orderId, reportId, alreadyPaid: false };
}

/**
 * Info: (20261015 - Luphia) 逾時取消一張 PENDING 訂單後，退回它可能已扣的點數。
 *
 * 扣點與標 PAID 是兩步：中間程序被中斷，訂單會停在 PENDING 而點數已經扣了。
 * 前端每次付款都會建新單，這張單永遠不會再有人來付——TxTracker 逾時取消它的時候，
 * 那筆扣點就是無對價的。這裡把它退回去（冪等鍵 `orderRefund`）。
 *
 * 必須在訂單**已經取消之後**呼叫（見 order.tracker.service 的順序說明）。
 * 回傳 false 代表「有扣點但退不成」，呼叫端要留下可追的紀錄。
 */
export async function releaseDebitOfCancelledOrder(
  order: Order,
): Promise<boolean> {
  const debit = await pointLedgerRepo.findByIdempotencyKey(
    POINT_LEDGER_KEY.orderDebit(order.id),
  );
  if (!debit) return true;

  try {
    const refund = await refundPointsForOrder({
      userId: debit.userId,
      orderId: order.id,
      amount: -debit.amount,
      note: "pending order cancelled after debit",
    });
    return (
      refund.outcome === POINT_LEDGER_OUTCOME.OK ||
      refund.outcome === POINT_LEDGER_OUTCOME.DUPLICATE
    );
  } catch (error) {
    logger.error("failed to refund debit of a stale pending order", {
      orderId: order.id,
      message: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}
