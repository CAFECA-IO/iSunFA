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
import { orderIssueService } from "@/services/order.issue.service";
import { Prisma } from "@/generated";

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
    type: ORDER_TYPE.ANALYSIS,
    amount: -cost,
    unit: CURRENCY_UNIT.ICP,
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

  if (
    order.status !== ORDER_STATUS.FAILED &&
    order.status !== ORDER_STATUS.CANCEL
  ) {
    throw new AppError(API_ERRORS.VL_INVALID_ORDER_STATUS);
  }

  await orderRepo.updateStatus(orderId, ORDER_STATUS.PAID);
}

/**
 * Info: (20260625 - Julian) 批次重啟訂單
 * @param orderIds - 訂單 ID 陣列
 * @returns 成功和失敗的訂單數量以及錯誤訊息
 */
export async function batchReactivateOrders(orderIds: string[]) {
  const results = {
    successCount: 0,
    failCount: 0,
    errors: [] as { orderId: string; message: string }[],
  };

  for (const orderId of orderIds) {
    try {
      const order = await paymentRepo.getOrderById(orderId);
      if (!order) {
        throw new AppError(API_ERRORS.NF_ORDER);
      }

      if (
        order.status !== ORDER_STATUS.FAILED &&
        order.status !== ORDER_STATUS.CANCEL
      ) {
        throw new AppError(API_ERRORS.VL_INVALID_ORDER_STATUS);
      }

      await orderRepo.updateStatus(orderId, ORDER_STATUS.PAID);
      results.successCount++;
    } catch (e: unknown) {
      // Info: (20260625 - Julian) 紀錄失敗的訂單數量
      results.failCount++;
      // Info: (20260625 - Julian) 紀錄失敗的訂單錯誤訊息
      const errorMessage =
        e instanceof AppError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Unknown error";
      results.errors.push({
        orderId,
        message: errorMessage,
      });
    }
  }

  return results;
}

export interface IGetAdminCommissionOrdersParams {
  page: number;
  limit: number;
  search: string;
  type: string;
  orderStatus: string;
  executionStatus: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
}

/**
 * Info: (20260624 - Julian) 取得訂單分頁資料
 * @param params - 訂單分頁參數
 * @returns 訂單分頁資料
 */
export async function getAdminCommissionOrdersPaginated(
  params: IGetAdminCommissionOrdersParams,
) {
  const {
    page,
    limit,
    search,
    type,
    orderStatus,
    executionStatus,
    sortBy,
    sortOrder,
  } = params;

  const where: Prisma.OrderWhereInput = {
    amount: { lt: 0 },
  };

  // Info: (20260625 - Julian) 模糊搜尋訂單 ID、用戶名稱、錢包地址
  if (search) {
    where.OR = [
      { id: { contains: search, mode: "insensitive" } },
      {
        user: {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { address: { contains: search, mode: "insensitive" } },
          ],
        },
      },
    ];
  }

  // Info: (20260625 - Julian) type 須轉換為大寫，以比對 data.data.category 層
  if (type && type !== "ALL") {
    where.AND = [
      { data: { path: ["data", "category"], equals: type.toUpperCase() } },
    ];
  }

  // Info: (20260625 - Julian) 訂單狀態篩選
  if (orderStatus && orderStatus !== "ALL") {
    where.status = orderStatus;
  }

  // Info: (20260625 - Julian) 排序篩選
  const orderBy: Prisma.OrderOrderByWithRelationInput = {};
  const direction = sortOrder === "asc" ? "asc" : "desc";
  if (sortBy === "createdAt") {
    orderBy.createdAt = direction;
  } else if (sortBy === "amount") {
    orderBy.amount = direction;
  } else if (sortBy === "tokens") {
    orderBy.tokens = direction;
  } else if (sortBy === "status") {
    orderBy.status = direction;
  } else {
    orderBy.createdAt = "desc";
  }

  const isNonDbFilterActive =
    executionStatus !== "ALL" || sortBy === "executionConfidence";

  let totalElements = 0;
  let mappedOrders: unknown[] = [];

  if (!isNonDbFilterActive) {
    const skip = (page - 1) * limit;
    const [count, orders] = await Promise.all([
      orderRepo.count({ where }),
      orderRepo.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          user: true,
          paymentTransactions: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      }),
    ]);
    totalElements = count;
    mappedOrders =
      await orderIssueService.getExecutionStatusesForOrders(orders);
  } else {
    const allOrders = await orderRepo.findMany({
      where,
      orderBy,
      include: {
        user: true,
        paymentTransactions: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    const resolvedOrders =
      await orderIssueService.getExecutionStatusesForOrders(allOrders);

    let filteredOrders = resolvedOrders;

    if (executionStatus !== "ALL") {
      filteredOrders = filteredOrders.filter(
        (o) => o.executionStatus === executionStatus,
      );
    }

    if (sortBy === "executionConfidence") {
      filteredOrders.sort((a, b) => {
        const confA = a.executionConfidence;
        const confB = b.executionConfidence;
        if (confA === null && confB === null) return 0;
        if (confA === null) return 1;
        if (confB === null) return -1;
        return sortOrder === "asc" ? confA - confB : confB - confA;
      });
    }

    totalElements = filteredOrders.length;
    const skip = (page - 1) * limit;
    mappedOrders = filteredOrders.slice(skip, skip + limit);
  }

  return {
    data: mappedOrders,
    pagination: {
      page,
      limit,
      totalElements,
      totalPages: Math.ceil(totalElements / limit),
    },
  };
}
