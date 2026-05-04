import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated";

export class CampaignRepository {
  async findManyWithParticipantCount(skip: number, limit: number) {
    return prisma.campaign.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { registrations: true },
        },
      },
    });
  }

  async count() {
    return prisma.campaign.count();
  }

  async create(data: Prisma.CampaignCreateInput) {
    return prisma.campaign.create({ data });
  }

  async update(id: string, data: Prisma.CampaignUpdateInput) {
    return prisma.campaign.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    return prisma.campaign.delete({
      where: { id },
    });
  }

  async findByCode(code: string) {
    return prisma.campaign.findUnique({
      where: { code },
    });
  }

  async findRegistration(campaignId: string, userId: string) {
    return prisma.campaignRegistration.findFirst({
      where: {
        campaignId,
        userId,
      },
    });
  }

  async createRegistration(
    data: Prisma.CampaignRegistrationUncheckedCreateInput,
  ) {
    return prisma.campaignRegistration.create({
      data,
    });
  }

  async findRegistrationsByCampaignId(
    campaignId: string,
    skip: number = 0,
    limit: number = 50,
  ) {
    const data = await prisma.campaignRegistration.findMany({
      where: { campaignId },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
      },
    });

    const count = await prisma.campaignRegistration.count({
      where: { campaignId },
    });

    return { data, count };
  }
}

export const campaignRepo = new CampaignRepository();
