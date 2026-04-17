import { paymentRepo } from "@/repositories/payment.repo";

export class AdminBillingService {
  async getGlobalBillingStats(
    startDateStr?: string | null,
    endDateStr?: string | null,
    tab: "orders" | "points" | "credit_cards" = "orders",
    page: number = 1,
    limit: number = 20
  ) {
    const startDate = startDateStr ? new Date(startDateStr) : undefined;
    const endDate = endDateStr ? new Date(endDateStr) : undefined;

    // Info: (20260416 - Luphia) 1. Calculate Metrics globally (for the selected date range)
    const rewardTypes = ["CHECKIN_REWARD", "REGISTRATION_REWARD"];

    // Info: (20260416 - Luphia) Aggregate using Repository
    const totalRevenue = await paymentRepo.getGlobalRevenueTotal(startDate, endDate);
    const totalTransactingUsers = await paymentRepo.getGlobalTransactingUsersCount(startDate, endDate);
    const arpu = totalTransactingUsers > 0 ? Math.round(totalRevenue / totalTransactingUsers) : 0;

    // Info: (20260416 - Luphia) We need total points purchased to calculate burn ratio
    const totalPointsPurchased = await paymentRepo.getGlobalPointsPurchasedTotal(startDate, endDate);

    // Info: (20260416 - Luphia) Total Consumption
    const totalPointsConsumed = await paymentRepo.getGlobalPointsConsumedTotal(startDate, endDate);

    const burnToBuyRatio = totalPointsPurchased > 0
      ? Number((totalPointsConsumed / totalPointsPurchased).toFixed(2))
      : 0;

    // Info: (20260416 - Luphia) 2. Paginate Data for the requested Tab
    const offset = (page - 1) * limit;

    let totalElements = 0;
    let paginatedData: unknown[] = [];

    if (tab === "orders") {
      totalElements = await paymentRepo.countGlobalOrders(startDate, endDate);
      const orders = await paymentRepo.getGlobalOrdersPaginated(startDate, endDate, offset, limit);

      interface IExtendedOrderData {
        checkoutResponse?: {
          card_info?: {
            type_name?: string;
            last_four?: string;
          };
        };
        buyerName?: string;
        taxId?: string;
        billingAddress?: string;
      }

      paginatedData = orders.map(order => ({
        id: order.id,
        createdAt: order.createdAt,
        type: order.type,
        amount: order.amount,
        status: order.status,
        user: {
          id: order.user?.id,
          name: order.user?.name,
          address: order.user?.address,
        },
        cardInfo: (order.data as IExtendedOrderData)?.checkoutResponse?.card_info || null,
        buyerName: (order.data as IExtendedOrderData)?.buyerName || order.user?.name,
        buyerTaxId: (order.data as IExtendedOrderData)?.taxId || null,
        buyerAddress: (order.data as IExtendedOrderData)?.billingAddress || null,
      }));
    } else if (tab === "points") {
      totalElements = await paymentRepo.countGlobalPointUsages(startDate, endDate);
      const orders = await paymentRepo.getGlobalPointUsagesPaginated(startDate, endDate, offset, limit);

      paginatedData = orders.map(order => {
        const sourceType = order.type;
        const amountChange = order.amount;
        let sourceKey = "";
        let isPositive = false;

        if (rewardTypes.includes(order.type)) {
          isPositive = true;
          sourceKey = order.type === "CHECKIN_REWARD" ? "billing.point_history.source_checkin" : "billing.point_history.source_registration";
        } else {
          // Info: (20260416 - Luphia) This is a consumption
          isPositive = false;
          sourceKey = `billing.point_history.source_${order.type.toLowerCase()}`;
        }

        return {
          id: order.id,
          createdAt: order.createdAt,
          sourceType,
          sourceKey,
          amount: amountChange,
          isPositive,
          user: {
            id: order.user?.id,
            name: order.user?.name,
            address: order.user?.address,
          }
        };
      });
    } else if (tab === "credit_cards") {
      totalElements = await paymentRepo.countGlobalPaymentTransactions(startDate, endDate);
      const txs = await paymentRepo.getGlobalPaymentTransactionsPaginated(startDate, endDate, offset, limit);

      paginatedData = txs.map(tx => {
        let purpose = "未知用途";
        if (tx.order?.type === "OEN_BINDING") {
          purpose = "綁定信用卡";
        } else if (tx.order?.type === "OEN_PAYMENT") {
          purpose = "購買點數";
        }

        let cardInfo = null;
        if (tx.rawData) {
          const raw = tx.rawData as { card_info?: unknown; data?: { card_info?: unknown } };
          if (raw.card_info) {
            cardInfo = raw.card_info;
          } else if (raw.data && raw.data.card_info) {
            cardInfo = raw.data.card_info;
          }
        }

        return {
          id: tx.id,
          createdAt: tx.createdAt,
          amount: tx.amount,
          status: tx.status,
          provider: tx.provider,
          purpose: purpose,
          errorMessage: tx.errorMessage,
          user: {
            id: tx.user?.id,
            name: tx.user?.name,
            address: tx.user?.address,
          },
          cardInfo: cardInfo
        };
      });
    }

    return {
      metrics: {
        totalRevenue,
        totalTransactingUsers,
        arpu,
        totalPointsPurchased,
        totalPointsConsumed,
        burnToBuyRatio,
      },
      pagination: {
        page,
        limit,
        totalElements,
        totalPages: Math.ceil(totalElements / limit),
      },
      data: paginatedData,
    };
  }
}

export const adminBillingService = new AdminBillingService();
