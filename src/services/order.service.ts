import { createHash } from "crypto";
import { paymentRepo } from "@/repositories/payment.repo";
import { generateReceiptItems } from "@/lib/utils/payment_helpers";
import { analysisRepo } from "@/repositories/analysis.repo";
import { getAnalysisCost, IAnalysisParams, IOrderParams } from "@/lib/analysis/pricing";
import { ApiCode } from "@/lib/utils/status";
import { AppError } from "@/lib/utils/error";
import { Prisma } from "@/generated/client";
import { accountBookRepo } from "@/repositories/account_book.repo";
import { ORDER_STATUS, ORDER_TYPE } from "@/constants/status";
import { ANALYSIS_CATEGORIES, CURRENCY_UNIT, CurrencyUnit } from "@/constants/price";

export async function getOrdersByUserId(userId: string, type?: string | null) {
  const orders = await paymentRepo.getOrdersByUserId(userId, type);

  return orders.map((o) => {
    // Info: (20260409 - Luphia) Access the latest payment transaction to get fiat swipe status
    const tx =
      "paymentTransactions" in o
        ? (
          o as unknown as {
            paymentTransactions: Array<{
              status: string;
              paymentMethod?: { data?: { card_info?: unknown } };
            }>;
          }
        ).paymentTransactions?.[0]
        : undefined;
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
      buyerTaxId:
        typeof pmData?.taxId === "string" ? pmData.taxId : undefined,
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
  if (analysisData.category === ANALYSIS_CATEGORIES.NET_ZERO_EMISSIONS) {
    if (!analysisData.keyword) {
      throw new AppError(
        ApiCode.VALIDATION_ERROR,
        "Missing company info (keyword) for net_zero_emissions",
      );
    }
    const prerequisite = await analysisRepo.findAnalysisByKeywordAndType(
      userId,
      ANALYSIS_CATEGORIES.CARBON_HEALTH_CHECK,
      analysisData.keyword,
    );
    if (!prerequisite) {
      throw new AppError(
        ApiCode.VALIDATION_ERROR,
        "必須先完成該企業的「企業碳健檢（Carbon Health Check）」分析，才能產出「淨零碳排（Net Zero Emissions）」報告。",
      );
    }

    const latestNetZero = await analysisRepo.findAnalysisByKeywordAndType(
      userId,
      ANALYSIS_CATEGORIES.NET_ZERO_EMISSIONS,
      analysisData.keyword,
    );

    if (
      latestNetZero &&
      prerequisite.createdAt.getTime() <= latestNetZero.createdAt.getTime()
    ) {
      throw new AppError(
        ApiCode.VALIDATION_ERROR,
        "您的企業碳健檢資料已過期！請先針對該企業「重新生成一份最新的碳健檢報告」，再產出淨零碳排報告。",
      );
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

  if (!analysisData.isExternal && INTERNAL_CATEGORIES.includes(analysisData.category)) {
    if (analysisData.keyword) {
      const match = analysisData.keyword.match(/\((.*?)\)/);
      const taxId = match ? match[1] : analysisData.keyword;

      const hasData = await accountBookRepo.hasAssociatedEsgData(userId, taxId);

      if (!hasData) {
        throw new AppError(
          ApiCode.VALIDATION_ERROR,
          "該企業尚未建立 ESG 或財務數據紀錄。請先上傳相關資料，或是改為申請「外部分析報告」。",
        );
      }
    } else {
      throw new AppError(
        ApiCode.VALIDATION_ERROR,
        "內部分析報告需要提供有效之企業資訊 (統編)。",
      );
    }
  }

  const cost = getAnalysisCost(params.data);

  const orderData = {
    ...params,
    amount: -cost,
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
    data: orderData as unknown as Prisma.InputJsonObject,
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
    throw new AppError(ApiCode.NOT_FOUND, "Order not found");
  }

  if (order.userId !== userId) {
    throw new AppError(ApiCode.FORBIDDEN, "Order does not belong to user");
  }

  if (order.status !== ORDER_STATUS.PENDING) {
    throw new AppError(ApiCode.VALIDATION_ERROR, "Order is not pending");
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
