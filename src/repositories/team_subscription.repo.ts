import { prisma } from "@/lib/prisma";
import { Prisma, TeamSubscription } from "@/generated";

/**
 * Info: (20260807 - Luphia) 團隊訂閱 Repository（設計書 §3.1）。
 * 只做資料存取，方案額度解析與計費邏輯在 Service 層。
 */
export class TeamSubscriptionRepository {
  async getByTeamId(teamId: string): Promise<TeamSubscription | null> {
    return prisma.teamSubscription.findUnique({ where: { teamId } });
  }

  async create(
    data: Prisma.TeamSubscriptionUncheckedCreateInput,
  ): Promise<TeamSubscription> {
    return prisma.teamSubscription.create({ data });
  }

  async update(
    id: string,
    data: Prisma.TeamSubscriptionUpdateInput,
  ): Promise<TeamSubscription> {
    return prisma.teamSubscription.update({ where: { id }, data });
  }
}

export const teamSubscriptionRepo = new TeamSubscriptionRepository();
