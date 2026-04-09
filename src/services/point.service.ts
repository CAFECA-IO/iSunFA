import { paymentRepo } from "@/repositories/payment.repo";
import { checkinRepo } from "@/repositories/checkin.repo";
import { REWARD_AMOUNTS } from "@/constants/price";

export class PointService {
  async getPointHistory(userId: string, userCreatedAt: Date) {
    const [orders, checkins] = await Promise.all([
      paymentRepo.getOrdersByUserId(userId),
      checkinRepo.getCheckinsByUserId(userId),
    ]);

    const history = [];

    for (const order of orders) {
      if (order.type === "PAYMENT") {
        const data = order.data as { credits?: number } | null | undefined;
        if (data && data.credits) {
          history.push({
            id: `order-${order.id}-credits`,
            type: "PURCHASE",
            sourceKey: "billing.point_history.source_purchase",
            fallbackSource: "Points Purchase",
            amount: data.credits,
            createdAt: order.createdAt,
          });
        }
      } else if (order.type !== "OEN_BINDING") {
        // Info: (20260409 - Luphia) ANALYSIS, CHAT etc (consumed points)
        if (order.amount !== 0) {
          history.push({
            id: `order-${order.id}-consume`,
            type: "CONSUME",
            sourceKey: `billing.point_history.source_${order.type.toLowerCase()}`,
            fallbackSource: `Service Usage (${order.type})`,
            amount: order.amount,
            createdAt: order.createdAt,
          });
        }
      }
    }

    for (const checkin of checkins) {
      history.push({
        id: `checkin-${checkin.id}`,
        type: "REWARD",
        sourceKey: "billing.point_history.source_checkin",
        fallbackSource: "Daily Check-in Reward",
        amount: REWARD_AMOUNTS.DAILY_CHECKIN_REWARD,
        createdAt: checkin.createdAt,
      });
    }

    // Info: (20260409 - Luphia) Add Registration Reward by inferring User creation 
    history.push({
      id: `registration-${userId}`,
      type: "REWARD",
      sourceKey: "billing.point_history.source_registration",
      fallbackSource: "Registration Reward",
      amount: REWARD_AMOUNTS.REGISTRATION_REWARD,
      createdAt: userCreatedAt,
    });

    history.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return history;
  }
}

export const pointService = new PointService();
