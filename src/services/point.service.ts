import { paymentRepo } from "@/repositories/payment.repo";
import { getMemberInfo } from "@/services/member.service";
import { CURRENCY_UNIT, REWARD_AMOUNTS } from "@/constants/price";
import { ORDER_STATUS, ORDER_TYPE } from "@/constants/status";
import { campaignRepo } from "@/repositories/campaign.repo";

export class PointService {
  async getPointHistory(user: { id: string; address?: string | null }) {
    const orders = await paymentRepo.getOrdersByUserId(user.id);

    const history = [];
    let hasRegistrationReward = false;

    for (const order of orders) {
      if (order.unit !== CURRENCY_UNIT.ICP) continue;

      if (order.type === ORDER_TYPE.OEN_PAYMENT) {
        const data = order.data as { credits?: number } | null | undefined;
        if (data && data.credits) {
          history.push({
            id: `order-${order.id}-credits`,
            type: "PURCHASE",
            sourceKey: "billing.point_history.source_purchase",
            fallbackSource: "Points Purchase",
            amount: data.credits,
            status: order.status,
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
          status: order.status,
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
          status: order.status,
          createdAt: order.createdAt,
        });
      } else if (order.type !== "OEN_BINDING") {
        // Info: (20260409 - Luphia) ANALYSIS, CHAT etc (consumed points)
        if (order.amount !== 0n) {
          const data = order.data as {
            category?: string;
            data?: { category?: string };
          } | null;
          const category = data?.category || data?.data?.category;
          history.push({
            id: `order-${order.id}-consume`,
            type: "CONSUME",
            sourceKey: `billing.point_history.source_${order.type.toLowerCase()}`,
            fallbackSource: `Service Usage (${order.type})`,
            amount: order.amount,
            extendedType: category,
            status: order.status,
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
              status: ORDER_STATUS.COMPLETED,
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

    // Info: (20260504 - Luphia) Fetch campaign registrations and add to point history
    try {
      const campaignRegistrations =
        await campaignRepo.findRegistrationsByUserId(user.id);
      for (const reg of campaignRegistrations) {
        if (reg.campaign && reg.campaign.bonusPoints > 0) {
          history.push({
            id: `campaign-${reg.id}`,
            type: "REWARD",
            sourceKey: "billing.point_history.source_campaign",
            fallbackSource: `Campaign Reward: ${reg.campaign.name}`,
            amount: reg.campaign.bonusPoints,
            extendedType: reg.campaign.name,
            status: ORDER_STATUS.COMPLETED,
            createdAt: reg.createdAt,
          });
        }
      }
    } catch (e) {
      console.warn(
        "Failed to fetch campaign registrations for point history",
        e,
      );
    }

    history.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return history;
  }
}

export const pointService = new PointService();
