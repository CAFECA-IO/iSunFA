import { paymentRepo } from "@/repositories/payment.repo";

export class OrderService {
  async getOrdersByUserId(userId: string, type?: string | null) {
    // Info: (20260409 - Luphia) Any business logic or data transformation can run here
    return paymentRepo.getOrdersByUserId(userId, type);
  }
}

export const orderService = new OrderService();
