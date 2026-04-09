import { paymentRepo } from "@/repositories/payment.repo";

export class OrderService {
  async getOrdersByUserId(userId: string, type?: string | null) {
    const orders = await paymentRepo.getOrdersByUserId(userId, type);

    return orders.map((o) => {
      // Info: (20260409 - Luphia) Access the latest payment transaction to get fiat swipe status
      const tx = "paymentTransactions" in o ? (o as unknown as { paymentTransactions: Array<{ status: string; paymentMethod?: { data?: { card_info?: unknown } } }> }).paymentTransactions?.[0] : undefined;
      const pmData = tx?.paymentMethod?.data as Record<string, unknown> | undefined;

      return {
        id: o.id,
        createdAt: o.createdAt,
        amount: o.amount,
        status: tx ? tx.status : o.status, // Info: (20260409 - Luphia) Use payment transaction status if available
        type: o.type,
        cardInfo: pmData?.card_info || null, // Info: (20260409 - Luphia) Provide card_info if paid with credit card
      };
    });
  }
}

export const orderService = new OrderService();
