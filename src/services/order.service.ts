import { createHash } from "crypto";
import { paymentRepo } from "@/repositories/payment.repo";
import { generateReceiptItems } from "@/lib/utils/payment_helpers";
import { analysisRepo } from "@/repositories/analysis.repo";
import {
  getAnalysisCost,
  IAnalysisParams,
  IOrderParams,
} from "@/lib/analysis/pricing";
import { AppError } from "@/lib/utils/error";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { accountBookRepo } from "@/repositories/account_book.repo";
import { orderRepo } from "@/repositories/order.repo";
import { ORDER_STATUS, ORDER_TYPE } from "@/constants/status";
import {
  ANALYSIS_CATEGORY,
  CURRENCY_UNIT,
  CurrencyUnit,
} from "@/constants/price";
import { IJSONObject } from "@/validators/common";

export async function getOrdersByUserId(userId: string, type?: string | null) {
  const orders = await paymentRepo.getOrdersByUserId(userId, type);

  return orders.map((o) => {
    // Info: (20260409 - Luphia) Access the latest payment transaction to get fiat swipe status
    const tx = o.paymentTransactions?.[0];
    const pmData = tx?.paymentMethod?.data as
      | Record<string, unknown>
      | undefined;
    const orderData = (o.data as Record<string, unknown>) || {};

    const userItems =
      orderData.items ||
      generateReceiptItems(o.amount, orderData as Record<string, unknown>);

    return {
      id: o.id,
      createdAt: o.createdAt,
      amount: o.amount,
      status: tx ? tx.status : o.status, // Info: (20260409 - Luphia) Use payment transaction status if available
      type: o.type,
      cardInfo: pmData?.card_info || null, // Info: (20260409 - Luphia) Provide card_info if paid with credit card
      buyerName:
        typeof pmData?.buyerName === "string" ? pmData.buyerName : undefined,
      buyerTaxId: typeof pmData?.taxId === "string" ? pmData.taxId : undefined,
      buyerAddress:
        typeof pmData?.billingAddress === "string"
          ? pmData.billingAddress
          : undefined,
      items: userItems,
    };
  });
}

export interface IOrderResult {
  orderId: string;
  challenge: string;
  cost: number;
}

export interface IPaymentOrderParams {
  amount: number;
  unit: CurrencyUnit;
  credits: number;
  paymentMethodId: string;
}

export async function generateAnalysisOrder(
  userId: string,
  params: IOrderParams,
): Promise<IOrderResult> {
  const analysisData = params.data as IAnalysisParams;

  // Info: (20260320 - Tzuhan) Prerequisite check: Net Zero Emissions requires Carbon Health Check
  if (analysisData.category === ANALYSIS_CATEGORY.NET_ZERO_EMISSIONS) {
    if (!analysisData.keyword) {
      throw new AppError(API_ERRORS.VL_MISSING_COMPANY_INFO);
    }
    const prerequisite = await analysisRepo.findAnalysisByKeywordAndType(
      userId,
      ANALYSIS_CATEGORY.CARBON_HEALTH_CHECK,
      analysisData.keyword,
    );
    if (!prerequisite) {
      throw new AppError(API_ERRORS.VL_PREREQUISITE_FAILED);
    }

    const latestNetZero = await analysisRepo.findAnalysisByKeywordAndType(
      userId,
      ANALYSIS_CATEGORY.NET_ZERO_EMISSIONS,
      analysisData.keyword,
    );

    if (
      latestNetZero &&
      prerequisite.createdAt.getTime() <= latestNetZero.createdAt.getTime()
    ) {
      throw new AppError(API_ERRORS.VL_EXPIRED_DATA);
    }
  }

  // Info: (20260416 - Tzuhan) Prevent generation of internal orders if there is no internal ESG/financial data
  const INTERNAL_CATEGORIES = [
    "carbon_health_check",
    "balance_sheet",
    "cash_flow",
    "income_statement",
    "financial_compliance",
    "financial_health",
    "irsc",
  ];

  if (
    !analysisData.isExternal &&
    INTERNAL_CATEGORIES.includes(analysisData.category)
  ) {
    if (analysisData.keyword) {
      const match = analysisData.keyword.match(/\((.*?)\)/);
      const taxId = match ? match[1] : analysisData.keyword;

      const hasData = await accountBookRepo.hasAssociatedEsgData(userId, taxId);

      if (!hasData) {
        throw new AppError(API_ERRORS.VL_NO_ESG_DATA);
      }
    } else {
      throw new AppError(API_ERRORS.VL_MISSING_COMPANY_INFO);
    }
  }

  const cost = getAnalysisCost(params.data);

  const orderData = {
    ...params,
    amount: (-cost).toString(),
    timestamp: new Date().toISOString(),
  };

  // Info: (20260128 - Luphia) Create challenge from hashed JSON data
  const jsonString = JSON.stringify(orderData);
  const hash = createHash("sha256").update(jsonString);
  const challenge = hash
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  // Info: (20260128 - Luphia) Create PENDING order
  const order = await paymentRepo.createOrder({
    userId,
    type: "ANALYSIS",
    amount: -cost,
    unit: "ICP",
    // Info: (20260128 - Luphia) Store the full data object including timestamp
    data: JSON.parse(jsonString) as IJSONObject,
    status: ORDER_STATUS.PENDING,
    challenge: challenge,
  });

  return {
    orderId: order.id,
    challenge: challenge,
    cost,
  };
}

