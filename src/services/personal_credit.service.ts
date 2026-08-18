import { createHash } from "crypto";
import { CURRENCY_UNIT } from "@/constants/price";
import { ORDER_STATUS, ORDER_TYPE } from "@/constants/status";
import { paymentRepo } from "@/repositories/payment.repo";
import { API_ERRORS, ApiError, IErrorDef } from "@/lib/utils/error_dictionary";
import type { IJSONObject } from "@/validators/common";
import { logger } from "@/lib/utils/logger";
import { webAuthnRepo } from "@/repositories/webauthn.repo";
import { issuePurchasedPointsToMember } from "@/services/member.service";

/**
 * Info: (20260813 - Luphia) 個人點數扣款（設計書 §5.5「無帳本會話」，產品拍板 20260813）。
 *
 * 個人點數只存在鏈上（設計書 §2 事實 2），扣款必須有 WebAuthn 簽章，
 * 因此**無法**在同一次 HTTP 請求內同步完成。這裡的做法是把它變成一個兩段流程：
 *
 * 1. 伺服器以冪等鍵建立（或找回）一張待付訂單，回 402 帶 orderId；
 * 2. 前端以既有的 `useOrderTransaction` 完成付款——**託管帳號由伺服器代簽**，
 *    體感就是直接扣；passkey 帳號提示裝置簽章一次；
 * 3. 用戶重送同一則訊息（clientMessageId 不變 → 冪等鍵不變），此時訂單已 COMPLETED，
 *    工作即放行執行。
 *
 * 刻意**先收款再服務**：反過來做等於允許賴帳，而鏈上扣不到就沒有任何強制力。
 */

export class PersonalPaymentRequiredError extends ApiError {
  public data: { orderId: string; cost: number };

  constructor(def: IErrorDef, data: { orderId: string; cost: number }) {
    super(def.code, def.message, def.status);
    this.name = "PersonalPaymentRequiredError";
    this.data = data;
  }
}

export interface IPersonalChargeParams {
  userId: string;
  // Info: (20260813 - Luphia) 應扣點數（正整數）
  credits: number;
  idempotencyKey: string;
  // Info: (20260813 - Luphia) 消費分類，寫入 data.category 供點數歷程顯示
  category: string;
}

export interface IPersonalChargeResult {
  paid: boolean;
  orderId: string;
  cost: number;
}

function toApiError(def: IErrorDef): ApiError {
  return new ApiError(def.code, def.message, def.status);
}

/**
 * Info: (20260813 - Luphia) 確保這筆消費已由個人點數付訖；未付訖則回傳待付訂單。
 *
 * 以冪等鍵找回既有訂單而非每次新建：使用者重送同一則訊息時，
 * 若每次都建一張新的待付訂單，畫面上會堆出一串幽靈訂單，而他只想付一次。
 */
export async function ensurePersonalCreditCharge(
  params: IPersonalChargeParams,
): Promise<IPersonalChargeResult> {
  const { userId, credits, idempotencyKey, category } = params;

  if (!Number.isInteger(credits) || credits <= 0) {
    throw toApiError(API_ERRORS.TW_INVALID_SPEND_AMOUNT);
  }

  const existing = await paymentRepo.findOrderByIdempotencyKey(
    userId,
    idempotencyKey,
  );
  if (existing) {
    return {
      paid: existing.status === ORDER_STATUS.COMPLETED,
      orderId: existing.id,
      // Info: (20260813 - Luphia) 訂單金額為負數（消費），對外一律回正數
      cost: Number(-existing.amount),
    };
  }

  const orderData = {
    category,
    idempotencyKey,
    amount: (-credits).toString(),
    timestamp: new Date().toISOString(),
  };

  /**
   * Info: (20260813 - Luphia) challenge 為訂單內容的雜湊，與既有分析訂單同一套作法：
   * 簽的是「這張訂單」，而不是任何呼叫端指定的字串。
   */
  const jsonString = JSON.stringify(orderData);
  const challenge = createHash("sha256")
    .update(jsonString)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const order = await paymentRepo.createOrder({
    userId,
    type: ORDER_TYPE.ANALYSIS,
    amount: -credits,
    unit: CURRENCY_UNIT.ICP,
    data: JSON.parse(jsonString) as IJSONObject,
    status: ORDER_STATUS.PENDING,
    challenge,
  });

  return { paid: false, orderId: order.id, cost: credits };
}

/**
 * Info: (20260814 - Luphia) 工作失敗時退還已扣的個人點數。
 *
 * 個人路徑刻意「先收款再服務」（見上），代價是工作失敗時錢已經在鏈上扣掉了。
 * 沒有這支補償，逾時或模型錯誤就等於收了錢什麼都沒給——而碳盤查的匯入單章
 * 動輒 5 萬 tokens、結構圖單張推理近一分半，失敗不是理論值。
 *
 * 退款是伺服器代簽的鑄回（與購點發放同一條路），不需要用戶再簽一次。
 * 鑄回失敗不丟錯——此時原始的工作錯誤對用戶更重要——但會在訂單上留下
 * `refundOwed` 與 log，讓它成為一筆**看得見的欠款**而不是靜靜消失。
 */
export async function refundPersonalCreditCharge(params: {
  userId: string;
  idempotencyKey: string;
}): Promise<{ refunded: boolean; owed: boolean }> {
  const { userId, idempotencyKey } = params;

  const order = await paymentRepo.findOrderByIdempotencyKey(
    userId,
    idempotencyKey,
  );
  // Info: (20260814 - Luphia) 沒付成的訂單本來就沒扣到錢，不需要退
  if (!order || order.status !== ORDER_STATUS.COMPLETED) {
    return { refunded: false, owed: false };
  }

  const data = (order.data ?? {}) as IJSONObject & {
    refundedAt?: string;
    refundOwed?: boolean;
  };
  // Info: (20260814 - Luphia) 同一張訂單只退一次：重試會再次走到這裡
  if (data.refundedAt) return { refunded: true, owed: false };

  const credits = Number(-order.amount);
  if (!Number.isFinite(credits) || credits <= 0) {
    return { refunded: false, owed: false };
  }

  const user = await webAuthnRepo.findUserById(userId);
  if (!user?.address) {
    logger.error("personal credit refund owed: user address missing", {
      orderId: order.id,
      userId,
    });
    await paymentRepo.updateOrderData(order.id, {
      ...data,
      refundOwed: true,
      refundError: "user address missing",
    });
    return { refunded: false, owed: true };
  }

  const mint = await issuePurchasedPointsToMember(user.address, credits);
  if (!mint.success) {
    logger.error("personal credit refund owed: mint failed", {
      orderId: order.id,
      userId,
      message: mint.message,
    });
    await paymentRepo.updateOrderData(order.id, {
      ...data,
      refundOwed: true,
      refundError: mint.message ?? "mint failed",
    });
    return { refunded: false, owed: true };
  }

  await paymentRepo.updateOrderData(order.id, {
    ...data,
    refundedAt: new Date().toISOString(),
    refundOwed: false,
  });
  logger.info("personal credit refunded", { orderId: order.id, credits });
  return { refunded: true, owed: false };
}
