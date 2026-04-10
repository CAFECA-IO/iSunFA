import { paymentRepo } from "@/repositories/payment.repo";

export class OrderService {
  async getOrdersByUserId(userId: string, type?: string | null) {
    const orders = await paymentRepo.getOrdersByUserId(userId, type);

    return orders.map((o) => {
      // Info: (20260409 - Luphia) Access the latest payment transaction to get fiat swipe status
      const tx = "paymentTransactions" in o ? (o as unknown as { paymentTransactions: Array<{ status: string; paymentMethod?: { data?: { card_info?: unknown } } }> }).paymentTransactions?.[0] : undefined;
      const pmData = tx?.paymentMethod?.data as Record<string, unknown> | undefined;
      const orderData = (o.data as Record<string, unknown>) || {};

      let itemsFallback: { name: string; quantity: number | string; unitPrice: number | string; amount: number | string; remark: string }[] = [];
      if (orderData.planId) {
        itemsFallback = [{
          name: (orderData.title as string) || '會員訂閱',
          quantity: 1,
          unitPrice: o.amount,
          amount: o.amount,
          remark: orderData.billingInterval === 'year' ? '購買會員資格 (年繳)' : '購買會員資格'
        }];
      } else {
        let base = Number(orderData.baseCredits || orderData.credits || o.amount);
        let bonus = Number(orderData.bonusCredits || 0);

        if (!orderData.bonusCredits && orderData.credits && Number(orderData.credits) > Number(o.amount)) {
          base = Number(o.amount);
          bonus = Number(orderData.credits) - Number(o.amount);
        }

        itemsFallback.push({
          name: `iSunFA ${base} 點`,
          quantity: 1,
          unitPrice: o.amount,
          amount: o.amount,
          remark: `購買 ${base} 點`
        });

        if (bonus > 0) {
          itemsFallback.push({
            name: `iSunFA ${bonus} 點（贈品）`,
            quantity: 1,
            unitPrice: 0,
            amount: 0,
            remark: `贈送 ${bonus} 點`
          });
        }
      }

      return {
        id: o.id,
        createdAt: o.createdAt,
        amount: o.amount,
        status: tx ? tx.status : o.status, // Info: (20260409 - Luphia) Use payment transaction status if available
        type: o.type,
        cardInfo: pmData?.card_info || null, // Info: (20260409 - Luphia) Provide card_info if paid with credit card
        buyerName: typeof pmData?.buyerName === 'string' ? pmData.buyerName : undefined,
        buyerTaxId: typeof pmData?.taxId === 'string' ? pmData.taxId : undefined,
        buyerAddress: typeof pmData?.billingAddress === 'string' ? pmData.billingAddress : undefined,
        items: orderData.items || itemsFallback,
      };
    });
  }
}

export const orderService = new OrderService();