// Info: (20260305 - Tzuhan) Generate an order for points purchase and return the challenge string to be signed.
export async function generatePaymentOrder(
  userId: string,
  params: IPaymentOrderParams,
): Promise<IOrderResult> {
  const orderData = {
    ...params,
    amount: params.amount.toString(),
    timestamp: new Date().toISOString(),
  };

  // Info: (20260305 - Tzuhan) Create challenge from hashed JSON data
  const jsonString = JSON.stringify(orderData);
  const hash = createHash("sha256").update(jsonString);
  const challenge = hash
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  // Info: (20260305 - Tzuhan) Create PENDING order
  const order = await paymentRepo.createOrder({
    userId,
    type: ORDER_TYPE.OEN_PAYMENT,
    amount: params.amount,
    unit: CURRENCY_UNIT.TWD,
    data: orderData,
    status: ORDER_STATUS.PENDING,
    challenge: challenge,
  });

  return {
    orderId: order.id,
    challenge: challenge,
    cost: params.amount,
  };
}

/**
 * Info: (20260128 - Luphia)
 * Verify that the order exists, belongs to the user, and matches the signature.
 * Note: The actual signature verification (crypto) happens in WebAuthnService.
 * This method verifies the business logic (order status, ownership).
 */
export async function getPendingOrder(orderId: string, userId: string) {
  const order = await paymentRepo.getOrderById(orderId);

  if (!order) {
    throw new AppError(API_ERRORS.NF_ORDER);
  }

  if (order.userId !== userId) {
    throw new AppError(API_ERRORS.AUTH_PERMISSION_DENIED);
  }

  if (order.status !== ORDER_STATUS.PENDING) {
    throw new AppError(API_ERRORS.VL_INVALID_ORDER_STATUS);
  }

  return order;
}

export async function markOrderPaying(
  orderId: string,
  signature: string,
  transactionHash?: string,
) {
  await paymentRepo.setOrderPaying(orderId, signature, transactionHash);
}

export async function completeOrder(
  orderId: string,
  signature: string,
  transactionHash?: string,
) {
  await paymentRepo.completeOrderWithReceipt(
    orderId,
    signature,
    transactionHash,
  );
}

export async function failOrder(orderId: string, reason: string) {
  await paymentRepo.failOrder(orderId, reason);
}

export async function retryFailedOrder(orderId: string) {
  const order = await paymentRepo.getOrderById(orderId);
  if (!order) {
    throw new AppError(API_ERRORS.NF_ORDER);
  }

  if (order.status !== ORDER_STATUS.FAILED) {
    throw new AppError(API_ERRORS.VL_INVALID_ORDER_STATUS);
  }

  await orderRepo.updateStatus(orderId, ORDER_STATUS.PAID);
}
