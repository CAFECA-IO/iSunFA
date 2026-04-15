import { paymentRepo } from "@/repositories/payment.repo";
import { getMemberInfo } from "@/services/member.service";
import { REWARD_AMOUNTS } from "@/constants/price";

export class PointService {
  async getPointHistory(user: { id: string; address?: string | null }) {
    const orders = await paymentRepo.getOrdersByUserId(user.id);

    const history = [];
    let hasRegistrationReward = false;

    for (const order of orders) {
      if (order.status !== "COMPLETED" && order.status !== "PAID") continue;

      if (order.type === "PAYMENT" || order.type === "OEN_PAYMENT") {
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
      } else if (order.type === "CHECKIN_REWARD") {
        history.push({
          id: `reward-${order.id}`,
          type: "REWARD",
          sourceKey: "billing.point_history.source_checkin",
          fallbackSource: "Daily Check-in Reward",
          amount: order.amount,
          createdAt: order.createdAt,
        });
      } else if (order.type === "REGISTRATION_REWARD") {
        hasRegistrationReward = true;
        history.push({
          id: `reward-${order.id}`,
          type: "REWARD",
          sourceKey: "billing.point_history.source_registration",
          fallbackSource: "Registration Reward",
          amount: order.amount,
          createdAt: order.createdAt,
        });
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

    if (!hasRegistrationReward && user.address) {
      try {
        const memberInfoResp = await getMemberInfo(user.address);
        if (memberInfoResp.success && memberInfoResp.data) {
          if (memberInfoResp.data.registrationTime > 0) {
            history.push({
              id: `reward-registration-onchain`,
              type: "REWARD",
              sourceKey: "billing.point_history.source_registration",
              fallbackSource: "Registration Reward",
              amount: REWARD_AMOUNTS.REGISTRATION_REWARD,
              createdAt: new Date(memberInfoResp.data.registrationTime),
            });
          }
        }
      } catch (e) {
        console.warn(
          "Failed to fetch on-chain member info for point history",
          e,
        );
      }
    }

    history.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return history;
  }
}

export const pointService = new PointService();
