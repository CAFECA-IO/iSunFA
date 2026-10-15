import { paymentRepo } from "@/repositories/payment.repo";
import { pointLedgerRepo } from "@/repositories/point_ledger.repo";
import { CURRENCY_UNIT } from "@/constants/price";
import { ORDER_STATUS, ORDER_TYPE } from "@/constants/status";
import { POINT_LEDGER_ENTRY_TYPE } from "@/constants/point_ledger";
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
      } else if (order.type === ORDER_TYPE.CHECK_IN_REWARD) {
        /**
         * Info: (20261015 - Luphia) 原本比對的是字面量 "CHECKIN_REWARD"，而訂單型別是
         * `CHECK_IN_REWARD`——歷史簽到獎勵從來沒有出現在點數歷程裡，而是落到下方
         * 「消費」分支，被顯示成一筆服務使用。
         */
        history.push({
          id: `reward-${order.id}`,
          type: "REWARD",
          sourceKey: "billing.point_history.source_checkin",
          fallbackSource: "Daily Check-in Reward",
          amount: order.amount,
          status: order.status,
          createdAt: order.createdAt,
        });
      } else if (order.type === ORDER_TYPE.REGISTRATION_REWARD) {
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
      } else if (order.type === ORDER_TYPE.ADMIN_ISSUED) {
        /**
         * Info: (20260813 - Luphia) 後台發放給**團隊**的訂單掛在操作管理員名下
         * （data.teamId 標記），它是團隊入帳、不是管理員個人收到點數；
         * 不排除的話管理員的點數歷程會憑空多出一筆他從未持有的點數。
         */
        const data = order.data as { teamId?: string } | null;
        if (!data?.teamId) {
          history.push({
            id: `admin-${order.id}`,
            type: "REWARD",
            sourceKey: "billing.point_history.source_admin_issued",
            fallbackSource: "Admin Issued",
            amount: order.amount,
            status: order.status,
            createdAt: order.createdAt,
          });
        }
      } else if (order.type !== ORDER_TYPE.OEN_BINDING) {
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

    /**
     * Info: (20261015 - Luphia) 註冊獎勵的第二來源改為個人點數帳本（區塊鏈退役）。
     *
     * 多數使用者的註冊獎勵沒有訂單列：原本由 MembershipSystem.registerUser 在鏈上鑄造，
     * 這裡再回頭讀合約的註冊時間補一筆。現在它是一筆 REGISTRATION_REWARD 分錄
     *（線上流程或復原指令寫入），有訂單列時以訂單為準、不重複顯示。
     */
    if (!hasRegistrationReward) {
      try {
        const entries = await pointLedgerRepo.listByUser(user.id);
        const registration = entries.find(
          (entry) =>
            entry.entryType === POINT_LEDGER_ENTRY_TYPE.REGISTRATION_REWARD,
        );
        if (registration) {
          history.push({
            id: `reward-registration-${registration.id}`,
            type: "REWARD",
            sourceKey: "billing.point_history.source_registration",
            fallbackSource: "Registration Reward",
            amount: registration.amount,
            status: ORDER_STATUS.COMPLETED,
            createdAt: registration.createdAt,
          });
        }
      } catch (e) {
        console.warn("Failed to read point ledger for point history", e);
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
