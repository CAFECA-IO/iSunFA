import { createHash } from "crypto";
import { CURRENCY_UNIT } from "@/constants/price";
import { ORDER_STATUS, ORDER_TYPE } from "@/constants/status";
import { POINT_LEDGER_OUTCOME } from "@/constants/point_ledger";
import {
  PERSONAL_CREDIT_CHARGE_KIND,
  isPostPaymentOrderStatus,
} from "@/constants/point_payment";
import { paymentRepo } from "@/repositories/payment.repo";
import { API_ERRORS, ApiError, IErrorDef } from "@/lib/utils/error_dictionary";
import type { IJSONObject } from "@/validators/common";
import { logger } from "@/lib/utils/logger";
import { refundPointsForOrder } from "@/services/point_ledger.service";

/**
 * Info: (20260813 - Luphia) 個人點數扣款（設計書 §5.5「無帳本會話」，產品拍板 20260813）。
 *
 * 扣款必須有持有人的確認（條款 §3.3），因此**無法**在同一次 HTTP 請求內同步完成。
 * 這裡的做法是把它變成一個兩段流程：
 *
 * 1. 伺服器以冪等鍵建立（或找回）一張待付訂單，回 402 帶 orderId；
 * 2. 前端以既有的 `useOrderTransaction` 完成付款——**託管帳號直接扣**；
 *    passkey 帳號提示裝置簽章一次；
 * 3. 用戶重送同一則訊息（clientMessageId 不變 → 冪等鍵不變），此時訂單已付款，
 *    工作即放行執行。
 *
 * 刻意**先收款再服務**：反過來做等於允許賴帳。
 *
 * Info: (20261015 - Luphia) 區塊鏈退役：個人點數改為 DB 帳本，第 2 步改走
 * `POST /order/[id]/point_payment`（point_payment.service），不再上鏈。
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
  /**
   * Info: (20260831 - Julian) 這筆消費綁在哪個資源上（碳盤查是聊天室 channel），
   * 寫進 `Order.data.resourceKey`（review #6732 的 1-A）。
   *
   * 存在的理由是**付款與任務的關聯在付款完成時已經不在手上了**：
   * `TxTracker` 看到的是一張轉 `PAID` 的訂單，而「這筆錢是為哪一份匯入付的」
   * 只有建單當下知道。沒有它，釋放只能以 `userId` 為條件 ——
   * 於是一位使用者身上每一筆等付款的任務，都會在他任何一次付款成功時
   * 一起被翻成「可以繼續」，而其中只有一筆是真的付過的。
   *
   * 選填：不是每一種個人付款都對應一個可接續任務（例如單則對話）。
   * 缺席時釋放端**什麼都不翻**（fail-closed），不會退回「翻全部」。
   */
  resourceKey?: string | null;
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
  const { userId, credits, idempotencyKey, category, resourceKey } = params;

  if (!Number.isInteger(credits) || credits <= 0) {
    throw toApiError(API_ERRORS.TW_INVALID_SPEND_AMOUNT);
  }

  const existing = await paymentRepo.findOrderByIdempotencyKey(
    userId,
    idempotencyKey,
  );
  if (existing) {
    return {
      /**
       * Info: (20261015 - Luphia) 「已付」= 任何付款後狀態，而不只是 COMPLETED。
       * 付款的結果是 PAID，而這裡原本只認 COMPLETED——使用者付完錢、重送同一則訊息，
       * 拿到的仍然是「請付款」。判準與付款端同源（`isPostPaymentOrderStatus`）。
       */
      paid: isPostPaymentOrderStatus(existing.status),
      orderId: existing.id,
      // Info: (20260813 - Luphia) 訂單金額為負數（消費），對外一律回正數
      cost: Number(-existing.amount),
    };
  }

  const orderData = {
    // Info: (20261015 - Luphia) 標記為個人扣款訂單：付款後放行任務，而不是產生分析報告
    chargeKind: PERSONAL_CREDIT_CHARGE_KIND,
    category,
    idempotencyKey,
    amount: (-credits).toString(),
    timestamp: new Date().toISOString(),
    // Info: (20260831 - Julian) 缺席就不寫這個鍵，不要寫成空字串（見型別上的說明）
    ...(resourceKey ? { resourceKey } : {}),
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
 * 個人路徑刻意「先收款再服務」（見上），代價是工作失敗時錢已經扣掉了。
 * 沒有這支補償，逾時或模型錯誤就等於收了錢什麼都沒給——而碳盤查的匯入單章
 * 動輒 5 萬 tokens、結構圖單張推理近一分半，失敗不是理論值。
 *
 * 退款不需要用戶再簽一次。退回失敗不丟錯——此時原始的工作錯誤對用戶更重要——
 * 但會在訂單上留下 `refundOwed` 與 log，讓它成為一筆**看得見的欠款**而不是靜靜消失。
 *
 * Info: (20261015 - Luphia) 退款改為個人點數帳本的 REFUND 分錄（區塊鏈退役，原本是鑄回）。
 * 鍵為 `orderRefund(orderId)`，與復原指令共用：同一張訂單無論重試幾次都只退一次。
 * `data.refundedAt` 照舊蓋上——復原指令以它判斷這張訂單退過款。
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
  if (!order || !isPostPaymentOrderStatus(order.status)) {
    return { refunded: false, owed: false };
  }

  const data = (order.data ?? {}) as IJSONObject & {
    refundedAt?: string;
    refundOwed?: boolean;
  };
  // Info: (20260814 - Luphia) 同一張訂單只退一次：重試會再次走到這裡
  if (data.refundedAt) return { refunded: true, owed: false };

  const credits = -order.amount;
  if (credits <= BigInt(0)) {
    return { refunded: false, owed: false };
  }

  let failure: string | null = null;
  try {
    const refund = await refundPointsForOrder({
      userId,
      orderId: order.id,
      amount: credits,
      note: "personal credit charge refund",
    });
    if (
      refund.outcome !== POINT_LEDGER_OUTCOME.OK &&
      refund.outcome !== POINT_LEDGER_OUTCOME.DUPLICATE
    ) {
      failure = `refund ${refund.outcome}`;
    }
  } catch (error) {
    failure = error instanceof Error ? error.message : String(error);
  }

  if (failure) {
    logger.error("personal credit refund owed: ledger refund failed", {
      orderId: order.id,
      userId,
      message: failure,
    });
    await paymentRepo.updateOrderData(order.id, {
      ...data,
      refundOwed: true,
      refundError: failure,
    });
    return { refunded: false, owed: true };
  }

  await paymentRepo.updateOrderData(order.id, {
    ...data,
    refundedAt: new Date().toISOString(),
    refundOwed: false,
  });
  logger.info("personal credit refunded", {
    orderId: order.id,
    credits: credits.toString(),
  });
  return { refunded: true, owed: false };
}
